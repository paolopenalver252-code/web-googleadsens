import type { CalculatorMetadata } from './definition';

/**
 * `draft`: tiene página, pero es `noindex`, no entra en el sitemap ni en los
 * listados y no puede ser destino de enlaces desde una página publicada.
 * `published`: indexable, en el sitemap y en los listados. Pasar a
 * `published` es siempre un cambio explícito en el registro
 * (docs/calculator-definition-of-done.md); nunca ocurre por crear archivos.
 */
export type CalculatorStatus = 'draft' | 'published';

/** Metadatos SEO propios de la página de una calculadora. */
export interface CalculatorSeo {
  /** <title>, sin el nombre del sitio (lo añade buildPageMeta). Único en el sitio. */
  readonly title: string;
  /** Meta description, escrita para el usuario. Única en el sitio. */
  readonly description: string;
}

export interface CalculatorEntry {
  readonly calculator: CalculatorMetadata;
  /** Nombre corto para enlaces internos y listados ("Interés compuesto"). */
  readonly name: string;
  /** H1 de la página y última miga de pan. */
  readonly heading: string;
  /** Id de una categoría registrada (src/calculators/categories.ts). */
  readonly category: string;
  readonly seo: CalculatorSeo;
  readonly status: CalculatorStatus;
}

export type CalculatorRegistryIssue =
  | { readonly kind: 'duplicate_id'; readonly id: string }
  | { readonly kind: 'duplicate_slug'; readonly slug: string }
  | { readonly kind: 'reserved_slug'; readonly slug: string }
  | { readonly kind: 'unknown_related'; readonly id: string; readonly related: string }
  | { readonly kind: 'related_to_draft'; readonly id: string; readonly related: string }
  | { readonly kind: 'empty_field'; readonly id: string; readonly field: string }
  | { readonly kind: 'unknown_category'; readonly id: string; readonly category: string }
  | { readonly kind: 'duplicate_title'; readonly title: string }
  | { readonly kind: 'duplicate_description'; readonly description: string };

/** Slugs que colisionarían con archivos o rutas del sitio. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  '404',
  'index',
  'robots',
  'sitemap-index',
  'sitemap-0',
  'test-harness',
  '_astro',
  // Reservado para un futuro listado de calculadoras (ADR 0009).
  'calculadoras',
  // Páginas legales (src/config/legal.ts).
  'aviso-legal',
  'privacidad',
  'cookies',
]);

export function validateCalculatorRegistry(
  entries: readonly CalculatorEntry[],
  knownCategories: ReadonlySet<string>,
): readonly CalculatorRegistryIssue[] {
  const issues: CalculatorRegistryIssue[] = [];
  const byId = new Map(entries.map((entry) => [entry.calculator.id, entry]));
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const entry of entries) {
    const { calculator, status } = entry;
    const id = calculator.id;
    if (ids.has(id)) issues.push({ kind: 'duplicate_id', id });
    ids.add(id);
    if (slugs.has(calculator.slug)) issues.push({ kind: 'duplicate_slug', slug: calculator.slug });
    slugs.add(calculator.slug);
    if (RESERVED_SLUGS.has(calculator.slug)) {
      issues.push({ kind: 'reserved_slug', slug: calculator.slug });
    }

    const texts = {
      name: entry.name,
      heading: entry.heading,
      'seo.title': entry.seo.title,
      'seo.description': entry.seo.description,
    };
    for (const [field, value] of Object.entries(texts)) {
      if (value.trim() === '') issues.push({ kind: 'empty_field', id, field });
    }
    if (!knownCategories.has(entry.category)) {
      issues.push({ kind: 'unknown_category', id, category: entry.category });
    }

    // Un title o una description repetidos describen dos páginas como la misma.
    const title = entry.seo.title.trim().toLowerCase();
    if (title !== '' && titles.has(title)) {
      issues.push({ kind: 'duplicate_title', title: entry.seo.title });
    }
    titles.add(title);
    const description = entry.seo.description.trim().toLowerCase();
    if (description !== '' && descriptions.has(description)) {
      issues.push({ kind: 'duplicate_description', description: entry.seo.description });
    }
    descriptions.add(description);

    for (const related of calculator.related) {
      const target = byId.get(related);
      if (target === undefined) {
        issues.push({ kind: 'unknown_related', id, related });
      } else if (status === 'published' && target.status !== 'published') {
        // Una página publicada no puede enlazar a una calculadora sin publicar.
        issues.push({ kind: 'related_to_draft', id, related });
      }
    }
  }
  return issues;
}
