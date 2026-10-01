import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { Decimal } from '../math/decimal';
import {
  MAX_INPUT_LENGTH,
  MAX_SIGNIFICANT_DIGITS,
  parseDecimalInput,
  type DecimalParseOutcome,
  type NumberSymbols,
} from './decimal-input';

const ES: NumberSymbols = { decimal: ',', group: '.' };
const NBSP = String.fromCharCode(0xa0);
const NARROW_NBSP = String.fromCharCode(0x202f);
const UNICODE_MINUS = String.fromCharCode(0x2212);

function valueOf(outcome: DecimalParseOutcome): string {
  if (outcome.status !== 'ok')
    throw new Error(`Se esperaba ok, se obtuvo ${JSON.stringify(outcome)}`);
  return outcome.value.toString();
}

const parse = (raw: string, affixes?: readonly string[]) =>
  parseDecimalInput(raw, ES, affixes === undefined ? {} : { affixes });

describe('parseDecimalInput (es-ES) — casos requeridos', () => {
  it('"1" → 1', () => {
    expect(valueOf(parse('1'))).toBe('1');
  });

  it('"1,5" → 1.5 (coma decimal)', () => {
    expect(valueOf(parse('1,5'))).toBe('1.5');
  });

  it('"1.234" → 1234, con aviso de interpretación (caso ambiguo documentado)', () => {
    const outcome = parse('1.234');
    expect(valueOf(outcome)).toBe('1234');
    expect(outcome.status === 'ok' && outcome.notices).toEqual(['group_separator_interpreted']);
  });

  it('"1.234,56" → 1234.56, sin aviso (no hay ambigüedad)', () => {
    const outcome = parse('1.234,56');
    expect(valueOf(outcome)).toBe('1234.56');
    expect(outcome.status === 'ok' && outcome.notices).toEqual([]);
  });

  it('"0" → 0', () => {
    expect(valueOf(parse('0'))).toBe('0');
  });

  it('valores negativos: el signo se admite; los límites los decide la validación', () => {
    expect(valueOf(parse('-5'))).toBe('-5');
    expect(valueOf(parse('-1.234,5'))).toBe('-1234.5');
    expect(valueOf(parse(`${UNICODE_MINUS}3`))).toBe('-3');
    expect(valueOf(parse('- 5'))).toBe('-5');
    expect(valueOf(parse('+5'))).toBe('5');
    expect(valueOf(parse('-0'))).toBe('0');
  });

  it('cadenas vacías o solo con espacios → empty', () => {
    expect(parse('')).toEqual({ status: 'empty' });
    expect(parse('   ')).toEqual({ status: 'empty' });
    expect(parse(NBSP)).toEqual({ status: 'empty' });
    expect(parse('€', ['€'])).toEqual({ status: 'empty' });
  });

  it.each(['abc', '12a', '1e5', '1E5', '0x10', '5$', '--5', '5-', '1_000', '١٢'])(
    'caracteres inválidos: %j → invalid_characters',
    (raw) => {
      expect(parse(raw)).toEqual({ status: 'error', code: 'invalid_characters' });
    },
  );

  it('valores extremadamente grandes: exactos hasta el límite de dígitos, error por encima', () => {
    const maxDigits = '9'.repeat(MAX_SIGNIFICANT_DIGITS);
    expect(valueOf(parse(maxDigits))).toBe(maxDigits);
    expect(valueOf(parse('9007199254740993'))).toBe('9007199254740993'); // no representable en number
    expect(parse('9'.repeat(MAX_SIGNIFICANT_DIGITS + 1))).toEqual({
      status: 'error',
      code: 'too_many_digits',
    });
    expect(parse('1'.repeat(MAX_INPUT_LENGTH + 1))).toEqual({ status: 'error', code: 'too_long' });
  });
});

