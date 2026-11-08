# universe-generator

![A spiral galaxy seen from above, blue and gold arms, with a few star systems joined by thin cyan lines like a star map](https://raw.githubusercontent.com/m4bwav/universe-generator-ts/master/.github/images/banner.jpg)

[![CI](https://github.com/m4bwav/universe-generator-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/m4bwav/universe-generator-ts/actions/workflows/ci.yml)

Seeded universes, galaxy clusters, galaxies, star systems, planets and moons for games and fiction, in TypeScript. The same seed gives the same universe here as in the C# and Unity [UniverseGenerator](https://github.com/m4bwav/UniverseGenerator), bit for bit: every one of that project's 18 golden files passes on both builds of this package.

Zero dependencies. ES module and CommonJS builds with types, Node 20 or later, Bun, Deno and browsers.

**Status: the port is complete; not on npm or JSR yet.**

## Install

```sh
npm install universe-generator
```

Deno and JSR: `deno add jsr:@m4bwav/universe-generator`.

## First example

```ts
import {generateGalaxy} from 'universe-generator';

const galaxy = generateGalaxy('my-seed');
for (let i = 0; i < 3; i++) {
  const system = galaxy.system(i);
  console.log(`${system.name}: ${system.star.class} star, ${system.planets.length} planets, danger ${system.danger}`);
}
```

```text
HD 147927: K star, 6 planets, danger 9
HD 165595: M star, 1 planets, danger 6
HD 28101: K star, 6 planets, danger 6
```

These are the lines the C# README prints for the same seed. Any text up to 200 characters, a number or a bigint is a seed. Sixty systems is the default.

## Presets, options and addresses

```ts
import {generateGalaxy, generateAt, Preset} from 'universe-generator';

const options = {...Preset.spaceOpera, systems: 120, shape: 'Barred'} as const;
const galaxy = generateGalaxy('my-seed', options);
const planet = galaxy.system(31).planets[1];  // generated on request; same result as full generation
console.log(planet.descriptor);                // a ringed ice giant far from a red dwarf
console.log(planet.address.toString());        // v1-my-seed/galaxy/system/31/planet/1
const same = generateAt(planet.address.toString(), options);  // any object regenerates alone from its address
console.log(same.summary === planet.summary);  // true
```

The presets are `default`, `spaceOpera`, `plausible`, `pocket`, `roguelike`, `cozy` and `epic`. The options are the C# ones in camelCase: `systems` (1 to 2000), `shape`, `arms`, `extraLanes`, `dangerShift`, `names`, `starMix`, `weirdness`, `maxPlanetsPerSystem`, `clusterKind`, `epoch` and `require` (a `Guarantee` bit set). Bad options throw a `RangeError` that says what to change, before anything is generated. `checkOptions(options)` lists settings that are valid but read badly, and `galaxy.warnings` says what generation had to change.

`optionsToCode(options)` writes options as a short query string (`systems=120&shape=barred&weirdness=10`) and `optionsFromCode` reads it back, so a seed and its options fit in a link. `linkTo(address, options)` builds that link and `generateAt` reads it.

## What it makes

| Call | Returns |
| --- | --- |
| `generateUniverse(seed, options?, hooks?)` | a cosmic web of nodes, filaments, voids and landmarks; `universe.cluster(i)` |
| `generateCluster(seed, options?, hooks?)` | a galaxy cluster with gates and wormholes; `cluster.galaxy(i)` |
| `generateGalaxy(seed, options?, hooks?)` | the map, lanes, regions, factions, points of interest, hazards, monuments, beacons; `galaxy.system(i)` |
| `generateSystem(seed, options?, hooks?)` | a star system: star and companions, planets, moons, belts, stations, landmarks |
| `generatePlanet(seed, options?, hooks?)` | one planet with its physics, air, climate, life, resources, hazards and story |
| `generateStarName(seed)`, `generateStarNames(seed, count)` | catalogue-style star names |
| `generateAt(address, options?, hooks?)` | whatever an address names, from a universe down to a moon |
| `toJson(type, value, {indented, children})` | the same JSON as the C# `ToJson()` |

Lists that can be large are opened on request (`galaxy.system(i)`, `cluster.galaxy(i)`, `universe.cluster(i)`), so a 2,000-system galaxy costs little until you look.

`Units` converts lengths, masses, times and temperatures; `Distances` and `Units.map` give map distances per level. `GeneratorTables` loads editable weight tables from JSON. Hooks (`{onPlanet, onSystem, onGalaxy, onCluster, onUniverse}`) can change each object as it is made, and `withCustom` adds your own fields that `toJson` exports.

## From C# to TypeScript

| C# | TypeScript |
| --- | --- |
| `Galaxy.Generate(seed, options)` | `generateGalaxy(seed, options)` |
| `Preset.SpaceOpera with { Systems = 120 }` | `{...Preset.spaceOpera, systems: 120}` |
| `galaxy.Systems[i]`, `galaxy.System(i)` | `galaxy.system(i)` |
| `Universe.At(address, options)` | `generateAt(address, options)` |
| `Universe.Link(address, options)` | `linkTo(address, options)` |
| `Address.TryParse(text, out a, out error)` | `Address.tryParse(text)` returns `{address}` or `{error}` |
| `options.ToCode()`, `GeneratorOptions.FromCode(code)`, `options.Check()` | `optionsToCode`, `optionsFromCode`, `checkOptions` |
| `obj.ToJson()` | `toJson('galaxy', obj)` |
| `ArgumentException` | `RangeError` (or `SyntaxError` for unreadable text) with the same message |
| enums | string unions with the C# member names (`'Barred'`, `'K'`) |

## The seed promise

A seed, its options and the generator version give the same universe in C#, Unity and TypeScript, on every platform. The randomness is PCG32 with SplitMix64 and FNV-1a seeding, and the maths that feeds generation uses no platform floating-point functions. CI runs every C# golden file against both builds on Node 20 to 26, Windows and macOS, and the consumer fixtures under Bun and Deno. A change that would alter output for an existing seed gets a new generator version, so old addresses keep meaning what they meant.

## License

MIT
