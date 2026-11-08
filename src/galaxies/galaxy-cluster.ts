/**
A group or cluster of galaxies: members, sizes, positions, type codes, traits and the travel network. A port of
`Galaxies/GalaxyCluster.cs` and `Galaxies/ClusterGenerator.cs` (with `ClusterContext` and `GalaxyTypes.ShapeOf` and
`PitchBand`). Each galaxy is generated when first read, with the context the cluster decided for it.
*/
import {Address} from '../core/address.ts';
import {DMath} from '../core/dmath.ts';
import {Distances, type LinkTier} from '../core/distances.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import {
  checkSeed,
  maxSystems,
  resolveOptions,
  seedText,
  validateOptions,
  type ClusterKind,
  type Epoch,
  type GalaxyShape,
  type GeneratorOptions,
} from '../options.ts';
import type {StellarAge} from '../stars/star-generator.ts';
import {
  generateGalaxyAt,
  hazardRadius,
  nameRoots,
  type Galaxy,
  type GalaxyContext,
  type GalaxyLinkEnd,
} from './galaxy.ts';

/**
A galaxy's part in its cluster. C# `GalaxyRole`.
*/
export type GalaxyRole = 'Major' | 'Member' | 'Satellite' | 'Dwarf';

/**
How rich a galaxy's stars are in metals. C# `GalaxyRichness`.
*/
export type GalaxyRichness = 'Poor' | 'Normal' | 'Rich';

/**
What the black hole at a galaxy's centre is doing. C# `CoreActivity`.
*/
export type CoreActivity = 'Quiet' | 'Seyfert' | 'Quasar';

/**
A galaxy as the cluster map shows it, without its systems. C# `ClusterEntry`.
*/
export type ClusterEntry = {
  readonly index: number;
  readonly address: string;
  readonly name: string;
  readonly type: string;
  readonly shape: GalaxyShape;
  readonly role: GalaxyRole;
  /**
  The index of the major a satellite is bound to; -1 for every other galaxy.
  */
  readonly host: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly systems: number;
  readonly age: StellarAge;
  readonly richness: GalaxyRichness;
  readonly coreActivity: CoreActivity;
};

/**
A link between two galaxies of a cluster; `a` is the lower index. C# `ClusterLink`.
*/
export type ClusterLink = {readonly a: number; readonly b: number; readonly tier: LinkTier; readonly length: number};

/**
One end of a cluster link, as the galaxy it starts from sees it. C# `GalaxyGate`.
*/
export type GalaxyGate = {
  readonly galaxy: number;
  readonly name: string;
  readonly tier: LinkTier;
  readonly system: number;
  /**
  For a filament, the index in the universe of the cluster it leads to; -1 inside the cluster.
  */
  readonly cluster: number;
};

/**
The universe's sky landmark as one galaxy sees it. C# `SkyLandmark`.
*/
export type SkyLandmark = {readonly name: string; readonly address: string; readonly bearing: number; readonly lightYears: number};

/**
A generated group or cluster. C# `GalaxyCluster`.
*/
export type GalaxyCluster = {
  readonly address: string;
  readonly name: string;
  readonly kind: Exclude<ClusterKind, 'Auto'>;
  readonly age: StellarAge;
  readonly radius: number;
  readonly map: readonly ClusterEntry[];
  readonly links: readonly ClusterLink[];
  /**
  What the cluster decided for each galaxy, in map order.
  */
  readonly contexts: readonly GalaxyContext[];
  /**
  Galaxy `index` in full, generated on first read and kept.
  */
  galaxy(index: number): Galaxy;
};

/**
A filament end a universe hands a cluster. Part of C# `ClusterContext.Filaments`.
*/
export type FilamentEnd = {
  readonly galaxy: number;
  readonly otherCluster: number;
  readonly otherGalaxy: number;
  readonly name: string;
  readonly dx: number;
  readonly dy: number;
};

