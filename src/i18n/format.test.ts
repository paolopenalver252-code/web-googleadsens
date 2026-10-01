import { describe, expect, it } from 'vitest';

import type { DisplayRounding } from '@/core/calculator/definition';
import { toIsoDate } from '@/core/dates/iso-date';
import { Decimal } from '@/core/math/decimal';

import { formatCurrency, formatIsoDate, formatNumber, formatPercent } from './format';
import { esES } from './locales/es-ES';

// Intl usa un espacio no separable (U+00A0) antes de "€" y "%" en es-ES.
const NBSP = String.fromCharCode(0xa0);
const d = (value: string): Decimal => Decimal.from(value);
const two: DisplayRounding = { fractionDigits: 2, mode: 'halfExpand' };

describe('formatCurrency (es-ES)', () => {
  it('formatea 1.234,56 € con separador de miles también en 4 cifras', () => {
    // Con la opción por defecto de Intl saldría "1234,56 €".
    expect(formatCurrency(d('1234.56'), esES, two)).toBe(`1.234,56${NBSP}€`);
  });

  it('negativos, ceros y céntimos', () => {
    expect(formatCurrency(d('-1234.5'), esES, two)).toBe(`-1.234,50${NBSP}€`);
    expect(formatCurrency(d('0'), esES, two)).toBe(`0,00${NBSP}€`);
    expect(formatCurrency(d('999'), esES, two)).toBe(`999,00${NBSP}€`);
  });

  it('el redondeo lo decide la política, no Intl', () => {
    expect(formatCurrency(d('2.345'), esES, { fractionDigits: 2, mode: 'halfExpand' })).toBe(
      `2,35${NBSP}€`,
    );
    expect(formatCurrency(d('2.345'), esES, { fractionDigits: 2, mode: 'halfEven' })).toBe(
      `2,34${NBSP}€`,
    );
    expect(formatCurrency(d('2.349'), esES, { fractionDigits: 2, mode: 'trunc' })).toBe(
      `2,34${NBSP}€`,
    );
  });

  it('un valor que redondea a cero no muestra "-0,00 €"', () => {
    expect(formatCurrency(d('-0.001'), esES, two)).toBe(`0,00${NBSP}€`);
  });

  it('importes grandes sin pérdida de precisión (no pasan por number)', () => {
    expect(formatCurrency(d('12345678901234567.125'), esES, two)).toBe(
      `12.345.678.901.234.567,13${NBSP}€`,
    );
  });
});

describe('formatPercent (es-ES)', () => {
  it('recibe un ratio y redondea sobre los puntos porcentuales', () => {
    expect(formatPercent(d('0.0525'), esES, two)).toBe(`5,25${NBSP}%`);
    expect(formatPercent(d('0.123456'), esES, two)).toBe(`12,35${NBSP}%`);
    expect(formatPercent(d('1'), esES, { fractionDigits: 0, mode: 'halfExpand' })).toBe(
      `100${NBSP}%`,
    );
    expect(formatPercent(d('-0.005'), esES, { fractionDigits: 1, mode: 'halfExpand' })).toBe(
      `-0,5${NBSP}%`,
    );
  });

  it('porcentajes con miles', () => {
    expect(formatPercent(d('12.5'), esES, { fractionDigits: 0, mode: 'halfExpand' })).toBe(
      `1.250${NBSP}%`,
    );
  });
});

describe('formatNumber (es-ES)', () => {
  it('separador de miles "." y decimal ","', () => {
    expect(formatNumber(d('1234567.891'), esES, two)).toBe('1.234.567,89');
    expect(formatNumber(d('1234'), esES, { fractionDigits: 0, mode: 'halfExpand' })).toBe('1.234');
  });
});

describe('formatIsoDate (es-ES)', () => {
  it('formatea días de calendario sin desfase de zona horaria', () => {
    expect(formatIsoDate(toIsoDate('2026-01-01'), esES)).toBe('1 de enero de 2026');
    expect(formatIsoDate(toIsoDate('2026-12-31'), esES)).toBe('31 de diciembre de 2026');
    expect(formatIsoDate(toIsoDate('2026-09-29'), esES, 'short')).toBe('29/9/26');
  });
});
