/**
 * Regresión frente a valores INDEPENDIENTES (fixtures/independent-exact.mjs)
 * y, cuando existe, frente al valor publicado por la fuente.
 */
import { describe, expect, it } from 'vitest';

import { computeCompoundInterest } from '../engine';
import { COMPOUND_INTEREST_FIXTURES } from './fixtures/external-examples';
import { d, display, expectClose, fixtureInput } from './helpers';

describe.each(COMPOUND_INTEREST_FIXTURES)('$id ($covers)', (fixture) => {
  const output = computeCompoundInterest(fixtureInput(fixture));
  const { expected, provenance } = fixture;

  it('valor final igual al independiente (exacto si cabe en 40 dígitos; si no, ±1e-20 €)', () => {
    if (expected.exactInEngine) {
      expect(output.finalValue.equals(d(expected.finalValue)), output.finalValue.toString()).toBe(
        true,
      );
    } else {
      expectClose(output.finalValue, d(expected.finalValue));
    }
  });

  it('presentación: 2 decimales, halfExpand', () => {
    expect(display(output.finalValue)).toBe(expected.displayed);
    expect(display(output.totalInterest)).toBe(expected.totalInterestDisplayed);
  });

  it('total aportado exacto y coherencia de lo mostrado', () => {
    expect(output.totalInvested.equals(d(expected.totalInvested))).toBe(true);
    expect(
      d(expected.totalInvested)
        .plus(d(expected.totalInterestDisplayed))
        .equals(d(expected.displayed)),
    ).toBe(true);
  });

  if (provenance.kind === 'source') {
    it(`coincide con la fuente (${provenance.sourceCandidateId}) dentro de su tolerancia documentada`, () => {
      const presented = fixture.id === 'F1' ? output.totalInterest : output.finalValue;
      const difference = d(display(presented)).minus(d(provenance.publishedValue)).abs();
      expect(difference.lessThanOrEqual(d(provenance.tolerance))).toBe(true);
    });
  }
});
