/**
Deterministic maths: a port of `Core/DMath.cs`. Built only from IEEE 754 + - * /, square root and floor, which are exact
or correctly rounded on every runtime. `Math.exp`, `sin`, `pow`, `log` and `atan2` may differ in the last bit between
JavaScript engines (and from .NET), so generation never calls them.
*/

const pi = 3.141592653589793;
const ln2 = 0.6931471805599453;
const sqrt2 = 1.4142135623730951;
const powersOfTen = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 1e13, 1e14, 1e15];

const view = new DataView(new ArrayBuffer(8));
function fromBits(bits: bigint): number {
  view.setBigInt64(0, BigInt.asIntN(64, bits));
  return view.getFloat64(0);
}

function toBits(x: number): bigint {
  view.setFloat64(0, x);
  return view.getBigInt64(0);
}

/**
E to the power x; 0 below -700 and capped at e^700.
*/
function exp(x: number): number {
  if (Number.isNaN(x)) {
    return x;
  }

  if (x < -700) {
    return 0;
  }

  if (x > 700) {
    x = 700;
  }

  const kd = Math.floor((x / ln2) + 0.5);
  const r = x - (kd * ln2);
  let term = 1;
  let sum = 1;
  for (let i = 1; i <= 16; i++) {
    term = term * r / i;
    sum += term;
  }

  return sum * fromBits(BigInt((kd | 0) + 1023) << 52n);
}

/**
The natural logarithm; negative infinity for x at or below 0.
*/
function log(x: number): number {
  if (Number.isNaN(x)) {
    return x;
  }

  if (x <= 0) {
    return -Infinity;
  }

  if (x === Infinity) {
    return x;
  }

  const bits = toBits(x);
  let exponent = Number((bits >> 52n) & 0x7_FFn) - 1023;
  if (exponent === -1023) {
    // Subnormal: scale into the normal range first.
    return log(x * 4_503_599_627_370_496) - (52 * ln2);
  }

  let m = fromBits((bits & 0xF_FF_FF_FF_FF_FF_FFn) | 0x3F_F0_00_00_00_00_00_00n);
  if (m > sqrt2) {
    m /= 2;
    exponent++;
  }

  const s = (m - 1) / (m + 1);
  const s2 = s * s;
  let term = s;
  let sum = 0;
  for (let i = 1; i <= 41; i += 2) {
    sum += term / i;
    term *= s2;
  }

  return (2 * sum) + (exponent * ln2);
}

/**
X to the power y for x above 0; 0 for x at or below 0.
*/
function pow(x: number, y: number): number {
  return x <= 0 ? 0 : exp(y * log(x));
}

function sin(x: number): number {
  if (!Number.isFinite(x)) {
    return NaN;
  }

  const twoPi = 2 * pi;
  const halfPi = pi / 2;
  x -= Math.floor((x / twoPi) + 0.5) * twoPi;
  const q = Math.floor((x / halfPi) + 0.5) | 0;
  const r = x - (q * halfPi);
  const r2 = r * r;
  // Taylor series to r^21 and r^20 on |r| <= pi/4, nested exactly as in the C# source.
  /* eslint-disable @stylistic/no-mixed-operators -- kept character for character as DMath.cs writes it */
  const s = r * (1 - r2 / 6 * (1 - r2 / 20 * (1 - r2 / 42 * (1 - r2 / 72 * (1 - r2 / 110 * (1 - r2 / 156
    * (1 - r2 / 210 * (1 - r2 / 272 * (1 - r2 / 342 * (1 - r2 / 420))))))))));
  const c = 1 - r2 / 2 * (1 - r2 / 12 * (1 - r2 / 30 * (1 - r2 / 56 * (1 - r2 / 90 * (1 - r2 / 132
    * (1 - r2 / 182 * (1 - r2 / 240 * (1 - r2 / 306 * (1 - r2 / 380)))))))));
  /* eslint-enable @stylistic/no-mixed-operators */
  switch ((((q % 4) + 4) % 4)) {
    case 0: {
      return s;
    }

    case 1: {
      return c;
    }

    case 2: {
      return -s;
    }

    default: {
      return -c;
    }
  }
}

function cos(x: number): number {
  return sin(x + (pi / 2));
}

/**
The arc tangent: two half-angle reductions, then the Taylor series.
*/
function atan(z: number): number {
  if (Number.isNaN(z)) {
    return z;
  }

  if (!Number.isFinite(z)) {
    return z > 0 ? pi / 2 : -pi / 2;
  }

  const isInvert = Math.abs(z) > 1;
  let t = isInvert ? 1 / z : z;
  t /= 1 + Math.sqrt(1 + (t * t));
  t /= 1 + Math.sqrt(1 + (t * t));
  const t2 = t * t;
  let term = t;
  let sum = 0;
  for (let i = 1; i <= 41; i += 2) {
    sum += term / i;
    term *= -t2;
  }

  const a = 4 * sum;
  return isInvert ? (z > 0 ? pi / 2 : -pi / 2) - a : a;
}

function atan2(y: number, x: number): number {
  if (x > 0) {
    return atan(y / x);
  }

  if (x < 0) {
    return y >= 0 ? atan(y / x) + pi : atan(y / x) - pi;
  }

  return y > 0 ? pi / 2 : (y < 0 ? -pi / 2 : 0);
}

/**
Rounds half away from zero to `decimals` places (0 to 15) by scaling and floor. Never returns negative zero.
*/
function round(x: number, decimals: number): number {
  if (!Number.isFinite(x)) {
    return x;
  }

  const p = powersOfTen[decimals]!;
  const scaled = Math.floor((Math.abs(x) * p) + 0.5);
  if (scaled === 0) {
    return 0;
  }

  const result = scaled / p;
  return x < 0 ? -result : result;
}

/**
The power of ten for `decimals` places, as {@link DMath.round} uses it.
*/
function powerOfTen(decimals: number): number {
  return powersOfTen[decimals]!;
}

function clamp(x: number, min: number, max: number): number {
  return x < min ? min : (Math.min(x, max));
}

/**
Deterministic maths, the same as the C# `DMath` class.
*/
export const DMath = {
  PI: pi, exp, log, pow, sin, cos, atan, atan2, round, powerOfTen, clamp, toBits, fromBits,
} as const;
