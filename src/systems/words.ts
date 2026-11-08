/**
Words shared by the system, planet and moon stories. Part of C# `Systems/Story.cs`.
*/
import type {PlanetKind} from './star-system.ts';

export const withArticle = (words: string): string => ('aeiou'.includes(words[0]!) ? 'an ' : 'a ') + words;

export const planetNouns: Record<PlanetKind, string> = {
  Lava: 'lava world',
  Iron: 'iron world',
  Barren: 'barren rock',
  Desert: 'desert world',
  Rocky: 'rocky world',
  Greenhouse: 'greenhouse world',
  Ocean: 'ocean world',
  Garden: 'garden world',
  Ice: 'ice world',
  Dwarf: 'dwarf planet',
  SubNeptune: 'mini-Neptune',
  GasGiant: 'gas giant',
  IceGiant: 'ice giant',
  HotJupiter: 'hot Jupiter',
};
