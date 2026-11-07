/**
A galaxy: a map of star systems joined by lanes, grouped into named regions, with danger growing away from the core. A
port of `Galaxies/Galaxy.cs` (GalaxyGenerator), `Core/Diagnostics.cs` and the lone-galaxy parts of `GalaxyTypes`.
Clusters, extras (factions, points of interest, hazards, monuments, beacons), guarantees and hooks are not ported yet.
*/
import {Address} from '../core/address.ts';
import {DMath} from '../core/dmath.ts';
import {Seeds} from '../core/seeds.ts';
import {systemName} from '../names/invented-names.ts';
import {
  checkSeed,
  resolveOptions,
  seedText,
  validateOptions,
  type GalaxyShape,
  type GeneratorOptions,
  type NameStyle,
} from '../options.ts';
import {rollStar, type StarClass, type StellarAge} from '../stars/star-generator.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {generateSystemAt, type StarSystem} from '../systems/star-system.ts';
import {
  firstSpiralCount,
  galaxyRadius,
  GalaxyLayout,
  noTuning,
  systemSeed,
} from './galaxy-layout.ts';

/**
The kinds of soft problem the generator reports instead of throwing. C# `WarningCode`.
*/
export type WarningCode = 'SystemsTrimmed' | 'ArmsIgnored' | 'ShapeTooSmall' | 'NameNumbered' | 'GuaranteeUnmet';

/**
A soft problem: generation went on, and this says what was changed or ignored. C# `GeneratorWarning`.
*/
export type GeneratorWarning = {readonly code: WarningCode; readonly message: string};

