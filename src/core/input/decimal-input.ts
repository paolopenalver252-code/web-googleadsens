/**
 * RAW INPUT → PARSE
 *
 * Convierte el texto que escribe el usuario en un `Decimal` exacto, sin pasar
 * nunca por `parseFloat`/`Number`. Es independiente del locale: recibe los
 * símbolos (separador decimal y de miles) como datos.
 *
 * Reglas para es-ES (separador decimal "," y de miles "."), documentadas y
 * justificadas en docs/adr/0004-validacion.md:
 *
 *   "1"         → 1
 *   "1,5"       → 1.5
 *   ",5"        → 0.5
 *   "1234,56"   → 1234.56            (los separadores de miles son opcionales)
 *   "1.234,56"  → 1234.56
 *   "1 234,56"  → 1234.56            (también se admite espacio como separador de miles)
 *   "1.234"     → 1234  + aviso      (AMBIGUO: se interpreta como miles, como
 *                                      manda la convención española, pero se
 *                                      avisa al usuario de la interpretación)
 *   "1.234.567" → 1234567            (sin aviso: dos puntos no pueden ser decimales)
 *   "12.5"      → error ambiguous_separator  (grupo de miles inválido: casi
 *   "0.25"      → error ambiguous_separator   seguro quiso usar punto decimal;
 *                                              NO se adivina)
 *   "1,234.56"  → error invalid_format
 *   "5,"        → error invalid_format   (separador decimal sin decimales)
 *   "1e5"       → error invalid_characters (no se admite notación científica)
 *   "-5"        → -5   (el signo se admite aquí; los límites los decide la validación)
 *   ""          → empty (la validación decide si el campo es obligatorio)
 */
import { Decimal } from '../math/decimal';

export interface NumberSymbols {
  /** Separador decimal del locale (es-ES: ","). */
  readonly decimal: string;
  /** Separador de miles del locale (es-ES: "."). */
  readonly group: string;
}

export type DecimalParseErrorCode =
  | 'too_long'
  | 'invalid_characters'
  | 'invalid_format'
  | 'invalid_grouping'
  | 'ambiguous_separator'
  | 'too_many_digits';

/** Interpretaciones que conviene mostrar al usuario aunque la entrada sea válida. */
export type DecimalParseNotice = 'group_separator_interpreted';

export type DecimalParseOutcome =
  | { readonly status: 'empty' }
  | {
      readonly status: 'ok';
      readonly value: Decimal;
      readonly notices: readonly DecimalParseNotice[];
    }
  | { readonly status: 'error'; readonly code: DecimalParseErrorCode };

export interface ParseDecimalOptions {
  /**
   * Símbolos de unidad que el usuario puede pegar junto al número y que se
   * ignoran (p. ej. "€" en un importe, "%" en un porcentaje).
   */
  readonly affixes?: readonly string[];
}

/** Longitud máxima del texto bruto. Limita el trabajo ante entradas abusivas. */
export const MAX_INPUT_LENGTH = 64;

/**
 * Máximo de dígitos significativos aceptados (sin ceros a la izquierda).
 * Queda por debajo de la precisión del adaptador (40), con margen.
 */
export const MAX_SIGNIFICANT_DIGITS = 30;

// \s ya incluye los espacios Unicode (U+00A0 no separable, U+202F estrecho, U+2009 fino…)
const SPACE_LIKE = /\s+/g;
const UNICODE_MINUS = /\u2212/g;

