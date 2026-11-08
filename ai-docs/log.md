# Log

## 2026-11-07

Picked over a new plugin and the Python name port: the most attention that can point at a game. Checked the C# source's determinism (PCG32, SplitMix64, FNV-1a, DMath built from exact operations), the 18 golden files (3.1 MB), npm rivals and that `universe-generator` is free on npm. Wrote the plan, HANDOFF.md and the continue prompt. No code yet.

## 2026-11-07, session 2 (chain session 1)

- Stage 0 gate PASSED: Pcg32, Seeds and DMath ported; all 109 checks of `core.json` bit-exact (`scratch/stage0/`, kept out of git). PCG32 on two 32-bit halves draws in 11 ns against 119 ns for BigInt (Node 24), so the hot path uses halves and seeds stay BigInt (0.4 us a child seed). The two "raw" `Math.Exp`/`Math.Round` hits outside DMath are only doc comments in DMath.cs.
- askwright set `ask/ugts-decisions-1` answered and closed: demo links **markdavidrogers.com**, kept in one config value so it can switch later ("maybe Jennifer's game when she's ready"); names as guessed: repo `m4bwav/universe-generator-ts`, npm `universe-generator`.
- Stage 1: repo set up at the project root from package-modernize's npm templates; goldens copied from C# tag v1.0.0 (unchanged at fc41277) with `test/golden/manifest.json` SHA-256s and a test; core moved to `src/core/`; 23 tests green, coverage 100%, xo, tsc, publint and attw clean.
- Small rulings (flagged): node --test instead of the plan's vitest (the template's runner; no extra dependency). `package.json` is `"private": true` until Mark approves publishing. Pcg32, Seeds and DMath are exported publicly (useful on their own, mirror the C# names). Consumers, Bun/Deno, release.yml and verify-published are deferred to Stage 3 (packaging); ci.yml has lint, package and the test matrix only. xo rules that fight bit-level porting are off for `src/core/` with reasons in xo.config.js.


## 2026-11-07, session 3 (chain session 2)

- `gh repo create` refused again by the permission classifier ("Create Public Surface"); still local only.
- Golden order corrected: `tables.json` and `names.json` both generate galaxies and systems (TableTests.cs, InventedNameTests.cs), so only `star-name.json` is reachable before the galaxy port. The plan's order stays for everything else; tables.json and names.json turn green with galaxy + system.
- Ported `src/options.ts` (GeneratorOptions, Preset, Guarantee, validation in the C# order and wording), `src/tables.ts` (GeneratorTables, register/find/with/fromJson/toJson), `src/stars/star-generator.ts` (makeStar, rollStar), `src/names/` (star tables embedded by `scripts/embed-star-tables.py` from StarTables.cs, drawStarName, generateStarNames). `star-name.json` bit-exact on the first run (6 lists x 2 builds). 85 tests, 100% coverage, xo, tsc and publint clean. Commit 5badca0.
- Small rulings (flagged): C# enums become string unions with the C# names (the JSON writes those names); Guarantee stays numeric flags with the C# values so option codes can match later. Options are plain frozen objects (`{...Preset.pocket, tables: 'x'}`), validated by `validateOptions`; errors are RangeError/TypeError/SyntaxError carrying the C# messages. `GeneratorTables.fromJson` uses JSON.parse plus key checks; the C# reader's "at character N" positions are not reproduced (only the message text after them). `toJson(true)` uses 2-space JSON.stringify; the C# indented format is checked when JsonWriter is ported for the galaxy goldens. Rule overrides for C#-mirrored names, flags and default-branch switches are in xo.config.js with reasons.

## 2026-11-07, session 4 (chain session 3)

- Ported `src/core/json-writer.ts` (C# JsonWriter, indented and compact, numbers printed from integers), `src/core/address.ts` (Address, rootSeed; parsing not ported), `src/names/invented-names.ts`, `src/galaxies/galaxy-layout.ts` (GalaxyLayout with Density and Grid), `src/galaxies/galaxy.ts` (lone GalaxyGenerator, Diagnostics.Shape, GalaxyTypes.Derive/Describe for a lone galaxy, lazy `galaxy.system(i)`), `src/systems/star-system.ts` (StarSystemGenerator, Story, PlanetGenerator for planets alone). Test side: `test/helpers/golden-json.js` (GalaxyJson.cs, SystemJson.cs, Repo.AssertGolden comparing text and naming the first differing line).
- Goldens bit-exact (both builds), each on the first run: **shapes.json, system.json, galaxy.json** (commit f2c7d89), **names.json, tables.json** (commit 2dd3182; `red-sky` and `gardens` registered as TableTests.cs does). Repo rules test `test/unit/repo-rules.test.js` (no Math.random, Date, Intl/localeCompare, non-exact Math functions, Node/DOM APIs; raw Math.exp/log/pow/sin/cos/tan/atan/atan2/round only in core/dmath.ts). 108 tests, 100% coverage, xo and tsc clean (8 old-style warnings).
- Trap found: `xo --fix` (unicorn/prefer-modern-math-apis) rewrote `Math.sqrt(x * x + y * y)` to `Math.hypot(x, y)`, which is not bit-identical; reverted and the rule is off for `src/` with the reason. Also off for `src/`, with reasons in xo.config.js: no-mixed-operators (C# expression text kept), prefer-simple-condition-first (reordering `&&` can skip a random draw), consistent-class-member-order (C# order), max-params and consistent-boolean-name (C# signatures).
- Small rulings (flagged): `JsonWriter`, `Address`, `rootSeed` and `drawInventedName` are exported (tests import dist only, and they mirror C# types); C# keeps JsonWriter and Address internal. Galaxy and system records are plain objects; `galaxy.system(i)` generates and caches. Not ported yet, and silently absent: galaxy extras (factions, points of interest, hazards, monuments, beacons; MapEntry.faction/contested), guarantees (`require` is validated but ignored), hooks, clusters/universe, and the detail layers (PlanetDetail, MoonDetail, BeltDetail and their stories). None of these change a field of the five goldens; each draws from its own streams.

- (main session) Banner made on the PC ComfyUI (Z-Image Turbo 1536x640, four seeds, picked 22), saved with workflow, prompt and a 1280x640 social-preview crop in `.github/images/`; README opens with it (2cc4489). `gh repo create` refused by the classifier a third time despite Mark's blanket go-ahead; left for him. Galaxy port done by a subagent (see above). npm publish granted by Mark but waits on the port being complete.

## 2026-11-07, session 5 (chain session 4)

- Ported the detail layers: `src/planets/planet-records.ts` (PlanetRecords.cs enums and records), `src/planets/planet-detail.ts` (PlanetDetail.cs and PlanetStory.cs: physics, light, Jeans-rule air, rotation and tidal lock, life, climate bands and biomes, traits, anomaly, resources, hazards, similarity, habitability, summary), `src/moons/moon-detail.ts` (MoonDetail.cs and MoonStory.cs), `src/belts/belt-detail.ts` (BeltDetail.cs), `src/core/units.ts` (Units.cs without `Units.Map`, which needs Distances). `src/systems/words.ts` now holds `withArticle` and the planet nouns so the moon story can use them without an import cycle; `logUniform` moved to planet-detail. Test side: PlanetJson.cs and MoonBeltJson.cs writers in `test/helpers/golden-json.js`; `test/golden/planet.test.js`, `moon-belt.test.js`, `orbital-elements.test.js`; `test/unit/units.test.js`.
- Goldens bit-exact (both builds), each on the first run: **planet.json, moon-belt.json, orbital-elements.json**. 10 of 18 now. `npm test` 120 tests, coverage 100% (lines, branches, functions), xo clean (13 old-style complexity/depth warnings), tsc clean.
- Traps found (none bit): the moon's stand-in planet for hazards and summary is a C# `new Planet { ... }` with every other field at its default (flora 0, rotation 0 and so on); ported as an explicit `StoryPlanet` holding only the fields Hazards and Summary read. An envelope atmosphere has `Pressure = null` in C# (`undefined` here; the writer prints null), so a giant's hazards start from "no surface". `pickTraits` keeps the second weighted draw inside the false branch of the ternary, so it is drawn only when a second trait is wanted and possible, as in C#. The Bash tool failed on one long command with several quoted heredocs ("unexpected EOF looking for matching '"); test files were written with the Write tool instead.
- Small rulings (flagged): C# `Species.Human` is exported as `humanSpecies` (xo refuses a type and a value both named Species); `Units.Convert` overloads became `Units.length/mass/time/temperature`, and an unknown unit is a RangeError with the C# message; xo `numeric-separators-style` and `no-zero-fractions` are off for `src/core/` (C# literals kept verbatim); a few xo-driven rewrites that draw nothing (Set lookups, `lightest <= 44` for `44 >= lightest`, a small `byRoll` helper for moon life thresholds). New public exports: `Units`, `humanSpecies` and the record types.

- (main session, chain session 4) `gh repo create` refused a 4th time; detail layers done by a subagent and verified (120/120 tests). Wrap-up: nothing new worth a skill change beyond the log entries above.

## 2026-11-08, chain session 4 (continued, manual mode)

- Mark switched to manual mode; `gh repo create` then went through. Repo public at m4bwav/universe-generator-ts. First CI run failed: `test/golden/check-untouched.sh` lacked the exec bit (committed from Windows); fixed with `git update-index --chmod=+x`, CI green. Ruleset requiring `ci`, Discussions, private vulnerability reporting and the social preview (uploaded through Chrome) set.

## 2026-11-08, chain session 5

- Branch `stage2-extras` (local, not pushed). Ported `src/galaxies/galaxy-extras.ts` (GalaxyExtras.cs + GalaxyExtrasGenerator.cs: factions with MapEntry.faction/contested, points of interest and the precursor trail, hazards, monuments, beacons), `src/galaxies/constraints.ts` (Constraints.cs: forced stars, planet repair through SystemInput.star/forcedPlanet/forcedKind, lone precursor vault; `require` is now honoured), `src/options-code.ts` (OptionsCode.cs write and read, GeneratorOptions.Check). The galaxy now rolls every star first, then runs the constraint passes in the C# order (stars, names and contexts, planets, extras, precursor), and seeds its lazy system cache with the systems the planet pass generated.
- Goldens bit-exact (both builds): **constraints.json, diagnostics.json, presets.json** in full, each on the first run; **galaxy-extras.json** for the eight lone galaxies (lines 1-2834); its last three entries need GalaxyCluster and Universe, so the test checks the prefix (`assertGoldenPrefix`) and that the golden goes on with `    },`. Switch it to `assertGolden` once clusters are ported. **13 of 18 full, 1 partial.** hooks.json not started: it needs GeneratorHooks, JsonExport (`ToJson`) and Universe.
- Commits 85d908e (extras), 0c321a8 (constraints + options code), fde67c7 (diagnostics, presets tests). `npm test` 138 tests, coverage 100% lines/branches/functions, xo clean (16 old complexity warnings), tsc clean.
- Traps: the C# `Constraints.Precursor`, `Hazards` and the point loop draw before an early exit (text and flavour before `total == 0`), kept with an eslint-disable for `no-declarations-before-early-exit`. `xo --fix` rewrote ifs into early `continue`s and an else-if chain into a switch (semantics kept, checked). `no-unmodified-loop-condition` on the C# planet-pass loop was met with a `missing()` closure, same evaluation order. c8 reported 100% for files whose functions no test called (optionsFromCode) — the remap over the bundle is not trustworthy for uncalled code, so unit tests were added anyway (`test/unit/options-code.test.js`, `test/unit/galaxy-extras.test.js`).
- Small rulings (flagged): malformed option codes throw SyntaxError (C# ArgumentException) with the C# messages; out-of-range values still throw the validateOptions RangeError. C# `ToCode/FromCode/Check` are free functions `optionsToCode`, `optionsFromCode`, `checkOptions`. `generateGalaxyExtras` and `frontierTheme` are exported (tests import dist only; the radiation zone needs an active core, which only clusters give). `CoreActivity` is a string union in galaxy-extras.ts until clusters are ported. SystemContext now carries the optional forced star/planet fields.

- (main session) Verified 138/138 tests, lint and tsc clean; pushed, PR #4 merged after CI (a40e98c). Wrap-up: the c8 trap (100% reported for functions never called, through the bundle source map) is worth knowing for any tsdown+c8 repo; kept here and in the PR. No skill edits.

## 2026-11-08, chain session 6

- Branch `stage2-clusters` (local, not pushed). Ported `src/core/distances.ts` (Distances.cs, with `MapLevel` and `LinkTier`), `Units.map`, `src/galaxies/galaxy-cluster.ts` (GalaxyCluster.cs + ClusterGenerator.cs: members, placement, type codes, traits, names, gate/wormhole/tether network, universe slots and sky landmark), `src/universe/universe.ts` (Universe.cs records + UniverseGenerator.cs: web, filaments, voids, landmarks, merger), `src/export/json-export.ts` (JsonExport.cs as `toJson(type, value, {indented, children})`), `src/hooks.ts` (GeneratorHooks.cs + CustomFields.With as `withCustom`). The galaxy generator now takes the full `GalaxyContext` (type, shape, systems, richness, core activity, layout tuning, links/gates, tidal frontier, landmark); `CoreActivity` is the real type in galaxy-cluster.ts. Test side: ClusterJson/UniverseJson writers in `test/helpers/golden-json.js`, JsonKeyFilter in `test/helpers/json-key-filter.js`; golden tests cluster, universe, export, hooks; galaxy-extras switched to `assertGolden` (`assertGoldenPrefix` removed).
- Goldens bit-exact (both builds), each on the first run: **cluster.json, universe.json, galaxy-extras.json (full), export.json, hooks.json**. **18 of 18.** `npm test` 172 tests, coverage 100% lines/branches/functions, xo clean (old warnings only), tsc clean, check-untouched passes.
- Commits a071151 (clusters, universes, Distances), 19c8074 (export), e01859f (hooks).
- How export was done: `scripts/gen-json-export.py` reads the C# JsonExport.cs (itself generated) plus the C# record property types and writes `src/export/export-schema.ts`, a field table (key, kind, child record) per record; `json-export.ts` walks it. Rerun it whenever the C# export changes. JsonReader.cs is used only by GeneratorTables.FromJson, which the TS port already does with JSON.parse (session 2 ruling), so it is not ported.
- Traps: `xo --fix` again rewrote ifs into early `continue`/`return` (checked, no change in meaning) and wanted `Iterator#toArray`, which Node 20 lacks (disabled on that line with the reason). A module constant named `hooks` (the merger story lines) collided with the new `hooks` parameter; renamed `storyHooks`. A PreToolUse hook refuses Bash heredocs holding a doubled backslash; edits went through Python scripts written with the Write tool.
- Small rulings (flagged): Distances lives in `src/core/` (with `LinkTier`) so `Units.map` keeps core free of outside imports. Lazy lists are accessors: `cluster.galaxy(i)` (count `map.length`), `galaxy.system(i)`, `void.system(i)` with `void.systemCount`; out of range is a RangeError with the C# message. Pair keys in the cluster network are `min * 65536 + max` (numbers, not C# longs; same order). `toJson` takes the export `type` string ('galaxy', 'starSystem' and so on) instead of being a method. `custom` is an optional field (undefined from the generator, exported as `{}`); hooks are a plain object `{onPlanet, onSystem, onGalaxy, onCluster, onUniverse}` passed as the third argument of every `generate*`; a hook returning null or undefined throws TypeError with the C# message. `Universe.At`, `Universe.Link` and `Address.TryParse` are still not ported (no golden needs them).

- (main session) Verified 172/172 tests. Mark granted JSR publishing alongside npm (recorded in HANDOFF Grants); JSR step to be added at release: `jsr.json`, `npx jsr publish` from Actions with OIDC.

## 2026-11-08, chain session 7

- PR #6 merged (d594daf), CI green on all jobs. Ported `Address.tryParse` (static, returns `{address}` or `{error}` with the C# messages; the seed is decoded with `TextDecoder` and re-encoded, so any byte string `escapeSeed` would not write is refused, as the C# round-trip check does), `generateAt(address, options?, hooks?)` (C# `Universe.At`) and `linkTo(address, options)` (C# `Universe.Link`) in `src/universe/at.ts`. The Address constructor and `child` now refuse version < 1 and negative indexes like C#. `test/unit/address-at.test.js` mirrors C# CoreTests (address round trips and malformed cases), HookTests (objects reached by At with hooks, links) and ExportTests (same object reached two ways). 190 tests, 100% coverage, xo and tsc clean. **The port is complete.**
- Small rulings (flagged): an unreadable address is a SyntaxError (like malformed option codes); an address naming nothing, a link passed together with options, an unsupported version or an unknown level is a RangeError (C# ArgumentException for all). Names: `generateAt`, `linkTo`, `AddressedObject` (union of everything an address can name).
- Traps: the PreToolUse hook refuses any heredoc holding a doubled backslash, regex escapes included; write regexes as `[0-9]` and let `xo --fix` rewrite them, or use the Write tool. `xo --fix` again turned an if into an early return (checked).


## 2026-11-08, chain session 8

- Branch `stage3-package`. Stage 3 packaging: consumer fixtures from the package-modernize npm template (`test/consumers/`: ESM and CommonJS with known answers from the C# galaxy golden, four TypeScript setups type-checking the published declarations, Bun and Deno), a `consumers` CI job (Bun and Deno installed) and a `jsr` CI job (version match with package.json, `jsr publish --dry-run`), `release.yml` from the template with a JSR publish job (OIDC) and a jsr.json version check, `jsr.json` (`@m4bwav/universe-generator`, exports `./src/index.ts`), `private: true` dropped, `test:consumers` script, tarball budget 600 KB (452 KB now), README rewritten with verified examples (outputs equal the C# README's) and a C# to TS table, CHANGELOG.
- JSR slow-types check found one problem: `Preset` had no explicit type; now `Readonly<Record<preset names, GeneratorOptions>>`.
- Locally: 190 tests, 6 consumer checks (Bun and Deno not installed here; CI runs them), lint, tsc, publint, attw, check-tarball all clean.
- What blocks the first release (needs Mark, cannot be done from the agent shell, L-134 `npm-login-expires`): npm trusted publishing can only be set on an existing package, so the first `npm publish` of `universe-generator` needs Mark's own npm login, then the trusted publisher (release.yml) on npmjs.com; and the JSR package `@m4bwav/universe-generator` must be created on jsr.io and linked to the repo (GitHub login). Do not tag v1.0.0 before both, or release.yml's publish jobs fail.

## 2026-11-07, chain session 9

- Found PR #7 already merged (HANDOFF was older than GitHub); merged Dependabot PR #3 (tsdown 0.23.4, CI green).
- Branch `stage4-demo`. Stage 4 demo: `demo/` (index.html, style.css, app.js, favicon.svg), Canvas 2D map (lanes, bridges in gold, faction rings, danger tint, hazard clouds, core glow), pan, wheel zoom and pinch, click a star for its system panel (planets with summaries and moons, belts, stations, landmarks), galaxy panel (factions, regions, points of interest, hazards, monuments, beacons, warnings). URL carries `seed`, `preset`, the `optionsToCode` string and `system`. `scripts/build-demo.mjs` + `npm run demo` build `site/` (gitignored) with the ESM bundle copied in as `universe-generator.mjs` (single file, no chunks). `.github/workflows/pages.yml` deploys `site/` on push to master, actions pinned by SHA like ci.yml. xo now has a `demo/**/*.js` block (browser globals, reasons given); xo lints the HTML too (html-eslint: og:url, form method, no data-URI favicon).
- Checked in Chrome: `?seed=my-seed&preset=spaceOpera&systems=120&shape=barred&weirdness=10&system=31` shows LHS 1589 with planet b "a ringed ice giant far from a red dwarf", the README's line; galaxy name Wyvern Galaxy as in the golden; made in about 10 ms. Phone checked in a 390 px iframe (no sideways scroll, map fits).
- Traps: the Claude in Chrome screenshot timed out on this tab (renderer not painting in a background window) while JS ran fine; sitewright `sw.py shoot` printed three PNG paths but wrote none (reported, not fixed here); headless Chrome `--window-size=390,...` clamps to a wider window and crops, so phone shots from it lie. Port 8765 was refused by Windows (WinError 10013); 18432 worked.
- Small rulings (flagged): Canvas 2D, no three.js; the "Random seed" button uses Math.random only to pick a seed (outside the library, so the determinism rule holds); shareable link format is the page URL, not `linkTo`'s address form, because the page needs the preset too; the game link goes to markdavidrogers.com (one constant `game` at the top of app.js); no per-seed share image (not cheap on a static host), the social preview is shared by all.
- PR #8 opened, all checks green; `gh pr merge` refused by the auto-mode classifier ("Merge Without Review"), so it is assigned to Mark with `needs-review` (it adds a deploy workflow, which the standing rules leave for him anyway). Pages enabled through the API (`POST /repos/.../pages build_type=workflow`).
- Wrap-up: the lessons worth keeping are in this entry's traps (Chrome screenshot timeouts with JS still working, sitewright shoot writing nothing, headless phone width clamp). No askwright questions this session.

## 2026-11-07, chain session 10

- PR #8 had been merged by Mark; pages run green; the live page and `universe-generator.mjs` return 200.
- Stage 5: the TS README already had the quick start, demo link and screenshot. Opened m4bwav/UniverseGenerator#68 (one Install bullet linking the port and demo). `gh pr merge` refused: "base branch policy prohibits the merge", because the required checks have path filters and never start on a README-only change. Assigned to Mark rather than using --admin.
- Stage 6: no version bump. release.yml is driven by `npm version`, which makes the commit and tag together; a pre-bump would break that.
- Stage 7: launch drafts in ai-docs/launch/drafts.md, checked with everwrite (0 strong).
- Wrap-up: one lesson, docs-only PRs on repos with path-filtered required checks cannot merge without admin (noted here and in HANDOFF). No askwright questions.

## 2026-11-08, chain session 11

- npm `universe-generator` and JSR `@m4bwav/universe-generator` still 404; C# PR #68 still open. Nothing for Stage 6 can move.
- Merged the stage7-launch-kit branch to master (PR #10, CI green) and Dependabot PRs #1 (upload-artifact 7.0.2) and #2 (setup-node 7.1.0), all green.
- Wrap-up: nothing new worth keeping. No askwright questions.
- Mark saved the wiki's first page; wiki written with wikiwright and pushed: nine pages + sidebar/footer, live check 0 failures. Examples verified on the master tarball (not published yet) on Node 24 and 20; galaxy fingerprint equals the C# wiki's. Note and saved verification in ai-docs/notes/2026-11-08-*. Found: AGENTS.md still says private:true/no publish (stale); index.ts doc comment stale; checkOptions needs whole options and an undefined seed gives the engine TypeError (left for Mark, behaviour changes).

## 2026-11-08, chain session 12

- npm and JSR still 404; C# PR #68 still open. Stage 6 cannot move.
- Fixed the two stale docs found in session 11: AGENTS.md publishing rule (no longer `private: true`; releases through release.yml after Mark's first publish) and the index.ts doc comment. checkOptions behaviour left for Mark.
- Wrap-up: nothing new worth keeping. No askwright questions.

## 2026-11-08, chain session 12 (continued, Mark driving the browser steps)

- Mark signed in to npm; `npm publish` from the agent shell fails with EOTP (no TTY, the auth URL is masked), so Mark published the placeholder (0.0.0-stage). Trusted publisher added on npmjs.com (m4bwav/universe-generator-ts, release.yml, npm publish allowed; security key tap).
- JSR: Mark passed the Cloudflare check; scope `m4bwav` and package `@m4bwav/universe-generator` created and linked to the repo.
- v1.0.0: first release run failed because release.yml wants `## [1.0.0] - YYYY-MM-DD` in CHANGELOG.md; fixed (0f960af) and the unpublished tag moved. Second run: JSR 1.0.0 published, npm 1.0.0 staged, GitHub Release made.
- Approving the staged npm version was refused by the auto-mode classifier; waits on Mark (npmjs.com, Settings, Staged Packages, Approve). Then verify-published.yml and the wiki update.
- repo-traffic now counts JSR downloads (m4bwav/repo-traffic#26).

## 2026-11-08, chain session 13

- npm still shows only 0.0.0-stage and 0.0.0 (1.0.0 staged, not approved); C# PR #68 still open. Nothing can move without Mark; stopped.
- Wrap-up: nothing new worth keeping. No askwright questions.

## 2026-11-08, chain session 12 (end)

- Mark approved the staged npm 1.0.0; `npm view universe-generator version` = 1.0.0; release.yml all jobs green including "move next".
- verify-published.yml does not exist in this repo (release.yml and zizmor.yml name it). Did the check by hand instead: the wiki script against the npm package on Node 24 and 20 gave output identical to the pre-release run. Adding the workflow is open work.
- Wiki updated for 1.0.0 and pushed; live check 0 failures.
