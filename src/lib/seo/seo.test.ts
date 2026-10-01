import { describe, expect, it } from 'vitest';

import { buildCanonicalUrl } from './canonical';
import { buildPageMeta, type SiteMetaContext } from './meta';
import { buildBreadcrumbList } from './schema/breadcrumb';
import { serializeJsonLd } from './schema/json-ld';
import { buildWebApplication } from './schema/web-application';

const SITE = 'https://example.com';

describe('buildCanonicalUrl', () => {
  it.each([
    ['/', 'https://example.com/'],
    ['/calculadora-ejemplo', 'https://example.com/calculadora-ejemplo'],
    ['/calculadora-ejemplo/', 'https://example.com/calculadora-ejemplo'],
    ['/calculadora-ejemplo?importe=1000#resultado', 'https://example.com/calculadora-ejemplo'],
    ['/a//b', 'https://example.com/a/b'],
  ])('%s → %s', (path, expected) => {
    expect(buildCanonicalUrl(SITE, path)).toBe(expected);
  });

  it.each([['calculadora'], ['//evil.example/x'], ['https://otro.example/x'], ['/Calculadora']])(
    'rechaza %s',
    (path) => {
      expect(() => buildCanonicalUrl(SITE, path)).toThrow();
    },
  );
});

describe('buildPageMeta', () => {
  const indexable: SiteMetaContext = {
    siteUrl: SITE,
    siteName: 'Sitio',
    ogLocale: 'es_ES',
    indexable: true,
  };

  it('construye title, description, canonical, robots y Open Graph de los mismos datos', () => {
    expect(
      buildPageMeta({ title: 'Página', description: 'Descripción.', path: '/pagina/' }, indexable),
    ).toEqual({
      title: 'Página · Sitio',
      description: 'Descripción.',
      canonical: 'https://example.com/pagina',
      robots: 'index, follow',
      openGraph: {
        type: 'website',
        title: 'Página',
        description: 'Descripción.',
        url: 'https://example.com/pagina',
        siteName: 'Sitio',
        locale: 'es_ES',
      },
    });
  });

  it('una página indexable con texto PLACEHOLDER rompe el build; noindex sí se permite', () => {
    const page = { title: 'Sitio', description: 'PLACEHOLDER — PENDIENTE', path: '/' };
    expect(() => buildPageMeta(page, indexable)).toThrow(/PLACEHOLDER/);
    expect(buildPageMeta(page, { ...indexable, indexable: false }).robots).toBe(
      'noindex, nofollow',
    );
    expect(buildPageMeta({ ...page, noindex: true }, indexable).robots).toBe('noindex, nofollow');
  });

  it('no duplica el nombre del sitio en la portada', () => {
    expect(buildPageMeta({ title: 'Sitio', description: 'x', path: '/' }, indexable).title).toBe(
      'Sitio',
    );
  });

  it('noindex si la página lo pide o si el despliegue no es indexable', () => {
    expect(
      buildPageMeta({ title: 'a', description: 'b', path: '/404', noindex: true }, indexable)
        .robots,
    ).toBe('noindex, nofollow');
    expect(
      buildPageMeta({ title: 'a', description: 'b', path: '/' }, { ...indexable, indexable: false })
        .robots,
    ).toBe('noindex, nofollow');
  });

  it('exige título y descripción', () => {
    expect(() => buildPageMeta({ title: ' ', description: 'b', path: '/' }, indexable)).toThrow(
      /título/,
    );
    expect(() => buildPageMeta({ title: 'a', description: '', path: '/' }, indexable)).toThrow(
      /description/,
    );
  });
});

describe('buildBreadcrumbList', () => {
  it('genera BreadcrumbList con los campos que exige Google (name, position, item)', () => {
    expect(
      buildBreadcrumbList(
        [
          { name: 'Inicio', path: '/' },
          { name: 'Ejemplo', path: '/ejemplo' },
        ],
        SITE,
      ),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://example.com/' },
        { '@type': 'ListItem', position: 2, name: 'Ejemplo', item: 'https://example.com/ejemplo' },
      ],
    });
  });

  it('rechaza listas vacías o elementos sin nombre', () => {
    expect(() => buildBreadcrumbList([], SITE)).toThrow();
    expect(() => buildBreadcrumbList([{ name: ' ', path: '/' }], SITE)).toThrow();
  });
});

describe('buildWebApplication', () => {
  const FORBIDDEN = ['offers', 'price', 'aggregateRating', 'review', 'author', 'publisher'];

  it('emite solo las propiedades proporcionadas y demostrables', () => {
    expect(buildWebApplication({ name: 'Herramienta', path: '/herramienta' }, SITE)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Herramienta',
      url: 'https://example.com/herramienta',
    });
  });

  it('nunca emite ofertas, precios, valoraciones, reseñas ni autores', () => {
    const full = buildWebApplication(
      {
        name: 'Herramienta',
        path: '/herramienta',
        description: 'd',
        applicationCategory: 'c',
        isAccessibleForFree: true,
        inLanguage: 'es-ES',
      },
      SITE,
    );
    for (const key of FORBIDDEN) expect(full).not.toHaveProperty(key);
    expect(Object.keys(full).sort()).toEqual(
      [
        '@context',
        '@type',
        'applicationCategory',
        'description',
        'inLanguage',
        'isAccessibleForFree',
        'name',
        'url',
      ].sort(),
    );
  });

  it('rechaza un nombre vacío', () => {
    expect(() => buildWebApplication({ name: '', path: '/' }, SITE)).toThrow();
  });
});

describe('serializeJsonLd', () => {
  it('impide cerrar la etiqueta <script> desde un valor', () => {
    const malicious = { name: '</script><script>alert(1)</script>', note: 'a & b > c' };
    const json = serializeJsonLd(malicious);
    expect(json).not.toMatch(/<|>|&/);
    expect(json.toLowerCase()).not.toContain('</script');
    expect(JSON.parse(json)).toEqual(malicious);
  });

  it('escapa los separadores de línea U+2028 y U+2029', () => {
    const value = { text: `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c` };
    const json = serializeJsonLd(value);
    expect(json).not.toContain(String.fromCharCode(0x2028));
    expect(json).not.toContain(String.fromCharCode(0x2029));
    expect(JSON.parse(json)).toEqual(value);
  });

  it('rechaza números no finitos', () => {
    expect(() => serializeJsonLd({ n: Number.POSITIVE_INFINITY })).toThrow();
  });
});
