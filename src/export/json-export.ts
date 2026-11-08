/**
The JSON export of every generated object. A port of `Core/JsonExport.cs`: the keys, their order and the number format
are the C# ones (the field table in `export-schema.ts` is generated from the C# file). C# `x.ToJson(indented, children)`
becomes `toJson(type, x, {indented, children})`, where `type` is the export's `type` string.
*/
import {JsonWriter} from '../core/json-writer.ts';
import {exportFields} from './export-schema.ts';

/**
The export format's name and version. C# `JsonExport.Schema`.
*/
export const exportSchema = 'universe-generator/1';

/**
The objects that export on their own, by the `type` their JSON carries.
*/
export type ExportType = 'universe' | 'galaxyCluster' | 'cosmicVoid' | 'galaxy' | 'starSystem' | 'planet' | 'moon' | 'belt' | 'station';

/**
How an export is written: indented, and with lazy lists (a galaxy's systems, a cluster's galaxies, a void's systems) in full.
*/
export type ExportOptions = {readonly indented?: boolean; readonly children?: boolean};

type RecordName = keyof typeof exportFields;
type Field = readonly [string, string, RecordName?];
type Value = Record<string, unknown>;

const recordOf: Record<ExportType, RecordName> = {
  universe: 'Universe',
  galaxyCluster: 'GalaxyCluster',
  cosmicVoid: 'CosmicVoid',
  galaxy: 'Galaxy',
  starSystem: 'StarSystem',
  planet: 'Planet',
  moon: 'Moon',
  belt: 'Belt',
  station: 'Station',
};

// Each value with as many decimals as fit (at most 9), decided by comparison alone, so the same on every runtime.
function real(w: JsonWriter, v: number): void {
  const a = Math.abs(v);
  let decimals = 9;
  let limit = 9_007_199_254_740_992 / 1e9;
  while (decimals > 0 && a >= limit) {
    decimals--;
    limit *= 10;
  }

  w.number(v, decimals);
}

// Custom fields as an object, names in ordinal order. Hooks are not ported, so generated objects carry none.
// The default sort compares UTF-16 code units, which is C#'s ordinal order.
function custom(w: JsonWriter, customFields: Readonly<Record<string, string>> = {}): void {
  w.beginObject();
  for (const name of Object.keys(customFields).toSorted()) {
    w.name(name).string(customFields[name]);
  }

  w.endObject();
}

// The lazy lists: generated objects hold an accessor and a count instead of the list.
function lazy(record: RecordName, v: Value): Value[] {
  if (record === 'GalaxyCluster') {
    const cluster = v as {map: unknown[]; galaxy(i: number): Value};
    return cluster.map.map((_, i) => cluster.galaxy(i));
  }

  if (record === 'Galaxy') {
    const galaxy = v as {map: unknown[]; system(i: number): Value};
    return galaxy.map.map((_, i) => galaxy.system(i));
  }

  const hole = v as {systemCount: number; system(i: number): Value};
  return Array.from({length: hole.systemCount}, (_, i) => hole.system(i));
}

function writeValue(w: JsonWriter, kind: string, sub: RecordName | undefined, value: unknown, owner: RecordName, v: Value, children: boolean): void {
  if (value === undefined && kind.endsWith('?')) {
    w.null();
    return;
  }

  switch (kind) {
    case 'real':
    case 'real?': {
      real(w, value as number);
      break;
    }

    case 'int':
    case 'int?': {
      w.int(value as number);
      break;
    }

    case 'bool': {
      w.bool(value as boolean);
      break;
    }

    case 'string':
    case 'string?': {
      w.string(value as string);
      break;
    }

    case 'custom': {
      custom(w, value as Record<string, string> | undefined);
      break;
    }

    case 'strings': {
      w.beginArray();
      for (const item of value as string[]) {
        w.string(item);
      }

      w.endArray();
      break;
    }

    case 'ints': {
      w.beginArray();
      for (const item of value as number[]) {
        w.int(item);
      }

      w.endArray();
      break;
    }

    case 'list': {
      w.beginArray();
      for (const item of value as Value[]) {
        writeRecord(w, sub!, item, children);
      }

      w.endArray();
      break;
    }

    case 'lazy': {
      if (children) {
        w.beginArray();
        for (const item of lazy(owner, v)) {
          writeRecord(w, sub!, item, children);
        }

        w.endArray();
      } else {
        w.null();
      }

      break;
    }

    default: {
      writeRecord(w, sub!, value as Value, children);
    }
  }
}

function fields(w: JsonWriter, record: RecordName, v: Value, children: boolean): void {
  for (const [key, kind, sub] of exportFields[record] as readonly Field[]) {
    w.name(key);
    writeValue(w, kind, sub, v[key], record, v, children);
  }
}

function writeRecord(w: JsonWriter, record: RecordName, v: Value, children: boolean): void {
  w.beginObject();
  fields(w, record, v, children);
  w.endObject();
}

/**
An object's JSON export, with its schema and type first. C# `ToJson(indented, children)`.
*/
export function toJson(type: ExportType, value: Readonly<Record<string, unknown>>, options: ExportOptions = {}): string {
  const w = new JsonWriter(options.indented ?? false);
  w.beginObject().name('schema').string(exportSchema).name('type').string(type);
  fields(w, recordOf[type], value, options.children ?? false);
  w.endObject();
  return w.toString();
}
