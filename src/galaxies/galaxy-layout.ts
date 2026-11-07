/**
The galaxy level's map: a port of `Galaxies/GalaxyLayout.cs`. A shape as a density function, systems placed with a
minimum spacing, lanes from the relative neighbourhood graph plus a share of the Gabriel graph's other edges,
chokepoints and bridges, named regions with an age and a theme, and danger from hops to the core plus regional noise.
Each purpose draws from its own stream. Every arithmetic expression keeps the C# order of operations.
*/
import {DMath} from '../core/dmath.ts';
import type {Pcg32} from '../core/pcg32.ts';
import {Seeds} from '../core/seeds.ts';
import type {GalaxyShape, GeneratorOptions} from '../options.ts';
import type {StellarAge} from '../stars/star-generator.ts';

/**
The galaxy's radius in game units.
*/
export const galaxyRadius = 1000;

/**
Spirals and bars read on a map only from this many systems. C# `Diagnostics.FirstSpiralCount`.
*/
export const firstSpiralCount = 80;

const intMax = 2_147_483_647;
const shapes: GalaxyShape[] = ['Spiral', 'Barred', 'Elliptical', 'Ring', 'Irregular'];
const shapeWeights = [40, 20, 15, 10, 15];
const smallShapes: GalaxyShape[] = ['Elliptical', 'Ring', 'Irregular'];
const smallShapeWeights = [15, 10, 15];
const ages: StellarAge[] = ['Young', 'Mature', 'Old'];
const ageWeights = [30, 45, 25];
const regionRoots = [
  'Vela',
  'Draco',
  'Lyra',
  'Corvus',
  'Hydra',
  'Carina',
  'Orion',
  'Cygnus',
  'Pavo',
  'Lupus',
  'Ara',
  'Norma',
  'Pyxis',
  'Fornax',
  'Indus',
  'Musca',
  'Tucana',
  'Volans',
  'Aquila',
  'Serpens',
];
const regionKinds = ['Reach', 'Expanse', 'March', 'Drift', 'Verge', 'Cluster', 'Deep', 'Spur'];
const themes = ['frontier', 'old empire', 'pirate haven', 'trade corridor', 'precursor ruins', 'nebula maze', 'mining belt', 'quarantine zone'];

/**
What a galaxy cluster decides for one galaxy's map; the defaults change nothing. C# `GalaxyLayout.LayoutTuning`.
*/
export type LayoutTuning = {
  readonly pitchLow: number;
  readonly pitchHigh: number;
  readonly ellipse: number;
  readonly ageWeights: readonly number[] | undefined;
  readonly coreHazardRadius: number;
  readonly coreDanger: number;
};

export const noTuning: LayoutTuning = Object.freeze({
  pitchLow: 0, pitchHigh: 0, ellipse: 0, ageWeights: undefined, coreHazardRadius: 0, coreDanger: 0,
});

type Blob = {x: number; y: number; s: number};

/**
The seed of system `index` of the galaxy whose seed is `galaxySeed`.
*/
export function systemSeed(galaxySeed: bigint, index: number): bigint {
  return Seeds.child(galaxySeed, 'system', index);
}

class Density {
  private readonly cosTwist: number;
  private readonly sinTwist: number;
  private readonly shape: GalaxyShape;
  private readonly arms: number;
  private readonly pitch: number;
  private readonly twist: number;
  private readonly ellipse: number;
  private readonly blobs: Blob[];

  constructor(shape: GalaxyShape, arms: number, pitch: number, twist: number, ellipse: number, blobs: Blob[]) {
    this.shape = shape;
    this.arms = arms;
    this.pitch = pitch;
    this.twist = twist;
    this.ellipse = ellipse;
    this.blobs = blobs;
    this.cosTwist = DMath.cos(twist);
    this.sinTwist = DMath.sin(twist);
  }

