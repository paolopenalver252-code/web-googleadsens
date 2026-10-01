import { describe, expect, it } from 'vitest';

import { choiceField } from '@/core/validation/field';

import { fieldErrorMessage } from './field-messages';
import { esES } from './locales/es-ES';

describe('mensajes de errores propios de calculadora', () => {
  it('se resuelven desde el locale (calculatorErrors) con parámetros propios', () => {
    expect(
      fieldErrorMessage(
        {
          field: 'durationValue',
          code: 'compound-interest.duration_too_long',
          params: { maxMonths: 1200 },
        },
        undefined,
        esES,
      ),
    ).toBe('La duración máxima es de 1200 meses.');
  });

  it('los mensajes pasados por la calculadora tienen prioridad sobre los del locale', () => {
    const custom = { 'compound-interest.timing_required': () => 'Texto propio.' };
    expect(
      fieldErrorMessage(
        { field: 'contributionTiming', code: 'compound-interest.timing_required' },
        undefined,
        esES,
        custom,
      ),
    ).toBe('Texto propio.');
  });

  it('un campo de opción recibe el mensaje común de opción no válida', () => {
    const spec = choiceField({ required: true, options: ['a', 'b'] });
    expect(fieldErrorMessage({ field: 'x', code: 'invalid_option' }, spec, esES)).toBe(
      'Selecciona una de las opciones disponibles.',
    );
    expect(fieldErrorMessage({ field: 'x', code: 'required' }, spec, esES)).toBe(
      'Este campo es obligatorio.',
    );
  });

  it('ningún mensaje de calculadora del locale queda vacío', () => {
    for (const message of Object.values(esES.messages.calculatorErrors)) {
      expect(message({ multiple: '3', maxMonths: '1200', max: '1' }).trim()).not.toBe('');
    }
  });
});
