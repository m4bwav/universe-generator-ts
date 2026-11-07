/**
Universe-generator: seeded galaxies, star systems, planets and moons; the same output as the C# UniverseGenerator for
the same seed. Stage 2 is porting the generators one golden file at a time.
*/
export {Pcg32} from './core/pcg32.ts';
export {Seeds} from './core/seeds.ts';
export {DMath} from './core/dmath.ts';
export {
  Preset, Guarantee, validateOptions, resolveOptions, maxSeedLength, maxSystems,
  type GeneratorOptions, type StarMix, type Epoch, type GalaxyShape, type ClusterKind, type NameStyle,
} from './options.ts';
export {
  GeneratorTables, tableIds, tablesSchema, maxTablesIdLength, type WeightEntry, type WeightTable,
} from './tables.ts';
export {
  starClasses, type Star, type StarClass, type StellarAge, type Companion, type CompanionOrbit,
} from './stars/star-generator.ts';
export {
  generateStarName, generateStarNames, maxStarNames, type StarName,
} from './names/star-name.ts';
export {JsonWriter} from './core/json-writer.ts';
export {Address, rootSeed} from './core/address.ts';
export {drawInventedName} from './names/invented-names.ts';
export {
  generateGalaxy, type Galaxy, type MapEntry, type Lane, type GalaxyRegion, type GeneratorWarning, type WarningCode, type SystemContext,
} from './galaxies/galaxy.ts';
export {
  generateSystem, generatePlanet, type StarSystem, type Planet, type Moon, type Belt, type Station, type Landmark, type PlanetKind, type MoonKind,
  type BeltKind, type OrbitZone, type LandmarkKind, type StationKind,
} from './systems/star-system.ts';

/**
The generator version: part of every seed's identity.
*/
export const generatorVersion = 1;
