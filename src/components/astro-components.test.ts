/**
 * Componentes .astro renderizados con el Container API de Astro (sin
 * navegador). Comprueba el HTML estático que se publica.
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument --
   El servicio de TypeScript de ESLint no resuelve los tipos de los imports
   .astro (los ve como error). stro check sí los verifica (npm run typecheck). */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { beforeAll, describe, expect, it } from 'vitest';

import type { AdsConfig, ConsentConfig } from '@/config/features';
import type { CalculatorEntry } from '@/core/calculator/registry-integrity';
import { toIsoDate } from '@/core/dates/iso-date';
import type { SourceRecord } from '@/core/sources/types';
import { buildBreadcrumbList } from '@/lib/seo/schema/breadcrumb';

import AdSlot from './ads/AdSlot.astro';
import AdsScript from './ads/AdsScript.astro';
import CalculatorDirectory from './calculator/CalculatorDirectory.astro';
import Disclaimer from './calculator/Disclaimer.astro';
import Methodology from './calculator/Methodology.astro';
import RelatedCalculators from './calculator/RelatedCalculators.astro';
import SourceList from './calculator/SourceList.astro';
import Breadcrumbs from './layout/Breadcrumbs.astro';
import Footer from './layout/Footer.astro';
import SeoHead from './seo/SeoHead.astro';

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const dom = (html: string) => new JSDOM(`<body>${html}</body>`).window.document;

describe('Breadcrumbs', () => {
  const items = [
    { name: 'Inicio', path: '/' },
    { name: 'Página actual', path: '/pagina' },
  ];

  it('nav etiquetada; el último elemento es la página actual y no es enlace', async () => {
    const doc = dom(await container.renderToString(Breadcrumbs, { props: { items } }));
    expect(doc.querySelector('nav')?.getAttribute('aria-label')).toBe('Ruta de navegación');
    const entries = [...doc.querySelectorAll('ol > li')];
    expect(entries).toHaveLength(2);
    expect(entries[0]?.querySelector('a')?.getAttribute('href')).toBe('/');
    expect(entries[1]?.querySelector('a')).toBeNull();
    expect(entries[1]?.querySelector('[aria-current="page"]')?.textContent).toBe('Página actual');
  });

  it('el JSON-LD BreadcrumbList describe exactamente las migas visibles', async () => {
    const doc = dom(await container.renderToString(Breadcrumbs, { props: { items } }));
    const json = doc.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
    expect(JSON.parse(json)).toEqual(buildBreadcrumbList(items, 'https://example.com'));
  });
});

