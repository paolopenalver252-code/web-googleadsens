/**
 * Motor de interés compuesto v1 — PURO: sin DOM, sin fecha actual, sin
 * redondeos. Especificación: "Mathematical Closure".
 *
 *   n = M · m / 12  (entero; la validación garantiza la compatibilidad)
 *   s(n|i) = ((1+i)^n − 1) / i   si i > 0
 *   s(n|i) = n                   si i = 0   (tratado aparte: nunca se divide entre 0)
 *
 *   Sin aportaciones:        FV = P·(1+i)^n
 *   Aportaciones al final:   FV = P·(1+i)^n + C·s(n|i)          (instantes 1…n)
 *   Aportaciones al inicio:  FV = P·(1+i)^n + C·s(n|i)·(1+i)    (instantes 0…n−1)
 *
 * Todos los saldos (incluidos los de la tabla anual) se obtienen con la forma
 * cerrada para el número de periodos transcurridos, no acumulando periodo a
 * periodo, de modo que la última fila coincide exactamente con el valor final.
 */
import { Decimal } from '@/core/math/decimal';

import { MONTHS_PER_PERIOD, PERIODS_PER_YEAR } from './constants';
import { effectiveAnnualRate, periodRate } from './rates';
import type {
  CompoundInterestContribution,
  CompoundInterestInput,
  CompoundInterestOutput,
  CompoundInterestYearRow,
} from './types';

/** s(n|i): valor final de n aportaciones unitarias al final de cada periodo. */
export function annuityFactor(rate: Decimal, periods: number): Decimal {
  if (rate.isZero()) return Decimal.from(periods);
  return growthFactor(rate, periods).minus(Decimal.ONE).dividedBy(rate);
}

/** (1+i)^k con exponente entero (k ≥ 0). */
export function growthFactor(rate: Decimal, periods: number): Decimal {
  return Decimal.ONE.plus(rate).pow(Decimal.from(periods));
}

/**
 * Saldo tras k periodos completos (k = 0…n), incluidas las aportaciones ya
 * realizadas: al final, las de los instantes 1…k; al inicio, las de 0…k−1.
 */
export function balanceAfter(
  periods: number,
  initialCapital: Decimal,
  rate: Decimal,
  contribution: CompoundInterestContribution | null,
): Decimal {
  const capital = initialCapital.times(growthFactor(rate, periods));
  if (contribution === null) return capital;
  const annuity = contribution.amount.times(annuityFactor(rate, periods));
  const contributions =
    contribution.timing === 'start' ? annuity.times(Decimal.ONE.plus(rate)) : annuity;
  return capital.plus(contributions);
}

/** n = M · m / 12. Lanza si la duración no es compatible (error de programación). */
export function periodCount(
  input: Pick<CompoundInterestInput, 'durationMonths' | 'frequency'>,
): number {
  const monthsPerPeriod = MONTHS_PER_PERIOD[input.frequency];
  if (!Number.isInteger(input.durationMonths) || input.durationMonths % monthsPerPeriod !== 0) {
    throw new Error(
      `Duración de ${String(input.durationMonths)} meses incompatible con la frecuencia ${input.frequency}.`,
    );
  }
  return input.durationMonths / monthsPerPeriod;
}

/** Solo el valor final (lo usa la validación para aplicar el límite de resultado). */
export function computeFinalValue(input: CompoundInterestInput): Decimal {
  const rate = periodRate(input.annualRate, input.rateConvention, input.frequency);
  return balanceAfter(periodCount(input), input.initialCapital, rate, input.contribution);
}

export function computeCompoundInterest(input: CompoundInterestInput): CompoundInterestOutput {
  const { initialCapital, contribution, frequency } = input;
  const rate = periodRate(input.annualRate, input.rateConvention, frequency);
  const n = periodCount(input);
  const periodsPerYear = PERIODS_PER_YEAR[frequency];
  const monthsPerPeriod = MONTHS_PER_PERIOD[frequency];
  const amount = contribution?.amount ?? Decimal.ZERO;

  const years: CompoundInterestYearRow[] = [];
  let openingBalance = initialCapital;
  for (let startPeriod = 0, index = 1; startPeriod < n; startPeriod += periodsPerYear, index++) {
    const endPeriod = Math.min(startPeriod + periodsPerYear, n);
    const periodsInRow = endPeriod - startPeriod;
    const closingBalance = balanceAfter(endPeriod, initialCapital, rate, contribution);
    const contributions = amount.times(Decimal.from(periodsInRow));
    const cumulativeInvested = initialCapital.plus(amount.times(Decimal.from(endPeriod)));
    years.push({
      index,
      months: periodsInRow * monthsPerPeriod,
      openingBalance,
      contributions,
      interest: closingBalance.minus(openingBalance).minus(contributions),
      closingBalance,
      cumulativeInvested,
      cumulativeInterest: closingBalance.minus(cumulativeInvested),
    });
    openingBalance = closingBalance;
  }

  const finalValue = openingBalance; // closingBalance de la última fila = saldo tras n periodos
  const totalContributions = amount.times(Decimal.from(n));
  const totalInvested = initialCapital.plus(totalContributions);

  return {
    finalValue,
    initialCapital,
    totalContributions,
    totalInvested,
    totalInterest: finalValue.minus(totalInvested),
    contributionCount: contribution === null ? 0 : n,
    effectiveAnnualRate: effectiveAnnualRate(input.annualRate, input.rateConvention, frequency),
    periodRate: rate,
    contributionPeriodRate: contribution === null ? null : rate,
    periods: n,
    durationMonths: input.durationMonths,
    years,
    convention: {
      rateConvention: input.rateConvention,
      frequency,
      contributionTiming: contribution?.timing ?? null,
    },
  };
}
