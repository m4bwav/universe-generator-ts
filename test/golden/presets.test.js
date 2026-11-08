// Presets.json from the C# UniverseGenerator 1.0.0 (GoldenPresetTests.cs builds it): galaxies of the presets and of the
// arms, lanes and danger options, each with its first system, and two lone systems with a danger shift.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden, writeGalaxy, writeSystem} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  describe(`presets.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const p = lib.Preset;
      const d = p.default;
      const cases = [
        ['my-seed', p.pocket],
        ['my-seed', p.roguelike],
        ['my-seed', p.cozy],
        ['my-seed', p.epic],
        ['spiral', {...d, systems: 120, arms: 4}],
        ['bar', {
          ...d, systems: 80, shape: 'Barred', arms: 2,
        }],
        ['42', {...d, extraLanes: 0}],
        ['42', {...d, extraLanes: 100}],
        ['42', {...d, dangerShift: 5}],
        ['42', {...d, dangerShift: -5}],
      ];
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      w.name('galaxies').beginArray();
      for (const [seed, options] of cases) {
        const g = lib.generateGalaxy(seed, options);
        w.beginObject().name('options').string(lib.optionsToCode(options)).name('galaxy');
        writeGalaxy(w, g);
        w.name('systems').beginArray();
        writeSystem(w, g.system(0));
        w.endArray().endObject();
      }

      w.endArray();
      w.name('systems').beginArray();
      for (const shift of [-3, 2]) {
        writeSystem(w, lib.generateSystem('my-seed', {...d, dangerShift: shift}));
      }

      w.endArray().endObject();
      assertGolden('presets.json', w.toString());
    });
  });
}
