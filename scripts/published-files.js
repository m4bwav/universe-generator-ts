// What the npm tarball holds, shared by test/package/shape.test.js (a dry-run pack of the checkout) and check-tarball.mjs (the tarball release.yml stages).
export const PUBLISHED_FILES = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'dist/index.cjs',
  'dist/index.cjs.map',
  'dist/index.d.cts',
  'dist/index.d.mts',
  'dist/index.mjs',
  'dist/index.mjs.map',
  'package.json',
];

// Set from the first full build in Stage 3 (452 KB packed, 2026-11-08) with room to grow; ports budget: yellow 1 MB, red 3 MB.
export const TARBALL_BUDGET = 600_000;
