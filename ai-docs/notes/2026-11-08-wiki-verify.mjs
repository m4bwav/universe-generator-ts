// wiki-verify for universe-generator@1.0.0: runs every example on the wiki against the
// PUBLISHED package, never the working tree. Keep the filled-in copy in the repository
// as ai-docs/notes/<date>-wiki-verify.mjs so the next release can run it again.
//
// Run it from a scratch folder outside the repository. `wikiwright.py scaffold` writes package.json there
// ({"private": true}) when it has none; by hand, write that with the editor, never `npm init -y` (L-017):
//   npm install universe-generator@1.0.0
//   node wiki-verify.mjs > wiki-verify.out.txt
//
// Every case prints "## <label>" and then its output. Paste outputs into the pages
// exactly as printed; a page never shows output this script did not produce, and never
// one converted by hand (a JSON value retyped as console.log shows it): add a case that
// prints the page's form instead (L-008, L-019). Save the output beside this file as
// ai-docs/notes/<date>-wiki-verify.out.txt with 127.0.0.1:<digits> replaced by
// 127.0.0.1:<port>, and check the pages with `wikiwright.py outputs <wiki dir> <that file>`. Each code block on
// a page is here as the page shows it, in a snippet(): check with `wikiwright.py snippets <wiki dir> <this file>`.
// Keep time zones, absolute paths and timings out of the output (L-022).
// OLDEST_NODE=<exact version> reruns everything under the oldest Node in engines (the last section, L-106); compare
// the two outputs, and a new release's output with the saved one, with `wikiwright.py diffout OLD NEW`.

import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import path from 'node:path';
import {chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

// Everything runs in this file's folder, so no shell needs to change directory first.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

const PACKAGE = 'universe-generator';
const VERSION = '0.0.0'; // the master tarball that ships as 1.0.0 (not on npm yet)
const require = createRequire(import.meta.url);

function show(label, value) {
	console.log(`## ${label}`);
	console.log(typeof value === 'string' ? value : inspect(value));
	console.log();
}

function inspect(value) {
	// JSON with the cases JSON loses kept visible: undefined, errors, NaN.
	return JSON.stringify(value, (key, v) => {
		if (v === undefined) {
			return '<undefined>';
		}

		if (v instanceof Error) {
			return {name: v.name, message: v.message, ...v};
		}

		if (typeof v === 'number' && !Number.isFinite(v)) {
			return String(v);
		}

		return v;
	}, 2);
}

// Any other program (a runtime from npm, a package manager, bash, the golden capture), asynchronously,
// with LF line endings. On Windows run a .cmd shim (npx, npm) as one command string with shell: true and no args:
// an args array beside shell: true prints DEP0190 on Node 24. Standard input is closed (or gets
// `input`): a CLI that reads stdin when it has no argument would otherwise wait for ever (L-007).
function run(file, args, {cwd = process.cwd(), env = {}, shell = false, input = ''} = {}) {
	return new Promise(resolve => {
		const child = spawn(file, args, {cwd, env: {...process.env, ...env}, shell});
		// A child that exits before reading its input closes the pipe; on Windows the write then fails
		// with EPIPE, which would crash this script with no listener (L-150).
		child.stdin.on('error', error => {
			if (error.code !== 'EPIPE') throw error;
		});
		child.stdin.end(input);
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', chunk => {
			stdout += chunk;
		});
		child.stderr.on('data', chunk => {
			stderr += chunk;
		});
		child.on('close', code => {
			resolve({code, stdout: stdout.replaceAll('\r\n', '\n'), stderr: stderr.replaceAll('\r\n', '\n')});
		});
	});
}

// A shell snippet as a page shows it (BASH=<Git Bash's bash.exe> on Windows), printing first the Node it ran on,
// so an OLDEST_NODE rerun that picked up the system Node shows it (L-118).
function shell(script, options = {}) {
	return run(process.env.BASH || 'bash', ['-c', `echo "shell node: $(node --version)"; ${script}`], options);
}

