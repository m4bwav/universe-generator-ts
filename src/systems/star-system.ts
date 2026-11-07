/**
A star system: star, companion, zones, planets with moons, belts, stations, landmarks, tags and a descriptor. A port of
`Systems/StarSystemGenerator.cs` and `Systems/Story.cs`. The detail layers (PlanetDetail, MoonDetail, BeltDetail and
their stories) draw only from their own streams and add fields; they are not ported yet.
*/
import {Address} from '../core/address.ts';
import {DMath} from '../core/dmath.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import {systemName} from '../names/invented-names.ts';
import {
  checkSeed,
  resolveOptions,
  seedText,
  validateOptions,
  type GeneratorOptions,
} from '../options.ts';
import {
  giantMoons,
  planetCold,
  planetHot,
  planetTemperate,
  planetWarm,
  tablesFor,
  type GeneratorTables,
} from '../tables.ts';
import {
  rollStar,
  type Companion,
  type Star,
  type StarClass,
  type StellarAge,
} from '../stars/star-generator.ts';

export type PlanetKind = 'Lava' | 'Iron' | 'Barren' | 'Desert' | 'Rocky' | 'Greenhouse' | 'Ocean' | 'Garden' | 'Ice' | 'Dwarf' | 'SubNeptune' | 'GasGiant' | 'IceGiant' | 'HotJupiter';
export type MoonKind = 'Barren' | 'Ice' | 'Volcanic' | 'Ocean' | 'Hazy' | 'Garden';
export type BeltKind = 'Asteroid' | 'Ice';
export type OrbitZone = 'Hot' | 'Warm' | 'Temperate' | 'Cold' | 'Outer';
export type LandmarkKind = 'UnusualStar' | 'BinaryStar' | 'LivingWorld' | 'RingedGiant' | 'HotJupiter' | 'AsteroidBelt' | 'Ruins' | 'Derelict'
  | 'Nebula' | 'Comet' | 'Anomaly' | 'Megastructure' | 'RoguePlanet' | 'AncientBeacon' | 'ShatteredWorld' | 'TemporalAnomaly' | 'DerelictFleet';
export type StationKind = 'TradeHub' | 'Shipyard' | 'MiningPlatform' | 'ResearchStation' | 'NavalBase' | 'PirateDen' | 'Refinery' | 'Relay';

export type Moon = {
  readonly address: string; readonly index: number; readonly name: string; readonly kind: MoonKind; readonly orbit: number; readonly radius: number;
};

export type Planet = {
  readonly address: string;
  readonly index: number;
  readonly name: string;
  readonly kind: PlanetKind;
  readonly zone: OrbitZone;
  readonly orbit: number;
  readonly period: number;
  readonly eccentricity: number;
  readonly inclination: number;
  readonly periapsisAngle: number;
  readonly mass: number;
  readonly radius: number;
  readonly rings: boolean;
  readonly moons: readonly Moon[];
  readonly descriptor: string;
};

export type Belt = {readonly kind: BeltKind; readonly inner: number; readonly outer: number};
export type Station = {readonly address: string; readonly name: string; readonly kind: StationKind; readonly planet: number | undefined};
export type Landmark = {readonly kind: LandmarkKind; readonly planet: number | undefined; readonly outlier: boolean; readonly text: string};

export type StarSystem = {
  readonly address: string;
  readonly name: string;
  readonly star: Star;
  readonly companion: Companion | undefined;
  readonly age: StellarAge;
  readonly danger: number;
  readonly habitableZoneInner: number;
  readonly habitableZoneOuter: number;
  readonly frostLine: number;
  readonly planets: readonly Planet[];
  readonly belts: readonly Belt[];
  readonly stations: readonly Station[];
  readonly landmarks: readonly Landmark[];
  readonly tags: readonly string[];
  readonly descriptor: string;
};

/**
What a galaxy decides for a system; undefined fields are drawn from the system's own streams. C# `SystemContext`.
*/
export type SystemInput = {
  readonly name?: string;
  readonly age?: StellarAge;
  readonly danger?: number;
  readonly richness?: number;
};

