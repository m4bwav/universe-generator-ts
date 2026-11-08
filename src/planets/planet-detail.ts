/**
The planet level: physics, light, atmosphere, rotation, climate, life, traits, resources, hazards, habitability and a
summary, each from its own stream of the planet's seed. A port of `Planets/PlanetDetail.cs` and `Planets/PlanetStory.cs`.
*/
import {DMath} from '../core/dmath.ts';
import {JsonWriter} from '../core/json-writer.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import type {Star, StellarAge} from '../stars/star-generator.ts';
import type {OrbitZone, PlanetKind} from '../systems/star-system.ts';
import {
  biomes as biomeOrder,
  lifeLevels,
  humanSpecies,
  type Atmosphere,
  type AtmosphereClass,
  type Biome,
  type BiomeShare,
  type ClimateBand,
  type Composition,
  type Gas,
  type Habitability,
  type LifeLevel,
  type ResourceGrades,
  type Species,
  type Spin,
} from './planet-records.ts';

/**
What a planet's detail depends on from its system. C# `PlanetHost`.
*/
export type PlanetHost = {readonly star: Star; readonly totalMass: number; readonly light: number; readonly age: StellarAge};

/**
The planet level's fields, added to a planet by `applyPlanetDetail`.
*/
export type PlanetDetailFields = {
  readonly composition: Composition;
  readonly gravity: number;
  readonly escapeVelocity: number;
  readonly density: number;
  readonly insolation: number;
  readonly albedo: number;
  readonly temperature: number;
  readonly dayTemperature: number;
  readonly nightTemperature: number;
  readonly atmosphere: Atmosphere;
  readonly water: number;
  readonly ice: number;
  readonly rotation: number;
  readonly spin: Spin;
  readonly tilt: number;
  readonly bands: readonly ClimateBand[];
  readonly biomes: readonly BiomeShare[];
  readonly life: LifeLevel;
  readonly flora: number;
  readonly fauna: number;
  readonly traits: readonly string[];
  readonly anomaly: string | undefined;
  readonly resources: ResourceGrades;
  readonly hazard: number;
  readonly hazards: readonly string[];
  readonly similarity: number;
  readonly habitability: Habitability;
  readonly summary: string;
};

/**
The fields a planet has before its detail: what `applyPlanetDetail` reads.
*/
export type PlanetCore = {
  readonly kind: PlanetKind;
  readonly zone: OrbitZone;
  readonly orbit: number;
  readonly period: number;
  readonly mass: number;
  readonly radius: number;
  readonly rings: boolean;
  readonly moons: readonly unknown[];
};

/**
The fields the hazards and summary read; a moon builds one as a stand-in planet (C# `new Planet { ... }` with the rest at
their defaults).
*/
export type StoryPlanet = {
  readonly kind: PlanetKind;
  readonly zone: OrbitZone;
  readonly gravity: number;
  readonly temperature: number;
  readonly dayTemperature: number;
  readonly nightTemperature: number;
  readonly atmosphere: Atmosphere;
  readonly water: number;
  readonly ice: number;
  readonly spin: Spin;
  readonly biomes: readonly BiomeShare[];
  readonly life: LifeLevel;
  readonly fauna: number;
  readonly traits: readonly string[];
  readonly hazard: number;
};

export type Candidate = readonly [string, number];

const gasOrder: readonly Gas[] = ['Hydrogen', 'Helium', 'Methane', 'WaterVapour', 'Nitrogen', 'Oxygen', 'CarbonDioxide', 'SulphurDioxide', 'RockVapour'];
// Molecular masses in Gas order; rock vapour is resupplied by the molten surface and never escapes here.
const gasMasses = [2, 4, 16, 18, 28, 32, 44, 64, 0];
const hydrogenHelium: readonly Gas[] = ['Hydrogen', 'Helium'];
const iceGiantGases: readonly Gas[] = ['Hydrogen', 'Helium', 'Methane'];
const subNeptuneGases: readonly Gas[] = ['Hydrogen', 'Helium', 'WaterVapour'];
const rockVapour: readonly Gas[] = ['RockVapour'];
const nitrogenFirst: readonly Gas[] = ['Nitrogen', 'CarbonDioxide'];
const carbonFirst: readonly Gas[] = ['CarbonDioxide', 'Nitrogen'];
const greenhouseGases: readonly Gas[] = ['CarbonDioxide', 'Nitrogen', 'SulphurDioxide'];
const oceanGases: readonly Gas[] = ['Nitrogen', 'CarbonDioxide', 'WaterVapour'];
const gardenGases: readonly Gas[] = ['Nitrogen', 'Oxygen'];
const iceGases: readonly Gas[] = ['Nitrogen', 'Methane'];
const noGases: readonly Gas[] = [];

// Six latitude bands, both hemispheres together: area shares, P2(sin of the middle latitude), and a Hadley rain pattern.
const latitudeFrom = [0, 15, 30, 45, 60, 75];
const latitudeTo = [15, 30, 45, 60, 75, 90];
const latitudeShare = [0.2588, 0.2412, 0.2071, 0.1589, 0.0999, 0.0341];
const latitudeP2 = [-0.4744, -0.2803, 0.0559, 0.4441, 0.7803, 0.9744];
const latitudeRain = [1, 0.35, 0.65, 0.8, 0.45, 0.15];

