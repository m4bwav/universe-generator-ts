# AGENTS.md

Rules for any AI agent (Claude Code, Copilot, Cursor, Codex) working in this repository. `CLAUDE.md` and `.github/copilot-instructions.md` only point here.

## What this is

The TypeScript port of [UniverseGenerator](https://github.com/m4bwav/UniverseGenerator) (C#, Unity; 1.0.0 on nuget.org and OpenUPM), to be published on npm as `universe-generator`, with a live galaxy demo. Source in `src/`, built by tsdown into ESM and CommonJS with a declaration file for each, no runtime dependencies. The plan is `ai-docs/plans/2026-11-07-universe-generator-ts-plan.md`; start with `ai-docs/HANDOFF.md` to see how far it has got. The C# source is at `../UniverseGenerator` on Mark's machine; never write to it except through a pull request.

## Rules

- **Same seed, same universe.** For the same seed and options this package gives exactly what the C# UniverseGenerator 1.x gives, bit for bit. The proof is `test/golden/v1/`, the C# repository's own golden files copied from tag `v1.0.0` with their SHA-256 in `test/golden/manifest.json`. Never edit a golden file to make a test pass; the fix belongs in `src/`. Dropping or loosening this promise is the maintainer's decision.
- **Determinism rules, as in the C# repository.** No `Math.random`. No `Math.exp`, `log`, `pow`, `sin`, `cos`, `tan`, `atan`, `atan2` or `Math.round` outside `src/core/dmath.ts`; use `DMath`. `Math.sqrt`, `Math.floor` and `Math.abs` are exact and allowed. Port C# integer semantics explicitly: `(int)` truncates toward zero, integer division truncates, `uint` and `ulong` wrap. Sort strings ordinally, never with `localeCompare`.
- **Availability.** Usable from `import` and `require`, types for both, every Node line in `engines`. The library uses no Node or DOM APIs (`process`, `Buffer`, `node:` imports, `window`, `document`), so it runs in browsers, Bun, Deno and workers. No runtime dependency without a decision entry in `ai-docs/decisions/`.
- **Releases go through `release.yml` only.** Mark granted npm and JSR publishing (see `ai-docs/HANDOFF.md`, Grants), but the first `npm publish` and the npm trusted publisher, and creating the JSR package, are his. After that, release by `npm version` + `git push --follow-tags`; never run `npm publish` from a shell, never create or store an npm token.
- **Size.** The tarball stays under the ports budget (yellow 1 MB, red 3 MB); golden files are dev-only and never ship.
- **Document for handoff.** Anything learned, decided or built goes into `ai-docs/` (at minimum a line in `ai-docs/log.md`) before you finish; rewrite `ai-docs/HANDOFF.md` when work is left unfinished.
- **No AI attribution anywhere**: no Co-Authored-By trailers, no "generated with" lines in commits, pull requests or files.
- **Windows note.** Write files with an editor tool, not shell heredocs (they lose backslashes). `.gitattributes` keeps the repository LF.

## Commands

```bash
npm ci
npm run build       # tsdown -> dist/
npm test            # build, then node --test: golden manifest, golden cases, package shape
npm run test:dist   # the same suites against the dist/ already built
npm run coverage    # c8 over src/
npm run lint        # xo
npm run typecheck   # tsc --noEmit
npm run check       # publint, attw, npm pack --dry-run
```

tsdown needs Node 22.18+ or 24 to build; the built output and the tests run on Node 20 and up.

## Layout and traps

- `src/core/pcg32.ts`: PCG32 on two 32-bit halves (ten times faster than BigInt). `src/core/seeds.ts`: SplitMix64, FNV-1a, child seeds, streams (BigInt). `src/core/dmath.ts`: deterministic maths. `src/index.ts` re-exports. Core imports nothing outside `src/core/`.
- Each golden file has one test file under `test/golden/`, named after it; a file's test is written from the C# test that builds it (`../UniverseGenerator/tests/UniverseGenerator.Tests/Golden*Tests.cs`).
- Tests import `dist/`, never `src/`, and run against both builds (`test/helpers/builds.js`). The npm scripts name every test file.
- `package.json` `main`, `module`, `types` and `exports` are rewritten by tsdown on every build; edit them in `tsdown.config.ts`.
- `xo --fix` rewrites code: stage your work first and read the diff.