describe('parseDecimalInput — separadores y formato', () => {
  it.each([
    ['1234,56', '1234.56'],
    [',5', '0.5'],
    ['0,50', '0.5'],
    ['007', '7'],
    ['1.234.567', '1234567'],
    ['1.234.567,891', '1234567.891'],
    ['1 234,56', '1234.56'],
    [`1${NBSP}234,56`, '1234.56'],
    [`1${NARROW_NBSP}234`, '1234'],
    ['  42  ', '42'],
    ['0,000000000000000000000000000001', '0.000000000000000000000000000001'],
  ])('%j → %s', (raw, expected) => {
    expect(valueOf(parse(raw))).toBe(expected);
  });

  it('"1.234.567" no genera aviso: con dos puntos no puede ser un decimal', () => {
    const outcome = parse('1.234.567');
    expect(outcome.status === 'ok' && outcome.notices).toEqual([]);
  });

  it.each(['12.5', '0.25', '1.23456', '0.123', '.234'])(
    '%j (punto usado como decimal) → ambiguous_separator: no se adivina',
    (raw) => {
      expect(parse(raw)).toEqual({ status: 'error', code: 'ambiguous_separator' });
    },
  );

  it.each(['1.23.456', '12.34.567', '1.2345.678', '1 23', '1.234 567'])(
    '%j → invalid_grouping',
    (raw) => {
      expect(parse(raw)).toEqual({ status: 'error', code: 'invalid_grouping' });
    },
  );

  it.each(['1,234.56', '1,2,3', '5,', ',', '-', '+', '1,5.3', '12,5,'])(
    '%j → invalid_format',
    (raw) => {
      expect(parse(raw)).toEqual({ status: 'error', code: 'invalid_format' });
    },
  );

  it('ignora el símbolo de unidad permitido al principio o al final', () => {
    expect(valueOf(parse('1.234,56 €', ['€']))).toBe('1234.56');
    expect(valueOf(parse(`1.234,56${NBSP}€`, ['€']))).toBe('1234.56');
    expect(valueOf(parse('€ 10', ['€']))).toBe('10');
    expect(valueOf(parse('5,25 %', ['%']))).toBe('5.25');
    expect(parse('5 €')).toEqual({ status: 'error', code: 'invalid_characters' });
  });

  it('no depende de es-ES: funciona con otros símbolos (en-US)', () => {
    const US: NumberSymbols = { decimal: '.', group: ',' };
    expect(parseDecimalInput('1,234.56', US)).toEqual({
      status: 'ok',
      value: Decimal.from('1234.56'),
      notices: [],
    });
    expect(parseDecimalInput('1,5', US)).toEqual({ status: 'error', code: 'ambiguous_separator' });
  });
});

describe('parseDecimalInput — propiedad: lo que formatea Intl es-ES se parsea al mismo valor', () => {
  it('parse(formato es-ES(x)) = x', () => {
    const decimalLiteral = fc
      .tuple(fc.boolean(), fc.bigInt({ min: 0n, max: 10n ** 20n }), fc.integer({ min: 0, max: 6 }))
      .map(([negative, digits, scale]) => {
        const text = digits.toString().padStart(scale + 1, '0');
        const literal = scale === 0 ? text : `${text.slice(0, -scale)}.${text.slice(-scale)}`;
        return { literal: negative && digits !== 0n ? `-${literal}` : literal, scale };
      });

    fc.assert(
      fc.property(decimalLiteral, ({ literal, scale }) => {
        const formatted = new Intl.NumberFormat('es-ES', {
          useGrouping: 'always',
          minimumFractionDigits: scale,
          maximumFractionDigits: scale,
        }).format(literal as `${number}`);
        const outcome = parseDecimalInput(formatted, ES);
        expect(outcome.status).toBe('ok');
        if (outcome.status === 'ok') expect(outcome.value.equals(Decimal.from(literal))).toBe(true);
      }),
    );
  });

  it('nunca lanza excepciones ante texto arbitrario (solo devuelve un resultado)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (raw) => {
        const outcome = parseDecimalInput(raw, ES);
        expect(['empty', 'ok', 'error']).toContain(outcome.status);
      }),
    );
  });
});
