/**
 * Conversión de tipos (Mathematical Closure, §3). Sin redondeos: los tipos
 * se devuelven con la precisión completa del adaptador decimal.
 *
 *   Efectivo anual X → periodo:   i = (1 + X)^(1/m) − 1     (NUNCA X/m)
 *   TIN r            → periodo:   i = r / m
 *   TIN r            → efectivo:  X = (1 + r/m)^m − 1        (m = 1 ⇒ X = r)
 */
import { Decimal } from '@/core/math/decimal';

import { PERIODS_PER_YEAR } from './constants';
import type { Frequency, RateConvention } from './types';

/** Tipo efectivo por periodo de capitalización. `annualRate` es un ratio. */
export function periodRate(
  annualRate: Decimal,
  convention: RateConvention,
  frequency: Frequency,
): Decimal {
  const m = PERIODS_PER_YEAR[frequency];
  if (convention === 'nominal') return annualRate.dividedBy(Decimal.from(m));
  // m = 1: la raíz es la identidad; se evita una potencia fraccionaria innecesaria.
  if (m === 1) return annualRate;
  const exponent = Decimal.ONE.dividedBy(Decimal.from(m));
  return Decimal.ONE.plus(annualRate).pow(exponent).minus(Decimal.ONE);
}

/** Tipo efectivo anual equivalente X a partir del tipo introducido. */
export function effectiveAnnualRate(
  annualRate: Decimal,
  convention: RateConvention,
  frequency: Frequency,
): Decimal {
  if (convention === 'effective') return annualRate;
  return annualRateFromPeriodRate(periodRate(annualRate, 'nominal', frequency), frequency);
}

/** X = (1 + i)^m − 1: tipo efectivo anual de un tipo de periodo (potencia entera). */
export function annualRateFromPeriodRate(rate: Decimal, frequency: Frequency): Decimal {
  const m = PERIODS_PER_YEAR[frequency];
  return Decimal.ONE.plus(rate).pow(Decimal.from(m)).minus(Decimal.ONE);
}