const auPerSolarRadius = 0.00465;
const kmPerAu = 1.496e8;
const kmPerEarthRadius = 6371;
const sunsPerEarthMass = 3.003e-6;
const ages: StellarAge[] = ['Young', 'Mature', 'Old'];
const ageWeights = [30, 45, 25];
const hotKinds: PlanetKind[] = ['Lava', 'Iron', 'Barren', 'Greenhouse'];
const warmKinds: PlanetKind[] = ['Barren', 'Desert', 'Greenhouse', 'Rocky'];
const temperateKinds: PlanetKind[] = ['Rocky', 'Ocean', 'Garden', 'Desert', 'Barren'];
const coldKinds: PlanetKind[] = ['Barren', 'Rocky', 'Ice', 'Desert'];
const giantMoonKinds: MoonKind[] = ['Ice', 'Barren', 'Volcanic', 'Ocean', 'Hazy'];
const stationCountWeights = [60, 30, 10];
const romanNumerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
const romanValues = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
const stationKinds: StationKind[] = ['TradeHub', 'Shipyard', 'MiningPlatform', 'ResearchStation', 'NavalBase', 'PirateDen', 'Refinery', 'Relay'];
const stationWords = [
  'Nova',
  'Orion',
  'Helios',
  'Drift',
  'Kepler',
  'Atlas',
  'Meridian',
  'Halcyon',
  'Tethys',
  'Corvid',
  'Ember',
  'Lantern',
  'Bastion',
  'Solace',
  'Vigil',
  'Cinder',
  'Aurora',
  'Beacon',
  'Cairn',
  'Dawn',
  'Echo',
  'Farpoint',
  'Gantry',
  'Harbor',
  'Icarus',
  'Juno',
  'Keystone',
  'Lodestar',
  'Magellan',
  'Nadir',
  'Oasis',
  'Paragon',
  'Quarry',
  'Rampart',
  'Sable',
  'Talon',
  'Umbra',
  'Vanguard',
  'Waypoint',
  'Zenith',
  'Anchor',
  'Bulwark',
  'Crucible',
  'Dominion',
  'Esprit',
  'Fathom',
  'Garrison',
  'Haven',
  'Ironside',
  'Jubilee',
  'Kestrel',
  'Liberty',
  'Mariner',
  'Nimbus',
  'Outlook',
  'Pinnacle',
  'Respite',
  'Sentinel',
  'Threshold',
  'Unity',
  'Valor',
  'Wayfarer',
  'Yardarm',
  'Zephyr',
];
const stationKindNames = ['Trade Hub', 'Shipyard', 'Mining Platform', 'Research Station', 'Naval Base', 'Pirate Den', 'Refinery', 'Relay'];
const fallbacks: LandmarkKind[] = ['Ruins', 'Derelict', 'Nebula', 'Comet', 'Anomaly'];
const fallbackWeights = [30, 25, 15, 15, 15];
const outliers: LandmarkKind[] = ['Megastructure', 'RoguePlanet', 'AncientBeacon', 'ShatteredWorld', 'TemporalAnomaly', 'DerelictFleet'];

// Size classes: 0 dwarf, 1 terrestrial, 2 sub-Neptune, 3 ice giant, 4 gas giant.
type Draft = {orbit: number; period: number; mass: number; radius: number; kind: PlanetKind; zone: OrbitZone};
type Pod = {rocky: number; gassy: number};

const logUniform = (rng: Pcg32, low: number, high: number): number => low * DMath.exp(rng.nextDouble() * DMath.log(high / low));

const withArticle = (words: string): string => ('aeiou'.includes(words[0]!) ? 'an ' : 'a ') + words;

const noGardenClasses = new Set<StarClass>(['O', 'B', 'Giant', 'Supergiant', 'WhiteDwarf', 'NeutronStar', 'BlackHole']);

function zones(light: number): [number, number, number] {
  return [DMath.round(Math.sqrt(light / 1.776), 4), DMath.round(Math.sqrt(light / 0.32), 4), DMath.round(2.7 * Math.sqrt(light), 4)];
}

function zoneOf(orbit: number, hzInner: number, hzOuter: number, frost: number): OrbitZone {
  if (orbit < hzInner * 0.5) {
    return 'Hot';
  }

  if (orbit < hzInner) {
    return 'Warm';
  }

  if (orbit <= hzOuter) {
    return 'Temperate';
  }

  return orbit <= frost ? 'Cold' : 'Outer';
}

const counts: Record<StarClass, [number, number, number, number]> = {
  O: [0, 1, 0, 3],
  B: [0, 2, 0, 3],
  A: [0, 3, 1, 4],
  F: [1, 5, 0, 4],
  G: [1, 5, 0, 4],
  K: [1, 5, 0, 3],
  M: [1, 5, 0, 2],
  WhiteDwarf: [0, 1, 0, 3],
  Giant: [0, 1, 1, 4],
  Supergiant: [0, 0, 0, 2],
  NeutronStar: [0, 2, 0, 0],
  BlackHole: [0, 1, 0, 2],
};

