/**
The galaxy-level repair pass for `require`. A port of `Galaxies/Constraints.cs`. Every choice draws from the galaxy's own
`constraints` stream in a fixed order (stars, then planets, then the precursor site) and reaches a system only through its
context. With no guarantee nothing here draws or changes anything.
*/
import type {Address} from '../core/address.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import {Guarantee, type GeneratorOptions} from '../options.ts';
import {
  makeStar,
  type Companion,
  type Star,
  type StarClass,
} from '../stars/star-generator.ts';
import {
  generateSystemAt,
  noGardenClasses,
  type Planet,
  type PlanetKind,
  type StarSystem,
  type SystemInput,
} from '../systems/star-system.ts';
import type {PointOfInterest} from './galaxy-extras.ts';
import type {GeneratorWarning as Warning} from './galaxy.ts';
import {systemSeed} from './galaxy-layout.ts';

type Rolled = {star: Star; companion: Companion | undefined};

const starNeeds: ReadonlyArray<readonly [number, string, StarClass]> = [
  [Guarantee.BlueStar, 'BlueStar', 'B'],
  [Guarantee.Giant, 'Giant', 'Giant'],
  [Guarantee.WhiteDwarf, 'WhiteDwarf', 'WhiteDwarf'],
  [Guarantee.NeutronStar, 'NeutronStar', 'NeutronStar'],
  [Guarantee.BlackHole, 'BlackHole', 'BlackHole'],
  [Guarantee.SunLikeStar, 'SunLikeStar', 'G'],
];

function meets(c: StarClass, need: number): boolean {
  switch (need) {
    case Guarantee.BlueStar: {
      return c === 'O' || c === 'B';
    }

    case Guarantee.Giant: {
      return c === 'Giant' || c === 'Supergiant';
    }

    case Guarantee.WhiteDwarf: {
      return c === 'WhiteDwarf';
    }

    case Guarantee.NeutronStar: {
      return c === 'NeutronStar';
    }

    case Guarantee.BlackHole: {
      return c === 'BlackHole';
    }

    default: {
      return c === 'G';
    }
  }
}

const wanted = (c: StarClass, require: number): boolean => starNeeds.some(([need]) => (require & need) !== 0 && meets(c, need));

const unmet = (warnings: Warning[], need: string, why: string): void => {
  warnings.push({code: 'GuaranteeUnmet', message: `Require ${need} is not met: ${why}.`});
};

/**
The galaxy's constraints stream. C# `Constraints.Stream`.
*/
export const constraintsStream = (galaxySeed: bigint): Pcg32 => Seeds.stream(galaxySeed, 'constraints');

/**
Gives a missing star class to a system the stream picks (not the core while there are others), as a lone star made from
that system's own `constraint-star` stream. Returns which systems were changed. C# `Constraints.Stars`.
*/
export function constrainStars(rng: Pcg32, require: number, galaxySeed: bigint, core: number, stars: Rolled[], warnings: Warning[]): boolean[] {
  const n = stars.length;
  const forced: boolean[] = Array.from({length: n}, () => false);
  for (const [need, needName, make] of starNeeds) {
    if ((require & need) === 0 || stars.some(s => meets(s.star.class, need))) {
      continue;
    }

    const candidates: number[] = [];
    for (let i = 0; i < n; i++) {
      // Never the core while there are others, nor a star some guarantee already counts on.
      if (forced[i] === false && (i !== core || n === 1) && !wanted(stars[i]!.star.class, require)) {
        candidates.push(i);
      }
    }

    if (candidates.length === 0) {
      unmet(warnings, needName, 'every other system already holds a guaranteed star');
      continue;
    }

    const pick = candidates[rng.nextInt(candidates.length)]!;
    stars[pick] = {star: makeStar(make, Seeds.stream(systemSeed(galaxySeed, pick), 'constraint-star')), companion: undefined};
    forced[pick] = true;
  }

  return forced;
}

const fitKinds: ReadonlySet<PlanetKind> = new Set<PlanetKind>(['Rocky', 'Desert', 'Barren']);

// A temperate terrestrial world big enough to keep an atmosphere and seas.
const fits = (p: Planet): boolean =>
  p.zone === 'Temperate' && p.mass >= 0.2 && p.kind !== 'Garden' && p.kind !== 'Ocean'
  && fitKinds.has(p.kind);

