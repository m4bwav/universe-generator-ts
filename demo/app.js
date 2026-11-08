import {
  generateGalaxy,
  Preset,
  optionsToCode,
  optionsFromCode,
  generatorVersion,
} from './universe-generator.mjs';

// The game this demo points at. One value, so it can switch later.
const game = {name: 'markdavidrogers.com', url: 'https://markdavidrogers.com'};

const shapes = ['Auto', 'Spiral', 'Barred', 'Elliptical', 'Ring', 'Irregular', 'Colliding', 'Starburst', 'Clustered'];
const starColours = {
  O: '#9bb0ff', B: '#aabfff', A: '#cad7ff', F: '#f8f7ff', G: '#fff4ea', K: '#ffd2a1', M: '#ffb56c',
  WhiteDwarf: '#e8f0ff', NeutronStar: '#c9a8ff', BlackHole: '#7a5cff', BrownDwarf: '#b0664a',
};
const factionColours = ['#ff6b6b', '#4ecdc4', '#ffd93d', '#a78bfa', '#6bcb77', '#ff9f43', '#4d96ff', '#f78fb3'];

const $ = id => document.querySelector(`#${id}`);
const canvas = $('map');
const context = canvas.getContext('2d');
const panel = $('panel');

const presetSelect = $('preset');
for (const name of Object.keys(Preset)) {
  presetSelect.add(new Option(name, name));
}

for (const name of shapes) {
  $('shape').add(new Option(name, name));
}

const gameLink = $('game-link');
gameLink.href = game.url;
gameLink.textContent = `Made for a game in progress: ${game.name}`;

let galaxy;
let selected;
const view = {x: 0, y: 0, scale: 1};

