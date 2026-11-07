import type {GeneratorOptions} from './options.ts';

/**
One choice of a weight table and its weight; weight 0 is never drawn. C# `WeightEntry`.
*/
export type WeightEntry = {readonly name: string; readonly weight: number};
/**
A weight table, by id, such as `star-classes.mature`. C# `WeightTable`.
*/
export type WeightTable = {readonly id: string; readonly entries: readonly WeightEntry[]};

/**
The ids of the tables the generator reads, in order.
*/
export const tableIds = [
  'star-classes.young',
  'star-classes.mature',
  'star-classes.old',
  'star-classes.plausible',
  'planet-kinds.hot',
  'planet-kinds.warm',
  'planet-kinds.temperate',
  'planet-kinds.cold',
  'moon-kinds.giant',
] as const;

// Table indexes, in the order of tableIds.
export const starYoung = 0;
export const starMature = 1;
export const starOld = 2;
export const starPlausible = 3;
export const planetHot = 4;
export const planetWarm = 5;
export const planetTemperate = 6;
export const planetCold = 7;
export const giantMoons = 8;

const starClassNames = ['M', 'K', 'G', 'F', 'A', 'B', 'O', 'WhiteDwarf', 'Giant', 'Supergiant', 'NeutronStar', 'BlackHole'];

// The choices and built-in weights of each table: StarGenerator's and StarSystemGenerator's arrays in C#.
export const builtInChoices: ReadonlyArray<readonly string[]> = [
  starClassNames,
  starClassNames,
  starClassNames,
  starClassNames,
  ['Lava', 'Iron', 'Barren', 'Greenhouse'],
  ['Barren', 'Desert', 'Greenhouse', 'Rocky'],
  ['Rocky', 'Ocean', 'Garden', 'Desert', 'Barren'],
  ['Barren', 'Rocky', 'Ice', 'Desert'],
  ['Ice', 'Barren', 'Volcanic', 'Ocean', 'Hazy'],
];

const builtInWeights: ReadonlyArray<readonly number[]> = [
  [260, 170, 140, 110, 90, 40, 10, 20, 25, 15, 6, 3],
  [300, 200, 150, 90, 50, 15, 3, 60, 50, 8, 10, 5],
  [320, 210, 140, 70, 25, 4, 1, 110, 80, 4, 14, 8],
  [7250, 1290, 590, 310, 60, 4, 0, 590, 40, 1, 10, 2],
  [30, 20, 40, 10],
  [25, 30, 20, 25],
  [22, 25, 22, 15, 10],
  [30, 15, 40, 10],
  [45, 20, 10, 15, 10],
];

/**
The longest tables id accepted.
*/
export const maxTablesIdLength = 40;
/**
The format name `toJson` writes.
*/
export const tablesSchema = 'universe-generator-tables/1';

function indexOf(id: string | undefined): number {
  const at = (tableIds as readonly string[]).indexOf(id ?? '');
  if (at === -1) {
    throw new RangeError(`"${id}" is not a table; the tables are ${tableIds.join(', ')}.`);
  }

  return at;
}

/**
Throws unless the id is 1 to 40 lowercase letters, digits and dashes, not starting with a dash.
*/
export function checkTablesId(id: string | undefined): void {
  if (typeof id !== 'string') {
    throw new TypeError('Tables need an id such as "my-mod".');
  }

  if (!/^[\da-z][\d\-a-z]{0,39}$/u.test(id)) {
    throw new RangeError(`A tables id is 1 to ${maxTablesIdLength} lowercase letters, digits and dashes, not starting with a dash, such as "my-mod"; got "${id}".`);
  }
}

function compile(t: number, table: WeightTable): number[] {
  const names = builtInChoices[t]!;
  const weights = names.map(() => 0);
  const seen = names.map(() => false);
  let total = 0;
  for (const entry of table.entries ?? []) {
    const at = names.indexOf(entry?.name);
    if (at === -1) {
      throw new RangeError(`"${entry?.name}" is not a choice of ${table.id}; its choices are ${names.join(', ')}.`);
    }

    if (seen[at] === true) {
      throw new RangeError(`${table.id} lists "${entry.name}" twice.`);
    }

    if (!Number.isSafeInteger(entry.weight) || entry.weight < 0 || entry.weight > 1_000_000) {
      throw new RangeError(`${table.id}: the weight of ${entry.name} must be 0 to 1,000,000; got ${entry.weight}.`);
    }

    seen[at] = true;
    weights[at] = entry.weight;
    total += entry.weight;
  }

  if (total === 0) {
    throw new RangeError(`${table.id} needs at least one weight above 0.`);
  }

  return weights;
}

const canonical = (t: number, weights: readonly number[]): WeightTable => ({
  id: tableIds[t]!,
  entries: builtInChoices[t]!.map((name, i) => ({name, weight: weights[i]!})),
});

const registered = new Map<string, GeneratorTables>();
let defaultTables: GeneratorTables | undefined;

/**
A set of weight tables behind some of the generator's choices (star classes by age, rocky planet kinds by zone, giant planets' moons).
The C# class `GeneratorTables`: build one, {@link GeneratorTables.register} it, and name its id in `options.tables`.
*/
export class GeneratorTables {
  /**
  The built-in tables, id `default`.
  */
  static get default(): GeneratorTables {
    defaultTables ??= new GeneratorTables('default', []);
    return defaultTables;
  }

