/**
 * Presentación del resultado: convierte la salida del motor (Decimal con
 * precisión completa) en textos localizados. ÚNICO punto donde se redondea,
 * siempre con la política de la definición (halfExpand, 2 decimales) y el
 * sistema de formato de i18n. No calcula nada: ni tipos ni importes.
 */
import type { RoundingPolicy } from '@/core/calculator/definition';
import { Decimal } from '@/core/math/decimal';
import { formatCurrency, formatNumber, formatPercent } from '@/i18n/format';
import type { LocaleDefinition } from '@/i18n/types';

import type { CompoundInterestOutput } from '../types';
import { compoundInterestCopy } from './copy.es-ES';

export interface FormattedCompoundInterestResult {
  readonly finalValue: string;
  readonly initialCapital: string;
  readonly totalContributions: string;
  readonly totalInvested: string;
  readonly totalInterest: string;
  readonly effectiveAnnualRate: string;
  readonly contributionCount: string;
  readonly hasContributions: boolean;
}

const WHOLE_NUMBER = { fractionDigits: 0, mode: 'halfExpand' } as const;

export function formatCompoundInterestResult(
  output: CompoundInterestOutput,
  locale: LocaleDefinition,
  rounding: RoundingPolicy,
): FormattedCompoundInterestResult {
  const money = (value: Decimal): string =>
    formatCurrency(value, locale, rounding.display.currency);
  return {
    finalValue: money(output.finalValue),
    initialCapital: money(output.initialCapital),
    totalContributions: money(output.totalContributions),
    totalInvested: money(output.totalInvested),
    totalInterest: money(output.totalInterest),
    effectiveAnnualRate: formatPercent(
      output.effectiveAnnualRate,
      locale,
      rounding.display.percent,
    ),
    contributionCount: formatNumber(Decimal.from(output.contributionCount), locale, WHOLE_NUMBER),
    hasContributions: output.contributionCount > 0,
  };
}

/** Fila de la tabla anual, ya formateada. Una por fila de `output.years`, en el mismo orden. */
export interface FormattedScheduleRow {
  readonly period: string;
  readonly interest: string;
  readonly cumulativeInvested: string;
  readonly cumulativeInterest: string;
  readonly closingBalance: string;
}

const MONTHS_PER_YEAR = 12;

/**
 * Tabla anual: formatea las filas que ya calcula el motor (`output.years`),
 * sin recalcular nada. La última fila es el saldo tras n periodos, idéntico a
 * `finalValue`, así que su texto coincide con el del resultado.
 */
export function formatCompoundInterestSchedule(
  output: CompoundInterestOutput,
  locale: LocaleDefinition,
  rounding: RoundingPolicy,
): readonly FormattedScheduleRow[] {
  const money = (value: Decimal): string => formatMoney(value, locale, rounding);
  const { schedule } = compoundInterestCopy;
  return output.years.map((row) => {
    const firstMonth = (row.index - 1) * MONTHS_PER_YEAR + 1;
    return {
      period:
        row.months === MONTHS_PER_YEAR
          ? schedule.year(row.index)
          : schedule.months(firstMonth, firstMonth + row.months - 1),
      interest: money(row.interest),
      cumulativeInvested: money(row.cumulativeInvested),
      cumulativeInterest: money(row.cumulativeInterest),
      closingBalance: money(row.closingBalance),
    };
  });
}

/** Duración en texto ("3 años", "6 meses", "2 años y 6 meses"). */
export function formatDuration(durationMonths: number): string {
  const { duration } = compoundInterestCopy;
  const years = Math.floor(durationMonths / MONTHS_PER_YEAR);
  const months = durationMonths % MONTHS_PER_YEAR;
  if (years === 0) return duration.months(months);
  if (months === 0) return duration.years(years);
  return duration.yearsAndMonths(duration.years(years), duration.months(months));
}

/** Importe con la política de moneda de la calculadora. */
export function formatMoney(
  value: Decimal,
  locale: LocaleDefinition,
  rounding: RoundingPolicy,
): string {
  return formatCurrency(value, locale, rounding.display.currency);
}

/**
 * Etiqueta del eje vertical del gráfico. Los valores de las marcas son
 * múltiplos exactos del paso, así que `fractionDigits` (los decimales del
 * paso) no recorta nada: solo fija cuántos se muestran.
 */
export function formatAxisAmount(
  value: Decimal,
  locale: LocaleDefinition,
  fractionDigits: number,
): string {
  return formatCurrency(value, locale, { fractionDigits, mode: 'halfExpand' });
}
