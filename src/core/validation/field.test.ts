import { describe, expect, it } from 'vitest';

import { Decimal } from '../math/decimal';
import {
  assertValidFieldSpec,
  decimalField,
  validateDecimalField,
  type NumberConventions,
} from './field';

const ES: NumberConventions = { decimal: ',', group: '.', currencySymbol: '€', percentSign: '%' };

const amount = decimalField({
  required: true,
  unit: 'currency',
  min: '0',
  max: '1000000',
  maxFractionDigits: 2,
});
const optionalRate = decimalField({ required: false, unit: 'percent', min: '-100', max: '100' });
const years = decimalField({ required: true, unit: 'years', min: '1', max: '50', integer: true });

describe('validateDecimalField', () => {
  it('devuelve el valor tipado y los avisos del parseo', () => {
    const result = validateDecimalField('importe', '1.234,56 €', amount, ES);
    expect(result.ok && result.value.value?.toString()).toBe('1234.56');

    const ambiguous = validateDecimalField('importe', '1.234', amount, ES);
    expect(ambiguous.ok && ambiguous.value.notices).toEqual(['group_separator_interpreted']);
  });

  it('vacío: error en campos obligatorios, undefined en opcionales', () => {
    expect(validateDecimalField('importe', '', amount, ES)).toEqual({
      ok: false,
      error: { field: 'importe', code: 'required' },
    });
    expect(validateDecimalField('tipo', '  ', optionalRate, ES)).toEqual({
      ok: true,
      value: { value: undefined, notices: [] },
    });
  });

  it('propaga el código de error del parseo con el nombre del campo', () => {
    expect(validateDecimalField('importe', '12.5', amount, ES)).toEqual({
      ok: false,
      error: { field: 'importe', code: 'ambiguous_separator' },
    });
  });

  it('límites inclusivos', () => {
    expect(validateDecimalField('importe', '0', amount, ES).ok).toBe(true);
    expect(validateDecimalField('importe', '1.000.000', amount, ES).ok).toBe(true);
    expect(validateDecimalField('importe', '-0,01', amount, ES)).toEqual({
      ok: false,
      error: { field: 'importe', code: 'below_min', params: { min: Decimal.from('0') } },
    });
    expect(validateDecimalField('importe', '1.000.000,01', amount, ES)).toEqual({
      ok: false,
      error: { field: 'importe', code: 'above_max', params: { max: Decimal.from('1000000') } },
    });
  });

  it('decimales máximos y enteros', () => {
    expect(validateDecimalField('importe', '1,234', amount, ES)).toEqual({
      ok: false,
      error: { field: 'importe', code: 'too_many_decimals', params: { max: 2 } },
    });
    expect(validateDecimalField('importe', '1,50', amount, ES).ok).toBe(true);
    expect(validateDecimalField('plazo', '2,5', years, ES)).toEqual({
      ok: false,
      error: { field: 'plazo', code: 'not_integer' },
    });
    expect(validateDecimalField('plazo', '2,0', years, ES).ok).toBe(true);
  });

  it('en porcentajes admite el símbolo % y negativos dentro de límites', () => {
    const result = validateDecimalField('tipo', '-5,25 %', optionalRate, ES);
    expect(result.ok && result.value.value?.toString()).toBe('-5.25');
  });

  it('los años no aceptan símbolos de moneda', () => {
    expect(validateDecimalField('plazo', '5 €', years, ES)).toEqual({
      ok: false,
      error: { field: 'plazo', code: 'invalid_characters' },
    });
  });
});

describe('assertValidFieldSpec', () => {
  it('acepta especificaciones coherentes', () => {
    expect(() => {
      assertValidFieldSpec('importe', amount);
      assertValidFieldSpec('plazo', years);
    }).not.toThrow();
  });

  it('rechaza especificaciones incoherentes (error de programación)', () => {
    expect(() => {
      assertValidFieldSpec(
        'x',
        decimalField({ required: true, unit: 'none', min: '10', max: '1' }),
      );
    }).toThrow(/min/);
    expect(() => {
      assertValidFieldSpec(
        'x',
        decimalField({ required: true, unit: 'none', min: '0', max: '1', maxFractionDigits: 21 }),
      );
    }).toThrow(/maxFractionDigits/);
    expect(() => {
      assertValidFieldSpec(
        'x',
        decimalField({
          required: true,
          unit: 'none',
          min: '0',
          max: '1',
          integer: true,
          maxFractionDigits: 2,
        }),
      );
    }).toThrow(/entero/);
    expect(() => {
      assertValidFieldSpec(
        'x',
        decimalField({ required: true, unit: 'none', min: '0.5', max: '1', integer: true }),
      );
    }).toThrow(/enteros/);
  });
});
