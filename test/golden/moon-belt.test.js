// Moon-belt.json from the C# UniverseGenerator 1.0.0 (GoldenMoonBeltTests.cs builds it): the moon and belt levels'
// fields for lone planets, systems and a galaxy, and one moon and one belt of every kind in full.
import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';
import {
  assertGolden,
  writeBelt,
  writeBeltDetail,
  writeMoon,
  writeMoonDetail,
} from '../helpers/golden-json.js';

// The C# enum orders: the SortedDictionary in the C# test writes the kinds in this order.
const moonKinds = ['Barren', 'Ice', 'Volcanic', 'Ocean', 'Hazy', 'Garden'];
const beltKinds = ['Asteroid', 'Ice'];

function writeSystem(w, s) {
  w.beginObject().name('address').string(s.address).name('moons').beginArray();
  for (const p of s.planets) {
    for (const m of p.moons) {
      writeMoonDetail(w, m);
    }
  }

  w.endArray().name('belts').beginArray();
  for (const b of s.belts) {
    writeBeltDetail(w, b);
  }

  w.endArray().endObject();
}

for (const {name, lib} of builds) {
  describe(`moon-belt.json (${name} build)`, () => {
    test('matches the golden file as text', () => {
      const w = new lib.JsonWriter(true);
      w.beginObject().name('generatorVersion').int(lib.generatorVersion);
      w.name('loneMoons').beginArray();
      const groups = [
        [['my-seed', '42', '-42', '', 'Andromeda 7', 'a/b c', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'], lib.Preset.default],
        [['p1', 'p2', 'p3'], lib.Preset.plausible],
        [['w1', 'w2', 'w3'], {...lib.Preset.default, weirdness: 100}],
      ];
      for (const [seeds, options] of groups) {
        for (const seed of seeds) {
          for (const m of lib.generatePlanet(seed, options).moons) {
            writeMoonDetail(w, m);
          }
        }
      }

      w.endArray();
      w.name('inSystems').beginArray();
      for (const seed of ['my-seed', '42', 's1', 's2', 's3', 's4']) {
        writeSystem(w, lib.generateSystem(seed));
      }

      w.endArray();
      w.name('inGalaxy').beginArray();
      const galaxy = lib.generateGalaxy('my-seed');
      for (const index of [0, galaxy.core]) {
        writeSystem(w, galaxy.system(index));
      }

      w.endArray();

      // The first moon of each kind and belt of each kind in systems "k0", "k1" ..., in full.
      const moons = new Map();
      const belts = new Map();
      for (let i = 0; moons.size < 6 || belts.size < 2; i++) {
        const system = lib.generateSystem(`k${i}`);
        for (const p of system.planets) {
          for (const m of p.moons) {
            if (!moons.has(m.kind)) {
              moons.set(m.kind, m);
            }
          }
        }

        for (const b of system.belts) {
          if (!belts.has(b.kind)) {
            belts.set(b.kind, b);
          }
        }

        assert.ok(i < 10_000, 'every moon and belt kind occurs');
      }

      w.name('moonOfEachKind').beginArray();
      for (const kind of moonKinds) {
        const m = moons.get(kind);
        w.beginArray();
        writeMoon(w, m);
        writeMoonDetail(w, m);
        w.endArray();
      }

      w.endArray();
      w.name('beltOfEachKind').beginArray();
      for (const kind of beltKinds) {
        const b = belts.get(kind);
        w.beginArray();
        writeBelt(w, b);
        writeBeltDetail(w, b);
        w.endArray();
      }

      w.endArray().endObject();
      assertGolden('moon-belt.json', w.toString());
    });
  });
}
