import { describe, expect, it } from 'vitest';

import { Decimal } from '@/core/math/decimal';

import { FREQUENCIES } from '../constants';
import { annualRateFromPeriodRate, effectiveAnnualRate, periodRate } from '../rates';
import { d, expectClose } from './helpers';

const TIGHT = `0.${'0'.repeat(34)}1`; // 1e-35: precisión del adaptador en tipos ~1

describe('TIN → tipo de periodo: i = r/m', () => {
  it.each([
    ['annual', '0.08', '0.08'],
    ['semiannual', '0.04', '0.02'],
    ['quarterly', '0.06', '0.015'],
    ['monthly', '0.03', '0.0025'],
  ] as const)('%s: %s → %s (exacto)', (frequency, r, expected) => {
    expect(periodRate(d(r), 'nominal', frequency).equals(d(expected))).toBe(true);
  });

  it('una división no exacta conserva la precisión completa (sin redondear i)', () => {
    const i = periodRate(d('0.038'), 'nominal', 'monthly');
    expectClose(i.times(Decimal.from(12)), d('0.038'), TIGHT);
    expect(i.decimalPlaces()).toBeGreaterThan(30);
  });
});

describe('TIN → tipo efectivo anual equivalente: X = (1 + r/m)^m − 1', () => {
  it.each([
    ['annual', '0.08', '0.08'],
    ['semiannual', '0.04', '0.0404'],
    ['quarterly', '0.06', '0.061363550625'],
  ] as const)('%s: %s → %s (exacto)', (frequency, r, expected) => {
    expect(effectiveAnnualRate(d(r), 'nominal', frequency).equals(d(expected))).toBe(true);
  });

  it('mensual: 6 % → 1,005^12 − 1 (valor independiente, exacto)', () => {
    // 1005^12 calculado con BigInt: 1,005^12 = 1,061677811864499568789707617431640625.
    expect(
      effectiveAnnualRate(d('0.06'), 'nominal', 'monthly').equals(
        d('0.061677811864499568789707617431640625'),
      ),
    ).toBe(true);
  });

  it('con m = 1 el TIN es el tipo efectivo anual (X = r)', () => {
    expect(effectiveAnnualRate(d('0.0375'), 'nominal', 'annual').equals(d('0.0375'))).toBe(true);
  });
});

describe('tipo efectivo anual → tipo de periodo: i = (1+X)^(1/m) − 1', () => {
  it('anual: i = X exacto (sin potencia fraccionaria)', () => {
    expect(periodRate(d('0.05'), 'effective', 'annual').equals(d('0.05'))).toBe(true);
  });

  it('semestral: 6,09 % → 3 % (raíz exacta)', () => {
    expectClose(periodRate(d('0.0609'), 'effective', 'semiannual'), d('0.03'), TIGHT);
  });

  it('trimestral: 4 % → 1,04^(1/4) − 1', () => {
    const i = periodRate(d('0.04'), 'effective', 'quarterly');
    expectClose(i.plus(Decimal.ONE).pow(Decimal.from(4)).minus(Decimal.ONE), d('0.04'), TIGHT);
  });

  it('mensual: 5 % → 0,004074123784… (valor independiente, 12 decimales)', () => {
    expect(periodRate(d('0.05'), 'effective', 'monthly').toFixed(12, 'halfExpand')).toBe(
      '0.004074123784',
    );
  });

  it('NUNCA divide X entre m: el tipo mensual equivalente al 12 % es menor que 1 %', () => {
    const i = periodRate(d('0.12'), 'effective', 'monthly');
    expect(i.lessThan(d('0.01'))).toBe(true);
    expect(i.equals(d('0.01'))).toBe(false);
  });

  it('el tipo efectivo introducido se devuelve tal cual como equivalente anual', () => {
    for (const frequency of FREQUENCIES) {
      expect(effectiveAnnualRate(d('0.05'), 'effective', frequency).equals(d('0.05'))).toBe(true);
    }
  });
});

describe('0 %', () => {
  it.each(FREQUENCIES)(
    '%s: el tipo de periodo es exactamente 0 con ambas convenciones',
    (frequency) => {
      expect(periodRate(Decimal.ZERO, 'effective', frequency).isZero()).toBe(true);
      expect(periodRate(Decimal.ZERO, 'nominal', frequency).isZero()).toBe(true);
      expect(effectiveAnnualRate(Decimal.ZERO, 'nominal', frequency).isZero()).toBe(true);
    },
  );
});

describe('annualRateFromPeriodRate', () => {
  it('X = (1+i)^m − 1 con potencia entera', () => {
    expect(annualRateFromPeriodRate(d('0.02'), 'semiannual').equals(d('0.0404'))).toBe(true);
    expect(annualRateFromPeriodRate(d('0.015'), 'quarterly').equals(d('0.061363550625'))).toBe(
      true,
    );
  });
});
