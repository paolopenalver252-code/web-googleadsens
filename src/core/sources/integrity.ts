/**
 * Comprobaciones de integridad del registro de fuentes. Se ejecutan en los
 * tests (src/sources/registry.test.ts) y en el build (SourceList lanza si
 * una referencia no existe), de modo que un error de fuentes nunca llega a
 * producción en silencio.
 */
import { compareIsoDates, isoDateParts, type IsoDate } from '../dates/iso-date';
import { isJurisdictionCode } from '../jurisdiction';
import { SOURCE_TYPES, type SourceRecord } from './types';

export type SourceIssue =
  | { readonly kind: 'duplicate_id'; readonly sourceId: string }
  | { readonly kind: 'invalid_id'; readonly sourceId: string }
  | { readonly kind: 'invalid_url'; readonly sourceId: string }
  | { readonly kind: 'invalid_jurisdiction'; readonly sourceId: string }
  | { readonly kind: 'empty_field'; readonly sourceId: string; readonly field: string }
  | { readonly kind: 'invalid_period'; readonly sourceId: string }
  | { readonly kind: 'verified_without_dates'; readonly sourceId: string }
  | { readonly kind: 'reviewed_before_accessed'; readonly sourceId: string }
  | { readonly kind: 'no_supports'; readonly sourceId: string }
  | {
      readonly kind: 'unknown_calculator';
      readonly sourceId: string;
      readonly calculatorId: string;
    };

const SOURCE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Validación de formato sin depender de la API URL (el core no usa DOM/Node).
const HTTPS_URL =
  /^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d+)?(?:[/?#]\S*)?$/i;

export function validateSourceRegistry(
  sources: readonly SourceRecord[],
  knownCalculatorIds: ReadonlySet<string>,
): readonly SourceIssue[] {
  const issues: SourceIssue[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    const sourceId = source.id;
    if (seen.has(sourceId)) issues.push({ kind: 'duplicate_id', sourceId });
    seen.add(sourceId);

    if (!SOURCE_ID.test(sourceId)) issues.push({ kind: 'invalid_id', sourceId });
    if (!HTTPS_URL.test(source.url)) issues.push({ kind: 'invalid_url', sourceId });
    if (!isJurisdictionCode(source.jurisdiction)) {
      issues.push({ kind: 'invalid_jurisdiction', sourceId });
    }
    if (!(SOURCE_TYPES as readonly string[]).includes(source.type)) {
      issues.push({ kind: 'empty_field', sourceId, field: 'type' });
    }
    for (const field of ['title', 'publisher'] as const) {
      if (source[field].trim() === '') issues.push({ kind: 'empty_field', sourceId, field });
    }
    if (
      source.appliesTo?.to != null &&
      compareIsoDates(source.appliesTo.to, source.appliesTo.from) < 0
    ) {
      issues.push({ kind: 'invalid_period', sourceId });
    }
    if (
      source.status === 'verified' &&
      (source.accessedAt === null || source.reviewedAt === null)
    ) {
      issues.push({ kind: 'verified_without_dates', sourceId });
    }
    if (
      source.accessedAt !== null &&
      source.reviewedAt !== null &&
      compareIsoDates(source.reviewedAt, source.accessedAt) < 0
    ) {
      issues.push({ kind: 'reviewed_before_accessed', sourceId });
    }
    if (source.supports.length === 0) issues.push({ kind: 'no_supports', sourceId });
    for (const support of source.supports) {
      if (!knownCalculatorIds.has(support.calculatorId)) {
        issues.push({ kind: 'unknown_calculator', sourceId, calculatorId: support.calculatorId });
      }
    }
  }
  return issues;
}

/** Ids referenciados (desde reglas, políticas de redondeo, contenido…) que no existen. */
export function findMissingSourceIds(
  sources: readonly SourceRecord[],
  referencedIds: Iterable<string>,
): readonly string[] {
  const known = new Set(sources.map((source) => source.id));
  return [...new Set(referencedIds)].filter((id) => !known.has(id));
}

/** Resuelve ids a registros. Lanza si alguno no existe: una referencia rota es un error de build. */
export function resolveSourceIds(
  sources: readonly SourceRecord[],
  ids: readonly string[],
): readonly SourceRecord[] {
  const missing = findMissingSourceIds(sources, ids);
  if (missing.length > 0) {
    throw new Error(`Referencias a fuentes inexistentes: ${missing.join(', ')}`);
  }
  return sortByPriority(sources.filter((source) => ids.includes(source.id)));
}

/** Fuentes que respaldan alguna parte de una calculadora, ordenadas por autoridad. */
export function sourcesForCalculator(
  sources: readonly SourceRecord[],
  calculatorId: string,
): readonly SourceRecord[] {
  return sortByPriority(
    sources.filter((source) => source.supports.some((s) => s.calculatorId === calculatorId)),
  );
}

export function sortByPriority(sources: readonly SourceRecord[]): readonly SourceRecord[] {
  return [...sources].sort(
    (a, b) =>
      SOURCE_TYPES.indexOf(a.type) - SOURCE_TYPES.indexOf(b.type) || a.id.localeCompare(b.id),
  );
}

/**
 * Condición para publicar una calculadora: al menos una fuente que la
 * respalde y todas sus fuentes verificadas. Devuelve los motivos de bloqueo.
 */
export function publicationBlockers(
  sources: readonly SourceRecord[],
  calculatorId: string,
): readonly string[] {
  const supporting = sourcesForCalculator(sources, calculatorId);
  if (supporting.length === 0) return ['sin fuentes que respalden la calculadora'];
  return supporting
    .filter((source) => source.status !== 'verified')
    .map((source) => `fuente no verificada: ${source.id}`);
}

/** Fuentes verificadas cuya última revisión es anterior a `today - maxAgeDays`. */
export function findStaleSources(
  sources: readonly SourceRecord[],
  today: IsoDate,
  maxAgeDays: number,
): readonly SourceRecord[] {
  const todayMs = isoToUtcMs(today);
  return sources.filter(
    (source) =>
      source.reviewedAt !== null &&
      (todayMs - isoToUtcMs(source.reviewedAt)) / 86_400_000 > maxAgeDays,
  );
}

function isoToUtcMs(date: IsoDate): number {
  const { year, month, day } = isoDateParts(date);
  return Date.UTC(year, month - 1, day);
}
