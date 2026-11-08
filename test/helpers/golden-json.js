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

/**
PlanetJson.Atmosphere.
@param w
@param a
*/
export function writeAtmosphere(w, a) {
  w.beginObject().name('class').string(a.class).name('pressure');
  if (a.pressure === undefined) {
    w.null();
  } else {
    w.number(a.pressure, 4);
  }

  w.name('gases').beginArray();
  for (const g of a.gases) {
    w.string(g);
  }

  w.endArray();
  w.name('lightestGasKept').number(a.lightestGasKept, 1).name('breathable').bool(a.breathable).name('why').string(a.why).endObject();
}

function writeBands(w, bands) {
  w.beginArray();
  for (const b of bands) {
    w.beginArray().int(b.from).int(b.to).number(b.share, 4).number(b.temperature, 0).string(b.biome).endArray();
  }

  w.endArray();
}

function writeBiomes(w, biomes) {
  w.beginArray();
  for (const b of biomes) {
    w.beginArray().string(b.biome).number(b.share, 2).endArray();
  }

  w.endArray();
}

function writeResources(w, r) {
  w.beginObject().name('metals').int(r.metals).name('rareElements').int(r.rareElements).name('ices').int(r.ices)
    .name('gases').int(r.gases).name('organics').int(r.organics).endObject();
}

function writeStrings(w, items) {
  w.beginArray();
  for (const s of items) {
    w.string(s);
  }

  w.endArray();
}

function writeNullableString(w, s) {
  if (s === undefined) {
    w.null();
  } else {
    w.string(s);
  }
}

/**
PlanetJson.Detail.
@param w
@param p
*/
export function writePlanetDetail(w, p) {
  w.beginObject();
  w.name('address').string(p.address).name('composition').string(p.composition);
  w.name('gravity').number(p.gravity, 2).name('escapeVelocity').number(p.escapeVelocity, 2).name('density').number(p.density, 2);
  w.name('insolation').number(p.insolation, 4).name('albedo').number(p.albedo, 2);
  w.name('temperature').number(p.temperature, 0).name('dayTemperature').number(p.dayTemperature, 0).name('nightTemperature').number(p.nightTemperature, 0);
  w.name('atmosphere');
  writeAtmosphere(w, p.atmosphere);
  w.name('water').number(p.water, 2).name('ice').number(p.ice, 2);
  w.name('rotation').number(p.rotation, 1).name('spin').string(p.spin).name('tilt').number(p.tilt, 1);
  w.name('bands');
  writeBands(w, p.bands);
  w.name('biomes');
  writeBiomes(w, p.biomes);
  w.name('life').string(p.life).name('flora').int(p.flora).name('fauna').int(p.fauna);
  w.name('traits');
  writeStrings(w, p.traits);
  w.name('anomaly');
  writeNullableString(w, p.anomaly);
  w.name('resources');
  writeResources(w, p.resources);
  w.name('hazard').int(p.hazard).name('hazards');
  writeStrings(w, p.hazards);
  w.name('similarity').number(p.similarity, 2).name('habitability').string(p.habitability);
  w.name('summary').string(p.summary);
  w.endObject();
}

/**
PlanetJson.Lone.
@param w
@param p
*/
export function writeLonePlanet(w, p) {
  w.beginObject().name('planet');
  writePlanet(w, p);
  w.name('detail');
  writePlanetDetail(w, p);
  w.endObject();
}

