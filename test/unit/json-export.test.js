import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  const {toJson} = lib;
  describe(`toJson (${name} build)`, () => {
    test('an export starts with its schema and type, compact or indented', () => {
      assert.ok(toJson('planet', lib.generatePlanet('my-seed')).startsWith('{"schema":"universe-generator/1","type":"planet","address":"v1-my-seed/planet",'));
      assert.ok(toJson('starSystem', lib.generateSystem('my-seed'), {indented: true}).startsWith('{\n  "schema": "universe-generator/1",\n  "type": "starSystem",\n'));
      assert.equal(lib.exportSchema, 'universe-generator/1');
    });

    test('lazy lists are null unless children are asked for', () => {
      const galaxy = lib.generateGalaxy('my-seed', lib.Preset.pocket);
      assert.ok(toJson('galaxy', galaxy).includes('"systems":null'));
      assert.ok(!toJson('galaxy', galaxy, {children: true}).includes('"systems":null'));
      assert.ok(toJson('galaxyCluster', lib.generateCluster('my-seed')).includes('"galaxies":null'));
      assert.ok(toJson('cosmicVoid', lib.generateUniverse('my-seed').voids[0]).includes('"systems":null'));
    });

    test('custom fields are written in ordinal order', () => {
      const galaxy = lib.generateGalaxy('my-seed', lib.Preset.pocket);
      const station = galaxy.map.map((_, i) => galaxy.system(i)).find(s => s.stations.length > 0).stations[0];
      const json = toJson('station', {...station, custom: {b: '2', B: '3', a: '1'}});
      assert.ok(json.endsWith('"custom":{"B":"3","a":"1","b":"2"}}'));
      assert.ok(toJson('station', station).endsWith('"custom":{}}'));
    });
  });
}
