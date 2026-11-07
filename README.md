# universe-generator

![A spiral galaxy seen from above, blue and gold arms, with a few star systems joined by thin cyan lines like a star map](https://raw.githubusercontent.com/m4bwav/universe-generator-ts/master/.github/images/banner.jpg)

[![CI](https://github.com/m4bwav/universe-generator-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/m4bwav/universe-generator-ts/actions/workflows/ci.yml)

Seeded galaxies, star systems, planets and moons in TypeScript. The same seed gives the same universe here as in the C# and Unity [UniverseGenerator](https://github.com/m4bwav/UniverseGenerator), bit for bit, checked against that project's own golden files.

**Work in progress.** The deterministic core (PCG32, seeds, deterministic maths) passes the C# golden file `core.json`; the galaxy, system and planet generators are being ported one golden file at a time. It is not on npm yet.

## License

MIT
