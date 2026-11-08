/**
A galaxy: a map of star systems joined by lanes, grouped into named regions, with danger growing away from the core. A
port of `Galaxies/Galaxy.cs` (GalaxyGenerator), `Core/Diagnostics.cs` and `GalaxyTypes`. A cluster hands each of its
galaxies a `GalaxyContext`; a lone galaxy gets `aloneGalaxy`. Hooks are not ported yet; the extras are in `galaxy-extras.ts`.
*/
import {Address} from '../core/address.ts';
import {
  hookGalaxy,
  hookSystem,
  type CustomFields,
  type GeneratorHooks,
} from '../hooks.ts';
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
import {generateSystemAt, type StarSystem, type SystemInput} from '../systems/star-system.ts';
import type {LinkTier} from '../core/distances.ts';
import {
  constrainPlanets,
  constrainPrecursor,
  constrainStars,
  constraintsStream,
} from './constraints.ts';
import {
  firstSpiralCount,
  galaxyRadius,
  GalaxyLayout,
  noTuning,
  systemSeed,
  type LayoutTuning,
} from './galaxy-layout.ts';
import type {
  CoreActivity,
  GalaxyGate,
  GalaxyRichness,
  SkyLandmark,
} from './galaxy-cluster.ts';
import {
  frontierTheme,
  generateGalaxyExtras,
  type Beacon,
  type Faction,
  type GalaxyHazard,
  type Monument,
  type PointOfInterest,
} from './galaxy-extras.ts';

/**
One end of a cluster link as a galaxy's context holds it: the other galaxy, its name, the tier, the direction to it on the
map the link crosses, and for a filament the other galaxy's cluster in the universe (-1 inside a cluster).
*/
export type GalaxyLinkEnd = {
  readonly other: number;
  readonly name: string;
  readonly tier: LinkTier;
  readonly dx: number;
  readonly dy: number;
  readonly cluster: number;
};

/**
What a cluster decides for one of its galaxies; `aloneGalaxy` leaves a lone galaxy as it was. C# `GalaxyContext`.
*/
export type GalaxyContext = {
  readonly name?: string;
  readonly type?: string;
  readonly shape?: GalaxyShape;
  readonly systems?: number;
  readonly age: StellarAge;
  readonly richness: GalaxyRichness;
  readonly coreActivity: CoreActivity;
  readonly host?: string;
  readonly tuning: LayoutTuning;
  readonly links: readonly GalaxyLinkEnd[];
  readonly frontier: boolean;
  readonly landmark?: SkyLandmark;
};

/**
C# `GalaxyContext.Alone`.
*/
export const aloneGalaxy: GalaxyContext = Object.freeze({
  age: 'Mature', richness: 'Normal', coreActivity: 'Quiet', tuning: noTuning, links: [], frontier: false,
});

/**
The radius around a merging galaxy's tidal link that becomes a lawless frontier. C# `GalaxyGenerator.FrontierRadius`.
*/
const frontierRadius = 300;

/**
The kinds of soft problem the generator reports instead of throwing. C# `WarningCode`.
*/
export type WarningCode = 'SystemsTrimmed' | 'ArmsIgnored' | 'ShapeTooSmall' | 'NameNumbered' | 'GuaranteeUnmet';

/**
A soft problem: generation went on, and this says what was changed or ignored. C# `GeneratorWarning`.
*/
export type GeneratorWarning = {readonly code: WarningCode; readonly message: string};

/**
A system as the galaxy map shows it, without its planets. C# `MapEntry`.
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
  /**
  The index of the faction holding it, or undefined when it is independent.
  */
  readonly faction: number | undefined;
  /**
  Whether a lane joins it to a system held by another faction.
  */
  readonly contested: boolean;
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
export type SystemContext = SystemInput & {readonly name: string; readonly age: StellarAge; readonly danger: number; readonly richness: number};

