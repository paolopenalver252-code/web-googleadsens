import { describe, expect, it } from 'vitest';

import { assertValidChoiceSpec, choiceField, validateChoiceField } from './field';

const frequency = choiceField({ required: true, options: ['annual', 'monthly'] as const });
const optionalTiming = choiceField({ required: false, options: ['start', 'end'] as const });

describe('validateChoiceField', () => {
  it('acepta exactamente una de las opciones', () => {
    expect(validateChoiceField('frequency', 'monthly', frequency)).toEqual({
      ok: true,
      value: { value: 'monthly', notices: [] },
    });
  });

  it('vacío: "required" si es obligatorio; undefined si es opcional', () => {
    expect(validateChoiceField('frequency', '', frequency)).toEqual({
      ok: false,
      error: { field: 'frequency', code: 'required' },
    });
    expect(validateChoiceField('timing', '', optionalTiming)).toEqual({
      ok: true,
      value: { value: undefined, notices: [] },
    });
  });

  it.each(['weekly', 'Monthly', ' monthly', 'monthly ', 'annual,monthly'])(
    'rechaza %j (opción no permitida, sin normalizar)',
    (raw) => {
      expect(validateChoiceField('frequency', raw, frequency)).toEqual({
        ok: false,
        error: { field: 'frequency', code: 'invalid_option' },
      });
    },
  );
});

describe('choiceField / assertValidChoiceSpec', () => {
  it('construye la especificación', () => {
    expect(frequency).toEqual({ kind: 'choice', required: true, options: ['annual', 'monthly'] });
  });

  it('acepta especificaciones coherentes', () => {
    expect(() => {
      assertValidChoiceSpec('frequency', frequency);
    }).not.toThrow();
  });

  it.each([
    [['solo'], /al menos dos/],
    [['a', 'a'], /duplicadas/],
    [['Anual', 'mensual'], /inválido/],
    [['con espacio', 'b'], /inválido/],
  ])('rechaza %j', (options, message) => {
    expect(() => {
      assertValidChoiceSpec('x', choiceField({ required: true, options }));
    }).toThrow(message);
  });
});
