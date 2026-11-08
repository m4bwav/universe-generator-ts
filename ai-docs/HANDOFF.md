# HANDOFF

PR #4 (stage2-extras) merged to master 2026-11-08 as a40e98c, CI green on all jobs.

Updated 2026-11-08 (chain session 5, merged as PR #4). Status: in progress, Stage 2 under way. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- Stage 0 gate passed; Stage 1 done (local repo, branch `master`).
- Stage 2: **10 of 18 goldens bit-exact**: core, star-name, shapes, system, galaxy, names, tables, planet, moon-belt, orbital-elements (commits 5badca0, f2c7d89, 2dd3182, a598f07). Ported: options, tables, stars, star names, JsonWriter, Address (no parsing), invented names, galaxy layout + lone galaxy generator, star systems, planets alone, the planet/moon/belt detail layers and Units (no `Units.map`); repo rules test. 120 tests, 100% coverage, lint and types clean.
- Session 5 (branch `stage2-extras`, commits 85d908e, 0c321a8, fde67c7, merged in PR #4 as a40e98c): galaxy extras, guarantees (`require` honoured), options code and Check ported. **13 of 18 goldens bit-exact** (+ constraints, diagnostics, presets) and galaxy-extras.json bit-exact for its 8 lone galaxies (prefix test until clusters land). 138 tests, 100% coverage.
- Not ported yet: hooks (hooks.json needs GeneratorHooks + JsonExport + Universe), clusters/universe, Address.TryParse, export, `Units.Map` (needs Distances).
- **On GitHub**: https://github.com/m4bwav/universe-generator-ts (public, 2026-11-08). CI green on all jobs; ruleset `master` requires `ci` (admin bypass); Discussions, private vulnerability reporting and the social preview are on. Scripts need the git exec bit (`git update-index --chmod=+x`) since commits come from Windows.

## Next

1. Work on branches, open a PR, merge it yourself once `ci` passes (standing rules).
2. Push `stage2-extras`, open a PR, merge once `ci` passes. Then hooks (`hooks.json`) together with export and universe.
3. Clusters and universe (then switch galaxy-extras.test.js from `assertGoldenPrefix` to `assertGolden`): ClusterGenerator, GalaxyCluster, Universe, UniverseGenerator, Distances (`cluster.json`, `universe.json`), then JsonExport/JsonReader (`export.json`); add `Units.map` with Distances.
4. Keep using `test/helpers/golden-json.js` for the C# test-side writers; add each new golden test to `test:dist`, `coverage` and the xo golden-test list.

## Waiting on Mark

- Nothing. npm publish is granted once the port is complete and `private: true` is dropped.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts were not granted then.
- 2026-11-07 session 3 kickoff: "I allow all publishing and merging and settings changes do it all don't forget a hero image for the repo". npm publish is now granted once the port is complete and `private: true` is dropped; the banner is done (commit 2cc4489).
