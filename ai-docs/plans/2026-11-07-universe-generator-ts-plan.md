# UniverseGenerator in TypeScript, with a live galaxy demo

Goal: an npm package that gives the same galaxy as the C# UniverseGenerator 1.x for the same seed and options, and a public in-browser demo that sells it and points at Mark's game. Why this item was picked over a new plugin or the Python name port: it is visual and shareable (procedural generation communities, Show HN, Bluesky), it leads straight to a space game, and npm plus a demo page reaches game developers and players, where plugins reach only Claude Code users. Backlog entry: item 3 in [../../../../package-backlog/ports.md](../../../../package-backlog/ports.md).

## What was checked on 2026-11-07, before this plan

- Source: `D:/m4bwa/Claude/Projects/Ai/labs/UniverseGenerator` (public m4bwav/UniverseGenerator, 1.0.0 on nuget.org and OpenUPM). About 13,400 lines of C# under `Packages/com.m4bwav.universe-generator/Runtime`.
- It is built for cross-runtime determinism, so a port can be bit-exact:
  - `Core/Pcg32.cs`: PCG32 (64-bit state, multiplier 6364136223846793005), Lemire bounded ints, 53-bit doubles from two draws.
  - `Core/Seeds.cs`: SplitMix64, FNV-1a 64 over text (lone surrogates count as U+FFFD; never `GetHashCode`), child seeds by label and index.
  - `Core/DMath.cs`: Exp, Log, Pow, Sin, Cos, Atan2 and Round built only from + - * /, sqrt and floor (plan D5). A repo rule test bans `System.Random`. A word-boundary grep found only one raw `Math.Exp` and one raw `Math.Round` outside DMath; check both (comment or code) in Stage 0.
- Golden files: `tests/Golden/v1/*.json`, 18 files, 3.1 MB (core, tables, names, star-name, galaxy, shapes, system, planet, orbital-elements, moon-belt, cluster, universe, galaxy-extras, constraints, presets, hooks, diagnostics, export). They are the cross-language test vectors.
- Features that help the demo already exist in C#: `GeneratorOptions.ToCode()/FromCode()`, `Universe.Link(address, options)` and `Universe.At(link)` (shareable links), presets Pocket, Roguelike, Cozy, Epic, and `ToJson` with `"schema": "universe-generator/1"`.
- The game: SpaceDeckBuilder2.1 already installs the C# package (OpenUPM install verified 2026-10-11, branch `try/openupm-universe-generator`).
- npm rivals (search 2026-11-07): `galaxygen` (2017, unseeded-style loewald port), `threejs-galaxy` (visual effect only), `stellardream` and `@unsou/stellardream` (star systems from exoplanet stats, no galaxy, no cross-language promise). No seeded galaxy-to-moon generator with a cross-platform seed promise. `universe-generator` returned 404 on npm (free).

## Known risks, to settle early

1. **64-bit integers in JS.** PCG32, SplitMix64 and FNV need unsigned 64-bit wraparound. BigInt is simplest but slow; two 32-bit halves with `Math.imul` is fast. Stage 0 measures both and the demo needs an Epic (300 systems) galaxy in well under a second on a phone.
2. **Double semantics.** JS numbers are IEEE 754 doubles, like C#. Watch C# casts (`(int)` truncation, `(uint)`, `(long)`), integer division, `checked`/`unchecked`, `Math.Clamp`, and `BitConverter.Int64BitsToDouble` in DMath.Exp (needs a DataView).
3. **Text.** C# strings are UTF-16 like JS, but FNV hashes what the C# code hashes (read `Fnv1a` exactly). Sorting: any `string.Compare`, `OrderBy` on strings or culture-sensitive call must be ported ordinal.
4. **JSON text identity.** `export.json` holds exact `ToJson` text. C# double formatting (shortest round-trip, `E+` exponents) can differ from JS `String(x)`. Compare parsed values for every file, and the exact text for export, with a formatter that matches the C# writer.
5. **Size.** Name tables and data must stay inside the ports budget in [ports.md](../../../../package-backlog/ports.md) ("Rules for every port": yellow 1 MB, red 3 MB for the tarball). Goldens are dev-only and never ship.

## Stages

Each stage ends with tests green and HANDOFF.md updated. Sizes are agent effort: S under an hour, M a session, L several sessions.

