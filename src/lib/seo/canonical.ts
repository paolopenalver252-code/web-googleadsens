/**
 * URL canónica. Política única del sitio (coincide con astro.config.ts y
 * vercel.json): sin barra final salvo la raíz, sin query ni fragmento.
 * Los parámetros (p. ej. valores compartidos de una calculadora) nunca
 * forman parte del canonical.
 */
export function buildCanonicalUrl(siteUrl: string, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`La ruta debe ser relativa a la raíz ("/…"): "${path}"`);
  }
  const site = new URL(siteUrl);
  const url = new URL(path, site);
  if (url.origin !== site.origin) {
    throw new Error(`La ruta sale del sitio: "${path}"`);
  }
  let pathname = url.pathname.replace(/\/{2,}/g, '/');
  if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
  if (pathname !== pathname.toLowerCase()) {
    throw new Error(`Las rutas del sitio van en minúsculas: "${path}"`);
  }
  return `${site.origin}${pathname}`;
}
