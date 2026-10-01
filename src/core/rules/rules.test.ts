import { describe, expect, it } from 'vitest';

import { toIsoDate } from '../dates/iso-date';
import { resolveRules } from './resolve';
import { defineRuleSet, validateRuleSets, type RuleSet, type RuleSetInput } from './rule-set';

/**
 * Datos FICTICIOS de prueba (`data: { marker }`): no son reglas fiscales ni
 * normativas. Solo comprueban la mecánica de vigencias.
 */
function ruleSet(
  overrides: Partial<RuleSetInput<{ marker: string }>> & { id: string },
): RuleSet<{ marker: string }> {
  return defineRuleSet({
    jurisdiction: 'ES',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    sources: ['fuente-ficticia'],
    status: 'verified',
    data: { marker: overrides.id },
    ...overrides,
  });
}

const y2026 = ruleSet({ id: 'ficticio-2026' });
const y2027 = ruleSet({ id: 'ficticio-2027', validFrom: '2027-01-01', validTo: null });
const madrid = ruleSet({ id: 'ficticio-md-2026', jurisdiction: 'ES-MD' });
const sets = [y2026, y2027, madrid];

const query = (date: string, jurisdiction = 'ES') => ({ date: toIsoDate(date), jurisdiction });

describe('resolveRules', () => {
  it('elige el conjunto vigente; los límites de vigencia son inclusivos', () => {
    expect(resolveRules(sets, query('2026-01-01'))).toEqual({ ok: true, value: y2026 });
    expect(resolveRules(sets, query('2026-12-31'))).toEqual({ ok: true, value: y2026 });
    expect(resolveRules(sets, query('2027-01-01'))).toEqual({ ok: true, value: y2027 });
  });

  it('añadir el conjunto de 2027 no destruye el de 2026: ambos años siguen resolviendo', () => {
    expect(resolveRules(sets, query('2026-06-30'))).toEqual({ ok: true, value: y2026 });
    expect(resolveRules(sets, query('2027-06-30'))).toEqual({ ok: true, value: y2027 });
  });

  it('validTo null = vigente sin fecha de fin', () => {
    expect(resolveRules(sets, query('2099-05-05'))).toEqual({ ok: true, value: y2027 });
  });

  it('la jurisdicción es de coincidencia exacta', () => {
    expect(resolveRules(sets, query('2026-03-01', 'ES-MD'))).toEqual({ ok: true, value: madrid });
    expect(resolveRules(sets, query('2027-03-01', 'ES-MD'))).toEqual({
      ok: false,
      error: { code: 'no_rules_for_date', date: '2027-03-01', jurisdiction: 'ES-MD' },
    });
  });

  it('sin reglas para la fecha → error explícito, nunca un valor por defecto', () => {
    expect(resolveRules(sets, query('2025-12-31'))).toEqual({
      ok: false,
      error: { code: 'no_rules_for_date', date: '2025-12-31', jurisdiction: 'ES' },
    });
  });

  it('solapamiento → ambiguous_rules en lugar de elegir uno al azar', () => {
    const overlapping = ruleSet({
      id: 'ficticio-solapado',
      validFrom: '2026-06-01',
      validTo: '2026-06-30',
    });
    expect(resolveRules([y2026, overlapping], query('2026-06-15'))).toEqual({
      ok: false,
      error: { code: 'ambiguous_rules', ruleSetIds: ['ficticio-2026', 'ficticio-solapado'] },
    });
  });

  it('reglas sin verificar: rechazadas por defecto, permitidas solo de forma explícita', () => {
    const draft = ruleSet({ id: 'ficticio-borrador', status: 'unverified', sources: [] });
    expect(resolveRules([draft], query('2026-02-01'))).toEqual({
      ok: false,
      error: { code: 'unverified_rules', ruleSetId: 'ficticio-borrador' },
    });
    expect(resolveRules([draft], { ...query('2026-02-01'), allowUnverified: true })).toEqual({
      ok: true,
      value: draft,
    });
  });
});

describe('defineRuleSet', () => {
  it('congela el conjunto (inmutable)', () => {
    expect(Object.isFrozen(y2026)).toBe(true);
    expect(Object.isFrozen(y2026.sources)).toBe(true);
  });

  it('rechaza datos incoherentes', () => {
    expect(() => ruleSet({ id: 'Mal Id' })).toThrow(/Id/);
    expect(() => ruleSet({ id: 'a', jurisdiction: 'España' })).toThrow(/jurisdicción/);
    expect(() => ruleSet({ id: 'a', validFrom: '2026-02-30' })).toThrow(/Fecha/);
    expect(() => ruleSet({ id: 'a', validFrom: '2026-06-01', validTo: '2026-05-31' })).toThrow(
      /anterior/,
    );
    expect(() => ruleSet({ id: 'a', sources: [] })).toThrow(/sin fuentes/);
  });

  it('conserva notas opcionales', () => {
    expect(ruleSet({ id: 'con-notas', notes: 'nota' }).notes).toBe('nota');
    expect('notes' in y2026).toBe(false);
  });
});

describe('validateRuleSets', () => {
  it('un registro coherente no tiene incidencias', () => {
    expect(validateRuleSets(sets)).toEqual([]);
  });

  it('detecta ids duplicados y vigencias solapadas en la misma jurisdicción', () => {
    const dup = ruleSet({ id: 'ficticio-2026', jurisdiction: 'ES-CT' });
    const overlap = ruleSet({ id: 'ficticio-solapado', validFrom: '2026-12-31', validTo: null });
    expect(validateRuleSets([y2026, dup, overlap])).toEqual([
      { kind: 'duplicate_id', ruleSetId: 'ficticio-2026' },
      { kind: 'overlap', ruleSetIds: ['ficticio-2026', 'ficticio-solapado'] },
    ]);
  });

  it('dos conjuntos abiertos (sin fin) en la misma jurisdicción se solapan', () => {
    const a = ruleSet({ id: 'a', validFrom: '2026-01-01', validTo: null });
    const b = ruleSet({ id: 'b', validFrom: '2030-01-01', validTo: null });
    expect(validateRuleSets([a, b])).toEqual([{ kind: 'overlap', ruleSetIds: ['a', 'b'] }]);
  });
});