// A locked planet's bands by angle from the point under its star; "light" places each band between night and day.
const lockedFrom = [0, 30, 60, 80, 100, 140];
const lockedTo = [30, 60, 80, 100, 140, 180];
const lockedShare = [0.067, 0.183, 0.1632, 0.1736, 0.2962, 0.117];
const lockedLight = [1, 0.8, 0.55, 0.4, 0.15, 0];
const lockedRain = [1, 0.7, 0.5, 0.45, 0.15, 0.05];
const lockedMean = 0.417;

const zoneOrder: readonly OrbitZone[] = ['Hot', 'Warm', 'Temperate', 'Cold', 'Outer'];

export const zoneIndex = (zone: OrbitZone): number => zoneOrder.indexOf(zone);
export const lifeIndex = (life: LifeLevel): number => lifeLevels.indexOf(life);
export const logUniform = (rng: Pcg32, low: number, high: number): number => low * DMath.exp(rng.nextDouble() * DMath.log(high / low));

const giantKinds = new Set<PlanetKind>(['SubNeptune', 'GasGiant', 'IceGiant', 'HotJupiter']);

export const isGiant = (k: PlanetKind): boolean => giantKinds.has(k);

export const hasGas = (gases: readonly Gas[], gas: Gas): boolean => gases.includes(gas);

export const gasMass = (gas: Gas): number => gasMasses[gasOrder.indexOf(gas)]!;

export function classify(pressure: number): AtmosphereClass {
  if (pressure === 0) {
    return 'None';
  }

  if (pressure < 0.01) {
    return 'Trace';
  }

  if (pressure < 0.5) {
    return 'Thin';
  }

  if (pressure < 2) {
    return 'Standard';
  }

  return pressure < 10 ? 'Dense' : 'Crushing';
}

export const greenhouse = (teq: number, k: number, pressure: number): number =>
  pressure === 0 ? teq : teq * Math.sqrt(Math.sqrt(1 + 0.75 * k * DMath.pow(pressure, 1.1)));

/**
How well a species lives on a world. C# `PlanetDetail.HabitabilityOf`.
*/
export function habitabilityOf(species: Species, atmosphere: Atmosphere, t: number, gravity: number): Habitability {
  if (atmosphere.pressure === undefined) {
    return 'Hostile';
  }

  const p = atmosphere.pressure;
  const isAir = !species.breathesOxygen || hasGas(atmosphere.gases, 'Oxygen');
  if (isAir && t >= species.minTemperature && t <= species.maxTemperature && gravity >= species.minGravity
    && gravity <= species.maxGravity && p >= species.minPressure && p <= species.maxPressure) {
    return 'Ideal';
  }

  if (t >= species.minTemperature - 20 && t <= species.maxTemperature + 20 && gravity >= species.minGravity * 0.5
    && gravity <= species.maxGravity * 1.25 && p >= species.minPressure / 5 && p <= species.maxPressure * 3) {
    return 'Habitable';
  }

  if (t >= species.minTemperature - 80 && t <= species.maxTemperature + 80 && gravity <= species.maxGravity * 1.6
    && p <= species.maxPressure * 10) {
    return 'Marginal';
  }

  return 'Hostile';
}

const baseAlbedos: Record<PlanetKind, number> = {
  Lava: 0.1,
  Iron: 0.12,
  Barren: 0.12,
  Desert: 0.28,
  Rocky: 0.22,
  Greenhouse: 0.75,
  Ocean: 0.3,
  Garden: 0.3,
  Ice: 0.6,
  Dwarf: 0.45,
  SubNeptune: 0.35,
  GasGiant: 0.34,
  IceGiant: 0.3,
  HotJupiter: 0.08,
};

const compositions: Record<PlanetKind, Composition> = {
  Lava: 'Rock',
  Iron: 'Metal',
  Barren: 'Rock',
  Desert: 'Rock',
  Rocky: 'Rock',
  Greenhouse: 'Rock',
  Ocean: 'Water',
  Garden: 'Rock',
  Ice: 'IceAndRock',
  Dwarf: 'IceAndRock',
  SubNeptune: 'GasEnvelope',
  GasGiant: 'HydrogenHelium',
  IceGiant: 'Ices',
  HotJupiter: 'HydrogenHelium',
};

const envelopes: Partial<Record<PlanetKind, [readonly Gas[], string]>> = {
  GasGiant: [hydrogenHelium, 'a deep envelope of hydrogen and helium; there is no surface'],
  HotJupiter: [hydrogenHelium, 'hydrogen and helium heated by its star; there is no surface'],
  IceGiant: [iceGiantGases, 'hydrogen, helium and methane over a mantle of ices; there is no surface'],
  SubNeptune: [subNeptuneGases, 'a thick envelope of hydrogen, helium and steam hides any surface'],
};

/**
The pressure that warms a world to a target temperature, within the kind's range. C# `PlanetDetail.Solve`.
*/
export function solve(target: number, teq: number, k: number, low: number, high: number): number {
  const ratio = target / teq;
  const need = (ratio * ratio * ratio * ratio - 1) / 0.75;
  return need <= 0 ? low : DMath.clamp(DMath.pow(need / k, 1 / 1.1), low, high);
}

