// Builds the demo site into site/: the demo files, the ESM bundle and the social preview image.
// Run `npm run build` first (npm run demo does both).
import {
  cpSync,
  mkdirSync,
  rmSync,
  existsSync,
} from 'node:fs';

if (!existsSync('dist/index.mjs')) {
  throw new Error('dist/index.mjs is missing: run npm run build first.');
}

rmSync('site', {recursive: true, force: true});
mkdirSync('site');
cpSync('demo', 'site', {recursive: true});
cpSync('dist/index.mjs', 'site/universe-generator.mjs');
cpSync('.github/images/social-preview.jpg', 'site/social-preview.jpg');
console.log('site/ ready');
