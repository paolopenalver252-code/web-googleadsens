import { describe, expect, it } from 'vitest';

import { esES } from '@/i18n/locales/es-ES';

import { compoundInterest } from '../definition';
import { computeCompoundInterest } from '../engine';
import { formatCompoundInterestResult } from '../ui/format-result';
import { COMPOUND_INTEREST_FIXTURES } from './fixtures/external-examples';
import { fixtureInput, makeInput } from './helpers';

// Intl usa U+00A0 antes de "€" y "%".
const NBSP = String.fromCharCode(0xa0);
const euros = (text: string) => `${text}${NBSP}€`;

const format = (fixtureId: string) => {
  const fixture = COMPOUND_INTEREST_FIXTURES.find((candidate) => candidate.id === fixtureId);
  if (fixture === undefined) throw new Error(`Fixture ${fixtureId} inexistente`);
  return formatCompoundInterestResult(
    computeCompoundInterest(fixtureInput(fixture)),
    esES,
    compoundInterest.rounding,
  );
};

describe('formatCompoundInterestResult', () => {
  it('formato español con separador de miles, 2 decimales y halfExpand (F10)', () => {
    expect(format('F10')).toEqual({
      finalValue: euros('5.469,47'),
      initialCapital: euros('2.000,00'),
      totalContributions: euros('3.000,00'),
      totalInvested: euros('5.000,00'),
      totalInterest: euros('469,47'),
      effectiveAnnualRate: `4,04${NBSP}%`,
      contributionCount: '6',
      hasContributions: true,
    });
  });

  it('punto medio exacto 1157,625 → 1.157,63 € (halfExpand, no halfEven)', () => {
    expect(format('F1').finalValue).toBe(euros('1.157,63'));
    expect(format('F1').totalInterest).toBe(euros('157,63'));
  });

  it('sin aportaciones: 0,00 € aportado y hasContributions = false', () => {
    const result = format('F2');
    expect(result.totalContributions).toBe(euros('0,00'));
    expect(result.hasContributions).toBe(false);
    expect(result.effectiveAnnualRate).toBe(`3,87${NBSP}%`);
  });

  it('el número de aportaciones se agrupa por miles (1.200)', () => {
    const output = computeCompoundInterest(
      makeInput({
        P: '0',
        ratePercent: '1',
        frequency: 'monthly',
        months: 1200,
        C: '1',
        timing: 'end',
      }),
    );
    expect(
      formatCompoundInterestResult(output, esES, compoundInterest.rounding).contributionCount,
    ).toBe('1.200');
  });
});