  /**
  Makes these tables findable by id; the built-in `default` cannot be replaced.
  */
  static register(tables: GeneratorTables): void {
    if (tables.id === 'default') {
      throw new RangeError('The id "default" belongs to the built-in tables; register yours under another id.');
    }

    registered.set(tables.id, tables);
  }

  /**
  The tables registered under an id, or undefined.
  */
  static find(id: string): GeneratorTables | undefined {
    return findTables(id);
  }

  /**
  Reads tables from JSON written by {@link GeneratorTables.toJson}; tables left out keep their built-in weights.
  */
  static fromJson(json: string): GeneratorTables {
    const value: unknown = JSON.parse(json);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new SyntaxError('expected {');
    }

    let id: string | undefined;
    const tables: WeightTable[] = [];
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      switch (key) {
        case 'schema': {
          if (v !== tablesSchema) {
            throw new SyntaxError(`the schema is "${String(v)}"; this package reads "${tablesSchema}"`);
          }

          break;
        }

        case 'id': {
          id = readString(v);
          break;
        }

        case 'tables': {
          for (const table of readArray(v)) {
            tables.push(readTable(table));
          }

          break;
        }

        default: {
          throw new SyntaxError(`"${key}" is not a key of a table set; the keys are schema, id and tables`);
        }
      }
    }

    if (id === undefined) {
      throw new SyntaxError('the table set has no "id"');
    }

    return new GeneratorTables(id, tables);
  }

  readonly #weights: ReadonlyArray<readonly number[]>;
  /**
  The name a program registers these tables under and a link carries, such as `my-mod`.
  */
  readonly id: string;
  /**
  Every table in the order of {@link tableIds}, each listing every choice.
  */
  readonly tables: readonly WeightTable[];

  /**
  Makes a set of tables; every table not given keeps its built-in weights.
  */
  constructor(id: string, tables: Iterable<WeightTable>) {
    checkTablesId(id);
    const weights: Array<number[] | undefined> = tableIds.map(() => undefined);
    for (const table of tables) {
      const t = indexOf(table?.id);
      if (weights[t] !== undefined) {
        throw new RangeError(`Table "${table.id}" appears twice.`);
      }

      weights[t] = compile(t, table);
    }

    this.#weights = weights.map((w, t) => w ?? [...builtInWeights[t]!]);
    this.id = id;
    this.tables = this.#weights.map((w, t) => canonical(t, w));
  }

  /**
  The table with this id.
  */
  table(id: string): WeightTable {
    return this.tables[indexOf(id)]!;
  }

  /**
  A copy with a new id and these tables in place of the ones with the same ids.
  */
  with(id: string, ...tables: WeightTable[]): GeneratorTables {
    const merged = [...this.tables];
    for (const table of tables) {
      merged[indexOf(table?.id)] = table;
    }

    return new GeneratorTables(id, merged);
  }

  /**
  These tables as JSON: the schema, the id, then every table in full.
  */
  toJson(isIndented = false): string {
    return JSON.stringify({schema: tablesSchema, id: this.id, tables: this.tables}, undefined, isIndented ? 2 : undefined);
  }

  /**
  Table t's weights in the order of its built-in choices.
  */
  weights(t: number): readonly number[] {
    return this.#weights[t]!;
  }
}

/**
The tables registered under an id, or undefined.
*/
export function findTables(id: string): GeneratorTables | undefined {
  return id === 'default' ? GeneratorTables.default : registered.get(id);
}

/**
The tables the options name; the built-in ones when they name none.
*/
export function tablesFor(options: GeneratorOptions): GeneratorTables {
  if (options.tables === undefined) {
    return GeneratorTables.default;
  }

  const tables = findTables(options.tables);
  if (tables === undefined) {
    throw new Error(`No tables are registered as "${options.tables}"; call GeneratorTables.register before generating.`);
  }

  return tables;
}

function readString(v: unknown): string {
  if (typeof v !== 'string') {
    throw new SyntaxError('expected "');
  }

  return v;
}

function readArray(v: unknown): unknown[] {
  if (!Array.isArray(v)) {
    throw new SyntaxError('expected [');
  }

  return v;
}

function readObject(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new SyntaxError('expected {');
  }

  return v as Record<string, unknown>;
}

function readTable(v: unknown): WeightTable {
  let id: string | undefined;
  const entries: WeightEntry[] = [];
  for (const [key, value] of Object.entries(readObject(v))) {
    if (key === 'id') {
      id = readString(value);
    } else if (key === 'entries') {
      for (const item of readArray(value)) {
        let name: string | undefined;
        let weight: number | undefined;
        for (const [k, x] of Object.entries(readObject(item))) {
          if (k === 'name') {
            name = readString(x);
          } else if (k === 'weight') {
            if (typeof x !== 'number' || !Number.isSafeInteger(x)) {
              throw new SyntaxError('expected a whole number');
            }

            weight = x;
          } else {
            throw new SyntaxError(`"${k}" is not a key of an entry; the keys are name and weight`);
          }
        }

        if (name === undefined) {
          throw new SyntaxError('an entry has no "name"');
        }

        if (weight === undefined) {
          throw new SyntaxError('an entry has no "weight"');
        }

        entries.push({name, weight});
      }
    } else {
      throw new SyntaxError(`"${key}" is not a key of a table; the keys are id and entries`);
    }
  }

  if (id === undefined) {
    throw new SyntaxError('a table has no "id"');
  }

  return {id, entries};
}
