// Cluster.json from the C# UniverseGenerator 1.0.0 (GoldenClusterTests.cs builds it): six clusters with every galaxy's
// summary, the smallest active galaxy's and the last galaxy's maps, then the lone galaxies of galaxy.json as summaries.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {
  assertGolden,
  writeCluster,
  writeClusterGalaxy,
  writeGalaxy,
  writeSystem,
} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`cluster.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const d = lib.Preset.default;
      const cases = [
        ['my-seed', d],
        ['42', d],
        ['Virgo', {...d, clusterKind: 'Cluster'}],
        ['local', {...d, clusterKind: 'Group'}],
        ['small', {...lib.Preset.plausible, clusterKind: 'Cluster', systems: 20}],
        ['one', {...d, clusterKind: 'Group', systems: 1}],
      ];
      const loneCases = [
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
      w.name('clusters').beginArray();
      for (const [seed, options] of cases) {
        const c = lib.generateCluster(seed, options);
        w.beginObject().name('cluster');
        writeCluster(w, c);
        w.name('galaxies').beginArray();
        for (let i = 0; i < c.map.length; i++) {
          writeClusterGalaxy(w, c.galaxy(i));
        }

        w.endArray();
        const active = c.map.filter(entry => entry.coreActivity !== 'Quiet').toSorted((a, b) => a.systems - b.systems || a.index - b.index)[0];
        const last = c.map.length - 1;
        const shown = active === undefined || active.index === last ? [last] : [active.index, last];
        w.name('maps').beginArray();
        for (const i of shown) {
          const g = c.galaxy(i);
          w.beginObject().name('galaxy');
          writeGalaxy(w, g);
          w.name('system');
          writeSystem(w, g.system(0));
          w.endObject();
        }

        w.endArray().endObject();
      }

      w.endArray();
      w.name('loneGalaxies').beginArray();
      for (const [seed, options] of loneCases) {
        writeClusterGalaxy(w, lib.generateGalaxy(seed, options));
      }

      w.endArray().endObject();
      assertGolden('cluster.json', w.toString());
    });
  });
}
