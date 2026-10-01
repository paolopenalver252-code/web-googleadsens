import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

import { testPages, TEST_ROUTE_PREFIX } from './integrations/test-pages';
import { unpublishedCalculatorPaths } from './src/calculators/registry';
import { resolveSiteUrl } from './src/config/site';

const includeTestPages = process.env.INCLUDE_TEST_PAGES === '1';

/** Calculadoras en borrador: tienen página (noindex) pero no entran en el sitemap. */
const unpublishedPaths = new Set(unpublishedCalculatorPaths());

export default defineConfig({
  // PLACEHOLDER — PENDIENTE DE DEFINIR: mientras no exista dominio, se usa
  // https://example.com (dominio reservado, RFC 2606). Se sustituye con la
  // variable de entorno PUBLIC_SITE_URL, sin tocar código. Ver README.
  site: resolveSiteUrl(process.env.PUBLIC_SITE_URL),

  // Una única política de URL: sin barra final. `build.format: 'file'` es la
  // combinación que recomienda Astro para `trailingSlash: 'never'`. En Vercel
  // se complementa con `cleanUrls` y `trailingSlash: false` (vercel.json).
  trailingSlash: 'never',
  build: { format: 'file' },

  // Todas las páginas son estáticas (valor por defecto de Astro). No hay
  // adaptador de servidor: Vercel sirve el contenido de `dist/`.
  output: 'static',

  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        !page.includes(TEST_ROUTE_PREFIX) && !unpublishedPaths.has(new URL(page).pathname),
    }),
    ...(includeTestPages ? [testPages()] : []),
  ],

  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
        url: true,
      }),
      VERCEL_ENV: envField.enum({
        context: 'server',
        access: 'public',
        values: ['production', 'preview', 'development'],
        optional: true,
      }),
    },
  },

  security: {
    // Astro calcula hashes de sus scripts/estilos inline (runtime de islas) y
    // los emite en un <meta http-equiv="content-security-policy">. Verificado
    // en local con Playwright (tests/e2e/csp.spec.ts). Las directivas que no
    // admite <meta> (frame-ancestors) se envían como cabecera desde vercel.json.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },

  // Sin resaltado de código: Shiki usa estilos inline incompatibles con la CSP
  // y el sitio no muestra código.
  markdown: { syntaxHighlight: false },

  vite: {
    plugins: [tailwindcss()],
  },
});
