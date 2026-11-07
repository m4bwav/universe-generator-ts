// Galaxy.json from the C# UniverseGenerator 1.0.0 (GoldenGalaxyTests.cs builds it): galaxies with their first and core systems in full.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden, writeGalaxy, writeSystem} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`galaxy.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
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
        const g = lib.generateGalaxy(seed, options);
        w.beginObject().name('galaxy');
        writeGalaxy(w, g);
        w.name('systems').beginArray();
        writeSystem(w, g.system(0));
        if (g.core !== 0) {
          writeSystem(w, g.system(g.core));
        }

        w.endArray().endObject();
      }

      w.endArray().endObject();
      assertGolden('galaxy.json', w.toString());
    });
  });
}