describe('AdSlot', () => {
  // Configuraciones FICTICIAS: los ids son marcadores evidentes de test, nunca reales.
  const ready: AdsConfig = {
    enabled: true,
    publisherId: 'ca-pub-TEST',
    slots: {
      'after-result': { reservedHeightClass: 'min-h-40', adUnitId: 'TEST-SLOT', mobile: false },
      sidebar: { reservedHeightClass: null, adUnitId: null, mobile: false },
      'end-of-content': { reservedHeightClass: 'min-h-40', adUnitId: 'TEST-SLOT', mobile: true },
    },
  };
  const cmp: ConsentConfig = {
    cmp: { name: 'CMP de prueba', googleCertified: true, iabTcf: true },
  };

  it('desactivado (configuración actual): no renderiza nada ni carga scripts', async () => {
    const html = await container.renderToString(AdSlot, {
      props: { position: 'after-result', pageAllowsAds: true },
    });
    expect(html.trim()).toBe('');
  });

  it('activado sin altura reservada definida: el build falla en lugar de inventar un tamaño', async () => {
    await expect(
      container.renderToString(AdSlot, {
        props: { position: 'sidebar', pageAllowsAds: true, config: ready, consent: cmp },
      }),
    ).rejects.toThrow(/missing_reserved_height/);
  });

  it('activado sin CMP certificada: el build falla', async () => {
    await expect(
      container.renderToString(AdSlot, {
        props: {
          position: 'after-result',
          pageAllowsAds: true,
          config: ready,
          consent: { cmp: null },
        },
      }),
    ).rejects.toThrow(/missing_cmp/);
  });

  it('con todos los requisitos: contenedor etiquetado "Anuncios", altura reservada y sin ningún script', async () => {
    const doc = dom(
      await container.renderToString(AdSlot, {
        props: { position: 'after-result', pageAllowsAds: true, config: ready, consent: cmp },
      }),
    );
    const aside = doc.querySelector('aside');
    expect(aside?.getAttribute('aria-label')).toBe('Anuncios');
    expect(aside?.classList.contains('min-h-40')).toBe(true);
    // mobile: false ⇒ oculto en pantallas estrechas.
    expect(aside?.classList.contains('hidden')).toBe(true);
    expect(aside?.classList.contains('lg:flex')).toBe(true);
    expect(doc.querySelector('script')).toBeNull();
  });

  it('una página que no admite anuncios (borrador) no muestra ninguno aunque todo esté listo', async () => {
    const html = await container.renderToString(AdSlot, {
      props: { position: 'after-result', pageAllowsAds: false, config: ready, consent: cmp },
    });
    expect(html.trim()).toBe('');
  });

  it('mobile: true ⇒ visible también en pantallas estrechas', async () => {
    const doc = dom(
      await container.renderToString(AdSlot, {
        props: { position: 'end-of-content', pageAllowsAds: true, config: ready, consent: cmp },
      }),
    );
    expect(doc.querySelector('aside')?.classList.contains('hidden')).toBe(false);
  });
});

describe('AdsScript (punto único del script global)', () => {
  const cmp: ConsentConfig = {
    cmp: { name: 'CMP de prueba', googleCertified: true, iabTcf: true },
  };
  const enabled = (publisherId: string | null): AdsConfig => ({
    enabled: true,
    publisherId,
    slots: {
      'after-result': { reservedHeightClass: null, adUnitId: null, mobile: false },
      sidebar: { reservedHeightClass: null, adUnitId: null, mobile: false },
      'end-of-content': { reservedHeightClass: null, adUnitId: null, mobile: false },
    },
  });

  it('desactivado (configuración actual): no renderiza nada', async () => {
    expect((await container.renderToString(AdsScript)).trim()).toBe('');
  });

  it('activado sin id de editor o sin CMP: el build falla', async () => {
    await expect(
      container.renderToString(AdsScript, { props: { config: enabled(null), consent: cmp } }),
    ).rejects.toThrow(/missing_publisher_id/);
    await expect(
      container.renderToString(AdsScript, {
        props: { config: enabled('ca-pub-TEST'), consent: { cmp: null } },
      }),
    ).rejects.toThrow(/missing_cmp/);
  });

  it('activado con todo definido: el build falla hasta implementar la carga (nunca a medias)', async () => {
    await expect(
      container.renderToString(AdsScript, {
        props: { config: enabled('ca-pub-TEST'), consent: cmp },
      }),
    ).rejects.toThrow(/no está implementada/);
  });
});