/**
What a universe decides for one of its clusters; `aloneCluster` leaves a lone cluster as it was. C# `ClusterContext`.
*/
export type ClusterContext = {
  readonly kind?: Exclude<ClusterKind, 'Auto'>;
  readonly age?: StellarAge;
  readonly name?: string;
  readonly home?: boolean;
  readonly dying?: boolean;
  readonly ring?: boolean;
  readonly quasar?: boolean;
  readonly merging?: boolean;
  readonly filaments?: readonly FilamentEnd[];
  readonly x?: number;
  readonly y?: number;
  readonly landmarkName?: string;
  readonly landmarkAddress?: string;
  readonly landmarkX?: number;
  readonly landmarkY?: number;
};

export const aloneCluster: ClusterContext = Object.freeze({});

const clusterRadius = 1000;
const firstSpiralCount = 80;

/**
A cluster unit on the universe map: 2,000 light-years over 100,000. C# `ClusterGenerator.UniverseScale`.
*/
export const universeScale = 0.02;

const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const ages: readonly StellarAge[] = ['Young', 'Mature', 'Old'];
const ageWeights = [30, 45, 25];
const kindWeights = [60, 40];
const youngRegions = [55, 35, 10];
const matureRegions = [30, 45, 25];
const oldRegions = [5, 35, 60];
const groupMajor = ['Sb', 'Sc', 'SBb', 'SBc'];
const groupMajorWeights = [35, 35, 15, 15];
const clusterMajor = ['E', 'Sb', 'SBb'];
const clusterMajorWeights = [50, 25, 25];
const memberTypes = ['E', 'S0', 'S', 'SB', 'Irr', 'Ring'];
const memberInner = [45, 40, 7, 3, 5, 0];
const memberMiddle = [25, 35, 21, 9, 10, 0];
const memberOuter = [10, 20, 35, 15, 15, 5];
const memberGroup = [15, 25, 21, 9, 25, 5];
const dwarfTypes = ['dSph', 'dE', 'dIrr'];
const satelliteWeights = [40, 25, 35];
const freeDwarfWeights = [25, 15, 60];
const richnesses: readonly GalaxyRichness[] = ['Poor', 'Normal', 'Rich'];
const majorRichness = [0, 50, 50];
const memberRichness = [15, 70, 15];
const dwarfRichness = [70, 30, 0];
const cores: readonly CoreActivity[] = ['Quiet', 'Seyfert', 'Quasar'];
const majorCores = [60, 30, 10];
const giantCores = [50, 30, 20];
const memberCores = [85, 13, 2];
const starburstRegions = [70, 25, 5];
const tierOrder: readonly LinkTier[] = ['Gate', 'Wormhole', 'Tether', 'Filament', 'Tidal'];

type Draft = {
  role: GalaxyRole;
  giant: boolean;
  host: number;
  systems: number;
  size: number;
  room: number;
  x: number;
  y: number;
  type: string;
  shape: GalaxyShape;
  pitchLow: number;
  pitchHigh: number;
  ellipse: number;
  name: string;
  age: StellarAge;
  richness: GalaxyRichness;
  core: CoreActivity;
};

const draft = (role: GalaxyRole, giant = false, host = -1): Draft => ({
  role,
  giant,
  host,
  systems: 0,
  size: 0,
  room: 0,
  x: 0,
  y: 0,
  type: '',
  shape: 'Auto',
  pitchLow: 0,
  pitchHigh: 0,
  ellipse: 0,
  name: '',
  age: 'Young',
  richness: 'Poor',
  core: 'Quiet',
});

/**
The map shape of a type code. C# `GalaxyTypes.ShapeOf`.
*/
export function shapeOf(type: string): GalaxyShape {
  if (type.startsWith('SB')) {
    return 'Barred';
  }

  if (['Sa', 'Sb', 'Sc'].includes(type)) {
    return 'Spiral';
  }

  if (type === 'Ring') {
    return 'Ring';
  }

  return type === 'Irr' || type === 'dIrr' ? 'Irregular' : 'Elliptical';
}

