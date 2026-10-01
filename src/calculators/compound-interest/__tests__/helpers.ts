import { expect } from 'vitest';

import { Decimal } from '@/core/math/decimal';
import { percentPointsToRatio } from '@/core/math/percent';

import type {
  CompoundInterestInput,
  ContributionTiming,
  Frequency,
  RateConvention,
} from '../types';
import { TOLERANCE_EUR, type CompoundInterestFixture } from './fixtures/external-examples';

export const d = (value: string): Decimal => Decimal.from(value);

export interface InputOptions {
  readonly P?: string;
  readonly ratePercent?: string;
  readonly convention?: RateConvention;
  readonly frequency?: Frequency;
  readonly months?: number;
  readonly C?: string | null;
  readonly timing?: ContributionTiming;
}

/** Entrada del motor a partir de literales (puntos % → ratio, igual que la definición). */
export function makeInput(options: InputOptions = {}): CompoundInterestInput {
  const amount = options.C ?? null;
  return {
    initialCapital: d(options.P ?? '0'),
    annualRate: percentPointsToRatio(d(options.ratePercent ?? '0')),
    rateConvention: options.convention ?? 'nominal',
    frequency: options.frequency ?? 'annual',
    durationMonths: options.months ?? 12,
    contribution: amount === null ? null : { amount: d(amount), timing: options.timing ?? 'end' },
  };
}

export function fixtureInput(fixture: CompoundInterestFixture): CompoundInterestInput {
  const { input } = fixture;
  return makeInput({
    P: input.initialCapital,
    ratePercent: input.annualRatePercent,
    convention: input.rateConvention,
    frequency: input.frequency,
    months: input.durationMonths,
    C: input.contribution?.amount ?? null,
    ...(input.contribution ? { timing: input.contribution.timing } : {}),
  });
}

/** |actual − expected| ≤ tolerancia (por defecto 1e-20 €). */
export function expectClose(
  actual: Decimal,
  expected: Decimal,
  tolerance: string = TOLERANCE_EUR,
): void {
  const difference = actual.minus(expected).abs();
  expect(
    difference.lessThanOrEqual(d(tolerance)),
    `${actual.toString()} ≠ ${expected.toString()} (Δ = ${difference.toString()})`,
  ).toBe(true);
}

/** Presentación monetaria: 2 decimales, halfExpand. */
export const display = (value: Decimal): string => value.toFixed(2, 'halfExpand');
