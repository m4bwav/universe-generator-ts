/**
Regenerates any object from its address, and makes links that carry the options: a port of `Universe.At` and
`Universe.Link` (Universe.cs). The same result as generating the level the address starts from and walking down.
*/
import {Address} from '../core/address.ts';
import {
  checkSeed,
  resolveOptions,
  validateOptions,
  type GeneratorOptions,
} from '../options.ts';
import {optionsFromCode, optionsToCode} from '../options-code.ts';
import {
  hookCluster,
  hookPlanet,
  hookSystem,
  type GeneratorHooks,
} from '../hooks.ts';
import {generateGalaxyAt, aloneGalaxy, type Galaxy} from '../galaxies/galaxy.ts';
import {generateClusterAt, aloneCluster, type GalaxyCluster} from '../galaxies/galaxy-cluster.ts';
import {
  generatePlanetAt,
  generateSystemAt,
  type StarSystem,
  type Planet,
  type Moon,
  type Station,
  type Belt,
} from '../systems/star-system.ts';
import {generateUniverseAt, type Universe, type CosmicVoid} from './universe.ts';

/**
Anything an address can name.
*/
export type AddressedObject = Universe | GalaxyCluster | CosmicVoid | Galaxy | StarSystem | Planet | Moon | Station | Belt;

type Path = ReadonlyArray<readonly [string, number]>;

/**
A link to the object at `address` made with `options`: the address, then `?` and the options' code, or the address alone
for the defaults. C# `Universe.Link`. An unreadable address is a SyntaxError.
*/
export function linkTo(address: string, options: Partial<GeneratorOptions>): string {
  const o = resolveOptions(options);
  validateOptions(o);
  const parsed = Address.tryParse(address);
  if (parsed.error !== undefined) {
    throw new SyntaxError(parsed.error);
  }

  const code = optionsToCode(o);
  return code.length === 0 ? address : `${address}?${code}`;
}

/**
Item `step` of the path from `items`, checking its label and range with the C# messages.
*/
function pick<T>(count: number, get: (index: number) => T, path: Path, step: number, label: string, address: Address): T {
  const [actual, index] = path[step]!;
  if (actual !== label) {
    const expected = label === 'planet' ? 'planet, station or belt' : (label === 'cluster' ? 'cluster or void' : label);
    throw new RangeError(`Below ${address.toString()} comes a ${expected}; the address has "${actual}".`);
  }

  if (index >= count) {
    const range = count === 0 ? 'none' : `numbered 0 to ${count - 1}`;
    const plural = label === 'galaxy' ? 'galaxies' : label + 's';
    throw new RangeError(`${address.toString()} has ${count} ${plural} (${range}); the address asks for ${label} ${index}. Were the same options passed as when it was generated?`);
  }

  return get(index);
}

const fromList = <T>(items: readonly T[]) => (index: number): T => items[index]!;

function nothingBelow(path: Path, step: number): void {
  if (step >= path.length) {
    return;
  }

  const [label, index] = path[step]!;
  const what = step === 0 ? 'the level' : 'a ' + path[step - 1]![0];
  throw new RangeError(`Nothing in this package lies below ${what}; the address goes on with "${label}/${index}".`);
}

/**
The system itself, or the planet, moon, station or belt the rest of the path names.
*/
function below(system: StarSystem, path: Path, start: number, where: Address): AddressedObject {
  let step = start;
  if (step === path.length) {
    return system;
  }

  let found: AddressedObject;
  const label = path[step]![0];
  if (label === 'station') {
    found = pick(system.stations.length, fromList(system.stations), path, step++, 'station', where);
  } else if (label === 'belt') {
    found = pick(system.belts.length, fromList(system.belts), path, step++, 'belt', where);
  } else {
    const planet = pick(system.planets.length, fromList(system.planets), path, step++, 'planet', where);
    found = planet;
    if (step < path.length) {
      found = pick(planet.moons.length, fromList(planet.moons), path, step++, 'moon', where.child('planet', planet.index));
    }
  }

  nothingBelow(path, step);
  return found;
}

