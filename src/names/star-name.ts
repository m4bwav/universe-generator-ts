import {rootSeed} from '../core/address.ts';
import {Seeds} from '../core/seeds.ts';
import {
  checkSeed,
  resolveOptions,
  seedText,
  validateOptions,
  type GeneratorOptions,
} from '../options.ts';
import {rollStar, type StarClass} from '../stars/star-generator.ts';
import {drawStarName} from './star-names.ts';

const version = 1;

/**
A star's name and the class it fits. C# `StarName`.
*/
export type StarName = {readonly name: string; readonly class: StarClass};

/**
The most names one call makes.
*/
export const maxStarNames = 1000;

/**
`count` different catalogue-style star names from any seed (1 to {@link maxStarNames}). With `starClass`, names for that class;
without it, the class is drawn with the options' star mix. The C# `StarName.Generate(seed, count, starClass, options)`.
*/
export function generateStarNames(seed: string | number | bigint, count = 1, starClass?: StarClass, options?: Partial<GeneratorOptions>): StarName[] {
  const o = resolveOptions(options);
  validateOptions(o);
  if (!Number.isSafeInteger(count) || count < 1 || count > maxStarNames) {
    throw new RangeError(`Count must be 1 to ${maxStarNames}; you asked for ${count}.`);
  }

  const text = typeof seed === 'string' ? checkSeed(seed) : seedText(seed);
  const root = rootSeed(version, text, 'starname');
  const used = new Set<string>();
  const names: StarName[] = [];
  for (let i = 0; i < count; i++) {
    const own = Seeds.child(root, 'name', i);
    const c = starClass ?? rollStar(Seeds.stream(own, 'star'), 'Mature', o).star.class;
    const rng = Seeds.stream(own, 'names');
    let name = drawStarName(rng, c);
    for (let tries = 0; used.has(name); tries++) {
      // Out of reach in practice; kept so a call never loops forever.
      name = tries < 100 ? drawStarName(rng, c) : `${drawStarName(rng, c)} ${i + 1}`;
    }

    used.add(name);
    names.push({name, class: c});
  }

  return names;
}

/**
One star name; the first of {@link generateStarNames}.
*/
export function generateStarName(seed: string | number | bigint, starClass?: StarClass, options?: Partial<GeneratorOptions>): StarName {
  return generateStarNames(seed, 1, starClass, options)[0]!;
}
