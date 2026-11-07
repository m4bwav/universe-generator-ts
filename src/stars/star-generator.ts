import {DMath} from '../core/dmath.ts';
import type {Pcg32} from '../core/pcg32.ts';
import type {GeneratorOptions} from '../options.ts';
import {
  tablesFor,
  starMature,
  starOld,
  starPlausible,
  starYoung,
} from '../tables.ts';

/**
The kind of star. C# `StarClass`.
*/
export type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M' | 'WhiteDwarf' | 'Giant' | 'Supergiant' | 'NeutronStar' | 'BlackHole';
/**
How old a region's stars are. C# `StellarAge`.
*/
export type StellarAge = 'Young' | 'Mature' | 'Old';
/**
Close (planets circle both) or wide (planets circle the primary). C# `CompanionOrbit`.
*/
export type CompanionOrbit = 'Close' | 'Wide';

/**
A star: mass, luminosity and radius in Suns, temperature in kelvin. C# `Star`.
*/
export type Star = {
  readonly class: StarClass;
  readonly spectralType: string;
  readonly mass: number;
  readonly luminosity: number;
  readonly radius: number;
  readonly temperature: number;
  readonly colour: string;
  readonly description: string;
};

/**
A second star in the system. C# `Companion`.
*/
export type Companion = {readonly star: Star; readonly orbit: CompanionOrbit; readonly separation: number};

/**
Order of every weight table below.
*/
export const starClasses: readonly StarClass[] = ['M', 'K', 'G', 'F', 'A', 'B', 'O', 'WhiteDwarf', 'Giant', 'Supergiant', 'NeutronStar', 'BlackHole'];

const binaryPercent = [25, 35, 45, 50, 65, 70, 75, 20, 30, 50, 15, 20];
const companionClasses: readonly StarClass[] = ['M', 'K', 'G', 'WhiteDwarf'];
const companionWeights = [60, 25, 10, 5];

const logUniform = (rng: Pcg32, low: number, high: number): number =>
  low * DMath.exp(rng.nextDouble() * DMath.log(high / low));

function massBand(c: StarClass): [number, number] {
  switch (c) {
    case 'O': {
      return [27, 60];
    }

    case 'B': {
      return [2.7, 26];
    }

    case 'A': {
      return [1.55, 2.65];
    }

    case 'F': {
      return [1.07, 1.54];
    }

    case 'G': {
      return [0.84, 1.06];
    }

    case 'K': {
      return [0.48, 0.83];
    }

    default: {
      return [0.08, 0.47];
    }
  }
}

function temperatureBand(t: number): [string, number, number] {
  if (t >= 30_000) {
    return ['O', 30_000, 50_000];
  }

  if (t >= 10_000) {
    return ['B', 10_000, 30_000];
  }

  if (t >= 7500) {
    return ['A', 7500, 10_000];
  }

  if (t >= 6000) {
    return ['F', 6000, 7500];
  }

  if (t >= 5200) {
    return ['G', 5200, 6000];
  }

  return t >= 3700 ? ['K', 3700, 5200] : ['M', 2400, 3700];
}

const digit = (value: number, min: number, max: number): string => String(DMath.clamp(value, min, max));

function spectralType(c: StarClass, t: number): string {
  if (c === 'NeutronStar' || c === 'BlackHole') {
    return '';
  }

  if (c === 'WhiteDwarf') {
    return 'DA' + digit(Math.floor((50_400 / t) + 0.5), 1, 9);
  }

  const [letter, low, high] = temperatureBand(t);
  const luminosityClass = c === 'Giant' ? 'III' : (c === 'Supergiant' ? 'I' : 'V');
  return letter + digit(Math.floor(10 * (high - t) / (high - low)), 0, 9) + luminosityClass;
}

const descriptions: Record<StarClass, string> = {
  O: 'blue star',
  B: 'blue-white star',
  A: 'white star',
  F: 'yellow-white star',
  G: 'yellow star',
  K: 'orange dwarf',
  M: 'red dwarf',
  WhiteDwarf: 'white dwarf',
  Giant: '',
  Supergiant: '',
  NeutronStar: 'neutron star',
  BlackHole: 'black hole',
};

