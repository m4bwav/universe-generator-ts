/**
PCG32 (XSH RR; O'Neill 2014, pcg-random.org): 64-bit state, 32-bit output. A port of `Core/Pcg32.cs`.

The state is kept as two unsigned 32-bit halves: about ten times faster than BigInt (Stage 0, 2026-11-07: 11 ns
against 119 ns a draw on Node 24), with the same bits.
*/

// 6364136223846793005 as two halves.
const multiplierHigh = 0x58_51_F4_2D;
const multiplierLow = 0x4C_95_7F_2D;
const mask64 = (1n << 64n) - 1n;

/**
The full 64-bit product of two unsigned 32-bit integers, as [high, low].
*/
function multiply32(a: number, b: number): [number, number] {
  const a0 = a & 0xFF_FF;
  const a1 = a >>> 16;
  const b0 = b & 0xFF_FF;
  const b1 = b >>> 16;
  const p00 = a0 * b0;
  const p01 = a0 * b1;
  const p10 = a1 * b0;
  const p11 = a1 * b1;
  const middle = (p00 >>> 16) + (p01 & 0xFF_FF) + (p10 & 0xFF_FF);
  const low = (((middle & 0xFF_FF) << 16) | (p00 & 0xFF_FF)) >>> 0;
  const high = (p11 + (p01 >>> 16) + (p10 >>> 16) + (middle >>> 16)) >>> 0;
  return [high, low];
}

/**
A seeded random number generator: the same seed and stream give the same draws on every runtime, and the same draws as
the C# UniverseGenerator.
*/
export class Pcg32 {
  private stateHigh = 0;
  private stateLow = 0;
  private readonly incrementHigh: number;
  private readonly incrementLow: number;

  /**
  The reference `pcg32_srandom_r(initstate, initseq)`; both arguments are unsigned 64-bit values.
  */
  constructor(seed: bigint, stream: bigint) {
    const increment = ((BigInt.asUintN(64, stream) << 1n) | 1n) & mask64;
    this.incrementHigh = Number(increment >> 32n);
    this.incrementLow = Number(increment & 0xFF_FF_FF_FFn);
    this.nextUInt();
    const state = BigInt.asUintN(64, ((BigInt(this.stateHigh) << 32n) | BigInt(this.stateLow)) + seed);
    this.stateHigh = Number(state >> 32n);
    this.stateLow = Number(state & 0xFF_FF_FF_FFn);
    this.nextUInt();
  }

  /**
  An unsigned 32-bit integer.
  */
  nextUInt(): number {
    const oldHigh = this.stateHigh;
    const oldLow = this.stateLow;
    // State = old * multiplier + increment, modulo 2^64.
    const [productHigh, productLow] = multiply32(oldLow, multiplierLow);
    const high = (productHigh + Math.imul(oldLow, multiplierHigh) + Math.imul(oldHigh, multiplierLow)) >>> 0;
    const low = productLow + this.incrementLow;
    this.stateHigh = (high + this.incrementHigh + (low > 0xFF_FF_FF_FF ? 1 : 0)) >>> 0;
    this.stateLow = low >>> 0;
    // XorShifted = (uint)(((old >> 18) ^ old) >> 27); rotation = old >> 59.
    const shiftedLow = (((oldLow >>> 18) | (oldHigh << 14)) ^ oldLow) >>> 0;
    const shiftedHigh = ((oldHigh >>> 18) ^ oldHigh) >>> 0;
    const xorShifted = ((shiftedLow >>> 27) | (shiftedHigh << 5)) >>> 0;
    const rotation = oldHigh >>> 27;
    return ((xorShifted >>> rotation) | (xorShifted << (-rotation & 31))) >>> 0;
  }

  /**
  An unbiased integer in [0, bound) by Lemire's method.
  */
  nextInt(bound: number): number {
    if (!(bound > 0)) {
      throw new RangeError(`The bound must be positive; got ${bound}.`);
    }

    const b = bound >>> 0;
    let [high, low] = multiply32(this.nextUInt(), b);
    if (low < b) {
      const threshold = ((0x1_00_00_00_00 - b) >>> 0) % b;
      while (low < threshold) {
        [high, low] = multiply32(this.nextUInt(), b);
      }
    }

    return high | 0;
  }

  /**
  An integer from min to max, both included.
  */
  range(min: number, max: number): number {
    return min + this.nextInt(max - min + 1);
  }

  /**
  A double in [0, 1) from 53 random bits; always two draws.
  */
  nextDouble(): number {
    const high = this.nextUInt() >>> 5;
    const low = this.nextUInt() >>> 6;
    return ((high * 67_108_864) + low) / 9_007_199_254_740_992;
  }

  /**
  A double in [min, max). The C# overload `Range(double, double)`.
  */
  rangeDouble(min: number, max: number): number {
    return min + ((max - min) * this.nextDouble());
  }

  /**
  True with probability numerator / denominator, decided on integers.
  */
  chance(numerator: number, denominator: number): boolean {
    return this.nextInt(denominator) < numerator;
  }

  /**
  An index into integer weights, each chosen in proportion to its weight.
  */
  weighted(weights: readonly number[]): number {
    let total = 0;
    for (const weight of weights) {
      total += weight;
    }

    let roll = this.nextInt(total);
    for (const [index, weight] of weights.entries()) {
      if (roll < weight) {
        return index;
      }

      roll -= weight;
    }

    return weights.length - 1;
  }
}