async function capture(label, fn) {
	try {
		show(label, await fn());
	} catch (error) {
		show(`${label} (threw)`, `${error?.name}: ${error?.message}`);
	}
}

// ----- page examples, held as the text the page shows -----
// snippet() writes a page's code block to ./snippets/<label>.mjs (.cjs, .mts, .cts, .ts), runs it as a child with this Node
// (so OLDEST_NODE covers it) and prints what it printed: stdout, then stderr, then a non-zero exit code. The
// program holds every block as the page shows it, so `wikiwright.py snippets` finds each one. Start the template
// literal with a newline and close it on a line of its own. Inside it write each \ as \\, each ` as \` and each
// ${ as \${ (snippets reads the program with those three undone). Not String.raw: it keeps the \ before ` and ${.
// A //=> line prints the statement just above it as the REPL does (console.log('%O', ...)); a statement over
// several lines ends with its closing bracket at its first line's indent.
// Options: type 'module', 'commonjs' or 'typescript'. TypeScript is compiled by the scratch project's tsc, then run:
// ext '.mts' (default), '.cts' or '.ts'; typescript, the folder in node_modules to compile with (typescript6 after
// `npm install typescript6@npm:typescript@6`, for a matrix: one snippet() per compiler and setup, the page text in a
// const they share); tsc, the flags (a --noEmit among them only type-checks); `tsc <version>: exit <code>` prints
// first. dir: the folder the file is written to and run from, 'snippets'; path.join(OLD, 'snippets') makes the
// page's import load the old version installed in OLD, so one page text runs against both. before and after, code
// around the page's (the import the page left out, a call to the function it only defines); runtime and args
// (another program, or Node flags such as ['--import', path.resolve('route.mjs')]); env; cwd (a file-tree root: the
// file stays in dir so its import resolves); replace, text swapped in the written file only. SNIPPET holds defaults
// the fixture sections set. runSnippet() returns the text instead of printing it, for inTree().
const SNIPPET = {replace: {}, env: {}};
const lead = line => line.match(/^\s*/)[0];
function prints(code) {
	const lines = code.split('\n');
	for (let end = 0; end < lines.length - 1; end++) {
		if (!/^\s*\/\/ ?=>/.test(lines[end + 1]) || !lines[end].trimEnd().endsWith(';')) {
			continue;
		}

		const indent = lead(lines[end]);
		let start = end;
		while (/^[)\]}]/.test(lines[end].trim()) && start > 0 && (start === end || !lines[start].trim() || lead(lines[start]) !== indent)) {
			start--;
		}

		if (!/^(const|let|var|import|export|return|if|for|while)\b/.test(lines[start].trim())) {
			lines[start] = `${indent}console.log('%O', ${lines[start].slice(indent.length)}`;
			lines[end] = lines[end].replace(/;\s*$/, ');');
		}
	}

	return lines.join('\n');
}

async function runSnippet(label, code, {type = 'module', before = '', after = '', runtime = process.execPath, args = [], env = {}, cwd = process.cwd(), replace = SNIPPET.replace, dir = 'snippets', ext = '.mts', typescript = 'typescript', tsc = ['--strict', '--module', 'nodenext', '--moduleResolution', 'nodenext', '--target', 'es2022']} = {}) {
	const name = label.toLowerCase().replaceAll(/[^a-z\d]+/g, '-');
	let file = path.resolve(dir, name + ({module: '.mjs', commonjs: '.cjs'}[type] ?? ext));
	let text = before + prints(code.replace(/^\n/, '')) + after;
	for (const [from, to] of Object.entries(replace)) {
		text = text.replaceAll(from, to);
	}

	mkdirSync(path.dirname(file), {recursive: true});
	writeFileSync(file, text);
	let out = '';
	if (type === 'typescript' && runtime === process.execPath) {
		// By path: TypeScript 7's exports map hides ./bin/tsc from require.resolve (L-141).
		const compiler = path.resolve('node_modules', typescript);
		const {version} = JSON.parse(readFileSync(path.join(compiler, 'package.json'), 'utf8'));
		const outDir = path.join(path.dirname(file), 'tsc');
		const built = await run(runtime, [path.join(compiler, 'bin', 'tsc'), ...tsc, '--outDir', path.relative('.', outDir), path.relative('.', file)]);
		out = `tsc ${version}: exit ${built.code}\n${built.stdout}`;
		if (tsc.includes('--noEmit')) {
			return out.replace(/\n$/, '');
		}

		file = path.join(outDir, name + {'.mts': '.mjs', '.cts': '.cjs', '.ts': '.js'}[ext]);
	}

	const result = await run(runtime, [...args, file], {cwd, env: {...SNIPPET.env, ...env}});
	return out + result.stdout.replace(/\n$/, '') + (result.stderr ? `\n--- stderr\n${result.stderr.replace(/\n$/, '')}` : '') + (result.code ? `\nexit ${result.code}` : '');
}

