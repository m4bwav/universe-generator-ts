/**
The moon level: physics, orbit, tidal heat, light, air, a hidden ocean, life, climate, traits, resources, hazards and a
summary, each from its own stream of the moon's seed. A port of `Moons/MoonDetail.cs` and `Moons/MoonStory.cs`.
*/
import {DMath} from '../core/dmath.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import {
  anomalyOf,
  classify,
  climate,
  gasList,
  gasMass,
  gasName,
  grades,
  greenhouse,
  habitabilityOf,
  hasGas,
  hazardsOf,
  isGiant,
  lifeIndex,
  lifeOf,
  logUniform,
  organics,
  pickTraits,
  similarity,
  solve,
  summaryOf,
  type Candidate,
  type Hazard,
  type PlanetHost,
  type StoryPlanet,
} from '../planets/planet-detail.ts';
import {
  humanSpecies,
  type Atmosphere,
  type BiomeShare,
  type ClimateBand,
  type Composition,
  type Gas,
  type Habitability,
  type LifeLevel,
  type ResourceGrades,
} from '../planets/planet-records.ts';
import type {
  MoonKind,
  OrbitZone,
  PlanetKind,
  StarSystemMoonCore,
} from '../systems/star-system.ts';
import {planetNouns, withArticle} from '../systems/words.ts';