/**
MoonBeltJson.Moon.
@param w
@param m
*/
export function writeMoonDetail(w, m) {
  w.beginObject();
  w.name('address').string(m.address).name('descriptor').string(m.descriptor);
  w.name('distance').number(m.distance, 0).name('period').number(m.period, 3).name('composition').string(m.composition);
  w.name('density').number(m.density, 2).name('mass').number(m.mass, 6).name('gravity').number(m.gravity, 3).name('escapeVelocity').number(m.escapeVelocity, 2);
  w.name('insolation').number(m.insolation, 4).name('albedo').number(m.albedo, 2).name('tidalHeating').number(m.tidalHeating, 4);
  w.name('temperature').number(m.temperature, 0).name('dayTemperature').number(m.dayTemperature, 0).name('nightTemperature').number(m.nightTemperature, 0);
  w.name('atmosphere');
  writeAtmosphere(w, m.atmosphere);
  w.name('water').number(m.water, 2).name('ice').number(m.ice, 2).name('subsurfaceOcean').bool(m.subsurfaceOcean);
  w.name('rotation').number(m.rotation, 1).name('tilt').number(m.tilt, 1);
  w.name('bands');
  writeBands(w, m.bands);
  w.name('biomes');
  writeBiomes(w, m.biomes);
  w.name('life').string(m.life).name('flora').int(m.flora).name('fauna').int(m.fauna);
  w.name('traits');
  writeStrings(w, m.traits);
  w.name('anomaly');
  writeNullableString(w, m.anomaly);
  w.name('resources');
  writeResources(w, m.resources);
  w.name('hazard').int(m.hazard).name('hazards');
  writeStrings(w, m.hazards);
  w.name('similarity').number(m.similarity, 2).name('habitability').string(m.habitability);
  w.name('summary').string(m.summary);
  w.endObject();
}

/**
MoonBeltJson.Belt.
@param w
@param b
*/
export function writeBeltDetail(w, b) {
  const c = b.composition;
  w.beginObject();
  w.name('address').string(b.address).name('index').int(b.index).name('name').string(b.name);
  w.name('composition').beginObject().name('silicate').int(c.silicate).name('carbonaceous').int(c.carbonaceous)
    .name('metal').int(c.metal).name('ice').int(c.ice).endObject();
  w.name('mass').number(b.mass, 6).name('largestBody').number(b.largestBody, 0).name('temperature').number(b.temperature, 0);
  w.name('resources');
  writeResources(w, b.resources);
  w.name('summary').string(b.summary);
  w.endObject();
}

/**
ExtrasJson.Write.
@param w
@param g
*/
export function writeExtras(w, g) {
  w.beginObject().name('address').string(g.address);
  w.name('factions').beginArray();
  for (const f of g.factions) {
    w.beginObject().name('name').string(f.name).name('kind').string(f.kind).name('capital').int(f.capital);
    w.name('systems').int(f.systems).name('description').string(f.description).endObject();
  }

  w.endArray();
  w.name('holders').beginArray();
  for (const m of g.map) {
    if (m.faction === undefined) {
      w.null();
    } else {
      w.beginArray().int(m.faction).bool(m.contested).endArray();
    }
  }

  w.endArray();
  w.name('pointsOfInterest').beginArray();
  for (const p of g.pointsOfInterest) {
    w.beginObject().name('kind').string(p.kind).name('system').int(p.system).name('name').string(p.name).name('text').string(p.text);
    w.name('chainStep').int(p.chainStep).name('chainLength').int(p.chainLength).endObject();
  }

  w.endArray();
  w.name('hazards').beginArray();
  for (const h of g.hazards) {
    w.beginObject().name('kind').string(h.kind).name('name').string(h.name).name('x').number(h.x, 3).name('y').number(h.y, 3);
    w.name('radius').number(h.radius, 3).name('systems').beginArray();
    for (const s of h.systems) {
      w.int(s);
    }

    w.endArray().name('effect').string(h.effect).endObject();
  }

  w.endArray();
  w.name('monuments').beginArray();
  for (const m of g.monuments) {
    w.beginObject().name('region').int(m.region).name('system').int(m.system).name('kind').string(m.kind);
    w.name('name').string(m.name).name('text').string(m.text).endObject();
  }

  w.endArray();
  w.name('beacons').beginArray();
  for (const b of g.beacons) {
    w.beginObject().name('system').int(b.system).name('kind').string(b.kind).name('name').string(b.name).name('text').string(b.text).endObject();
  }

  w.endArray().endObject();
}

