import type {Pcg32} from '../core/pcg32.ts';
import type {StarClass} from '../stars/star-generator.ts';
import * as tables from './star-tables.ts';

const henryDraperCount = 225_300;

// Split on first use, so a bundler that never calls a name function never pays for the split.
let properList: string[] | undefined;
let designationList: string[] | undefined;
let gapList: number[] | undefined;

const proper = (): string[] => {
  properList ??= tables.proper.split('|');
  return properList;
};

const designations = (): string[] => {
  designationList ??= tables.designations.split('|');
  return designationList;
};

const gaps = (): number[] => {
  gapList ??= tables.hipparcosGaps.split(',').map(Number);
  return gapList;
};

const number = (n: number, digits = 0): string => String(n).padStart(digits, '0');

/**
The k-th (from 0) number the Hipparcos catalogue uses, skipping its gaps.
*/
export function hipparcosNumber(k: number): number {
  let n = k + 1;
  for (const gap of gaps()) {
    if (gap > n) {
      break;
    }

    n++;
  }

  return n;
}

const hipparcosCount = (): number => tables.hipparcosHighest - gaps().length;

function catalogue(rng: Pcg32): string {
  const index = rng.nextInt(henryDraperCount + hipparcosCount());
  return index < henryDraperCount ? 'HD ' + number(index + 1) : 'HIP ' + number(hipparcosNumber(index - henryDraperCount));
}

function coordinates(rng: Pcg32, declinationMinuteDigits: number): string {
  const ra = number(rng.nextInt(24), 2) + number(rng.nextInt(60), 2);
  const sign = rng.chance(1, 2) ? '+' : '-';
  const dec = number(rng.nextInt(90), 2) + (declinationMinuteDigits === 2 ? number(rng.nextInt(60), 2) : number(rng.nextInt(10)));
  return ra + sign + dec;
}

const hipparcos = (k: number): string => 'HIP ' + number(hipparcosNumber(k));

const surveys: Array<[number, (rng: Pcg32) => string]> = [
  [25, rng => 'HD ' + number(rng.range(1, henryDraperCount))],
  [40, rng => hipparcos(rng.nextInt(hipparcosCount()))],
  [55, rng => 'GJ ' + number(rng.range(1, 915))],
  [68, rng => 'Kepler-' + number(rng.range(1, 2000))],
  [80, rng => 'TOI-' + number(rng.range(100, 7500))],
  [88, rng => 'Wolf ' + number(rng.range(1, 1566))],
  [94, rng => 'Ross ' + number(rng.range(1, 1100))],
  [100, rng => 'LHS ' + number(rng.range(1, 4500))],
];

const brightClasses = new Set<StarClass>(['O', 'B', 'A', 'Giant', 'Supergiant']);

/**
A catalogue-style name for a star of class c. C# `StarNames.Draw`.
*/
export function drawStarName(rng: Pcg32, c: StarClass): string {
  if (c === 'NeutronStar') {
    return 'PSR J' + coordinates(rng, 2);
  }

  if (c === 'BlackHole') {
    return rng.chance(1, 2) ? 'Gaia BH' + number(rng.range(4, 99)) : 'XTE J' + coordinates(rng, 1);
  }

  if (c === 'WhiteDwarf' && rng.chance(1, 2)) {
    const ra = number((rng.nextInt(24) * 100) + rng.nextInt(60), 4);
    const sign = rng.chance(1, 2) ? '+' : '-';
    return 'WD ' + ra + sign + number(rng.nextInt(900), 3);
  }

  const isBright = brightClasses.has(c);
  const roll = rng.nextInt(100);
  if (roll < (isBright ? 35 : 8)) {
    const list = proper();
    return list[rng.nextInt(list.length)]!;
  }

  if (roll < (isBright ? 70 : 20)) {
    const list = designations();
    return list[rng.nextInt(list.length)]!;
  }

  if (isBright) {
    return catalogue(rng);
  }

  const survey = rng.nextInt(100);
  const [, draw] = surveys.find(([below]) => survey < below)!;
  return draw(rng);
}
