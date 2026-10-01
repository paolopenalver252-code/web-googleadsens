import { describe, expect, it } from 'vitest';

import { toIsoDate } from '../dates/iso-date';
import { Decimal, DecimalError } from '../math/decimal';
import { err, ok } from '../result';
import { decimalField, type NumberConventions } from '../validation/field';
import {
  DEFAULT_ROUNDING_POLICY,
  defineCalculator,
  parseCalculatorInput,
  runCalculator,
  validateCalculatorField,
} from './definition';

const ES: NumberConventions = { decimal: ',', group: '.', currencySymbol: '€', percentSign: '%' };
const context = { today: toIsoDate('2026-09-29') };

/**
 * Definición FICTICIA: `compute` devuelve la entrada (identidad), sin
 * fórmulas. Solo ejercita el contrato. La regla entre campos es arbitraria.
 */
const identity = defineCalculator({
  id: 'prueba-identidad',
  slug: 'prueba-identidad',
  version: '1.0.0',
  fields: {
    a: decimalField({
      required: true,
      unit: 'currency',
      min: '0',
      max: '1000',
      maxFractionDigits: 2,
    }),
    b: decimalField({ required: false, unit: 'none', min: '0', max: '10' }),
  },
  toInput: (fields, ctx) =>
    fields.b?.greaterThan(fields.a) === true
      ? err([{ field: 'b', code: 'prueba-identidad.b_mayor_que_a' }])
      : ok({ ...fields, today: ctx.today }),
  compute: (input) => input,
  rounding: DEFAULT_ROUNDING_POLICY,
  related: [],
});

describe('defineCalculator', () => {
  it('congela la definición', () => {
    expect(Object.isFrozen(identity)).toBe(true);
  });

  const base = {
    id: 'valida',
    slug: 'valida',
    version: '1.0.0',
    fields: { x: decimalField({ required: true, unit: 'none', min: '0', max: '1' }) },
    toInput: (fields: { readonly x: Decimal }) => ok(fields),
    compute: (input: { readonly x: Decimal }) => input,
    rounding: DEFAULT_ROUNDING_POLICY,
    related: [] as readonly string[],
  };

  it.each([
    [{ id: 'Mal_Id' }, /id inválido/],
    [{ slug: 'Con Espacios' }, /slug inválido/],
    [{ version: '1.0' }, /SemVer/],
    [{ version: '01.0.0' }, /SemVer/],
    [{ related: ['valida'] }, /consigo misma/],
    [{ related: ['otra', 'otra'] }, /duplicadas/],
    [
      {
        rounding: {
          ...DEFAULT_ROUNDING_POLICY,
          display: {
            ...DEFAULT_ROUNDING_POLICY.display,
            currency: { fractionDigits: -1, mode: 'halfExpand' as const },
          },
        },
      },
      /decimales de presentación/,
    ],
  ])('rechaza %j', (override, message) => {
    expect(() => defineCalculator({ ...base, ...override })).toThrow(message);
  });

  it('rechaza una calculadora sin campos o con campos incoherentes', () => {
    expect(() =>
      defineCalculator({ ...base, fields: {}, toInput: () => ok({}), compute: () => ({}) }),
    ).toThrow(/no define campos/);
    expect(() =>
      defineCalculator({
        ...base,
        fields: { x: decimalField({ required: true, unit: 'none', min: '5', max: '1' }) },
      }),
    ).toThrow(/min/);
  });
});

describe('parseCalculatorInput', () => {
  it('RAW → entrada tipada, con el contexto inyectado', () => {
    const result = parseCalculatorInput(identity, { a: '12,5', b: '' }, ES, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.input.a.equals(Decimal.from('12.5'))).toBe(true);
    expect(result.value.input.b).toBeUndefined();
    expect(result.value.input.today).toBe('2026-09-29');
    expect(result.value.notices).toEqual({});
  });

  it('devuelve TODOS los errores de campo a la vez, en el orden de los campos', () => {
    expect(parseCalculatorInput(identity, { a: '', b: 'x' }, ES, context)).toEqual({
      ok: false,
      error: [
        { field: 'a', code: 'required' },
        { field: 'b', code: 'invalid_characters' },
      ],
    });
  });

  it('aplica las reglas entre campos solo cuando cada campo es válido', () => {
    expect(parseCalculatorInput(identity, { a: '5', b: '7' }, ES, context)).toEqual({
      ok: false,
      error: [{ field: 'b', code: 'prueba-identidad.b_mayor_que_a' }],
    });
  });

  it('recoge los avisos de interpretación por campo', () => {
    const result = parseCalculatorInput(identity, { a: '1.000', b: '' }, ES, context);
    expect(result.ok && result.value.notices).toEqual({ a: ['group_separator_interpreted'] });
  });

  it('trata un campo ausente en RAW como vacío', () => {
    const raw = { a: '1' } as unknown as { a: string; b: string };
    expect(parseCalculatorInput(identity, raw, ES, context).ok).toBe(true);
  });
});

describe('validateCalculatorField', () => {
  it('valida un único campo', () => {
    expect(validateCalculatorField(identity, 'a', '2.000', ES)).toEqual({
      ok: false,
      error: { field: 'a', code: 'above_max', params: { max: Decimal.from('1000') } },
    });
  });

  it('lanza ante un campo inexistente (error de programación)', () => {
    expect(() => validateCalculatorField(identity, 'zzz' as 'a', '1', ES)).toThrow(/desconocido/);
  });
});

describe('runCalculator', () => {
  it('parsea y calcula', () => {
    const result = runCalculator(identity, { a: '3', b: '1' }, ES, context);
    expect(result.ok && result.value.output.a.toString()).toBe('3');
  });

  it('convierte un DecimalError del motor en error de formulario', () => {
    const failing = defineCalculator({
      ...identity,
      id: 'prueba-fallo',
      slug: 'prueba-fallo',
      compute: () => {
        throw new DecimalError('desbordamiento');
      },
    });
    expect(runCalculator(failing, { a: '1', b: '' }, ES, context)).toEqual({
      ok: false,
      error: [{ field: null, code: 'calculation_out_of_range' }],
    });
  });

  it('no oculta errores de programación del motor', () => {
    const buggy = defineCalculator({
      ...identity,
      id: 'prueba-bug',
      slug: 'prueba-bug',
      compute: () => {
        throw new TypeError('bug');
      },
    });
    expect(() => runCalculator(buggy, { a: '1', b: '' }, ES, context)).toThrow(TypeError);
  });
});
