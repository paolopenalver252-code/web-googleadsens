import type { RuleSet } from '@/core/rules/rule-set';
import { formatIsoDate } from '@/i18n/format';
import type { LocaleDefinition } from '@/i18n/types';

export interface RulesVersionBadgeProps {
  readonly ruleSet: Pick<RuleSet<unknown>, 'validFrom' | 'validTo' | 'jurisdiction' | 'status'>;
  readonly locale: LocaleDefinition;
}

/**
 * Indica qué conjunto de reglas se ha aplicado. Es un componente Preact
 * porque las reglas vigentes dependen de la fecha del usuario (se resuelven
 * en el navegador), no de la fecha del build.
 */
export function RulesVersionBadge({ ruleSet, locale }: RulesVersionBadgeProps) {
  const { ui, jurisdictions } = locale.messages;
  const text = ui.rulesApplied({
    from: formatIsoDate(ruleSet.validFrom, locale),
    to: ruleSet.validTo === null ? null : formatIsoDate(ruleSet.validTo, locale),
    jurisdiction: jurisdictions[ruleSet.jurisdiction] ?? ruleSet.jurisdiction,
  });
  return (
    <p class="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card bg-surface-muted px-3 py-1.5 text-sm text-muted">
      <span>{text}</span>
      {ruleSet.status === 'verified' ? null : (
        <strong class="font-semibold text-warning">{ui.unverified}</strong>
      )}
    </p>
  );
}
