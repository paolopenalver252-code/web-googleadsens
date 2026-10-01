/**
 * Propiedades matemáticas (fast-check) del modelo v1, con i ≥ 0.
 * Condiciones de cada propiedad: "Mathematical Closure", §6–§7.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { Decimal } from '@/core/math/decimal';

import { FREQUENCIES, MONTHS_PER_PERIOD } from '../constants';
import { computeCompoundInterest } from '../engine';
import { annualRateFromPeriodRate, periodRate } from '../rates';
import type { ContributionTiming, Frequency, RateConvention } from '../types';
import { d, display, expectClose, makeInput, type InputOptions } from './helpers';

const TIGHT = `0.${'0'.repeat(34)}1`; // 1e-35

/** Literal decimal a partir de un entero y su escala, sin aritmética en coma flotante. */
const scaled = (units: number, digits: number): string => {
  const text = String(units).padStart(digits + 1, '0');
  return `${text.slice(0, -digits)}.${text.slice(-digits)}`;
};
/** Importe con 2 decimales en [0, max] como literal. */
const money = (maxCents: number) =>
  fc.integer({ min: 0, max: maxCents }).map((cents) => scaled(cents, 2));
/** Tipo en puntos % con hasta 4 decimales en [0, 20]. */
const ratePercent = fc.integer({ min: 0, max: 200_000 }).map((units) => scaled(units, 4));
const frequency = fc.constantFrom<Frequency>(...FREQUENCIES);
const convention = fc.constantFrom<RateConvention>('effective', 'nominal');
const timing = fc.constantFrom<ContributionTiming>('start', 'end');

interface Scenario {
  readonly P: string;
  readonly C: string;
  readonly ratePercent: string;
  readonly convention: RateConvention;
  readonly frequency: Frequency;
  readonly periods: number;
  readonly timing: ContributionTiming;
  readonly months: number;
}

/** Escenario con duración compatible por construcción: k periodos completos. */
const scenario: fc.Arbitrary<Scenario> = fc
  .record({
    P: money(100_000_000),
    C: money(1_000_000),
    ratePercent,
    convention,
    frequency,
    periods: fc.integer({ min: 1, max: 60 }),
    timing,
  })
  .map((s) => ({ ...s, months: s.periods * MONTHS_PER_PERIOD[s.frequency] }));

const run = (s: Scenario, overrides: InputOptions = {}) =>
  computeCompoundInterest(
    makeInput({
      P: s.P,
      C: s.C,
      ratePercent: s.ratePercent,
      convention: s.convention,
      frequency: s.frequency,
      months: s.months,
      timing: s.timing,
      ...overrides,
    }),
  );

describe('propiedades del motor', () => {
  it('P = 0 y C = 0 ⇒ FV = 0', () => {
    fc.assert(fc.property(scenario, (s) => run(s, { P: '0', C: '0' }).finalValue.isZero()));
  });

  it('i = 0 ⇒ FV = P + n·C (exacto) e interés 0', () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const output = run(s, { ratePercent: '0' });
        const n = Decimal.from(output.periods);
        return (
          output.finalValue.equals(d(s.P).plus(d(s.C).times(n))) && output.totalInterest.isZero()
        );
      }),
    );
  });

  it('aumentar P no reduce FV', () => {
    fc.assert(
      fc.property(scenario, money(10_000_000), (s, extra) =>
        run(s, { P: d(s.P).plus(d(extra)).toString() }).finalValue.greaterThanOrEqual(
          run(s).finalValue,
        ),
      ),
    );
  });

  it('aumentar C no reduce FV', () => {
    fc.assert(
      fc.property(scenario, money(1_000_000), (s, extra) =>
        run(s, { C: d(s.C).plus(d(extra)).toString() }).finalValue.greaterThanOrEqual(
          run(s).finalValue,
        ),
      ),
    );
  });

  it('con C = 0 el momento de aportación no afecta y FV = P·(1+i)^n', () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const start = run(s, { C: '0', timing: 'start' }).finalValue;
        const end = run(s, { C: '0', timing: 'end' }).finalValue;
        const none = run(s, { C: null }).finalValue;
        return start.equals(end) && end.equals(none);
      }),
    );
  });

  it('con C = 0 la aportación no afecta: no hay aportaciones ni importe aportado', () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const output = run(s, { C: null });
        return (
          output.contributionCount === 0 &&
          output.totalContributions.isZero() &&
          output.totalInvested.equals(d(s.P))
        );
      }),
    );
  });

  it('con i ≥ 0: aportación al inicio ≥ aportación al final', () => {
    fc.assert(
      fc.property(scenario, (s) =>
        run(s, { timing: 'start' }).finalValue.greaterThanOrEqual(
          run(s, { timing: 'end' }).finalValue,
        ),
      ),
    );
  });

  it('totalInterest ≥ 0', () => {
    fc.assert(fc.property(scenario, (s) => !run(s).totalInterest.isNegative()));
  });

  it('totalContributions = n·C y totalInvested = P + n·C (exactos)', () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const output = run(s);
        const nC = d(s.C).times(Decimal.from(output.periods));
        return output.totalContributions.equals(nC) && output.totalInvested.equals(d(s.P).plus(nC));
      }),
    );
  });

  it('finalValue = totalInvested + totalInterest, también en lo que se muestra', () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const output = run(s);
        const exact = output.totalInvested.plus(output.totalInterest).equals(output.finalValue);
        const shown = d(display(output.totalInvested))
          .plus(d(display(output.totalInterest)))
          .equals(d(display(output.finalValue)));
        return exact && shown;
      }),
    );
  });

  it('la tabla anual es coherente con el resultado', () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const output = run(s);
        const last = output.years.at(-1);
        const interest = output.years.reduce((acc, row) => acc.plus(row.interest), Decimal.ZERO);
        expectClose(interest, output.totalInterest);
        return last?.closingBalance.equals(output.finalValue) === true;
      }),
    );
  });
});

describe('propiedades de la conversión de tipos', () => {
  it('TIN anual = tipo efectivo anual equivalente (m = 1)', () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const nominal = run(s, {
          convention: 'nominal',
          frequency: 'annual',
          months: 12 * s.periods,
        });
        const effective = run(s, {
          convention: 'effective',
          frequency: 'annual',
          months: 12 * s.periods,
        });
        return (
          nominal.finalValue.equals(effective.finalValue) &&
          nominal.effectiveAnnualRate.equals(effective.effectiveAnnualRate)
        );
      }),
    );
  });

  it('tipo efectivo anual → periodo → anual recupera el tipo (±1e-35)', () => {
    fc.assert(
      fc.property(ratePercent, frequency, (rate, f) => {
        const X = d(rate).dividedBy(Decimal.from(100));
        expectClose(annualRateFromPeriodRate(periodRate(X, 'effective', f), f), X, TIGHT);
      }),
    );
  });

  it('con tipo efectivo y C = 0, la frecuencia no cambia el resultado anual (±1e-20 €)', () => {
    fc.assert(
      fc.property(
        money(100_000_000),
        ratePercent,
        fc.integer({ min: 1, max: 30 }),
        (P, rate, years) => {
          const values = FREQUENCIES.map(
            (f) =>
              computeCompoundInterest(
                makeInput({
                  P,
                  ratePercent: rate,
                  convention: 'effective',
                  frequency: f,
                  months: 12 * years,
                }),
              ).finalValue,
          );
          for (const value of values) expectClose(value, values[0] ?? Decimal.ZERO);
          expect(values).toHaveLength(4);
        },
      ),
    );
  });
});