/**
The moon level's fields, added to a moon by `applyMoonDetail`.
*/
export type MoonDetailFields = {
  readonly descriptor: string;
  readonly distance: number;
  readonly period: number;
  readonly composition: Composition;
  readonly density: number;
  readonly mass: number;
  readonly gravity: number;
  readonly escapeVelocity: number;
  readonly insolation: number;
  readonly albedo: number;
  readonly tidalHeating: number;
  readonly temperature: number;
  readonly dayTemperature: number;
  readonly nightTemperature: number;
  readonly atmosphere: Atmosphere;
  readonly water: number;
  readonly ice: number;
  readonly subsurfaceOcean: boolean;
  readonly rotation: number;
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
What a moon's detail reads from its planet.
*/
export type MoonPlanet = {
  readonly kind: PlanetKind;
  readonly zone: OrbitZone;
  readonly orbit: number;
  readonly mass: number;
  readonly radius: number;
  readonly rings: boolean;
  readonly tilt: number;
};

const kmPerEarthRadius = 6371;
const earthGm = 398_600.4;
const gravitation = 6.674e-11;
const kgPerEarthMass = 5.972e24;
const stefanBoltzmann = 5.67e-8;
const sulphurDioxide: readonly Gas[] = ['SulphurDioxide'];
const nitrogenMethane: readonly Gas[] = ['Nitrogen', 'Methane'];
const nitrogenOxygen: readonly Gas[] = ['Nitrogen', 'Oxygen'];
const noGases: readonly Gas[] = [];
const rockMoons = new Set<MoonKind>(['Barren', 'Volcanic', 'Garden']);

const likes: Record<MoonKind, PlanetKind> = {
  Barren: 'Barren', Ice: 'Ice', Volcanic: 'Lava', Ocean: 'Ice', Hazy: 'Barren', Garden: 'Garden',
};
const densityRanges: Record<MoonKind, [number, number]> = {
  Barren: [2.8, 3.6], Ice: [1.2, 2], Volcanic: [3.3, 3.7], Ocean: [2.6, 3.1], Hazy: [1.7, 2], Garden: [4, 5.5],
};
const baseAlbedos: Record<MoonKind, number> = {
  Barren: 0.12, Ice: 0.5, Volcanic: 0.6, Ocean: 0.65, Hazy: 0.22, Garden: 0.3,
};

function tides(seed: bigint, kind: MoonKind, radiusKm: number, planet: MoonPlanet, distanceKm: number): [number, number, number] {
  const rng = Seeds.stream(seed, 'tides');
  const eccentricity = logUniform(rng, 0.0001, 0.003);
  const floorDraw = rng.nextDouble();
  let k2q: number;
  let floor = 0;
  let cap = 0.5;
  switch (kind) {
    case 'Volcanic': {
      k2q = 0.015;
      floor = DMath.exp(floorDraw * DMath.log(4));
      cap = 10;
      break;
    }

    case 'Ocean': {
      k2q = 0.01;
      floor = 0.02 * DMath.exp(floorDraw * DMath.log(15));
      break;
    }

    case 'Ice':
    case 'Hazy': {
      k2q = 0.003;
      break;
    }

    default: {
      k2q = 0.001;
    }
  }

  const a = distanceKm * 1000;
  const r = radiusKm * 1000;
  const gm = gravitation * planet.mass * kgPerEarthMass;
  const n = Math.sqrt(gm / (a * a * a));
  const a3 = a * a * a;
  const flow = 10.5 * k2q * gm * planet.mass * kgPerEarthMass * r * r * r * n * eccentricity * eccentricity / (4 * DMath.PI * a3 * a3);
  return [flow, floor, cap];
}

function surfaceGases(kind: MoonKind, isIcyAir: boolean): [readonly Gas[], number, number] {
  switch (kind) {
    case 'Ice': {
      return [isIcyAir ? nitrogenMethane : noGases, 0.0001, 0.009];
    }

    case 'Volcanic': {
      return [sulphurDioxide, 0.0001, 0.001];
    }

    case 'Hazy': {
      return [nitrogenMethane, 0.5, 5];
    }

    case 'Garden': {
      return [nitrogenOxygen, 0.5, 3];
    }

    default: {
      return [noGases, 0, 0];
    }
  }
}

function whyOf(kind: MoonKind, pressure: number, kept: readonly Gas[], lightest: number, isRenewed: boolean): string {
  if (pressure === 0) {
    if (kind === 'Ice' || kind === 'Ocean') {
      return 'its gases lie frozen on the surface';
    }

    return lightest > 44 ? 'too little gravity for its heat: even carbon dioxide escapes' : 'lost its air long ago';
  }

  if (isRenewed) {
    return kind === 'Hazy'
      ? 'too light to hold its air for ever: cryovolcanoes renew the nitrogen and methane as fast as they leak'
      : 'too light to hold its air for ever: life and volcanoes renew it as fast as it leaks';
  }

  switch (kind) {
    case 'Garden': {
      return 'life keeps oxygen in the air';
    }

    case 'Hazy': {
      return 'its gravity holds nitrogen and methane under an orange haze';
    }

    case 'Volcanic': {
      return 'its volcanoes keep a thin haze of sulphur dioxide';
    }

    default: {
      return 'its gravity holds a thin breath of ' + gasList(kept);
    }
  }
}

function air(rng: Pcg32, kind: MoonKind, teq: number, warmed: number, escape: number, inventory: number, targetDraw: number): [Atmosphere, number] {
  const pressureDraw = rng.nextDouble();
  const isIcyAir = rng.chance(25, 100);
  // The planet level's Jeans rule, on the starlight's temperature.
  const lightest = DMath.round(0.8976 * 4 * teq / (escape * escape), 1);
  const [candidates, low, high] = surfaceGases(kind, isIcyAir);
  let kept: Gas[] = [];
  let lost: Gas[] = [];
  for (const g of candidates) {
    (gasMass(g) >= lightest ? kept : lost).push(g);
  }

  // A hazy or garden moon's kind promises its air: it keeps it, and the why says what renews it.
  const isRenewed = (kind === 'Hazy' || kind === 'Garden') && lost.length > 0;
  if (isRenewed) {
    kept = [...candidates];
    lost = [];
  }

  const isWater = kind === 'Garden' && inventory > 0;
  let pressure: number;
  if (candidates.length === 0) {
    pressure = 0;
  } else if (kind === 'Garden') {
    const k = 0.6 + (isWater ? 0.25 : 0);
    const target = 275 + 25 * targetDraw;
    pressure = solve(target, warmed, k, low, high);
    if (pressure >= high) {
      // As on garden worlds near the outer edge of the habitable zone, carbon dioxide keeps it warm.
      kept.push('CarbonDioxide');
      pressure = solve(target, warmed, k + 0.6, low, high);
    }
  } else {
    pressure = low * DMath.exp(pressureDraw * DMath.log(high / low));
  }

  let why: string;
  if (pressure > 0 && kept.length === 0) {
    // Nothing it was given can stay: a trace of the heaviest, leaking away.
    kept.push(lost.at(-1)!);
    lost = [];
    why = kind === 'Volcanic'
      ? 'its volcanoes breathe out sulphur dioxide faster than it leaks away to space'
      : 'a breath of ' + gasName(kept[0]!) + ' leaking away to space';
  } else {
    why = whyOf(kind, pressure, kept, lightest, isRenewed);
  }

  pressure = DMath.round(pressure, 4);
  const effect = kept.length === 0
    ? 0
    : (kept[0] === 'CarbonDioxide' ? 1.2 : 0.6) + (isWater ? 0.25 : 0) + (hasGas(kept, 'CarbonDioxide') && kept[0] !== 'CarbonDioxide' ? 0.6 : 0);
  const atmosphere: Atmosphere = {
    class: classify(pressure),
    pressure,
    gases: pressure === 0 ? [] : kept,
    lightestGasKept: lightest,
    breathable: pressure >= 0.5 && pressure <= 3 && hasGas(kept, 'Oxygen'),
    why,
  };
  return [atmosphere, DMath.round(greenhouse(warmed, effect, pressure), 0)];
}

// The first level whose bound the roll is under, else the last.
function byRoll(roll: number, levels: ReadonlyArray<readonly [number, LifeLevel]>, otherwise: LifeLevel): LifeLevel {
  return levels.find(([bound]) => roll < bound)?.[1] ?? otherwise;
}

function moonLife(rng: Pcg32, kind: MoonKind, isOcean: boolean, temperature: number, age: PlanetHost['age']): [LifeLevel, number, number] {
  if (kind === 'Garden') {
    return lifeOf(rng, 'Garden', temperature, age);
  }

  const roll = rng.nextInt(100);
  rng.nextInt(4);
  rng.nextInt(5);
  switch (kind) {
    case 'Ocean': {
      // Under the ice: no plants, and nothing yet that is complex.
      return [byRoll(roll, [[45, 'None'], [65, 'Prebiotic'], [90, 'Microbial']], 'Simple'), 0, 0];
    }

    case 'Ice':
    case 'Hazy': {
      // Over a hidden ocean, or else Titan's tholins: the chemistry, in the cold, without the life.
      const tholins: LifeLevel = kind === 'Hazy' && roll < 30 ? 'Prebiotic' : 'None';
      return [isOcean ? byRoll(roll, [[5, 'Microbial'], [15, 'Prebiotic']], 'None') : tholins, 0, 0];
    }

    default: {
      return ['None', 0, 0];
    }
  }
}

function resourceBase(kind: MoonKind, isFar: boolean): [number, number, number, number] {
  switch (kind) {
    case 'Barren': {
      return [3, 2, isFar ? 1 : 0, 0];
    }

    case 'Volcanic': {
      return [3, 4, 0, 1];
    }

    case 'Hazy': {
      return [1, 1, 4, 4];
    }

    case 'Garden': {
      return [3, 2, 4, 1];
    }

    default: {
      return [1, 1, 5, 1];
    }
  }
}

type TraitMoon = {
  readonly kind: MoonKind;
  readonly orbit: number;
  readonly radius: number;
  readonly atmosphere: Atmosphere;
  readonly tidalHeating: number;
  readonly temperature: number;
  readonly subsurfaceOcean: boolean;
  readonly flora: number;
  readonly fauna: number;
  readonly water: number;
  readonly life: LifeLevel;
};

function moonTraits(rng: Pcg32, m: TraitMoon, planet: MoonPlanet): string[] {
  const k = m.kind;
  const giant = isGiant(planet.kind);
  const isAir = (m.atmosphere.pressure ?? 0) >= 0.01;
  const isIcy = k === 'Ice' || k === 'Ocean';
  const isRocky = k === 'Barren' || k === 'Ice';
  // Every trait in a fixed order with its weight; a weight of 0 means the data does not support it.
  const candidates: Candidate[] = [
    ['active volcanoes', k === 'Volcanic' ? 10 : 0],
    ['sulphur plains', k === 'Volcanic' ? 8 : 0],
    ['lava lakes', k === 'Volcanic' ? 6 : 0],
    ['ice geysers', isIcy && m.tidalHeating >= 0.01 && m.temperature < 200 ? 10 : 0],
    ['a cracked ice shell', k === 'Ocean' ? 10 : 0],
    ['an ocean under the ice', m.subsurfaceOcean ? 6 : 0],
    ['a sublimating crust', isIcy && m.temperature >= 200 ? 10 : 0],
    ['an orange haze', k === 'Hazy' ? 10 : 0],
    ['methane lakes', isAir && hasGas(m.atmosphere.gases, 'Methane') && m.temperature >= 90 && m.temperature <= 112 ? 10 : 0],
    ['hydrocarbon dunes', k === 'Hazy' ? 6 : 0],
    ['ancient craters', isRocky ? 8 : 0],
    ['a two-toned face', isRocky ? 3 : 0],
    ['deep canyons', isRocky || k === 'Ocean' ? 4 : 0],
    ['a giant crater', 2],
    ['a captured asteroid', k === 'Barren' && m.radius < 300 ? 8 : 0],
    ['the giant fills its sky', giant && m.orbit < 10 ? 8 : 0],
    ['eclipses every orbit', giant && m.orbit < 30 ? 5 : 0],
    ['rings across its sky', planet.rings ? 6 : 0],
    ['tidal flexing', m.tidalHeating >= 0.05 && k !== 'Volcanic' ? 6 : 0],
    ['auroras', isAir && giant ? 3 : 0],
    ['towering forests', m.flora >= 4 ? 8 : 0],
    ['great herds', m.fauna >= 4 ? 8 : 0],
    ['glowing seas', m.water > 0 && lifeIndex(m.life) >= 3 ? 6 : 0],
    ['scattered archipelagos', m.water > 0 && m.water < 0.95 ? 6 : 0],
    ['fungal jungles', k === 'Garden' ? 4 : 0],
  ];
  return pickTraits(rng, candidates);
}

function moonHazards(m: TraitMoon & {readonly traits: readonly string[]}, planet: MoonPlanet): Hazard[] {
  const list: Hazard[] = [];
  const isExposed = (m.atmosphere.pressure ?? 0) < 0.5;
  if (isExposed && planet.kind === 'GasGiant' && m.orbit < 15) {
    list.push(['the giant\'s radiation belts', 4]);
  } else if (isExposed && ((planet.kind === 'GasGiant' && m.orbit < 30) || (planet.kind === 'IceGiant' && m.orbit < 10))) {
    list.push(['radiation from the giant', 3]);
  }

  if (m.kind === 'Volcanic') {
    list.push(['eruptions', 2]);
  }

  for (const t of m.traits) {
    if (t === 'ice geysers') {
      list.push(['geysers', 2]);
    }
  }

  if (m.tidalHeating >= 0.1 && m.kind !== 'Volcanic') {
    list.push(['moonquakes', 2]);
  }

  return list;
}

const moonWords: Record<MoonKind, string> = {
  Barren: 'barren', Ice: 'ice', Volcanic: 'volcanic', Ocean: 'ocean', Hazy: 'hazy', Garden: 'garden',
};

function descriptorOf(kind: MoonKind, planet: MoonPlanet): string {
  return withArticle(moonWords[kind] + ' moon') + ' of ' + withArticle((planet.rings ? 'ringed ' : '') + planetNouns[planet.kind]);
}

/**
The moon level's detail for one moon. C# `MoonDetail.Apply`.
*/
export function applyMoonDetail<M extends StarSystemMoonCore>(m: M, planet: MoonPlanet, host: PlanetHost, seed: bigint, weirdness: number): M & MoonDetailFields {
  const radius = m.radius / kmPerEarthRadius;

  // 1. Physics, from the kind's density and the stored radius.
  const [low, high] = densityRanges[m.kind];
  const density = DMath.round(Seeds.stream(seed, 'body').rangeDouble(low, high), 2);
  const gravity = DMath.round(density / 5.514 * radius, 3);
  const escape = DMath.round(11.186 * radius * Math.sqrt(density / 5.514), 2);
  const mass = DMath.round(density / 5.514 * radius * radius * radius, 6);

  // 2. The orbit around its planet; it keeps one face to the planet, so it turns once per orbit.
  const distance = DMath.round(m.orbit * planet.radius * kmPerEarthRadius, 0);
  const period = DMath.round(2 * DMath.PI * Math.sqrt(distance * distance * distance / (earthGm * planet.mass)) / 86_400, 3);
  const rotation = DMath.round(period * 24, 1);

  // 3. Tidal heat, bounded by what the kind promises.
  const [flow, floor, cap] = tides(seed, m.kind, m.radius, planet, distance);
  const heating = DMath.round(Math.max(floor, Math.min(cap, flow)), 4);

  // 4. Light, albedo, water; tidal heat adds to the starlight.
  const surface = Seeds.stream(seed, 'surface');
  const albedo = DMath.round(baseAlbedos[m.kind] + surface.rangeDouble(-0.05, 0.05), 2);
  const waterDraw = surface.nextDouble();
  const targetDraw = surface.nextDouble();
  const flux = host.light / (planet.orbit * planet.orbit);
  const teq = 278.6 * Math.sqrt(Math.sqrt(flux * (1 - albedo)));
  const warmed = Math.sqrt(Math.sqrt(teq * teq * teq * teq + heating / stefanBoltzmann));
  let inventory: number;
  switch (m.kind) {
    case 'Ice': {
      inventory = 0.6 + 0.4 * waterDraw;
      break;
    }

    case 'Ocean': {
      inventory = 1;
      break;
    }

    case 'Garden': {
      inventory = 0.3 + 0.55 * waterDraw;
      break;
    }

    default: {
      inventory = 0;
    }
  }

  inventory = DMath.round(inventory, 2);

  // 5. Air by the planet level's Jeans rule, then the surface temperature.
  const [atmosphere, temperature] = air(Seeds.stream(seed, 'atmosphere'), m.kind, teq, warmed, escape, inventory, targetDraw);
  const pressure = atmosphere.pressure ?? 0;
  const redistribution = pressure / (pressure + 0.1);
  const swing = (1 - redistribution) * Math.min(1, rotation / 100);
  const day = DMath.round(temperature * (1 + 0.3 * swing), 0);
  const night = DMath.round(temperature * (1 - 0.7 * swing), 0);

  // 6. A hidden ocean.
  const isOcean = m.kind === 'Ocean'
    || ((m.kind === 'Ice' || m.kind === 'Hazy') && temperature < 260 && (heating >= 0.01 || m.radius >= 1200));

  // 7 and 8. Life, then climate bands and biomes as a planet turning once per orbit with its planet's tilt.
  const [life, flora, fauna] = moonLife(Seeds.stream(seed, 'life'), m.kind, isOcean, Math.trunc(temperature), host.age);
  const like = likes[m.kind];
  const [bands, biomeShares, water, ice] = climate(like, 'Free', temperature, day, night, planet.tilt, redistribution, pressure, inventory, flora);
  const partial = {
    ...m,
    distance,
    period,
    composition: (rockMoons.has(m.kind) ? 'Rock' : 'IceAndRock') as Composition,
    density,
    mass,
    gravity,
    escapeVelocity: escape,
    insolation: DMath.round(flux, 4),
    albedo,
    tidalHeating: heating,
    temperature,
    dayTemperature: day,
    nightTemperature: night,
    atmosphere,
    water,
    ice,
    subsurfaceOcean: isOcean,
    rotation,
    tilt: planet.tilt,
    bands,
    biomes: biomeShares,
    life,
    flora,
    fauna,
  };

  // 9 and 10. Traits and anomaly, resources.
  const traits = moonTraits(Seeds.stream(seed, 'traits'), partial, planet);
  const anomaly = anomalyOf(Seeds.stream(seed, 'anomaly'), false, weirdness);
  const [metals, rare, ices, gases] = resourceBase(m.kind, planet.zone === 'Cold' || planet.zone === 'Outer');
  let organicsValue = organics(life, flora, atmosphere);
  if (m.kind === 'Hazy') {
    // Hydrocarbon dunes and lakes.
    organicsValue = Math.max(organicsValue, 3);
  }

  const resources = grades(Seeds.stream(seed, 'resources'), metals, rare, ices, gases, organicsValue);

  // 11 and 12. Hazards, similarity, habitability, descriptor and summary, through the planet level's code.
  const standIn: StoryPlanet = {
    kind: like,
    zone: planet.zone,
    gravity,
    temperature,
    dayTemperature: day,
    nightTemperature: night,
    atmosphere,
    water,
    ice,
    spin: 'Free',
    biomes: biomeShares,
    life,
    fauna,
    traits,
    hazard: 0,
  };
  const [hazard, hazards] = hazardsOf(standIn, host.star, moonHazards({...partial, traits}, planet));
  return {
    ...partial,
    traits,
    anomaly,
    resources,
    hazard,
    hazards,
    similarity: similarity(radius, density, escape, temperature),
    habitability: habitabilityOf(humanSpecies, atmosphere, temperature, gravity),
    descriptor: descriptorOf(m.kind, planet),
    summary: summaryOf({...standIn, hazard}, isOcean ? 'an ocean under the ice' : undefined, gravity < 0.01 ? 3 : 2),
  };
}
