/**
 * Configuración de despliegue resuelta en tiempo de build (variables
 * validadas por el esquema `env` de astro.config.ts). Solo para código Astro
 * del lado servidor/build: nunca se importa desde islas ni desde el core.
 */
import { PUBLIC_SITE_URL, VERCEL_ENV } from 'astro:env/server';

import { esES } from '@/i18n/locales/es-ES';
import type { SiteMetaContext } from '@/lib/seo/meta';

import { isIndexable, resolveSiteUrl, siteIdentity } from './site';

const siteUrl = resolveSiteUrl(PUBLIC_SITE_URL);

export const site = {
  url: siteUrl,
  name: siteIdentity.name,
  isPlaceholderIdentity: siteIdentity.isPlaceholder,
  indexable: isIndexable({ siteUrl, vercelEnv: VERCEL_ENV }),
  locale: esES,
} as const;

export const siteMetaContext: SiteMetaContext = {
  siteUrl: site.url,
  siteName: site.name,
  ogLocale: site.locale.ogLocale,
  indexable: site.indexable,
};
