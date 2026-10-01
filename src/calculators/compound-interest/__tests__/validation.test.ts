/**
 * Validación de la definición: RAW (textos del formulario) → entrada tipada.
 */
import { describe, expect, it } from 'vitest';

import {
  parseCalculatorInput,
  runCalculator,
  type RawFieldValues,
} from '@/core/calculator/definition';
import { toIsoDate } from '@/core/dates/iso-date';
import { fieldErrorMessage } from '@/i18n/field-messages';
import { esES } from '@/i18n/locales/es-ES';

import { compoundInterest, type compoundInterestFields } from '../definition';
import { d } from './helpers';

type Raw = RawFieldValues<typeof compoundInterestFields>;

const context = { today: toIsoDate('2026-09-30') };

const VALID: Raw = {
  initialCapital: '1.000',
  annualRate: '5',
  rateConvention: 'effective',
  frequency: 'annual',
  durationValue: '3',
  durationUnit: 'years',
  contributionAmount: '',
  contributionTiming: '',
};

const parse = (overrides: Partial<Raw> = {}) =>
  parseCalculatorInput(compoundInterest, { ...VALID, ...overrides }, esES.numbers, context);

const errorsOf = (overrides: Partial<Raw>) => {
  const result = parse(overrides);
  return result.ok ? [] : result.error.map((error) => ({ field: error.field, code: error.code }));
};

describe('entrada válida', () => {
  it('convierte a la entrada del motor (puntos % → ratio, años → meses)', () => {
    const result = parse();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { input } = result.value;
    expect(input.initialCapital.equals(d('1000'))).toBe(true);
    expect(input.annualRate.equals(d('0.05'))).toBe(true);
    expect(input.rateConvention).toBe('effective');
    expect(input.frequency).toBe('annual');
    expect(input.durationMonths).toBe(36);
    expect(input.contribution).toBeNull();
  });

  it('calcula F1 de extremo a extremo', () => {
    const result = runCalculator(compoundInterest, VALID, esES.numbers, context);
    expect(result.ok && result.value.output.finalValue.equals(d('1157.625'))).toBe(true);
  });

  it('acepta el formato español con miles y coma decimal', () => {
    const result = parse({ initialCapital: '1.234,56', annualRate: '3,8', frequency: 'monthly' });
    expect(result.ok && result.value.input.initialCapital.equals(d('1234.56'))).toBe(true);
    expect(result.ok && result.value.input.annualRate.equals(d('0.038'))).toBe(true);
  });
});

describe('campos vacíos', () => {
  it('todos los obligatorios vacíos → un error "required" por campo, a la vez', () => {
    expect(
      errorsOf({
        initialCapital: '',
        annualRate: '',
        rateConvention: '',
        frequency: '',
        durationValue: '',
        durationUnit: '',
      }),
    ).toEqual([
      { field: 'initialCapital', code: 'required' },
      { field: 'annualRate', code: 'required' },
      { field: 'rateConvention', code: 'required' },
      { field: 'frequency', code: 'required' },
      { field: 'durationValue', code: 'required' },
      { field: 'durationUnit', code: 'required' },
    ]);
  });

  it('aportación vacía o 0 → sin aportaciones; el momento no es obligatorio', () => {
    for (const amount of ['', '0', '0,00']) {
      const result = parse({ contributionAmount: amount });
      expect(result.ok && result.value.input.contribution).toBeNull();
    }
  });

  it('aportación > 0 sin momento → timing_required', () => {
    expect(errorsOf({ contributionAmount: '100' })).toEqual([
      { field: 'contributionTiming', code: 'compound-interest.timing_required' },
    ]);
  });

  it('aportación > 0 con momento → aportación en la entrada', () => {
    const result = parse({ contributionAmount: '100', contributionTiming: 'start' });
    expect(result.ok && result.value.input.contribution?.timing).toBe('start');
    expect(result.ok && result.value.input.contribution?.amount.equals(d('100'))).toBe(true);
  });
});

