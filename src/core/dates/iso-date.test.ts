import { describe, expect, it } from 'vitest';

import { compareIsoDates, isIsoDate, isoDateInTimeZone, isoDateParts, toIsoDate } from './iso-date';

describe('IsoDate', () => {
  it.each(['2026-01-01', '2024-02-29', '2026-12-31', '2000-02-29'])(
    '%s es una fecha real',
    (value) => {
      expect(isIsoDate(value)).toBe(true);
    },
  );

  it.each([
    '2026-02-29',
    '1900-02-29',
    '2026-13-01',
    '2026-04-31',
    '2026-00-10',
    '2026-1-1',
    '26-01-01',
    '2026/01/01',
    '',
  ])('%j no es una fecha ISO válida', (value) => {
    expect(isIsoDate(value)).toBe(false);
    expect(() => toIsoDate(value)).toThrow();
  });

  it('compara días de calendario', () => {
    expect(compareIsoDates(toIsoDate('2026-01-01'), toIsoDate('2026-12-31'))).toBe(-1);
    expect(compareIsoDates(toIsoDate('2027-01-01'), toIsoDate('2026-12-31'))).toBe(1);
    expect(compareIsoDates(toIsoDate('2026-06-15'), toIsoDate('2026-06-15'))).toBe(0);
  });

  it('descompone en año, mes y día', () => {
    expect(isoDateParts(toIsoDate('2026-09-29'))).toEqual({ year: 2026, month: 9, day: 29 });
  });

  it('"hoy" depende de la zona horaria, no de UTC', () => {
    // 31/12/2026 23:30 UTC ya es 1/1/2027 en Madrid (UTC+1 en invierno).
    const instant = new Date(Date.UTC(2026, 11, 31, 23, 30));
    expect(isoDateInTimeZone(instant, 'UTC')).toBe('2026-12-31');
    expect(isoDateInTimeZone(instant, 'Europe/Madrid')).toBe('2027-01-01');
    expect(isoDateInTimeZone(instant, 'Atlantic/Canary')).toBe('2026-12-31');
  });
});