  at(x: number, y: number): number {
    const r = Math.sqrt(x * x + y * y);
    if (r > 1) {
      return 0;
    }

    const bulge = DMath.exp(-r * r / 0.02);
    switch (this.shape) {
      case 'Elliptical': {
        const spread = x * x / (this.ellipse * this.ellipse) + y * y;
        return DMath.exp(-spread * 2.2);
      }

      case 'Ring': {
        const d = (r - 0.68) / 0.09;
        return Math.min(1, DMath.exp(-d * d) + 0.6 * bulge);
      }

      case 'Colliding': {
        return this.colliding(x, y);
      }

      case 'Starburst': {
        // A bright core and small knots (the blobs at three tenths of their size); the drawn blobs place the knots.
        let burst = DMath.exp(-r * r / 0.1);
        for (const b of this.blobs) {
          const dx = x - b.x * 0.8;
          const dy = y - b.y * 0.8;
          const s = b.s * 0.3;
          burst += 0.6 * DMath.exp(-(dx * dx + dy * dy) / (2 * s * s));
        }

        return Math.min(1, burst + 0.005);
      }

      case 'Clustered': {
        // Tight knots (a third of the blobs' size, mirrored to double their number) over a faint oval.
        let knots = 0;
        for (const b of this.blobs) {
          const s2 = b.s * b.s / 9;
          const ax = x - b.x;
          const ay = y - b.y;
          const bx = x + b.y;
          const by = y - b.x;
          knots += DMath.exp(-(ax * ax + ay * ay) / (2 * s2)) + DMath.exp(-(bx * bx + by * by) / (2 * s2));
        }

        const oval = DMath.exp(-(x * x / (this.ellipse * this.ellipse) + y * y) * 2.5);
        return Math.min(1, knots + 0.04 * oval);
      }

      case 'Irregular': {
        let sum = 0;
        for (const b of this.blobs) {
          const dx = x - b.x;
          const dy = y - b.y;
          sum += DMath.exp(-(dx * dx + dy * dy) / (2 * b.s * b.s));
        }

        return Math.min(1, sum * 0.8);
      }

      default: {
        return this.spiral(x, y, r, bulge);
      }
    }
  }

  // Two discs on the line at the drawn twist angle, a bridge between them and a tail beyond each.
  private colliding(x: number, y: number): number {
    const u = x * this.cosTwist + y * this.sinTwist;
    const v = -x * this.sinTwist + y * this.cosTwist;
    const ua = u - 0.42;
    const ub = u + 0.42;
    const discA = DMath.exp(-(ua * ua + v * v) / (2 * 0.16 * 0.16));
    const discB = DMath.exp(-(ub * ub + v * v * this.ellipse) / (2 * 0.13 * 0.13));
    const bend = 0.25 * u * u;
    const bridge = Math.abs(u) < 0.42 ? 0.45 * DMath.exp(-((v - bend) * (v - bend)) / 0.004) : 0;
    const tail = Math.abs(u) >= 0.42 ? 0.35 * DMath.exp(-((v + bend) * (v + bend)) / 0.006) * (1 - (Math.abs(u) - 0.42) / 0.55) : 0;
    return Math.min(1, discA + discB + bridge + Math.max(0, tail) + 0.01);
  }

  private spiral(x: number, y: number, r: number, bulge: number): number {
    if (r < 0.05) {
      return 1;
    }

    const angle = DMath.atan2(y, x);
    const logR = DMath.log(r);
    let best = Number.MAX_VALUE;
    for (let k = 0; k < this.arms; k++) {
      // A logarithmic spiral per arm; the angular distance to the nearest arm, wrapped to [-pi, pi].
      const armAngle = logR / this.pitch + this.twist + 2 * DMath.PI * k / this.arms;
      let diff = angle - armAngle;
      diff -= Math.floor(diff / (2 * DMath.PI) + 0.5) * 2 * DMath.PI;
      best = Math.min(best, Math.abs(diff));
    }

    const width = 0.16 + 0.12 * r;
    let arm = DMath.exp(-(best * best) / (2 * width * width)) * (1 - 0.6 * r);
    let core = bulge;
    if (this.shape === 'Barred') {
      const bx = x * this.cosTwist + y * this.sinTwist;
      const by = -x * this.sinTwist + y * this.cosTwist;
      if (Math.abs(bx) < 0.32) {
        core = Math.max(core, DMath.exp(-(by * by) / 0.004));
      }

      if (r < 0.32) {
        arm *= 0.25;
      }
    }

    return Math.min(1, arm + core + 0.01);
  }
}

/**
A square grid over the galaxy, so neighbour and empty-circle questions look at nearby cells only.
*/
class Grid {
  private readonly side: number;
  private readonly head: Int32Array;
  private readonly next: number[] = [];
  private readonly cell: number;

  constructor(cell: number) {
    this.cell = cell;
    this.side = Math.trunc(2 * galaxyRadius / cell) + 1;
    this.head = new Int32Array(this.side * this.side).fill(-1);
  }

  add(index: number, x: number, y: number): void {
    const cell = this.cellOf(y) * this.side + this.cellOf(x);
    this.next.push(this.head[cell]!);
    this.head[cell] = index;
  }