### Stage 0. Feasibility gate (M)

In a scratch folder inside this project: port Pcg32, Seeds and DMath, and pass every case in `core.json` (and `tables.json` if it is only core). Measure BigInt against 32-bit halves. Check the two raw Math calls. **Gate:** if core is not bit-exact after a real attempt, stop, write down why in HANDOFF.md, and put the question on an askwright page (options: match within a tolerance and drop the "same galaxy" promise, or stop the port). Do not continue to Stage 1 on a failed gate.

### Stage 1. Repository (S)

Public repo `m4bwav/universe-generator-ts` (guess; the npm name stays `universe-generator`), cloned here as the project root's `repo/` or the project root itself, set up from package-modernize's npm templates (TypeScript, ESM with types, Node LTS, vitest, GitHub Actions CI, SECURITY.md, AGENTS.md with CLAUDE.md importing it, MIT). Goldens copied from the C# tag `v1.0.0` with their SHA-256 in a manifest and a test that fails if they change. Public repos run Actions for free; the self-hosted rule is for private repos.

### Stage 2. The port (L, several sessions)

Port in dependency order and turn each golden file green before the next: core, star-name, galaxy and shapes, system, then tables and names (both generate galaxies and systems, so they turn green after system; corrected 2026-11-07), planet and orbital-elements, moon-belt, cluster, universe, galaxy-extras, constraints, presets, hooks, diagnostics, export. Keep the C# public API's shape in idiomatic TypeScript (camelCase, classes or plain objects, lazy children as getters), and write a mapping table C# to TS in the README. Port the repo rules too (no `Math.random`, no raw `Math.sin/pow/exp/log/atan2` outside dmath, a lint test like `RepoRulesTests.cs`).

### Stage 3. Package (M)

Zero runtime dependencies. Tree-shakeable entry points; name tables lazy so a bundler does not pull them unless used. Size check in CI against the budget. `npm pack --dry-run` reviewed. Types and docs from TSDoc. A cross-language check script: generate N random seeds in C# (dotnet, from the clone) and TS, diff the JSON, and run it in CI if dotnet is cheap there, else locally before release.

### Stage 4. Demo (L)

A static site in the repo (`demo/`), deployed by GitHub Pages from CI:
- Seed box, preset picker and the options that matter; the URL carries seed and `ToCode()` options so every galaxy is a shareable link (`Universe.Link`/`At`).
- Galaxy view: stars, lanes, arms or bars, danger tint; pan and zoom; click a star for its system (planets, moons, belts, stations, names, the stories). Canvas 2D first; three.js (threewright) only if it earns its weight.
- "Same seed, same galaxy in C#, Unity and TypeScript" shown plainly, with the C# and Unity install lines.
- A footer and an about panel that name the game and link to its page (see Mark's decisions).
- Works on a phone, loads fast (measure), has Open Graph tags and a share image per seed if cheap.
- Checked in a real browser (Claude in Chrome or sitewright `verify`/`shoot`), screenshots kept in `docs/images/`.

### Stage 5. Docs (M)

README with a ComfyUI banner (standing rule), demo GIF or screenshots, quick start, the seed promise, the C# to TS table, links both ways with the C# repo (a PR to m4bwav/UniverseGenerator's README; merge it yourself under the PR rules). Wiki with wikiwright after the first release.

### Stage 6. Release (S)

Version 1.0.0 if every golden file passes (matching the C# major, so the seed promise reads the same), else 0.x. Tag and GitHub release yourself. npm trusted publishing set up and the publish itself wait for Mark.

### Stage 7. Launch kit (S)

Draft posts (everwrite) for r/proceduralgeneration, Show HN, Bluesky and the game's channels, each with the demo link and the game link, saved in `ai-docs/launch/`. Posting is Mark's. Add a repo-traffic capture for the new repo and the demo's views afterwards.

## Decisions for Mark (askwright), with the guess used until he answers

1. Which game the demo points at, its public name and link (guess: SpaceDeckBuilder2's public page if one exists, else a "made for an upcoming space deck-builder" line with no link).
2. Repo name (guess `m4bwav/universe-generator-ts`) and npm name (guess `universe-generator`).
3. npm publish go-ahead and trusted publishing setup (stop point).
4. Posting the launch drafts (stop point).
5. A failed Stage 0 gate, if it happens.
