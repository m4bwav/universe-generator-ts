// Planet.json from the C# UniverseGenerator 1.0.0 (GoldenPlanetTests.cs builds it): lone planets in full, and the
// planet-level fields of the planets of some systems and of a galaxy.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden, writeLonePlanet, writePlanetDetail} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`planet.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      const groups = [
        ['alone', ['my-seed', '42', '-42', '', 'Andromeda 7', 'a/b c', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'], lib.Preset.default],
        ['plausible', ['p1', 'p2', 'p3'], lib.Preset.plausible],
        ['weird', ['w1', 'w2', 'w3'], {...lib.Preset.default, weirdness: 100}],
      ];
      for (const [group, seeds, options] of groups) {
        w.name(group).beginArray();
        for (const seed of seeds) {
          writeLonePlanet(w, lib.generatePlanet(seed, options));
        }

        w.endArray();
      }

      w.name('inSystems').beginArray();
      for (const seed of ['my-seed', '42', 's1', 's2', 's3', 's4']) {
        for (const p of lib.generateSystem(seed).planets) {
          writePlanetDetail(w, p);
        }
      }

      w.endArray();
      w.name('inGalaxy').beginArray();
      const galaxy = lib.generateGalaxy('my-seed');
      for (const index of [0, galaxy.core]) {
        for (const p of galaxy.system(index).planets) {
          writePlanetDetail(w, p);
        }
      }

      w.endArray().endObject();
      assertGolden('planet.json', w.toString());
    });
  });
}