const pitchBand = (letter: string): [number, number] => letter === 'a' ? [0.25, 0.31] : (letter === 'b' ? [0.31, 0.38] : [0.38, 0.45]);

// Region age weights (Young, Mature, Old) by galaxy age; Mature is the lone galaxy's.
function regionWeights(age: StellarAge): number[] {
  if (age === 'Young') {
    return youngRegions;
  }

  return age === 'Old' ? oldRegions : matureRegions;
}

/**
The stellar age an epoch option stands for. C# `ClusterGenerator.AgeOf`.
*/
export function ageOf(epoch: Epoch): StellarAge {
  return epoch === 'Young' ? 'Young' : (epoch === 'Old' ? 'Old' : 'Mature');
}

// One draw for a galaxy that is not the giant: majors 1.4 to 2, members 0.6 to 1.1, the small ones 0.15 to 0.4.
function sizeFactor(rng: Pcg32, role: GalaxyRole): number {
  if (role === 'Major') {
    return rng.rangeDouble(1.4, 2);
  }

  return role === 'Member' ? rng.rangeDouble(0.6, 1.1) : rng.rangeDouble(0.15, 0.4);
}

const sizeOf = (systems: number): number => DMath.round(40 * Math.sqrt(systems / 60), 3);
const growsSpirals = (baseSystems: number): boolean => 2 * baseSystems >= firstSpiralCount;

function members(rng: Pcg32, kind: string, baseSystems: number): Draft[] {
  let majors: number;
  let memberCount: number;
  let dwarfs: number;
  const satellites = [0, 0, 0];
  if (kind === 'Group') {
    majors = 2;
    memberCount = rng.range(0, 2);
    dwarfs = rng.range(0, 3);
    satellites[0] = rng.range(1, 3);
    satellites[1] = rng.range(1, 3);
  } else {
    majors = 1 + rng.range(1, 2);
    memberCount = rng.range(8, 16);
    dwarfs = rng.range(2, 5);
    // The central giant holds no satellites of its own; the other majors 0 to 2 each (drawn for both).
    satellites[1] = rng.range(0, 2);
    satellites[2] = rng.range(0, 2);
  }

  const g: Draft[] = [];
  for (let i = 0; i < majors; i++) {
    g.push(draft('Major', kind === 'Cluster' && i === 0));
  }

  for (let i = 0; i < memberCount; i++) {
    g.push(draft('Member'));
  }

  for (let i = 0; i < dwarfs; i++) {
    g.push(draft('Dwarf'));
  }

  for (let host = 0; host < majors; host++) {
    for (let s = 0; s < satellites[host]!; s++) {
      g.push(draft('Satellite', false, host));
    }
  }

  for (const d of g) {
    const factor = d.giant
      ? rng.rangeDouble(2, 3)
      : sizeFactor(rng, d.role);
    let systems = Math.trunc(baseSystems * DMath.round(factor, 3) + 0.5);
    if (d.role === 'Satellite' || d.role === 'Dwarf') {
      systems = Math.max(systems, Math.min(5, baseSystems));
    }

    d.systems = DMath.clamp(systems, 1, maxSystems);
    d.size = sizeOf(d.systems);
    const mayGrow = (d.role === 'Major' || d.role === 'Member') && growsSpirals(baseSystems);
    d.room = mayGrow ? sizeOf(Math.max(d.systems, firstSpiralCount)) : d.size;
  }

  return g;
}

function set(d: Draft, x: number, y: number): void {
  d.x = DMath.round(x, 3);
  d.y = DMath.round(y, 3);
}