function planetRadius(mass: number, kind: PlanetKind): number {
  if (mass <= 2.8 && kind !== 'SubNeptune') {
    return DMath.pow(mass, 0.279);
  }

  const r = mass <= 95 ? 0.808 * DMath.pow(mass, 0.589) : 11.2 * DMath.pow(mass / 318, -0.044);
  return kind === 'HotJupiter' ? r * 1.2 : r;
}

function terrestrialKind(rng: Pcg32, zone: OrbitZone, mass: number, noGarden: boolean, tables: GeneratorTables): PlanetKind {
  let kind: PlanetKind;
  switch (zone) {
    case 'Hot': {
      kind = hotKinds[rng.weighted(tables.weights(planetHot))]!;
      break;
    }

    case 'Warm': {
      kind = warmKinds[rng.weighted(tables.weights(planetWarm))]!;
      break;
    }

    case 'Temperate': {
      kind = temperateKinds[rng.weighted(tables.weights(planetTemperate))]!;
      break;
    }

    case 'Cold': {
      kind = coldKinds[rng.weighted(tables.weights(planetCold))]!;
      break;
    }

    default: {
      kind = rng.chance(70, 100) ? 'Ice' : 'Barren';
    }
  }

  // Small worlds cannot hold an atmosphere (the Jeans rule, coarsely); dead or blazing stars host no gardens.
  if (kind === 'Greenhouse' && mass < 0.5) {
    kind = 'Barren';
  }

  if (mass < 0.2 && (kind === 'Ocean' || kind === 'Garden')) {
    kind = 'Barren';
  }

  if (mass < 0.1 && (kind === 'Desert' || kind === 'Rocky')) {
    kind = zone === 'Cold' ? 'Ice' : 'Barren';
  }

  if (kind === 'Garden' && noGarden) {
    kind = 'Rocky';
  }

  return kind;
}

function draw(rng: Pcg32, orbit: number, totalMass: number, zone: OrbitZone, g: number, innerLink: boolean, pod: Pod, noGarden: boolean, tables: GeneratorTables): Draft {
  // Weights [dwarf, terrestrial, sub-Neptune, ice giant, gas giant] per zone; giants follow the star's mass.
  let weights: number[];
  switch (zone) {
    case 'Hot': {
      weights = [0, 70, 12, 0, Math.trunc(g / 6)];
      break;
    }

    case 'Warm': {
      weights = [0, 65, 28, 0, Math.trunc(g / 8)];
      break;
    }

    case 'Temperate': {
      weights = [0, 70, 22, 0, Math.trunc(g / 10)];
      break;
    }

    case 'Cold': {
      weights = [8, 45, 15, 10, g];
      break;
    }

    default: {
      const link = innerLink ? 2 : 1;
      weights = [20, 12, 6, 30 * link, Math.trunc(g * 16 / 10) * link];
    }
  }

  let size = rng.weighted(weights);
  let mass: number;
  const z = rng.rangeDouble(-1, 1) + rng.rangeDouble(-1, 1);
  switch (size) {
    case 0: {
      mass = logUniform(rng, 0.001, 0.05);
      break;
    }

    case 1: {
      mass = DMath.clamp(pod.rocky * DMath.exp(0.35 * z), 0.05, 2.8);
      break;
    }

    case 2: {
      mass = DMath.clamp(pod.gassy * DMath.exp(0.35 * z), 4.7, 20);
      break;
    }

    case 3: {
      mass = logUniform(rng, 10, 50);
      break;
    }

    default: {
      // Skewed towards Saturn and Jupiter masses; super-Jupiters up to 4,000 Earths stay rare.
      const u = rng.nextDouble();
      mass = 50 * DMath.exp(u * u * DMath.log(80));
    }
  }

  const period = 365.25 * Math.sqrt(orbit * orbit * orbit / totalMass);
  if (size === 2 && period < 10) {
    // The hot Neptune desert: its gas boiled away, leaving the rocky core.
    size = 1;
    mass = DMath.clamp(mass * 0.3, 0.05, 2.8);
  }

  const kinds: Array<PlanetKind | undefined> = ['Dwarf', undefined, 'SubNeptune', 'IceGiant', zone === 'Hot' ? 'HotJupiter' : 'GasGiant'];
  const kind = kinds[size] ?? terrestrialKind(rng, zone, mass, noGarden, tables);
  return {
    orbit, period, mass, radius: planetRadius(mass, kind), kind, zone,
  };
}

