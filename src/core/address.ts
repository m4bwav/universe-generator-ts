/**
Where an object sits: generator version, seed text, the level it was generated from and the path below it, as a URL-safe
text such as `v1-my-seed/galaxy/system/31/planet/2`. A port of `Core/Address.cs`.
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
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new RangeError('Generator versions start at 1.');
    }

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

    if (!Number.isSafeInteger(index) || index < 0) {
      throw new RangeError('An index cannot be negative.');
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

  /**
  Reads an address. C# `Address.TryParse`: on failure `error` says what is wrong in words.
  */
  static tryParse(text: string | undefined): {readonly address: Address; readonly error?: undefined} | {readonly address?: undefined; readonly error: string} {
    if (text === undefined || text.length === 0) {
      return {error: 'The address is empty.'};
    }

    const parts = text.split('/');
    const head = parts[0]!;
    const dash = head.indexOf('-');
    const version = dash < 2 ? undefined : readIndex(head.slice(1, dash));
    if (head.length < 3 || !head.startsWith('v') || version === undefined || version < 1) {
      return {error: `An address starts with v, the generator version and a dash, as in v1-my-seed/galaxy; got "${head}".`};
    }

    const seed = unescapeSeed(head.slice(dash + 1));
    if (seed === undefined) {
      return {error: 'The seed part of the address has a character that must be percent-encoded, or a broken %XX sequence.'};
    }

    if (parts.length < 2 || !isLabel(parts[1]!)) {
      return {error: 'After the seed comes the level it was generated from, as in v1-my-seed/galaxy.'};
    }

    if (parts.length % 2 !== 0) {
      return {error: 'Below the level, the address alternates a name and an index, as in /system/31/planet/2.'};
    }

    const path: Array<readonly [string, number]> = [];
    for (let i = 2; i < parts.length; i += 2) {
      const label = parts[i]!;
      const indexText = parts[i + 1]!;
      const index = readIndex(indexText);
      if (!isLabel(label) || index === undefined) {
        return {error: `"${label}/${indexText}" is not a name followed by an index (0, 1, 2, ... without leading zeros).`};
      }

      path.push([label, index]);
    }

    return {address: new Address(version, seed, parts[1]!, path)};
  }
}

/**
A non-negative int without leading zeros, as the C# `TryReadIndex` reads it; undefined when it is not one.
*/
function readIndex(s: string): number | undefined {
  if (!/^(?:0|[1-9]\d{0,9})$/u.test(s)) {
    return undefined;
  }

  const v = Number(s);
  return v > 2_147_483_647 ? undefined : v;
}

function hexValue(c: string): number {
  return /^[0-9a-f]$/iu.test(c) ? Number.parseInt(c, 16) : -1;
}

/**
The seed text back from its escaped form; undefined for a character that must be escaped, a broken %XX, or bytes that are
not UTF-8 written the way `escapeSeed` writes them.
*/
function unescapeSeed(escaped: string): string | undefined {
  const bytes: number[] = [];
  for (let i = 0; i < escaped.length; i++) {
    const c = escaped.charCodeAt(i);
    if (c === 0x25) {
      if (i + 2 >= escaped.length) {
        return undefined;
      }

      const high = hexValue(escaped[i + 1]!);
      const low = hexValue(escaped[i + 2]!);
      if (high < 0 || low < 0) {
        return undefined;
      }

      bytes.push((high * 16) + low);
      i += 2;
    } else if (isUnreserved(c)) {
      bytes.push(c);
    } else {
      return undefined;
    }
  }

  const seed = new TextDecoder('utf-8', {ignoreBOM: true}).decode(new Uint8Array(bytes));
  const again = encode(seed);
  return again.length === bytes.length && again.every((b, i) => b === bytes[i]) ? seed : undefined;
}