function overlaps(g: readonly Draft[], placed: readonly number[], d: Draft, x: number, y: number, spread: number): boolean {
  for (const j of placed) {
    const o = g[j]!;
    const dx = x - o.x;
    const dy = y - o.y;
    const min = 1.2 * (d.room + o.room) * spread;
    if (dx * dx + dy * dy < min * min) {
      return true;
    }
  }

  return false;
}

function place(rng: Pcg32, g: Draft[], kind: string, merging: boolean): void {
  const placed: number[] = [];
  if (kind === 'Group') {
    const axis = rng.rangeDouble(0, 2 * DMath.PI);
    let half = rng.rangeDouble(250, 400);
    if (merging) {
      // A merging pair: the two discs touch.
      half = DMath.round((g[0]!.room + g[1]!.room) / 2, 3);
    }

    const c = DMath.cos(axis);
    const s = DMath.sin(axis);
    set(g[0]!, half * c, half * s);
    set(g[1]!, -half * c, -half * s);
    placed.push(0, 1);
  } else {
    set(g[0]!, 0, 0);
    placed.push(0);
  }

  for (let i = placed.length; i < g.length; i++) {
    const d = g[i]!;
    let spread = 1;
    for (let refusals = 1; ; refusals++) {
      const angle = rng.rangeDouble(0, 2 * DMath.PI);
      let x: number;
      let y: number;
      if (d.role === 'Satellite') {
        const host = g[d.host]!;
        const r = host.room + d.size + rng.rangeDouble(0.2, 1.2) * host.room;
        x = host.x + r * DMath.cos(angle);
        y = host.y + r * DMath.sin(angle);
      } else {
        // Crowded towards the giant in a cluster (u^0.75), spread over the disc in a group (sqrt u).
        const u = rng.nextDouble();
        const root = Math.sqrt(u);
        const r = 0.9 * clusterRadius * (kind === 'Cluster' ? root * Math.sqrt(root) : root);
        x = r * DMath.cos(angle);
        y = r * DMath.sin(angle);
      }

      x = DMath.round(x, 3);
      y = DMath.round(y, 3);
      if (!overlaps(g, placed, d, x, y, spread)) {
        set(d, x, y);
        placed.push(i);
        break;
      }

      if (refusals % 200 === 0) {
        spread *= 0.9;
      }
    }
  }
}

function memberWeights(d: Draft, kind: string): number[] {
  if (kind === 'Group') {
    return memberGroup;
  }

  // The morphology and density relation: ellipticals crowd the centre, spirals keep to the edge.
  const r2 = d.x * d.x + d.y * d.y;
  const third = 0.9 * clusterRadius / 3;
  return r2 < third * third ? memberInner : (r2 < 4 * third * third ? memberMiddle : memberOuter);
}

function ellipticalN(type: string, digit: number): number {
  if (type === 'S0') {
    return 3 + digit % 4;
  }

  if (type === 'dE') {
    return digit % 5;
  }

  return type === 'dSph' || type === 'cD' ? digit % 3 : type.codePointAt(1)! - 48;
}

function types(rng: Pcg32, g: Draft[], kind: string, baseSystems: number): void {
  const grow = growsSpirals(baseSystems);
  for (const d of g) {
    let type: string;
    const letter = 'abc'[rng.nextInt(3)]!;
    let digit = rng.range(0, 7);
    if (d.giant) {
      type = 'cD';
      digit %= 3;
    } else if (d.role === 'Major') {
      type = kind === 'Group' ? groupMajor[rng.weighted(groupMajorWeights)]! : clusterMajor[rng.weighted(clusterMajorWeights)]!;
      if (type === 'E') {
        type = 'E' + String(digit);
      }
    } else if (d.role === 'Member') {
      type = memberTypes[rng.weighted(memberWeights(d, kind))]!;
      if (type === 'E') {
        type = 'E' + String(digit);
      } else if (type === 'S' || type === 'SB') {
        type += letter;
      }
    } else {
      type = dwarfTypes[rng.weighted(d.role === 'Satellite' ? satelliteWeights : freeDwarfWeights)]!;
    }

    // Arms do not read under 80 systems: a smaller spiral grows to 80, or, when the Systems option is under 40, becomes a lenticular.
    let shape = shapeOf(type);
    if ((shape === 'Spiral' || shape === 'Barred') && d.systems < firstSpiralCount) {
      if (grow) {
        d.systems = firstSpiralCount;
        d.size = d.room;
      } else {
        type = 'S0';
        shape = 'Elliptical';
      }
    }

    d.type = type;
    d.shape = shape;
    if (shape === 'Spiral' || shape === 'Barred') {
      const [low, high] = pitchBand(type.at(-1)!);
      d.pitchLow = low;
      d.pitchHigh = high;
    } else if (shape === 'Elliptical') {
      d.ellipse = (10 - ellipticalN(type, digit)) / 10;
    }
  }
}

