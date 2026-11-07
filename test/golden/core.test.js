// The seed promise at its root: the raw bits of seeds, draws and deterministic maths match tests/Golden/v1/core.json
// from the C# UniverseGenerator 1.0.0 (GoldenCoreTests.cs builds it). Bits, not printed decimals.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

const golden = JSON.parse(readFileSync(new URL('v1/core.json', import.meta.url), 'utf8'));
const purposes = ['layout', 'star', 'planets', 'names', 'lanes'];
const hex64 = value => value.toString(16).padStart(16, '0');
const hex32 = value => value.toString(16).padStart(8, '0');

// Address.ToString's seed escape: RFC 3986 unreserved bytes stay, every other UTF-8 byte becomes %XX.
const isUnreserved = byte => /[\w\-.~]/u.test(String.fromCodePoint(byte));
const escapeSeed = text => [...new TextEncoder().encode(text)]
  .map(byte => isUnreserved(byte) ? String.fromCodePoint(byte) : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`)
  .join('');

for (const {name, lib} of builds) {
  const {Seeds, DMath, generatorVersion} = lib;
  const bits = x => hex64(BigInt.asUintN(64, DMath.toBits(x)));

  describe(`core.json (${name} build)`, () => {
    test('the generator version', () => {
      assert.equal(generatorVersion, golden.generatorVersion);
    });

    for (const seed of golden.seeds) {
      test(`seed ${JSON.stringify(seed.text)}: seeds and every stream`, () => {
        const root = Seeds.fromText(seed.text, generatorVersion);
        assert.equal(hex64(root), seed.fromText);
        const galaxy = Seeds.child(root, 'galaxy', 0);
        const system = Seeds.child(galaxy, 'system', 31);
        assert.equal(`v1-${escapeSeed(seed.text)}/galaxy`, seed.galaxy);
        assert.equal(`${seed.galaxy}/system/31`, seed.system);
        assert.equal(hex64(galaxy), seed.galaxySeed);
        assert.equal(hex64(system), seed.systemSeed);
        for (const purpose of purposes) {
          const rng = Seeds.stream(system, purpose);
          const got = [
            hex32(rng.nextUInt()),
            hex32(rng.nextUInt()),
            rng.nextInt(1000),
            rng.range(-5, 5),
            rng.weighted([30, 21, 14, 10, 7, 6, 5, 3]),
            bits(rng.nextDouble()),
            bits(rng.rangeDouble(0.08, 0.45)),
            rng.chance(1, 3),
          ];
          assert.deepEqual(got, seed.streams[purpose], purpose);
        }
      });
    }

    test('deterministic maths, bit for bit', () => {
      for (const [k, row] of golden.math.entries()) {
        const x = ((k - 12) * 0.73) + 0.011;
        const positive = Math.abs(x) + 0.05;
        const got = [
          x,
          DMath.exp(x),
          DMath.log(positive),
          DMath.pow(positive, 2.3),
          DMath.sin(x),
          DMath.cos(x),
          DMath.atan2(x, 0.37),
          Math.sqrt(positive),
          DMath.round(x * 1234.5678, 3),
        ].map(value => bits(value));
        assert.deepEqual(got, row, `row ${k}`);
      }
    });
  });
}