function drawPlanets(rng: Pcg32, star: Star, companion: Companion | undefined, totalMass: number, hzInner: number, hzOuter: number, frost: number, richness: number, tables: GeneratorTables): Draft[] {
  const [innerMin, innerMax, outerMin, outerMax] = counts[star.class];
  const innerCount = rng.range(innerMin, innerMax);
  const outerCount = rng.range(outerMin, outerMax);
  let giantWeight = Math.trunc(30 * DMath.clamp(star.mass, 0.15, 1.6));
  // Giant planets follow the metallicity of their galaxy; 100% leaves the weight as it was.
  if (richness !== 100) {
    giantWeight = Math.trunc(giantWeight * richness / 100);
  }

  // Peas in a pod (Weiss 2018): one typical mass per system for small planets, one for sub-Neptunes.
  const rocky = logUniform(rng, 0.25, 2.2);
  const pod = {rocky, gassy: logUniform(rng, 4.7, 12)};
  const isNoGarden = noGardenClasses.has(star.class);
  let minOrbit = Math.max(0.01, star.radius * auPerSolarRadius * 3);
  if (companion?.orbit === 'Close') {
    minOrbit = Math.max(minOrbit, 3 * companion.separation);
  }

  let planets: Draft[] = [];
  let isInnerLink = false;
  let orbit = Math.max(rng.rangeDouble(0.04, 0.3) * DMath.pow(totalMass, 1 / 3), minOrbit);
  for (let i = 0; i < innerCount && orbit <= frost; i++) {
    const p = draw(rng, orbit, totalMass, zoneOf(orbit, hzInner, hzOuter, frost), giantWeight, false, pod, isNoGarden, tables);
    planets.push(p);
    if (p.mass >= 2 && p.mass <= 20) {
      isInnerLink = true;
    }

    // Neighbour period ratio log-normal around 1.8 (Weiss 2018: rarely under 1.2); giants keep at least 1.6.
    const z = rng.rangeDouble(-1, 1) + rng.rangeDouble(-1, 1);
    let ratio = DMath.clamp(1.8 * DMath.exp(0.28 * z), 1.25, 4);
    if (p.mass >= 10) {
      ratio = Math.max(ratio, 1.6);
    }

    orbit *= DMath.pow(ratio, 2 / 3);
  }

  const last = planets.length > 0 ? planets.at(-1)!.orbit : minOrbit;
  orbit = Math.max(last * 1.4, minOrbit, frost * rng.rangeDouble(0.8, 1.5));
  for (let j = 0; j < outerCount; j++) {
    planets.push(draw(rng, orbit, totalMass, zoneOf(orbit, hzInner, hzOuter, frost), giantWeight, isInnerLink, pod, isNoGarden, tables));
    orbit *= rng.rangeDouble(1.5, 2.3);
  }

  // A wide companion under 200 au truncates the disc at about 0.3 of its distance.
  if (companion?.orbit === 'Wide' && companion.separation < 200) {
    planets = planets.filter(p => !(p.orbit > 0.3 * companion.separation));
  }

  return planets;
}

function eccentricityCap(drafts: Draft[], i: number): number {
  const a = drafts[i]!.orbit;
  let cap = 0.6;
  for (const [j, draft] of drafts.entries()) {
    if (j === i) {
      continue;
    }

    const b = draft.orbit;
    cap = Math.min(cap, 0.5 * Math.abs(b - a) / (b + a));
  }

  return cap;
}

// Sigma * sqrt(-2 ln(1 - u)) with u from a 24-bit integer draw.
function rayleigh(rng: Pcg32, sigma: number): number {
  const u = rng.nextInt(1 << 24) / 16_777_216;
  return sigma * Math.sqrt(-2 * DMath.log(1 - u));
}

function elements(rng: Pcg32, orbit: number, multi: boolean, cap: number): [number, number, number] {
  let eccentricity = rayleigh(rng, multi ? 0.05 : 0.25);
  const i = rayleigh(rng, multi ? 1.5 : 10);
  const w = rng.nextInt(3600) / 10;
  if (orbit < 0.1) {
    eccentricity *= orbit / 0.1 * 0.5;
  }

  eccentricity = DMath.clamp(eccentricity, 0, cap);
  return [DMath.round(eccentricity, 3), DMath.round(Math.min(i, 90), 1), w];
}

