// OptionsCode (C# GeneratorOptions.ToCode/FromCode), GeneratorOptions.Check and the guarantee branches the goldens skip.
/* eslint-disable no-bitwise -- Guarantee flags combine with | as in C#. */
import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  describe(`options code (${name} build)`, () => {
    const d = lib.Preset.default;
    const g = lib.Guarantee;

    test('every setting round-trips through its code', () => {
      const options = {
        starMix: 'Plausible',
        weirdness: 9,
        maxPlanetsPerSystem: 3,
        systems: 120,
        shape: 'Barred',
        clusterKind: 'Group',
        epoch: 'Old',
        arms: 3,
        extraLanes: 0,
        dangerShift: -2,
        names: 'Invented',
        require: g.GardenWorld | g.BlackHole,
        tables: undefined,
      };
      const code = lib.optionsToCode(options);
      assert.equal(code, 'systems=120&shape=barred&starmix=plausible&weirdness=9&planets=3&cluster=group&epoch=old&arms=3&lanes=0&danger=-2&names=invented&require=garden,blackhole');
      assert.deepEqual(lib.optionsFromCode(`?${code}`), options);
      assert.equal(lib.optionsToCode(d), '');
      assert.deepEqual(lib.optionsFromCode(''), d);
      assert.deepEqual(lib.optionsFromCode('?'), d);
      assert.equal(lib.optionsFromCode('require=none').require, 0);
      assert.equal(lib.optionsFromCode('starmix=game&names=catalogue&cluster=auto&shape=auto&epoch=auto').shape, 'Auto');
      assert.equal(lib.optionsToCode({
        ...d, starMix: 'Game', clusterKind: 'Cluster', require: 0,
      }), 'cluster=cluster');
      assert.equal(lib.optionsFromCode('cluster=cluster').clusterKind, 'Cluster');
    });

    test('a bad code is a SyntaxError with the C# message', () => {
      const cases = [
        ['systems', '"systems" is not a name=value pair, as in systems=120.'],
        ['=3', '"=3" is not a name=value pair, as in systems=120.'],
        ['size=3', '"size" is not a setting; the settings are systems, shape, starmix, weirdness, planets, cluster, epoch, arms, lanes, danger, names, require, tables.'],
        ['arms=2&arms=3', '"arms" appears twice.'],
        ['systems=012', 'systems must be a whole number such as 12; got "012".'],
        ['systems=-', 'systems must be a whole number such as 12; got "-".'],
        ['systems=1x', 'systems must be a whole number such as 12; got "1x".'],
        ['systems=1234567890', 'systems must be a whole number such as 12; got "1234567890".'],
        ['shape=disc', 'shape must be one of auto, spiral, barred, elliptical, ring, irregular, colliding, starburst, clustered; got "disc".'],
        ['names=odd', 'names must be one of catalogue, invented; got "odd".'],
        ['require=garden,garden', 'require lists "garden" twice.'],
        ['require=moon', 'require takes none or a comma-separated list of garden, ocean, precursor, blue, giant, whitedwarf, neutron, blackhole, sunlike; got "moon".'],
      ];
      for (const [code, message] of cases) {
        assert.throws(() => lib.optionsFromCode(code), {name: 'SyntaxError', message});
      }

      assert.throws(() => lib.optionsFromCode('systems=0'), RangeError);
    });

    test('check reports a world guarantee with no planets allowed', () => {
      assert.deepEqual(lib.checkOptions({...d, maxPlanetsPerSystem: 0, require: g.OceanWorld}).map(w => w.code), ['GuaranteeUnmet']);
      assert.deepEqual(lib.checkOptions({...d, maxPlanetsPerSystem: 0}), []);
      assert.throws(() => lib.checkOptions({...d, systems: 0}), RangeError);
      assert.deepEqual(lib.checkOptions({maxPlanetsPerSystem: 0, require: g.OceanWorld}).map(w => w.code), ['GuaranteeUnmet']);
      assert.deepEqual(lib.checkOptions({shape: 'Ring', arms: 3}), lib.checkOptions({...d, shape: 'Ring', arms: 3}));
      assert.deepEqual(lib.checkOptions(), []);
      assert.throws(() => lib.checkOptions({weirdness: 101}), RangeError);
    });

    test('a missing seed throws a TypeError naming the seed', () => {
      for (const seed of [undefined, null, {}]) {
        assert.throws(() => lib.generateGalaxy(seed), {name: 'TypeError', message: /A seed is required/u});
      }
    });

    test('a precursor site cannot be added when every system already holds a point of interest', () => {
      const galaxy = lib.generateGalaxy('one', {...d, systems: 1, require: g.PrecursorSite});
      assert.deepEqual(galaxy.warnings.map(w => w.message), ['Require PrecursorSite is not met: every system already holds a point of interest.']);
      const big = lib.generateGalaxy('my-seed', {...d, require: g.PrecursorSite | g.OceanWorld});
      assert.ok(big.pointsOfInterest.some(p => p.kind === 'PrecursorSite'));
    });
  });
}