function surfaceGases(kind: PlanetKind, isNitrogenFirst: boolean, isIcyAir: boolean): [readonly Gas[], number, number] {
  switch (kind) {
    case 'Lava': {
      return [rockVapour, 0.001, 0.009];
    }

    case 'Desert': {
      return [isNitrogenFirst ? nitrogenFirst : carbonFirst, 0.01, 0.6];
    }

    case 'Rocky': {
      return [isNitrogenFirst ? nitrogenFirst : carbonFirst, 0.05, 3];
    }

    case 'Greenhouse': {
      return [greenhouseGases, 20, 150];
    }

    case 'Ocean': {
      return [oceanGases, 0.5, 8];
    }

    case 'Garden': {
      return [gardenGases, 0.5, 3];
    }

    case 'Ice': {
      return [isIcyAir ? iceGases : noGases, 0.001, 1.5];
    }

    default: {
      return [noGases, 0, 0];
    }
  }
}

function targetOf(p: PlanetCore, targetDraw: number): number | undefined {
  if (p.kind === 'Garden') {
    return 275 + 25 * targetDraw;
  }

  if (p.kind === 'Ocean') {
    return 275 + 45 * targetDraw;
  }

  return p.zone === 'Temperate' && (p.kind === 'Rocky' || p.kind === 'Desert') ? 250 + 70 * targetDraw : undefined;
}

function air(rng: Pcg32, p: PlanetCore, teq: number, escape: number, inventory: number, targetDraw: number): [Atmosphere, number] {
  const pressureDraw = rng.nextDouble();
  const isNitrogenFirst = rng.chance(50, 100);
  const isIcyAir = rng.chance(40, 100);

  // The Jeans rule: the exosphere runs about 4 times the equilibrium temperature.
  const lightest = DMath.round(0.8976 * 4 * teq / (escape * escape), 1);
  const envelope = envelopes[p.kind];
  if (envelope !== undefined) {
    const atmosphere: Atmosphere = {
      class: 'Envelope', pressure: undefined, gases: envelope[0], lightestGasKept: lightest, breathable: false, why: envelope[1],
    };
    return [atmosphere, DMath.round(teq, 0)];
  }

  const [candidates, low, high] = surfaceGases(p.kind, isNitrogenFirst, isIcyAir);
  const kept: Gas[] = [];
  let lost: Gas[] = [];
  for (const g of candidates) {
    (gasMass(g) >= lightest ? kept : lost).push(g);
  }

  const isWater = inventory > 0 && (p.kind === 'Ocean' || p.kind === 'Garden');
  let k = kept.length === 0 ? 0 : (kept[0] === 'CarbonDioxide' ? 1.2 : 0.6) + (isWater ? 0.25 : 0);
  const target = targetOf(p, targetDraw);
  let pressure: number;
  if (candidates.length === 0) {
    pressure = 0;
  } else if (target !== undefined && k > 0) {
    pressure = solve(target, teq, k, low, high);
    if (pressure >= high && isWater && !hasGas(kept, 'CarbonDioxide') && lightest <= 44) {
      // Near the outer edge of the habitable zone, carbon dioxide keeps a living world warm.
      kept.push('CarbonDioxide');
      k += 0.6;
      pressure = solve(target, teq, k, low, high);
    }
  } else {
    pressure = low * DMath.exp(pressureDraw * DMath.log(high / low));
  }

  let why: string;
  if (pressure > 0 && kept.length === 0) {
    // Nothing it was given can stay: a trace of the heaviest, leaking away.
    kept.push(lost.at(-1)!);
    lost = [];
    pressure = Math.min(pressure * 0.01, 0.009);
    why = 'too little gravity for its heat: what air it has is leaking away to space';
  } else if (pressure === 0) {
    if (p.kind === 'Ice') {
      why = 'its gases lie frozen on the surface';
    } else if (lightest > 44) {
      why = 'too little gravity for its heat: even carbon dioxide escapes';
    } else {
      why = p.zone === 'Hot' || p.zone === 'Warm' ? 'stripped by its star\'s heat and wind' : 'lost its air long ago';
    }
  } else if (p.kind === 'Lava') {
    why = 'a thin haze of vaporised rock';
  } else if (p.kind === 'Garden' && hasGas(kept, 'Oxygen')) {
    why = 'life keeps oxygen in the air';
  } else if (p.kind === 'Greenhouse' && kept[0] === 'CarbonDioxide') {
    why = 'a runaway greenhouse: carbon dioxide traps the heat';
  } else {
    why = lost.length > 0
      ? 'its gravity keeps ' + gasList(kept) + ' but lets ' + gasList(lost) + ' escape'
      : 'its gravity holds ' + gasList(kept);
  }

  pressure = DMath.round(pressure, 4);
  const temperature = greenhouse(teq, k, pressure);
  const atmosphere: Atmosphere = {
    class: classify(pressure),
    pressure,
    gases: pressure === 0 ? [] : kept,
    lightestGasKept: lightest,
    breathable: pressure >= 0.5 && pressure <= 3 && hasGas(kept, 'Oxygen'),
    why,
  };
  return [atmosphere, DMath.round(temperature, 0)];
}

