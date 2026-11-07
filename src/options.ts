import {findTables, checkTablesId} from './tables.ts';

/**
Which star types a generated region holds. C# `StarMix`.
*/
export type StarMix = 'Game' | 'Plausible';
/**
The age of a universe. C# `Epoch`.
*/
export type Epoch = 'Auto' | 'Young' | 'Mature' | 'Old';
/**
A galaxy's shape. C# `GalaxyShape`.
*/
export type GalaxyShape = 'Auto' | 'Spiral' | 'Barred' | 'Elliptical' | 'Ring' | 'Irregular' | 'Colliding' | 'Starburst' | 'Clustered';
/**
A small group or a rich cluster. C# `ClusterKind`.
*/
export type ClusterKind = 'Auto' | 'Group' | 'Cluster';
/**
Catalogue or invented names. C# `NameStyle`.
*/
export type NameStyle = 'Catalogue' | 'Invented';

/**
Flags of what every galaxy must hold, the same numbers as the C# `Guarantee` enum.
*/
export const Guarantee = {
  None: 0,
  GardenWorld: 1,
  OceanWorld: 2,
  PrecursorSite: 4,
  BlueStar: 8,
  Giant: 16,
  WhiteDwarf: 32,
  NeutronStar: 64,
  BlackHole: 128,
  SunLikeStar: 256,
} as const;

/**
Every setting of the generator. Start from a {@link Preset} and spread what you change: `{...Preset.spaceOpera, weirdness: 10}`.
The C# record `GeneratorOptions`, with camelCase names.
*/
export type GeneratorOptions = {
  readonly starMix: StarMix;
  readonly weirdness: number;
  readonly maxPlanetsPerSystem: number;
  readonly systems: number;
  readonly shape: GalaxyShape;
  readonly clusterKind: ClusterKind;
  readonly epoch: Epoch;
  readonly arms: number | undefined;
  readonly extraLanes: number;
  readonly dangerShift: number;
  readonly names: NameStyle;
  /**
  Guarantee flags combined with `|`, such as `Guarantee.GardenWorld | Guarantee.BlackHole`.
  */
  readonly require: number;
  readonly tables: string | undefined;
};

/**
The longest seed text accepted.
*/
export const maxSeedLength = 200;
/**
The most systems a galaxy may have.
*/
export const maxSystems = 2000;

const defaults: GeneratorOptions = Object.freeze({
  starMix: 'Game',
  weirdness: 5,
  maxPlanetsPerSystem: 12,
  systems: 60,
  shape: 'Auto',
  clusterKind: 'Auto',
  epoch: 'Auto',
  arms: undefined,
  extraLanes: 25,
  dangerShift: 0,
  names: 'Catalogue',
  require: 0,
  tables: undefined,
});

const preset = (changes: Partial<GeneratorOptions>): GeneratorOptions => Object.freeze({...defaults, ...changes});

/**
Ready-made settings, the same as the C# `Preset` class.
*/
export const Preset = Object.freeze({
  default: defaults,
  spaceOpera: preset({weirdness: 10}),
  plausible: preset({starMix: 'Plausible', weirdness: 1}),
  pocket: preset({systems: 20, maxPlanetsPerSystem: 6}),
  roguelike: preset({
    systems: 30, extraLanes: 10, dangerShift: 2, weirdness: 15,
  }),
  cozy: preset({
    systems: 40, extraLanes: 50, dangerShift: -3, weirdness: 3,
  }),
  epic: preset({systems: 300}),
});

const shapes: readonly GalaxyShape[] = ['Auto', 'Spiral', 'Barred', 'Elliptical', 'Ring', 'Irregular', 'Colliding', 'Starburst', 'Clustered'];
const allGuarantees = 511;

function checkRange(name: string, value: number, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} must be ${min} to ${max}; you asked for ${value}.`);
  }
}

function checkChoice(name: string, value: string, choices: readonly string[], words: string): void {
  if (!choices.includes(value)) {
    throw new RangeError(`${name} must be ${words}; you asked for ${value}.`);
  }
}

/**
Fills in defaults for a partial options object.
*/
export function resolveOptions(options?: Partial<GeneratorOptions>): GeneratorOptions {
  return options === undefined ? defaults : {...defaults, ...options};
}

/**
Throws a RangeError naming the first invalid setting and what it must be, in the C# `Validate` order.
*/
export function validateOptions(o: GeneratorOptions): void {
  checkRange('Weirdness', o.weirdness, 0, 100);
  checkRange('MaxPlanetsPerSystem', o.maxPlanetsPerSystem, 0, 20);
  checkRange('Systems', o.systems, 1, maxSystems);
  if (o.arms !== undefined) {
    checkRange('Arms', o.arms, 2, 4);
  }

  checkRange('ExtraLanes', o.extraLanes, 0, 100);
  checkRange('DangerShift', o.dangerShift, -5, 5);
  checkChoice('Shape', o.shape, shapes, 'a GalaxyShape such as Auto or Spiral');
  checkChoice('ClusterKind', o.clusterKind, ['Auto', 'Group', 'Cluster'], 'Auto, Group or Cluster');
  checkChoice('Epoch', o.epoch, ['Auto', 'Young', 'Mature', 'Old'], 'Auto, Young, Mature or Old');
  checkChoice('Names', o.names, ['Catalogue', 'Invented'], 'Catalogue or Invented');
  if (!Number.isSafeInteger(o.require) || (o.require & ~allGuarantees) !== 0 || o.require < 0) {
    throw new RangeError(`Require must combine Guarantee flags such as GardenWorld | BlackHole; you asked for ${o.require}.`);
  }

  if (o.tables !== undefined) {
    checkTablesId(o.tables);
    if (findTables(o.tables) === undefined) {
      throw new RangeError(`No tables are registered as "${o.tables}"; call GeneratorTables.register first.`);
    }
  }

  checkChoice('StarMix', o.starMix, ['Game', 'Plausible'], 'Game or Plausible');
}

/**
The C# `CheckSeed`: a seed is any text up to {@link maxSeedLength} UTF-16 code units.
*/
export function checkSeed(seed: string): string {
  if (typeof seed !== 'string') {
    throw new TypeError('A seed is any text, such as "my-seed" or "42"; it cannot be null.');
  }

  if (seed.length > maxSeedLength) {
    throw new RangeError(`A seed must be at most ${maxSeedLength} characters; yours has ${seed.length}.`);
  }

  return seed;
}

/**
A number seed as text, the same as C# `long.ToString` (an integer, as a bigint for values past 2^53).
*/
export function seedText(seed: number | bigint): string {
  if (typeof seed === 'number' && !Number.isSafeInteger(seed)) {
    throw new RangeError(`A number seed must be a whole number; got ${seed}.`);
  }

  return BigInt.asIntN(64, BigInt(seed)).toString();
}
