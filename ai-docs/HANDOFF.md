# HANDOFF

Updated 2026-11-08 (chain session 11). Status: in progress, **Stages 0-5 and 7 drafts done; release (Stage 6) waits on Mark's first npm publish and the JSR package**. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- Port complete (18/18 goldens, 190 tests). Demo live at https://m4bwav.github.io/universe-generator-ts/ (PR #8 merged, pages run green, page and bundle return 200).
- Stage 5: README already done. C# README link PR https://github.com/m4bwav/UniverseGenerator/pull/68 is open: its required checks do not run on docs-only changes, so the branch policy blocks the merge; assigned to Mark (needs-review). Not merged with --admin.
- Stage 7: drafts in `ai-docs/launch/drafts.md` (Show HN, r/proceduralgeneration, Bluesky). Post after 1.0.0 is live.
- Version stays 0.0.0 on purpose: release.yml expects `npm version 1.0.0` to make the commit and tag together.

## Next

1. If Mark has published to npm and created the JSR package: on master run `npm version 1.0.0` (also set jsr.json to 1.0.0 and date the CHANGELOG in the same commit; check release.yml's jsr version check), `git push --follow-tags`, watch release.yml, then verify-published.yml. Then the wiki (wikiwright) and update installed docs.
2. If #68 is still open, leave it for Mark.
3. Otherwise nothing moves: stop and say what waits.

## Waiting on Mark

- Merge https://github.com/m4bwav/UniverseGenerator/pull/68 (C# README link; required checks never start on docs-only PRs).
- First npm publish: npm trusted publishing can only be set on a package that exists. Mark runs on master: `npm run build && npm publish --access public` (a 0.0.x placeholder is fine), then on npmjs.com adds the trusted publisher (GitHub Actions, m4bwav/universe-generator-ts, workflow `release.yml`, no environment).
- JSR: create `@m4bwav/universe-generator` on jsr.io (scope `m4bwav`) and link it to the GitHub repo.
- Posting the launch drafts.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts were not granted then.
- 2026-11-07 session 3 kickoff: "I allow all publishing and merging and settings changes do it all don't forget a hero image for the repo". npm publish is now granted once the port is complete and `private: true` is dropped; the banner is done (commit 2cc4489).
- 2026-11-08 chain session 6: Mark granted JSR too ("you have full access, sure lets do jsr too"). At release, publish to npm as `universe-generator` and to JSR as `@m4bwav/universe-generator` (add `jsr.json`, tokenless publish from GitHub Actions via OIDC).
