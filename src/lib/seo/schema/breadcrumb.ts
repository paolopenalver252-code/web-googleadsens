/**
 * BreadcrumbList (schema.org), generado a partir de las MISMAS migas que se
 * muestran en la página (components/layout/Breadcrumbs.astro), de modo que el
 * marcado nunca describe algo distinto del contenido visible.
 *
 * Requisitos de Google verificados el 29/09/2026 en
 * https://developers.google.com/search/docs/appearance/structured-data/breadcrumb :
 * BreadcrumbList.itemListElement y, en cada ListItem, name, position e item
 * (item no es obligatorio en el último elemento; aquí se incluye siempre).
 */
import { buildCanonicalUrl } from '../canonical';
import type { JsonLdObject } from './json-ld';

export interface BreadcrumbItem {
  readonly name: string;
  /** Ruta desde la raíz. */
  readonly path: string;
}

export function buildBreadcrumbList(
  items: readonly BreadcrumbItem[],
  siteUrl: string,
): JsonLdObject {
  if (items.length === 0) throw new Error('BreadcrumbList: se necesita al menos un elemento');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      if (item.name.trim() === '') throw new Error('BreadcrumbList: elemento sin nombre');
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: buildCanonicalUrl(siteUrl, item.path),
      };
    }),
  };
}