function turn(rng: Pcg32, p: PlanetCore, host: PlanetHost, giant: boolean): [number, Spin, number] {
  const isSlow = rng.chance(10, 100);
  const fast = logUniform(rng, 8, 60);
  const slowHours = logUniform(rng, 200, 6000);
  const giantHours = rng.rangeDouble(9, 18);
  const subNeptuneHours = logUniform(rng, 10, 40);
  const isSteep = rng.chance(10, 100);
  const lean = rng.rangeDouble(0, 15) + rng.rangeDouble(0, 20);
  const steepTilt = rng.rangeDouble(35, 180);

  // Tidal locking radius for 4.5 billion years (Gladman et al. 1996 form), scaled by age; giants resist.
  const age = host.age === 'Young' ? 0.85 : (host.age === 'Old' ? 1.1 : 1);
  const lockRadius = DMath.round(0.8 * DMath.pow(host.totalMass, 1 / 3) * age * (giant ? 0.35 : 1), 4);
  let spin: Spin;
  if (p.kind === 'HotJupiter' || p.orbit < DMath.round(0.6 * lockRadius, 4)) {
    spin = 'Locked';
  } else {
    spin = !giant && p.orbit < lockRadius ? 'Resonant' : 'Free';
  }

  let hours: number;
  if (spin === 'Locked') {
    hours = p.period * 24;
  } else if (spin === 'Resonant') {
    hours = p.period * 16;
  } else if (p.kind === 'GasGiant' || p.kind === 'IceGiant') {
    hours = giantHours;
  } else if (p.kind === 'SubNeptune') {
    hours = subNeptuneHours;
  } else {
    hours = isSlow ? slowHours : fast;
  }

  let tilt: number;
  if (spin === 'Free') {
    tilt = isSteep ? steepTilt : lean;
  } else {
    tilt = lean * 0.1;
  }

  return [DMath.round(hours, 1), spin, DMath.round(tilt, 1)];
}

type LifeResult = [LifeLevel, number, number];
const noLife: LifeResult = ['None', 0, 0];
const microbial: LifeResult = ['Microbial', 0, 0];
const prebiotic: LifeResult = ['Prebiotic', 0, 0];

/**
Life on a world of a kind. C# `PlanetDetail.Life`.
*/
export function lifeOf(rng: Pcg32, kind: PlanetKind, temperature: number, age: StellarAge): LifeResult {
  const roll = rng.nextInt(100);
  const a = rng.nextInt(4);
  const b = rng.nextInt(5);
  const isMild = temperature >= 250 && temperature <= 380;
  const young = age === 'Young' ? 1 : 0;
  switch (kind) {
    case 'Garden': {
      return ['Complex', 2 + Math.min(a, 3), Math.max(1, 1 + b - young)];
    }

    case 'Ocean': {
      if (!isMild) {
        return roll < 20 ? microbial : noLife;
      }

      if (roll < 15) {
        return noLife;
      }

      if (roll < 45) {
        return microbial;
      }

      return roll < 75 ? ['Simple', 1, 0] : ['Complex', 1 + Math.min(a, 2), Math.max(1, 1 + Math.min(b, 3) - young)];
    }

    case 'Rocky': {
      if (!isMild) {
        return noLife;
      }

      return roll < 15 ? microbial : (roll < 35 ? prebiotic : noLife);
    }

    case 'Desert': {
      if (!isMild) {
        return noLife;
      }

      return roll < 8 ? microbial : (roll < 20 ? prebiotic : noLife);
    }

    case 'Ice': {
      // Under the ice, in a hidden ocean.
      return roll < 6 ? microbial : (roll < 15 ? prebiotic : noLife);
    }

    case 'SubNeptune':
    case 'GasGiant':
    case 'IceGiant': {
      // Drifting in the clouds, where the temperature is mild.
      return temperature >= 200 && temperature <= 350 && roll < 2 ? microbial : noLife;
    }

    case 'Greenhouse': {
      return roll < 3 ? microbial : noLife;
    }

    default: {
      // Barren, iron, lava, dwarf and hot Jupiter: never, so the system tag "dead system" stays true.
      return noLife;
    }
  }
}

function landBiome(kind: PlanetKind, t: number, rain: number, inventory: number, flora: number): Biome {
  if (kind === 'Lava') {
    return 'Volcanic';
  }

  if (t < 263) {
    return inventory > 0.05 || kind === 'Ice' ? 'IceSheet' : 'Barren';
  }

  if (flora === 0) {
    return kind === 'Desert' ? 'Desert' : 'Barren';
  }

  const c = t - 273;
  if (c < 0) {
    return 'Tundra';
  }

  if (c < 5) {
    return rain >= 35 ? 'Taiga' : 'Tundra';
  }

  if (c < 20) {
    if (rain < 20) {
      return 'Desert';
    }

    return rain < 45 ? 'Grassland' : 'TemperateForest';
  }

  if (c < 40) {
    if (rain < 20) {
      return 'Desert';
    }

    return rain < 55 ? 'Savanna' : 'Rainforest';
  }

  if (c < 60) {
    return rain < 50 ? 'Desert' : 'Savanna';
  }

  return 'Barren';
}