function ringPercent(kind: PlanetKind): number {
  switch (kind) {
    case 'GasGiant': {
      return 40;
    }

    case 'IceGiant': {
      return 30;
    }

    case 'SubNeptune': {
      return 5;
    }

    case 'HotJupiter': {
      return 0;
    }

    default: {
      return 2;
    }
  }
}

function roman(n: number): string {
  let text = '';
  for (const [i, value] of romanValues.entries()) {
    while (n >= value) {
      text += romanNumerals[i]!;
      n -= value;
    }
  }

  return text;
}

function moonCount(rng: Pcg32, planet: Draft): number {
  switch (planet.kind) {
    case 'GasGiant': {
      return rng.range(1, 8);
    }

    case 'IceGiant': {
      return rng.range(1, 5);
    }

    case 'SubNeptune': {
      return rng.range(0, 2);
    }

    case 'HotJupiter': {
      return 0;
    }

    case 'Dwarf': {
      return rng.range(0, 1);
    }

    default: {
      return planet.mass < 0.3 ? rng.range(0, 1) : rng.range(0, 2);
    }
  }
}

function drawMoons(rng: Pcg32, planet: Draft, totalMass: number, planetAddress: Address, planetName: string, tables: GeneratorTables): Moon[] {
  const isGiant = planet.kind === 'GasGiant' || planet.kind === 'IceGiant';
  const count = moonCount(rng, planet);
  const planetKm = planet.radius * kmPerEarthRadius;
  // Half the Hill radius, in planet radii: moons beyond it would not stay.
  const hillHalf = 0.5 * planet.orbit * kmPerAu * DMath.pow(planet.mass * sunsPerEarthMass / (3 * totalMass), 1 / 3) / planetKm;
  const moons: Moon[] = [];
  let orbit = rng.rangeDouble(3, 6);
  let isGarden = false;
  for (let j = 0; j < count && orbit < hillHalf; j++) {
    let kind: MoonKind;
    if (isGiant) {
      kind = giantMoonKinds[rng.weighted(tables.weights(giantMoons))]!;
      if (!isGarden && planet.zone === 'Temperate' && rng.chance(25, 100)) {
        kind = 'Garden';
        isGarden = true;
      }
    } else {
      kind = rng.chance(85, 100) ? 'Barren' : 'Ice';
    }

    const radius = isGiant ? logUniform(rng, 200, 2700) : rng.rangeDouble(100, Math.max(101, 0.3 * planetKm));
    moons.push({
      address: planetAddress.child('moon', j).toString(),
      index: j,
      name: planetName + ' ' + roman(j + 1),
      kind,
      orbit: DMath.round(orbit, 2),
      radius: DMath.round(radius, 0),
    });
    orbit *= rng.rangeDouble(1.3, 2);
  }

  return moons;
}

const zoneWords: Record<OrbitZone, string> = {
  Hot: 'scorched', Warm: 'warm', Temperate: 'temperate', Cold: 'cold', Outer: 'frozen',
};

const planetNouns: Record<PlanetKind, string> = {
  Lava: 'lava world',
  Iron: 'iron world',
  Barren: 'barren rock',
  Desert: 'desert world',
  Rocky: 'rocky world',
  Greenhouse: 'greenhouse world',
  Ocean: 'ocean world',
  Garden: 'garden world',
  Ice: 'ice world',
  Dwarf: 'dwarf planet',
  SubNeptune: 'mini-Neptune',
  GasGiant: 'gas giant',
  IceGiant: 'ice giant',
  HotJupiter: 'hot Jupiter',
};

function planetDescriptor(kind: PlanetKind, zone: OrbitZone, rings: boolean, star: Star): string {
  let isZoned: boolean;
  switch (kind) {
    case 'Lava':
    case 'Greenhouse':
    case 'Garden':
    case 'HotJupiter': {
      isZoned = false;
      break;
    }

    case 'Ice': {
      isZoned = zone !== 'Outer';
      break;
    }

    case 'Dwarf':
    case 'GasGiant':
    case 'IceGiant': {
      isZoned = zone === 'Warm' || zone === 'Temperate';
      break;
    }

    default: {
      isZoned = true;
    }
  }

  const words = (rings ? 'ringed ' : '') + (isZoned ? zoneWords[zone] + ' ' : '') + planetNouns[kind];
  const preposition = zone === 'Outer' ? 'far from' : (zone === 'Hot' ? 'skimming' : 'under');
  return withArticle(words) + ' ' + preposition + ' ' + withArticle(star.description);
}

