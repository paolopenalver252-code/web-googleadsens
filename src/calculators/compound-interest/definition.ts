/**
 * Calculadora de interés compuesto v1 — definición (campos + validación).
 *
 * Estado: PUBLICADA (`published` en src/calculators/registry.ts) el
 * 01/10/2026. Página: src/pages/calculadora-interes-compuesto.astro.
 * Especificación: "Mathematical Closure"; convenciones en
 * docs/adr/0008-interes-compuesto.md.
 *
 * Campos (el orden de las claves es el orden de la UI):
 *   capital inicial → aportación periódica → tipo anual → tipo de tasa
 *   (TAE / TIN) → frecuencia (capitalización y aportación, única) → momento
 *   de la aportación → duración + unidad.
 */
import { defineCalculator, type ParsedFields } from '@/core/calculator/definition';
import { Decimal } from '@/core/math/decimal';
import { percentPointsToRatio } from '@/core/math/percent';
import { err, ok, type Result } from '@/core/result';
import { choiceField, decimalField, type FieldError } from '@/core/validation/field';

import {
  CONTRIBUTION_TIMINGS,
  DURATION_UNITS,
  ENGINE_VERSION,
  FREQUENCIES,
  LIMITS,
  MAX_FINAL_VALUE,
  MONTHS_PER_PERIOD,
  RATE_CONVENTIONS,
} from './constants';
import { computeCompoundInterest, computeFinalValue } from './engine';
import type { CompoundInterestInput } from './types';

const MONTHS_PER_YEAR = Decimal.from(12);

export const compoundInterestFields = {
  initialCapital: decimalField({
    required: true,
    unit: 'currency',
    ...LIMITS.initialCapital,
  }),
  contributionAmount: decimalField({
    required: false,
    unit: 'currency',
    ...LIMITS.contributionAmount,
  }),
  annualRate: decimalField({
    required: true,
    unit: 'percent',
    ...LIMITS.annualRatePercent,
  }),
  rateConvention: choiceField({ required: true, options: RATE_CONVENTIONS }),
  frequency: choiceField({ required: true, options: FREQUENCIES }),
  contributionTiming: choiceField({ required: false, options: CONTRIBUTION_TIMINGS }),
  durationValue: decimalField({
    required: true,
    unit: 'count',
    integer: true,
    ...LIMITS.durationValue,
  }),
  durationUnit: choiceField({ required: true, options: DURATION_UNITS }),
};

type Fields = ParsedFields<typeof compoundInterestFields>;

/**
 * Reglas entre campos:
 *   - duración total ≤ 1.200 meses;
 *   - duración compatible con la frecuencia (múltiplo de 12/m meses);
 *   - con aportación > 0, el momento (inicio/final) es obligatorio;
 *   - valor final ≤ 10^15 € (límite operativo del producto).
 */
export function toCompoundInterestInput(
  fields: Fields,
): Result<CompoundInterestInput, readonly FieldError[]> {
  const errors: FieldError[] = [];

  const monthsDecimal =
    fields.durationUnit === 'years'
      ? fields.durationValue.times(MONTHS_PER_YEAR)
      : fields.durationValue;
  const maxMonths = Decimal.from(LIMITS.maxDurationMonths);
  const monthsPerPeriod = MONTHS_PER_PERIOD[fields.frequency];

  let durationMonths = 0;
  if (monthsDecimal.greaterThan(maxMonths)) {
    errors.push({
      field: 'durationValue',
      code: 'compound-interest.duration_too_long',
      params: { maxMonths: LIMITS.maxDurationMonths },
    });
  } else {
    // Conversión segura: entero validado entre 1 y 1.200 (un recuento, no un importe).
    durationMonths = Number(monthsDecimal.toString());
    if (durationMonths % monthsPerPeriod !== 0) {
      errors.push({
        field: 'durationValue',
        code: 'compound-interest.duration_incompatible',
        params: { multiple: monthsPerPeriod },
      });
    }
  }

  const amount = fields.contributionAmount;
  const hasContribution = amount?.isPositive() === true;
  if (hasContribution && fields.contributionTiming === undefined) {
    errors.push({ field: 'contributionTiming', code: 'compound-interest.timing_required' });
  }

  if (errors.length > 0) return err(errors);

  const input: CompoundInterestInput = {
    initialCapital: fields.initialCapital,
    annualRate: percentPointsToRatio(fields.annualRate),
    rateConvention: fields.rateConvention,
    frequency: fields.frequency,
    durationMonths,
    contribution:
      hasContribution && fields.contributionTiming !== undefined
        ? { amount, timing: fields.contributionTiming }
        : null,
  };

  if (computeFinalValue(input).greaterThan(MAX_FINAL_VALUE)) {
    return err([
      { field: null, code: 'compound-interest.result_too_large', params: { max: MAX_FINAL_VALUE } },
    ]);
  }
  return ok(input);
}

export const compoundInterest = defineCalculator({
  id: 'compound-interest',
  slug: 'calculadora-interes-compuesto',
  version: ENGINE_VERSION,
  fields: compoundInterestFields,
  toInput: toCompoundInterestInput,
  compute: computeCompoundInterest,
  rounding: {
    display: {
      currency: { fractionDigits: 2, mode: 'halfExpand' },
      percent: { fractionDigits: 2, mode: 'halfExpand' },
      number: { fractionDigits: 2, mode: 'halfExpand' },
    },
    intermediate: 'none',
  },
  related: [],
});
