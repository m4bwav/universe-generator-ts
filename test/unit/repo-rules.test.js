// The determinism rules of AGENTS.md, as the C# RepoRulesTests.cs checks them: source text scanned for forbidden APIs.
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

const root = fileURLToPath(new URL('../../src/', import.meta.url));

function sources(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sources(file);
    }

    return file.endsWith('.ts') ? [file] : [];
  });
}

const everywhere = [
  [/\bMath\.random\b/u, 'output depends only on the seed; use Pcg32'],
  [/\bDate\.now\b|\bnew Date\(|\bperformance\.now\b/u, 'output depends only on the seed'],
  [/\blocaleCompare\b|\bIntl\./u, 'sort strings ordinally; culture rules differ by runtime'],
  [/\bMath\.(?:hypot|cbrt|expm1|log1p|log10|log2|sinh|cosh|tanh|asin|acos|fround)\b/u, 'not exactly rounded; port the C# expression'],
  [/\b(?:process|Buffer|window|document)\./u, 'the library uses no Node or DOM APIs'],
];
// DMath's own file is the one place the raw maths may appear (it builds its functions from exact operations).
const outsideDmath = [[/\bMath\.(?:exp|log|pow|sin|cos|tan|atan|atan2|round)\(/u, 'platform maths differ; use DMath']];

test('the library source uses no forbidden API', () => {
  const problems = [];
  for (const file of sources(root)) {
    const name = path.relative(root, file).replaceAll('\\', '/');
    const rules = name === 'core/dmath.ts' ? everywhere : [...everywhere, ...outsideDmath];
    for (const [i, line] of readFileSync(file, 'utf8').split('\n').entries()) {
      // Comments and string literals may name anything.
      const code = line.replace(/^\s*(?:\/\/|\*|\/\*\*).*$/u, '').replaceAll(/'(?:[^'\\]|\\.)*'|`(?:[^\\`]|\\.)*`/gu, '');
      if (/from 'node:/u.test(line)) {
        problems.push(`${name}:${i + 1}: the library uses no Node APIs: ${line.trim()}`);
      }

      for (const [pattern, why] of rules) {
        if (pattern.test(code)) {
          problems.push(`${name}:${i + 1}: ${why}: ${line.trim()}`);
        }
      }
    }
  }

  assert.deepEqual(problems, []);
});