function describe(c: StarClass, t: number): string {
  if (c === 'Giant') {
    return t < 5200 ? 'red giant' : 'yellow giant';
  }

  if (c === 'Supergiant') {
    return t >= 10_000 ? 'blue supergiant' : (t >= 5200 ? 'yellow supergiant' : 'red supergiant');
  }

  return descriptions[c];
}

function colour(c: StarClass, t: number): string {
  if (c === 'BlackHole') {
    return '#7a4dff';
  }

  if (c === 'NeutronStar') {
    return '#e0f0ff';
  }

  const bands: Array<[number, string]> = [[30_000, '#9bb0ff'], [10_000, '#aabfff'], [7500, '#cad7ff'], [6000, '#f8f7ff'], [5200, '#fff4ea'], [3700, '#ffd2a1']];
  for (const [above, value] of bands) {
    if (t > above) {
      return value;
    }
  }

  return '#ffad51';
}

/**
A star of class c; maxMass caps a main-sequence mass band. C# `StarGenerator.Make`.
*/
export function makeStar(c: StarClass, rng: Pcg32, maxMass = Number.MAX_VALUE): Star {
  let mass: number;
  let luminosity: number;
  let radius: number;
  switch (c) {
    case 'Giant': {
      mass = rng.rangeDouble(0.9, 4);
      luminosity = logUniform(rng, 40, 600);
      radius = rng.rangeDouble(10, 60);
      break;
    }

    case 'Supergiant': {
      mass = rng.rangeDouble(10, 30);
      luminosity = logUniform(rng, 2e4, 2e5);
      radius = logUniform(rng, 30, 800);
      break;
    }

    case 'WhiteDwarf': {
      mass = rng.rangeDouble(0.5, 1.2);
      luminosity = logUniform(rng, 0.0005, 0.01);
      radius = 0.012;
      break;
    }

    case 'NeutronStar': {
      mass = rng.rangeDouble(1.3, 2.1);
      luminosity = 0.00001;
      radius = 0.000015;
      break;
    }

    case 'BlackHole': {
      mass = rng.rangeDouble(5, 20);
      luminosity = 0;
      radius = 0.0000042 * mass;
      break;
    }

    default: {
      const [low, high] = massBand(c);
      mass = logUniform(rng, low, Math.min(high, Math.max(low, maxMass)));
      luminosity = mass < 0.43 ? 0.23 * DMath.pow(mass, 2.3) : (mass < 2 ? DMath.pow(mass, 4) : 1.4 * DMath.pow(mass, 3.5));
      radius = DMath.pow(mass, 0.8);
    }
  }

  let temperature = luminosity <= 0 ? 0 : 5778 * DMath.pow(luminosity / (radius * radius), 0.25);
  mass = DMath.round(mass, 3);
  luminosity = DMath.round(luminosity, 5);
  radius = DMath.round(radius, 6);
  temperature = DMath.round(temperature, 0);
  return {
    class: c,
    spectralType: spectralType(c, temperature),
    mass,
    luminosity,
    radius,
    temperature,
    colour: colour(c, temperature),
    description: describe(c, temperature),
  };
}

/**
A star and maybe a companion, drawn with the options' tables. C# `StarGenerator.Roll`.
*/
export function rollStar(rng: Pcg32, age: StellarAge, options: GeneratorOptions): {star: Star; companion: Companion | undefined} {
  const ageTables = {Young: starYoung, Mature: starMature, Old: starOld} as const;
  const table = options.starMix === 'Plausible' ? starPlausible : ageTables[age];
  const index = rng.weighted(tablesFor(options).weights(table));
  const star = makeStar(starClasses[index]!, rng);
  let companion: Companion | undefined;
  if (rng.nextInt(100) < binaryPercent[index]!) {
    let second = makeStar(companionClasses[rng.weighted(companionWeights)]!, rng);
    if (second.mass > star.mass) {
      second = makeStar('M', rng, Math.min(0.47, Math.max(0.08, star.mass * 0.9)));
    }

    const isClose = rng.chance(45, 100);
    const separation = isClose ? rng.rangeDouble(0.02, 0.3) : logUniform(rng, 50, 2000);
    companion = {star: second, orbit: isClose ? 'Close' : 'Wide', separation: DMath.round(separation, 4)};
  }

  return {star, companion};
}