describe('SourceList', () => {
  // Registros FICTICIOS (dominio reservado example.org).
  const base: SourceRecord = {
    id: 'ficticia-oficial',
    title: 'Documento oficial ficticio',
    publisher: 'Organismo ficticio',
    url: 'https://example.org/oficial',
    type: 'official',
    jurisdiction: 'ES',
    appliesTo: { from: toIsoDate('2026-01-01'), to: null },
    accessedAt: toIsoDate('2026-09-01'),
    reviewedAt: toIsoDate('2026-09-02'),
    supports: [{ calculatorId: 'calc', aspect: 'formula' }],
    status: 'verified',
  };
  const registry: readonly SourceRecord[] = [
    {
      ...base,
      id: 'ficticia-secundaria',
      type: 'secondary',
      title: 'Secundaria ficticia',
      status: 'unverified',
    },
    base,
  ];

  it('sin fuentes muestra "NO VERIFICADO — NECESITA FUENTE"', async () => {
    const html = await container.renderToString(SourceList, {
      props: { calculatorId: 'calc', registry: [] },
    });
    expect(html).toContain('NO VERIFICADO — NECESITA FUENTE');
  });

  it('ordena por autoridad, muestra fechas y marca las no verificadas', async () => {
    const doc = dom(
      await container.renderToString(SourceList, { props: { calculatorId: 'calc', registry } }),
    );
    const ids = [...doc.querySelectorAll('[data-source-id]')].map((li) =>
      li.getAttribute('data-source-id'),
    );
    expect(ids).toEqual(['ficticia-oficial', 'ficticia-secundaria']);

    const official = doc.querySelector('[data-source-id="ficticia-oficial"]');
    expect(official?.querySelector('a')?.getAttribute('href')).toBe('https://example.org/oficial');
    expect(official?.querySelector('a')?.getAttribute('rel')).toBe('noreferrer');
    expect(official?.textContent).toContain('Fuente oficial');
    expect(official?.textContent).toContain('Consultada el 1 de septiembre de 2026');
    expect(official?.textContent).toContain('Aplicable desde el 1 de enero de 2026');
    expect(official?.textContent).not.toContain('NO VERIFICADO');

    expect(doc.querySelector('[data-source-id="ficticia-secundaria"]')?.textContent).toContain(
      'NO VERIFICADO — NECESITA FUENTE',
    );
  });

  it('una referencia a una fuente inexistente rompe el build', async () => {
    await expect(
      container.renderToString(SourceList, {
        props: { calculatorId: 'calc', registry, extraSourceIds: ['inventada'] },
      }),
    ).rejects.toThrow(/inventada/);
  });
});

describe('Methodology y Disclaimer', () => {
  it('sin metodología documentada: "NO VERIFICADO — NECESITA FUENTE" y versión del cálculo', async () => {
    const html = await container.renderToString(Methodology, { props: { engineVersion: '1.2.3' } });
    expect(html).toContain('NO VERIFICADO — NECESITA FUENTE');
    expect(html).toContain('Versión del cálculo: 1.2.3');
  });

  it('con contenido, lo muestra', async () => {
    const html = await container.renderToString(Methodology, {
      props: { engineVersion: '1.0.0' },
      slots: { default: '<p>Texto de metodología</p>' },
    });
    expect(html).toContain('Texto de metodología');
    expect(html).not.toContain('NO VERIFICADO');
  });

  it('el aviso sin texto revisado muestra un PLACEHOLDER explícito', async () => {
    const html = await container.renderToString(Disclaimer);
    expect(html).toContain('PLACEHOLDER — PENDIENTE DE DEFINIR');
  });
});

describe('RelatedCalculators', () => {
  const registry: readonly CalculatorEntry[] = [
    {
      calculator: { id: 'otra', slug: 'calculadora-otra', version: '1.0.0', related: [] },
      name: 'Otra',
      heading: 'Calculadora otra',
      category: 'finanzas',
      seo: { title: 'Calculadora otra', description: 'Descripción de otra.' },
      status: 'published',
    },
  ];

  it('sin relacionadas no renderiza nada', async () => {
    expect(
      (await container.renderToString(RelatedCalculators, { props: { ids: [], registry } })).trim(),
    ).toBe('');
  });

  it('enlaza a las calculadoras declaradas', async () => {
    const doc = dom(
      await container.renderToString(RelatedCalculators, { props: { ids: ['otra'], registry } }),
    );
    expect(doc.querySelector('a')?.getAttribute('href')).toBe('/calculadora-otra');
    expect(doc.querySelector('a')?.textContent).toBe('Otra');
  });

  it('un id no registrado rompe el build', async () => {
    await expect(
      container.renderToString(RelatedCalculators, { props: { ids: ['inexistente'], registry } }),
    ).rejects.toThrow(/no registrada/);
  });
});

