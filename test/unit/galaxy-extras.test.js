// Branches of the galaxy extras that the lone-galaxy goldens do not reach (an active core's radiation zone).
import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  describe(`galaxy extras (${name} build)`, () => {
    test('an active core adds the Core Glare over the systems inside it', () => {
      const g = lib.generateGalaxy('my-seed');
      const lanes = g.lanes.map(l => [l.a, l.b, l.bridge]);
      const quiet = lib.generateGalaxyExtras(1n, lanes, g.core, g.regions, g.map);
      const active = lib.generateGalaxyExtras(1n, lanes, g.core, g.regions, g.map, 'Quasar', 300);
      assert.equal(active.hazards.length, quiet.hazards.length + 1);
      const glare = active.hazards.at(-1);
      assert.equal(glare.name, 'the Core Glare');
      assert.equal(glare.kind, 'RadiationZone');
      assert.ok(glare.systems.length > 0);
      assert.equal(lib.generateGalaxyExtras(1n, lanes, g.core, g.regions, g.map, 'Seyfert', 0).hazards.length, quiet.hazards.length);
    });
  });
}
