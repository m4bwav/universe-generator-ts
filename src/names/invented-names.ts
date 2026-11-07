/**
Invented system names from one syllable set: a port of `Names/InventedNames.cs`. Integer draws only.
*/
import type {Pcg32} from '../core/pcg32.ts';
import type {NameStyle} from '../options.ts';
import type {StarClass} from '../stars/star-generator.ts';
import {drawStarName} from './star-names.ts';

const onsets = ['b', 'c', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'br', 'dr', 'kr', 'st', 'th', 'tr', 'sh'];
const vowels = ['a', 'a', 'a', 'e', 'e', 'i', 'i', 'o', 'o', 'u', 'ae', 'ia'];
const innerCodas = ['l', 'n', 'r', 's'];
const finalCodas = ['', '', '', 'n', 'n', 'r', 'r', 's', 'l', 'th', 'x', 'nd'];
const endings = ['a', 'on', 'is', 'ar', 'ia', 'or', 'us', 'ion'];
const maxLength = 10;

const pick = (rng: Pcg32, list: readonly string[]): string => list[rng.nextInt(list.length)]!;
const isVowel = (c: string): boolean => 'aeiouy'.includes(c);

// Three of a letter, or "yy", read badly: keep two, or one y.
function smooth(s: string): string {
  let text = '';
  for (const c of s) {
    const n = text.length;
    if ((n >= 2 && text[n - 1] === c && text[n - 2] === c) || (n >= 1 && c === 'y' && text[n - 1] === 'y')) {
      continue;
    }

    text += c;
  }

  return text;
}

function word(rng: Pcg32): string {
  let text = '';
  const syllables = rng.chance(1, 4) ? 3 : 2;
  for (let i = 0; i < syllables; i++) {
    // The first syllable may open on a vowel; later ones start with a consonant, so vowels never pile up.
    if (i > 0 || !rng.chance(1, 6)) {
      text += pick(rng, onsets);
    }

    text += pick(rng, vowels);
    if (i < syllables - 1 && rng.chance(1, 4)) {
      text += pick(rng, innerCodas);
    }
  }

  const coda = pick(rng, finalCodas);
  text += coda;
  if (coda.length === 0 && rng.chance(1, 3)) {
    const ending = pick(rng, endings);
    text += isVowel(ending[0]!) ? 'r' + ending : ending;
  }

  return smooth(text);
}

/**
One invented name, such as Kessaran. C# `InventedNames.Draw`.
*/
export function drawInventedName(rng: Pcg32): string {
  let name = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    name = word(rng);
    if (name.length <= maxLength) {
      break;
    }
  }

  name = name.slice(0, maxLength);
  return name[0]!.toUpperCase() + name.slice(1);
}

/**
A system's name in the chosen style, drawn from the system's own names stream.
*/
export function systemName(rng: Pcg32, c: StarClass, style: NameStyle): string {
  return style === 'Invented' ? drawInventedName(rng) : drawStarName(rng, c);
}
