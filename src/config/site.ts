/**
 * Identidad y URL del sitio.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  PLACEHOLDER — PENDIENTE DE DEFINIR: marca, nombre y dominio.
 *
 *  Para sustituir la identidad provisional:
 *    1. Cambia `siteIdentity.name` y pon `isPlaceholder: false`.
 *    2. Define la variable de entorno PUBLIC_SITE_URL (p. ej. en Vercel)
 *       con el dominio definitivo, solo el origen: https://midominio.es
 *    3. Revisa los tokens de color en src/styles/global.css.
 *  Ver README.md → "Identidad provisional".
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Este módulo es puro (sin Astro ni `import.meta.env`) porque también lo
 * importa astro.config.ts.
 */

/** Dominio reservado para documentación (RFC 2606). Nunca es un sitio real. */
export const PLACEHOLDER_SITE_URL = 'https://example.com';

export const siteIdentity = {
  /** PLACEHOLDER — PENDIENTE DE DEFINIR */
  name: 'Calculadoras',
  isPlaceholder: true,
} as const;

export type VercelEnv = 'production' | 'preview' | 'development';

/**
 * Normaliza la URL del sitio. Sin valor → dominio placeholder.
 * Exige https y solo el origen (sin ruta, query ni hash) para que canonical,
 * sitemap y Open Graph se construyan siempre igual.
 */
export function resolveSiteUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') return PLACEHOLDER_SITE_URL;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`PUBLIC_SITE_URL no es una URL válida: "${raw}"`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`PUBLIC_SITE_URL debe usar https: "${raw}"`);
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error(`PUBLIC_SITE_URL debe ser solo el origen (sin ruta): "${raw}"`);
  }
  return url.origin;
}

/**
 * El sitio solo es indexable si es el despliegue de producción de Vercel Y
 * existe un dominio definitivo. Cualquier otro caso (build local, previews
 * — incluidas las previews con dominio propio, a las que Vercel no añade
 * `X-Robots-Tag: noindex` — o dominio placeholder) emite `noindex`.
 */
export function isIndexable(params: {
  readonly siteUrl: string;
  readonly vercelEnv: VercelEnv | undefined;
}): boolean {
  return params.vercelEnv === 'production' && params.siteUrl !== PLACEHOLDER_SITE_URL;
}
