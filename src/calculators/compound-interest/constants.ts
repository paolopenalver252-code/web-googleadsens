/**
 * Constantes de la calculadora de interés compuesto (v1).
 * Especificación: "Mathematical Closure" (fuente de verdad matemática).
 */
import { Decimal } from '@/core/math/decimal';

import type { Frequency } from './types';

/** SemVer del motor. Cambiar una fórmula ⇒ subir versión y revisar regresión. */
export const ENGINE_VERSION = '0.1.0';

/**
 * Frecuencia ÚNICA de capitalización y aportación (en v1 siempre coinciden).
 * No hay semanal ni diaria: no encajan en una duración en meses enteros.
 */
export const FREQUENCIES = ['annual', 'semiannual', 'quarterly', 'monthly'] as const;

/** m: periodos por año. Todos dividen 12, así que cada periodo dura meses enteros. */
export const PERIODS_PER_YEAR: Readonly<Record<Frequency, 1 | 2 | 4 | 12>> = {
  annual: 1,
  semiannual: 2,
  quarterly: 4,
  monthly: 12,
};

/** L = 12/m: meses por periodo. Una duración M es compatible si L divide a M. */
export const MONTHS_PER_PERIOD: Readonly<Record<Frequency, 12 | 6 | 3 | 1>> = {
  annual: 12,
  semiannual: 6,
  quarterly: 3,
  monthly: 1,
};

/** effective = TAE / tipo efectivo anual ; nominal = TIN. */
export const RATE_CONVENTIONS = ['effective', 'nominal'] as const;

/** start: aportaciones en 0, 1, …, n−1 ; end: en 1, 2, …, n. */
export const CONTRIBUTION_TIMINGS = ['start', 'end'] as const;

export const DURATION_UNITS = ['years', 'months'] as const;

/** Límites de entrada v1 (decisión de producto). */
export const LIMITS = {
  initialCapital: { min: '0', max: '1000000000', maxFractionDigits: 2 },
  contributionAmount: { min: '0', max: '100000000', maxFractionDigits: 2 },
  /** En PUNTOS porcentuales, tal como los escribe el usuario. Sin negativos en v1. */
  annualRatePercent: { min: '0', max: '100', maxFractionDigits: 4 },
  /** Valor introducido (años o meses); el tope real se aplica en meses. */
  durationValue: { min: '1', max: '1200' },
  maxDurationMonths: 1200,
} as const;

/**
 * Límite OPERATIVO del producto para el valor final (10^15 €). Es una decisión
 * de producto sobre el rango que la calculadora acepta mostrar, no una
 * limitación del adaptador decimal.
 */
export const MAX_FINAL_VALUE = Decimal.from('1000000000000000');
