/**
Hooks a game runs on every object as it is made, and the custom fields they set. A port of `Options/GeneratorHooks.cs`
and `Core/CustomFields.cs`. Each hook takes the object and returns it or a changed copy (`{...planet, custom: {...}}`).
*/
import type {GalaxyCluster} from './galaxies/galaxy-cluster.ts';
import type {Galaxy} from './galaxies/galaxy.ts';
import type {Planet, StarSystem} from './systems/star-system.ts';
import type {Universe} from './universe/universe.ts';

/**
Your own fields, by name, set by a hook or your code. C# `Custom` (an `IReadOnlyDictionary<string, string>`).
*/
export type CustomFields = Readonly<Record<string, string>>;

/**
The hooks; each is optional. C# `GeneratorHooks`.
*/
export type GeneratorHooks = {
  readonly onPlanet?: (planet: Planet) => Planet;
  readonly onSystem?: (system: StarSystem) => StarSystem;
  readonly onGalaxy?: (galaxy: Galaxy) => Galaxy;
  readonly onCluster?: (cluster: GalaxyCluster) => GalaxyCluster;
  readonly onUniverse?: (universe: Universe) => Universe;
};

// A hook written in JavaScript may return null as well as undefined.
function notNull<T>(value: T | undefined, hook: string): T {
  if (value === undefined || value === null) {
    throw new TypeError(`The ${hook} hook returned null; return the object it was given, or a changed copy.`);
  }

  return value;
}

/**
C# `Hook.Planet`.
*/
export function hookPlanet(hooks: GeneratorHooks | undefined, planet: Planet): Planet {
  return hooks?.onPlanet === undefined ? planet : notNull(hooks.onPlanet(planet), 'OnPlanet');
}

/**
C# `Hook.System`: the planet hook on each planet first, then the system hook.
*/
export function hookSystem(hooks: GeneratorHooks | undefined, system: StarSystem): StarSystem {
  if (hooks === undefined) {
    return system;
  }

  const hooked = hooks.onPlanet !== undefined && system.planets.length > 0
    ? {...system, planets: system.planets.map(p => hookPlanet(hooks, p))}
    : system;

  return hooks.onSystem === undefined ? hooked : notNull(hooks.onSystem(hooked), 'OnSystem');
}

/**
C# `Hook.Galaxy`.
*/
export function hookGalaxy(hooks: GeneratorHooks | undefined, galaxy: Galaxy): Galaxy {
  return hooks?.onGalaxy === undefined ? galaxy : notNull(hooks.onGalaxy(galaxy), 'OnGalaxy');
}

/**
C# `Hook.Cluster`.
*/
export function hookCluster(hooks: GeneratorHooks | undefined, cluster: GalaxyCluster): GalaxyCluster {
  return hooks?.onCluster === undefined ? cluster : notNull(hooks.onCluster(cluster), 'OnCluster');
}

/**
C# `Hook.Universe`.
*/
export function hookUniverse(hooks: GeneratorHooks | undefined, universe: Universe): Universe {
  return hooks?.onUniverse === undefined ? universe : notNull(hooks.onUniverse(universe), 'OnUniverse');
}

/**
A copy of `fields` with `name` set to `value`. C# `CustomFields.With`.
*/
export function withCustom(fields: CustomFields | undefined, name: string, value: string): CustomFields {
  return Object.freeze({...fields, [name]: value});
}
