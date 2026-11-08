// A consumer written as an ES module: named imports of the installed package. Runs under Node, Bun and Deno.
// The answers come from the C# golden file galaxy.json (seed "my-seed", default options).
import assert from 'node:assert/strict';
import {
  generateGalaxy,
  generateAt,
  toJson,
  generatorVersion,
} from 'universe-generator';

if (typeof import.meta.resolve === 'function') {
  assert.match(import.meta.resolve('universe-generator'), /\/dist\/index\.mjs$/u, 'import resolves to the ESM build');
}

assert.equal(generatorVersion, 1);
const galaxy = generateGalaxy('my-seed');
assert.equal(galaxy.shape, 'Ring');
assert.equal(galaxy.regions[0].name, 'Musca Drift');
assert.equal(galaxy.map.length, 60);

const again = generateAt('v1-my-seed/galaxy');
assert.equal(toJson('galaxy', again), toJson('galaxy', galaxy), 'the same galaxy reached by its address');

console.log('esm-node ok');
