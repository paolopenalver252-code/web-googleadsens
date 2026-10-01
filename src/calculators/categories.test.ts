import { describe, expect, it } from 'vitest';

import type { CalculatorEntry } from '@/core/calculator/registry-integrity';

import { calculatorCategories, calculatorCategoryIds, publishedByCategory } from './categories';
import { calculatorRegistry } from './registry';

const entry = (
  id: string,
  category: string,
  status: CalculatorEntry['status'],
): CalculatorEntry => ({
  calculator: { id, slug: id, version: '1.0.0', related: [] },
  name: `Nombre ${id}`,
  heading: `Calculadora ${id}`,
  category,
  seo: { title: `Título ${id}`, description: `Descripción ${id}.` },
  status,
});

describe('categorías', () => {
  it('ids únicos en kebab-case', () => {
    const ids = calculatorCategories.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect([...calculatorCategoryIds]).toEqual(ids);
  });

  it('no hay categorías vacías: cada una tiene al menos una calculadora registrada', () => {
    const used = new Set(calculatorRegistry.map((item) => item.category));
    expect(calculatorCategories.filter((category) => !used.has(category.id))).toEqual([]);
  });

  it('publishedByCategory agrupa solo publicadas, en orden, y omite grupos vacíos', () => {
    const categories = [
      { id: 'finanzas', name: 'Finanzas' },
      { id: 'salud', name: 'Salud' },
      { id: 'tiempo', name: 'Tiempo' },
    ];
    const registry = [
      entry('a', 'tiempo', 'published'),
      entry('b', 'finanzas', 'draft'),
      entry('c', 'finanzas', 'published'),
      entry('d', 'tiempo', 'published'),
      entry('e', 'salud', 'draft'),
    ];
    expect(
      publishedByCategory(registry, categories).map((group) => ({
        category: group.category.id,
        ids: group.entries.map((item) => item.calculator.id),
      })),
    ).toEqual([
      { category: 'finanzas', ids: ['c'] },
      { category: 'tiempo', ids: ['a', 'd'] },
    ]);
  });

  it('con el registro real, Finanzas lista la calculadora de interés compuesto', () => {
    expect(
      publishedByCategory(calculatorRegistry).map((group) => ({
        category: group.category.id,
        ids: group.entries.map((item) => item.calculator.id),
      })),
    ).toEqual([{ category: 'finanzas', ids: ['compound-interest'] }]);
  });
});
