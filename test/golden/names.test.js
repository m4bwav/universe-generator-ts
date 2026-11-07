// Names.json from the C# UniverseGenerator 1.0.0 (InventedNameTests.cs builds it): invented names for galaxies, systems and planets.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`names.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const invented = {...lib.Preset.default, names: 'Invented'};
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      w.name('galaxies').beginArray();
      for (const seed of ['my-seed', '42', 'Andromeda 7']) {
        w.beginArray();
        for (const m of lib.generateGalaxy(seed, invented).map) {
          w.string(m.name);
        }

        w.endArray();
      }

      w.endArray().name('systems').beginArray();
      for (const seed of ['my-seed', '42', 's1', 's2']) {
        const s = lib.generateSystem(seed, invented);
        w.beginObject().name('name').string(s.name).name('planets').beginArray();
        for (const p of s.planets) {
          w.string(p.name);
        }

        w.endArray().endObject();
      }

      w.endArray().name('planets').beginArray();
      for (const seed of ['my-seed', '42', 's1', 's2']) {
        w.string(lib.generatePlanet(seed, invented).name);
      }

      w.endArray().endObject();
      assertGolden('names.json', w.toString());
    });
  });
}
