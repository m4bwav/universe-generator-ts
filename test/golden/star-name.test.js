// Star-name.json from the C# UniverseGenerator 1.0.0 (StarNameTests.cs builds it): 25 names for each seed, class and preset.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

const golden = JSON.parse(readFileSync(new URL('v1/star-name.json', import.meta.url), 'utf8'));
const presets = ['default', 'plausible', 'default', 'default', 'default', 'default'];

for (const {name, lib} of builds) {
  describe(`star-name.json (${name} build)`, () => {
    for (const [i, list] of golden.lists.entries()) {
      test(`seed ${JSON.stringify(list.seed)}, class ${list.class}`, () => {
        const names = lib.generateStarNames(list.seed, 25, list.class ?? undefined, lib.Preset[presets[i]]);
        assert.deepEqual(names.map(n => [n.name, n.class]), list.names);
      });
    }
  });
}
