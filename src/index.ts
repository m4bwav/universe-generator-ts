/**
Universe-generator: seeded galaxies, star systems, planets and moons; the same output as the C# UniverseGenerator for
the same seed. The generators arrive in Stage 2; the deterministic core is here.
*/
export {Pcg32} from './core/pcg32.ts';
export {Seeds} from './core/seeds.ts';
export {DMath} from './core/dmath.ts';

/**
The generator version: part of every seed's identity.
*/
export const generatorVersion = 1;
