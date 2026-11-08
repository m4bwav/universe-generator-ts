/**
A universe: a web of groups and clusters joined by filaments, with voids between them, landmarks and a galaxy merger. A
port of `Universe/Universe.cs` (records and `Generate`) and `Universe/UniverseGenerator.cs`. `Universe.Link` and
`Universe.At` need address parsing, which is not ported yet.
*/
import {Address} from '../core/address.ts';
import {DMath} from '../core/dmath.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import {
  generateClusterAt,
  ageOf,
  uniqueRoot,
  universeScale,
  type ClusterContext,
  type FilamentEnd,
  type GalaxyCluster,
} from '../galaxies/galaxy-cluster.ts';
import {nameRoots} from '../galaxies/galaxy.ts';
import {
  checkSeed,
  resolveOptions,
  seedText,
  validateOptions,
  type GeneratorOptions,
} from '../options.ts';
import type {StellarAge} from '../stars/star-generator.ts';
import {generateSystemAt, type StarSystem, type SystemInput} from '../systems/star-system.ts';

/**
A node's part in the universe. C# `NodeRole`.
*/
export type NodeRole = 'Home' | 'GreatCluster' | 'Merger' | 'Field';

/**
The kinds of universe landmark. C# `UniverseLandmarkKind`.
*/
export type UniverseLandmarkKind = 'Home' | 'DyingGiant' | 'RingGalaxy' | 'Quasar' | 'Merger';

/**
A cluster as the universe map shows it. C# `UniverseNode`.
*/
export type UniverseNode = {
  readonly index: number;
  readonly address: string;
  readonly name: string;
  readonly kind: 'Group' | 'Cluster';
  readonly role: NodeRole;
  readonly x: number;
  readonly y: number;
  readonly galaxies: number;
};

/**
A filament of the cosmic web between two clusters, and the galaxy at each end. C# `Filament`.
*/
export type Filament = {readonly a: number; readonly b: number; readonly length: number; readonly galaxyA: number; readonly galaxyB: number};

/**
A void between the clusters, with a few lonely systems. C# `CosmicVoid`.
*/
export type CosmicVoid = {
  readonly index: number;
  readonly address: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly systemCount: number;
  /**
  System `index` in full, generated on first read and kept.
  */
  system(index: number): StarSystem;
};

/**
A named landmark of the universe. C# `UniverseLandmark`.
*/
export type UniverseLandmark = {readonly kind: UniverseLandmarkKind; readonly name: string; readonly address: string};

/**
The universe's galaxy merger. C# `UniverseMerger`.
*/
export type UniverseMerger = {
  readonly name: string;
  readonly cluster: number;
  readonly galaxyA: string;
  readonly galaxyB: string;
  readonly hook: string;
};

/**
A generated universe. C# `Universe`.
*/
export type Universe = {
  readonly address: string;
  readonly name: string;
  readonly age: StellarAge;
  readonly radius: number;
  readonly nodes: readonly UniverseNode[];
  readonly filaments: readonly Filament[];
  readonly voids: readonly CosmicVoid[];
  readonly landmarks: readonly UniverseLandmark[];
  readonly merger: UniverseMerger;
  readonly clusters: readonly GalaxyCluster[];
  /**
  Cluster `index`, the same as `clusters[index]`, with the C# range message.
  */
  cluster(index: number): GalaxyCluster;
};

const universeRadius = 1000;
const roles: readonly NodeRole[] = ['Home', 'GreatCluster', 'Merger'];
const nodeSpacing = 250;
const clusterRadius = 20;
const voidStep = 50;
const ages: readonly StellarAge[] = ['Young', 'Mature', 'Old'];
const ageWeights = [30, 45, 25];
const youngKinds = [75, 25];
const matureKinds = [60, 40];
const oldKinds = [45, 55];
const universeRoots = [
  'Lantern',
  'Silent',
  'Ember',
  'Hollow',
  'Gilded',
  'Shattered',
  'Endless',
  'Pale',
  'Burning',
  'Drowned',
  'Crowned',
  'Veiled',
  'Iron',
  'Last',
  'Wandering',
  'Hidden',
];
const voidRoots = [
  'Abyssal',
  'Barren',
  'Ashen',
  'Cinder',
  'Dark',
  'Empty',
  'Forsaken',
  'Great',
  'Lonely',
  'Mourning',
  'Quiet',
  'Starless',
  'Still',
  'Sundered',
  'Widow',
  'Yawning',
];
const hooks = [
  'Both galaxies claim the stars the collision threw loose.',
  'Refugees from the starburst flood the frontier, and neither galaxy will take them.',
  'A precursor relay has surfaced in the tidal stream, and two navies race to reach it.',
  'Pirates rule the frontier, paid by each galaxy to raid the other.',
  'The collision is dragging a holy world from one galaxy into the other.',
  'Smugglers fly routes through the tidal stream that no navy can follow.',
  'A truce holds the frontier, and someone is working to break it.',
  'New stars are born on the frontier every year, and every claim to them is disputed.',
];

