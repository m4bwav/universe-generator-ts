// Tables.json from the C# UniverseGenerator 1.0.0 (TableTests.cs builds it): the default tables' JSON and two registered table sets.
import {before, describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden, writeGalaxy, writeSystem} from '../helpers/golden-json.js';

const only = (id, ...entries) => ({id, entries: entries.map(([name, weight]) => ({name, weight}))});

for (const {name, lib} of builds) {
  describe(`tables.json (${name} build)`, () => {
    before(() => {
      const sets = [
        lib.GeneratorTables.default.with('red-sky', only('star-classes.young', ['M', 1]), only('star-classes.mature', ['M', 3], ['K', 1]), only('star-classes.old', ['M', 1])),
        lib.GeneratorTables.default.with('gardens', only('planet-kinds.temperate', ['Garden', 1]), only('moon-kinds.giant', ['Ocean', 1])),
      ];
      // Each build has its own registry, so each registers both sets once.
      for (const tables of sets) {
        lib.GeneratorTables.register(tables);
      }
    });

    test('matches the golden file as text', () => {
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion).name('default').string(lib.GeneratorTables.default.toJson());
      w.name('cases').beginArray();
      for (const id of ['red-sky', 'gardens']) {
        const galaxy = lib.generateGalaxy('my-seed', {...lib.Preset.pocket, tables: id});
        w.beginObject().name('tables').string(id).name('galaxy');
        writeGalaxy(w, galaxy);
        w.name('systems').beginArray();
        for (let i = 0; i < 3; i++) {
          writeSystem(w, galaxy.system(i));
        }

        w.endArray().endObject();
      }

      w.endArray().endObject();
      assertGolden('tables.json', w.toString());
    });
  });
}
