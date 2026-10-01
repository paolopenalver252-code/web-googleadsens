import type { Decimal } from '@/core/math/decimal';

import type {
  CONTRIBUTION_TIMINGS,
  DURATION_UNITS,
  FREQUENCIES,
  RATE_CONVENTIONS,
} from './constants';

export type Frequency = (typeof FREQUENCIES)[number];
export type RateConvention = (typeof RATE_CONVENTIONS)[number];
export type ContributionTiming = (typeof CONTRIBUTION_TIMINGS)[number];
export type DurationUnit = (typeof DURATION_UNITS)[number];

export interface CompoundInterestContribution {
  /** C > 0 por periodo (una aportación de 0 se representa como `null`). */
  readonly amount: Decimal;
  readonly timing: ContributionTiming;
}

/** Entrada tipada del motor (ya validada; ver definition.ts → toInput). */
export interface CompoundInterestInput {
  /** P ≥ 0, en euros. */
  readonly initialCapital: Decimal;
  /** Tipo anual como RATIO (0,05 = 5 %), ya convertido desde puntos porcentuales. */
  readonly annualRate: Decimal;
  readonly rateConvention: RateConvention;
  /** Frecuencia única de capitalización y aportación. */
  readonly frequency: Frequency;
  /** M: meses enteros, compatible con la frecuencia (múltiplo de 12/m). */
  readonly durationMonths: number;
  /** `null` = sin aportaciones periódicas. */
  readonly contribution: CompoundInterestContribution | null;
}

/**
 * Fila de la tabla anual. Todos los importes con precisión completa: el
 * redondeo solo ocurre al presentar.
 */
export interface CompoundInterestYearRow {
  /** 1, 2, … */
  readonly index: number;
  /** Meses del tramo: 12, salvo un último tramo parcial. */
  readonly months: number;
  readonly openingBalance: Decimal;
  /** Aportaciones periódicas realizadas en el tramo (sin el capital inicial). */
  readonly contributions: Decimal;
  /** closingBalance − openingBalance − contributions. */
  readonly interest: Decimal;
  readonly closingBalance: Decimal;
  /** Capital inicial + aportaciones hasta el final del tramo. */
  readonly cumulativeInvested: Decimal;
  /** closingBalance − cumulativeInvested. */
  readonly cumulativeInterest: Decimal;
}

export interface CompoundInterestOutput {
  readonly finalValue: Decimal;
  readonly initialCapital: Decimal;
  /** n · C */
  readonly totalContributions: Decimal;
  /** P + n · C */
  readonly totalInvested: Decimal;
  /** finalValue − totalInvested */
  readonly totalInterest: Decimal;
  /** n si hay aportaciones; 0 si no. */
  readonly contributionCount: number;
  /** Tipo efectivo anual equivalente X (no es una TAE: no incluye comisiones). */
  readonly effectiveAnnualRate: Decimal;
  /** i: tipo efectivo por periodo de capitalización. */
  readonly periodRate: Decimal;
  /** Tipo efectivo del periodo de aportación (= periodRate en v1); `null` sin aportaciones. */
  readonly contributionPeriodRate: Decimal | null;
  /** n = M · m / 12 */
  readonly periods: number;
  readonly durationMonths: number;
  readonly years: readonly CompoundInterestYearRow[];
  readonly convention: {
    readonly rateConvention: RateConvention;
    readonly frequency: Frequency;
    readonly contributionTiming: ContributionTiming | null;
  };
}