/**
Climate bands, biome shares, open water and ice. C# `PlanetDetail.Climate`.
*/
export function climate(kind: PlanetKind, spin: Spin, temperature: number, day: number, night: number, tilt: number, redistribution: number,
  pressure: number, inventory: number, flora: number): [ClimateBand[], BiomeShare[], number, number] {
  const isLocked = spin === 'Locked';
  const from = isLocked ? lockedFrom : latitudeFrom;
  const to = isLocked ? lockedTo : latitudeTo;
  const shares = isLocked ? lockedShare : latitudeShare;
  const pattern = isLocked ? lockedRain : latitudeRain;
  const folded = tilt > 90 ? 180 - tilt : tilt;
  const contrast = 0.43 * temperature * (1 - 0.8 * redistribution) * (1 - folded / 90);
  const isOpenWater = inventory > 0 && (kind === 'Ocean' || kind === 'Garden');
  let humidity: number;
  if (isOpenWater) {
    humidity = DMath.clamp(0.25 + 1.1 * inventory, 0, 1.3);
  } else {
    humidity = pressure >= 0.01 ? 0.1 : 0;
  }

  const bands: ClimateBand[] = [];
  const totals = Array.from({length: 11}, () => 0);
  for (let i = 0; i < 6; i++) {
    let t = isLocked ? temperature + (day - night) * (lockedLight[i]! - lockedMean) : temperature - contrast * latitudeP2[i]!;
    t = DMath.round(Math.max(t, 3), 0);
    const cold = DMath.clamp((t - 240) / 60, 0, 1.2);
    const rain = Math.floor(pattern[i]! * humidity * cold * 100 + 0.5);

    let waterBiome: Biome;
    if (kind === 'Ice' || t < 263) {
      waterBiome = 'IceSheet';
    } else {
      waterBiome = t >= 373 ? 'Desert' : 'Ocean';
    }

    const land = landBiome(kind, Math.trunc(t), rain, inventory, flora);
    totals[biomeOrder.indexOf(waterBiome)]! += shares[i]! * inventory;
    totals[biomeOrder.indexOf(land)]! += shares[i]! * (1 - inventory);
    bands.push({
      from: from[i]!, to: to[i]!, share: shares[i]!, temperature: t, biome: inventory >= 0.99 ? waterBiome : land,
    });
  }

  const list: BiomeShare[] = [];
  for (const [b, total] of totals.entries()) {
    const share = DMath.round(total, 2);
    if (!(share > 0)) {
      continue;
    }

    // Insertion keeps the largest first and, on a tie, the biome order.
    let at = list.length;
    while (at > 0 && list[at - 1]!.share < share) {
      at--;
    }

    list.splice(at, 0, {biome: biomeOrder[b]!, share});
  }

  return [bands, list, DMath.round(totals[0]!, 2), DMath.round(totals[1]!, 2)];
}

/**
Organics grade from life and air. C# `PlanetDetail.Organics`.
*/
export function organics(life: LifeLevel, flora: number, atmosphere: Atmosphere): number {
  switch (life) {
    case 'Complex': {
      return 2 + Math.trunc(flora / 2);
    }

    case 'Simple': {
      return 2;
    }

    case 'Microbial':
    case 'Prebiotic': {
      return 1;
    }

    default: {
      return hasGas(atmosphere.gases, 'Methane') && atmosphere.class !== 'Envelope' ? 1 : 0;
    }
  }
}

const grade = (value: number, step: number): number => value === 0 ? 0 : DMath.clamp(value + step - 1, 1, 5);

/**
Resource grades: each base value moved by -1, 0 or +1. C# `PlanetDetail.Grades`.
*/
export function grades(rng: Pcg32, metals: number, rare: number, ices: number, gases: number, organicsValue: number): ResourceGrades {
  const m = grade(metals, rng.nextInt(3));
  const r = grade(rare, rng.nextInt(3));
  const i = grade(ices, rng.nextInt(3));
  const g = grade(gases, rng.nextInt(3));
  return {
    metals: m, rareElements: r, ices: i, gases: g, organics: grade(organicsValue, rng.nextInt(3)),
  };
}

function resourceBase(kind: PlanetKind, isFar: boolean): [number, number, number, number] {
  switch (kind) {
    case 'Lava': {
      return [3, 4, 0, 0];
    }

    case 'Iron': {
      return [5, 3, 0, 0];
    }

    case 'Barren': {
      return [3, 2, isFar ? 1 : 0, 0];
    }

    case 'Desert': {
      return [2, 2, 0, 1];
    }

    case 'Rocky': {
      return [3, 2, 1, 1];
    }

    case 'Greenhouse': {
      return [2, 2, 0, 2];
    }

    case 'Ocean': {
      return [1, 1, 5, 1];
    }

    case 'Garden': {
      return [3, 2, 4, 1];
    }

    case 'Ice': {
      return [1, 1, 5, 2];
    }

    case 'Dwarf': {
      return [2, 1, isFar ? 4 : 1, 1];
    }

    case 'SubNeptune': {
      return [0, 0, 3, 3];
    }

    case 'GasGiant': {
      return [0, 0, 0, 5];
    }

    case 'IceGiant': {
      return [0, 0, 3, 4];
    }

    default: {
      return [0, 0, 0, 2];
    }
  }
}

const term = (x: number, earth: number, weight: number): number => DMath.pow(1 - Math.abs(x - earth) / (x + earth), weight / 4);

/**
The Earth similarity index. C# `PlanetDetail.Similarity`.
*/
export function similarity(radius: number, density: number, escape: number, temperature: number): number {
  return DMath.round(term(radius, 1, 0.57) * term(density, 5.51, 1.07) * term(escape, 11.19, 0.7) * term(temperature, 288, 5.58), 2);
}

