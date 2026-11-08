# GitHub wiki (2026-11-08)

Wiki: https://github.com/m4bwav/universe-generator-ts/wiki, working copy `D:/m4bwa/Claude/Projects/Ai/labs/universe-generator-ts.wiki` (sibling of this clone), branch master. Made with the wikiwright skill after Mark saved the placeholder first page.

## Pages

Home, Getting-Started, API-Reference, Same-Seed-Same-Universe, Errors-and-Edge-Cases, Recipes, Versions-and-Upgrading, FAQ, Development, _Sidebar, _Footer. Modelled on the C# wiki (`../UniverseGenerator.wiki`); record fields and plausibility rules are linked there, not repeated.

## How the examples were verified

- **Not against the registry**: nothing is published yet. `npm pack` of master (version 0.0.0, the tarball 1.0.0 will ship) was installed in a scratch folder with TypeScript 6.0.3. The script's VERSION check is `0.0.0` for that reason.
- Script: `2026-11-08-wiki-verify.mjs` (from `wikiwright.py scaffold npm`), every page block in a `snippet()`. Output: `2026-11-08-wiki-verify.out.txt` (Node 24.18.0) and `2026-11-08-wiki-verify.node20.out.txt` (Node 20.20.2 via OLDEST_NODE). diffout: 24 sections, only `installed` and the engine's JSON.parse message differ (Node 20 lacks "(line 1 column 2)"; the page block is scoped `node>=24`).
- Cross-check with C#: the galaxy fingerprint (`my-seed`, children) is `909995 characters, SHA-256 D486B72BA56ACAEF...`, the same line the C# wiki prints; the lookalike-seed, options, hooks and error outputs match the C# wiki's too.
- Checks: `check` 0 errors, `outputs` 20 checked 0 missing, `snippets` 20 checked 0 missing, everwrite 0 strong, `live` 9 pages 0 failures. Bun, Deno, browsers, CDNs: not tested here (CI covers Bun and Deno).

## Facts the README lacks

- `42`, `42n` and `'42'` are one seed (`v1-42`).
- `checkOptions` takes whole options; a partial throws `RangeError: Weirdness must be 0 to 100; you asked for undefined.`
- A missing seed (`undefined`) throws the engine's `TypeError: Cannot convert undefined to a BigInt`, not the C# null-seed message.
- `GeneratorTables.fromJson` errors are the engine's JSON.parse messages (differ between Node 20 and 24).
- Unit names are plural (`'AstronomicalUnits'`, `'Kilometres'`); the C# fingerprint and error messages match.

## Inaccuracies found (for Mark / next release)

1. `AGENTS.md` still says `package.json` stays `"private": true` and never run `npm publish`; private was dropped in session 8 and publishing was granted.
2. `src/index.ts` doc comment says "Stage 2 is porting the generators one golden file at a time" (stale; ships in the .d.ts).
3. Possible API gaps worth a decision before 1.0.0: `checkOptions` could take `Partial<GeneratorOptions>` like the generators; a missing seed could throw the C# message. Both are behaviour changes, so left for Mark.

## Updating at a release

1. `git -C ../universe-generator-ts.wiki pull --ff-only`.
2. In a scratch folder: `npm install universe-generator@<version> typescript@6`, copy the script, set VERSION, run it and again with `OLDEST_NODE=20.20.2`; `wikiwright.py diffout` against the saved outputs.
3. Pages that name the version or the unpublished state: Home ("Not on npm or JSR yet" paragraph), Getting-Started (Install, In the browser), FAQ ("Can I install it yet?"), Versions-and-Upgrading (table and date), _Footer.
4. Run check, outputs, snippets, tells, live; update this note.
