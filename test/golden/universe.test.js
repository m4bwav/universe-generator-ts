// Universe.json from the C# UniverseGenerator 1.0.0 (GoldenUniverseTests.cs builds it): four universes with every
// cluster and galaxy summary, and the merging galaxy's map with the system its tidal link opens at.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {
  assertGolden,
  writeCluster,
  writeClusterGalaxy,
  writeGalaxy,
  writeSystem,
  writeUniverse,
  writeUniverseGalaxy,
} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`universe.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const d = lib.Preset.default;
      const cases = [
        ['my-seed', d],
        ['42', d],
        ['ancient', {...d, epoch: 'Old'}],
        ['small', {...lib.Preset.plausible, epoch: 'Young', systems: 20}],
      ];
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      w.name('universes').beginArray();
      for (const [seed, options] of cases) {
        const u = lib.generateUniverse(seed, options);
        w.beginObject().name('universe');
        writeUniverse(w, u);
        w.name('clusters').beginArray();
        for (const c of u.clusters) {
          w.beginObject().name('cluster');
          writeCluster(w, c);
          w.name('galaxies').beginArray();
          for (let i = 0; i < c.map.length; i++) {
            const g = c.galaxy(i);
            w.beginArray();
            writeUniverseGalaxy(w, g);
            writeClusterGalaxy(w, g);
            w.endArray();
          }

          w.endArray().endObject();
        }

        w.endArray();
        const pair = u.cluster(u.merger.cluster).galaxy(0);
        w.name('frontier').beginObject().name('galaxy');
        writeGalaxy(w, pair);
        w.name('system');
        for (const gate of pair.gates) {
          if (gate.tier === 'Tidal') {
            writeSystem(w, pair.system(gate.system));
          }
        }

        w.endObject().endObject();
      }

      w.endArray().endObject();
      assertGolden('universe.json', w.toString());
    });
  });
}
