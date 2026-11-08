import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  const {withCustom} = lib;
  describe(`hooks (${name} build)`, () => {
    test('cluster and universe hooks run on every cluster, and galaxy hooks on every galaxy read', () => {
      const hooks = {
        onCluster: c => ({...c, custom: withCustom(c.custom, 'sector', c.name)}),
        onGalaxy: g => ({...g, custom: withCustom(g.custom, 'campaign', 'alpha')}),
      };
      const cluster = lib.generateCluster('my-seed', undefined, hooks);
      assert.equal(cluster.custom.sector, cluster.name);
      assert.equal(cluster.galaxy(0).custom.campaign, 'alpha');
      const universe = lib.generateUniverse('my-seed', undefined, hooks);
      assert.equal(universe.custom, undefined);
      assert.ok(universe.clusters.every(c => c.custom.sector === c.name));
    });

    test('system hooks run on void systems, and a system hook alone leaves planets as they are', () => {
      const hooks = {onSystem: s => ({...s, custom: {seen: 'yes'}})};
      const universe = lib.generateUniverse('my-seed', undefined, hooks);
      assert.equal(universe.voids[0].system(0).custom.seen, 'yes');
      const plain = lib.generateSystem('my-seed');
      const hooked = lib.generateSystem('my-seed', undefined, hooks);
      assert.deepEqual(hooked.planets, plain.planets);
      assert.deepEqual(lib.generateSystem('my-seed', undefined, {}), plain);
    });

    test('a planet hook alone runs on every planet of a system', () => {
      const system = lib.generateSystem('my-seed', undefined, {onPlanet: p => ({...p, custom: {checked: 'yes'}})});
      assert.ok(system.planets.length > 0);
      assert.ok(system.planets.every(p => p.custom.checked === 'yes'));
    });

    test('a hook that returns nothing is a TypeError naming the hook', () => {
      for (const [hook, make] of [
        ['onPlanet', () => lib.generatePlanet('x', undefined, {onPlanet: () => undefined})],
        ['onSystem', () => lib.generateSystem('x', undefined, {onSystem: () => null})],
        ['onGalaxy', () => lib.generateGalaxy('x', undefined, {onGalaxy: () => undefined})],
        ['onCluster', () => lib.generateCluster('x', undefined, {onCluster: () => undefined})],
        ['onUniverse', () => lib.generateUniverse('x', undefined, {onUniverse: () => undefined})],
      ]) {
        const csharp = 'O' + hook.slice(1);
        assert.throws(make, {name: 'TypeError', message: `The ${csharp} hook returned null; return the object it was given, or a changed copy.`});
      }
    });

    test('withCustom copies the fields and sets one', () => {
      const a = withCustom(undefined, 'a', '1');
      const b = withCustom(a, 'b', '2');
      assert.deepEqual(a, {a: '1'});
      assert.deepEqual(b, {a: '1', b: '2'});
      assert.ok(Object.isFrozen(b));
    });
  });
}