/**
ClusterJson.Write.
@param w
@param c
*/
export function writeCluster(w, c) {
  w.beginObject();
  w.name('address').string(c.address).name('name').string(c.name).name('kind').string(c.kind);
  w.name('age').string(c.age).name('radius').number(c.radius, 3);
  w.name('map').beginArray();
  for (const e of c.map) {
    w.beginObject().name('address').string(e.address).name('name').string(e.name).name('type').string(e.type);
    w.name('shape').string(e.shape).name('role').string(e.role).name('host').int(e.host);
    w.name('x').number(e.x, 3).name('y').number(e.y, 3).name('size').number(e.size, 3).name('systems').int(e.systems);
    w.name('age').string(e.age).name('richness').string(e.richness).name('core').string(e.coreActivity);
    w.endObject();
  }

  w.endArray();
  w.name('links').beginArray();
  for (const l of c.links) {
    w.beginArray().int(l.a).int(l.b).string(l.tier).number(l.length, 3).endArray();
  }

  w.endArray().endObject();
}

/**
ClusterJson.WriteGalaxy.
@param w
@param g
*/
export function writeClusterGalaxy(w, g) {
  w.beginObject();
  w.name('address').string(g.address).name('name').string(g.name).name('type').string(g.type);
  w.name('descriptor').string(g.descriptor).name('age').string(g.age).name('richness').string(g.richness);
  w.name('core').string(g.coreActivity).name('coreHazardRadius').number(g.coreHazardRadius, 3);
  w.name('systems').int(g.map.length);
  w.name('gates').beginArray();
  for (const gate of g.gates) {
    w.beginArray().int(gate.galaxy).string(gate.name).string(gate.tier).int(gate.system).endArray();
  }

  w.endArray().endObject();
}

/**
UniverseJson.Write.
@param w
@param u
*/
export function writeUniverse(w, u) {
  w.beginObject();
  w.name('address').string(u.address).name('name').string(u.name).name('age').string(u.age).name('radius').number(u.radius, 3);
  w.name('nodes').beginArray();
  for (const n of u.nodes) {
    w.beginObject().name('address').string(n.address).name('name').string(n.name).name('kind').string(n.kind);
    w.name('role').string(n.role).name('x').number(n.x, 3).name('y').number(n.y, 3).name('galaxies').int(n.galaxies);
    w.endObject();
  }

  w.endArray();
  w.name('filaments').beginArray();
  for (const f of u.filaments) {
    w.beginArray().int(f.a).int(f.b).number(f.length, 3).int(f.galaxyA).int(f.galaxyB).endArray();
  }

  w.endArray();
  w.name('voids').beginArray();
  for (const v of u.voids) {
    w.beginObject().name('address').string(v.address).name('name').string(v.name);
    w.name('x').number(v.x, 3).name('y').number(v.y, 3).name('radius').number(v.radius, 3);
    w.name('systems').beginArray();
    for (let s = 0; s < v.systemCount; s++) {
      writeSystem(w, v.system(s));
    }

    w.endArray().endObject();
  }

  w.endArray();
  w.name('landmarks').beginArray();
  for (const l of u.landmarks) {
    w.beginArray().string(l.kind).string(l.name).string(l.address).endArray();
  }

  w.endArray();
  const m = u.merger;
  w.name('merger').beginObject().name('name').string(m.name).name('cluster').int(m.cluster);
  w.name('galaxyA').string(m.galaxyA).name('galaxyB').string(m.galaxyB).name('hook').string(m.hook).endObject();
  w.endObject();
}

/**
UniverseJson.WriteGalaxy.
@param w
@param g
*/
export function writeUniverseGalaxy(w, g) {
  w.beginObject().name('address').string(g.address).name('landmark');
  if (g.landmark === undefined) {
    w.null();
  } else {
    w.beginArray().string(g.landmark.name).string(g.landmark.address).int(g.landmark.bearing).int(g.landmark.lightYears).endArray();
  }

  w.name('gateClusters').beginArray();
  for (const gate of g.gates) {
    w.int(gate.cluster);
  }

  w.endArray().endObject();
}