  anyCloser(x: number, y: number, d2: number, xs: number[], ys: number[]): boolean {
    const cx = this.cellOf(x);
    const cy = this.cellOf(y);
    for (let j = Math.max(0, cy - 1); j <= Math.min(this.side - 1, cy + 1); j++) {
      for (let i = Math.max(0, cx - 1); i <= Math.min(this.side - 1, cx + 1); i++) {
        for (let p = this.head[j * this.side + i]!; p !== -1; p = this.next[p]!) {
          const dx = xs[p]! - x;
          const dy = ys[p]! - y;
          if (dx * dx + dy * dy < d2) {
            return true;
          }
        }
      }
    }

    return false;
  }

  anyInCircle(a: number, b: number, dab: number, xs: number[], ys: number[]): boolean {
    const mx = (xs[a]! + xs[b]!) / 2;
    const my = (ys[a]! + ys[b]!) / 2;
    return this.search(mx, my, dab / 4, a, b, xs, ys, false);
  }

  anyInLune(a: number, b: number, dab: number, xs: number[], ys: number[]): boolean {
    return this.search(xs[a]!, ys[a]!, dab, a, b, xs, ys, true);
  }

  private cellOf(v: number): number {
    return DMath.clamp(Math.trunc((v + galaxyRadius) / this.cell), 0, this.side - 1);
  }

