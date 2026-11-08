// Export.json from the C# UniverseGenerator 1.0.0 (ExportTests.cs builds it): one compact export of each type, held as
// strings, with the keys added after the file was written removed (JsonKeyFilter.cs).
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden} from '../helpers/golden-json.js';
import {addedLater, withoutKeys} from '../helpers/json-key-filter.js';

function samples(lib) {
  const {toJson} = lib;
  const system = lib.generateSystem('my-seed');
  const galaxy = lib.generateGalaxy('my-seed', lib.Preset.pocket);
  const systems = galaxy.map.map((_, i) => galaxy.system(i));
  const withMoons = systems.flatMap(s => s.planets).find(p => p.moons.length > 0);
  const withBelt = systems.find(s => s.belts.length > 0 && s.stations.length > 0);
  const universe = lib.generateUniverse('my-seed');
  return [
    toJson('starSystem', system),
    toJson('planet', lib.generatePlanet('my-seed')),
    toJson('moon', withMoons.moons[0]),
    toJson('belt', withBelt.belts[0]),
    toJson('station', withBelt.stations[0]),
    toJson('galaxy', galaxy),
    toJson('galaxy', galaxy, {children: true}),
    toJson('galaxyCluster', lib.generateCluster('my-seed')),
    toJson('cosmicVoid', universe.voids[0], {children: true}),
    toJson('universe', universe),
  ];
}

for (const {name, lib} of builds) {
  describe(`export.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion).name('exports').beginArray();
      for (const json of samples(lib)) {
        w.string(withoutKeys(json, addedLater));
      }

      w.endArray().endObject();
      assertGolden('export.json', w.toString());
    });
  });
}
