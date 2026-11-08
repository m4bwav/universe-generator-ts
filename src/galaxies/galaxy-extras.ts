/**
The galaxy extras: factions over lanes, points of interest, hazards, a monument per region and beacons. A port of
`Galaxies/GalaxyExtras.cs` and `Galaxies/GalaxyExtrasGenerator.cs`. Each part draws from its own stream of the galaxy's
seed and reads only the finished map, so no system moves.
*/
import {DMath} from '../core/dmath.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import type {StarClass, StellarAge} from '../stars/star-generator.ts';

/**
What kind of power a faction is. C# `FactionKind`.
*/
export type FactionKind = 'Empire' | 'Republic' | 'Corporate' | 'Theocracy' | 'Guild' | 'Pirates';

/**
A power that holds systems of a galaxy, grown over its lanes from a capital. C# `Faction`.
*/
export type Faction = {
  readonly index: number;
  readonly name: string;
  readonly kind: FactionKind;
  readonly capital: number;
  readonly systems: number;
  readonly description: string;
};

/**
What a point of interest is. C# `PointOfInterestKind`.
*/
export type PointOfInterestKind = 'Ruins' | 'PrecursorSite' | 'Wreck' | 'Cache' | 'Anomaly' | 'Outpost' | 'Shrine';

/**
A site the galaxy's story places in one system. C# `PointOfInterest`.
*/
export type PointOfInterest = {
  readonly kind: PointOfInterestKind;
  readonly system: number;
  readonly name: string;
  readonly text: string;
  readonly chainStep: number;
  readonly chainLength: number;
};

/**
What a hazard area is. C# `HazardKind`.
*/
export type HazardKind = 'Nebula' | 'IonStorm' | 'GravityRift' | 'DarkCloud' | 'RadiationZone';

/**
An area of a galaxy where travel is harder. C# `GalaxyHazard`.
*/
export type GalaxyHazard = {
  readonly kind: HazardKind;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly systems: readonly number[];
  readonly effect: string;
};

/**
What a region's monument is. C# `MonumentKind`.
*/
export type MonumentKind = 'ColossalStatue' | 'Necropolis' | 'Archive' | 'Battlefield' | 'GreatGate' | 'Observatory' | 'Shrine' | 'Market';

/**
The one monument of a region. C# `Monument`.
*/
export type Monument = {
  readonly region: number;
  readonly system: number;
  readonly kind: MonumentKind;
  readonly name: string;
  readonly text: string;
};

/**
What a beacon is. C# `BeaconKind`.
*/
export type BeaconKind = 'Pulsar' | 'BeaconStar' | 'AccretionGlow' | 'NavigationBeacon' | 'SignalTower';

/**
A beacon seen or heard from anywhere in its galaxy. C# `Beacon`.
*/
export type Beacon = {
  readonly system: number;
  readonly kind: BeaconKind;
  readonly name: string;
  readonly text: string;
};

/**
How active a galaxy's core is. C# `CoreActivity`.
*/
export type CoreActivity = 'Quiet' | 'Seyfert' | 'Quasar';

/**
The map fields the extras read. A subset of `MapEntry`.
*/
export type ExtrasMapEntry = {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly starClass: StarClass;
  readonly region: number;
  readonly hops: number;
  readonly danger: number;
  readonly chokepoint: boolean;
};

/**
The region fields the extras read.
*/
export type ExtrasRegion = {readonly index: number; readonly name: string; readonly age: StellarAge; readonly theme: string; readonly centre: number};

/**
What the extras give a galaxy, and each map entry's holder and border.
*/
export type GalaxyExtras = {
  readonly factions: readonly Faction[];
  readonly holders: ReadonlyArray<{readonly faction: number | undefined; readonly contested: boolean}>;
  readonly points: readonly PointOfInterest[];
  readonly hazards: readonly GalaxyHazard[];
  readonly monuments: readonly Monument[];
  readonly beacons: readonly Beacon[];
};

