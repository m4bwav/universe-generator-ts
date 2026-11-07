// Galaxy, system and writer behaviour the golden files do not reach: warnings, errors, invented names, escaping.
import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  describe(`galaxy and writer (${name} build)`, () => {
    test('a galaxy\'s systems equal what their addresses regenerate, and out-of-range indexes throw', () => {
      const g = lib.generateGalaxy('my-seed', {systems: 20});
      assert.equal(g.system(3), g.system(3));
      assert.equal(g.system(3).address, 'v1-my-seed/galaxy/system/3');
      assert.equal(g.system(3).name, g.map[3].name);
      assert.throws(() => g.system(20), /numbered 0 to 19; you asked for 20/u);
      assert.throws(() => g.system(-1), RangeError);
    });

    test('shape warnings name the setting', () => {
      const codes = options => lib.generateGalaxy('w', options).warnings.map(w => w.code);
      assert.deepEqual(codes({systems: 40, shape: 'Spiral'}), ['ShapeTooSmall']);
      assert.deepEqual(codes({systems: 40, shape: 'Ring', arms: 3}), ['ArmsIgnored']);
      assert.deepEqual(codes({systems: 40, arms: 3}), ['ArmsIgnored']);
      assert.ok(lib.generateGalaxy('w', {systems: 80, arms: 3}).warnings.length <= 1);
      const crowded = lib.generateGalaxy('w', {systems: 2000, shape: 'Starburst'});
      assert.ok(crowded.map.length <= 2000);
    });

    test('Auto with arms on a big galaxy warns only when it drew no arms', () => {
      for (let i = 0; i < 12; i++) {
        const g = lib.generateGalaxy('auto' + i, {systems: 80, arms: 4});
        const isArmed = g.shape === 'Spiral' || g.shape === 'Barred';
        assert.equal(g.warnings.some(w => w.code === 'ArmsIgnored'), !isArmed);
        assert.equal(g.arms, isArmed ? 4 : 0);
      }
    });

    test('invented names, number seeds and descriptors', () => {
      const g = lib.generateGalaxy(42, {systems: 12, names: 'Invented', shape: 'Elliptical'});
      assert.equal(g.address, 'v1-42/galaxy');
      assert.match(g.type, /^E\d$/u);
      assert.match(g.descriptor, /^an elliptical galaxy$/u);
      for (const m of g.map) {
        assert.match(m.name, /^[A-Z][a-z]{1,9}$/u);
      }

      assert.equal(lib.generateSystem(42n).address, 'v1-42/system');
      assert.match(lib.generateGalaxy('s', {shape: 'Spiral', systems: 80}).type, /^S[abc]$/u);
      assert.match(lib.generateGalaxy('s', {shape: 'Barred', systems: 80}).descriptor, /barred spiral/u);
      assert.equal(lib.generateGalaxy('s', {shape: 'Irregular', systems: 10}).type, 'Irr');
      for (let i = 0; i < 50; i++) {
        const rng = new lib.Pcg32(BigInt(i), 7n);
        assert.match(lib.drawInventedName(rng), /^[A-Z][a-z]{1,9}$/u);
      }
    });

    test('addresses escape the seed and check labels', () => {
      const a = new lib.Address(1, 'a/b c\u{E9}\u{1F600}\u{D800}', 'galaxy');
      assert.equal(a.child('system', 2).toString(), 'v1-a%2Fb%20c%C3%A9%F0%9F%98%80%EF%BF%BD/galaxy/system/2');
      assert.throws(() => new lib.Address(1, 'x', 'Galaxy'), /lowercase letters/u);
      assert.throws(() => a.child('sys1', 0), /lowercase letters/u);
      assert.equal(a.objectSeed, lib.rootSeed(1, a.seed, 'galaxy'));
    });

    test('the writer escapes, rounds and writes null as the C# writer does', () => {
      const w = new lib.JsonWriter(false);
      w.beginArray().string('q"b\\n\n\r\t\u{1}\u{D800}').string(undefined).number(NaN, 2).number(-0.0001, 3).number(-1.25, 1)
        .number(2.5, 0).number(1.1, 3).bool(false).beginObject().endObject().beginArray().endArray().endArray();
      assert.equal(w.toString(), String.raw`["q\"b\\n\n\r\t\u0001\ud800",null,null,0,-1.3,3,1.1,false,{},[]]`);
      assert.equal(new lib.JsonWriter(true).toString(), '');
      assert.throws(() => lib.JsonWriter.format(1e300, 2), /too large/u);
    });
  });
}