/**
The planet level's detail for a planet. C# `PlanetDetail.Apply`.
*/
export function applyPlanetDetail<P extends PlanetCore>(p: P, host: PlanetHost, seed: bigint, weirdness: number): P & PlanetDetailFields {
  const giant = isGiant(p.kind);

  // 1. Physics, from the stored (rounded) mass and radius.
  const gravity = DMath.round(p.mass / (p.radius * p.radius), 2);
  const escape = DMath.round(11.186 * Math.sqrt(p.mass / p.radius), 2);
  const density = DMath.round(5.514 * p.mass / (p.radius * p.radius * p.radius), 2);

  // 2. Light, albedo and water.
  const surface = Seeds.stream(seed, 'surface');
  const albedo = DMath.round(baseAlbedos[p.kind] + surface.rangeDouble(-0.05, 0.05), 2);
  const waterDraw = surface.nextDouble();
  const targetDraw = surface.nextDouble();
  const flux = host.light / (p.orbit * p.orbit);
  const teq = 278.6 * Math.sqrt(Math.sqrt(flux * (1 - albedo)));
  let inventory: number;
  switch (p.kind) {
    case 'Ocean': {
      inventory = 0.92 + 0.08 * waterDraw;
      break;
    }

    case 'Garden': {
      inventory = 0.3 + 0.55 * waterDraw;
      break;
    }

    case 'Ice': {
      inventory = 0.6 + 0.4 * waterDraw;
      break;
    }

    default: {
      inventory = 0;
    }
  }

  inventory = DMath.round(inventory, 2);

  // 3 and 4. Atmosphere by the Jeans rule, then the surface temperature.
  const [atmosphere, temperature] = air(Seeds.stream(seed, 'atmosphere'), p, teq, escape, inventory, targetDraw);
  const pressure = atmosphere.pressure ?? 0;

  // 5. Rotation, tilt and tidal lock, day and night sides.
  const [rotation, spin, tilt] = turn(Seeds.stream(seed, 'rotation'), p, host, giant);
  const redistribution = giant ? 1 : pressure / (pressure + 0.1);
  let swing = 1 - redistribution;
  if (spin === 'Free') {
    swing *= Math.min(1, rotation / 100);
  }

  const day = DMath.round(temperature * (1 + 0.3 * swing), 0);
  const night = DMath.round(temperature * (1 - 0.7 * swing), 0);

  // 7. Life; it decides whether plants cover the land below.
  const [life, flora, fauna] = lifeOf(Seeds.stream(seed, 'life'), p.kind, Math.trunc(temperature), host.age);

  // 6 and 8. Climate bands and biomes.
  let bands: ClimateBand[] = [];
  let biomeShares: BiomeShare[] = [];
  let water = 0;
  let ice = 0;
  if (!giant) {
    [bands, biomeShares, water, ice] = climate(p.kind, spin, temperature, day, night, tilt, redistribution, pressure, inventory, flora);
  }

  const isFar = p.zone === 'Cold' || p.zone === 'Outer';
  const partial = {
    ...p,
    composition: compositions[p.kind],
    gravity,
    escapeVelocity: escape,
    density,
    insolation: DMath.round(flux, 4),
    albedo,
    temperature,
    dayTemperature: day,
    nightTemperature: night,
    atmosphere,
    water,
    ice,
    rotation,
    spin,
    tilt,
    bands,
    biomes: biomeShares,
    life,
    flora,
    fauna,
  };

  // 9 to 13. Traits and anomalies, resources, hazards, habitability, summary.
  const traits = planetTraits(Seeds.stream(seed, 'traits'), partial);
  const anomaly = anomalyOf(Seeds.stream(seed, 'anomaly'), giant, weirdness);
  const [metals, rare, ices, gases] = resourceBase(p.kind, isFar);
  const resources = grades(Seeds.stream(seed, 'resources'), metals, rare, ices, gases, organics(life, flora, atmosphere));
  const withTraits = {...partial, traits, hazard: 0};
  const [hazard, hazards] = hazardsOf(withTraits, host.star);
  const result = {
    ...withTraits,
    anomaly,
    resources,
    hazard,
    hazards,
    similarity: similarity(p.radius, density, escape, temperature),
    habitability: habitabilityOf(humanSpecies, atmosphere, temperature, gravity),
    summary: '',
  };
  return {...result, summary: summaryOf(result)};
}

// ---- PlanetStory ----

const surfaceAnomalies = [
  'a perfectly hexagonal crater',
  'gravity readings that do not match its mass',
  'a signal from beneath the surface',
  'a hollow the size of a moon under the crust',
  'auroras that repeat like writing',
  'a surface that rearranges itself overnight',
  'a region where compasses spin',
  'ruins no survey can date',
];

const giantAnomalies = [
  'gravity readings that do not match its mass',
  'a signal from deep inside',
  'auroras that repeat like writing',
  'a storm that has not moved in a thousand years',
  'a perfectly square cloud',
  'something the size of a moon hiding in the clouds',
];

type TraitPlanet = PlanetCore & {
  readonly atmosphere: Atmosphere;
  readonly spin: Spin;
  readonly tilt: number;
  readonly water: number;
  readonly ice: number;
  readonly life: LifeLevel;
  readonly flora: number;
  readonly fauna: number;
  readonly rotation: number;
  readonly temperature: number;
};