/**
The theme of a merging galaxy's tidal frontier region. C# `GalaxyGenerator.FrontierTheme`.
*/
export const frontierTheme = 'tidal frontier';

const factionKinds: readonly FactionKind[] = ['Empire', 'Republic', 'Corporate', 'Theocracy', 'Guild', 'Pirates'];
const lawfulKinds = [25, 20, 20, 15, 20];
const anyKinds = [25, 20, 20, 15, 20, 8];

const factionNames: ReadonlyArray<readonly string[]> = [
  ['{0} Hegemony', '{0} Dominion', 'Empire of {0}'],
  ['{0} Republic', 'Free Worlds of {0}', '{0} Union'],
  ['{0} Combine', '{0} Consortium', '{0} Syndicate'],
  ['Synod of {0}', '{0} Covenant', 'Faithful of {0}'],
  ['{0} Compact', '{0} Guild', 'Concord of {0}'],
  ['{0} Raiders', 'Free Captains of {0}', '{0} Corsairs'],
];

const factionNouns = [
  'an empire ruled from',
  'a republic governed from',
  'a corporate state run from',
  'a theocracy ruled from',
  'a guild league based at',
  'pirate clans based at',
];

const pointKinds: readonly PointOfInterestKind[] = ['Ruins', 'Wreck', 'Cache', 'Anomaly', 'Outpost', 'Shrine'];
const pointWeights = [20, 20, 15, 15, 15, 15];
const trails = ['Lantern Path', 'Elder Road', 'Silent Choir', 'Seven Keys', 'Ashen Thread', 'First Map'];
const ruinNames = ['the Fallen City', 'the Broken Spires', 'the Silent Halls', 'the Buried Vaults'];
const ships = ['Valiant', 'Morrow', 'Ashen Star', 'Long Patience', 'Kestrel', 'Iron Psalm', 'Far Promise', 'Heron'];
const pointTexts: ReadonlyArray<readonly string[]> = [
  ['the ruins of a city older than the lanes', 'towers half buried in dust, their makers long gone'],
  ['a warship broken in an old battle for this crossing', 'a hulk drifting near the lanes, its logs still intact'],
  ['a hidden store of fuel and parts, unclaimed', 'a smugglers\' stash, sealed and forgotten'],
  ['a light that moves against the stars', 'a pocket of space where instruments disagree'],
  ['an abandoned outpost at the edge of charted space', 'a listening post whose crew left in a hurry'],
  ['a pilgrims\' shrine, tended by a few', 'a shrine where travellers leave tokens for safe passage'],
];

const hazardKinds: readonly HazardKind[] = ['Nebula', 'IonStorm', 'GravityRift', 'DarkCloud', 'RadiationZone'];
const hazardWeights = [35, 25, 15, 25];
const hazardRoots = [
  'Veil',
  'Crimson',
  'Shroud',
  'Ember',
  'Azure',
  'Hollow',
  'Wraith',
  'Lantern',
  'Ashen',
  'Pale',
  'Thorn',
  'Weeping',
  'Iron',
  'Gilded',
  'Sable',
  'Mourning',
];
const hazardNames = ['Nebula', 'Storm', 'Rift', 'Dark'];
const hazardEffects = [
  'a nebula: sensors are blind inside it',
  'a lasting ion storm: shields and drives fail without warning',
  'a rift in space: the lanes shift and travel takes longer',
  'a dark cloud: no starlight, so pilots navigate by beacon',
  'radiation from the active core: shields wear down and crews sicken',
];