function escapeHtml(text) {
  return String(text).replaceAll(/["&<>]/gu, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  })[c]);
}

function readForm() {
  const preset = Preset[presetSelect.value] ?? Preset.default;
  return {
    seed: $('seed').value || 'my-seed',
    options: {
      ...preset,
      systems: Math.min(2000, Math.max(1, Number($('systems').value) || 60)),
      shape: $('shape').value,
      names: $('names').value,
    },
  };
}

function readUrl() {
  const parameters = new URLSearchParams(location.search);
  const seed = parameters.get('seed');
  if (!seed) {
    return;
  }

  const preset = parameters.get('preset');
  parameters.delete('seed');
  parameters.delete('preset');
  parameters.delete('system');
  let options = {};
  try {
    options = optionsFromCode(parameters.toString());
  } catch (error) {
    console.warn(error.message);
  }

  $('seed').value = seed;
  if (preset && Preset[preset]) {
    presetSelect.value = preset;
  }

  $('systems').value = options.systems ?? 60;
  $('shape').value = options.shape ?? 'Auto';
  $('names').value = options.names ?? 'Catalogue';
}

function writeUrl(seed, options) {
  const code = optionsToCode(options);
  const parameters = new URLSearchParams({seed});
  if (presetSelect.value !== 'default') {
    parameters.set('preset', presetSelect.value);
  }

  let query = parameters.toString();
  if (code) {
    query += `&${code}`;
  }

  if (selected !== undefined) {
    query += `&system=${selected}`;
  }

  history.replaceState(undefined, '', `?${query}`);
}

function generate() {
  const {seed, options} = readForm();
  const started = performance.now();
  try {
    galaxy = generateGalaxy(seed, options);
  } catch (error) {
    panel.innerHTML = `<p class="warn">${escapeHtml(error.message)}</p>`;
    return;
  }

  const ms = performance.now() - started;
  const parameters = new URLSearchParams(location.search);
  const requested = parameters.has('system') ? Number(parameters.get('system')) : NaN;
  selected = Number.isSafeInteger(requested) && requested >= 0 && requested < galaxy.map.length ? requested : undefined;

  fit();
  writeUrl(seed, options);
  $('legend').textContent = `${galaxy.name}, ${galaxy.descriptor}: ${galaxy.map.length} systems, ${galaxy.lanes.length} lanes, made in ${ms.toFixed(0)} ms. Drag to pan, wheel or pinch to zoom, click a star.`;
  if (selected === undefined) {
    showGalaxy();
  } else {
    showSystem(selected);
  }

  draw();
}

function fit() {
  const rect = canvas.getBoundingClientRect();
  const extent = galaxy.radius * 1.1;
  view.scale = Math.min(rect.width, rect.height) / (2 * extent);
  view.x = 0;
  view.y = 0;
}

function toScreen(x, y) {
  const rect = canvas.getBoundingClientRect();
  return [(rect.width / 2) + ((x - view.x) * view.scale), (rect.height / 2) - ((y - view.y) * view.scale)];
}

function toWorld(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  return [view.x + ((sx - (rect.width / 2)) / view.scale), view.y - ((sy - (rect.height / 2)) / view.scale)];
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(rect.width * ratio) || canvas.height !== Math.round(rect.height * ratio)) {
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = '#05070d';
  context.fillRect(0, 0, rect.width, rect.height);
  if (!galaxy) {
    return;
  }

  // Core glow.
  const [cx, cy] = toScreen(0, 0);
  const glow = context.createRadialGradient(cx, cy, 0, cx, cy, galaxy.radius * view.scale * 0.6);
  glow.addColorStop(0, 'rgba(255, 220, 160, 0.18)');
  glow.addColorStop(1, 'rgba(255, 220, 160, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, rect.width, rect.height);

  // Hazards.
  for (const hazard of galaxy.hazards) {
    if (!(hazard.radius > 0)) {
      continue;
    }

    const [hx, hy] = toScreen(hazard.x, hazard.y);
    context.beginPath();
    context.arc(hx, hy, hazard.radius * view.scale, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 90, 60, 0.07)';
    context.fill();
    context.strokeStyle = 'rgba(255, 120, 90, 0.35)';
    context.setLineDash([4, 4]);
    context.stroke();
    context.setLineDash([]);
  }

  // Lanes.
  context.lineWidth = 1;
  for (const lane of galaxy.lanes) {
    const a = galaxy.map[lane.a];
    const b = galaxy.map[lane.b];
    const [ax, ay] = toScreen(a.x, a.y);
    const [bx, by] = toScreen(b.x, b.y);
    context.strokeStyle = lane.bridge ? 'rgba(255, 210, 120, 0.55)' : 'rgba(102, 217, 255, 0.28)';
    context.beginPath();
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    context.stroke();
  }

  // Stars.
  const size = Math.max(2, Math.min(7, view.scale * 9));
  for (const entry of galaxy.map) {
    const [x, y] = toScreen(entry.x, entry.y);
    if (entry.faction !== undefined) {
      context.beginPath();
      context.arc(x, y, size + 3, 0, Math.PI * 2);
      context.strokeStyle = factionColours[entry.faction % factionColours.length] + (entry.contested ? '66' : 'aa');
      context.lineWidth = 1.5;
      context.stroke();
    }

    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fillStyle = starColours[entry.starClass] ?? '#ffffff';
    context.fill();
    if (entry.danger >= 8) {
      context.fillStyle = 'rgba(255, 60, 40, 0.45)';
      context.fill();
    }

    if (entry.index === selected) {
      context.beginPath();
      context.arc(x, y, size + 7, 0, Math.PI * 2);
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
    }

    if (!(view.scale > 0.9 || entry.index === selected)) {
      continue;
    }

    context.fillStyle = '#c7d1e8';
    context.font = '11px system-ui, sans-serif';
    context.fillText(entry.name, x + size + 4, y + 4);
  }
}

function list(items, render) {
  return items.length === 0 ? '<p class="dim">None.</p>' : `<ul>${items.map(item => `<li>${render(item)}</li>`).join('')}</ul>`;
}

function showGalaxy() {
  const name = index => escapeHtml(galaxy.map[index]?.name ?? '');
  panel.innerHTML = `
    <h2>${escapeHtml(galaxy.name)}</h2>
    <p class="dim">${escapeHtml(galaxy.descriptor)}, ${escapeHtml(galaxy.age)} stars, core ${escapeHtml(galaxy.coreActivity)}.</p>
    <p class="dim small">Address <code>${escapeHtml(galaxy.address)}</code> · generator version ${generatorVersion}</p>
    ${galaxy.warnings.length > 0 ? `<p class="warn">${galaxy.warnings.map(w => escapeHtml(w.message)).join('<br>')}</p>` : ''}
    <h3>Factions</h3>${list(galaxy.factions, f => `<span style="color:${factionColours[f.index % factionColours.length]}">●</span> <b>${escapeHtml(f.name)}</b>: ${escapeHtml(f.description)}`)}
    <h3>Regions</h3>${list(galaxy.regions, r => `<b>${escapeHtml(r.name)}</b>, ${escapeHtml(r.theme)} (${escapeHtml(r.age)})`)}
    <h3>Points of interest</h3>${list(galaxy.pointsOfInterest, p => `<b>${escapeHtml(p.name)}</b>: ${escapeHtml(p.text)}`)}
    <h3>Hazards</h3>${list(galaxy.hazards, h => `<b>${escapeHtml(h.name)}</b>: ${escapeHtml(h.effect)}`)}
    <h3>Monuments</h3>${list(galaxy.monuments, m => `<b>${escapeHtml(m.name ?? m.kind)}</b> at ${name(m.system)}: ${escapeHtml(m.text ?? '')}`)}
    <h3>Beacons</h3>${list(galaxy.beacons, b => `<b>${escapeHtml(b.name ?? b.kind)}</b> at ${name(b.system)}: ${escapeHtml(b.text ?? '')}`)}
  `;
}

function showSystem(index) {
  const entry = galaxy.map[index];
  const system = galaxy.system(index);
  const faction = entry.faction === undefined ? 'unclaimed' : galaxy.factions[entry.faction].name + (entry.contested ? ' (contested)' : '');
  const planets = system.planets.map(p => `
    <div class="planet"><b>${escapeHtml(p.name)}</b> <span class="dim">${escapeHtml(p.descriptor)}</span>
      <p class="small">${escapeHtml(p.summary)}</p>
      ${p.moons.length > 0 ? `<p class="small dim">Moons: ${p.moons.map(m => escapeHtml(`${m.name} (${m.kind})`)).join(', ')}</p>` : ''}
    </div>`).join('');
  panel.innerHTML = `
    <p class="small"><a href="#" id="back">← whole galaxy</a></p>
    <h2>${escapeHtml(system.name)}</h2>
    <p class="dim">${escapeHtml(system.descriptor)}</p>
    <p class="small">${escapeHtml(system.star.description)}; danger ${system.danger}${entry.chokepoint ? ', a chokepoint' : ''}; ${escapeHtml(faction)}; region ${escapeHtml(galaxy.regions[entry.region]?.name ?? '')}.</p>
    ${system.tags.length > 0 ? `<p class="small">Tags: ${system.tags.map(t => escapeHtml(t)).join(', ')}</p>` : ''}
    <p class="dim small">Address <code>${escapeHtml(system.address)}</code></p>
    <h3>Planets</h3>${planets || '<p class="dim">None.</p>'}
    <h3>Belts</h3>${list(system.belts, b => `<b>${escapeHtml(b.name)}</b>: ${escapeHtml(b.summary)}`)}
    <h3>Stations</h3>${list(system.stations, s => `<b>${escapeHtml(s.name)}</b> (${escapeHtml(s.kind)})`)}
    <h3>Landmarks</h3>${list(system.landmarks, l => escapeHtml(l.text))}
  `;
  $('back').addEventListener('click', event => {
    event.preventDefault();
    select(undefined);
  });
}

function select(index) {
  selected = index;
  writeUrl(readForm().seed, readForm().options);
  if (index === undefined) {
    showGalaxy();
  } else {
    showSystem(index);
  }

  draw();
}

function nearest(sx, sy) {
  let best;
  let bestDistance = 18 * 18;
  for (const entry of galaxy.map) {
    const [x, y] = toScreen(entry.x, entry.y);
    const d = ((x - sx) ** 2) + ((y - sy) ** 2);
    if (!(d < bestDistance)) {
      continue;
    }

    bestDistance = d;
    best = entry.index;
  }

  return best;
}

// Pan, zoom and pinch with pointer events.
const pointers = new Map();
let isMoved = false;
let pinch;

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, {x: event.offsetX, y: event.offsetY});
  isMoved = false;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = {distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale};
  }
});

