/**
 * Presentación de la tabla anual y del gráfico. Los importes esperados son
 * cálculos a mano o fixtures independientes (external-examples.ts); del motor
 * solo se comprueba que tabla y gráfico CONSUMEN su salida sin recalcular.
 */
import { describe, expect, it } from 'vitest';

import { Decimal } from '@/core/math/decimal';
import { esES } from '@/i18n/locales/es-ES';

import { compoundInterest } from '../definition';
import { computeCompoundInterest } from '../engine';
import { buildGrowthChart, xAxisTicks, yAxisTicks } from '../ui/chart-data';
import {
  formatAxisAmount,
  formatCompoundInterestResult,
  formatCompoundInterestSchedule,
  formatDuration,
} from '../ui/format-result';
import { COMPOUND_INTEREST_FIXTURES } from './fixtures/external-examples';
import { fixtureInput, makeInput } from './helpers';

const NBSP = String.fromCharCode(0xa0);
const euros = (text: string) => `${text}${NBSP}€`;
const { rounding } = compoundInterest;

const scheduleOf = (output: ReturnType<typeof computeCompoundInterest>) =>
  formatCompoundInterestSchedule(output, esES, rounding);

describe('formatCompoundInterestSchedule', () => {
  it('F1 (1.000 € al 5 % efectivo, 3 años): intereses 50,00 / 52,50 / 55,13 y saldo final 1.157,63 €', () => {
    const output = computeCompoundInterest(
      makeInput({ P: '1000', ratePercent: '5', convention: 'effective', months: 36 }),
    );
    expect(scheduleOf(output)).toEqual([
      {
        period: 'Año 1',
        interest: euros('50,00'),
        cumulativeInvested: euros('1.000,00'),
        cumulativeInterest: euros('50,00'),
        closingBalance: euros('1.050,00'),
      },
      {
        period: 'Año 2',
        interest: euros('52,50'),
        cumulativeInvested: euros('1.000,00'),
        cumulativeInterest: euros('102,50'),
        closingBalance: euros('1.102,50'),
      },
      {
        // 55,125 y 157,625 son puntos medios exactos: halfExpand → 55,13 y 157,63.
        period: 'Año 3',
        interest: euros('55,13'),
        cumulativeInvested: euros('1.000,00'),
        cumulativeInterest: euros('157,63'),
        closingBalance: euros('1.157,63'),
      },
    ]);
  });

  it('una fila por fila del motor y la última coincide con el valor final (todos los fixtures)', () => {
    for (const fixture of COMPOUND_INTEREST_FIXTURES) {
      const output = computeCompoundInterest(fixtureInput(fixture));
      const rows = scheduleOf(output);
      const result = formatCompoundInterestResult(output, esES, rounding);
      expect(rows).toHaveLength(output.years.length);
      expect(rows.at(-1)?.closingBalance, fixture.id).toBe(result.finalValue);
      expect(rows.at(-1)?.cumulativeInvested, fixture.id).toBe(result.totalInvested);
      expect(rows.at(-1)?.cumulativeInterest, fixture.id).toBe(result.totalInterest);
    }
  });

  it('un tramo de menos de un año se nombra por sus meses, sin inventar años', () => {
    const six = computeCompoundInterest(makeInput({ P: '100', frequency: 'monthly', months: 6 }));
    expect(scheduleOf(six).map((row) => row.period)).toEqual(['Meses 1–6']);
    const one = computeCompoundInterest(makeInput({ P: '100', frequency: 'monthly', months: 1 }));
    expect(scheduleOf(one).map((row) => row.period)).toEqual(['Mes 1']);
    const thirty = computeCompoundInterest(
      makeInput({ P: '100', frequency: 'semiannual', months: 30 }),
    );
    expect(scheduleOf(thirty).map((row) => row.period)).toEqual(['Año 1', 'Año 2', 'Meses 25–30']);
  });
});

describe('ejemplo «con aportaciones periódicas» de la página', () => {
  /*
   * Cálculo a mano (no con el motor): i = 4 % / 2 = 0,02; n = 6.
   *   2.000 · 1,02^6 = 2.252,324838528
   *   s = (1,02^6 − 1) / 0,02 = 6,3081209632 → 500 · s = 3.154,0604816
   *   Final del periodo:  2.252,324838528 + 3.154,0604816        = 5.406,385320128 → 5.406,39 €
   *   Inicio del periodo: 2.252,324838528 + 3.154,0604816 · 1,02 = 5.469,46652976  → 5.469,47 € (F10)
   *   Tipo efectivo: 1,02^2 − 1 = 4,04 %
   */
  const example = (timing: 'start' | 'end') =>
    formatCompoundInterestResult(
      computeCompoundInterest(
        makeInput({
          P: '2000',
          ratePercent: '4',
          convention: 'nominal',
          frequency: 'semiannual',
          months: 36,
          C: '500',
          timing,
        }),
      ),
      esES,
      rounding,
    );

  it('al inicio: 5.469,47 € (5.000,00 € aportados, 469,47 € de intereses)', () => {
    expect(example('start')).toMatchObject({
      finalValue: euros('5.469,47'),
      totalInvested: euros('5.000,00'),
      totalInterest: euros('469,47'),
      effectiveAnnualRate: `4,04${NBSP}%`,
    });
  });

  it('al final: 5.406,39 €', () => {
    expect(example('end')).toMatchObject({
      finalValue: euros('5.406,39'),
      totalInvested: euros('5.000,00'),
      effectiveAnnualRate: `4,04${NBSP}%`,
    });
  });
});