function inCluster(cluster: GalaxyCluster, path: Path, start: number, clusterAddress: Address): AddressedObject {
  let step = start;
  if (step === path.length) {
    return cluster;
  }

  let where = clusterAddress;

  const member = pick(cluster.map.length, i => cluster.galaxy(i), path, step, 'galaxy', where);
  where = where.child('galaxy', path[step]![1]);
  step++;
  if (step === path.length) {
    return member;
  }

  const system = pick(member.map.length, i => member.system(i), path, step, 'system', where);
  where = where.child('system', path[step]![1]);
  return below(system, path, step + 1, where);
}

/**
Regenerates the object at `address` (or a link from `linkTo`), such as `v1-my-seed/galaxy/system/31/planet/2`: a
universe, cluster, void, galaxy, system, planet, moon, station or belt. C# `Universe.At`. Pass the options the object
was generated with, or a link, which carries them; `hooks` run on every object on the way down. An unreadable address
is a SyntaxError; an address naming nothing, a link passed with options, or an option out of range is a RangeError.
*/
export function generateAt(address: string, options?: Partial<GeneratorOptions>, hooks?: GeneratorHooks): AddressedObject {
  let text = address;
  let given = options;
  const q = text.indexOf('?');
  if (q !== -1) {
    if (given !== undefined) {
      throw new RangeError('This link carries its options after the ?; pass a link or options, not both.');
    }

    given = optionsFromCode(text.slice(q + 1));
    text = text.slice(0, q);
  }

  const o = resolveOptions(given);
  validateOptions(o);
  const parsed = Address.tryParse(text);
  if (parsed.error !== undefined) {
    throw new SyntaxError(parsed.error);
  }

  const a = parsed.address;
  if (a.version !== 1) {
    throw new RangeError(`This package generates version 1; the address asks for version ${a.version}.`);
  }

  checkSeed(a.seed);
  const {path} = a;
  let step = 0;
  let where = new Address(a.version, a.seed, a.root);
  switch (a.root) {
    case 'universe': {
      const universe = generateUniverseAt(where, o, hooks);
      if (path.length === 0) {
        return universe;
      }

      if (path[0]![0] === 'void') {
        const hole = pick(universe.voids.length, fromList(universe.voids), path, step++, 'void', where);
        where = where.child('void', path[0]![1]);
        if (step === path.length) {
          return hole;
        }

        const system = pick(hole.systemCount, i => hole.system(i), path, step++, 'system', where);
        where = where.child('system', path[1]![1]);
        return below(system, path, step, where);
      }

      const cluster = pick(universe.clusters.length, fromList(universe.clusters), path, step++, 'cluster', where);
      return inCluster(cluster, path, step, where.child('cluster', path[0]![1]));
    }

    case 'cluster': {
      return inCluster(hookCluster(hooks, generateClusterAt(where, o, aloneCluster, hooks)), path, step, where);
    }

    case 'galaxy': {
      const galaxy = generateGalaxyAt(where, o, aloneGalaxy, hooks);
      if (path.length === 0) {
        return galaxy;
      }

      const system = pick(galaxy.map.length, i => galaxy.system(i), path, step++, 'system', where);
      return below(system, path, step, where.child('system', path[0]![1]));
    }

    case 'system': {
      return below(hookSystem(hooks, generateSystemAt(where, {}, o)), path, step, where);
    }

    case 'planet': {
      const lone = hookPlanet(hooks, generatePlanetAt(where, o));
      if (path.length === 0) {
        return lone;
      }

      const moon = pick(lone.moons.length, fromList(lone.moons), path, step++, 'moon', where);
      nothingBelow(path, step);
      return moon;
    }

    default: {
      throw new RangeError(`"${a.root}" is not a level this package generates; an address starts from universe, cluster, galaxy, system or planet, as in v1-my-seed/galaxy/system/3.`);
    }
  }
}