  // Rings of cells outwards from the centre's cell, so a crowded circle answers at its first cells.
  private search(x: number, y: number, r2: number, a: number, b: number, xs: number[], ys: number[], lune: boolean): boolean {
    const cx = this.cellOf(x);
    const cy = this.cellOf(y);
    const reach = Math.min(this.side, Math.trunc(Math.sqrt(r2) / this.cell) + 1);
    for (let ring = 0; ring <= reach; ring++) {
      for (let j = cy - ring; j <= cy + ring; j++) {
        if (j < 0 || j >= this.side) {
          continue;
        }

        const isEdgeRow = j === cy - ring || j === cy + ring;
        const step = isEdgeRow || ring === 0 ? 1 : 2 * ring;
        for (let i = cx - ring; i <= cx + ring; i += step) {
          if (i < 0 || i >= this.side) {
            continue;
          }

          for (let c = this.head[j * this.side + i]!; c !== -1; c = this.next[c]!) {
            if (c === a || c === b) {
              continue;
            }

            let isInside: boolean;
            if (lune) {
              const ax = xs[c]! - xs[a]!;
              const ay = ys[c]! - ys[a]!;
              const bx = xs[c]! - xs[b]!;
              const by = ys[c]! - ys[b]!;
              isInside = Math.max(ax * ax + ay * ay, bx * bx + by * by) < r2;
            } else {
              const dx = xs[c]! - x;
              const dy = ys[c]! - y;
              isInside = dx * dx + dy * dy < r2;
            }

            if (isInside) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }
}

/**
A region of the layout: name, age, theme and centre system.
*/
export type LayoutRegion = {name: string; age: StellarAge; theme: string; centre: number};

/**
A galaxy's map before it becomes a Galaxy record.
*/
export class GalaxyLayout {
  /**
  As the C# `GalaxyLayout.Generate`: every stream draws exactly what it draws alone; the tuning and the options' arm
  count, extra lanes and danger shift only change values after the draws.
  */
  static generate(seed: bigint, systems: number, requested: GalaxyShape, tuning: LayoutTuning, options: GeneratorOptions): GalaxyLayout {
    return new GalaxyLayout(seed, systems, requested, tuning, options);
  }

  private constructor(seed: bigint, systems: number, requested: GalaxyShape, tuning: LayoutTuning, options: GeneratorOptions) {
    const shape = Seeds.stream(seed, 'shape');
    // Both the roll and every shape parameter are always drawn, so a chosen shape keeps the seed's other values.
    const rolled = systems < firstSpiralCount ? smallShapes[shape.weighted(smallShapeWeights)]! : shapes[shape.weighted(shapeWeights)]!;
    this.shape = requested === 'Auto' ? rolled : requested;
    this.arms = shape.range(2, 4);
    if (options.arms !== undefined) {
      this.arms = options.arms;
    }

    let pitch = shape.rangeDouble(0.25, 0.45);
    if (tuning.pitchHigh > 0) {
      pitch = tuning.pitchLow + (pitch - 0.25) / 0.2 * (tuning.pitchHigh - tuning.pitchLow);
    }

    const twist = shape.rangeDouble(0, 2 * DMath.PI);
    const blobCount = shape.range(3, 5);
    const blobs: Blob[] = [];
    for (let i = 0; i < blobCount; i++) {
      const x = shape.rangeDouble(-0.6, 0.6);
      const y = shape.rangeDouble(-0.6, 0.6);
      blobs.push({x, y, s: shape.rangeDouble(0.15, 0.35)});
    }

    let ellipse = shape.rangeDouble(0.55, 0.9);
    if (tuning.ellipse > 0) {
      ellipse = tuning.ellipse;
    }

    this.pitch = pitch;
    this.ellipse = ellipse;
    const density = new Density(this.shape, this.arms, pitch, twist, ellipse, blobs);
    const grid = this.place(Seeds.stream(seed, 'layout'), systems, density);
    this.buildLanes(Seeds.stream(seed, 'lanes'), grid, options.extraLanes);
    this.analyse();
    this.buildRegions(Seeds.stream(seed, 'regions'), tuning.ageWeights ?? ageWeights);
    this.setDanger(seed, tuning.coreHazardRadius, tuning.coreDanger, options.dangerShift);
  }

  shape: GalaxyShape = 'Spiral';
  arms = 0;
  pitch = 0;
  ellipse = 0;
  readonly x: number[] = [];
  readonly y: number[] = [];
  readonly lanes: Array<[number, number, boolean]> = [];
  readonly regions: LayoutRegion[] = [];
  core = 0;
  hops: number[] = [];
  region: number[] = [];
  danger: number[] = [];
  chokepoint: boolean[] = [];
  private adjacency: number[][] = [];

  get count(): number {
    return this.x.length;
  }

  private place(rng: Pcg32, count: number, density: Density): Grid {
    // Keeps systems apart without hiding the shape; relaxed by a tenth every 5,000 crowded attempts.
    let spacing = 0.4 * galaxyRadius / Math.sqrt(count);
    const grid = new Grid(spacing);
    const maxAttempts = Math.max(200_000, 500 * count);
    for (let attempts = 1; this.x.length < count && attempts <= maxAttempts; attempts++) {
      const x = rng.rangeDouble(-1, 1);
      const y = rng.rangeDouble(-1, 1);
      // A decision on integers: the density quantised to 1/4096 against an integer draw.
      const threshold = Math.trunc(density.at(x, y) * 4096);
      if (rng.nextInt(4096) >= threshold) {
        continue;
      }

      const px = DMath.round(x * galaxyRadius, 3);
      const py = DMath.round(y * galaxyRadius, 3);
      if (grid.anyCloser(px, py, spacing * spacing, this.x, this.y)) {
        if (attempts % 5000 === 0) {
          spacing *= 0.9;
        }

        continue;
      }

      grid.add(this.x.length, px, py);
      this.x.push(px);
      this.y.push(py);
    }

    return grid;
  }

  private d2(a: number, b: number): number {
    const dx = this.x[a]! - this.x[b]!;
    const dy = this.y[a]! - this.y[b]!;
    return dx * dx + dy * dy;
  }

  private buildLanes(rng: Pcg32, grid: Grid, extraLanes: number): void {
    const n = this.count;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const dab = this.d2(a, b);
        // Every relative-neighbourhood edge is a Gabriel edge, so a pair outside the Gabriel graph is no lane.
        if (grid.anyInCircle(a, b, dab, this.x, this.y)) {
          continue;
        }

        // The extra-lane roll is drawn for every Gabriel pair, so the share shifts nothing else.
        const isExtra = rng.nextInt(100) < extraLanes;
        if (isExtra || !grid.anyInLune(a, b, dab, this.x, this.y)) {
          this.lanes.push([a, b, false]);
        }
      }
    }

    this.adjacency = Array.from({length: n}, () => []);
    for (const [a, b] of this.lanes) {
      this.adjacency[a]!.push(b);
      this.adjacency[b]!.push(a);
    }
  }

  private analyse(): void {
    const n = this.count;
    // The core is the system nearest the centre (the first on a tie); hops count lanes from it.
    let best = Number.MAX_VALUE;
    for (let i = 0; i < n; i++) {
      const r2 = this.x[i]! * this.x[i]! + this.y[i]! * this.y[i]!;
      if (!(r2 < best)) {
        continue;
      }

      best = r2;
      this.core = i;
    }

    this.hops = this.bfs(this.core);
    this.chokepoint = Array.from({length: n}, () => false);
    const bridges = this.bridges();
    for (const lane of this.lanes) {
      if (bridges.has((lane[0] * 0x1_00_00_00_00) + lane[1])) {
        lane[2] = true;
      }
    }
  }

  /**
  Tarjan's bridges and articulation points, iteratively: marks the chokepoint systems and returns the bridge lanes as
  low index * 2^32 + high index.
  */
  private bridges(): Set<number> {
    const n = this.count;
    const disc = Array.from({length: n}, () => -1);
    const low = Array.from({length: n}, () => 0);
    const parent = Array.from({length: n}, () => -1);
    const next = Array.from({length: n}, () => 0);
    const bridges = new Set<number>();
    const stack: number[] = [];
    let time = 0;
    for (let root = 0; root < n; root++) {
      if (disc[root] !== -1) {
        continue;
      }

      disc[root] = time;
      low[root] = time++;
      stack.push(root);
      let rootChildren = 0;
      while (stack.length > 0) {
        const u = stack.at(-1)!;
        if (next[u]! < this.adjacency[u]!.length) {
          const v = this.adjacency[u]![next[u]!++]!;
          if (disc[v] === -1) {
            parent[v] = u;
            disc[v] = time;
            low[v] = time++;
            stack.push(v);
            if (u === root) {
              rootChildren++;
            }
          } else if (v !== parent[u]) {
            low[u] = Math.min(low[u]!, disc[v]!);
          }

          continue;
        }

        stack.pop();
        const p = parent[u]!;
        if (p === -1) {
          continue;
        }

        low[p] = Math.min(low[p]!, low[u]!);
        if (parent[p] !== -1 && low[u]! >= disc[p]!) {
          this.chokepoint[p] = true;
        }

        if (low[u]! > disc[p]!) {
          bridges.add((Math.min(p, u) * 0x1_00_00_00_00) + Math.max(p, u));
        }
      }

      if (rootChildren > 1) {
        this.chokepoint[root] = true;
      }
    }

    return bridges;
  }

  private bfs(start: number): number[] {
    const dist = Array.from({length: this.count}, () => intMax);
    const queue = [start];
    dist[start] = 0;
    // The queue grows while it is read, so an index walks it.
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let head = 0; head < queue.length; head++) {
      const u = queue[head]!;
      for (const v of this.adjacency[u]!) {
        if (dist[v] !== intMax) {
          continue;
        }

        dist[v] = dist[u]! + 1;
        queue.push(v);
      }
    }

    return dist;
  }

  private buildRegions(rng: Pcg32, weights: readonly number[]): void {
    const n = this.count;
    const k = Math.min(n, DMath.clamp(Math.trunc(n / 8), 2, 8));
    // Farthest-point sampling over hops picks the region centres; each system joins the nearest (the first on a tie).
    const centres = [this.core];
    const dists = [this.hops];
    while (centres.length < k) {
      let far = 0;
      let farthest = -1;
      for (let i = 0; i < n; i++) {
        let nearest = intMax;
        for (const d of dists) {
          nearest = Math.min(nearest, d[i]!);
        }

        if (!(nearest > farthest)) {
          continue;
        }

        farthest = nearest;
        far = i;
      }

      centres.push(far);
      dists.push(this.bfs(far));
    }

    const used = new Set<string>();
    for (const centre of centres) {
      let name: string;
      do {
        name = regionRoots[rng.nextInt(regionRoots.length)]! + ' ' + regionKinds[rng.nextInt(regionKinds.length)]!;
      } while (used.has(name));

      used.add(name);
      const age = ages[rng.weighted(weights)]!;
      this.regions.push({
        name, age, theme: themes[rng.nextInt(themes.length)]!, centre,
      });
    }

    this.region = [];
    for (let i = 0; i < n; i++) {
      let nearest = 0;
      for (let c = 1; c < k; c++) {
        if (dists[c]![i]! < dists[nearest]![i]!) {
          nearest = c;
        }
      }

      this.region.push(nearest);
    }
  }

  private setDanger(seed: bigint, hazardRadius: number, hazardDanger: number, shift: number): void {
    let maxHops = 1;
    for (const h of this.hops) {
      maxHops = Math.max(maxHops, h);
    }

    const rng = Seeds.stream(seed, 'danger');
    const regionNoise = this.regions.map(() => rng.range(-2, 2));
    this.danger = [];
    for (let i = 0; i < this.count; i++) {
      // 1 at the core to 10 at the farthest system, rounded half up on integers, then regional and local noise.
      const baseDanger = 1 + Math.trunc((18 * this.hops[i]! + maxHops) / (2 * maxHops));
      const local = Seeds.stream(systemSeed(seed, i), 'danger').range(-1, 1);
      // An active core's radiation adds its danger to every system within its hazard radius.
      const core = hazardDanger > 0 && this.x[i]! * this.x[i]! + this.y[i]! * this.y[i]! <= hazardRadius * hazardRadius ? hazardDanger : 0;
      this.danger.push(DMath.clamp(baseDanger + regionNoise[this.region[i]!]! + local + core + shift, 1, 10));
    }
  }
}