const monumentKinds: readonly MonumentKind[] = ['ColossalStatue', 'Necropolis', 'Archive', 'Battlefield', 'GreatGate', 'Observatory', 'Shrine', 'Market'];
const monumentDefault = [1, 1, 1, 1, 1, 1, 1, 1];
const monumentThemes: ReadonlyArray<readonly [string, readonly number[]]> = [
  ['frontier', [1, 1, 1, 4, 1, 2, 1, 1]],
  ['old empire', [4, 2, 2, 1, 3, 1, 1, 1]],
  ['pirate haven', [1, 1, 1, 3, 1, 1, 1, 3]],
  ['trade corridor', [1, 1, 1, 1, 2, 1, 1, 4]],
  ['precursor ruins', [1, 4, 3, 1, 2, 1, 1, 1]],
  ['nebula maze', [1, 1, 1, 1, 1, 4, 2, 1]],
  ['mining belt', [2, 1, 1, 1, 1, 1, 2, 3]],
  ['quarantine zone', [1, 3, 2, 1, 1, 2, 2, 1]],
  [frontierTheme, [1, 1, 1, 4, 1, 3, 1, 1]],
];
const monumentNames = [
  'the Colossus of {0}',
  'the {0} Necropolis',
  'the Archive of {0}',
  'the {0} Battlefield',
  'the {0} Arch',
  'the {0} Observatory',
  'the {0} Sanctum',
  'the Great Market of {0}',
];
const monumentTexts: ReadonlyArray<readonly string[]> = [
  ['a statue the height of a mountain, of a ruler no one agrees on', 'a giant figure carved from a moon, facing the core'],
  ['a city of tombs on a dead world', 'catacombs that run through a hollowed moon'],
  ['a vault of records older than any living power', 'a library ship anchored here for centuries'],
  ['a field of wrecks from the battle that set the region\'s borders', 'a graveyard of fleets, still salvaged and still mourned'],
  ['a ring of stone and metal wide enough for fleets to pass', 'an arch built across the lane by an empire that wanted to be remembered'],
  ['a telescope the size of a city, still charting the galaxy', 'an array of dishes that listens to the core'],
  ['a holy place where pilgrims gather from across the region', 'a temple built around a light no one can explain'],
  ['a market where the whole region trades', 'a bazaar of docked ships that never closes'],
];

const brightClasses = new Set<StarClass>(['Giant', 'Supergiant', 'NeutronStar', 'BlackHole']);
const beaconKinds: readonly BeaconKind[] = ['Pulsar', 'BeaconStar', 'AccretionGlow', 'NavigationBeacon', 'SignalTower'];
const beaconNames = ['the {0} Pulsar', 'the {0} Lantern', 'the {0} Glow', '{0} Light', 'the {0} Signal'];
const beaconTexts = [
  'a pulsar whose beat every navigator times by',
  'a giant star bright enough to steer by from anywhere in the galaxy',
  'the glowing disk around a black hole, seen from every system',
  'an ancient navigation light that every chart marks',
  'a tower broadcasting on every channel, heard across the galaxy',
];

const format = (template: string, name: string): string => template.replace('{0}', () => name);

/**
Hops from `from` to every system over lanes; -1 where no route exists.
*/
function bfs(adjacent: ReadonlyArray<readonly number[]>, from: number): number[] {
  const d = Array.from({length: adjacent.length}, () => -1);
  const queue = [from];
  d[from] = 0;
  let head = 0;
  while (head < queue.length) {
    const s = queue[head++]!;
    for (const t of adjacent[s]!) {
      if (!(d[t]! < 0)) {
        continue;
      }

      d[t] = d[s]! + 1;
      queue.push(t);
    }
  }

  return d;
}

