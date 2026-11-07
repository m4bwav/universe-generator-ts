# Log

## 2026-11-07

Picked over a new plugin and the Python name port: the most attention that can point at a game. Checked the C# source's determinism (PCG32, SplitMix64, FNV-1a, DMath built from exact operations), the 18 golden files (3.1 MB), npm rivals and that `universe-generator` is free on npm. Wrote the plan, HANDOFF.md and the continue prompt. No code yet.

## 2026-11-07, session 2 (chain session 1)

- Stage 0 gate PASSED: Pcg32, Seeds and DMath ported; all 109 checks of `core.json` bit-exact (`scratch/stage0/`, kept out of git). PCG32 on two 32-bit halves draws in 11 ns against 119 ns for BigInt (Node 24), so the hot path uses halves and seeds stay BigInt (0.4 us a child seed). The two "raw" `Math.Exp`/`Math.Round` hits outside DMath are only doc comments in DMath.cs.
- askwright set `ask/ugts-decisions-1` answered and closed: demo links **markdavidrogers.com**, kept in one config value so it can switch later ("maybe Jennifer's game when she's ready"); names as guessed: repo `m4bwav/universe-generator-ts`, npm `universe-generator`.
- Stage 1: repo set up at the project root from package-modernize's npm templates; goldens copied from C# tag v1.0.0 (unchanged at fc41277) with `test/golden/manifest.json` SHA-256s and a test; core moved to `src/core/`; 23 tests green, coverage 100%, xo, tsc, publint and attw clean.
- Small rulings (flagged): node --test instead of the plan's vitest (the template's runner; no extra dependency). `package.json` is `"private": true` until Mark approves publishing. Pcg32, Seeds and DMath are exported publicly (useful on their own, mirror the C# names). Consumers, Bun/Deno, release.yml and verify-published are deferred to Stage 3 (packaging); ci.yml has lint, package and the test matrix only. xo rules that fight bit-level porting are off for `src/core/` with reasons in xo.config.js.


## 2026-11-07, session 3 (chain session 2)

- `gh repo create` refused again by the permission classifier ("Create Public Surface"); still local only.
- Golden order corrected: `tables.json` and `names.json` both generate galaxies and systems (TableTests.cs, InventedNameTests.cs), so only `star-name.json` is reachable before the galaxy port. The plan's order stays for everything else; tables.json and names.json turn green with galaxy + system.
- Ported `src/options.ts` (GeneratorOptions, Preset, Guarantee, validation in the C# order and wording), `src/tables.ts` (GeneratorTables, register/find/with/fromJson/toJson), `src/stars/star-generator.ts` (makeStar, rollStar), `src/names/` (star tables embedded by `scripts/embed-star-tables.py` from StarTables.cs, drawStarName, generateStarNames). `star-name.json` bit-exact on the first run (6 lists x 2 builds). 85 tests, 100% coverage, xo, tsc and publint clean. Commit 5badca0.
- Small rulings (flagged): C# enums become string unions with the C# names (the JSON writes those names); Guarantee stays numeric flags with the C# values so option codes can match later. Options are plain frozen objects (`{...Preset.pocket, tables: 'x'}`), validated by `validateOptions`; errors are RangeError/TypeError/SyntaxError carrying the C# messages. `GeneratorTables.fromJson` uses JSON.parse plus key checks; the C# reader's "at character N" positions are not reproduced (only the message text after them). `toJson(true)` uses 2-space JSON.stringify; the C# indented format is checked when JsonWriter is ported for the galaxy goldens. Rule overrides for C#-mirrored names, flags and default-branch switches are in xo.config.js with reasons.