function planetTraits(rng: Pcg32, p: TraitPlanet): string[] {
  const k = p.kind;
  const giant = isGiant(k);
  const a = p.atmosphere;
  const isAir = !giant && (a.pressure ?? 0) >= 0.01;
  const isLocked = p.spin === 'Locked';
  const folded = p.tilt > 90 ? 180 - p.tilt : p.tilt;
  const is = (...kinds: PlanetKind[]): boolean => kinds.includes(k);
  // Every trait in a fixed order with its weight; a weight of 0 means the data does not support it.
  const candidates: Candidate[] = [
    ['global dust storms', k === 'Desert' ? 10 : 0],
    ['salt flats', k === 'Desert' ? 6 : 0],
    ['glass plains', !giant && p.zone === 'Hot' && k !== 'Lava' ? 6 : 0],
    ['lava oceans', k === 'Lava' ? 10 : 0],
    ['volcanic chains', is('Lava', 'Iron', 'Rocky', 'Greenhouse') ? 5 : 0],
    ['a metal-rich crust', k === 'Iron' ? 10 : 0],
    ['an ancient impact basin', giant ? 0 : 3],
    ['deep canyons', is('Rocky', 'Desert', 'Barren', 'Iron', 'Ice') ? 5 : 0],
    ['acid clouds', k === 'Greenhouse' ? 10 : 0],
    ['superrotating clouds', k === 'Greenhouse' ? 6 : 0],
    ['ice geysers', is('Ice', 'Dwarf') && (p.zone === 'Cold' || p.zone === 'Outer') ? 8 : 0],
    ['an ocean under the ice', k === 'Ice' ? 8 : 0],
    ['methane lakes', isAir && hasGas(a.gases, 'Methane') ? 10 : 0],
    ['nitrogen glaciers', is('Ice', 'Dwarf') && hasGas(a.gases, 'Nitrogen') ? 6 : 0],
    ['scattered archipelagos', p.water > 0 && p.water < 0.95 ? 6 : 0],
    ['an endless ocean', p.water >= 0.9 ? 10 : 0],
    ['glowing seas', p.water > 0 && lifeIndex(p.life) >= 3 ? 6 : 0],
    ['towering forests', p.flora >= 4 ? 8 : 0],
    ['great herds', p.fauna >= 4 ? 8 : 0],
    ['fungal jungles', k === 'Garden' ? 4 : 0],
    ['an eyeball climate', !giant && isLocked && (p.water > 0 || p.ice > 0) ? 10 : 0],
    ['a twilight band', !giant && isLocked && isAir ? 8 : 0],
    ['days longer than its year', !giant && p.spin === 'Free' && p.rotation > p.period * 24 ? 8 : 0],
    ['long days', !giant && p.rotation >= 200 && p.rotation <= p.period * 24 ? 6 : 0],
    ['a fast spin', !giant && p.rotation < 10 ? 5 : 0],
    ['extreme seasons', !giant && folded >= 40 ? 8 : 0],
    ['spins on its side', p.tilt >= 60 && p.tilt <= 120 ? 10 : 0],
    ['spins backwards', p.tilt > 120 ? 6 : 0],
    ['auroras', (isAir || giant) && p.mass >= 0.5 ? 3 : 0],
    ['a great storm', is('GasGiant', 'IceGiant', 'SubNeptune') ? 8 : 0],
    ['banded clouds', is('GasGiant', 'HotJupiter') ? 8 : 0],
    ['diamond rain', k === 'IceGiant' ? 6 : 0],
    ['a glowing night side', k === 'HotJupiter' ? 10 : 0],
    ['an evaporating atmosphere', k === 'HotJupiter' ? 8 : 0],
    ['bright rings', p.rings ? 8 : 0],
    ['many moons', p.moons.length >= 5 ? 6 : 0],
    ['a thick haze', (k === 'Ice' && (a.pressure ?? 0) >= 0.5) || k === 'SubNeptune' ? 6 : 0],
    ['steam skies', k === 'SubNeptune' && p.temperature >= 400 ? 8 : 0],
    ['tidal flexing', p.spin === 'Resonant' ? 6 : 0],
  ];
  return pickTraits(rng, candidates);
}

/**
One trait by weight, and a second 40% of the time. C# `PlanetStory.Pick`.
*/
export function pickTraits(rng: Pcg32, candidates: readonly Candidate[]): string[] {
  const weights = candidates.map(c => c[1]);
  const first = rng.weighted(weights);
  const isWantSecond = rng.chance(40, 100);
  weights[first] = 0;
  const isAny = weights.some(w => w > 0);
  // The second draw happens only when a second trait is wanted and possible, as in C#.
  return !isWantSecond || !isAny ? [candidates[first]![0]] : [candidates[first]![0], candidates[rng.weighted(weights)]![0]];
}

/**
An anomaly at the weirdness percentage. C# `PlanetStory.Anomaly`.
*/
export function anomalyOf(rng: Pcg32, giant: boolean, weirdness: number): string | undefined {
  if (!rng.chance(weirdness, 100)) {
    return undefined;
  }

  const list = giant ? giantAnomalies : surfaceAnomalies;
  return list[rng.nextInt(list.length)];
}

export type Hazard = readonly [string, number];

const hardStars = new Set<Star['class']>(['O', 'B', 'NeutronStar']);

