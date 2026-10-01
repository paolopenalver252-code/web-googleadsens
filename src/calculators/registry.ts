/**
 * Registro de calculadoras del sitio (ver docs/calculator-definition-of-done.md).
 *
 * Es la fuente de verdad de cada calculadora en el sitio: estado, categoría,
 * nombre, H1 y metadatos SEO. La página los lee de aquí
 * (src/lib/seo/calculator-page.ts), igual que la portada, el sitemap y las
 * calculadoras relacionadas, así que nunca divergen (ADR 0009).
 *
 * Cada entrada apunta a su página real, src/pages/<slug>.astro. Un borrador
 * (`draft`) tiene página, pero no aparece en la portada ni en el sitemap y se
 * marca noindex. Una calculadora solo pasa a `published` cuando cumple la
 * Definition of Done, incluidas fuentes verificadas (src/calculators/registry.test.ts
 * lo comprueba).
 */
import type { CalculatorEntry } from '@/core/calculator/registry-integrity';

import type { CalculatorCategoryId } from './categories';
import { compoundInterest } from './compound-interest/definition';

/** Entrada del sitio: la categoría se comprueba en tiempo de compilación. */
export type SiteCalculatorEntry = CalculatorEntry & { readonly category: CalculatorCategoryId };

export const calculatorRegistry: readonly SiteCalculatorEntry[] = [
  {
    calculator: compoundInterest,
    name: 'Interés compuesto',
    heading: 'Calculadora de interés compuesto',
    category: 'finanzas',
    seo: {
      title: 'Calculadora de interés compuesto',
      description:
        'Calcula cómo puede evolucionar un capital con interés compuesto y aportaciones periódicas, con TIN o tipo efectivo anual, varias frecuencias y tabla año a año.',
    },
    // Borrador: fuentes sin verificar y aviso pendiente de revisión legal.
    status: 'draft',
  },
];

/** `registry` es inyectable en tests; por defecto, el registro real. */
export function findCalculatorEntry(
  id: string,
  registry: readonly CalculatorEntry[] = calculatorRegistry,
): CalculatorEntry | undefined {
  return registry.find((entry) => entry.calculator.id === id);
}

/** `registry` es inyectable en tests; por defecto, el registro real. */
export function publishedCalculators(
  registry: readonly CalculatorEntry[] = calculatorRegistry,
): readonly CalculatorEntry[] {
  return registry.filter((entry) => entry.status === 'published');
}

/**
 * Rutas de las calculadoras aún no publicadas. astro.config.ts las excluye
 * del sitemap. `registry` es inyectable en tests.
 */
export function unpublishedCalculatorPaths(
  registry: readonly CalculatorEntry[] = calculatorRegistry,
): readonly string[] {
  return registry
    .filter((entry) => entry.status !== 'published')
    .map((entry) => `/${entry.calculator.slug}`);
}
