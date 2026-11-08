/**
The planet level's records and enums. A port of `Planets/PlanetRecords.cs`; C# enums are string unions with the C#
names (the JSON writes those names), and the orders below are the C# enum orders where code compares or indexes them.
*/
export type Composition = 'Metal' | 'Rock' | 'IceAndRock' | 'Water' | 'GasEnvelope' | 'HydrogenHelium' | 'Ices';
export type AtmosphereClass = 'None' | 'Trace' | 'Thin' | 'Standard' | 'Dense' | 'Crushing' | 'Envelope';
export type Gas = 'Hydrogen' | 'Helium' | 'Methane' | 'WaterVapour' | 'Nitrogen' | 'Oxygen' | 'CarbonDioxide' | 'SulphurDioxide' | 'RockVapour';
export type Spin = 'Free' | 'Resonant' | 'Locked';
export type Biome = 'Ocean' | 'IceSheet' | 'Tundra' | 'Taiga' | 'TemperateForest' | 'Grassland' | 'Savanna' | 'Rainforest' | 'Desert' | 'Barren' | 'Volcanic';
export type LifeLevel = 'None' | 'Prebiotic' | 'Microbial' | 'Simple' | 'Complex';
export type Habitability = 'Hostile' | 'Marginal' | 'Habitable' | 'Ideal';

/**
The C# `Biome` order: climate totals are indexed by it and biome lists sort by it on a tie.
*/
export const biomes: readonly Biome[] = ['Ocean', 'IceSheet', 'Tundra', 'Taiga', 'TemperateForest', 'Grassland', 'Savanna', 'Rainforest', 'Desert', 'Barren', 'Volcanic'];

/**
The C# `LifeLevel` order, for comparisons such as "at least simple life".
*/
export const lifeLevels: readonly LifeLevel[] = ['None', 'Prebiotic', 'Microbial', 'Simple', 'Complex'];

export type Atmosphere = {
  readonly class: AtmosphereClass;
  // Undefined for an envelope (a giant has no surface); the JSON writes null.
  readonly pressure: number | undefined;
  readonly gases: readonly Gas[];
  readonly lightestGasKept: number;
  readonly breathable: boolean;
  readonly why: string;
};

export type ClimateBand = {
  readonly from: number; readonly to: number; readonly share: number; readonly temperature: number; readonly biome: Biome;
};

export type BiomeShare = {readonly biome: Biome; readonly share: number};

export type ResourceGrades = {
  readonly metals: number; readonly rareElements: number; readonly ices: number; readonly gases: number; readonly organics: number;
};

/**
What a species can live with. C# `Species`; `humanSpecies` is the default record.
*/
export type Species = {
  readonly name: string;
  readonly minTemperature: number;
  readonly maxTemperature: number;
  readonly minGravity: number;
  readonly maxGravity: number;
  readonly minPressure: number;
  readonly maxPressure: number;
  readonly breathesOxygen: boolean;
};

/**
The default species. C# `Species.Human`.
*/
export const humanSpecies: Species = Object.freeze({
  name: 'human', minTemperature: 263, maxTemperature: 313, minGravity: 0.4, maxGravity: 1.6, minPressure: 0.5, maxPressure: 3, breathesOxygen: true,
});
