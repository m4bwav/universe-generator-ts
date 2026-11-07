# HANDOFF

Updated 2026-11-07 (chain session 1). Status: in progress, Stage 1 done locally. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- Stage 0 gate passed: core bit-exact with `core.json` (109/109); PCG32 on 32-bit halves (11 ns a draw).
- Stage 1: the project root is the git repository (branch `master`, commit 3a1e808), with templates, goldens + SHA-256 manifest, `src/core/` (pcg32, seeds, dmath), 23 tests green, 100% coverage, lint and types clean. **Not on GitHub yet**: `gh repo create` was refused by the Claude Code permission classifier ("Create Public Surface").

## Next

1. If Mark has allowed it (or created the repo himself): `gh repo create m4bwav/universe-generator-ts --public --source . --push`, then turn on private vulnerability reporting (`gh api -X PUT repos/m4bwav/universe-generator-ts/private-vulnerability-reporting`), watch CI go green, and add the ruleset requiring `ci` on master. If still refused, carry on locally.
2. Stage 2: `tables.json`, then names and star-name. Read `../UniverseGenerator/tests/UniverseGenerator.Tests/GoldenTablesTests.cs` (and the Runtime code it calls) first; one test file per golden file under `test/golden/`, added to `test:dist` and `coverage` in package.json.

## Waiting on Mark

- Permission to create the public GitHub repo from a session (classifier blocked it), or he creates `m4bwav/universe-generator-ts` himself and the next session pushes.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts are not granted.
