// System.json from the C# UniverseGenerator 1.0.0 (GoldenSystemTests.cs builds it): systems alone, by preset.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden, writeSystem} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`system.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      const groups = [
        ['default', ['my-seed', '42', '-42', '', 'Andromeda 7', 'a/b c', 's1', 's2', 's3', 's4', 's5', 's6'], lib.Preset.default],
        ['plausible', ['p1', 'p2', 'p3'], lib.Preset.plausible],
        ['weird', ['w1', 'w2', 'w3'], {...lib.Preset.default, weirdness: 100, maxPlanetsPerSystem: 3}],
      ];
      for (const [group, seeds, options] of groups) {
        w.name(group).beginArray();
        for (const seed of seeds) {
          writeSystem(w, lib.generateSystem(seed, options));
        }

        w.endArray();
      }

      w.endObject();
      assertGolden('system.json', w.toString());
    });
  });
}
