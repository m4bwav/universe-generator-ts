// The C# test-side writers (GalaxyJson.cs, SystemJson.cs) and Repo.AssertGolden: the golden fields listed explicitly, and
// a text comparison that names the first line that differs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/**
Compares generated text with a golden file under test/golden/v1, as text.
@param file
@param actual
*/
export function assertGolden(file, actual) {
  const expected = readFileSync(new URL(`../golden/v1/${file}`, import.meta.url), 'utf8');
  if (expected === actual) {
    return;
  }

  const e = expected.split('\n');
  const a = actual.split('\n');
  let line = 0;
  while (line < e.length && line < a.length && e[line] === a[line]) {
    line++;
  }

  assert.fail(`${file} differs at line ${line + 1}:\n  golden: ${e[line] ?? '(end)'}\n  actual: ${a[line] ?? '(end)'}`);
}

/**
GalaxyJson.Write.
@param w
@param g
*/
export function writeGalaxy(w, g) {
  w.beginObject();
  w.name('address').string(g.address).name('shape').string(g.shape).name('arms').int(g.arms);
  w.name('radius').number(g.radius, 3).name('core').int(g.core);
  w.name('regions').beginArray();
  for (const r of g.regions) {
    w.beginObject().name('name').string(r.name).name('age').string(r.age).name('theme').string(r.theme).name('centre').int(r.centre).endObject();
  }

  w.endArray();
  w.name('map').beginArray();
  for (const m of g.map) {
    w.beginObject().name('name').string(m.name).name('x').number(m.x, 3).name('y').number(m.y, 3).name('star').string(m.starClass);
    w.name('region').int(m.region).name('hops').int(m.hops).name('danger').int(m.danger).name('chokepoint').bool(m.chokepoint).endObject();
  }

  w.endArray();
  w.name('lanes').beginArray();
  for (const l of g.lanes) {
    w.beginArray().int(l.a).int(l.b).bool(l.bridge).endArray();
  }

  w.endArray().endObject();
}

function writeStar(w, s) {
  w.beginObject();
  w.name('class').string(s.class).name('spectralType').string(s.spectralType);
  w.name('mass').number(s.mass, 3).name('luminosity').number(s.luminosity, 5).name('radius').number(s.radius, 6);
  w.name('temperature').number(s.temperature, 0).name('colour').string(s.colour).name('description').string(s.description);
  w.endObject();
}

/**
SystemJson.Moon.
@param w
@param m
*/
export function writeMoon(w, m) {
  w.beginObject().name('name').string(m.name).name('kind').string(m.kind).name('orbit').number(m.orbit, 2).name('radius').number(m.radius, 0).endObject();
}

/**
SystemJson.Belt.
@param w
@param b
*/
export function writeBelt(w, b) {
  w.beginObject().name('kind').string(b.kind).name('inner').number(b.inner, 4).name('outer').number(b.outer, 4).endObject();
}

/**
SystemJson.Planet.
@param w
@param p
*/
export function writePlanet(w, p) {
  w.beginObject();
  w.name('address').string(p.address).name('name').string(p.name).name('kind').string(p.kind).name('zone').string(p.zone);
  w.name('orbit').number(p.orbit, 4).name('period').number(p.period, 2).name('mass').number(p.mass, 3).name('radius').number(p.radius, 3);
  w.name('rings').bool(p.rings).name('descriptor').string(p.descriptor);
  w.name('moons').beginArray();
  for (const m of p.moons) {
    writeMoon(w, m);
  }

  w.endArray().endObject();
}

/**
SystemJson.Write.
@param w
@param s
*/
export function writeSystem(w, s) {
  w.beginObject();
  w.name('address').string(s.address).name('name').string(s.name);
  w.name('age').string(s.age).name('danger').int(s.danger);
  w.name('star');
  writeStar(w, s.star);
  w.name('companion');
  if (s.companion === undefined) {
    w.null();
  } else {
    w.beginObject().name('orbit').string(s.companion.orbit).name('separation').number(s.companion.separation, 4).name('star');
    writeStar(w, s.companion.star);
    w.endObject();
  }

  w.name('habitableZone').beginArray().number(s.habitableZoneInner, 4).number(s.habitableZoneOuter, 4).endArray();
  w.name('frostLine').number(s.frostLine, 4);
  w.name('planets').beginArray();
  for (const p of s.planets) {
    writePlanet(w, p);
  }

  w.endArray();
  w.name('belts').beginArray();
  for (const b of s.belts) {
    writeBelt(w, b);
  }

  w.endArray();
  w.name('stations').beginArray();
  for (const st of s.stations) {
    w.beginObject().name('address').string(st.address).name('name').string(st.name).name('kind').string(st.kind).name('planet');
    if (st.planet === undefined) {
      w.null();
    } else {
      w.int(st.planet);
    }

    w.endObject();
  }

  w.endArray();
  w.name('landmarks').beginArray();
  for (const l of s.landmarks) {
    w.beginObject().name('kind').string(l.kind).name('outlier').bool(l.outlier).name('text').string(l.text).endObject();
  }

  w.endArray();
  w.name('tags').beginArray();
  for (const t of s.tags) {
    w.string(t);
  }

  w.endArray();
  w.name('descriptor').string(s.descriptor);
  w.endObject();
}
