import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

for (const {name, lib} of builds) {
  const {Units} = lib;
  describe(`Units (${name} build)`, () => {
    test('length, mass and time convert through one base unit, as C# Units.Convert does', () => {
      assert.equal(Units.length(1, 'AstronomicalUnits', 'Kilometres'), 149_597_870.7);
      assert.equal(Units.length(2, 'EarthRadii', 'EarthRadii'), 2);
      assert.equal(Units.length(1, 'Parsecs', 'LightYears'), 1 * (9_460_730_472_580.8 * 3.26156377716743) / 9_460_730_472_580.8);
      assert.equal(Units.length(69_911, 'Kilometres', 'JupiterRadii'), 1);
      assert.equal(Units.length(1, 'SolarRadii', 'Kilometres'), 695_700);
      assert.equal(Units.mass(1, 'JupiterMasses', 'EarthMasses'), 5.9722e24 * 317.83 / 5.9722e24);
      assert.equal(Units.mass(1, 'SolarMasses', 'Kilograms'), 1.98847e30);
      assert.equal(Units.mass(3, 'Kilograms', 'Kilograms'), 3);
      assert.equal(Units.time(1, 'Years', 'Days'), 24 * 365.25 / 24);
      assert.equal(Units.time(48, 'Hours', 'Days'), 2);
      assert.equal(Units.time(5, 'Days', 'Days'), 5);
    });

    test('temperatures go through kelvin', () => {
      assert.equal(Units.temperature(0, 'Celsius', 'Kelvin'), 273.15);
      assert.equal(Units.temperature(212, 'Fahrenheit', 'Celsius'), ((212 - 32) * 5 / 9) + 273.15 - 273.15);
      assert.equal(Units.temperature(273.15, 'Kelvin', 'Fahrenheit'), 32);
      assert.equal(Units.temperature(300, 'Kelvin', 'Kelvin'), 300);
      assert.equal(Units.temperature(10, 'Celsius', 'Fahrenheit'), ((10 + 273.15 - 273.15) * 9 / 5) + 32);
      assert.equal(Units.temperature(32, 'Fahrenheit', 'Kelvin'), 273.15);
    });

    test('an unknown unit is a RangeError', () => {
      assert.throws(() => Units.length(1, 'Furlongs', 'Kilometres'), {name: 'RangeError', message: 'Not a LengthUnit.'});
      assert.throws(() => Units.mass(1, 'Kilograms', 'Stone'), {name: 'RangeError', message: 'Not a MassUnit.'});
      assert.throws(() => Units.time(1, 'Weeks', 'Hours'), {name: 'RangeError', message: 'Not a TimeUnit.'});
    });
  });
}
