# Launch drafts

Drafts only. Posting is Mark's call. Post after 1.0.0 is on npm and JSR, so the install line works.

## Show HN

Title: Show HN: Seeded galaxy generator in TypeScript, bit-exact with its C# original

Body:

I wrote UniverseGenerator in C# for .NET and Unity: give it a seed, get a galaxy with star systems, planets, moons, lanes, factions and story hooks. This is the TypeScript port. The same seed gives the same galaxy in both, checked against all 18 of the C# project's golden files on the ES module and CommonJS builds.

No dependencies. Runs on Node 20+, Bun, Deno and in browsers.

Demo (type a seed, click a star): https://m4bwav.github.io/universe-generator-ts/

Code: https://github.com/m4bwav/universe-generator-ts

## r/proceduralgeneration

Title: Same seed, same galaxy in C# and TypeScript: a browser demo

Body:

A seeded generator for universes, clusters, galaxies, star systems, planets and moons. The C# version ships on NuGet and OpenUPM for Unity; the TypeScript port matches it bit for bit, so a server in .NET and a web client can agree on one galaxy from one seed.

The demo draws the map in Canvas 2D: lanes, faction rings, hazard clouds. Click a star for its planets and moons. The URL rebuilds the same galaxy.

https://m4bwav.github.io/universe-generator-ts/

## Bluesky / Mastodon

Type a seed, get a galaxy. The TypeScript port of my UniverseGenerator matches the C# and Unity version bit for bit. Browser demo: https://m4bwav.github.io/universe-generator-ts/