function systemDescriptor(star: Star, companion: Companion | undefined, planets: readonly Planet[], belts: readonly Belt[]): string {
  let text = companion === undefined
    ? withArticle(star.description)
    : withArticle(star.description) + ' and ' + companion.star.description + (companion.orbit === 'Close' ? ' in a close pair' : ' pair');
  text += planets.length === 0 ? ' with no planets' : (planets.length === 1 ? ' with one planet' : ` with ${planets.length} planets`);
  return belts.some(b => b.kind === 'Asteroid') ? text + (planets.length === 0 ? ' but an asteroid belt' : ' and an asteroid belt') : text;
}

function fallbackText(kind: LandmarkKind, planet: string | undefined): string {
  switch (kind) {
    case 'Ruins': {
      return planet === undefined ? 'ruins drifting in orbit' : 'ruins on ' + planet;
    }

    case 'Derelict': {
      return 'a derelict ship';
    }

    case 'Nebula': {
      return 'a glowing nebula around the system';
    }

    case 'Comet': {
      return 'a great comet';
    }

    default: {
      return 'a signal no one can explain';
    }
  }
}

const outlierTexts: Partial<Record<LandmarkKind, string>> = {
  Megastructure: 'a vast structure around the star',
  RoguePlanet: 'a rogue planet passing through',
  AncientBeacon: 'an ancient beacon still transmitting',
  ShatteredWorld: 'the remains of a shattered world',
  TemporalAnomaly: 'a region where clocks drift',
  DerelictFleet: 'a fleet of dead ships',
};

function landmarksOf(seed: bigint, star: Star, companion: Companion | undefined, planets: readonly Planet[], belts: readonly Belt[], weirdness: number): Landmark[] {
  const list: Landmark[] = [];
  const add = (kind: LandmarkKind, text: string, planet?: number, outlier = false): void => {
    list.push({
      kind, planet, outlier, text,
    });
  };

  if (noGardenClasses.has(star.class)) {
    add('UnusualStar', withArticle(star.description) + ' at its heart');
  }

  if (companion !== undefined) {
    add('BinaryStar', withArticle(companion.star.description) + ' companion');
  }

  for (const p of planets) {
    if (p.kind === 'Garden') {
      add('LivingWorld', 'life on ' + p.name, p.index);
    } else {
      for (const m of p.moons) {
        if (m.kind === 'Garden') {
          add('LivingWorld', `life on ${m.name}, a moon of ${p.name}`, p.index);
        }
      }
    }

    if (p.rings && (p.kind === 'GasGiant' || p.kind === 'IceGiant')) {
      add('RingedGiant', 'the rings of ' + p.name, p.index);
    }

    if (p.kind === 'HotJupiter') {
      add('HotJupiter', p.name + ', a hot Jupiter', p.index);
    }
  }

  if (belts.some(b => b.kind === 'Asteroid')) {
    add('AsteroidBelt', 'an asteroid belt');
  }

  if (list.length === 0) {
    const rng = Seeds.stream(seed, 'landmarks');
    const kind = fallbacks[rng.weighted(fallbackWeights)]!;
    const planet = kind === 'Ruins' && planets.length > 0 ? rng.nextInt(planets.length) : undefined;
    add(kind, fallbackText(kind, planet === undefined ? undefined : planets[planet]!.name), planet);
  }

  const weird = Seeds.stream(seed, 'weird');
  if (weird.chance(weirdness, 100)) {
    const kind = outliers[weird.nextInt(outliers.length)]!;
    add(kind, outlierTexts[kind]!, undefined, true);
  }

  return list;
}

