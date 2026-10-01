/**
 * robots.txt generado en el build.
 *
 * NUNCA bloquea el rastreo, ni siquiera en despliegues no indexables: según
 * Google, "para que la regla noindex sea efectiva, la página no debe estar
 * bloqueada por robots.txt" (https://developers.google.com/search/docs/crawling-indexing/block-indexing,
 * consultado el 29/09/2026). La no indexación se hace con <meta name="robots">.
 * El sitemap solo se anuncia cuando el despliegue es indexable.
 */
import type { APIRoute } from 'astro';

import { site } from '@/config/env';

export const GET: APIRoute = () => {
  const lines = ['User-agent: *', 'Allow: /'];
  if (site.indexable) lines.push('', `Sitemap: ${site.url}/sitemap-index.xml`);
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