const d2 = (x: readonly number[], y: readonly number[], a: number, b: number): number => {
  const dx = x[a]! - x[b]!;
  const dy = y[a]! - y[b]!;
  return dx * dx + dy * dy;
};

function place(rng: Pcg32, x: number[], y: number[]): void {
  for (let i = 0; i < x.length; i++) {
    let spread = 1;
    for (let refusals = 1; ; refusals++) {
      const angle = rng.rangeDouble(0, 2 * DMath.PI);
      const r = (i === 0 ? 0.3 : 0.9) * universeRadius * Math.sqrt(rng.nextDouble());
      const px = DMath.round(r * DMath.cos(angle), 3);
      const py = DMath.round(r * DMath.sin(angle), 3);
      let clear = true;
      for (let j = 0; j < i && clear; j++) {
        const dx = px - x[j]!;
        const dy = py - y[j]!;
        const min = nodeSpacing * spread;
        clear = dx * dx + dy * dy >= min * min;
      }

      if (clear) {
        x[i] = px;
        y[i] = py;
        break;
      }

      if (refusals % 200 === 0) {
        spread *= 0.9;
      }
    }
  }
}

function facing(cluster: GalaxyCluster, dx: number, dy: number): number {
  let best = 0;
  let reach = -Number.MAX_VALUE;
  for (const entry of cluster.map) {
    const r = entry.x * dx + entry.y * dy;
    if (entry.role === 'Satellite' || !(r > reach)) {
      continue;
    }

    reach = r;
    best = entry.index;
  }

  return best;
}

function filamentsOf(x: readonly number[], y: readonly number[], maps: readonly GalaxyCluster[]): Filament[] {
  const list: Filament[] = [];
  const n = x.length;
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const mx = (x[a]! + x[b]!) / 2;
      const my = (y[a]! + y[b]!) / 2;
      const squared = d2(x, y, a, b);
      const r2 = squared / 4;
      let gabriel = true;
      for (let c = 0; c < n && gabriel; c++) {
        if (c === a || c === b) {
          continue;
        }

        const dx = x[c]! - mx;
        const dy = y[c]! - my;
        gabriel = dx * dx + dy * dy >= r2;
      }

      if (gabriel) {
        list.push({
          a,
          b,
          length: DMath.round(Math.sqrt(squared), 3),
          galaxyA: facing(maps[a]!, x[b]! - x[a]!, y[b]! - y[a]!),
          galaxyB: facing(maps[b]!, x[a]! - x[b]!, y[a]! - y[b]!),
        });
      }
    }
  }

  return list;
}