/**
Builds the extras of a galaxy from its seed and finished map. C# `GalaxyExtrasGenerator.Generate`.
*/
export function generateGalaxyExtras(
  seed: bigint,
  lanes: ReadonlyArray<readonly [number, number, boolean]>,
  core: number,
  regions: readonly ExtrasRegion[],
  map: readonly ExtrasMapEntry[],
  activity: CoreActivity = 'Quiet',
  coreRadius = 0,
): GalaxyExtras {
  const n = map.length;
  const adjacent: number[][] = Array.from({length: n}, () => []);
  const bridgeEnd: boolean[] = Array.from({length: n}, () => false);
  for (const [a, b, bridge] of lanes) {
    adjacent[a]!.push(b);
    adjacent[b]!.push(a);
    if (!bridge) {
      continue;
    }

    bridgeEnd[a] = true;
    bridgeEnd[b] = true;
  }

  for (const list of adjacent) {
    list.sort((x, y) => x - y);
  }

  const {factions, holders} = makeFactions(Seeds.stream(seed, 'factions'), regions, map, adjacent);
  const points = makePoints(Seeds.stream(seed, 'points'), core, regions, map, adjacent, bridgeEnd);
  const hazards = makeHazards(Seeds.stream(seed, 'hazards'), regions, map, activity, coreRadius);
  const monuments = makeMonuments(Seeds.stream(seed, 'monuments'), core, regions, map, points);
  const beacons = makeBeacons(Seeds.stream(seed, 'beacons'), map);
  return {
    factions, holders, points, hazards, monuments, beacons,
  };
}

function makeFactions(rng: Pcg32, regions: readonly ExtrasRegion[], map: readonly ExtrasMapEntry[], adjacent: ReadonlyArray<readonly number[]>) {
  const n = map.length;
  let depth = 10;
  for (const m of map) {
    depth = Math.max(depth, m.hops);
  }

  const count = n < 8 ? 1 : rng.range(2, Math.min(6, 2 + Math.trunc(n / 25)));
  let pirateCapital = -1;
  if (count >= 2) {
    for (const r of regions) {
      if (r.theme === 'pirate haven' || r.theme === frontierTheme) {
        pirateCapital = r.centre;
        break;
      }
    }
  }

  const owner: number[] = Array.from({length: n}, () => -1);
  const near: number[] = Array.from({length: n}, () => 2_147_483_647);
  const kinds: FactionKind[] = [];
  const capitals: number[] = [];
  const reach: number[] = [];
  const variants: number[] = [];
  const candidates: number[] = [];
  for (let f = 0; f < count; f++) {
    const pirate = f === count - 1 && pirateCapital >= 0;
    kinds[f] = pirate ? 'Pirates' : factionKinds[rng.weighted(f === 0 || pirateCapital >= 0 ? lawfulKinds : anyKinds)]!;
    if (pirate) {
      capitals[f] = pirateCapital;
    } else {
      candidates.length = 0;
      let best = -1;
      for (let i = 0; i < n; i++) {
        if (owner[i]! >= 0 || i === pirateCapital) {
          continue;
        }

        if (f === 0 ? map[i]!.danger <= 4 : near[i]! >= 3) {
          candidates.push(i);
        }

        best = Math.max(best, near[i]!);
      }

      if (candidates.length === 0) {
        for (let i = 0; i < n; i++) {
          if (owner[i]! < 0 && i !== pirateCapital && (f === 0 || near[i] === best)) {
            candidates.push(i);
          }
        }
      }

      const weights = candidates.map(c => {
        const {danger} = map[c]!;
        return kinds[f] === 'Pirates' ? danger : 11 - danger;
      });
      capitals[f] = candidates[rng.weighted(weights)]!;
    }

    owner[capitals[f]!] = f;
    const hops = bfs(adjacent, capitals[f]!);
    for (let i = 0; i < n; i++) {
      if (hops[i]! >= 0 && hops[i]! < near[i]!) {
        near[i] = hops[i]!;
      }
    }

    reach[f] = Math.trunc((kinds[f] === 'Empire' ? rng.range(3, 6) : rng.range(2, 5)) * depth / 10);
    variants[f] = rng.nextInt(3);
  }

  const frontier: number[][] = [];
  let most = 0;
  for (let f = 0; f < count; f++) {
    frontier[f] = [capitals[f]!];
    most = Math.max(most, reach[f]!);
  }

  for (let round = 1; round <= most; round++) {
    for (let f = 0; f < count; f++) {
      if (round > reach[f]!) {
        continue;
      }

      const next: number[] = [];
      for (const s of frontier[f]!) {
        for (const t of adjacent[s]!) {
          if (!(owner[t]! < 0 && (kinds[f] === 'Pirates' || map[t]!.danger <= 8))) {
            continue;
          }

          owner[t] = f;
          next.push(t);
        }
      }

      frontier[f] = next;
    }
  }

  const held: number[] = Array.from({length: count}, () => 0);
  const holders: Array<{faction: number | undefined; contested: boolean}> = [];
  for (let i = 0; i < n; i++) {
    let contested = false;
    if (owner[i]! >= 0) {
      held[owner[i]!]!++;
      for (const t of adjacent[i]!) {
        contested ||= owner[t]! >= 0 && owner[t] !== owner[i];
      }
    }

    holders.push({faction: owner[i]! >= 0 ? owner[i] : undefined, contested});
  }

  const factions: Faction[] = [];
  for (let f = 0; f < count; f++) {
    const capital = map[capitals[f]!]!.name;
    const k = factionKinds.indexOf(kinds[f]!);
    factions.push({
      index: f,
      name: format(factionNames[k]![variants[f]!]!, capital),
      kind: kinds[f]!,
      capital: capitals[f]!,
      systems: held[f]!,
      description: `${factionNouns[k]!} ${capital}, holding ${held[f]!}${held[f] === 1 ? ' system' : ' systems'}`,
    });
  }

  return {factions, holders};
}

