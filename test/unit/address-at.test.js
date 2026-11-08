import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  const {Address, generateAt, linkTo, toJson, withCustom} = lib;
  describe(`addresses, generateAt and linkTo (${name} build)`, () => {
    test('round-trips any seed text (C# Round_trips_any_seed_text)', () => {
      for (const seed of ['my-seed', 'Hello World/2', '100%', '', '-42', 'a.b_c~d', 'é😀']) {
        const a = new Address(1, seed, 'system').child('planet', 0);
        const {address: back, error} = Address.tryParse(a.toString());
        assert.equal(error, undefined);
        assert.equal(back.seed, seed);
        assert.equal(back.toString(), a.toString());
        assert.equal(back.objectSeed, a.objectSeed);
      }
    });

    test('escapes as UTF-8 and accepts lowercase escapes', () => {
      assert.equal(new Address(1, 'a b/é', 'galaxy').toString(), 'v1-a%20b%2F%C3%A9/galaxy');
      assert.equal(Address.tryParse('v1-a%2fb/galaxy').address.seed, 'a/b');
    });

    test('refuses a malformed address with a reason', () => {
      const bad = [undefined,
        '',
        'my-seed/galaxy',
        'v0-x/galaxy',
        'v1-x',
        'v1-x/Galaxy',
        'v1-x/galaxy/system',
        'v1-x/galaxy/system/07',
        'v1-x/galaxy/system/-1',
        'v1-x/galaxy/system/99999999999',
        'v1-x/galaxy/system/2147483648',
        'v1-a b/galaxy',
        'v1-%G0/galaxy',
        'v1-%2/galaxy',
        'v1-%C3/galaxy',
        'v1-%EF%BB%BF%C0%80/galaxy',
        'vx-a/galaxy'];
      for (const text of bad) {
        const result = Address.tryParse(text);
        assert.equal(result.address, undefined, String(text));
        assert.ok(result.error.length > 0);
      }

      assert.ok(Address.tryParse('v1-x/galaxy/system/2147483647').address);
      assert.equal(Address.tryParse('v1-%EF%BB%BFa/galaxy').address.seed, '﻿a');
    });

    test('refuses bad labels, indexes and versions', () => {
      assert.throws(() => new Address(1, 'x', 'galaxy').child('system2', 0), RangeError);
      assert.throws(() => new Address(1, 'x', 'galaxy').child('system', -1), {message: 'An index cannot be negative.'});
      assert.throws(() => new Address(0, 'x', 'galaxy'), {message: 'Generator versions start at 1.'});
    });

    test('every object reached by generateAt equals the one reached by walking down', () => {
      const options = {systems: 40};
      const galaxy = lib.generateGalaxy('walk', options);
      assert.deepEqual(toJson('galaxy', generateAt(galaxy.address, options)), toJson('galaxy', galaxy));
      for (let i = 0; i < 6; i++) {
        const system = galaxy.system(i);
        assert.equal(toJson('starSystem', generateAt(system.address, options)), toJson('starSystem', system));
        const link = linkTo(system.address, options);
        assert.equal(toJson('starSystem', generateAt(link)), toJson('starSystem', system));
        for (const planet of system.planets) {
          assert.equal(toJson('planet', generateAt(planet.address, options)), toJson('planet', planet));
          for (const moon of planet.moons) {
            assert.equal(toJson('moon', generateAt(moon.address, options)), toJson('moon', moon));
          }
        }

        for (const belt of system.belts) {
          assert.deepEqual(generateAt(belt.address, options), belt);
        }

        for (const station of system.stations) {
          assert.deepEqual(generateAt(station.address, options), station);
        }
      }
    });

    test('universes, clusters, voids and lone objects', () => {
      const universe = lib.generateUniverse('walk');
      assert.equal(toJson('universe', generateAt(universe.address)), toJson('universe', universe));
      const cluster = universe.cluster(1);
      const again = generateAt(cluster.address);
      assert.equal(toJson('galaxyCluster', again), toJson('galaxyCluster', cluster));
      const galaxyAddress = cluster.galaxy(0).address;
      assert.equal(generateAt(galaxyAddress).address, galaxyAddress);
      const deep = cluster.galaxy(0).system(0);
      assert.equal(toJson('starSystem', generateAt(deep.address)), toJson('starSystem', deep));
      const hole = universe.voids[0];
      assert.equal(generateAt(hole.address).name, hole.name);
      const voidSystem = hole.system(0);
      assert.equal(toJson('starSystem', generateAt(voidSystem.address)), toJson('starSystem', voidSystem));
      const alone = lib.generateCluster('alone');
      assert.equal(toJson('galaxyCluster', generateAt(alone.address)), toJson('galaxyCluster', alone));
      const lone = lib.generateSystem('alone');
      assert.equal(toJson('starSystem', generateAt(lone.address)), toJson('starSystem', lone));
      const planet = lib.generatePlanet('moony');
      assert.equal(toJson('planet', generateAt(planet.address)), toJson('planet', planet));
      for (const moon of planet.moons) {
        assert.equal(toJson('moon', generateAt(moon.address)), toJson('moon', moon));
      }
    });

    test('hooks run on the way down (C# Every_object_reached_by_At)', () => {
      const hooks = {
        onCluster: c => ({...c, custom: withCustom(c.custom, 'sector', c.name)}),
        onGalaxy: g => ({...g, custom: withCustom(g.custom, 'campaign', 'alpha')}),
        onSystem: s => ({...s, custom: withCustom(s.custom, 'faction', 'x')}),
        onPlanet: p => ({...p, custom: withCustom(p.custom, 'colony', 'yes')}),
      };
      const options = {systems: 30};
      const galaxy = lib.generateGalaxy('hooked', options, hooks);
      assert.equal(generateAt(galaxy.address, options, hooks).custom.campaign, 'alpha');
      const system = galaxy.system(2);
      assert.equal(toJson('starSystem', generateAt(system.address, options, hooks)), toJson('starSystem', system));
      const link = linkTo(system.address, options);
      assert.equal(toJson('starSystem', generateAt(link, undefined, hooks)), toJson('starSystem', system));
      const universe = lib.generateUniverse('hooked', undefined, hooks);
      const cluster = generateAt(universe.cluster(1).address, undefined, hooks);
      assert.equal(cluster.custom.sector, cluster.name);
      const lonePlanet = generateAt('v1-moony/planet', undefined, hooks);
      assert.equal(lonePlanet.custom.colony, 'yes');
    });

    test('links carry options, and the defaults give the bare address', () => {
      assert.equal(linkTo('v1-a/galaxy', {}), 'v1-a/galaxy');
      assert.equal(linkTo('v1-a/galaxy/system/3', {systems: 120}), 'v1-a/galaxy/system/3?systems=120');
      assert.throws(() => linkTo('nope', {}), SyntaxError);
      assert.throws(() => linkTo('v1-a/galaxy', {systems: -1}), RangeError);
      assert.throws(() => generateAt('v1-a/galaxy?systems=120', {systems: 120}), {message: /pass a link or options, not both/u});
    });

    test('refuses addresses that name nothing, with the C# messages', () => {
      assert.throws(() => generateAt('nope'), SyntaxError);
      assert.throws(() => generateAt('v2-a/galaxy'), {message: 'This package generates version 1; the address asks for version 2.'});
      assert.throws(() => generateAt('v1-a/star'), {message: /"star" is not a level this package generates/u});
      assert.throws(() => generateAt('v1-a/galaxy/planet/0'), {message: 'Below v1-a/galaxy comes a system; the address has "planet".'});
      assert.throws(() => generateAt('v1-a/universe/galaxy/0'), {message: /comes a cluster or void/u});
      assert.throws(() => generateAt('v1-a/system/moon/0'), {message: /comes a planet, station or belt/u});
      assert.throws(() => generateAt('v1-a/galaxy/system/9999', {systems: 20}), {message: /has 20 systems \(numbered 0 to 19\); the address asks for system 9999\. Were the same options/u});
      assert.throws(() => generateAt('v1-a/cluster/galaxy/999'), {message: /galaxies \(numbered/u});
      assert.throws(() => generateAt('v1-a/system/planet/0/moon/0/moon/0'), {message: /Nothing in this package lies below a moon|has 0 moons/u});
      assert.throws(() => generateAt('v1-a/planet/moon/0/moon/1'), {message: /Nothing in this package lies below a moon|has 0 moons/u});
      assert.throws(() => generateAt('v1-a/universe/void/0/system/0/station/999'), {message: /stations \((?:none|numbered)/u});
      assert.throws(() => generateAt('v1-a/universe/void/0/system/0/belt/999'), {message: /belts \((?:none|numbered)/u});
    });
  });
}