function systemTags(rng: Pcg32, planets: readonly Planet[], belts: readonly Belt[], stations: readonly Station[], landmarks: readonly Landmark[], danger: number): string[] {
  let isHabitable = false;
  let isLife = false;
  let isMining = false;
  let isGiant = false;
  let isDead = true;
  for (const p of planets) {
    const k = p.kind;
    isHabitable ||= k === 'Garden' || k === 'Ocean' || (k === 'Rocky' && p.zone === 'Temperate');
    isLife ||= k === 'Garden';
    isMining ||= k === 'Barren' || k === 'Iron';
    isGiant ||= ['GasGiant', 'IceGiant', 'HotJupiter'].includes(k);
    isDead &&= ['Barren', 'Lava', 'Iron', 'Dwarf'].includes(k);
    for (const m of p.moons) {
      isLife ||= m.kind === 'Garden';
      isHabitable ||= m.kind === 'Garden';
    }
  }

  isMining ||= belts.length > 0;
  const has = (kind: StationKind): boolean => stations.some(s => s.kind === kind);
  const marked = (...kinds: LandmarkKind[]): boolean => landmarks.some(l => kinds.includes(l.kind));
  const isUnusual = marked('UnusualStar');
  const isOutlier = landmarks.some(l => l.outlier);
  // Every tag in a fixed order with its weight; a weight of 0 means the data does not support it.
  const candidates: Array<[string, number]> = [
    ['frontier colony', isHabitable ? 10 : 0],
    ['mining boom', isMining ? 10 : 0],
    ['pirate haven', has('PirateDen') || danger >= 7 ? 10 : 0],
    ['quarantine zone', isLife ? 6 : 0],
    ['abandoned colony', marked('Ruins') || isHabitable ? 6 : 0],
    ['research outpost', has('ResearchStation') || isUnusual ? 8 : 0],
    ['trade crossroads', has('TradeHub') ? 10 : 0],
    ['holy site', 3],
    ['naval stronghold', has('NavalBase') ? 10 : 0],
    ['smuggler route', danger >= 4 && danger <= 8 ? 6 : 0],
    ['refugee haven', isHabitable ? 5 : 0],
    ['corporate enclave', has('Refinery') || has('Shipyard') || has('MiningPlatform') ? 8 : 0],
    ['precursor ruins', marked('Ruins', 'AncientBeacon', 'Megastructure') ? 10 : 0],
    ['untouched wilderness', isLife && stations.length === 0 ? 10 : 0],
    ['dead system', isDead ? 8 : 0],
    ['gas mining', isGiant ? 8 : 0],
    ['scientific curiosity', isOutlier || isUnusual ? 8 : 0],
  ];
  const weights = candidates.map(c => c[1]);
  const first = rng.weighted(weights);
  const isWantSecond = rng.chance(35, 100);
  weights[first] = 0;
  return !isWantSecond || weights.every(w => !(w > 0)) ? [candidates[first]![0]] : [candidates[first]![0], candidates[rng.weighted(weights)]![0]];
}

function drawBelts(rng: Pcg32, planets: readonly Planet[], frost: number): Belt[] {
  const belts: Belt[] = [];
  if (planets.length === 0) {
    if (rng.chance(60, 100)) {
      belts.push({kind: 'Asteroid', inner: DMath.round(frost * 0.8, 4), outer: DMath.round(frost * 1.2, 4)});
    }

    return belts;
  }

  // An asteroid belt goes in the widest gap, never over a planet.
  if (planets.length >= 2 && rng.chance(55, 100)) {
    let best = -1;
    let bestRatio = 0;
    for (let i = 0; i + 1 < planets.length; i++) {
      const r = planets[i + 1]!.orbit / planets[i]!.orbit;
      if (!(r > bestRatio)) {
        continue;
      }

      bestRatio = r;
      best = i;
    }

    if (bestRatio > 1.6) {
      const a = planets[best]!.orbit;
      const b = planets[best + 1]!.orbit;
      const mid = Math.sqrt(a * b);
      belts.push({kind: 'Asteroid', inner: DMath.round(mid * 0.87, 4), outer: DMath.round(mid * 1.15, 4)});
    }
  }

  if (rng.chance(35, 100)) {
    const edge = planets.at(-1)!.orbit;
    belts.push({kind: 'Ice', inner: DMath.round(edge * 1.6, 4), outer: DMath.round(edge * 2.1, 4)});
  }

  return belts;
}

function drawStations(rng: Pcg32, address: Address, name: string, planetCount: number): Station[] {
  const count = rng.weighted(stationCountWeights);
  const kinds = [0, 1, 2, 3, 4, 5, 6, 7];
  const stations: Station[] = [];
  for (let k = 0; k < count; k++) {
    const pick = rng.nextInt(kinds.length);
    const kind = kinds.splice(pick, 1)[0]!;
    const prefix = rng.chance(20, 100) ? name : stationWords[rng.nextInt(stationWords.length)]!;
    const planet = planetCount === 0 || rng.chance(20, 100) ? undefined : rng.nextInt(planetCount);
    stations.push({
      address: address.child('station', k).toString(),
      name: prefix + ' ' + stationKindNames[kind]!,
      kind: stationKinds[kind]!,
      planet,
    });
  }

  return stations;
}