canvas.addEventListener('pointermove', event => {
  const last = pointers.get(event.pointerId);
  if (!last) {
    return;
  }

  const dx = event.offsetX - last.x;
  const dy = event.offsetY - last.y;
  pointers.set(event.pointerId, {x: event.offsetX, y: event.offsetY});
  if (Math.abs(dx) + Math.abs(dy) > 2) {
    isMoved = true;
  }

  if (pointers.size === 2 && pinch) {
    const [a, b] = [...pointers.values()];
    view.scale = pinch.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance);
  } else if (pointers.size === 1) {
    view.x -= dx / view.scale;
    view.y += dy / view.scale;
  }

  draw();
});

function release(event) {
  if (pointers.size === 1 && !isMoved && galaxy) {
    const hit = nearest(event.offsetX, event.offsetY);
    if (hit !== undefined) {
      select(hit);
    }
  }

  pointers.delete(event.pointerId);
  if (pointers.size < 2) {
    pinch = undefined;
  }
}

canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', event => pointers.delete(event.pointerId));
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  const [wx, wy] = toWorld(event.offsetX, event.offsetY);
  const factor = Math.exp(-event.deltaY * 0.0015);
  view.scale = Math.min(50, Math.max(0.05, view.scale * factor));
  const [nx, ny] = toWorld(event.offsetX, event.offsetY);
  view.x += wx - nx;
  view.y += wy - ny;
  draw();
}, {passive: false});

window.addEventListener('resize', draw);

$('controls').addEventListener('submit', event => {
  event.preventDefault();
  history.replaceState(undefined, '', location.pathname);
  generate();
});

presetSelect.addEventListener('change', () => {
  const preset = Preset[presetSelect.value];
  $('systems').value = preset.systems;
  $('shape').value = preset.shape;
  $('names').value = preset.names;
});

$('random').addEventListener('click', () => {
  const words = ['amber', 'drift', 'lantern', 'hollow', 'cinder', 'veil', 'thorn', 'echo', 'tide', 'spire', 'ember', 'quill'];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  $('seed').value = `${pick()}-${pick()}-${Math.floor(Math.random() * 1000)}`;
  history.replaceState(undefined, '', location.pathname);
  generate();
});

$('share').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    $('share').textContent = 'Copied';
  } catch {
    $('share').textContent = 'Copy the address bar';
  }

  setTimeout(() => {
    $('share').textContent = 'Copy link';
  }, 1500);
});

readUrl();
generate();
