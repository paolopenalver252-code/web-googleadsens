import { describe, expect, it } from 'vitest';

import { Decimal } from '@/core/math/decimal';
import { decimalField } from '@/core/validation/field';

import { fieldErrorMessage, formatFieldValue, noticeMessage } from './field-messages';
import { esES } from './locales/es-ES';

const NBSP = String.fromCharCode(0xa0);
const d = (value: string): Decimal => Decimal.from(value);

describe('formatFieldValue', () => {
  it('formatea el valor exacto según la unidad, sin redondear', () => {
    expect(formatFieldValue(d('1000000'), 'currency', esES)).toBe(`1.000.000${NBSP}€`);
    expect(formatFieldValue(d('0.5'), 'currency', esES)).toBe(`0,5${NBSP}€`);
    expect(formatFieldValue(d('5.25'), 'percent', esES)).toBe(`5,25${NBSP}%`);
    expect(formatFieldValue(d('30'), 'years', esES)).toBe('30 años');
    expect(formatFieldValue(d('12'), 'months', esES)).toBe('12 meses');
    expect(formatFieldValue(d('1234.5'), 'none', esES)).toBe('1.234,5');
  });
});

describe('fieldErrorMessage', () => {
  const amount = decimalField({ required: true, unit: 'currency', min: '0', max: '1000000' });
  const rate = decimalField({ required: true, unit: 'percent', min: '0', max: '100' });

  it('formatea los límites con la unidad del campo', () => {
    expect(
      fieldErrorMessage(
        { field: 'a', code: 'above_max', params: { max: d('1000000') } },
        amount,
        esES,
      ),
    ).toBe(`El valor máximo es 1.000.000${NBSP}€.`);
    expect(
      fieldErrorMessage({ field: 'r', code: 'below_min', params: { min: d('0') } }, rate, esES),
    ).toBe(`El valor mínimo es 0${NBSP}%.`);
    expect(
      fieldErrorMessage(
        { field: 'a', code: 'too_many_decimals', params: { max: 2 } },
        amount,
        esES,
      ),
    ).toBe('Introduce como máximo 2 decimales.');
  });

  it('usa el mensaje propio de la calculadora para códigos con espacio de nombres', () => {
    const custom = { 'calc.mi_regla': () => 'Mensaje propio.' };
    expect(fieldErrorMessage({ field: 'a', code: 'calc.mi_regla' }, amount, esES, custom)).toBe(
      'Mensaje propio.',
    );
  });

  it('un código sin mensaje recibe un texto genérico (nunca vacío ni el código interno)', () => {
    expect(fieldErrorMessage({ field: 'a', code: 'calc.sin_mensaje' }, amount, esES)).toBe(
      'El valor no es válido.',
    );
  });

  it('errores de formulario (sin campo)', () => {
    expect(
      fieldErrorMessage({ field: null, code: 'calculation_out_of_range' }, undefined, esES),
    ).toMatch(/fuera del rango/);
  });
});

describe('noticeMessage', () => {
  it('explica cómo se ha interpretado una entrada ambigua', () => {
    const amount = decimalField({ required: true, unit: 'currency', min: '0', max: '1000000' });
    expect(noticeMessage('group_separator_interpreted', d('1234'), amount, esES)).toBe(
      `Interpretado como 1.234${NBSP}€ (el punto separa los miles).`,
    );
  });
});
