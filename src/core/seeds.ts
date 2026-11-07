/**
Hierarchical, addressable seeds: a port of `Core/Seeds.cs`. A child's seed comes from its parent's seed, a label and an
index, and each purpose of an object (layout, star, planets, names) has its own {@link Pcg32} stream. Seeds are unsigned
64-bit BigInts; they are made rarely, so BigInt's cost does not matter here.
*/
import {Pcg32} from './pcg32.ts';

const golden = 0x9E_37_79_B9_7F_4A_7C_15n;
const fnvOffset = 0xCB_F2_9C_E4_84_22_23_25n;
const fnvPrime = 0x1_00_00_00_01_B3n;

const wrap = (x: bigint): bigint => BigInt.asUintN(64, x);

/**
SplitMix64's output function (Vigna): the first output of a SplitMix64 generator whose state is x.
*/
function splitMix64(x: bigint): bigint {
  x = wrap(x + golden);
  x = wrap((x ^ (x >> 30n)) * 0xBF_58_47_6D_1C_E4_E5_B9n);
  x = wrap((x ^ (x >> 27n)) * 0x94_D0_49_BB_13_31_11_EBn);
  return x ^ (x >> 31n);
}

/**
64-bit FNV-1a over the text's UTF-8 bytes, encoded by hand; a lone surrogate counts as U+FFFD.
*/
function fnv1a(text: string): bigint {
  let hash = fnvOffset;
  const mix = (byte: number): void => {
    hash = wrap((hash ^ BigInt(byte)) * fnvPrime);
  };

  for (let index = 0; index < text.length; index++) {
    let c = text.charCodeAt(index);
    const next = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
    if (c >= 0xD8_00 && c <= 0xDB_FF && next >= 0xDC_00 && next <= 0xDF_FF) {
      c = 0x1_00_00 + ((c - 0xD8_00) << 10) + (next - 0xDC_00);
      index++;
    } else if (c >= 0xD8_00 && c <= 0xDF_FF) {
      c = 0xFF_FD;
    }

    if (c < 0x80) {
      mix(c);
    } else if (c < 0x8_00) {
      mix(0xC0 | (c >> 6));
      mix(0x80 | (c & 0x3F));
    } else if (c < 0x1_00_00) {
      mix(0xE0 | (c >> 12));
      mix(0x80 | ((c >> 6) & 0x3F));
      mix(0x80 | (c & 0x3F));
    } else {
      mix(0xF0 | (c >> 18));
      mix(0x80 | ((c >> 12) & 0x3F));
      mix(0x80 | ((c >> 6) & 0x3F));
      mix(0x80 | (c & 0x3F));
    }
  }

  return hash;
}

/**
A child's seed, e.g. `child(galaxy, 'system', 31)`.
*/
function child(parent: bigint, label: string, index: number): bigint {
  return splitMix64(wrap(splitMix64(parent ^ fnv1a(label)) + BigInt(index >>> 0)));
}

/**
The stream of one purpose of an object, e.g. `stream(system, 'names')`.
*/
function stream(objectSeed: bigint, purpose: string): Pcg32 {
  const p = fnv1a(purpose);
  return new Pcg32(splitMix64(objectSeed ^ p), p);
}

/**
The root seed of a seed text under a generator version (the version is part of a seed's identity).
*/
function fromText(text: string, generatorVersion: number): bigint {
  return splitMix64(fnv1a(text) ^ BigInt(generatorVersion >>> 0));
}

/**
Seed derivation, the same as the C# `Seeds` class.
*/
export const Seeds = {
  splitMix64, fnv1a, child, stream, fromText,
} as const;
