/**
 * Campos de opción dentro del contrato de calculadora. Definición FICTICIA
 * (identidad, sin fórmulas): solo ejercita la infraestructura.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import { toIsoDate } from '../dates/iso-date';
import type { Decimal } from '../math/decimal';
import { ok } from '../result';
import { choiceField, decimalField, type NumberConventions } from '../validation/field';
import {
  DEFAULT_ROUNDING_POLICY,
  defineCalculator,
  parseCalculatorInput,
  validateCalculatorField,
  type ParsedFields,
} from './definition';

const ES: NumberConventions = { decimal: ',', group: '.', currencySymbol: '€', percentSign: '%' };
const context = { today: toIsoDate('2026-09-30') };

const fields = {
  amount: decimalField({ required: true, unit: 'currency', min: '0', max: '100' }),
  mode: choiceField({ required: true, options: ['fast', 'slow'] as const }),
  extra: choiceField({ required: false, options: ['yes', 'no'] as const }),
};

const mixed = defineCalculator({
  id: 'prueba-opciones',
  slug: 'prueba-opciones',
  version: '1.0.0',
  fields,
  toInput: (parsed) => ok(parsed),
  compute: (input) => input,
  rounding: DEFAULT_ROUNDING_POLICY,
  related: [],
});

describe('campos de opción en el contrato', () => {
  it('tipa cada opción como su literal y los numéricos como Decimal', () => {
    type Parsed = ParsedFields<typeof fields>;
    expectTypeOf<Parsed['mode']>().toEqualTypeOf<'fast' | 'slow'>();
    expectTypeOf<Parsed['extra']>().toEqualTypeOf<'yes' | 'no' | undefined>();
    expectTypeOf<Parsed['amount']>().toEqualTypeOf<Decimal>();
  });

  it('parsea campos numéricos y de opción juntos', () => {
    const result = parseCalculatorInput(
      mixed,
      { amount: '10', mode: 'slow', extra: '' },
      ES,
      context,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.input.mode).toBe('slow');
    expect(result.value.input.extra).toBeUndefined();
    expect(result.value.input.amount.toString()).toBe('10');
  });

  it('devuelve los errores de ambos tipos a la vez', () => {
    expect(
      parseCalculatorInput(mixed, { amount: '', mode: 'rapid', extra: '' }, ES, context),
    ).toEqual({
      ok: false,
      error: [
        { field: 'amount', code: 'required' },
        { field: 'mode', code: 'invalid_option' },
      ],
    });
  });

  it('valida un único campo de opción', () => {
    expect(validateCalculatorField(mixed, 'mode', 'fast', ES)).toEqual({
      ok: true,
      value: { value: 'fast', notices: [] },
    });
  });

  it('defineCalculator rechaza un campo de opción incoherente', () => {
    expect(() =>
      defineCalculator({
        id: 'mal',
        slug: 'mal',
        version: '1.0.0',
        fields: { mode: choiceField({ required: true, options: ['unica'] }) },
        toInput: (parsed) => ok(parsed),
        compute: (input) => input,
        rounding: DEFAULT_ROUNDING_POLICY,
        related: [],
      }),
    ).toThrow(/al menos dos/);
  });
});
