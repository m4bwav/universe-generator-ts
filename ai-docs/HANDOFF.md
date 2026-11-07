# HANDOFF

Updated 2026-11-07 (chain session 2). Status: in progress, Stage 2 under way. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- Stage 0 gate passed; Stage 1 done (local repo, branch `master`).
- Stage 2: core.json and **star-name.json bit-exact**; options, weight tables, star generator and star names ported (commit 5badca0). 85 tests, 100% coverage, lint and types clean.
- **Not on GitHub yet**: `gh repo create` refused by the permission classifier in sessions 1 and 2.

## Next

1. If Mark has allowed it (or created the repo): `gh repo create m4bwav/universe-generator-ts --public --source . --push`, private vulnerability reporting on, CI green, ruleset requiring `ci` on master. Otherwise carry on locally; do not retry more than once.
2. Port `JsonWriter.cs` (indented format) and the test-side writers `GalaxyJson.cs`/`SystemJson.cs` as test helpers, comparing goldens as text the way `Repo.AssertGolden` does.
3. Galaxy: `Galaxy.cs`, `GalaxyLayout.cs`, `Address.cs`, `InventedNames.cs`, `Diagnostics.cs` as needed, then `galaxy.json`, `shapes.json`, `names.json` (galaxies part). Then StarSystemGenerator for `system.json`, the systems parts of `names.json` and `tables.json` (register `red-sky` and `gardens` as TableTests.cs does).
4. Port the repo rules test (no Math.random, no raw Math.sin/pow/exp/log/atan2 outside src/core) when the galaxy code lands.

## Waiting on Mark

- Permission to create the public GitHub repo from a session (classifier blocked it), or he creates `m4bwav/universe-generator-ts` himself and the next session pushes.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts are not granted.