function traits(rng: Pcg32, g: Draft[], clusterAge: StellarAge): void {
  for (const d of g) {
    const small = d.role === 'Satellite' || d.role === 'Dwarf';
    const richness = richnesses[rng.weighted(d.role === 'Major' ? majorRichness : (small ? dwarfRichness : memberRichness))]!;
    let weights = d.giant ? giantCores : (d.role === 'Major' ? majorCores : memberCores);
    if (clusterAge === 'Young') {
      // Quasars belong to the young universe.
      weights = [weights[0]!, weights[1]!, 2 * weights[2]!];
    }

    const core = cores[rng.weighted(weights)]!;
    d.richness = richness;
    d.core = small ? 'Quiet' : core;
    if (d.shape === 'Spiral' || d.shape === 'Barred') {
      d.age = clusterAge;
    } else if (d.shape === 'Elliptical') {
      d.age = clusterAge === 'Young' ? 'Mature' : 'Old';
    } else {
      d.age = 'Young';
    }
  }
}

/**
A root index not drawn before, redrawn from the same stream until unused. C# `ClusterGenerator.Root` and `UniverseGenerator.Unique`.
*/
export function uniqueRoot(rng: Pcg32, used: Set<number>, count: number): number {
  let r: number;
  do {
    r = rng.nextInt(count);
  } while (used.has(r));

  used.add(r);
  return r;
}

function names(rng: Pcg32, g: Draft[], kind: string): string {
  const used = new Set<number>();
  const cluster = nameRoots[uniqueRoot(rng, used, nameRoots.length)]! + (kind === 'Group' ? ' Group' : ' Cluster');
  const roots = Array.from({length: g.length}, () => 0);
  const satellitesSoFar = Array.from({length: g.length}, () => 0);
  for (const [i, d] of g.entries()) {
    if (d.role === 'Satellite') {
      const k = satellitesSoFar[d.host]!++;
      d.name = nameRoots[roots[d.host]!]! + ' ' + numerals[k]!;
      continue;
    }

    roots[i] = uniqueRoot(rng, used, nameRoots.length);
    d.name = nameRoots[roots[i]]! + (d.role === 'Dwarf' ? ' Dwarf' : ' Galaxy');
  }

  return cluster;
}

const d2 = (a: Draft, b: Draft): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