export function parseDecimalInput(
  raw: string,
  symbols: NumberSymbols,
  options: ParseDecimalOptions = {},
): DecimalParseOutcome {
  if (raw.length > MAX_INPUT_LENGTH) return error('too_long');

  let text = raw.replace(SPACE_LIKE, ' ').replace(UNICODE_MINUS, '-').trim();
  text = stripAffixes(text, options.affixes ?? []);
  if (text === '') return { status: 'empty' };

  let sign = '';
  if (text.startsWith('-') || text.startsWith('+')) {
    sign = text.startsWith('-') ? '-' : '';
    text = text.slice(1).trimStart(); // admite "- 5"
  }

  if (!hasOnlyAllowedCharacters(text, symbols)) return error('invalid_characters');

  const decimalParts = text.split(symbols.decimal);
  if (decimalParts.length > 2) return error('invalid_format');
  const integerPart = decimalParts[0] ?? '';
  const fractionPart = decimalParts[1];

  if (fractionPart !== undefined && !/^\d+$/.test(fractionPart)) {
    return error('invalid_format');
  }
  if (integerPart === '' && fractionPart === undefined) return error('invalid_format');

  const integer = parseIntegerPart(integerPart, symbols, fractionPart !== undefined);
  if (integer.status === 'error') return integer;

  const integerDigits = integer.digits.replace(/^0+(?=\d)/, '');
  const fractionDigits = fractionPart ?? '';
  const significant = (integerDigits + fractionDigits).replace(/^0+/, '');
  if (significant.length > MAX_SIGNIFICANT_DIGITS) return error('too_many_digits');

  const canonical =
    sign +
    (integerDigits === '' ? '0' : integerDigits) +
    (fractionDigits ? `.${fractionDigits}` : '');

  return {
    status: 'ok',
    value: Decimal.from(canonical),
    notices: integer.notices,
  };
}

type IntegerParse =
  | { readonly status: 'ok'; readonly digits: string; readonly notices: DecimalParseNotice[] }
  | { readonly status: 'error'; readonly code: DecimalParseErrorCode };

function parseIntegerPart(
  part: string,
  symbols: NumberSymbols,
  hasFraction: boolean,
): IntegerParse {
  if (/^\d*$/.test(part)) return { status: 'ok', digits: part, notices: [] };

  const usesGroupSymbol = part.includes(symbols.group);
  const usesSpace = part.includes(' ');
  if (usesGroupSymbol && usesSpace && symbols.group !== ' ') return error('invalid_grouping');

  const separator = usesGroupSymbol ? symbols.group : ' ';
  const groups = part.split(separator);
  const [first, ...rest] = groups;
  const validGrouping =
    first !== undefined &&
    /^[1-9]\d{0,2}$/.test(first) &&
    rest.length > 0 &&
    rest.every((group) => /^\d{3}$/.test(group));

  if (!validGrouping) {
    // Un único separador de miles, sin parte decimal y con un grupo inválido
    // ("12.5", "0.25", "1.23456") es casi con seguridad un intento de usar el
    // separador como decimal. No se adivina: se pide corregirlo.
    const looksLikeDecimalAttempt = usesGroupSymbol && !hasFraction && groups.length === 2;
    return error(looksLikeDecimalAttempt ? 'ambiguous_separator' : 'invalid_grouping');
  }

  // "1.234" también podría ser un decimal escrito con punto: es válido según
  // la convención del locale, pero se avisa de cómo se ha interpretado.
  const notices: DecimalParseNotice[] =
    usesGroupSymbol && !hasFraction && groups.length === 2 ? ['group_separator_interpreted'] : [];

  return { status: 'ok', digits: groups.join(''), notices };
}

function hasOnlyAllowedCharacters(text: string, symbols: NumberSymbols): boolean {
  for (const char of text) {
    const isAsciiDigit = char >= '0' && char <= '9';
    if (!isAsciiDigit && char !== symbols.decimal && char !== symbols.group && char !== ' ') {
      return false;
    }
  }
  return true;
}

function stripAffixes(text: string, affixes: readonly string[]): string {
  for (const affix of affixes) {
    if (affix === '') continue;
    if (text.endsWith(affix)) return text.slice(0, -affix.length).trim();
    if (text.startsWith(affix)) return text.slice(affix.length).trim();
  }
  return text;
}

function error(code: DecimalParseErrorCode): {
  readonly status: 'error';
  readonly code: DecimalParseErrorCode;
} {
  return { status: 'error', code };
}