function discoveryLetters(count: number, rng: Pcg32): string[] {
  const letters = Array.from({length: count}, (_, i) => String.fromCodePoint(0x62 + Math.min(i, 24)));
  for (let i = count - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const swap = letters[i]!;
    letters[i] = letters[j]!;
    letters[j] = swap;
  }

  return letters;
}

/**
Builds a system at its address. C# `StarSystemGenerator.Generate`.
*/
export function generateSystemAt(address: Address, context: SystemInput, options: GeneratorOptions): StarSystem {
  const seed = address.objectSeed;
  const age = context.age ?? ages[Seeds.stream(seed, 'age').weighted(ageWeights)]!;
  // A galaxy's map already holds the shifted danger; a system alone shifts its own draw.
  const danger = context.danger ?? DMath.clamp(Seeds.stream(seed, 'danger').range(1, 10) + options.dangerShift, 1, 10);
  const {star, companion} = rollStar(Seeds.stream(seed, 'star'), age, options);
  const name = context.name ?? systemName(Seeds.stream(seed, 'names'), star.class, options.names);
  const isClose = companion?.orbit === 'Close';
  const totalMass = star.mass + (isClose ? companion.star.mass : 0);
  const light = Math.max(star.luminosity + (isClose ? companion.star.luminosity : 0), 0.0001);
  const [hzInner, hzOuter, frost] = zones(light);
  const tables = tablesFor(options);
  const drafts = drawPlanets(Seeds.stream(seed, 'planets'), star, companion, totalMass, hzInner, hzOuter, frost, context.richness ?? 100, tables)
    .slice(0, options.maxPlanetsPerSystem);
  const letters = discoveryLetters(drafts.length, Seeds.stream(seed, 'letters'));
  const planets: Planet[] = drafts.map((d, i) => {
    const planetSeed = Seeds.child(seed, 'planet', i);
    const planetAddress = address.child('planet', i);
    const planetName = name + ' ' + letters[i]!;
    const [eccentricity, inclination, periapsisAngle] = elements(Seeds.stream(planetSeed, 'elements'), d.orbit, drafts.length > 1, eccentricityCap(drafts, i));
    const moonRng = Seeds.stream(planetSeed, 'moons');
    const isRings = moonRng.chance(ringPercent(d.kind), 100);
    return {
      address: planetAddress.toString(),
      index: i,
      name: planetName,
      kind: d.kind,
      zone: d.zone,
      orbit: DMath.round(d.orbit, 4),
      period: DMath.round(d.period, 2),
      eccentricity,
      inclination,
      periapsisAngle,
      mass: DMath.round(d.mass, 3),
      radius: DMath.round(d.radius, 3),
      rings: isRings,
      moons: drawMoons(moonRng, d, totalMass, planetAddress, planetName, tables),
      descriptor: planetDescriptor(d.kind, d.zone, isRings, star),
    };
  });
  const belts = drawBelts(Seeds.stream(seed, 'belts'), planets, frost);
  const stations = drawStations(Seeds.stream(seed, 'stations'), address, name, planets.length);
  const landmarks = landmarksOf(seed, star, companion, planets, belts, options.weirdness);
  return {
    address: address.toString(),
    name,
    star,
    companion,
    age,
    danger,
    habitableZoneInner: hzInner,
    habitableZoneOuter: hzOuter,
    frostLine: frost,
    planets,
    belts,
    stations,
    landmarks,
    tags: systemTags(Seeds.stream(seed, 'tags'), planets, belts, stations, landmarks, danger),
    descriptor: systemDescriptor(star, companion, planets, belts),
  };
}

/**
Generates a star system on its own from any seed text or number. C# `StarSystem.Generate(seed, options)`.
*/
export function generateSystem(seed: string | number | bigint, options?: Partial<GeneratorOptions>): StarSystem {
  const o = resolveOptions(options);
  validateOptions(o);
  const text = typeof seed === 'string' ? checkSeed(seed) : seedText(seed);
  return generateSystemAt(new Address(1, text, 'system'), {}, o);
}