function network(g: readonly Draft[]): ClusterLink[] {
  const best = new Map<number, number>();
  const add = (a: number, b: number, tier: number): void => {
    if (a === b) {
      return;
    }

    // Pairs are keyed so that sorting the keys sorts by the lower index, then the higher (fewer than 64 galaxies).
    const key = Math.min(a, b) * 65_536 + Math.max(a, b);
    const had = best.get(key);
    if (had === undefined || tier < had) {
      best.set(key, tier);
    }
  };

  const majors: number[] = [];
  for (const [i, d] of g.entries()) {
    if (d.role === 'Major') {
      majors.push(i);
    }
  }

  for (const a of majors) {
    for (const b of majors) {
      if (a < b) {
        add(a, b, 0);
      }
    }
  }

  for (const [i, d] of g.entries()) {
    if (d.role === 'Member' || d.role === 'Dwarf') {
      let nearest = majors[0]!;
      let nearestD2 = Number.MAX_VALUE;
      for (const m of majors) {
        const distance = d2(d, g[m]!);
        if (!(distance < nearestD2)) {
          continue;
        }

        nearestD2 = distance;
        nearest = m;
      }

      add(i, nearest, 0);
    } else if (d.role === 'Satellite') {
      add(i, d.host, 2);
    }
  }

  const ring: Array<{angle: number; index: number}> = [];
  for (const [i, d] of g.entries()) {
    if (d.role !== 'Satellite' && !d.giant) {
      ring.push({angle: DMath.atan2(d.y, d.x), index: i});
    }
  }

  ring.sort((p, q) => p.angle === q.angle ? p.index - q.index : (p.angle < q.angle ? -1 : 1));
  if (ring.length === 2) {
    add(ring[0]!.index, ring[1]!.index, 1);
  } else if (ring.length > 2) {
    for (let k = 0; k < ring.length; k++) {
      add(ring[k]!.index, ring[(k + 1) % ring.length]!.index, 1);
    }
  }

  // Iterator#toArray arrived in Node 22; the package runs on Node 20.
  // eslint-disable-next-line unicorn/prefer-iterator-to-array
  const keys = [...best.keys()].toSorted((p, q) => p - q);
  return keys.map(key => {
    const a = Math.trunc(key / 65_536);
    const b = key % 65_536;
    return {
      a, b, tier: tierOrder[best.get(key)!]!, length: DMath.round(Math.sqrt(d2(g[a]!, g[b]!)), 3),
    };
  });
}

function slots(g: Draft[], context: ClusterContext, merging: boolean): void {
  if (context.home === true || context.dying === true) {
    g[0]!.core = 'Quiet';
  }

  if (context.dying === true) {
    g[0]!.age = 'Old';
  }

  if (context.quasar === true && g.length > 1) {
    g[1]!.core = 'Quasar';
  }

  if (!merging) {
    return;
  }

  g[0]!.age = 'Young';
  g[1]!.age = 'Young';
}

function landmark(context: ClusterContext, address: string, d: Draft): SkyLandmark | undefined {
  if (context.landmarkAddress === undefined || context.landmarkAddress === address) {
    return undefined;
  }

  const x = (context.x ?? 0) + d.x * universeScale;
  const y = (context.y ?? 0) + d.y * universeScale;
  const dx = (context.landmarkX ?? 0) - x;
  const dy = (context.landmarkY ?? 0) - y;
  const degrees = Math.trunc(DMath.round(DMath.atan2(dy, dx) * 180 / DMath.PI, 0));
  return {
    name: context.landmarkName ?? '',
    address: context.landmarkAddress,
    bearing: (degrees + 360) % 360,
    lightYears: Math.trunc(DMath.round(Math.sqrt(dx * dx + dy * dy) * Distances.universeUnitLightYears / 1000, 0)) * 1000,
  };
}

