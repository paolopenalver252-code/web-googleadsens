import { describe, expect, it } from 'vitest';

import { Decimal } from '@/core/math/decimal';

import {
  annuityFactor,
  balanceAfter,
  computeCompoundInterest,
  computeFinalValue,
  periodCount,
} from '../engine';
import type { CompoundInterestOutput } from '../types';
import { d, display, expectClose, makeInput } from './helpers';

function sum(values: readonly Decimal[]): Decimal {
  return values.reduce((acc, value) => acc.plus(value), Decimal.ZERO);
}

/** Coherencia exacta entre la tabla anual y los totales. */
function expectCoherentTable(output: CompoundInterestOutput): void {
  const { years } = output;
  const last = years.at(-1);
  expect(last).toBeDefined();
  if (last === undefined) return;
  expect(last.closingBalance.equals(output.finalValue)).toBe(true);
  expect(last.cumulativeInvested.equals(output.totalInvested)).toBe(true);
  expect(last.cumulativeInterest.equals(output.totalInterest)).toBe(true);
  expect(sum(years.map((row) => row.contributions)).equals(output.totalContributions)).toBe(true);
  expect(years.reduce((acc, row) => acc + row.months, 0)).toBe(output.durationMonths);
  years.forEach((row, index) => {
    expect(row.index).toBe(index + 1);
    const previous = years[index - 1];
    expect(row.openingBalance.equals(previous?.closingBalance ?? output.initialCapital)).toBe(true);
    expect(
      row.closingBalance.equals(row.openingBalance.plus(row.contributions).plus(row.interest)),
    ).toBe(true);
  });
  // La suma de intereses por fila telescopia a totalInterest; puede diferir
  // solo en el último de los 40 dígitos (≪ 1e-20 €).
  expectClose(sum(years.map((row) => row.interest)), output.totalInterest);
}

describe('fórmula auxiliar s(n|i)', () => {
  it('i = 0 ⇒ s = n, sin dividir entre cero', () => {
    expect(annuityFactor(Decimal.ZERO, 12).equals(Decimal.from(12))).toBe(true);
  });

  it('i > 0 ⇒ ((1+i)^n − 1)/i', () => {
    expect(annuityFactor(d('0.03'), 4).equals(d('4.183627'))).toBe(true);
    expect(annuityFactor(d('0.1'), 1).equals(Decimal.ONE)).toBe(true);
  });
});

describe('capital sin aportaciones', () => {
  it('FV = P·(1+i)^n', () => {
    const output = computeCompoundInterest(makeInput({ P: '1000', ratePercent: '10', months: 24 }));
    expect(output.finalValue.equals(d('1210'))).toBe(true);
    expect(output.totalContributions.isZero()).toBe(true);
    expect(output.contributionCount).toBe(0);
    expect(output.contributionPeriodRate).toBeNull();
    expect(output.convention.contributionTiming).toBeNull();
    expectCoherentTable(output);
  });
});

describe('capital 0', () => {
  it('sin aportaciones: FV = 0 e interés 0', () => {
    const output = computeCompoundInterest(makeInput({ P: '0', ratePercent: '5', months: 60 }));
    expect(output.finalValue.isZero()).toBe(true);
    expect(output.totalInterest.isZero()).toBe(true);
  });

  it('aportación sin capital: FV = C·s(n|i)', () => {
    const output = computeCompoundInterest(
      makeInput({ ratePercent: '10', months: 24, C: '100', timing: 'end' }),
    );
    expect(output.finalValue.equals(d('210'))).toBe(true); // 100·1,1 + 100
    expect(output.totalInvested.equals(d('200'))).toBe(true);
  });
});

describe('aportaciones al final e inicio', () => {
  const base = { P: '1000', ratePercent: '10', months: 24, C: '100' } as const;

  it('final: instantes 1…n; la última aportación no genera interés', () => {
    const output = computeCompoundInterest(makeInput({ ...base, timing: 'end' }));
    // 1000·1,1² + 100·1,1 + 100
    expect(output.finalValue.equals(d('1420'))).toBe(true);
    expect(output.contributionCount).toBe(2);
    expect(output.contributionPeriodRate?.equals(d('0.1'))).toBe(true);
    expectCoherentTable(output);
  });

  it('inicio: instantes 0…n−1; todas generan al menos un periodo de interés', () => {
    const output = computeCompoundInterest(makeInput({ ...base, timing: 'start' }));
    // 1000·1,1² + 100·1,1² + 100·1,1
    expect(output.finalValue.equals(d('1441'))).toBe(true);
    expect(output.convention.contributionTiming).toBe('start');
    expectCoherentTable(output);
  });

  it('inicio − final = C·i·s(n|i)', () => {
    const start = computeCompoundInterest(makeInput({ ...base, timing: 'start' })).finalValue;
    const end = computeCompoundInterest(makeInput({ ...base, timing: 'end' })).finalValue;
    expect(
      start.minus(end).equals(
        d('100')
          .times(d('0.1'))
          .times(annuityFactor(d('0.1'), 2)),
      ),
    ).toBe(true);
  });
});