function repair(
  rng: Pcg32,
  kind: PlanetKind,
  needName: string,
  galaxy: Address,
  contexts: SystemInput[],
  options: GeneratorOptions,
  made: Array<StarSystem | undefined>,
  changed: boolean[],
  warnings: Warning[],
): void {
  const systems: number[] = [];
  const planets: number[] = [];
  for (let i = 0; i < made.length; i++) {
    if (changed[i] === true) {
      continue;
    }

    const system = made[i] ?? generateSystemAt(galaxy.child('system', i), contexts[i]!, options);
    made[i] = system;
    if (kind === 'Garden' && noGardenClasses.has(system.star.class)) {
      continue;
    }

    const p = system.planets.find(planet => fits(planet));
    if (p === undefined) {
      continue;
    }

    systems.push(i);
    planets.push(p.index);
  }

  if (systems.length === 0) {
    unmet(warnings, needName, 'no system has a temperate rocky planet to hold it');
    return;
  }

  const k = rng.nextInt(systems.length);
  const at = systems[k]!;
  contexts[at] = {...contexts[at], forcedPlanet: planets[k], forcedKind: kind};
  changed[at] = true;
}

/**
Generates systems in order until each required planet kind is found; when one is missing, the stream picks a system
with a temperate planet that could be that kind and its context turns that planet into it. Returns the systems
generated here and left unchanged. C# `Constraints.Planets`.
*/
export function constrainPlanets(
  rng: Pcg32,
  require: number,
  galaxy: Address,
  contexts: SystemInput[],
  options: GeneratorOptions,
  warnings: Warning[],
): Array<StarSystem | undefined> {
  const n = contexts.length;
  const made: Array<StarSystem | undefined> = Array.from({length: n}, () => undefined);
  const needGarden = (require & Guarantee.GardenWorld) !== 0;
  const needOcean = (require & Guarantee.OceanWorld) !== 0;
  if (!needGarden && !needOcean) {
    return made;
  }

  let foundGarden = false;
  let foundOcean = false;
  const missing = (): boolean => (needGarden && !foundGarden) || (needOcean && !foundOcean);
  for (let i = 0; i < n && missing(); i++) {
    const system = generateSystemAt(galaxy.child('system', i), contexts[i]!, options);
    made[i] = system;
    for (const p of system.planets) {
      foundGarden ||= p.kind === 'Garden';
      foundOcean ||= p.kind === 'Ocean';
    }
  }

  const changed: boolean[] = Array.from({length: n}, () => false);
  if (needGarden && !foundGarden) {
    repair(rng, 'Garden', 'GardenWorld', galaxy, contexts, options, made, changed, warnings);
  }

  if (needOcean && !foundOcean) {
    repair(rng, 'Ocean', 'OceanWorld', galaxy, contexts, options, made, changed, warnings);
  }

  for (let i = 0; i < n; i++) {
    if (changed[i] === true) {
      made[i] = undefined;
    }
  }

  return made;
}

/**
Adds a lone precursor site in a system the stream picks among those with no point of interest. C# `Constraints.Precursor`.
*/
export function constrainPrecursor(
  rng: Pcg32,
  require: number,
  points: readonly PointOfInterest[],
  map: ReadonlyArray<{readonly name: string}>,
  warnings: Warning[],
): readonly PointOfInterest[] {
  if ((require & Guarantee.PrecursorSite) === 0 || points.some(p => p.kind === 'PrecursorSite')) {
    return points;
  }

  const taken = new Set(points.map(p => p.system));
  const free: number[] = [];
  for (let i = 0; i < map.length; i++) {
    if (!taken.has(i)) {
      free.push(i);
    }
  }

  if (free.length === 0) {
    unmet(warnings, 'PrecursorSite', 'every system already holds a point of interest');
    return points;
  }

  const at = free[rng.nextInt(free.length)]!;
  return [...points, {
    kind: 'PrecursorSite',
    system: at,
    name: `the precursor vault at ${map[at]!.name}`,
    text: 'a lone precursor site, its trail long erased; whatever it guards is here',
    chainStep: 1,
    chainLength: 1,
  }];
}