async function snippet(label, code, options) {
	show(label, await runSnippet(label, code, options));
}
// ----- end of page examples -----

// ----- the installed package: version, both module systems, the bin -----
const pkgDir = path.join(process.cwd(), 'node_modules', ...PACKAGE.split('/'));
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
if (pkg.version !== VERSION) {
	throw new Error(`installed ${pkg.version}, expected ${VERSION}`);
}

show('installed', `${PACKAGE}@${pkg.version} on Node ${process.version}`);
const esm = await import(PACKAGE);
const cjs = require(PACKAGE);
show('esm exports', Object.keys(esm).sort());
show('cjs exports', Object.keys(cjs).sort());

// A package with a bin needs cli(), which `wikiwright.py scaffold` keeps only with --bin.
if (pkg.bin && typeof cli === 'undefined') {
	throw new Error('the package has a bin: run wikiwright.py scaffold again with --bin');
}

// ----- the cases: one per example on the wiki, labelled by page -----
// Every code block a page shows is a snippet() holding it as the page shows it; capture() and show() are for checks
// no page shows (errors, membership, the golden replay).
// Getting started

// Old majors (Versions and upgrading): install each in its own scratch folder (OLD=<folder>, V2=... for more) and
// run the page's code there unchanged: snippet(label, PAGE, {dir: path.join(process.env.OLD, 'snippets')}) beside
// snippet(label, PAGE), with PAGE a const both calls share.

// API reference, behaviour, recipes, FAQ: a snippet() per code block here.
// Home
await snippet('Home first example', `
import {generateGalaxy} from 'universe-generator';

const galaxy = generateGalaxy('my-seed');
for (let i = 0; i < 3; i++) {
  const system = galaxy.system(i);
  console.log(\`\${system.name}: \${system.star.class} star, \${system.planets.length} planets, danger \${system.danger}\`);
}
`);

// Getting started
await snippet('Getting started TypeScript', `
import {generateGalaxy, Preset, type GeneratorOptions, type StarSystem} from 'universe-generator';

const options: GeneratorOptions = {...Preset.spaceOpera, systems: 120, shape: 'Barred'};
const galaxy = generateGalaxy('my-seed', options);
const system: StarSystem = galaxy.system(31);
console.log(galaxy.name, galaxy.map.length);
console.log(system.name, system.planets[1].descriptor);
`, {type: 'typescript'});

await snippet('Getting started CommonJS', `
const {generateSystem} = require('universe-generator');

const system = generateSystem('my-seed');
console.log(system.address.toString(), system.name, system.star.class);
`, {type: 'commonjs'});

await snippet('Getting started levels', `
import {generateUniverse, generateCluster, generateGalaxy, generateSystem, generatePlanet, generateStarNames} from 'universe-generator';

const universe = generateUniverse('my-seed');
console.log('universe:', universe.name);
const cluster = generateCluster('my-seed');
console.log('cluster:', cluster.name, cluster.map.length, 'galaxies');
const galaxy = generateGalaxy('my-seed');
console.log('galaxy:', galaxy.name, galaxy.shape, galaxy.map.length, 'systems');
const system = generateSystem('my-seed');
console.log('system:', system.name, system.planets.length, 'planets');
const planet = generatePlanet('my-seed');
console.log('planet:', planet.summary);
console.log('names:', generateStarNames('my-seed', 3).map(n => n.name).join(', '));
`);