describe('SeoHead', () => {
  it('emite title, description, canonical, robots y Open Graph', async () => {
    const meta = {
      title: 'Título · Sitio',
      description: 'Descripción',
      canonical: 'https://example.com/pagina',
      robots: 'noindex, nofollow' as const,
      openGraph: {
        type: 'website' as const,
        title: 'Título',
        description: 'Descripción',
        url: 'https://example.com/pagina',
        siteName: 'Sitio',
        locale: 'es_ES',
      },
    };
    const doc = new JSDOM(
      `<head>${await container.renderToString(SeoHead, { props: { meta } })}</head>`,
    ).window.document;
    expect(doc.title).toBe('Título · Sitio');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://example.com/pagina',
    );
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
    expect(doc.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('es_ES');
  });
});

describe('Footer', () => {
  it('por defecto enlaza las tres páginas legales', async () => {
    const doc = dom(await container.renderToString(Footer));
    expect([...doc.querySelectorAll('nav a')].map((link) => link.getAttribute('href'))).toEqual([
      '/aviso-legal',
      '/privacidad',
      '/cookies',
    ]);
  });

  it('sin páginas legales declaradas no enlaza nada', async () => {
    const doc = dom(await container.renderToString(Footer, { props: { legal: [] } }));
    expect(doc.querySelector('nav')).toBeNull();
    expect(doc.querySelectorAll('a')).toHaveLength(0);
  });

  it('enlaza solo las páginas legales declaradas, con objetivo táctil de 44 px', async () => {
    const legal = [{ label: 'Aviso legal', path: '/aviso-legal' }];
    const doc = dom(await container.renderToString(Footer, { props: { legal } }));
    expect(doc.querySelector('nav')?.getAttribute('aria-label')).toBe('Información legal');
    const link = doc.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/aviso-legal');
    expect(link?.classList.contains('min-h-11')).toBe(true);
  });
});

describe('CalculatorDirectory (portada)', () => {
  // Registro FICTICIO: el real solo tiene borradores, así que el camino
  // "publicada → aparece en la portada" se prueba aquí.
  const entry = (id: string, slug: string, status: CalculatorEntry['status']): CalculatorEntry => ({
    calculator: { id, slug, version: '1.0.0', related: [] },
    name: `Nombre ${id}`,
    heading: `Calculadora ${id}`,
    category: 'finanzas',
    seo: { title: `Título ${id}`, description: `Descripción de ${id}.` },
    status,
  });

  it('solo borradores (estado actual): mensaje de vacío, sin categorías ni enlaces', async () => {
    const doc = dom(
      await container.renderToString(CalculatorDirectory, {
        props: { registry: [entry('borrador', 'calculadora-borrador', 'draft')] },
      }),
    );
    expect(doc.body.textContent).toContain('Todavía no hay calculadoras publicadas.');
    expect(doc.querySelector('h3')).toBeNull();
    expect(doc.querySelectorAll('a')).toHaveLength(0);
  });

  it('una calculadora publicada aparece en su categoría, enlazando EXACTAMENTE a /<slug>', async () => {
    const doc = dom(
      await container.renderToString(CalculatorDirectory, {
        props: {
          registry: [
            entry('publicada', 'calculadora-publicada', 'published'),
            entry('borrador', 'calculadora-borrador', 'draft'),
          ],
        },
      }),
    );
    expect(doc.body.textContent).not.toContain('Todavía no hay calculadoras publicadas.');
    expect(doc.querySelector('h3')?.textContent).toBe('Finanzas');
    const links = [...doc.querySelectorAll('a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/calculadora-publicada']);
    expect(links[0]?.textContent).toContain('Nombre publicada');
    expect(links[0]?.textContent).toContain('Descripción de publicada.');
  });
});
