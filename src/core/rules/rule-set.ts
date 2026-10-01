/**
 * Conjuntos de reglas versionados por fecha de vigencia.
 * Decisión: docs/adr/0002-arquitectura.md (sección "Reglas versionadas").
 *
 * Convención de archivos para una calculadora que dependa de normativa:
 *
 *   src/calculators/<id>/rules/<jurisdicción>/<validFrom>.ts
 *   p. ej. src/calculators/iva/rules/ES/2026-01-01.ts
 *
 * Un conjunto publicado es INMUTABLE: si la norma cambia se crea un conjunto
 * nuevo con su propia vigencia; si hay que corregir un error, se crea uno que
 * lo sustituye y se documenta en su `notes`. Así los cálculos de ejercicios
 * anteriores siguen siendo reproducibles.
 *
 * Vigencia: `validFrom` y `validTo` son INCLUSIVOS (días de calendario).
 * `validTo: null` = vigente sin fecha de fin conocida.
 */
import { compareIsoDates, toIsoDate, type IsoDate } from '../dates/iso-date';
import { isJurisdictionCode } from '../jurisdiction';

export type RuleStatus = 'verified' | 'unverified';

export interface RuleSet<T> {
  readonly id: string;
  readonly jurisdiction: string;
  readonly validFrom: IsoDate;
  readonly validTo: IsoDate | null;
  /** Ids del registro de fuentes (src/sources/registry.ts). */
  readonly sources: readonly string[];
  readonly status: RuleStatus;
  readonly data: T;
  readonly notes?: string;
}

export interface RuleSetInput<T> {
  readonly id: string;
  readonly jurisdiction: string;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly sources: readonly string[];
  readonly status: RuleStatus;
  readonly data: T;
  readonly notes?: string;
}

const RULE_SET_ID = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;

/** Valida y congela un conjunto de reglas. Lanza ante datos incoherentes. */
export function defineRuleSet<T>(input: RuleSetInput<T>): RuleSet<T> {
  if (!RULE_SET_ID.test(input.id)) throw new Error(`Id de reglas inválido: "${input.id}"`);
  if (!isJurisdictionCode(input.jurisdiction)) {
    throw new Error(`Reglas "${input.id}": jurisdicción inválida "${input.jurisdiction}"`);
  }
  const validFrom = toIsoDate(input.validFrom);
  const validTo = input.validTo === null ? null : toIsoDate(input.validTo);
  if (validTo !== null && compareIsoDates(validTo, validFrom) < 0) {
    throw new Error(`Reglas "${input.id}": validTo es anterior a validFrom`);
  }
  if (input.status === 'verified' && input.sources.length === 0) {
    throw new Error(`Reglas "${input.id}": no pueden estar verificadas sin fuentes`);
  }
  return Object.freeze({
    id: input.id,
    jurisdiction: input.jurisdiction,
    validFrom,
    validTo,
    sources: Object.freeze([...input.sources]),
    status: input.status,
    data: input.data,
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  });
}

export type RuleSetIssue =
  | { readonly kind: 'duplicate_id'; readonly ruleSetId: string }
  | { readonly kind: 'overlap'; readonly ruleSetIds: readonly [string, string] };

/** Detecta ids duplicados y vigencias solapadas dentro de la misma jurisdicción. */
export function validateRuleSets(sets: readonly RuleSet<unknown>[]): readonly RuleSetIssue[] {
  const issues: RuleSetIssue[] = [];
  const seen = new Set<string>();
  for (const set of sets) {
    if (seen.has(set.id)) issues.push({ kind: 'duplicate_id', ruleSetId: set.id });
    seen.add(set.id);
  }
  sets.forEach((a, index) => {
    for (const b of sets.slice(index + 1)) {
      if (a.jurisdiction === b.jurisdiction && periodsOverlap(a, b)) {
        issues.push({ kind: 'overlap', ruleSetIds: [a.id, b.id] });
      }
    }
  });
  return issues;
}

export function isInForce(set: RuleSet<unknown>, date: IsoDate): boolean {
  return (
    compareIsoDates(set.validFrom, date) <= 0 &&
    (set.validTo === null || compareIsoDates(date, set.validTo) <= 0)
  );
}

function periodsOverlap(a: RuleSet<unknown>, b: RuleSet<unknown>): boolean {
  const aEndsBeforeB = a.validTo !== null && compareIsoDates(a.validTo, b.validFrom) < 0;
  const bEndsBeforeA = b.validTo !== null && compareIsoDates(b.validTo, a.validFrom) < 0;
  return !aEndsBeforeB && !bEndsBeforeA;
}