await snippet('Getting started lazy', `
import {generateGalaxy} from 'universe-generator';

const galaxy = generateGalaxy('my-seed', {systems: 2000});
const entry = galaxy.map[1999];
console.log(entry.name, entry.x, entry.y, entry.danger);
console.log(galaxy.system(1999).planets.length);
`);

// API reference
await snippet('API presets', `
import {Preset} from 'universe-generator';

for (const [name, options] of Object.entries(Preset)) {
  console.log(name, options.systems, options.shape, options.starMix, options.weirdness);
}
`);

await snippet('API options code', `
import {optionsToCode, optionsFromCode, Preset} from 'universe-generator';

const code = optionsToCode({...Preset.default, systems: 120, shape: 'Barred', weirdness: 10});
console.log(code);
console.log(optionsFromCode(code).systems);
`);

await snippet('API address', `
import {Address, generateAt, linkTo} from 'universe-generator';

console.log(Address.tryParse('v1-my-seed/galaxy/system/31/planet/1').address?.toString());
console.log(Address.tryParse('my-seed/galaxy').error);
const link = linkTo('v1-my-seed/galaxy/system/31', {systems: 120});
console.log(link);
console.log(generateAt(link).name);
`);

await snippet('API units', `
import {Units, Distances} from 'universe-generator';

console.log(Units.length(1, 'AstronomicalUnits', 'Kilometres'));
console.log(Units.temperature(288, 'Kelvin', 'Celsius'));
console.log(Object.keys(Distances));
`);

// Same seed, same universe
await snippet('Same seed twice', `
import {generateGalaxy, generateAt, toJson} from 'universe-generator';

const first = toJson('galaxy', generateGalaxy('my-seed'), {children: true});
const second = toJson('galaxy', generateGalaxy('my-seed'), {children: true});
console.log(first === second);

const inPlace = generateGalaxy('my-seed').system(31);
const alone = generateAt(inPlace.address.toString());
console.log(toJson('starSystem', inPlace) === toJson('starSystem', alone));
`);

await snippet('Same seed fingerprint', `
import {createHash} from 'node:crypto';
import {generateGalaxy, toJson} from 'universe-generator';

const json = toJson('galaxy', generateGalaxy('my-seed'), {children: true});
const hash = createHash('sha256').update(json, 'utf8').digest('hex').toUpperCase();
console.log(\`\${json.length} characters, SHA-256 \${hash.slice(0, 16)}...\`);
`);

await snippet('Same seed lookalikes', `
import {generateGalaxy} from 'universe-generator';

for (const seed of ['my-seed', 'My-Seed', 'my-seed ', 'hello world', 42, 42n, '42']) {
  const galaxy = generateGalaxy(seed);
  console.log(JSON.stringify(String(seed)), typeof seed, galaxy.address.toString(), galaxy.name, galaxy.map[0].name);
}
`);

await snippet('Same seed options', `
import {generateGalaxy} from 'universe-generator';

const plain = generateGalaxy('my-seed');
const shifted = generateGalaxy('my-seed', {dangerShift: 2});
const bigger = generateGalaxy('my-seed', {systems: 61});
console.log(plain.map[0].name, shifted.map[0].name, bigger.map[0].name);
console.log('danger', plain.map[0].danger, shifted.map[0].danger, bigger.map[0].danger);
console.log(plain.map.every((a, i) => a.name === shifted.map[i].name && a.x === shifted.map[i].x));
`);

await snippet('Same seed hooks', `
import {generateGalaxy} from 'universe-generator';

const hooks = {onSystem: s => ({...s, name: 'New ' + s.name})};
const plain = generateGalaxy('my-seed').system(0);
const hooked = generateGalaxy('my-seed', undefined, hooks).system(0);
console.log(plain.name, '/', hooked.name);
console.log(JSON.stringify(plain.star) === JSON.stringify(hooked.star) && plain.planets.length === hooked.planets.length);
`);