describe('0 %', () => {
  it.each(['start', 'end'] as const)('FV = P + n·C e interés 0 (aportación %s)', (timing) => {
    const output = computeCompoundInterest(
      makeInput({ P: '1000', ratePercent: '0', frequency: 'monthly', months: 12, C: '50', timing }),
    );
    expect(output.finalValue.equals(d('1600'))).toBe(true);
    expect(output.totalInterest.isZero()).toBe(true);
    expect(output.years.every((row) => row.interest.isZero())).toBe(true);
  });

  it('también con tipo efectivo (sin raíces que introduzcan error)', () => {
    const output = computeCompoundInterest(
      makeInput({
        P: '1000',
        ratePercent: '0',
        convention: 'effective',
        frequency: 'monthly',
        months: 12,
        C: '50',
      }),
    );
    expect(output.finalValue.equals(d('1600'))).toBe(true);
  });
});

describe('periodos y tabla anual', () => {
  it('n = M·m/12 y duración mínima de un periodo', () => {
    expect(periodCount({ durationMonths: 3, frequency: 'quarterly' })).toBe(1);
    expect(periodCount({ durationMonths: 1, frequency: 'monthly' })).toBe(1);
    expect(periodCount({ durationMonths: 1200, frequency: 'monthly' })).toBe(1200);
    expect(periodCount({ durationMonths: 36, frequency: 'semiannual' })).toBe(6);
  });

  it('una duración incompatible es un error de programación (la validación la impide)', () => {
    expect(() => periodCount({ durationMonths: 18, frequency: 'annual' })).toThrow(/incompatible/);
    expect(() => periodCount({ durationMonths: 4, frequency: 'quarterly' })).toThrow(
      /incompatible/,
    );
  });

  it('último tramo parcial: 18 meses trimestral → filas de 12 y 6 meses', () => {
    const output = computeCompoundInterest(
      makeInput({
        P: '1000',
        ratePercent: '4',
        frequency: 'quarterly',
        months: 18,
        C: '10',
        timing: 'start',
      }),
    );
    expect(output.years.map((row) => row.months)).toEqual([12, 6]);
    expect(output.periods).toBe(6);
    expectCoherentTable(output);
  });

  it('duración máxima: 1.200 meses mensual → 100 filas y 1.200 periodos', () => {
    const output = computeCompoundInterest(
      makeInput({
        P: '1000',
        ratePercent: '3',
        frequency: 'monthly',
        months: 1200,
        C: '100',
        timing: 'end',
      }),
    );
    expect(output.years).toHaveLength(100);
    expect(output.periods).toBe(1200);
    expect(output.contributionCount).toBe(1200);
    expectCoherentTable(output);
  });

  it('el saldo intermedio coincide con la forma cerrada', () => {
    const input = makeInput({ P: '1000', ratePercent: '10', months: 36, C: '100', timing: 'end' });
    const output = computeCompoundInterest(input);
    const rate = d('0.1');
    expect(
      output.years[1]?.closingBalance.equals(balanceAfter(2, d('1000'), rate, input.contribution)),
    ).toBe(true);
  });
});

describe('salidas y coherencia', () => {
  it('finalValue = totalInvested + totalInterest y la presentación suma exacta', () => {
    const output = computeCompoundInterest(
      makeInput({
        P: '500',
        ratePercent: '5',
        convention: 'effective',
        frequency: 'monthly',
        months: 12,
        C: '100',
        timing: 'start',
      }),
    );
    expect(output.totalInvested.plus(output.totalInterest).equals(output.finalValue)).toBe(true);
    expect(
      d(display(output.totalInvested))
        .plus(d(display(output.totalInterest)))
        .equals(d(display(output.finalValue))),
    ).toBe(true);
  });

  it('computeFinalValue coincide exactamente con el cálculo completo', () => {
    const input = makeInput({
      P: '2000',
      ratePercent: '4',
      frequency: 'semiannual',
      months: 36,
      C: '500',
      timing: 'start',
    });
    expect(computeFinalValue(input).equals(computeCompoundInterest(input).finalValue)).toBe(true);
  });

  it('no redondea: conserva la precisión completa en valores y tipos', () => {
    const output = computeCompoundInterest(
      makeInput({ P: '5000', ratePercent: '3.8', frequency: 'monthly', months: 60 }),
    );
    expect(output.finalValue.decimalPlaces()).toBeGreaterThan(20);
    expect(output.periodRate.decimalPlaces()).toBeGreaterThan(20);
    expect(output.effectiveAnnualRate.decimalPlaces()).toBeGreaterThan(20);
  });

  it('informa de la convención y del tipo efectivo anual equivalente', () => {
    const output = computeCompoundInterest(
      makeInput({ P: '1', ratePercent: '4', frequency: 'semiannual', months: 12 }),
    );
    expect(output.convention).toEqual({
      rateConvention: 'nominal',
      frequency: 'semiannual',
      contributionTiming: null,
    });
    expect(output.effectiveAnnualRate.equals(d('0.0404'))).toBe(true);
    expect(output.periodRate.equals(d('0.02'))).toBe(true);
  });
});
