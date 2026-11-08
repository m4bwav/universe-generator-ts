// Constraints.json from the C# UniverseGenerator 1.0.0 (ConstraintTests.cs builds it): guaranteed galaxies, their
// warnings, extras and the systems a guarantee changed.
/* eslint-disable no-bitwise -- Guarantee flags combine with | as in C#. */
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {
  assertGolden,
  writeExtras,
  writeGalaxy,
  writeSystem,
} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`constraints.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const g = lib.Guarantee;
      const stars = g.BlueStar | g.Giant | g.WhiteDwarf | g.NeutronStar | g.BlackHole | g.SunLikeStar;
      const every = stars | g.GardenWorld | g.OceanWorld | g.PrecursorSite;
      const cases = [
        ['my-seed', {...lib.Preset.default, require: every}],
        ['pocket', {...lib.Preset.pocket, require: g.GardenWorld | g.BlackHole}],
        ['tiny', {...lib.Preset.default, systems: 3, require: every}],
        ['bare', {
          ...lib.Preset.default, systems: 10, maxPlanetsPerSystem: 0, require: g.GardenWorld,
        }],
      ];
      const text = system => {
        const w = new lib.JsonWriter(false);
        writeSystem(w, system);
        return w.toString();
      };

      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion).name('cases').beginArray();
      for (const [seed, options] of cases) {
        const plain = lib.generateGalaxy(seed, {...options, require: g.None});
        const galaxy = lib.generateGalaxy(seed, options);
        w.beginObject().name('seed').string(seed).name('options').string(lib.optionsToCode(options)).name('warnings').beginArray();
        for (const warning of galaxy.warnings) {
          w.beginArray().string(warning.code).string(warning.message).endArray();
        }

        w.endArray().name('galaxy');
        writeGalaxy(w, galaxy);
        w.name('extras');
        writeExtras(w, galaxy);
        w.name('changedSystems').beginArray();
        for (let i = 0; i < galaxy.map.length; i++) {
          if (text(galaxy.system(i)) !== text(plain.system(i))) {
            writeSystem(w, galaxy.system(i));
          }
        }

        w.endArray().endObject();
      }

      w.endArray().endObject();
      assertGolden('constraints.json', w.toString());
    });
  });
}