describe('decimales excesivos y valores negativos', () => {
  it.each([
    ['initialCapital', '1000,123'],
    ['contributionAmount', '10,001'],
    ['annualRate', '5,12345'],
  ] as const)('%s = %j → too_many_decimals', (field, value) => {
    expect(errorsOf({ [field]: value, contributionTiming: 'end' })).toEqual([
      { field, code: 'too_many_decimals' },
    ]);
  });

  it('4 decimales en el tipo y 2 en importes son válidos', () => {
    expect(parse({ annualRate: '5,1234', initialCapital: '1000,12' }).ok).toBe(true);
  });

  it.each([
    ['initialCapital', '-1'],
    ['contributionAmount', '-10'],
    ['annualRate', '-0,5'],
    ['durationValue', '-3'],
  ] as const)('%s = %j → below_min (sin negativos en v1)', (field, value) => {
    expect(errorsOf({ [field]: value, contributionTiming: 'end' })).toEqual([
      { field, code: 'below_min' },
    ]);
  });

  it('límites superiores de los campos', () => {
    expect(errorsOf({ initialCapital: '1.000.000.000,01' })).toEqual([
      { field: 'initialCapital', code: 'above_max' },
    ]);
    expect(errorsOf({ contributionAmount: '100.000.000,01', contributionTiming: 'end' })).toEqual([
      { field: 'contributionAmount', code: 'above_max' },
    ]);
    expect(errorsOf({ annualRate: '100,0001' })).toEqual([
      { field: 'annualRate', code: 'above_max' },
    ]);
    expect(parse({ annualRate: '100' }).ok).toBe(true);
  });

  it('caracteres no numéricos y opciones inexistentes', () => {
    expect(errorsOf({ initialCapital: 'mil' })).toEqual([
      { field: 'initialCapital', code: 'invalid_characters' },
    ]);
    expect(errorsOf({ frequency: 'weekly' })).toEqual([
      { field: 'frequency', code: 'invalid_option' },
    ]);
    expect(errorsOf({ rateConvention: 'tae' })).toEqual([
      { field: 'rateConvention', code: 'invalid_option' },
    ]);
  });
});

describe('duración', () => {
  it.each([
    ['annual', '12'],
    ['semiannual', '6'],
    ['quarterly', '3'],
    ['monthly', '1'],
  ] as const)('duración mínima compatible: %s con %s meses', (frequency, months) => {
    const result = parse({ frequency, durationValue: months, durationUnit: 'months' });
    expect(result.ok).toBe(true);
  });

  it.each([
    ['annual', '18', 12],
    ['semiannual', '9', 6],
    ['quarterly', '4', 3],
  ] as const)(
    'duración incompatible: %s con %s meses → múltiplo de %i',
    (frequency, months, multiple) => {
      const result = parse({ frequency, durationValue: months, durationUnit: 'months' });
      expect(result.ok ? [] : result.error).toEqual([
        {
          field: 'durationValue',
          code: 'compound-interest.duration_incompatible',
          params: { multiple },
        },
      ]);
    },
  );

  it('una duración en años siempre es compatible con cualquier frecuencia', () => {
    for (const frequency of ['annual', 'semiannual', 'quarterly', 'monthly'] as const) {
      expect(parse({ frequency, durationValue: '7', durationUnit: 'years' }).ok).toBe(true);
    }
  });

  it('duración máxima: 1.200 meses o 100 años', () => {
    expect(parse({ durationValue: '1200', durationUnit: 'months' }).ok).toBe(true);
    expect(parse({ durationValue: '100', durationUnit: 'years' }).ok).toBe(true);
  });

  it('por encima del máximo', () => {
    expect(errorsOf({ durationValue: '1201', durationUnit: 'months' })).toEqual([
      { field: 'durationValue', code: 'above_max' },
    ]);
    expect(errorsOf({ durationValue: '101', durationUnit: 'years' })).toEqual([
      { field: 'durationValue', code: 'compound-interest.duration_too_long' },
    ]);
  });

  it('duración 0 o no entera', () => {
    expect(errorsOf({ durationValue: '0' })).toEqual([
      { field: 'durationValue', code: 'below_min' },
    ]);
    expect(errorsOf({ durationValue: '1,5' })).toEqual([
      { field: 'durationValue', code: 'not_integer' },
    ]);
  });
});

describe('resultado demasiado grande (límite operativo 10^15 €)', () => {
  it('capital máximo al 100 % durante 100 años → result_too_large', () => {
    const result = runCalculator(
      compoundInterest,
      { ...VALID, initialCapital: '1.000.000.000', annualRate: '100', durationValue: '100' },
      esES.numbers,
      context,
    );
    expect(
      result.ok ? [] : result.error.map((error) => ({ field: error.field, code: error.code })),
    ).toEqual([{ field: null, code: 'compound-interest.result_too_large' }]);
  });

  it('el máximo de capital al 0 % sí es válido', () => {
    expect(
      parse({ initialCapital: '1.000.000.000', annualRate: '0', durationValue: '100' }).ok,
    ).toBe(true);
  });
});

describe('mensajes en español de los errores propios', () => {
  it('se resuelven desde el locale', () => {
    const spec = compoundInterest.fields.durationValue;
    expect(
      fieldErrorMessage(
        {
          field: 'durationValue',
          code: 'compound-interest.duration_incompatible',
          params: { multiple: 12 },
        },
        spec,
        esES,
      ),
    ).toBe('Con la frecuencia elegida, la duración debe ser un múltiplo de 12 meses.');
    expect(
      fieldErrorMessage(
        {
          field: null,
          code: 'compound-interest.result_too_large',
          params: { max: d('1000000000000000') },
        },
        undefined,
        esES,
      ),
    ).toBe(
      'El valor final supera el límite de 1.000.000.000.000.000 € que admite esta calculadora.',
    );
    expect(
      fieldErrorMessage(
        { field: 'frequency', code: 'invalid_option' },
        compoundInterest.fields.frequency,
        esES,
      ),
    ).toBe('Selecciona una de las opciones disponibles.');
  });
});
