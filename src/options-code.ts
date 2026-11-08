/**
The text form of the options (`systems=120&shape=barred`) and the soft check of them. A port of `Options/OptionsCode.cs`
and `GeneratorOptions.Check`.
*/
import {shapeWarnings, type GeneratorWarning} from './galaxies/galaxy.ts';
import {
  Guarantee,
  Preset,
  resolveOptions,
  validateOptions,
  type Epoch,
  type GalaxyShape,
  type GeneratorOptions,
} from './options.ts';

const names = ['systems', 'shape', 'starmix', 'weirdness', 'planets', 'cluster', 'epoch', 'arms', 'lanes', 'danger', 'names', 'require', 'tables'];

const guarantees: ReadonlyArray<readonly [number, string]> = [
  [Guarantee.GardenWorld, 'garden'],
  [Guarantee.OceanWorld, 'ocean'],
  [Guarantee.PrecursorSite, 'precursor'],
  [Guarantee.BlueStar, 'blue'],
  [Guarantee.Giant, 'giant'],
  [Guarantee.WhiteDwarf, 'whitedwarf'],
  [Guarantee.NeutronStar, 'neutron'],
  [Guarantee.BlackHole, 'blackhole'],
  [Guarantee.SunLikeStar, 'sunlike'],
];

const shapeCodes: readonly GalaxyShape[] = ['Auto', 'Spiral', 'Barred', 'Elliptical', 'Ring', 'Irregular', 'Colliding', 'Starburst', 'Clustered'];
const epochCodes: readonly Epoch[] = ['Auto', 'Young', 'Mature', 'Old'];

/**
The settings that differ from the defaults as `name=value` pairs joined by `&`, in a fixed order. C# `GeneratorOptions.ToCode`.
*/
export function optionsToCode(o: GeneratorOptions): string {
  const d = Preset.default;
  const parts: string[] = [];
  const add = (name: string, value: string | number): void => {
    parts.push(`${name}=${value}`);
  };

  if (o.systems !== d.systems) {
    add('systems', o.systems);
  }

  if (o.shape !== d.shape) {
    add('shape', o.shape.toLowerCase());
  }

  if (o.starMix !== d.starMix) {
    add('starmix', o.starMix === 'Plausible' ? 'plausible' : 'game');
  }

  if (o.weirdness !== d.weirdness) {
    add('weirdness', o.weirdness);
  }

  if (o.maxPlanetsPerSystem !== d.maxPlanetsPerSystem) {
    add('planets', o.maxPlanetsPerSystem);
  }

  if (o.clusterKind !== d.clusterKind) {
    add('cluster', o.clusterKind.toLowerCase());
  }

  if (o.epoch !== d.epoch) {
    add('epoch', o.epoch.toLowerCase());
  }

  if (o.arms !== undefined) {
    add('arms', o.arms);
  }

  if (o.extraLanes !== d.extraLanes) {
    add('lanes', o.extraLanes);
  }

  if (o.dangerShift !== d.dangerShift) {
    add('danger', o.dangerShift);
  }

  if (o.names !== d.names) {
    add('names', o.names === 'Invented' ? 'invented' : 'catalogue');
  }

  if (o.require !== d.require) {
    add('require', guaranteeNames(o.require));
  }

  if (o.tables !== undefined) {
    add('tables', o.tables);
  }

  return parts.join('&');
}

/**
The guarantee flags as their code names joined by commas, or `none`.
*/
export function guaranteeNames(require: number): string {
  const listed = guarantees.filter(([flag]) => (require & flag) !== 0).map(([, name]) => name);
  return listed.length === 0 ? 'none' : listed.join(',');
}

const bad = (message: string): SyntaxError => new SyntaxError(message);

const choice = (name: string, value: string, choices: string): SyntaxError => bad(`${name} must be one of ${choices}; got "${value}".`);

function readInt(name: string, value: string): number {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  if (digits.length === 0 || digits.length > 9 || (digits.length > 1 && digits.startsWith('0')) || !/^\d+$/u.test(digits)) {
    throw bad(`${name} must be a whole number such as 12; got "${value}".`);
  }

  const v = Number(digits);
  return negative ? -v : v;
}