/**
A generated galaxy. C# `Galaxy`.
*/
export type Galaxy = {
  /**
  Your own fields, set by a hook or your code; undefined from the generator. C# `Custom`.
  */
  readonly custom?: CustomFields;
  readonly address: string;
  readonly name: string;
  readonly type: string;
  readonly descriptor: string;
  readonly age: StellarAge;
  readonly richness: GalaxyRichness;
  readonly coreActivity: CoreActivity;
  /**
  The radius around the core where an active core's radiation adds danger, in game units; 0 for a quiet core.
  */
  readonly coreHazardRadius: number;
  /**
  The links to other galaxies, where each opens; empty for a lone galaxy.
  */
  readonly gates: readonly GalaxyGate[];
  /**
  Where the universe's sky landmark appears from this galaxy; undefined alone.
  */
  readonly landmark: SkyLandmark | undefined;
  readonly shape: GalaxyShape;
  readonly arms: number;
  readonly radius: number;
  readonly core: number;
  readonly map: readonly MapEntry[];
  readonly lanes: readonly Lane[];
  readonly regions: readonly GalaxyRegion[];
  readonly factions: readonly Faction[];
  readonly pointsOfInterest: readonly PointOfInterest[];
  readonly hazards: readonly GalaxyHazard[];
  readonly monuments: readonly Monument[];
  readonly beacons: readonly Beacon[];
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

/**
The name roots of clusters and galaxies. C# `ClusterGenerator.Roots`.
*/
export const nameRoots: readonly string[] = [
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

/**
A lone galaxy's name, from its own `name` stream. C# `ClusterGenerator.LoneName`.
*/
const loneName = (rng: Pcg32): string => nameRoots[rng.nextInt(nameRoots.length)]! + ' Galaxy';

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
A galaxy in words: "an old giant elliptical galaxy, rich in metals, with a quasar at its core". C# `GalaxyTypes.Describe`.
*/
export function describeGalaxy(type: string, age: StellarAge, richness: GalaxyRichness = 'Normal', core: CoreActivity = 'Quiet', host?: string): string {
  const words = (age === 'Young' ? 'young ' : (age === 'Old' ? 'old ' : '')) + noun(type);
  let text = ('aeiou'.includes(words[0]!) ? 'an ' : 'a ') + words;
  if (richness !== 'Normal') {
    text += richness === 'Rich' ? ', rich in metals' : ', poor in metals';
  }

  if (core !== 'Quiet') {
    text += (richness === 'Normal' ? '' : ',') + (core === 'Quasar' ? ' with a quasar at its core' : ' with a bright active core');
  }

  if (host !== undefined) {
    text += ', a satellite of ' + host;
  }

  return text;
}

/**
The hazard radius of a core, in a galaxy's game units. C# `ClusterGenerator.HazardRadius`.
*/
export function hazardRadius(core: CoreActivity): number {
  return core === 'Quasar' ? 300 : (core === 'Seyfert' ? 150 : 0);
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
Builds a galaxy from its address and what its cluster decided. C# `GalaxyGenerator.Generate`.
*/
export function generateGalaxyAt(address: Address, options: GeneratorOptions, context: GalaxyContext = aloneGalaxy, hooks?: GeneratorHooks): Galaxy {
  const seed = address.objectSeed;
  const requestedShape = context.shape ?? options.shape;
  const requested = context.systems ?? options.systems;
  const layout = GalaxyLayout.generate(seed, requested, requestedShape, context.tuning, options);
  const n = layout.count;
  const regions: GalaxyRegion[] = layout.regions.map((r, index) => ({
    index, name: r.name, age: r.age, theme: r.theme, centre: r.centre,
  }));

  // Cluster links open at the core (gates) or at the system farthest out towards the other galaxy.
  const gates: GalaxyGate[] = [];
  let frontier = -1;
  for (const {
    other, name, tier, dx, dy, cluster,
  } of context.links) {
    let system = layout.core;
    if (tier !== 'Gate') {
      let farthest = -Number.MAX_VALUE;
      for (let i = 0; i < n; i++) {
        const reach = layout.x[i]! * dx + layout.y[i]! * dy;
        if (!(reach > farthest)) {
          continue;
        }

        farthest = reach;
        system = i;
      }
    }

    gates.push({
      galaxy: other, name, tier, system, cluster,
    });
    if (tier === 'Tidal' && context.frontier) {
      frontier = system;
    }
  }

  // A merging pair's tidal frontier: 2 more danger within 300 units of the tidal link, and its region themed for it.
  let {danger} = layout;
  if (frontier >= 0) {
    const raised = [...layout.danger];
    for (let i = 0; i < n; i++) {
      const fx = layout.x[i]! - layout.x[frontier]!;
      const fy = layout.y[i]! - layout.y[frontier]!;
      if (fx * fx + fy * fy <= frontierRadius * frontierRadius) {
        raised[i] = Math.min(10, raised[i]! + 2);
      }
    }

    danger = raised;
    const r = layout.region[frontier]!;
    regions[r] = {...regions[r]!, theme: frontierTheme};
  }

  const warnings: GeneratorWarning[] = n < requested
    ? [{code: 'SystemsTrimmed', message: `The ${shapeName(layout.shape)} shape held ${n} of the ${requested} systems asked for.`}]
    : [];

  shapeWarnings(warnings, requestedShape, requested, options.arms);
  if (options.arms !== undefined && requestedShape === 'Auto' && requested >= firstSpiralCount
    && layout.shape !== 'Spiral' && layout.shape !== 'Barred') {
    warnings.push({
      code: 'ArmsIgnored',
      message: `Arms = ${options.arms} changes nothing: Auto drew a ${shapeName(layout.shape)} galaxy, which has no arms.`,
    });
  }

  const richness = context.richness === 'Rich' ? 160 : (context.richness === 'Poor' ? 50 : 100);
  const names = new Set<string>();
  const draft: Array<Omit<MapEntry, 'faction' | 'contested'>> = [];
  const contexts: SystemContext[] = [];
  const stars = Array.from({length: n}, (_, i) => rollStar(Seeds.stream(systemSeed(seed, i), 'star'), regions[layout.region[i]!]!.age, options));
  // Guarantees draw only from the galaxy's constraints stream and with none set draw nothing.
  const constraints = constraintsStream(seed);
  const forcedStar = constrainStars(constraints, options.require, seed, layout.core, stars, warnings);
  for (let i = 0; i < n; i++) {
    const own = systemSeed(seed, i);
    const {age} = (regions[layout.region[i]!]!);
    const {star} = stars[i]!;
    const name = uniqueName(Seeds.stream(own, 'names'), star.class, names, i, options.names, warnings);
    contexts.push(forcedStar[i] === true
      ? {
        name, age, danger: danger[i]!, richness, star,
      }
      : {
        name, age, danger: danger[i]!, richness,
      });
    draft.push({
      index: i,
      address: address.child('system', i).toString(),
      name,
      x: layout.x[i]!,
      y: layout.y[i]!,
      starClass: star.class,
      region: layout.region[i]!,
      hops: layout.hops[i]!,
      danger: danger[i]!,
      chokepoint: layout.chokepoint[i]!,
    });
  }

  const made = constrainPlanets(constraints, options.require, address, contexts, options, warnings);
  const extras = generateGalaxyExtras(seed, layout.lanes, layout.core, regions, draft, context.coreActivity, hazardRadius(context.coreActivity));
  const pointsOfInterest = constrainPrecursor(constraints, options.require, extras.points, draft, warnings);
  const map: MapEntry[] = draft.map((m, i) => ({...m, ...extras.holders[i]!}));
  const hooked: Array<StarSystem | undefined> = Array.from({length: n});
  const system = (index: number): StarSystem => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= n) {
      throw new RangeError(`This galaxy has ${n} systems, numbered 0 to ${n - 1}; you asked for ${index}.`);
    }

    // The guarantees' systems are kept raw, so the hooks run once, on first read, as for every other system.
    hooked[index] ??= hookSystem(hooks, made[index] ?? generateSystemAt(address.child('system', index), contexts[index]!, options));
    return hooked[index];
  };

  const type = context.type ?? deriveGalaxyType(layout.shape, layout.pitch, layout.ellipse);
  return hookGalaxy(hooks, {
    address: address.toString(),
    name: context.name ?? loneName(Seeds.stream(seed, 'name')),
    type,
    descriptor: describeGalaxy(type, context.age, context.richness, context.coreActivity, context.host),
    age: context.age,
    richness: context.richness,
    coreActivity: context.coreActivity,
    coreHazardRadius: hazardRadius(context.coreActivity),
    gates,
    landmark: context.landmark,
    shape: layout.shape,
    arms: layout.shape === 'Spiral' || layout.shape === 'Barred' ? layout.arms : 0,
    radius: galaxyRadius,
    core: layout.core,
    map,
    lanes: layout.lanes.map(([a, b, bridge]) => ({a, b, bridge})),
    regions,
    factions: extras.factions,
    pointsOfInterest,
    hazards: extras.hazards,
    monuments: extras.monuments,
    beacons: extras.beacons,
    warnings,
    contexts,
    system,
  });
}

/**
Generates a galaxy from any seed text or number. C# `Galaxy.Generate(seed, options)`.
*/
export function generateGalaxy(seed: string | number | bigint, options?: Partial<GeneratorOptions>, hooks?: GeneratorHooks): Galaxy {
  const o = resolveOptions(options);
  validateOptions(o);
  const text = typeof seed === 'string' ? checkSeed(seed) : seedText(seed);
  return generateGalaxyAt(new Address(1, text, 'galaxy'), o, aloneGalaxy, hooks);
}
