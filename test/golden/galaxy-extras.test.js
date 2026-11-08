// Galaxy-extras.json from the C# UniverseGenerator 1.0.0 (GoldenExtrasTests.cs builds it): the extras of the eight
// galaxies of galaxy.json, then of two cluster galaxies and a universe's merging galaxy. Clusters and universes are not
// ported yet, so this checks the file up to the end of the eighth galaxy; the whole file once they are.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGoldenPrefix, writeExtras} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`galaxy-extras.json (${name} build)`, () => {
    test('matches the golden file as text, as far as the lone galaxies go', () => {
      const d = lib.Preset.default;
      const cases = [
        ['my-seed', d],
        ['42', d],
        ['Andromeda 7', d],
        ['spiral', {...d, systems: 120}],
        ['bar', {...d, systems: 80, shape: 'Barred'}],
        ['ring', {...lib.Preset.plausible, systems: 30, shape: 'Ring'}],
        ['one', {...d, systems: 1}],
        ['two', {...d, systems: 2}],
      ];
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      w.name('galaxies').beginArray();
      for (const [seed, options] of cases) {
        writeExtras(w, lib.generateGalaxy(seed, options));
      }

      w.endArray().endObject();
      const text = w.toString();
      // The closing "    }", "  ]", "}" and final newline of the cut document; the golden goes on with "    }," and the cluster galaxies.
      assertGoldenPrefix('galaxy-extras.json', text, 4);
      const golden = readFileSync(new URL('../golden/v1/galaxy-extras.json', import.meta.url), 'utf8').split('\n');
      assert.equal(golden[text.split('\n').length - 4], '    },');
    });
  });
}
