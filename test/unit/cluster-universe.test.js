import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  const {Distances, Units} = lib;
  describe(`distances, clusters and universes (${name} build)`, () => {
    test('Distances gives light-years per map unit and travel days, as C# Distances does', () => {
      assert.equal(Distances.lightYears('Galaxy', 2), 100);
      assert.equal(Distances.lightYears('Cluster', 2), 4000);
      assert.equal(Distances.lightYears('Universe', 2), 200_000);
      assert.equal(Distances.laneDays(0), 1);
      assert.equal(Distances.laneDays(201), 3);
      assert.deepEqual(['Gate', 'Wormhole', 'Tether', 'Tidal'].map(tier => Distances.travelDays(tier, 500)), [7, 3, 2, 1]);
      assert.equal(Distances.travelDays('Filament', 101), 33);
    });

    test('Units.map converts map units through light-years', () => {
      assert.equal(Units.map('Galaxy', 1, 'LightYears'), 50);
      assert.equal(Units.map('Universe', 1, 'Parsecs'), Units.length(100_000, 'LightYears', 'Parsecs'));
    });

    test('a cluster from a number equals one from its digits, and its galaxies are kept', () => {
      const a = lib.generateCluster(7);
      const b = lib.generateCluster('7');
      assert.deepEqual(a.map, b.map);
      assert.equal(a.galaxy(0), a.galaxy(0));
      assert.equal(a.galaxy(0).name, a.map[0].name);
      assert.throws(() => a.galaxy(a.map.length), {name: 'RangeError', message: new RegExp(`This cluster has ${a.map.length} galaxies`, 'u')});
      assert.throws(() => a.galaxy(-1), RangeError);
    });

    test('a lone galaxy has a quiet core, no gates and no landmark', () => {
      const g = lib.generateGalaxy('my-seed');
      assert.equal(g.coreActivity, 'Quiet');
      assert.equal(g.richness, 'Normal');
      assert.equal(g.coreHazardRadius, 0);
      assert.deepEqual(g.gates, []);
      assert.equal(g.landmark, undefined);
    });

    test('a universe from a number equals one from its digits; clusters and void systems check their range', () => {
      const u = lib.generateUniverse(42);
      assert.deepEqual(u.nodes, lib.generateUniverse('42').nodes);
      assert.equal(u.cluster(0), u.clusters[0]);
      assert.throws(() => u.cluster(u.clusters.length), {name: 'RangeError', message: /^This universe has/u});
      assert.throws(() => u.cluster(-1), RangeError);
      const hole = u.voids[0];
      assert.equal(hole.system(0), hole.system(0));
      assert.throws(() => hole.system(hole.systemCount), {name: 'RangeError', message: /^This void has/u});
      assert.throws(() => hole.system(-1), RangeError);
    });
  });
}