function segment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  let t = ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy);
  t = DMath.clamp(t, 0, 1);
  const dx = px - (ax + t * vx);
  const dy = py - (ay + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

function room(px: number, py: number, x: readonly number[], y: readonly number[], filaments: readonly Filament[], voids: readonly CosmicVoid[]): number {
  // The map edge bounds a void too, so every void lies inside the map.
  let r = universeRadius - Math.sqrt(px * px + py * py);
  for (const [i, xi] of x.entries()) {
    const dx = px - xi;
    const dy = py - y[i]!;
    r = Math.min(r, Math.sqrt(dx * dx + dy * dy) - clusterRadius);
  }

  for (const f of filaments) {
    r = Math.min(r, segment(px, py, x[f.a]!, y[f.a]!, x[f.b]!, y[f.b]!));
  }

  for (const v of voids) {
    const dx = px - v.x;
    const dy = py - v.y;
    r = Math.min(r, Math.sqrt(dx * dx + dy * dy) - v.radius);
  }

  return r;
}

function voidSystem(system: Address): SystemInput {
  const danger = 1 + Math.trunc((Seeds.stream(system.objectSeed, 'danger').range(1, 10) - 1) / 4);
  return {age: 'Old', danger, richness: 50};
}

function voidsOf(
  address: Address,
  options: GeneratorOptions,
  names: Pcg32,
  slots: number,
  systems: readonly number[],
  x: readonly number[],
  y: readonly number[],
  filaments: readonly Filament[],
): CosmicVoid[] {
  const voids: CosmicVoid[] = [];
  const usedRoots = new Set<number>();
  const steps = Math.trunc(universeRadius / voidStep);
  for (let k = 0; k < slots; k++) {
    // The name is drawn for every slot, so a slot without room shifts nothing.
    const root = voidRoots[uniqueRoot(names, usedRoots, voidRoots.length)]!;
    let bestX = 0;
    let bestY = 0;
    let best = -Number.MAX_VALUE;
    for (let j = -steps; j <= steps; j++) {
      for (let i = -steps; i <= steps; i++) {
        const px = i * voidStep;
        const py = j * voidStep;
        if (px * px + py * py > 0.81 * universeRadius * universeRadius) {
          continue;
        }

        const r = room(px, py, x, y, filaments, voids);
        if (!(r > best)) {
          continue;
        }

        best = r;
        bestX = px;
        bestY = py;
      }
    }

    if (best < voidStep) {
      continue;
    }

    const where = address.child('void', voids.length);
    const count = systems[k]!;
    const contexts = Array.from({length: count}, (_, s) => voidSystem(where.child('system', s)));
    const made: Array<StarSystem | undefined> = Array.from({length: count});
    voids.push({
      index: voids.length,
      address: where.toString(),
      name: 'the ' + root + ' Void',
      x: bestX,
      y: bestY,
      radius: DMath.round(best, 3),
      systemCount: count,
      system(index: number): StarSystem {
        if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
          throw new RangeError(`This void has ${count} systems, numbered 0 to ${count - 1}; you asked for ${index}.`);
        }

        made[index] ??= generateSystemAt(where.child('system', index), contexts[index]!, options);
        return made[index];
      },
    });
  }

  return voids;
}

const rootOf = (galaxy: string): string => {
  const space = galaxy.indexOf(' ');
  return space === -1 ? galaxy : galaxy.slice(0, space);
};

