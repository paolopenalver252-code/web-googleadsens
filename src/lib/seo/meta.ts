/**
 * Metadatos de página. Un único constructor para todas las páginas: title,
 * description, canonical, robots y Open Graph salen de los mismos datos.
 */
import { buildCanonicalUrl } from './canonical';

export interface PageMetaInput {
  /** Título de la página, sin el nombre del sitio. */
  readonly title: string;
  readonly description: string;
  /** Ruta desde la raíz: "/", "/calculadora-…". */
  readonly path: string;
  /** `true` para páginas que nunca deben indexarse (404, páginas de prueba). */
  readonly noindex?: boolean;
}

export interface SiteMetaContext {
  readonly siteUrl: string;
  readonly siteName: string;
  readonly ogLocale: string;
  /** Si el despliegue es indexable (ver config/site.ts → isIndexable). */
  readonly indexable: boolean;
}

export type RobotsDirective = 'index, follow' | 'noindex, nofollow';

export interface PageMeta {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
  readonly robots: RobotsDirective;
  readonly openGraph: {
    readonly type: 'website';
    readonly title: string;
    readonly description: string;
    readonly url: string;
    readonly siteName: string;
    readonly locale: string;
  };
}

export function buildPageMeta(input: PageMetaInput, site: SiteMetaContext): PageMeta {
  const title = input.title.trim();
  const description = input.description.trim();
  if (title === '') throw new Error(`Página "${input.path}": falta el título`);
  if (description === '') throw new Error(`Página "${input.path}": falta la meta description`);

  const canonical = buildCanonicalUrl(site.siteUrl, input.path);
  const fullTitle = title === site.siteName ? title : `${title} · ${site.siteName}`;
  const robots: RobotsDirective =
    site.indexable && input.noindex !== true ? 'index, follow' : 'noindex, nofollow';
  // Un texto provisional nunca puede llegar indexado a Google: el build falla.
  if (robots === 'index, follow' && `${title} ${description}`.includes('PLACEHOLDER')) {
    throw new Error(
      `Página "${input.path}": indexable con texto PLACEHOLDER (pendiente de definir)`,
    );
  }

  return {
    title: fullTitle,
    description,
    canonical,
    robots,
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      siteName: site.siteName,
      locale: site.ogLocale,
    },
  };
}
