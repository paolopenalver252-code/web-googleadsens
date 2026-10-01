/**
 * Props de la página de una calculadora, derivadas SOLO del registro
 * (ADR 0009). Una página nueva no escribe a mano title, description, ruta,
 * robots, H1 ni migas de pan:
 *
 *   <CalculatorLayout {...calculatorPageProps('compound-interest')}>
 *
 * Así una calculadora en borrador nunca puede quedar indexable por olvido:
 * `noindex` sale de `status`.
 */
import { calculatorRegistry, findCalculatorEntry } from '@/calculators/registry';
import type { CalculatorMetadata } from '@/core/calculator/definition';
import type { CalculatorEntry } from '@/core/calculator/registry-integrity';

import type { PageMetaInput } from './meta';
import type { BreadcrumbItem } from './schema/breadcrumb';

export interface CalculatorPageProps {
  readonly page: PageMetaInput;
  readonly heading: string;
  readonly breadcrumbs: readonly BreadcrumbItem[];
  readonly calculator: CalculatorMetadata;
}

/** Nombre de la primera miga (la portada). */
const HOME_CRUMB = 'Inicio';

export function calculatorPageProps(
  id: string,
  registry: readonly CalculatorEntry[] = calculatorRegistry,
): CalculatorPageProps {
  const entry = findCalculatorEntry(id, registry);
  if (entry === undefined) throw new Error(`Calculadora no registrada: "${id}"`);
  const path = `/${entry.calculator.slug}`;
  return {
    page: {
      title: entry.seo.title,
      description: entry.seo.description,
      path,
      noindex: entry.status !== 'published',
    },
    heading: entry.heading,
    // Sin miga de categoría mientras no exista su página: una miga siempre
    // enlaza a una URL real (ADR 0009).
    breadcrumbs: [
      { name: HOME_CRUMB, path: '/' },
      { name: entry.heading, path },
    ],
    calculator: entry.calculator,
  };
}
