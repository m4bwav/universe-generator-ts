// Diagnostics.json from the C# UniverseGenerator 1.0.0 (DiagnosticsTests.cs builds it): each case's options code, the
// warnings of checking its options, its system count and the galaxy's warnings.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`diagnostics.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const d = lib.Preset.default;
      const cases = [
        ['my-seed', d],
        ['small-spiral', {...d, systems: 40, shape: 'Spiral'}],
        ['ring-arms', {...d, shape: 'Ring', arms: 3}],
        ['auto-arms', {...d, arms: 2}],
        ['auto-big-arms', {...d, systems: 120, arms: 4}],
        ['crowded', {...d, systems: 2000, shape: 'Ring'}],
      ];
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion).name('cases').beginArray();
      for (const [seed, options] of cases) {
        w.beginObject().name('seed').string(seed).name('options').string(lib.optionsToCode(options));
        w.name('check').beginArray();
        for (const warning of lib.checkOptions(options)) {
          w.beginArray().string(warning.code).string(warning.message).endArray();
        }

        const galaxy = lib.generateGalaxy(seed, options);
        w.endArray().name('systems').int(galaxy.map.length).name('warnings').beginArray();
        for (const warning of galaxy.warnings) {
          w.beginArray().string(warning.code).string(warning.message).endArray();
        }

        w.endArray().endObject();
      }

      w.endArray().endObject();
      assertGolden('diagnostics.json', w.toString());
    });
  });
}