function pointWeight(kind: PointOfInterestKind, m: ExtrasMapEntry, region: ExtrasRegion, bridge: boolean, coreRegion: number, mostHops: number): number {
  const {theme} = region;
  switch (kind) {
    case 'Ruins': {
      return region.age === 'Young' ? 0 : (theme === 'precursor ruins' ? 3 : 1);
    }

    case 'Wreck': {
      return m.chokepoint || bridge ? 3 : 1;
    }

    case 'Cache': {
      return m.chokepoint || m.region === coreRegion ? 0 : 1;
    }

    case 'Anomaly': {
      return theme === 'nebula maze' || theme === 'quarantine zone' ? 3 : 1;
    }

    case 'Outpost': {
      return m.hops * 2 >= mostHops ? 3 : 1;
    }

    default: {
      return 1;
    }
  }
}

function pointName(kind: PointOfInterestKind, flavour: number, at: string): string {
  switch (kind) {
    case 'Ruins': {
      return `${ruinNames[flavour % ruinNames.length]!} of ${at}`;
    }

    case 'Wreck': {
      return `the wreck of the ${ships[flavour % ships.length]!}`;
    }

    case 'Cache': {
      return `${at} Cache`;
    }

    case 'Anomaly': {
      return `the ${at} Anomaly`;
    }

    case 'Outpost': {
      return `${at} Outpost`;
    }

    default: {
      return `the Shrine of ${at}`;
    }
  }
}

