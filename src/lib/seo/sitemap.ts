/**
 * Qué páginas entran en el sitemap (ADR 0005 y 0009). Solo contenido
 * indexable: nunca calculadoras en borrador ni rutas de prueba. Las rutas de
 * las calculadoras salen de calculatorPath() vía unpublishedCalculatorPaths,
 * así que el sitemap no puede divergir de la URL real de la página.
 *
 * astro.config.ts usa createSitemapFilter con el registro real; los tests,
 * con registros ficticios (p. ej. una segunda calculadora).
 */
import { calculatorRegistry, unpublishedCalculatorPaths } from '@/calculators/registry';
import type { CalculatorEntry } from '@/core/calculator/registry-integrity';

export interface SitemapFilterOptions {
  /** Prefijos de ruta que nunca se publican (p. ej. "/test-harness/"). */
  readonly excludedPrefixes: readonly string[];
  /** Inyectable en tests; por defecto, el registro real. */
  readonly registry?: readonly CalculatorEntry[];
}

export function createSitemapFilter(options: SitemapFilterOptions): (page: string) => boolean {
  const unpublished = new Set(unpublishedCalculatorPaths(options.registry ?? calculatorRegistry));
  const excluded = options.excludedPrefixes.map((prefix) => prefix.replace(/\/+$/, ''));
  return (page) => {
    const pathname = new URL(page).pathname.replace(/\/+$/, '') || '/';
    const isExcluded = excluded.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    return !isExcluded && !unpublished.has(pathname);
  };
}