/**
Builds a universe from its address. C# `UniverseGenerator.Generate`.
*/
export function generateUniverseAt(address: Address, options: GeneratorOptions): Universe {
  const seed = address.objectSeed;
  const drawnAge = ages[Seeds.stream(seed, 'epoch').weighted(ageWeights)]!;
  const age = options.epoch === 'Auto' ? drawnAge : ageOf(options.epoch);

  // The web: node count, void slots and their system counts, positions, then kinds; all drawn whatever is used.
  const web = Seeds.stream(seed, 'web');
  const count = web.range(4, 7);
  const voidSlots = web.range(1, 3);
  const voidSystems = [web.range(1, 3), web.range(1, 3), web.range(1, 3)];
  const x = Array.from({length: count}, () => 0);
  const y = Array.from({length: count}, () => 0);
  place(web, x, y);
  const kindWeights = age === 'Young' ? youngKinds : (age === 'Old' ? oldKinds : matureKinds);
  const kinds: Array<'Group' | 'Cluster'> = [];
  for (let i = 0; i < count; i++) {
    const drawn = web.weighted(kindWeights) === 0 ? 'Group' : 'Cluster';
    kinds.push(i === 0 || i === 2 ? 'Group' : (i === 1 ? 'Cluster' : drawn));
  }

  const names = Seeds.stream(seed, 'names');
  const name = 'the ' + universeRoots[names.nextInt(universeRoots.length)]! + ' Reach';
  const used = new Set<number>();
  const clusterNames = kinds.map(kind => nameRoots[uniqueRoot(names, used, nameRoots.length)]! + (kind === 'Group' ? ' Group' : ' Cluster'));
  const hook = hooks[Seeds.stream(seed, 'story').nextInt(hooks.length)]!;

  // The distant quasar: the field node farthest from home, ties to the lowest index.
  let quasar = 3;
  for (let i = 4; i < count; i++) {
    if (d2(x, y, i, 0) > d2(x, y, quasar, 0)) {
      quasar = i;
    }
  }

  // First pass: every cluster's map with its kind, age, name and slots; filaments and the landmark need the maps.
  const bases: ClusterContext[] = [];
  const maps: GalaxyCluster[] = [];
  for (let i = 0; i < count; i++) {
    const base: ClusterContext = {
      kind: kinds[i]!,
      age,
      name: clusterNames[i]!,
      home: i === 0,
      dying: i === 1,
      ring: i === 1,
      merging: i === 2,
      quasar: i === quasar,
      x: x[i]!,
      y: y[i]!,
    };
    bases.push(base);
    maps.push(generateClusterAt(address.child('cluster', i), options, base));
  }

  const filaments = filamentsOf(x, y, maps);
  const landmark = maps[quasar]!.map[1]!;
  const landmarkX = x[quasar]! + landmark.x * universeScale;
  const landmarkY = y[quasar]! + landmark.y * universeScale;
  const clusters: GalaxyCluster[] = [];
  const nodes: UniverseNode[] = [];
  for (let i = 0; i < count; i++) {
    const ends: FilamentEnd[] = [];
    for (const f of filaments) {
      if (!(f.a === i || f.b === i)) {
        continue;
      }

      const [other, mine, theirs] = f.a === i ? [f.b, f.galaxyA, f.galaxyB] : [f.a, f.galaxyB, f.galaxyA];
      ends.push({
        galaxy: mine, otherCluster: other, otherGalaxy: theirs, name: maps[other]!.map[theirs]!.name, dx: x[other]! - x[i]!, dy: y[other]! - y[i]!,
      });
    }

    const cluster = generateClusterAt(address.child('cluster', i), options, {
      ...bases[i],
      filaments: ends,
      landmarkName: landmark.name,
      landmarkAddress: landmark.address,
      landmarkX,
      landmarkY,
    });
    clusters.push(cluster);
    nodes.push({
      index: i,
      address: cluster.address,
      name: cluster.name,
      kind: cluster.kind,
      role: roles[i] ?? 'Field',
      x: x[i]!,
      y: y[i]!,
      galaxies: cluster.map.length,
    });
  }

  const voids = voidsOf(address, options, names, voidSlots, voidSystems, x, y, filaments);
  const pairA = clusters[2]!.map[0]!;
  const pairB = clusters[2]!.map[1]!;
  const merger: UniverseMerger = {
    name: 'the ' + rootOf(pairA.name) + '-' + rootOf(pairB.name) + ' Collision',
    cluster: 2,
    galaxyA: pairA.address,
    galaxyB: pairB.address,
    hook,
  };
  const ring = clusters[1]!.map.find(entry => entry.role === 'Member') ?? clusters[1]!.map[0]!;
  const home = clusters[0]!.map[0]!;
  const giant = clusters[1]!.map[0]!;
  const landmarks: UniverseLandmark[] = [
    {kind: 'Home', name: home.name, address: home.address},
    {kind: 'DyingGiant', name: giant.name, address: giant.address},
    {kind: 'RingGalaxy', name: ring.name, address: ring.address},
    {kind: 'Quasar', name: landmark.name, address: landmark.address},
    {kind: 'Merger', name: merger.name, address: clusters[2]!.address},
  ];
  return {
    address: address.toString(),
    name,
    age,
    radius: universeRadius,
    nodes,
    filaments,
    voids,
    landmarks,
    merger,
    clusters,
    cluster(index: number): GalaxyCluster {
      if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
        throw new RangeError(`This universe has ${count} clusters, numbered 0 to ${count - 1}; you asked for ${index}.`);
      }

      return clusters[index]!;
    },
  };
}

/**
Generates a universe from any seed text or number. C# `Universe.Generate(seed, options)`.
*/
export function generateUniverse(seed: string | number | bigint, options?: Partial<GeneratorOptions>): Universe {
  const o = resolveOptions(options);
  validateOptions(o);
  const text = typeof seed === 'string' ? checkSeed(seed) : seedText(seed);
  return generateUniverseAt(new Address(1, text, 'universe'), o);
}
