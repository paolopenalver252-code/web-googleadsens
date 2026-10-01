/** Integridad del registro REAL de calculadoras. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  validateCalculatorRegistry,
  type CalculatorEntry,
} from '@/core/calculator/registry-integrity';
import { publicationBlockers } from '@/core/sources/integrity';
import { buildCanonicalUrl } from '@/lib/seo/canonical';
import { sourceRegistry } from '@/sources/registry';

import { calculatorCategoryIds } from './categories';
import {
  calculatorPath,
  calculatorRegistry,
  findCalculatorEntry,
  publishedCalculators,
  unpublishedCalculatorPaths,
} from './registry';

describe('registro de calculadoras', () => {
  it('no tiene incidencias de integridad', () => {
    expect(validateCalculatorRegistry(calculatorRegistry, calculatorCategoryIds)).toEqual([]);
  });

  it('cada calculadora tiene su página en src/pages/<slug>.astro', () => {
    const missing = calculatorRegistry
      .map((entry) => entry.calculator.slug)
      .filter((slug) => !existsSync(resolve(process.cwd(), 'src/pages', `${slug}.astro`)));
    expect(missing).toEqual([]);
  });

  it('cada slug cumple la política de URL: minúsculas, kebab-case, sin barras ni extensión', () => {
    // Vercel distingue mayúsculas (/Calculadora-… da 404) y cleanUrls redirige
    // .html y la barra final a /<slug>: el slug tiene que ser ya la forma final.
    const invalid = calculatorRegistry
      .map((entry) => entry.calculator.slug)
      .filter((slug) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug));
    expect(invalid).toEqual([]);
  });

  it('calculatorPath es exactamente "/" + slug y coincide con el canonical', () => {
    for (const entry of calculatorRegistry) {
      const path = calculatorPath(entry.calculator);
      expect(path).toBe(`/${entry.calculator.slug}`);
      expect(new URL(buildCanonicalUrl('https://example.com', path)).pathname).toBe(path);
    }
    expect(calculatorPath({ slug: 'calculadora-interes-compuesto' })).toBe(
      '/calculadora-interes-compuesto',
    );
  });

  it('cada página usa los metadatos del registro (calculatorPageProps), no metadatos escritos a mano', () => {
    const handWritten = calculatorRegistry
      .map((entry) => ({
        id: entry.calculator.id,
        source: readFileSync(
          resolve(process.cwd(), 'src/pages', `${entry.calculator.slug}.astro`),
          'utf8',
        ),
      }))
      .filter(({ id, source }) => !source.includes(`calculatorPageProps('${id}')`))
      .map(({ id }) => id);
    expect(handWritten).toEqual([]);
  });

  it('ninguna calculadora publicada tiene bloqueos de fuentes (Definition of Done)', () => {
    const blocked = publishedCalculators()
      .map((entry) => ({
        id: entry.calculator.id,
        blockers: publicationBlockers(sourceRegistry, entry.calculator.id),
      }))
      .filter((item) => item.blockers.length > 0);
    expect(blocked).toEqual([]);
  });

  it('interés compuesto: publicada y apuntando a su página real', () => {
    const entry = findCalculatorEntry('compound-interest');
    expect(entry?.status).toBe('published');
    expect(entry?.calculator.slug).toBe('calculadora-interes-compuesto');
    expect(publishedCalculators().map((item) => item.calculator.id)).toEqual(['compound-interest']);
    expect(unpublishedCalculatorPaths()).toEqual([]);
  });

  it('ninguna entrada apunta a una página de prueba', () => {
    expect(calculatorRegistry.filter((entry) => entry.calculator.slug.includes('test'))).toEqual(
      [],
    );
  });

  it('findCalculatorEntry devuelve undefined para ids desconocidos', () => {
    expect(findCalculatorEntry('no-existe')).toBeUndefined();
  });
});

describe('búsquedas en el registro (entradas FICTICIAS)', () => {
  const entry = (id: string, status: CalculatorEntry['status']): CalculatorEntry => ({
    calculator: { id, slug: id, version: '1.0.0', related: [] },
    name: `Nombre ${id}`,
    heading: `Calculadora ${id}`,
    category: 'finanzas',
    seo: { title: `Título ${id}`, description: `Descripción ${id}.` },
    status,
  });
  const registry = [entry('a', 'published'), entry('b', 'draft'), entry('c', 'published')];

  it('findCalculatorEntry encuentra por id', () => {
    expect(findCalculatorEntry('b', registry)?.name).toBe('Nombre b');
    expect(findCalculatorEntry('z', registry)).toBeUndefined();
  });

  it('publishedCalculators excluye los borradores y conserva el orden', () => {
    expect(publishedCalculators(registry).map((item) => item.calculator.id)).toEqual(['a', 'c']);
  });

  it('unpublishedCalculatorPaths devuelve las rutas de los borradores', () => {
    expect(unpublishedCalculatorPaths(registry)).toEqual(['/b']);
  });
});