function readChoice<T extends string>(name: string, value: string, choices: readonly T[]): T {
  const found = choices.find(c => c.toLowerCase() === value);
  if (found === undefined) {
    throw choice(name, value, choices.map(c => c.toLowerCase()).join(', '));
  }

  return found;
}

function readGuarantees(value: string): number {
  if (value === 'none') {
    return 0;
  }

  let require = 0;
  for (const part of value.split(',')) {
    const found = guarantees.find(([, name]) => name === part);
    if (found === undefined) {
      throw bad(`require takes none or a comma-separated list of garden, ocean, precursor, blue, giant, whitedwarf, neutron, blackhole, sunlike; got "${part}".`);
    }

    if ((require & found[0]) !== 0) {
      throw bad(`require lists "${found[1]}" twice.`);
    }

    require |= found[0];
  }

  return require;
}

function readSetting(o: GeneratorOptions, name: string, value: string): GeneratorOptions {
  switch (name) {
    case 'systems': {
      return {...o, systems: readInt(name, value)};
    }

    case 'shape': {
      return {...o, shape: readChoice(name, value, shapeCodes)};
    }

    case 'starmix': {
      return {...o, starMix: readChoice(name, value, ['Game', 'Plausible'] as const)};
    }

    case 'weirdness': {
      return {...o, weirdness: readInt(name, value)};
    }

    case 'planets': {
      return {...o, maxPlanetsPerSystem: readInt(name, value)};
    }

    case 'cluster': {
      return {...o, clusterKind: readChoice(name, value, ['Auto', 'Group', 'Cluster'] as const)};
    }

    case 'epoch': {
      return {...o, epoch: readChoice(name, value, epochCodes)};
    }

    case 'arms': {
      return {...o, arms: readInt(name, value)};
    }

    case 'lanes': {
      return {...o, extraLanes: readInt(name, value)};
    }

    case 'danger': {
      return {...o, dangerShift: readInt(name, value)};
    }

    case 'tables': {
      return {...o, tables: value};
    }

    case 'require': {
      return {...o, require: readGuarantees(value)};
    }

    default: {
      return {...o, names: readChoice(name, value, ['Catalogue', 'Invented'] as const)};
    }
  }
}

/**
Reads a code written by {@link optionsToCode}; a leading `?` is allowed and an empty code gives the defaults. Throws a
SyntaxError with the C# message for a malformed code, and the `validateOptions` error for a value out of range.
C# `GeneratorOptions.FromCode`.
*/
export function optionsFromCode(code: string): GeneratorOptions {
  let o: GeneratorOptions = Preset.default;
  const text = code.startsWith('?') ? code.slice(1) : code;
  if (text.length === 0) {
    return o;
  }

  const seen = new Set<string>();
  for (const pair of text.split('&')) {
    const eq = pair.indexOf('=');
    if (eq <= 0 || eq === pair.length - 1) {
      throw bad(`"${pair}" is not a name=value pair, as in systems=120.`);
    }

    const name = pair.slice(0, eq);
    if (!names.includes(name)) {
      throw bad(`"${name}" is not a setting; the settings are ${names.join(', ')}.`);
    }

    if (seen.has(name)) {
      throw bad(`"${name}" appears twice.`);
    }

    seen.add(name);
    o = readSetting(o, name, pair.slice(eq + 1));
  }

  validateOptions(o);
  return Object.freeze(o);
}

/**
Soft problems with these settings that validation lets through, such as arms for a shape without arms. Throws as
`validateOptions` does for an invalid setting. Missing settings take their defaults, as in the generators. C# `GeneratorOptions.Check`.
*/
export function checkOptions(options?: Partial<GeneratorOptions>): GeneratorWarning[] {
  const o = resolveOptions(options);
  validateOptions(o);
  const warnings: GeneratorWarning[] = [];
  shapeWarnings(warnings, o.shape, o.systems, o.arms);
  if (o.maxPlanetsPerSystem === 0 && (o.require & (Guarantee.GardenWorld | Guarantee.OceanWorld)) !== 0) {
    warnings.push({code: 'GuaranteeUnmet', message: 'Require asks for a world, but MaxPlanetsPerSystem = 0 allows no planets.'});
  }

  return warnings;
}