function precursorTrail(rng: Pcg32, regions: readonly ExtrasRegion[], map: readonly ExtrasMapEntry[], adjacent: ReadonlyArray<readonly number[]>, taken: boolean[], points: PointOfInterest[]): void {
  const n = map.length;
  let length = rng.range(3, 5);
  const eligible: number[] = [];
  for (const r of regions) {
    if (r.age !== 'Young') {
      eligible.push(r.index);
    }
  }

  if (eligible.length < 2) {
    return;
  }

  length = Math.min(length, eligible.length);
  const hops = new Map<number, number[]>();
  for (const r of eligible) {
    hops.set(r, bfs(adjacent, regions[r]!.centre));
  }

  const used = [eligible[rng.nextInt(eligible.length)]!];
  while (used.length < length) {
    let pick = -1;
    let farthest = -1;
    for (const r of eligible) {
      if (used.includes(r)) {
        continue;
      }

      let nearest = 2_147_483_647;
      for (const u of used) {
        nearest = Math.min(nearest, hops.get(u)![regions[r]!.centre]!);
      }

      if (!(nearest > farthest)) {
        continue;
      }

      farthest = nearest;
      pick = r;
    }

    used.push(pick);
  }

  const trail = trails[rng.nextInt(trails.length)]!;
  const sites: number[] = [];
  const members: number[] = [];
  for (let k = 0; k < length; k++) {
    members.length = 0;
    for (let i = 0; i < n; i++) {
      if (map[i]!.region === used[k] && taken[i] === false) {
        members.push(i);
      }
    }

    sites[k] = members[rng.nextInt(members.length)]!;
    taken[sites[k]!] = true;
  }

  for (let k = 0; k < length; k++) {
    points.push({
      kind: 'PrecursorSite',
      system: sites[k]!,
      name: `the ${trail} at ${map[sites[k]!]!.name}`,
      text: k + 1 < length
        ? `site ${k + 1} of ${length} of a precursor trail; its markings point to ${map[sites[k + 1]!]!.name}`
        : `the last of ${length} sites of a precursor trail; whatever it guards is here`,
      chainStep: k + 1,
      chainLength: length,
    });
  }
}

function makePoints(
  rng: Pcg32,
  core: number,
  regions: readonly ExtrasRegion[],
  map: readonly ExtrasMapEntry[],
  adjacent: ReadonlyArray<readonly number[]>,
  bridgeEnd: readonly boolean[],
): PointOfInterest[] {
  const n = map.length;
  const taken: boolean[] = Array.from({length: n}, () => false);
  const points: PointOfInterest[] = [];
  let mostHops = 0;
  for (const m of map) {
    mostHops = Math.max(mostHops, m.hops);
  }

  if (n >= 30) {
    precursorTrail(rng, regions, map, adjacent, taken, points);
  }

  const coreRegion = map[core]!.region;
  const count = Math.max(1, rng.range(Math.trunc(n / 10), Math.trunc(n / 6)));
  const weights: number[] = Array.from({length: n}, () => 0);
  for (let p = 0; p < count; p++) {
    const kindIndex = rng.weighted(pointWeights);
    const kind = pointKinds[kindIndex]!;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const m = map[i]!;
      const w = taken[i] === true ? 0 : pointWeight(kind, m, regions[m.region]!, bridgeEnd[i]!, coreRegion, mostHops);
      weights[i] = w;
      total += w;
    }

    // The text and name draws come first, so a kind with no place left still uses the same draws.
    const text = pointTexts[kindIndex]![rng.nextInt(2)]!;
    // eslint-disable-next-line unicorn/no-declarations-before-early-exit
    const flavour = rng.nextInt(8);
    if (total === 0) {
      continue;
    }

    let roll = rng.nextInt(total);
    let system = 0;
    while (roll >= weights[system]!) {
      roll -= weights[system]!;
      system++;
    }

    taken[system] = true;
    points.push({
      kind, system, name: pointName(kind, flavour, map[system]!.name), text, chainStep: 0, chainLength: 0,
    });
  }

  return points;
}

