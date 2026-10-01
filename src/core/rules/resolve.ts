import type { IsoDate } from '../dates/iso-date';
import { err, ok, type Result } from '../result';
import { isInForce, type RuleSet } from './rule-set';

export type RulesResolutionError =
  | { readonly code: 'no_rules_for_date'; readonly date: IsoDate; readonly jurisdiction: string }
  | { readonly code: 'ambiguous_rules'; readonly ruleSetIds: readonly string[] }
  | { readonly code: 'unverified_rules'; readonly ruleSetId: string };

export interface ResolveRulesQuery {
  readonly date: IsoDate;
  /** Coincidencia EXACTA. Una calculadora que combine reglas estatales y
   *  autonómicas resuelve cada jurisdicción por separado. */
  readonly jurisdiction: string;
  /**
   * Por defecto solo se aceptan reglas verificadas. `true` únicamente en
   * tests o borradores; nunca en una calculadora publicada.
   */
  readonly allowUnverified?: boolean;
}

/** Devuelve el único conjunto de reglas vigente para la fecha y jurisdicción. */
export function resolveRules<T>(
  sets: readonly RuleSet<T>[],
  query: ResolveRulesQuery,
): Result<RuleSet<T>, RulesResolutionError> {
  const matches = sets.filter(
    (set) => set.jurisdiction === query.jurisdiction && isInForce(set, query.date),
  );

  const [match, ...others] = matches;
  if (match === undefined) {
    return err({ code: 'no_rules_for_date', date: query.date, jurisdiction: query.jurisdiction });
  }
  if (others.length > 0) {
    return err({ code: 'ambiguous_rules', ruleSetIds: matches.map((set) => set.id) });
  }
  if (match.status !== 'verified' && query.allowUnverified !== true) {
    return err({ code: 'unverified_rules', ruleSetId: match.id });
  }
  return ok(match);
}
