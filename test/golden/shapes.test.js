// Shapes.json from the C# UniverseGenerator 1.0.0 (GalaxyShapeTests.cs builds it): the Colliding, Starburst and Clustered shapes.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden, writeGalaxy} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`shapes.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion).name('galaxies').beginArray();
      for (const shape of ['Colliding', 'Starburst', 'Clustered']) {
        for (const [seed, systems] of [['my-seed', 60], ['42', 150]]) {
          const g = lib.generateGalaxy(seed, {...lib.Preset.default, shape, systems});
          w.beginObject().name('type').string(g.type).name('descriptor').string(g.descriptor).name('galaxy');
          writeGalaxy(w, g);
          w.endObject();
        }
      }

      w.endArray().endObject();
      assertGolden('shapes.json', w.toString());
    });
  });
}
