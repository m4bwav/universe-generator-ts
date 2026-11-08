// The C# test-side JsonKeyFilter.cs: export.json holds the exports as they were before later keys were added, so the
// test removes those keys (each held by another golden file) from today's exports.

function stringEnd(json, start) {
  let i = start + 1;
  while (json[i] !== '"') {
    i += json[i] === '\\' ? 2 : 1;
  }

  return i;
}

function valueEnd(json, start) {
  let depth = 0;
  let i = start;
  while (i < json.length) {
    const c = json[i];
    if (c === '"') {
      i = stringEnd(json, i) + 1;
      continue;
    }

    if (c === '{' || c === '[') {
      depth++;
    } else if (c === '}' || c === ']') {
      if (depth === 0) {
        return i;
      }

      depth--;
    } else if (c === ',' && depth === 0) {
      return i;
    }

    i++;
  }

  return i;
}

/**
Keys added to the export after export.json was written. JsonKeyFilter.AddedLater.
*/
export const addedLater = new Set(['eccentricity', 'inclination', 'periapsisAngle', 'warnings', 'custom']);

/**
Removes named keys (and their values) from compact JSON. JsonKeyFilter.Without.
@param json
@param keys
*/
export function withoutKeys(json, keys) {
  let text = '';
  let i = 0;
  while (i < json.length) {
    const c = json[i];
    if (c === '"') {
      const end = stringEnd(json, i);
      const isKey = end + 1 < json.length && json[end + 1] === ':';
      if (isKey && keys.has(json.slice(i + 1, end))) {
        // Drop "key":value and the comma on one side of it.
        let after = valueEnd(json, end + 2);
        if (after < json.length && json[after] === ',') {
          after++;
        } else if (text.endsWith(',')) {
          text = text.slice(0, -1);
        }

        i = after;
        continue;
      }

      text += json.slice(i, end + 1);
      i = end + 1;
      continue;
    }

    text += c;
    i++;
  }

  return text;
}
