// A consumer written in CommonJS: require() of the installed package gives the same answers as the ES module build.
'use strict';

const assert = require('node:assert/strict');
const {generateGalaxy, generatorVersion} = require('universe-generator');

assert.match(require.resolve('universe-generator'), /[/\\]dist[/\\]index\.cjs$/u, 'require resolves to the CommonJS build');

assert.equal(generatorVersion, 1);
const galaxy = generateGalaxy('my-seed');
assert.equal(galaxy.shape, 'Ring');
assert.equal(galaxy.regions[0].name, 'Musca Drift');
assert.equal(galaxy.map.length, 60);

console.log('cjs-node ok');
