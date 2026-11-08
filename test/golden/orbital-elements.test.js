// Orbital-elements.json from the C# UniverseGenerator 1.0.0 (OrbitalElementTests.cs builds it): planets' eccentricity,
// inclination and periapsis angle, on their own stream.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden} from '../helpers/golden-json.js';

function write(w, p) {
  w.beginObject().name('address').string(p.address).name('eccentricity').number(p.eccentricity, 3);
  w.name('inclination').number(p.inclination, 1).name('periapsisAngle').number(p.periapsisAngle, 1).endObject();
}

for (const {name, lib} of builds) {
  describe(`orbital-elements.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      w.name('alone').beginArray();
      for (const seed of ['my-seed', '42', '-42', '', 'Andromeda 7', 's1', 's2', 's3']) {
        write(w, lib.generatePlanet(seed));
      }

      w.endArray().name('inSystems').beginArray();
      for (const seed of ['my-seed', '42', 's1', 's2', 's3', 's4']) {
        for (const p of lib.generateSystem(seed).planets) {
          write(w, p);
        }
      }

      for (const p of lib.generateGalaxy('my-seed').system(31).planets) {
        write(w, p);
      }

      w.endArray().endObject();
      assertGolden('orbital-elements.json', w.toString());
    });
  });
}
