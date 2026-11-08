# HANDOFF

Updated 2026-11-07 (chain session 9). Status: in progress, **Stage 4 demo done in PR #8 (all checks green), waiting for Mark's merge**: the agent's merge was refused by the auto-mode permission check, and the PR adds a deploy workflow (pages.yml), so it is assigned to him with `needs-review`. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- Stages 0-3 done and merged (master 77a4e78 + Dependabot #3). Port complete: 18 of 18 goldens bit-exact, 190 tests, 100% coverage.
- Stage 4 (PR #8, branch `stage4-demo`): `demo/` static page, `npm run demo` builds `site/`, `.github/workflows/pages.yml` deploys on push to master. GitHub Pages is already switched on (build type: workflow), so the site goes live at https://m4bwav.github.io/universe-generator-ts/ on the first master push after #8 merges. Screenshot at `docs/images/demo-desktop.png`, linked from the README.
- **On GitHub**: https://github.com/m4bwav/universe-generator-ts (public). Ruleset `master` requires `ci`. Scripts need the git exec bit (`git update-index --chmod=+x`) since commits come from Windows.

## Next

1. If PR #8 is merged: check that the `pages` run passed and that the live URL loads and draws (Claude in Chrome JS checks; screenshots may time out, see log). If it is still open: branch Stage 5 from `stage4-demo`.
2. Stage 5 docs: README pass (quick start, demo link is in), and a PR to m4bwav/UniverseGenerator's README linking the TS port and the demo. Wiki with wikiwright after the first release.
3. Stage 6 release: bump package.json and jsr.json to 1.0.0 together, date the CHANGELOG heading, tag `v1.0.0` only after the two first-publish steps below are done.
4. Stage 7 launch kit drafts in `ai-docs/launch/` (posting is Mark's).

## Waiting on Mark

- Merge PR #8: https://github.com/m4bwav/universe-generator-ts/pull/8 (demo + Pages deploy workflow).
- First npm publish: npm trusted publishing can only be set on a package that exists, and the agent shell cannot log in to npm. Mark runs, in the repo on master: `npm run build && npm publish --access public` (version 1.0.0 after the bump), then on npmjs.com adds the trusted publisher (GitHub Actions, m4bwav/universe-generator-ts, workflow `release.yml`, no environment). Alternative: he publishes 0.0.x as a placeholder now so the trusted publisher can be added and 1.0.0 goes through release.yml.
- JSR: create `@m4bwav/universe-generator` on jsr.io (scope `m4bwav`) and link it to the GitHub repo in its settings, so release.yml's OIDC publish is accepted.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts were not granted then.
- 2026-11-07 session 3 kickoff: "I allow all publishing and merging and settings changes do it all don't forget a hero image for the repo". npm publish is now granted once the port is complete and `private: true` is dropped; the banner is done (commit 2cc4489).
- 2026-11-08 chain session 6: Mark granted JSR too ("you have full access, sure lets do jsr too"). At release, publish to npm as `universe-generator` and to JSR as `@m4bwav/universe-generator` (add `jsr.json`, tokenless publish from GitHub Actions via OIDC).
