# HANDOFF

Updated 2026-11-08 (chain session 13; npm 1.0.0 still staged, nothing moved). Status: in progress, **1.0.0 on JSR and GitHub; npm 1.0.0 staged, waits on Mark's approval**. Plan: [plans/2026-11-07-universe-generator-ts-plan.md](plans/2026-11-07-universe-generator-ts-plan.md). Log: [log.md](log.md). Continue prompt: [plans/universe-generator-ts-continue-prompt.md](plans/universe-generator-ts-continue-prompt.md).

## Where it stands

- 1.0.0 released on JSR (https://jsr.io/@m4bwav/universe-generator) and as a GitHub Release. npm 1.0.0 is **staged** and waits for Mark's approval. Demo live at https://m4bwav.github.io/universe-generator-ts/.
- npm trusted publisher set (release.yml). JSR package linked to the repo.

## Next

1. If npm shows 1.0.0 live (`npm view universe-generator version`): run verify-published.yml with 1.0.0, check release.yml's "move next" job, then update the wiki per `ai-docs/notes/2026-11-08-github-wiki.md`.
2. If it is still staged, stop and say it waits on Mark.
3. If #68 on the C# repo is still open, leave it.
4. After 1.0.0 is live on npm: Stage 7 posts wait on Mark.

## Waiting on Mark

- Approve the staged npm 1.0.0: npmjs.com, Settings, Staged Packages, Approve (security key).
- Merge https://github.com/m4bwav/UniverseGenerator/pull/68.
- Posting the launch drafts.

## Decisions made

- Demo links markdavidrogers.com, set in one config value so it can switch later (maybe Jennifer's game). Names: repo `m4bwav/universe-generator-ts`, npm `universe-generator` (askwright set `ask/ugts-decisions-1`, closed).

## Grants

- 2026-11-07: Mark approved building this through chained sessions ("I'm in"). Creating the public repo, merging own PRs, tagging and GitHub releases follow the standing rules in `C:/Users/m4bwa/.claude/CLAUDE.md`. npm publishing and public posts were not granted then.
- 2026-11-07 session 3 kickoff: "I allow all publishing and merging and settings changes do it all don't forget a hero image for the repo". npm publish is now granted once the port is complete and `private: true` is dropped; the banner is done (commit 2cc4489).
- 2026-11-08 chain session 6: Mark granted JSR too ("you have full access, sure lets do jsr too"). At release, publish to npm as `universe-generator` and to JSR as `@m4bwav/universe-generator` (add `jsr.json`, tokenless publish from GitHub Actions via OIDC).
