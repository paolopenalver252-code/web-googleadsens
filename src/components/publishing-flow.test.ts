/**
 * Escalabilidad y publicación (ADR 0009): registrar una SEGUNDA calculadora
 * (ficticia) junto al registro real y pasarla de `draft` a `published` sin
 * tocar ninguna pieza global. Todo lo que ve el público se deriva del
 * registro: portada y categoría (CalculatorDirectory), sitemap
 * (createSitemapFilter), robots/canonical/Open Graph (calculatorPageProps +
 * buildPageMeta), enlaces relacionados y permiso de anuncios.
 *
 * Es una prueba de integración con el Container API de Astro y no un E2E de
 * navegador: el registro se resuelve en el build, así que comprobar ambos
 * estados en un navegador exigiría dos builds con registros distintos.
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument --
   El servicio de TypeScript de ESLint no resuelve los tipos de los imports
   .astro (los ve como error). astro check sí los verifica (npm run typecheck). */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';

import { calculatorCategoryIds } from '@/calculators/categories';
import { calculatorPath, calculatorRegistry } from '@/calculators/registry';
import {
  validateCalculatorRegistry,
  type CalculatorEntry,
} from '@/core/calculator/registry-integrity';
import { calculatorPageProps } from '@/lib/seo/calculator-page';
import { buildPageMeta, type SiteMetaContext } from '@/lib/seo/meta';
import { createSitemapFilter } from '@/lib/seo/sitemap';

import CalculatorDirectory from './calculator/CalculatorDirectory.astro';
import RelatedCalculators from './calculator/RelatedCalculators.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const dom = (html: string) => new JSDOM(`<body>${html}</body>`).window.document;

/** Despliegue de producción con dominio definitivo (ficticio): el único caso indexable. */
const PRODUCTION: SiteMetaContext = {
  siteUrl: 'https://midominio.example',
  siteName: 'Calculadoras',
  ogLocale: 'es_ES',
  indexable: true,
};

const second = (status: CalculatorEntry['status']): CalculatorEntry => ({
  calculator: { id: 'segunda', slug: 'calculadora-segunda', version: '1.0.0', related: [] },
  name: 'Segunda calculadora',
  heading: 'Calculadora segunda',
  category: 'finanzas',
  seo: {
    title: 'Calculadora segunda (ficticia)',
    description: 'Descripción única de la segunda calculadora ficticia.',
  },
  status,
});

/** El registro real + la segunda calculadora: lo ÚNICO que cambia al añadirla. */
const registryWith = (status: CalculatorEntry['status']) => [...calculatorRegistry, second(status)];

const PATH = '/calculadora-segunda';
const sitemapAccepts = (registry: readonly CalculatorEntry[]) =>
  createSitemapFilter({ excludedPrefixes: ['/test-harness/'], registry })(
    `${PRODUCTION.siteUrl}${PATH}`,
  );

async function directoryLinks(registry: readonly CalculatorEntry[]) {
  const doc = dom(await container.renderToString(CalculatorDirectory, { props: { registry } }));
  return {
    categories: [...doc.querySelectorAll('h3')].map((heading) => heading.textContent),
    hrefs: [...doc.querySelectorAll('a')].map((link) => link.getAttribute('href')),
  };
}

describe('segunda calculadora: draft → published sin tocar la infraestructura', () => {
  it('la ruta sale de calculatorPath, igual en página, portada y sitemap', () => {
    expect(calculatorPath(second('draft').calculator)).toBe(PATH);
    expect(calculatorPageProps('segunda', registryWith('draft')).page.path).toBe(PATH);
  });

  it('draft: registro válido, pero noindex, sin anuncios, fuera de portada y de sitemap', async () => {
    const registry = registryWith('draft');
    expect(validateCalculatorRegistry(registry, calculatorCategoryIds)).toEqual([]);

    const props = calculatorPageProps('segunda', registry);
    const meta = buildPageMeta(props.page, PRODUCTION);
    expect(meta.robots).toBe('noindex, nofollow');
    expect(props.monetizable).toBe(false);

    // La portada solo lista la calculadora real (publicada), nunca el borrador.
    expect((await directoryLinks(registry)).hrefs).not.toContain(PATH);
    expect(sitemapAccepts(registry)).toBe(false);
  });

  it('draft: una página publicada no puede enlazarla como relacionada', () => {
    const linking: CalculatorEntry = {
      ...second('published'),
      calculator: {
        id: 'tercera',
        slug: 'calculadora-tercera',
        version: '1.0.0',
        related: ['segunda'],
      },
      seo: { title: 'Tercera', description: 'Tercera.' },
    };
    expect(
      validateCalculatorRegistry([...registryWith('draft'), linking], calculatorCategoryIds),
    ).toContainEqual({ kind: 'related_to_draft', id: 'tercera', related: 'segunda' });
  });

  it('published: indexable, canonical exacto, en portada bajo su categoría, en sitemap y con anuncios permitidos', async () => {
    const registry = registryWith('published');
    expect(validateCalculatorRegistry(registry, calculatorCategoryIds)).toEqual([]);

    const props = calculatorPageProps('segunda', registry);
    const meta = buildPageMeta(props.page, PRODUCTION);
    expect(meta).toMatchObject({
      title: 'Calculadora segunda (ficticia) · Calculadoras',
      description: 'Descripción única de la segunda calculadora ficticia.',
      robots: 'index, follow',
      canonical: `${PRODUCTION.siteUrl}${PATH}`,
      openGraph: { type: 'website', url: `${PRODUCTION.siteUrl}${PATH}` },
    });
    expect(props.monetizable).toBe(true);
    expect(props.breadcrumbs.at(-1)).toEqual({ name: 'Calculadora segunda', path: PATH });

    expect(await directoryLinks(registry)).toEqual({
      categories: ['Finanzas'],
      hrefs: ['/calculadora-interes-compuesto', PATH],
    });
    expect(sitemapAccepts(registry)).toBe(true);
  });

  it('published: otra calculadora puede enlazarla como relacionada, con la misma ruta', async () => {
    const doc = dom(
      await container.renderToString(RelatedCalculators, {
        props: { ids: ['segunda'], registry: registryWith('published') },
      }),
    );
    expect(doc.querySelector('a')?.getAttribute('href')).toBe(PATH);
  });

  it('añadir otra calculadora no cambia el estado de la real (publicada)', () => {
    for (const status of ['draft', 'published'] as const) {
      const real = registryWith(status).find((item) => item.calculator.id === 'compound-interest');
      expect(real?.status).toBe('published');
    }
  });
});
