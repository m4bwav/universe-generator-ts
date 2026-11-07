// The golden files are the C# UniverseGenerator 1.0.0's own test vectors. They are copied, never edited: this test fails
// if any byte changes, and test/golden/check-untouched.sh proves the same from git history in CI.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync} from 'node:fs';
import {test} from 'node:test';

const directory = new URL('v1/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', import.meta.url), 'utf8'));

test('every golden file matches its SHA-256 from the C# tag v1.0.0', () => {
  const files = readdirSync(directory).filter(file => file.endsWith('.json'));
  assert.deepEqual(new Set(files), new Set(Object.keys(manifest.sha256)));
  assert.equal(files.length, 18);
  for (const file of files) {
    const hash = createHash('sha256').update(readFileSync(new URL(file, directory))).digest('hex');
    assert.equal(hash, manifest.sha256[file], file);
  }
});