// Errors and edge cases
await snippet('Errors refusals', `
import {generateGalaxy, generateStarNames, generateAt, optionsFromCode, GeneratorTables} from 'universe-generator';

function attempt(what, action) {
  try {
    action();
    console.log(\`\${what}: no error\`);
  } catch (error) {
    console.log(\`\${what}: \${error.name}: \${error.message}\`);
  }
}

attempt('systems 0', () => generateGalaxy('my-seed', {systems: 0}));
attempt('systems 2001', () => generateGalaxy('my-seed', {systems: 2001}));
attempt('weirdness 101', () => generateGalaxy('my-seed', {weirdness: 101}));
attempt('arms 5', () => generateGalaxy('my-seed', {arms: 5}));
attempt('dangerShift 6', () => generateGalaxy('my-seed', {dangerShift: 6}));
attempt('a 201-character seed', () => generateGalaxy('a'.repeat(201)));
attempt('an empty seed', () => generateGalaxy(''));
attempt('no seed', () => generateGalaxy(undefined));
attempt('system(60) of 60', () => generateGalaxy('my-seed').system(60));
attempt('an unknown level', () => generateAt('v1-my-seed/galaxy/nebula/0'));
attempt('system 60 of 60', () => generateAt('v1-my-seed/galaxy/system/60'));
attempt('generator version 2', () => generateAt('v2-my-seed/galaxy'));
attempt('a link and options', () => generateAt('v1-my-seed/galaxy?systems=120', {systems: 120}));
attempt('an unknown option code', () => optionsFromCode('systems=120&colour=red'));
attempt('unregistered tables', () => generateGalaxy('my-seed', {tables: 'nobody-registered-this'}));
attempt('star names 0', () => generateStarNames('my-seed', 0));
attempt('star names 1001', () => generateStarNames('my-seed', 1001));
attempt('tables from broken JSON', () => GeneratorTables.fromJson('{'));
`);

await snippet('Errors warnings', `
import {checkOptions, generateGalaxy, Guarantee, Preset} from 'universe-generator';

for (const w of checkOptions({...Preset.default, shape: 'Ring', arms: 3})) {
  console.log(\`\${w.code}: \${w.message}\`);
}

for (const w of checkOptions({...Preset.default, shape: 'Spiral', systems: 12})) {
  console.log(\`\${w.code}: \${w.message}\`);
}

for (const w of generateGalaxy('my-seed', {maxPlanetsPerSystem: 0, require: Guarantee.GardenWorld}).warnings) {
  console.log(\`\${w.code}: \${w.message}\`);
}
`);

await capture('checkOptions partial', () => esm.checkOptions({shape: 'Ring', arms: 3}));

// Recipes
await snippet('Recipes save and restore', `
import {generateGalaxy, generateAt, linkTo, optionsToCode, optionsFromCode, Preset} from 'universe-generator';

const options = {...Preset.roguelike, systems: 80};
const galaxy = generateGalaxy('run-17', options);
const save = JSON.stringify({seed: 'run-17', options: optionsToCode(options), at: linkTo(galaxy.system(5).address.toString(), options)});
console.log(save);

const loaded = JSON.parse(save);
const again = generateGalaxy(loaded.seed, optionsFromCode(loaded.options));
console.log(again.system(5).name === galaxy.system(5).name, generateAt(loaded.at).name);
`);

await snippet('Recipes find a seed', `
import {generateGalaxy} from 'universe-generator';

for (let n = 0; n < 1000; n++) {
  const galaxy = generateGalaxy(\`hunt-\${n}\`, {systems: 30});
  const gardens = galaxy.map.filter((entry, i) => galaxy.system(i).planets.some(p => p.habitability === 'Ideal'));
  if (gardens.length >= 3) {
    console.log(\`hunt-\${n}\`, gardens.map(entry => entry.name).join(', '));
    break;
  }
}
`);

