// Galaxy-extras.json from the C# UniverseGenerator 1.0.0 (GoldenExtrasTests.cs builds it): the extras of the eight
// galaxies of galaxy.json, then of two cluster galaxies and a universe's merging galaxy.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden, writeExtras} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`galaxy-extras.json (${name} build)`, () => {
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
        writeExtras(w, lib.generateGalaxy(seed, options));
      }

      const cluster = lib.generateCluster('Virgo', {...d, clusterKind: 'Cluster'});
      const active = cluster.map.find(entry => entry.coreActivity !== 'Quiet');
      writeExtras(w, cluster.galaxy(active.index));
      writeExtras(w, cluster.galaxy(cluster.map.length - 1));
      const universe = lib.generateUniverse('my-seed');
      writeExtras(w, universe.cluster(universe.merger.cluster).galaxy(0));
      w.endArray().endObject();
      assertGolden('galaxy-extras.json', w.toString());
    });
  });
}
