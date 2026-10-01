/**
 * Categorías temáticas de las calculadoras (ADR 0009).
 *
 * Solo se declara una categoría cuando existe al menos una calculadora que
 * pertenece a ella: no hay categorías vacías "por si acaso". Una categoría
 * organiza los listados y el enlazado interno; NO crea una página por sí
 * misma. La página de categoría (/calculadoras/<id>) solo se creará cuando
 * cumpla el criterio de ADR 0009 (calculadoras publicadas suficientes y una
 * introducción editorial propia).
 */
import type { CalculatorEntry } from '@/core/calculator/registry-integrity';

export interface CalculatorCategory {
  /** kebab-case estable; será el segmento de URL de su futura página. */
  readonly id: string;
  /** Nombre visible ("Finanzas"). */
  readonly name: string;
}

export const calculatorCategories = [
  { id: 'finanzas', name: 'Finanzas' },
] as const satisfies readonly CalculatorCategory[];

export type CalculatorCategoryId = (typeof calculatorCategories)[number]['id'];

export const calculatorCategoryIds: ReadonlySet<string> = new Set(
  calculatorCategories.map((category) => category.id),
);

export interface CategoryGroup {
  readonly category: CalculatorCategory;
  readonly entries: readonly CalculatorEntry[];
}

/**
 * Agrupa las calculadoras PUBLICADAS por categoría, en el orden de
 * `categories` y, dentro de cada una, en el del registro. Omite las
 * categorías sin calculadoras publicadas: nunca se lista una sección vacía.
 */
export function publishedByCategory(
  registry: readonly CalculatorEntry[],
  categories: readonly CalculatorCategory[] = calculatorCategories,
): readonly CategoryGroup[] {
  return categories
    .map((category) => ({
      category,
      entries: registry.filter(
        (entry) => entry.status === 'published' && entry.category === category.id,
      ),
    }))
    .filter((group) => group.entries.length > 0);
}