/**
A system as the galaxy map shows it, without its planets. C# `MapEntry` (faction fields not ported yet).
*/
export type MapEntry = {
  readonly index: number;
  readonly address: string;
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
A lane between two systems; `a` is the lower index. C# `Lane`.
*/
export type Lane = {readonly a: number; readonly b: number; readonly bridge: boolean};

/**
A named region, such as "Vela Reach". C# `GalaxyRegion`.
*/
export type GalaxyRegion = {readonly index: number; readonly name: string; readonly age: StellarAge; readonly theme: string; readonly centre: number};

/**
What a galaxy gives one of its systems: name, region age, danger and richness. C# `SystemContext`.
*/
export type SystemContext = {readonly name: string; readonly age: StellarAge; readonly danger: number; readonly richness: number};

/**
A generated galaxy. C# `Galaxy`.
*/
export type Galaxy = {
  readonly address: string;
  readonly name: string;
  readonly type: string;
  readonly descriptor: string;
  readonly age: StellarAge;
  readonly shape: GalaxyShape;
  readonly arms: number;
  readonly radius: number;
  readonly core: number;
  readonly map: readonly MapEntry[];
  readonly lanes: readonly Lane[];
  readonly regions: readonly GalaxyRegion[];
  readonly warnings: readonly GeneratorWarning[];
  /**
  What each system's generation takes from the galaxy, in map order.
  */
  readonly contexts: readonly SystemContext[];
  /**
  System `index` in full, generated on first read and kept; equal to what its address alone regenerates.
  */
  system(index: number): StarSystem;
};

const loneNames = [
  'Aster',
  'Brontes',
  'Calyx',
  'Cassia',
  'Corona',
  'Delphis',
  'Elara',
  'Eridan',
  'Fenris',
  'Halcyon',
  'Helix',
  'Ilios',
  'Ishtar',
  'Kestrel',
  'Lumen',
  'Maelstrom',
  'Meridian',
  'Nyx',
  'Oberon',
  'Pallas',
  'Perseid',
  'Quill',
  'Rhea',
  'Seraph',
  'Solace',
  'Tethys',
  'Thule',
  'Umbra',
  'Vesper',
  'Wyvern',
  'Zephyr',
  'Zenith',
];

const shapeName = (shape: GalaxyShape): string => shape.toLowerCase();

/**
The soft shape checks shared by the options check and the galaxy level. C# `Diagnostics.Shape`.
*/
export function shapeWarnings(warnings: GeneratorWarning[], requested: GalaxyShape, systems: number, arms: number | undefined): void {
  const isSpiral = requested === 'Spiral' || requested === 'Barred';
  if (isSpiral && systems < firstSpiralCount) {
    warnings.push({
      code: 'ShapeTooSmall',
      message: `A ${shapeName(requested)} galaxy of ${systems} systems: arms read on a map only from ${firstSpiralCount} systems.`,
    });
  }

  if (arms !== undefined && requested !== 'Auto' && !isSpiral) {
    warnings.push({code: 'ArmsIgnored', message: `Arms = ${arms} changes nothing: a ${shapeName(requested)} galaxy has no arms.`});
  } else if (arms !== undefined && requested === 'Auto' && systems < firstSpiralCount) {
    warnings.push({
      code: 'ArmsIgnored',
      message: `Arms = ${arms} changes nothing: under ${firstSpiralCount} systems, Auto picks an elliptical, ring or irregular galaxy.`,
    });
  }
}

const letterOf = (pitch: number): string => pitch < 0.31 ? 'a' : (pitch < 0.38 ? 'b' : 'c');

/**
The type code a lone galaxy's map implies. C# `GalaxyTypes.Derive`.
*/
export function deriveGalaxyType(shape: GalaxyShape, pitch: number, ellipse: number): string {
  switch (shape) {
    case 'Spiral': {
      return 'S' + letterOf(pitch);
    }

    case 'Barred': {
      return 'SB' + letterOf(pitch);
    }

    case 'Ring': {
      return 'Ring';
    }

    case 'Irregular': {
      return 'Irr';
    }

    case 'Colliding': {
      return 'Pec';
    }

    case 'Starburst': {
      return 'Burst';
    }

    case 'Clustered': {
      return 'Clumpy';
    }

    default: {
      // En has an axis ratio of 1 - n / 10; worked in whole thousandths so no last bit decides it.
      const thousandths = Math.trunc(DMath.round(ellipse, 3) * 1000 + 0.5);
      return 'E' + String(Math.trunc((1000 - thousandths + 50) / 100));
    }
  }
}

const nouns: Record<string, string> = {
  cD: 'giant elliptical galaxy',
  S0: 'lenticular galaxy',
  Ring: 'ring galaxy',
  Irr: 'irregular galaxy',
  dE: 'dwarf elliptical galaxy',
  dSph: 'dwarf spheroidal galaxy',
  dIrr: 'dwarf irregular galaxy',
  Pec: 'colliding pair of galaxies',
  Burst: 'starburst galaxy',
  Clumpy: 'clumpy galaxy',
};

function noun(type: string): string {
  if (Object.hasOwn(nouns, type)) {
    return nouns[type]!;
  }

  if (type.startsWith('SB')) {
    return 'barred spiral galaxy';
  }

  return type.startsWith('S') ? 'spiral galaxy' : 'elliptical galaxy';
}

/**
A lone galaxy in words (Normal richness, quiet core, no host). C# `GalaxyTypes.Describe`.
*/
export function describeGalaxy(type: string, age: StellarAge): string {
  const words = (age === 'Young' ? 'young ' : (age === 'Old' ? 'old ' : '')) + noun(type);
  return ('aeiou'.includes(words[0]!) ? 'an ' : 'a ') + words;
}

function uniqueName(rng: Pcg32, c: StarClass, used: Set<string>, index: number, style: NameStyle, warnings: GeneratorWarning[]): string {
  for (let tries = 0; tries < 100; tries++) {
    const name = systemName(rng, c, style);
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }

  // Out of reach in practice (hundreds of thousands of catalogue names); kept so generation never loops forever.
  /* c8 ignore next 4 */
  const fallback = `${systemName(rng, c, style)} ${index + 1}`;
  used.add(fallback);
  warnings.push({code: 'NameNumbered', message: `System ${index} is named ${fallback}: 100 draws found no unused name.`});
  return fallback;
}

/**
Builds a lone galaxy from its address. C# `GalaxyGenerator.Generate` with `GalaxyContext.Alone`.
*/
export function generateGalaxyAt(address: Address, options: GeneratorOptions): Galaxy {
  const seed = address.objectSeed;
  const layout = GalaxyLayout.generate(seed, options.systems, options.shape, noTuning, options);
  const n = layout.count;
  const regions: GalaxyRegion[] = layout.regions.map((r, index) => ({
    index, name: r.name, age: r.age, theme: r.theme, centre: r.centre,
  }));

  const warnings: GeneratorWarning[] = [];
  const requested = options.systems;
  if (n < requested) {
    warnings.push({code: 'SystemsTrimmed', message: `The ${shapeName(layout.shape)} shape held ${n} of the ${requested} systems asked for.`});
  }

  shapeWarnings(warnings, options.shape, requested, options.arms);
  if (options.arms !== undefined && options.shape === 'Auto' && requested >= firstSpiralCount
    && layout.shape !== 'Spiral' && layout.shape !== 'Barred') {
    warnings.push({
      code: 'ArmsIgnored',
      message: `Arms = ${options.arms} changes nothing: Auto drew a ${shapeName(layout.shape)} galaxy, which has no arms.`,
    });
  }

  const richness = 100;
  const names = new Set<string>();
  const map: MapEntry[] = [];
  const contexts: SystemContext[] = [];
  for (let i = 0; i < n; i++) {
    const own = systemSeed(seed, i);
    const {age} = (regions[layout.region[i]!]!);
    const {star} = rollStar(Seeds.stream(own, 'star'), age, options);
    const name = uniqueName(Seeds.stream(own, 'names'), star.class, names, i, options.names, warnings);
    contexts.push({
      name, age, danger: layout.danger[i]!, richness,
    });
    map.push({
      index: i,
      address: address.child('system', i).toString(),
      name,
      x: layout.x[i]!,
      y: layout.y[i]!,
      starClass: star.class,
      region: layout.region[i]!,
      hops: layout.hops[i]!,
      danger: layout.danger[i]!,
      chokepoint: layout.chokepoint[i]!,
    });
  }

  const made: Array<StarSystem | undefined> = [];
  const system = (index: number): StarSystem => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= n) {
      throw new RangeError(`This galaxy has ${n} systems, numbered 0 to ${n - 1}; you asked for ${index}.`);
    }

    made[index] ??= generateSystemAt(address.child('system', index), contexts[index]!, options);
    return made[index];
  };

  const type = deriveGalaxyType(layout.shape, layout.pitch, layout.ellipse);
  const rng = Seeds.stream(seed, 'name');
  return {
    address: address.toString(),
    name: loneNames[rng.nextInt(loneNames.length)]! + ' Galaxy',
    type,
    descriptor: describeGalaxy(type, 'Mature'),
    age: 'Mature',
    shape: layout.shape,
    arms: layout.shape === 'Spiral' || layout.shape === 'Barred' ? layout.arms : 0,
    radius: galaxyRadius,
    core: layout.core,
    map,
    lanes: layout.lanes.map(([a, b, bridge]) => ({a, b, bridge})),
    regions,
    warnings,
    contexts,
    system,
  };
}

/**
Generates a galaxy from any seed text or number. C# `Galaxy.Generate(seed, options)`.
*/
export function generateGalaxy(seed: string | number | bigint, options?: Partial<GeneratorOptions>): Galaxy {
  const o = resolveOptions(options);
  validateOptions(o);
  const text = typeof seed === 'string' ? checkSeed(seed) : seedText(seed);
  return generateGalaxyAt(new Address(1, text, 'galaxy'), o);
}