function makeHazards(rng: Pcg32, regions: readonly ExtrasRegion[], map: readonly ExtrasMapEntry[], activity: CoreActivity, coreRadius: number): GalaxyHazard[] {
  const n = map.length;
  const hazards: GalaxyHazard[] = [];
  const names = new Set<string>();
  const make = (kind: number, name: string, x: number, y: number, radius: number): GalaxyHazard => {
    let unique = name;
    for (let serial = 2; names.has(unique); serial++) {
      unique = `${name} ${serial}`;
    }

    names.add(unique);
    const inside: number[] = [];
    for (let i = 0; i < n; i++) {
      const dx = map[i]!.x - x;
      const dy = map[i]!.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        inside.push(i);
      }
    }

    return {
      kind: hazardKinds[kind]!, name: unique, x, y, radius, systems: inside, effect: hazardEffects[kind]!,
    };
  };

  const name = (kind: number): string => `the ${hazardRoots[rng.nextInt(hazardRoots.length)]!} ${hazardNames[kind]!}`;

  const count = rng.range(1, 1 + Math.trunc(n / 40));
  for (let h = 0; h < count; h++) {
    const kind = rng.weighted(hazardWeights);
    const centre = rng.nextInt(n);
    const radius = DMath.round(rng.range(80, 220), 0);
    hazards.push(make(kind, name(kind), map[centre]!.x, map[centre]!.y, radius));
  }

  for (const r of regions) {
    if (r.theme !== 'nebula maze') {
      continue;
    }

    const radius = DMath.round(rng.range(120, 220), 0);
    hazards.push(make(0, name(0), map[r.centre]!.x, map[r.centre]!.y, radius));
  }

  if (activity !== 'Quiet' && coreRadius > 0) {
    hazards.push(make(4, 'the Core Glare', 0, 0, coreRadius));
  }

  return hazards;
}

function makeMonuments(rng: Pcg32, core: number, regions: readonly ExtrasRegion[], map: readonly ExtrasMapEntry[], points: readonly PointOfInterest[]): Monument[] {
  const busy = new Set<number>([core]);
  for (const p of points) {
    busy.add(p.system);
  }

  const monuments: Monument[] = [];
  for (const [r, region] of regions.entries()) {
    const members: number[] = [];
    const free: number[] = [];
    for (const [i, element] of map.entries()) {
      if (element.region !== r) {
        continue;
      }

      members.push(i);
      if (!busy.has(i)) {
        free.push(i);
      }
    }

    const from = free.length > 0 ? free : members;
    const system = from[rng.nextInt(from.length)]!;
    let weights: readonly number[] = monumentDefault;
    for (const [theme, w] of monumentThemes) {
      if (theme === region.theme) {
        weights = w;
      }
    }

    const kind = rng.weighted(weights);
    monuments.push({
      region: r,
      system,
      kind: monumentKinds[kind]!,
      name: format(monumentNames[kind]!, region.name),
      text: monumentTexts[kind]![rng.nextInt(2)]!,
    });
  }

  return monuments;
}

function makeBeacons(rng: Pcg32, map: readonly ExtrasMapEntry[]): Beacon[] {
  const n = map.length;
  if (n < 2) {
    return [];
  }

  const count = n < 10 ? 1 : rng.range(2, 4);
  const bright: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = map[i]!.starClass;
    if (brightClasses.has(c)) {
      bright.push(i);
    }
  }

  const chosen = [bright.length > 0 ? bright[rng.nextInt(bright.length)]! : rng.nextInt(n)];
  while (chosen.length < count) {
    let far = -1;
    let farthest = -1;
    for (let i = 0; i < n; i++) {
      let nearest = Number.MAX_VALUE;
      for (const c of chosen) {
        const dx = map[i]!.x - map[c]!.x;
        const dy = map[i]!.y - map[c]!.y;
        nearest = Math.min(nearest, dx * dx + dy * dy);
      }

      if (!(nearest > farthest)) {
        continue;
      }

      farthest = nearest;
      far = i;
    }

    chosen.push(far);
  }

  const beacons: Beacon[] = [];
  for (let b = 0; b < count; b++) {
    const star = map[chosen[b]!]!.starClass;
    let kind: number;
    switch (star) {
      case 'NeutronStar': {
        kind = 0;

        break;
      }

      case 'Giant':
      case 'Supergiant': {
        kind = 1;

        break;
      }

      case 'BlackHole': {
        kind = 2;

        break;
      }

      default: {
        kind = rng.chance(1, 2) ? 3 : 4;
      }
    }

    beacons.push({
      system: chosen[b]!,
      kind: beaconKinds[kind]!,
      name: format(beaconNames[kind]!, map[chosen[b]!]!.name),
      text: beaconTexts[kind]!,
    });
  }

  return beacons;
}
