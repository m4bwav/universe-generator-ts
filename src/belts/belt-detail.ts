/**
The belt level: composition, mass, largest body, temperature, resources and a summary, from the belt's own seed. A port
of `Belts/BeltDetail.cs`.
*/
import type {Address} from '../core/address.ts';
import {DMath} from '../core/dmath.ts';
import {Seeds} from '../core/seeds.ts';
import {grades} from '../planets/planet-detail.ts';
import type {ResourceGrades} from '../planets/planet-records.ts';
import type {BeltKind} from '../systems/star-system.ts';

export type BeltComposition = {
  readonly silicate: number; readonly carbonaceous: number; readonly metal: number; readonly ice: number;
};

/**
The belt level's fields, added to a belt by `applyBeltDetail`.
*/
export type BeltDetailFields = {
  readonly address: string;
  readonly index: number;
  readonly name: string;
  readonly composition: BeltComposition;
  readonly mass: number;
  readonly largestBody: number;
  readonly temperature: number;
  readonly resources: ResourceGrades;
  readonly summary: string;
};

type BeltCore = {readonly kind: BeltKind; readonly inner: number; readonly outer: number};

const resourceNames = ['metals', 'rare elements', 'ices', 'gases', 'organics'];

function summary(c: BeltComposition, largest: number, temperature: number, r: ResourceGrades): string {
  const parts: Array<[string, number]> = [['silicate rock', c.silicate], ['carbonaceous rock', c.carbonaceous], ['metal', c.metal], ['ice', c.ice]];
  const made: string[] = [];
  while (parts.length > 0) {
    // The largest share first; on a tie, the order above.
    let best = 0;
    for (let i = 1; i < parts.length; i++) {
      if (parts[i]![1] > parts[best]![1]) {
        best = i;
      }
    }

    if (parts[best]![1] > 0) {
      made.push(`${parts[best]![1]}% ${parts[best]![0]}`);
    }

    parts.splice(best, 1);
  }

  const values = [r.metals, r.rareElements, r.ices, r.gases, r.organics];
  const top = Math.max(0, ...values);
  const richest = resourceNames.filter((_, i) => values[i] === top);
  const last = richest.pop()!;
  const rich = richest.length === 0 ? last : richest.join(', ') + ' and ' + last;
  return `${made.join(', ')}; largest body ${Math.trunc(largest)} km in radius; ${Math.trunc(temperature) - 273} °C; richest in ${rich}`;
}

/**
The belt level's detail for belt `index` of a system. C# `BeltDetail.Apply`.
*/
export function applyBeltDetail<B extends BeltCore>(b: B, index: number, system: Address, systemSeed: bigint, systemName: string, light: number, frost: number): B & BeltDetailFields {
  const seed = Seeds.child(systemSeed, 'belt', index);
  const rng = Seeds.stream(seed, 'belt');
  const metalDraw = rng.nextInt(9);
  const carbonDraw = rng.nextInt(21);
  const iceDraw = rng.nextInt(6);
  const icyIceDraw = rng.nextInt(26);
  const icyMetalDraw = rng.nextInt(3);
  const icyCarbonDraw = rng.nextInt(16);
  const massDraw = rng.nextDouble();
  const sizeDraw = rng.nextDouble();

  // Where the belt lies against the frost line decides how much carbon and ice it holds.
  const middle = Math.sqrt(b.inner * b.outer);
  const x = DMath.round(middle / frost, 2);
  const rockTemperature = DMath.round(278.6 * Math.sqrt(Math.sqrt(light / (middle * middle) * 0.9)), 0);
  let metal: number;
  let carbon: number;
  let ice: number;
  let mass: number;
  let largest: number;
  if (b.kind === 'Asteroid') {
    metal = 4 + metalDraw;
    ice = x > 1.2 ? Math.min(30, Math.floor(25 * (x - 1.2)) + iceDraw) : 0;
    carbon = DMath.clamp(Math.floor(70 * x - 5 + 0.5) + carbonDraw - 10, 10, 80);
    mass = 0.0001 * DMath.exp(massDraw * DMath.log(30));
    largest = 100 * DMath.exp(sizeDraw * DMath.log(5));
  } else {
    metal = icyMetalDraw;
    ice = Math.floor((55 + icyIceDraw) * DMath.clamp((250 - rockTemperature) / 80, 0, 1));
    carbon = 15 + icyCarbonDraw;
    mass = 0.005 * DMath.exp(massDraw * DMath.log(40));
    largest = 300 * DMath.exp(sizeDraw * DMath.log(1300 / 300));
  }

  carbon = Math.min(carbon, 95 - metal - ice);
  const silicate = 100 - metal - carbon - ice;
  const composition: BeltComposition = {
    silicate, carbonaceous: carbon, metal, ice,
  };
  const albedo = (silicate * 0.2 + carbon * 0.06 + metal * 0.15 + ice * 0.6) / 100;
  const temperature = DMath.round(278.6 * Math.sqrt(Math.sqrt(light / (middle * middle) * (1 - albedo))), 0);
  let icesBase = 0;
  if (ice > 0) {
    icesBase = DMath.clamp(1 + Math.trunc(ice / 20), 1, 5);
  } else if (carbon >= 50) {
    icesBase = 1;
  }

  const resources = grades(
    Seeds.stream(seed, 'resources'),
    DMath.clamp(1 + Math.trunc(metal / 4) + Math.trunc(silicate / 40), 1, 5),
    DMath.clamp(1 + Math.trunc(metal / 5), 1, 5),
    icesBase,
    Math.trunc(ice / 30),
    DMath.clamp(Math.trunc(carbon / 20), 0, 5),
  );
  largest = DMath.round(largest, 0);
  return {
    ...b,
    address: system.child('belt', index).toString(),
    index,
    name: systemName + (b.kind === 'Asteroid' ? ' Belt' : ' Outer Belt'),
    composition,
    mass: DMath.round(mass, 6),
    largestBody: largest,
    temperature,
    resources,
    summary: summary(composition, largest, temperature, resources),
  };
}