/**
Builds a group or cluster from its address. C# `ClusterGenerator.Generate`.
*/
export function generateClusterAt(address: Address, options: GeneratorOptions, context: ClusterContext = aloneCluster): GalaxyCluster {
  const seed = address.objectSeed;
  const kindStream = Seeds.stream(seed, 'kind');
  const rolledKind = kindStream.weighted(kindWeights) === 0 ? 'Group' : 'Cluster';
  const kind = context.kind ?? (options.clusterKind === 'Auto' ? rolledKind : options.clusterKind);
  const drawnAge = ages[kindStream.weighted(ageWeights)]!;
  const age = context.age ?? (options.epoch === 'Auto' ? drawnAge : ageOf(options.epoch));
  const merging = context.merging === true && kind === 'Group';

  const g = members(Seeds.stream(seed, 'members'), kind, options.systems);
  place(Seeds.stream(seed, 'layout'), g, kind, merging);
  types(Seeds.stream(seed, 'types'), g, kind, options.systems);
  if (context.ring === true) {
    const first = g.find(d => d.role === 'Member');
    if (first !== undefined) {
      first.type = 'Ring';
      first.shape = 'Ring';
    }
  }

  traits(Seeds.stream(seed, 'traits'), g, age);
  slots(g, context, merging);
  const drawnName = names(Seeds.stream(seed, 'names'), g, kind);
  const links = network(g).map(l => merging && l.a === 0 && l.b === 1 ? {...l, tier: 'Tidal' as const} : l);
  const map: ClusterEntry[] = [];
  const contexts: GalaxyContext[] = [];
  for (const [i, d] of g.entries()) {
    const galaxyAddress = address.child('galaxy', i).toString();
    map.push({
      index: i,
      address: galaxyAddress,
      name: d.name,
      type: d.type,
      shape: d.shape,
      role: d.role,
      host: d.host,
      x: d.x,
      y: d.y,
      size: d.size,
      systems: d.systems,
      age: d.age,
      richness: d.richness,
      coreActivity: d.core,
    });
    const ends: GalaxyLinkEnd[] = [];
    for (const l of links) {
      if (!(l.a === i || l.b === i)) {
        continue;
      }

      const other = l.a === i ? l.b : l.a;
      ends.push({
        other, name: g[other]!.name, tier: l.tier, dx: g[other]!.x - d.x, dy: g[other]!.y - d.y, cluster: -1,
      });
    }

    for (const f of context.filaments ?? []) {
      if (f.galaxy === i) {
        ends.push({
          other: f.otherGalaxy, name: f.name, tier: 'Filament', dx: f.dx, dy: f.dy, cluster: f.otherCluster,
        });
      }
    }

    const pair = merging && i < 2;
    const sky = landmark(context, galaxyAddress, d);
    const galaxyContext: GalaxyContext = {
      name: d.name,
      type: d.type,
      shape: d.shape,
      systems: d.systems,
      age: d.age,
      richness: d.richness,
      coreActivity: d.core,
      ...(d.host >= 0 && {host: g[d.host]!.name}),
      links: ends,
      frontier: pair,
      ...(sky !== undefined && {landmark: sky}),
      tuning: {
        pitchLow: d.pitchLow,
        pitchHigh: d.pitchHigh,
        ellipse: d.ellipse,
        ageWeights: pair ? starburstRegions : regionWeights(d.age),
        coreHazardRadius: hazardRadius(d.core),
        coreDanger: d.core === 'Quasar' ? 3 : (d.core === 'Seyfert' ? 2 : 0),
      },
    };
    contexts.push(galaxyContext);
  }

  const made: Array<Galaxy | undefined> = Array.from({length: g.length});
  return {
    address: address.toString(),
    name: context.name ?? drawnName,
    kind,
    age,
    radius: clusterRadius,
    map,
    links,
    contexts,
    galaxy(index: number): Galaxy {
      if (!Number.isSafeInteger(index) || index < 0 || index >= made.length) {
        throw new RangeError(`This cluster has ${made.length} galaxies, numbered 0 to ${made.length - 1}; you asked for ${index}.`);
      }

      made[index] ??= generateGalaxyAt(address.child('galaxy', index), options, contexts[index]);
      return made[index];
    },
  };
}

/**
Generates a group or cluster of galaxies from any seed text or number. C# `GalaxyCluster.Generate(seed, options)`.
*/
export function generateCluster(seed: string | number | bigint, options?: Partial<GeneratorOptions>): GalaxyCluster {
  const o = resolveOptions(options);
  validateOptions(o);
  const text = typeof seed === 'string' ? checkSeed(seed) : seedText(seed);
  return generateClusterAt(new Address(1, text, 'cluster'), o);
}