/**
The hazards and the worst tier. C# `PlanetStory.Hazards`.
*/
export function hazardsOf(p: StoryPlanet, star: Star, extra?: readonly Hazard[]): [number, string[]] {
  const found: Hazard[] = [];
  const c = star.class;
  const isHard = hardStars.has(c);
  if (isHard) {
    found.push(['hard radiation', 4]);
  } else if (c === 'M' && zoneIndex(p.zone) <= 2) {
    found.push(['stellar flares', 3]);
  }

  const a = p.atmosphere;
  if (a.pressure === undefined) {
    found.push(['no surface', 5]);
  } else {
    const {pressure} = a;
    if (p.kind === 'Lava') {
      found.push(['molten rock', 5]);
    }

    if (pressure >= 10) {
      found.push(['crushing pressure', 5]);
    } else if (pressure < 0.01) {
      found.push(['vacuum', 3]);
      if (zoneIndex(p.zone) <= 1 && !isHard) {
        found.push(['radiation', 3]);
      }
    } else if (!a.breathable) {
      found.push(['unbreathable air', 2]);
    }

    if (pressure >= 3 && pressure < 10) {
      found.push(['heavy air', 2]);
    } else if (pressure >= 0.01 && pressure < 0.5) {
      found.push(['thin air', 2]);
    }

    if (p.dayTemperature >= 500) {
      found.push(['searing heat', 5]);
    } else if (p.dayTemperature >= 330) {
      found.push(['extreme heat', 3]);
    }

    if (p.nightTemperature < 180) {
      found.push(['deep cold', 3]);
    } else if (p.nightTemperature < 250) {
      found.push(['cold', 2]);
    }

    if (p.gravity >= 2.5) {
      found.push(['crushing gravity', 4]);
    } else if (p.gravity >= 1.5) {
      found.push(['heavy gravity', 2]);
    }

    if (p.traits.includes('global dust storms')) {
      found.push(['dust storms', 2]);
    }

    if (p.traits.includes('volcanic chains')) {
      found.push(['eruptions', 2]);
    }

    if (p.fauna >= 4) {
      found.push(['dangerous wildlife', 2]);
    }
  }

  if (extra !== undefined) {
    found.push(...extra);
  }

  let worst = 1;
  for (const [, tier] of found) {
    worst = Math.max(worst, tier);
  }

  const texts: string[] = [];
  for (let tier = 5; tier >= 2; tier--) {
    for (const [text, t] of found) {
      if (t === tier) {
        texts.push(text);
      }
    }
  }

  return [worst, texts];
}

const celsius = (kelvin: number): string => `${Math.trunc(kelvin) - 273} °C`;
const percent = (share: number): string => `${Math.floor(share * 100 + 0.5)}%`;

const biomeNames: Partial<Record<Biome, string>> = {
  Tundra: 'tundra', Taiga: 'taiga', TemperateForest: 'temperate forest', Grassland: 'grassland', Savanna: 'savanna', Rainforest: 'rainforest',
};

function airText(a: Atmosphere): string {
  switch (a.class) {
    case 'Envelope': {
      return 'a deep envelope of ' + gasList(a.gases);
    }

    case 'None': {
      return 'no air';
    }

    case 'Trace': {
      return 'a trace of ' + gasName(a.gases[0]!);
    }

    default: {
      const pressure = a.pressure ?? 0;
      let decimals = 3;
      if (pressure >= 10) {
        decimals = 0;
      } else if (pressure >= 1) {
        decimals = 1;
      } else if (pressure >= 0.1) {
        decimals = 2;
      }

      const adjectives: Partial<Record<AtmosphereClass, string>> = {Thin: 'thin ', Dense: 'dense ', Crushing: 'crushing '};
      const kind = a.breathable ? 'breathable' : (adjectives[a.class] ?? '') + gasName(a.gases[0]!);
      return kind + ' air at ' + JsonWriter.format(pressure, decimals) + ' bar';
    }
  }
}

const lifeTexts: Partial<Record<LifeLevel, string>> = {
  Prebiotic: 'prebiotic chemistry', Microbial: 'microbial life', Simple: 'simple life', Complex: 'complex life',
};

/**
A one-line summary. C# `PlanetStory.Summary`.
*/
export function summaryOf(p: StoryPlanet, extra?: string, gravityDecimals?: number): string {
  const parts = [JsonWriter.format(p.gravity, gravityDecimals ?? (p.gravity < 10 ? 1 : 0)) + ' g'];
  const a = p.atmosphere;
  parts.push(airText(a));
  if (a.class === 'Envelope') {
    parts.push(celsius(p.temperature) + ' at the cloud tops');
  } else if (p.spin === 'Locked') {
    parts.push(celsius(p.dayTemperature) + ' by day, ' + celsius(p.nightTemperature) + ' by night');
  } else {
    parts.push(celsius(p.temperature));
  }

  if (p.water >= 0.01) {
    parts.push(percent(p.water) + ' ocean');
  }

  if (p.ice >= 0.01) {
    parts.push(percent(p.ice) + ' ice');
  }

  const land = p.biomes.find(b => biomeNames[b.biome] !== undefined);
  if (land !== undefined) {
    parts.push('mostly ' + biomeNames[land.biome]!);
  }

  if (p.spin === 'Locked' && a.class !== 'Envelope') {
    parts.push('tidally locked');
  }

  if (extra !== undefined) {
    parts.push(extra);
  }

  const lifeText = lifeTexts[p.life];
  if (lifeText !== undefined) {
    parts.push(lifeText);
  }

  return parts.join(', ') + '; hazard ' + String(p.hazard);
}

/**
Gases as words: "a, b and c". C# `PlanetStory.GasList`.
*/
export function gasList(gases: readonly Gas[]): string {
  let text = '';
  for (const [i, gas] of gases.entries()) {
    let separator = ', ';
    if (i === 0) {
      separator = '';
    } else if (i === gases.length - 1) {
      separator = ' and ';
    }

    text += separator + gasName(gas);
  }

  return text;
}

const gasNames: Record<Gas, string> = {
  Hydrogen: 'hydrogen',
  Helium: 'helium',
  Methane: 'methane',
  WaterVapour: 'water vapour',
  Nitrogen: 'nitrogen',
  Oxygen: 'oxygen',
  CarbonDioxide: 'carbon dioxide',
  SulphurDioxide: 'sulphur dioxide',
  RockVapour: 'rock vapour',
};

export const gasName = (gas: Gas): string => gasNames[gas];
