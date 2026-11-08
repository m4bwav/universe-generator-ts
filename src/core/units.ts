/**
Unit conversions for the generator's fields. A port of `Core/Units.cs`; C# overloads of `Convert` become one function per
kind of unit. `Units.Map` (map units to a length) waits for the Distances port with clusters and universes.
*/
export type LengthUnit = 'Kilometres' | 'EarthRadii' | 'JupiterRadii' | 'SolarRadii' | 'AstronomicalUnits' | 'LightYears' | 'Parsecs';
export type MassUnit = 'Kilograms' | 'EarthMasses' | 'JupiterMasses' | 'SolarMasses';
export type TemperatureUnit = 'Kelvin' | 'Celsius' | 'Fahrenheit';
export type TimeUnit = 'Hours' | 'Days' | 'Years';

const kmPerLightYear = 9_460_730_472_580.8;

const kilometres: Record<LengthUnit, number> = {
  Kilometres: 1,
  EarthRadii: 6371,
  JupiterRadii: 69_911,
  SolarRadii: 695_700,
  AstronomicalUnits: 149_597_870.7,
  LightYears: kmPerLightYear,
  Parsecs: kmPerLightYear * 3.26156377716743,
};

const kilograms: Record<MassUnit, number> = {
  Kilograms: 1,
  EarthMasses: 5.9722e24,
  JupiterMasses: 5.9722e24 * 317.83,
  SolarMasses: 1.98847e30,
};

const hours: Record<TimeUnit, number> = {
  Hours: 1,
  Days: 24,
  Years: 24 * 365.25,
};

function factor<U extends string>(table: Record<U, number>, unit: U, kind: string): number {
  if (!Object.hasOwn(table, unit)) {
    throw new RangeError(`Not a ${kind}.`);
  }

  return table[unit];
}

function length(value: number, from: LengthUnit, to: LengthUnit): number {
  return from === to ? value : value * factor(kilometres, from, 'LengthUnit') / factor(kilometres, to, 'LengthUnit');
}

function mass(value: number, from: MassUnit, to: MassUnit): number {
  return from === to ? value : value * factor(kilograms, from, 'MassUnit') / factor(kilograms, to, 'MassUnit');
}

function time(value: number, from: TimeUnit, to: TimeUnit): number {
  return from === to ? value : value * factor(hours, from, 'TimeUnit') / factor(hours, to, 'TimeUnit');
}

function temperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  if (from === to) {
    return value;
  }

  let kelvin = value;
  if (from === 'Celsius') {
    kelvin = value + 273.15;
  } else if (from === 'Fahrenheit') {
    kelvin = (value - 32) * 5 / 9 + 273.15;
  }

  if (to === 'Celsius') {
    return kelvin - 273.15;
  }

  return to === 'Fahrenheit' ? (kelvin - 273.15) * 9 / 5 + 32 : kelvin;
}

/**
Converts between units, as C# `Units.Convert`: the same multiplications and divisions, so the same doubles.
*/
export const Units = {
  length, mass, time, temperature,
} as const;
