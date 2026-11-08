# Changelog

## [1.1.0] - 2026-11-08

- `checkOptions` takes partial options and fills in defaults, as the generators do.
- A missing seed (`undefined`, `null` or a non-seed value) throws `TypeError: A seed is required (a string, number or bigint)` instead of the engine's BigInt error.

## [1.0.0] - 2026-11-08

- The whole public API of the C# UniverseGenerator 1.0.0, ported to TypeScript: universes, clusters, galaxies with extras and constraints, star systems, planets, moons, belts, star names, presets and options codes, addresses (`generateAt`, `linkTo`, `Address.tryParse`), JSON export, hooks and custom fields, units and distances, editable tables.
- Bit-exact with all 18 C# golden files, on the ES module and CommonJS builds.
- Published to npm as `universe-generator` and to JSR as `@m4bwav/universe-generator`.
