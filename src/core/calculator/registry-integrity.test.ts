import { describe, expect, it } from 'vitest';

import type { CalculatorMetadata } from './definition';
import { validateCalculatorRegistry, type CalculatorEntry } from './registry-integrity';

const CATEGORIES: ReadonlySet<string> = new Set(['finanzas']);

const meta = (id: string, related: readonly string[] = [], slug = id): CalculatorMetadata => ({
  id,
  slug,
  version: '1.0.0',
  related,
});

const entry = (
  calculator: CalculatorMetadata,
  status: CalculatorEntry['status'] = 'published',
): CalculatorEntry => ({
  calculator,
  name: `Nombre de ${calculator.id}`,
  heading: `Calculadora de ${calculator.id}`,
  category: 'finanzas',
  seo: {
    title: `Título de ${calculator.id}`,
    description: `Descripción de ${calculator.id}.`,
  },
  status,
});

const validate = (entries: readonly CalculatorEntry[]) =>
  validateCalculatorRegistry(entries, CATEGORIES);

describe('validateCalculatorRegistry', () => {
  it('un registro coherente no tiene incidencias', () => {
    expect(validate([entry(meta('a', ['b'])), entry(meta('b', ['a']))])).toEqual([]);
  });

  it('detecta ids y slugs duplicados, slugs reservados y nombres vacíos', () => {
    expect(
      validate([
        entry(meta('a')),
        { ...entry(meta('a', [], 'otro-slug')), seo: { title: 'T2', description: 'D2' } },
        { ...entry(meta('c', [], 'a')), seo: { title: 'T3', description: 'D3' } },
        entry(meta('d', [], '404')),
        { ...entry(meta('e')), name: ' ' },
      ]),
    ).toEqual([
      { kind: 'duplicate_id', id: 'a' },
      { kind: 'duplicate_slug', slug: 'a' },
      { kind: 'reserved_slug', slug: '404' },
      { kind: 'empty_field', id: 'e', field: 'name' },
    ]);
  });

  it('el futuro listado /calculadoras está reservado', () => {
    expect(validate([entry(meta('x', [], 'calculadoras'))])).toEqual([
      { kind: 'reserved_slug', slug: 'calculadoras' },
    ]);
  });

  it('detecta H1, title o description vacíos y categorías desconocidas', () => {
    expect(
      validate([
        {
          ...entry(meta('a')),
          heading: '',
          category: 'salud',
          seo: { title: ' ', description: '' },
        },
      ]),
    ).toEqual([
      { kind: 'empty_field', id: 'a', field: 'heading' },
      { kind: 'empty_field', id: 'a', field: 'seo.title' },
      { kind: 'empty_field', id: 'a', field: 'seo.description' },
      { kind: 'unknown_category', id: 'a', category: 'salud' },
    ]);
  });

  it('detecta titles y descriptions repetidos (sin distinguir mayúsculas)', () => {
    const shared = { title: 'Mismo título', description: 'Misma descripción.' };
    expect(
      validate([
        { ...entry(meta('a')), seo: shared },
        { ...entry(meta('b')), seo: { title: 'MISMO TÍTULO', description: shared.description } },
      ]),
    ).toEqual([
      { kind: 'duplicate_title', title: 'MISMO TÍTULO' },
      { kind: 'duplicate_description', description: 'Misma descripción.' },
    ]);
  });

  it('detecta relaciones rotas y enlaces de páginas publicadas a borradores', () => {
    expect(
      validate([entry(meta('a', ['no-existe', 'borrador'])), entry(meta('borrador'), 'draft')]),
    ).toEqual([
      { kind: 'unknown_related', id: 'a', related: 'no-existe' },
      { kind: 'related_to_draft', id: 'a', related: 'borrador' },
    ]);
  });

  it('un borrador sí puede enlazar a otro borrador', () => {
    expect(validate([entry(meta('a', ['b']), 'draft'), entry(meta('b'), 'draft')])).toEqual([]);
  });
});
