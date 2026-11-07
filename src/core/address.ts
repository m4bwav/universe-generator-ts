/**
Where an object sits: generator version, seed text, the level it was generated from and the path below it, as a URL-safe
text such as `v1-my-seed/galaxy/system/31/planet/2`. A port of `Core/Address.cs` (parsing is not ported yet).
*/
import {Seeds} from './seeds.ts';

const isLabel = (s: string): boolean => /^[a-z]+$/u.test(s);

const isUnreserved = (c: number): boolean =>
  (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || (c >= 0x30 && c <= 0x39) || c === 0x2D || c === 0x2E || c === 0x5F || c === 0x7E;

/**
UTF-8 bytes of the text, a lone surrogate as U+FFFD, as the C# `Encode` does.
*/
function encode(s: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
    if (c >= 0xD8_00 && c <= 0xDB_FF && next >= 0xDC_00 && next <= 0xDF_FF) {
      c = 0x1_00_00 + ((c - 0xD8_00) << 10) + (next - 0xDC_00);
      i++;
    } else if (c >= 0xD8_00 && c <= 0xDF_FF) {
      c = 0xFF_FD;
    }

    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x8_00) {
      bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    } else if (c < 0x1_00_00) {
      bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    } else {
      bytes.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    }
  }

  return bytes;
}

function escapeSeed(seed: string): string {
  const hex = '0123456789ABCDEF';
  let text = '';
  for (const b of encode(seed)) {
    text += isUnreserved(b) ? String.fromCharCode(b) : '%' + hex[b >> 4]! + hex[b & 15]!;
  }

  return text;
}

/**
The seed of an object generated directly from a seed text at the level `root`. C# `Address.RootSeed`.
*/
export function rootSeed(generatorVersion: number, seed: string, root: string): bigint {
  return Seeds.child(Seeds.fromText(seed, generatorVersion), root, 0);
}

/**
An object's address; the address alone regenerates the object.
*/
export class Address {
  readonly version: number;
  readonly seed: string;
  readonly root: string;
  readonly path: ReadonlyArray<readonly [string, number]>;

  constructor(version: number, seed: string, root: string, path: ReadonlyArray<readonly [string, number]> = []) {
    this.version = version;
    this.seed = seed;
    this.root = root;
    this.path = path;
    if (!isLabel(root)) {
      throw new RangeError(`A level name is lowercase letters a to z; got "${root}".`);
    }
  }

  /**
  The seed of the object at this address.
  */
  get objectSeed(): bigint {
    let seed = rootSeed(this.version, this.seed, this.root);
    for (const [label, index] of this.path) {
      seed = Seeds.child(seed, label, index);
    }

    return seed;
  }

  child(label: string, index: number): Address {
    if (!isLabel(label)) {
      throw new RangeError(`A label is lowercase letters a to z; got "${label}".`);
    }

    return new Address(this.version, this.seed, this.root, [...this.path, [label, index]]);
  }

  toString(): string {
    let text = `v${this.version}-${escapeSeed(this.seed)}/${this.root}`;
    for (const [label, index] of this.path) {
      text += `/${label}/${index}`;
    }

    return text;
  }
}
