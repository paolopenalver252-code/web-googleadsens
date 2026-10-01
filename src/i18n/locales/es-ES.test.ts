import { describe, expect, it } from 'vitest';

import { esES } from './es-ES';

describe('locale es-ES', () => {
  it('los símbolos declarados coinciden con los que produce Intl', () => {
    const parts = new Intl.NumberFormat(esES.tag, { useGrouping: 'always' }).formatToParts(1234.5);
    expect(parts.find((part) => part.type === 'group')?.value).toBe(esES.numbers.group);
    expect(parts.find((part) => part.type === 'decimal')?.value).toBe(esES.numbers.decimal);

    const currency = new Intl.NumberFormat(esES.tag, {
      style: 'currency',
      currency: esES.currency,
    }).formatToParts(1);
    expect(currency.find((part) => part.type === 'currency')?.value).toBe(
      esES.numbers.currencySymbol,
    );

    const percent = new Intl.NumberFormat(esES.tag, { style: 'percent' }).formatToParts(0.1);
    expect(percent.find((part) => part.type === 'percentSign')?.value).toBe(
      esES.numbers.percentSign,
    );
  });

  it('la zona horaria es un identificador IANA válido', () => {
    expect(() => new Intl.DateTimeFormat(esES.tag, { timeZone: esES.timeZone })).not.toThrow();
  });

  it('los mensajes con plural distinguen singular y plural', () => {
    expect(esES.messages.ui.errorSummaryTitle(1)).toBe('Hay 1 error en el formulario');
    expect(esES.messages.ui.errorSummaryTitle(3)).toBe('Hay 3 errores en el formulario');
    expect(esES.messages.fieldErrors.too_many_decimals({ max: '1' })).toBe(
      'Introduce como máximo 1 decimal.',
    );
    expect(esES.messages.fieldErrors.too_many_decimals({ max: '2' })).toBe(
      'Introduce como máximo 2 decimales.',
    );
  });

  it('ningún mensaje queda vacío', () => {
    const { fieldErrors, notices, ui } = esES.messages;
    for (const message of Object.values(fieldErrors))
      expect(message({ min: '0', max: '1' }).trim()).not.toBe('');
    for (const message of Object.values(notices)) expect(message('1.234').trim()).not.toBe('');
    for (const value of Object.values(ui)) {
      if (typeof value === 'string') expect(value.trim()).not.toBe('');
    }
  });
});
