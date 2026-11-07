/**
A small hand-written JSON writer: a port of `Core/JsonWriter.cs`. The same text on every runtime, LF line ends, and
numbers printed from integers at a fixed number of decimals (never through JavaScript's own number formatting).
*/
import {DMath} from './dmath.ts';

/**
A finite number rounded to `decimals` places as {@link DMath.round} does, without trailing zeros. The C#
`JsonWriter.Format`.
*/
function format(value: number, decimals: number): string {
  const p = DMath.powerOfTen(decimals);
  const scaled = Math.floor((Math.abs(value) * p) + 0.5);
  if (scaled >= 9_007_199_254_740_992) {
    throw new RangeError(`The value is too large for its number of decimals. (Parameter 'value')\nActual value was ${value}.`);
  }

  let digits = String(scaled);
  const sign = scaled !== 0 && value < 0 ? '-' : '';
  if (decimals === 0) {
    return sign + digits;
  }

  digits = digits.padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  let fraction = digits.slice(digits.length - decimals);
  while (fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1);
  }

  return fraction.length > 0 ? `${sign}${whole}.${fraction}` : sign + whole;
}

/**
Writes JSON text as the C# UniverseGenerator does, indented (two spaces) or compact.
*/
export class JsonWriter {
  /**
  The C# `JsonWriter.Format`.
  */
  static format = format;

  private text = '';
  private readonly hasItems: boolean[] = [];
  private afterName = false;
  private readonly indented: boolean;

  constructor(indented: boolean) {
    this.indented = indented;
  }

  beginObject(): this {
    return this.open('{');
  }

  endObject(): this {
    return this.close('}');
  }

  beginArray(): this {
    return this.open('[');
  }

  endArray(): this {
    return this.close(']');
  }

  name(name: string): this {
    this.beforeValue();
    this.appendString(name);
    this.text += this.indented ? ': ' : ':';
    this.afterName = true;
    return this;
  }

  string(value: string | undefined): this {
    if (value === undefined) {
      return this.null();
    }

    this.beforeValue();
    this.appendString(value);
    return this;
  }

  int(value: number): this {
    this.beforeValue();
    this.text += String(value);
    return this;
  }

  /**
  A number rounded to `decimals` places (0 to 15), without trailing zeros; NaN and infinities are written as null.
  */
  number(value: number, decimals: number): this {
    if (!Number.isFinite(value)) {
      return this.null();
    }

    this.beforeValue();
    this.text += format(value, decimals);
    return this;
  }

  bool(value: boolean): this {
    this.beforeValue();
    this.text += value ? 'true' : 'false';
    return this;
  }

  null(): this {
    this.beforeValue();
    this.text += 'null';
    return this;
  }

  /**
  The text written so far; an indented document ends with a line feed.
  */
  toString(): string {
    return this.indented && this.hasItems.length === 0 && this.text.length > 0 ? this.text + '\n' : this.text;
  }

  private open(bracket: string): this {
    this.beforeValue();
    this.text += bracket;
    this.hasItems.push(false);
    return this;
  }

  private close(bracket: string): this {
    if (this.hasItems.pop()) {
      this.newLine();
    }

    this.text += bracket;
    return this;
  }

  private beforeValue(): void {
    if (this.afterName) {
      this.afterName = false;
      return;
    }

    const last = this.hasItems.length - 1;
    if (last < 0) {
      return;
    }

    if (this.hasItems[last] === true) {
      this.text += ',';
    } else {
      this.hasItems[last] = true;
    }

    this.newLine();
  }

  private newLine(): void {
    if (this.indented) {
      this.text += '\n' + ' '.repeat(2 * this.hasItems.length);
    }
  }

  private appendString(value: string): void {
    let out = '"';
    for (let i = 0; i < value.length; i++) {
      const c = value.charCodeAt(i);
      switch (c) {
        case 0x22: {
          out += String.raw`\"`;
          break;
        }

        case 0x5C: {
          out += '\\\\';
          break;
        }

        case 0x0A: {
          out += String.raw`\n`;
          break;
        }

        case 0x0D: {
          out += String.raw`\r`;
          break;
        }

        case 0x09: {
          out += String.raw`\t`;
          break;
        }

        default: {
          // Control characters, and every surrogate half so a lone one stays valid JSON text.
          out += c < 0x20 || (c >= 0xD8_00 && c <= 0xDF_FF) ? String.raw`\u` + c.toString(16).padStart(4, '0') : value[i];
        }
      }
    }

    this.text += out + '"';
  }
}