describe('formatDuration', () => {
  it.each([
    [1, '1 mes'],
    [6, '6 meses'],
    [12, '1 año'],
    [36, '3 años'],
    [13, '1 año y 1 mes'],
    [30, '2 años y 6 meses'],
    [1200, '100 años'],
  ])('%i meses → «%s»', (months, text) => {
    expect(formatDuration(months)).toBe(text);
  });
});

describe('yAxisTicks', () => {
  const values = (max: string) =>
    yAxisTicks(Decimal.from(max)).ticks.map((tick) => tick.toString());

  it('marcas 1, 2 o 5 × 10^k que cubren el máximo', () => {
    expect(values('1157.625')).toEqual(['0', '500', '1000', '1500']);
    expect(values('5469.47')).toEqual(['0', '2000', '4000', '6000']);
    expect(values('100')).toEqual(['0', '50', '100']);
    // 24 / 4 = 6 → el paso sube a la siguiente potencia de 10.
    expect(values('24')).toEqual(['0', '10', '20', '30']);
    // 400 / 4 = 100 exacto: el paso es la propia potencia de 10.
    expect(values('400')).toEqual(['0', '100', '200', '300', '400']);
    expect(values('1000000000000000')).toEqual(['0', '500000000000000', '1000000000000000']);
  });

  it('importes pequeños: paso mínimo de 1 céntimo y decimales en la etiqueta', () => {
    const small = yAxisTicks(Decimal.from('0.5'));
    expect(small.ticks.map((tick) => tick.toString())).toEqual(['0', '0.2', '0.4', '0.6']);
    expect(small.fractionDigits).toBe(1);
    expect(formatAxisAmount(Decimal.from('0.2'), esES, small.fractionDigits)).toBe(euros('0,2'));
    const cent = yAxisTicks(Decimal.from('0.01'));
    expect(cent.ticks.map((tick) => tick.toString())).toEqual(['0', '0.01']);
    expect(cent.fractionDigits).toBe(2);
  });

  it('saldo 0: una sola marca y sin división entre cero', () => {
    const zero = yAxisTicks(Decimal.ZERO);
    expect(zero.ticks.map((tick) => tick.toString())).toEqual(['0']);
    expect(zero.top.isZero()).toBe(true);
  });
});

describe('xAxisTicks', () => {
  it('menos de un año: marcas en meses', () => {
    expect(xAxisTicks(4).map((tick) => tick.label)).toEqual(['0', '1', '2', '3', '4']);
    expect(xAxisTicks(9).map((tick) => tick.label)).toEqual(['0', '2', '4', '6', '8']);
  });

  it('un año o más: marcas en años enteros, como mucho 6', () => {
    expect(xAxisTicks(36)).toEqual([
      { value: 0, label: '0' },
      { value: 12, label: '1' },
      { value: 24, label: '2' },
      { value: 36, label: '3' },
    ]);
    expect(xAxisTicks(30).map((tick) => tick.label)).toEqual(['0', '1', '2']);
    expect(xAxisTicks(1200).map((tick) => tick.label)).toEqual([
      '0',
      '20',
      '40',
      '60',
      '80',
      '100',
    ]);
    expect(xAxisTicks(240).map((tick) => tick.label)).toEqual(['0', '5', '10', '15', '20']);
  });
});

describe('buildGrowthChart', () => {
  it('un punto inicial más un punto por fila del motor; el último es el valor final', () => {
    const fixture = COMPOUND_INTEREST_FIXTURES.find((candidate) => candidate.id === 'F10');
    if (fixture === undefined) throw new Error('Falta F10');
    const output = computeCompoundInterest(fixtureInput(fixture));
    const schedule = scheduleOf(output);
    const chart = buildGrowthChart(output, schedule, esES, rounding);

    expect(chart.points).toHaveLength(output.years.length + 1);
    expect(chart.points.map((point) => point.month)).toEqual([0, 12, 24, 36]);
    expect(chart.points[0]).toMatchObject({ invested: 2000, balance: 2000 });
    expect(chart.points.at(-1)?.balance).toBe(output.finalValue.toNumberLossy());
    expect(chart.points.at(-1)?.invested).toBe(5000);
    expect(chart.points.at(-1)?.description).toBe(
      `Año 3: saldo ${euros('5.469,47')}; capital aportado ${euros('5.000,00')}; intereses acumulados ${euros('469,47')}.`,
    );
    expect(chart.points[0]?.description).toBe(
      `Inicio: saldo ${euros('2.000,00')}; capital aportado ${euros('2.000,00')}; intereses acumulados ${euros('0,00')}.`,
    );
    expect(chart.unit).toBe('years');
    expect(chart.yMax).toBe(6000);
    expect(chart.yTicks.map((tick) => tick.label)).toEqual([
      euros('0'),
      euros('2.000'),
      euros('4.000'),
      euros('6.000'),
    ]);
  });

  it('saldo 0: eje vertical con tope 1 (sin división entre cero) y unidad en meses', () => {
    const output = computeCompoundInterest(makeInput({ P: '0', frequency: 'monthly', months: 3 }));
    const chart = buildGrowthChart(output, scheduleOf(output), esES, rounding);
    expect(chart.yMax).toBe(1);
    expect(chart.unit).toBe('months');
  });

  it('rechaza una tabla que no corresponde a la salida del motor', () => {
    const output = computeCompoundInterest(makeInput({ P: '1', months: 24 }));
    expect(() => buildGrowthChart(output, [], esES, rounding)).toThrow(/output\.years/);
  });
});