await snippet('Recipes export', `
import {writeFileSync} from 'node:fs';
import {generateSystem, toJson} from 'universe-generator';

const json = toJson('starSystem', generateSystem('my-seed'), {indented: true});
writeFileSync('system.json', json);
console.log(json.split('\\n').slice(0, 6).join('\\n'));
`);

await snippet('Recipes custom fields', `
import {generateGalaxy, toJson, withCustom} from 'universe-generator';

const owners = ['Ana', 'Bo', 'Cy'];
const hooks = {
  onSystem: system => ({...system, custom: withCustom(system.custom, 'owner', owners[system.planets.length % owners.length])}),
};
const system = generateGalaxy('my-seed', undefined, hooks).system(4);
console.log(system.custom);
console.log(JSON.parse(toJson('starSystem', system)).custom);
`);

// ----- the oldest Node line in engines (L-106) -----
// OLDEST_NODE=<version> reruns this whole script under that Node (downloaded by npx) and saves that run as
// wiki-verify.node<version>.out.txt. Give the exact version (20.20.2, from `npm view node@20 version`) so npx runs a
// pinned package; a bare major takes whatever is newest in that line. The Node binary is copied alone into its own folder, which goes first on PATH
// so the shells and bins the cases spawn use it too: the npm node package's bin folder also holds a text file
// named `node`, and Git Bash skips that folder and runs the system Node without a word (L-118). Every shell case
// prints the Node it ran (`node --version` inside the shell). On Windows `npx.cmd` runs the node.exe installed
// beside it, whatever PATH says: run a page's `npx <bin>` case once more as `cli()` does, with process.execPath. Compare with `wikiwright.py diffout <this run's
// output> wiki-verify.node<major>.out.txt`: every difference is a page claim to scope by version, and a block
// true on one line only gets <!-- outputs: node>=N --> on the page. Save both outputs in the repository.
// OLDEST_NODE_BIN=<a node binary> uses that binary instead of npx (a Linux run with Node from the registry and no npm).
// The folder is named per platform: a Windows run and a WSL run in one scratch folder once shared it, and the Linux
// `node` beside node.exe made Git Bash skip it and run the system Node in every shell case (L-118, a second way in).
const {OLDEST_NODE, OLDEST_NODE_BIN, WIKI_VERIFY_CHILD} = process.env;
if (OLDEST_NODE && !WIKI_VERIFY_CHILD) {
	if (!/^\d+(\.\d+){0,2}$/.test(OLDEST_NODE)) {
		throw new Error(`OLDEST_NODE=${OLDEST_NODE}: a Node version such as 20 or 20.19.0`);
	}

	// One command string with shell: true, on every system (npx is a .cmd shim on Windows): no DEP0190 warning.
	const found = OLDEST_NODE_BIN || (await run(`npx -y -p node@${OLDEST_NODE} node -p process.execPath`, [], {shell: true, env: {NODE_OPTIONS: ''}})).stdout.trim().split('\n').at(-1);
	const alone = path.resolve(`node${OLDEST_NODE}-alone-${process.platform}`);
	mkdirSync(alone, {recursive: true});
	const oldNode = path.join(alone, path.basename(found));
	copyFileSync(found, oldNode);
	chmodSync(oldNode, 0o755);
	const outName = `wiki-verify.${process.platform === 'win32' ? '' : 'linux.'}node${OLDEST_NODE}.out.txt`;
	const rerun = await run(oldNode, [fileURLToPath(import.meta.url)], {env: {WIKI_VERIFY_CHILD: '1', PATH: `${alone}${path.delimiter}${process.env.PATH}`}});
	writeFileSync(outName, rerun.stdout + (rerun.stderr ? `## stderr of the run\n${rerun.stderr}\n` : ''));
	show(`oldest node: node@${OLDEST_NODE}`, `${(await run(oldNode, ['--version'])).stdout.trim()}, exit ${rerun.code}, output saved as ${outName}`);
}
