// Hooks.json from the C# UniverseGenerator 1.0.0 (HookTests.cs builds it): a game's hooks (colonies on garden worlds, a
// faction on every system, a campaign on each galaxy) and the exports of the objects they ran on.
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {assertGolden} from '../helpers/golden-json.js';

for (const {name, lib} of builds) {
  const {toJson, withCustom} = lib;
  const game = {
    onPlanet: p => p.kind === 'Garden' ? {...p, name: p.name + ' (colony)', custom: withCustom(p.custom, 'colony', 'yes')} : p,
    onSystem: s => ({...s, custom: withCustom(withCustom(s.custom, 'faction', s.danger >= 7 ? 'pirates' : 'league'), 'planets', String(s.planets.length))}),
    onGalaxy: g => ({...g, custom: withCustom(g.custom, 'campaign', 'alpha')}),
    onCluster: c => ({...c, custom: withCustom(c.custom, 'sector', c.name)}),
    onUniverse: u => ({...u, custom: withCustom(u.custom, 'save', '1')}),
  };

  describe(`hooks.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const galaxy = lib.generateGalaxy('my-seed', lib.Preset.pocket, game);
      const exports = [toJson('galaxy', galaxy)];
      for (let i = 0; i < Math.min(4, galaxy.map.length); i++) {
        exports.push(toJson('starSystem', galaxy.system(i)));
      }

      exports.push(
        toJson('planet', lib.generatePlanet('my-seed', undefined, game)),
        toJson('starSystem', lib.generateSystem('my-seed', undefined, game)),
        lib.generateUniverse('my-seed', undefined, game).custom.save,
      );
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion).name('exports').beginArray();
      for (const json of exports) {
        w.string(json);
      }

      w.endArray().endObject();
      assertGolden('hooks.json', w.toString());
    });
  });
}
