/*
Compile-time checks on the published declaration files. The runner copies this file into each TypeScript fixture as
index.ts, so it is checked under that fixture's module and resolution settings (ESM and CommonJS under nodenext, bundler,
node10).
*/
import {
  generateGalaxy, generateSystem, generateAt, toJson, Address, Preset,
  type Galaxy, type StarSystem, type GeneratorOptions, type AddressedObject,
} from 'universe-generator';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

export type Checks = [
  Expect<Equal<ReturnType<typeof generateGalaxy>, Galaxy>>,
  Expect<Equal<ReturnType<typeof generateAt>, AddressedObject>>,
];

const options: Partial<GeneratorOptions> = {systems: 30};
const galaxy: Galaxy = generateGalaxy('seed', options);
const fromPreset: Galaxy = generateGalaxy(42, Preset.plausible);
const system: StarSystem = galaxy.system(0);
const json: string = toJson('galaxy', galaxy);
const parsed = Address.tryParse('v1-seed/galaxy');

// @ts-expect-error -- the seed is a string, number or bigint
generateGalaxy({seed: 1});

export {fromPreset, system, json, parsed, generateSystem};
