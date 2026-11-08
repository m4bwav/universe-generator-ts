# HANDOFF

Updated 2026-11-08 (chain session 13; npm 1.0.0 still staged, nothing moved). Status: in progress, **1.0.0 released on npm, JSR and GitHub; small follow-ups left**. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- **1.0.0 is live** on npm (`universe-generator`), JSR (`@m4bwav/universe-generator`) and as a GitHub Release. Demo live. Wiki updated for 1.0.0 (examples re-run against npm).

## Next

1. Add the missing `.github/workflows/verify-published.yml` (release.yml and zizmor.yml expect it; package-modernize npm template has one), PR, merge when green.
2. Mark's open API questions from the wiki note (`checkOptions` partial options, missing-seed message) wait on him.
3. If #68 on the C# repo is still open, leave it.

## Waiting on Mark

- Merge https://github.com/m4bwav/UniverseGenerator/pull/68.
- Posting the launch drafts (`ai-docs/launch/drafts.md`); the package is live now.
- The two API questions above.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts were not granted then.
- 2026-11-07 session 3 kickoff: "I allow all publishing and merging and settings changes do it all don't forget a hero image for the repo". npm publish is now granted once the port is complete and `private: true` is dropped; the banner is done (commit 2cc4489).
- 2026-11-08 chain session 6: Mark granted JSR too ("you have full access, sure lets do jsr too"). At release, publish to npm as `universe-generator` and to JSR as `@m4bwav/universe-generator` (add `jsr.json`, tokenless publish from GitHub Actions via OIDC).
