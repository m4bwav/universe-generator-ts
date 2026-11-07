# HANDOFF

Updated 2026-11-07 (chain session 3). Status: in progress, Stage 2 under way. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- Stage 0 gate passed; Stage 1 done (local repo, branch `master`).
- Stage 2: **7 of 18 goldens bit-exact**: core, star-name, shapes, system, galaxy, names, tables (commits 5badca0, f2c7d89, 2dd3182). Ported: options, tables, stars, star names, JsonWriter, Address (no parsing), invented names, galaxy layout + lone galaxy generator, star systems (base fields), planets alone; repo rules test. 108 tests, 100% coverage, lint and types clean.
- Not ported yet (absent, not faked): galaxy extras (factions, POIs, hazards, monuments, beacons), guarantees (`require` validated but ignored), hooks, clusters/universe, PlanetDetail/MoonDetail/BeltDetail and their stories, Address.TryParse, export.
- **Not on GitHub yet**: `gh repo create` refused by the permission classifier in sessions 1 and 2.

## Next

1. If Mark has allowed it (or created the repo): `gh repo create m4bwav/universe-generator-ts --public --source . --push`, private vulnerability reporting on, CI green, ruleset requiring `ci` on master. Otherwise carry on locally; do not retry more than once.
2. Detail layers for `planet.json`, `moon-belt.json`, `orbital-elements.json`: PlanetDetail, PlanetStory, PlanetRecords, MoonDetail, MoonStory, BeltDetail, Units (writers PlanetJson.cs, MoonBeltJson.cs; tests GoldenPlanetTests, GoldenMoonBeltTests, OrbitalElementTests).
3. Galaxy extras and guarantees: GalaxyExtrasGenerator + GalaxyExtras (`galaxy-extras.json`, ExtrasJson.cs), Constraints (`constraints.json`), Diagnostics/OptionsCode/Check (`diagnostics.json`), presets (`presets.json`), hooks (`hooks.json`).
4. Clusters and universe: ClusterGenerator, GalaxyCluster, Universe, UniverseGenerator, Distances (`cluster.json`, `universe.json`), then JsonExport/JsonReader (`export.json`).
5. Keep using `test/helpers/golden-json.js` for the C# test-side writers; add each new golden test to `test:dist`, `coverage` and the xo golden-test list.

## Waiting on Mark

- Permission to create the public GitHub repo from a session (classifier blocked it), or he creates `m4bwav/universe-generator-ts` himself and the next session pushes.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts are not granted.
