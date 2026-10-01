/**
 * Modelo del gráfico de evolución: traduce la salida del motor a puntos y
 * marcas de eje. No calcula importes: cada punto es una fila de
 * `output.years` (más el instante inicial, en el que el saldo es el capital
 * inicial). Los números de `invested`/`balance` son SOLO geometría
 * (`toNumberLossy`, ADR 0003); todo texto visible sale de format-result.ts.
 */
import type { RoundingPolicy } from '@/core/calculator/definition';
import { Decimal } from '@/core/math/decimal';
import type { LocaleDefinition } from '@/i18n/types';

import type { CompoundInterestOutput } from '../types';
import { compoundInterestCopy } from './copy.es-ES';
import { formatAxisAmount, formatMoney, type FormattedScheduleRow } from './format-result';

export interface GrowthChartPoint {
  /** Meses transcurridos desde el inicio. */
  readonly month: number;
  readonly invested: number;
  readonly balance: number;
  /** Descripción completa del punto (lectores de pantalla y panel de detalle). */
  readonly description: string;
}

export interface GrowthChartTick {
  readonly value: number;
  readonly label: string;
}

export interface GrowthChartModel {
  readonly durationMonths: number;
  readonly unit: 'years' | 'months';
  readonly points: readonly GrowthChartPoint[];
  /** `value` en meses. */
  readonly xTicks: readonly GrowthChartTick[];
  /** `value` en euros (geometría). */
  readonly yTicks: readonly GrowthChartTick[];
  /** Tope del eje vertical: la última marca (1 si todo es 0, para no dividir entre 0). */
  readonly yMax: number;
}

const MONTHS_PER_YEAR = 12;
/** Intervalos máximos del eje vertical: 4 → como mucho 5 marcas. */
const Y_INTERVALS = 4;
const X_INTERVALS = 5;
const YEAR_STEPS = [1, 2, 5, 10, 20, 25, 50, 100] as const;
/** Paso mínimo del eje vertical: un céntimo. */
const MIN_STEP_EXPONENT = -2;

export function buildGrowthChart(
  output: CompoundInterestOutput,
  schedule: readonly FormattedScheduleRow[],
  locale: LocaleDefinition,
  rounding: RoundingPolicy,
): GrowthChartModel {
  const { chart } = compoundInterestCopy;
  const initial = formatMoney(output.initialCapital, locale, rounding);
  const points: GrowthChartPoint[] = [
    {
      month: 0,
      invested: output.initialCapital.toNumberLossy(),
      balance: output.initialCapital.toNumberLossy(),
      description: chart.point({
        period: chart.start,
        balance: initial,
        invested: initial,
        interest: formatMoney(Decimal.ZERO, locale, rounding),
      }),
    },
  ];

  let month = 0;
  output.years.forEach((row, index) => {
    const text = schedule[index];
    if (text === undefined) throw new Error('La tabla formateada no corresponde a output.years.');
    month += row.months;
    points.push({
      month,
      invested: row.cumulativeInvested.toNumberLossy(),
      balance: row.closingBalance.toNumberLossy(),
      description: chart.point({
        period: text.period,
        balance: text.closingBalance,
        invested: text.cumulativeInvested,
        interest: text.cumulativeInterest,
      }),
    });
  });

  // Con tipo ≥ 0 y aportaciones ≥ 0 el saldo nunca baja: el máximo es el valor final.
  const y = yAxisTicks(output.finalValue);
  return {
    durationMonths: output.durationMonths,
    unit: output.durationMonths < MONTHS_PER_YEAR ? 'months' : 'years',
    points,
    xTicks: xAxisTicks(output.durationMonths),
    yTicks: y.ticks.map((tick) => ({
      value: tick.toNumberLossy(),
      label: formatAxisAmount(tick, locale, y.fractionDigits),
    })),
    yMax: y.top.isZero() ? 1 : y.top.toNumberLossy(),
  };
}

/**
 * Marcas "redondas" (1, 2 o 5 × 10^k) desde 0 hasta cubrir `max`. Se calculan
 * con Decimal para que cada marca sea exacta y su etiqueta no dependa de la
 * coma flotante; solo la elección del orden de magnitud usa `number`.
 */
export function yAxisTicks(max: Decimal): {
  readonly ticks: readonly Decimal[];
  readonly top: Decimal;
  readonly fractionDigits: number;
} {
  if (!max.isPositive()) return { ticks: [Decimal.ZERO], top: Decimal.ZERO, fractionDigits: 0 };

  const raw = max.toNumberLossy() / Y_INTERVALS;
  let exponent = Math.floor(Math.log10(raw));
  const fraction = raw / 10 ** exponent;
  let multiplier = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  if (multiplier === 10) {
    multiplier = 1;
    exponent += 1;
  }
  if (exponent < MIN_STEP_EXPONENT) {
    exponent = MIN_STEP_EXPONENT;
    multiplier = 1;
  }

  const step = Decimal.from(multiplier).times(powerOfTen(exponent));
  const ticks: Decimal[] = [Decimal.ZERO];
  let top = Decimal.ZERO;
  while (top.lessThan(max)) {
    top = step.times(Decimal.from(ticks.length));
    ticks.push(top);
  }
  return { ticks, top, fractionDigits: Math.max(0, -exponent) };
}

/** Marcas del eje horizontal, en meses: por años enteros, o por meses si no llega a un año. */
export function xAxisTicks(durationMonths: number): readonly GrowthChartTick[] {
  if (durationMonths < MONTHS_PER_YEAR) {
    const step = durationMonths <= X_INTERVALS ? 1 : 2;
    return range(0, durationMonths, step).map((value) => ({ value, label: String(value) }));
  }
  const years = Math.floor(durationMonths / MONTHS_PER_YEAR);
  const step = YEAR_STEPS.find((candidate) => years / candidate <= X_INTERVALS) ?? 100;
  return range(0, years, step).map((year) => ({
    value: year * MONTHS_PER_YEAR,
    label: String(year),
  }));
}

function powerOfTen(exponent: number): Decimal {
  const power = Decimal.from(10).pow(Decimal.from(Math.abs(exponent)));
  return exponent >= 0 ? power : Decimal.ONE.dividedBy(power);
}

function range(from: number, to: number, step: number): number[] {
  const values: number[] = [];
  for (let value = from; value <= to; value += step) values.push(value);
  return values;
}
