// Ports of TableTests.cs and the option checks that need no galaxy; the galaxy cases come with Stage 2's galaxy port.
import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  const {GeneratorTables, Preset, validateOptions, resolveOptions, generateStarName, generateStarNames, tableIds} = lib;
  describe(`options and tables (${name} build)`, () => {
    test('the built-in tables round trip and keep every id', () => {
      const json = GeneratorTables.default.toJson(true);
      const copy = GeneratorTables.fromJson(json.replace('"id": "default"', '"id": "copy"'));
      assert.equal(copy.id, 'copy');
      assert.deepEqual(copy.tables.map(t => t.id), [...tableIds]);
      assert.deepEqual(copy.tables, GeneratorTables.default.tables);
      assert.equal(GeneratorTables.find('default'), GeneratorTables.default);
      assert.equal(copy.table('moon-kinds.giant').entries.length, 5);
    });

    test('registered tables steer star classes', () => {
      const red = GeneratorTables.default.with('red-sky', {id: 'star-classes.mature', entries: [{name: 'M', weight: 1}]});
      GeneratorTables.register(red);
      assert.equal(GeneratorTables.find('red-sky'), red);
      const names = generateStarNames('x', 50, undefined, {tables: 'red-sky'});
      assert.ok(names.every(n => n.class === 'M'));
      assert.throws(() => GeneratorTables.register(GeneratorTables.default), /belongs to the built-in/u);
    });

    const bad = [
      ['{"id":"x","tables":[{"id":"star-classes.ancient","entries":[]}]}', '"star-classes.ancient" is not a table'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Lava","weight":1}]}]}', '"Lava" is not a choice of moon-kinds.giant'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Ice","weight":0}]}]}', 'moon-kinds.giant needs at least one weight above 0'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Ice","weight":-2}]}]}', 'the weight of Ice must be 0 to 1,000,000'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Ice","weight":1},{"name":"Ice","weight":2}]}]}', 'lists "Ice" twice'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Ice","weight":1}]},{"id":"moon-kinds.giant","entries":[]}]}', 'appears twice'],
      ['{"id":"My Mod"}', 'A tables id is 1 to 40 lowercase letters'],
      ['[]', 'expected {'],
      ['{"name":"x"}', '"name" is not a key of a table set'],
      ['{"tables":[]}', 'the table set has no "id"'],
      ['{"schema":"other","id":"x"}', 'the schema is "other"'],
      ['{"id":1}', 'expected "'],
      ['{"id":"x","tables":{}}', 'expected ['],
      ['{"id":"x","tables":[1]}', 'expected {'],
      ['{"id":"x","tables":[{"entries":[]}]}', 'a table has no "id"'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","x":1}]}', '"x" is not a key of a table'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Ice","weight":1.5}]}]}', 'expected a whole number'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"weight":1}]}]}', 'an entry has no "name"'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Ice"}]}]}', 'an entry has no "weight"'],
      ['{"id":"x","tables":[{"id":"moon-kinds.giant","entries":[{"name":"Ice","w":1}]}]}', '"w" is not a key of an entry'],
    ];
    for (const [json, message] of bad) {
      test(`refuses ${json}`, () => {
        assert.throws(() => GeneratorTables.fromJson(json), error => error.message.includes(message));
      });
    }

    test('a tables id must be text', () => {
      assert.throws(() => new GeneratorTables(undefined, []), TypeError);
    });

    test('options are checked in the C# order with its messages', () => {
      const cases = [
        [{weirdness: 101}, 'Weirdness must be 0 to 100'],
        [{maxPlanetsPerSystem: -1}, 'MaxPlanetsPerSystem must be 0 to 20'],
        [{systems: 0}, 'Systems must be 1 to 2000'],
        [{arms: 5}, 'Arms must be 2 to 4'],
        [{extraLanes: 1.5}, 'ExtraLanes must be 0 to 100'],
        [{dangerShift: 6}, 'DangerShift must be -5 to 5'],
        [{shape: 'Cube'}, 'Shape must be a GalaxyShape'],
        [{clusterKind: 'Big'}, 'ClusterKind must be Auto, Group or Cluster'],
        [{epoch: 'Ancient'}, 'Epoch must be Auto'],
        [{names: 'Silly'}, 'Names must be Catalogue or Invented'],
        [{require: 512}, 'Require must combine Guarantee flags'],
        [{tables: 'Bad Id'}, 'A tables id'],
        [{tables: 'never-registered'}, 'No tables are registered as "never-registered"'],
        [{starMix: 'Odd'}, 'StarMix must be Game or Plausible'],
      ];
      for (const [changes, message] of cases) {
        assert.throws(() => validateOptions(resolveOptions(changes)), error => error.message.includes(message), message);
      }

      validateOptions({...Preset.roguelike, arms: 3});
      assert.equal(resolveOptions(), Preset.default);
    });

    test('star names: seeds, counts and classes', () => {
      assert.deepEqual(generateStarName('my-seed'), generateStarNames('my-seed', 3)[0]);
      assert.deepEqual(generateStarNames(42, 5), generateStarNames('42', 5));
      assert.deepEqual(generateStarNames(42n, 5), generateStarNames('42', 5));
      assert.throws(() => generateStarNames('x', 0), /Count must be 1 to 1000/u);
      assert.throws(() => generateStarNames('x'.repeat(201)), /at most 200 characters/u);
      assert.throws(() => generateStarNames(null), TypeError);
      assert.throws(() => generateStarNames(1.5), /whole number/u);
      for (const c of lib.starClasses) {
        const names = generateStarNames('tool', 1000, c);
        assert.equal(new Set(names.map(n => n.name)).size, 1000, c);
      }

      const hip = generateStarNames('hip', 1000, 'B').filter(n => n.name.startsWith('HIP '));
      assert.ok(hip.length > 0);
    });
  });
}
