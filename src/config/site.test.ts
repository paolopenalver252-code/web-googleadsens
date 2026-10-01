import { describe, expect, it } from 'vitest';

import { isIndexable, PLACEHOLDER_SITE_URL, resolveSiteUrl } from './site';

describe('resolveSiteUrl', () => {
  it('sin valor usa el dominio placeholder reservado', () => {
    expect(resolveSiteUrl(undefined)).toBe(PLACEHOLDER_SITE_URL);
    expect(resolveSiteUrl('  ')).toBe(PLACEHOLDER_SITE_URL);
  });

  it('normaliza al origen', () => {
    expect(resolveSiteUrl('https://midominio.example/')).toBe('https://midominio.example');
  });

  it.each([
    'no es url',
    'http://midominio.example',
    'https://midominio.example/ruta',
    'https://midominio.example/?a=1',
  ])('rechaza %j', (value) => {
    expect(() => resolveSiteUrl(value)).toThrow();
  });
});

describe('isIndexable', () => {
  it('solo es indexable en producción de Vercel con dominio definitivo', () => {
    expect(isIndexable({ siteUrl: 'https://midominio.example', vercelEnv: 'production' })).toBe(
      true,
    );
    expect(isIndexable({ siteUrl: 'https://midominio.example', vercelEnv: 'preview' })).toBe(false);
    expect(isIndexable({ siteUrl: 'https://midominio.example', vercelEnv: 'development' })).toBe(
      false,
    );
    expect(isIndexable({ siteUrl: 'https://midominio.example', vercelEnv: undefined })).toBe(false);
    expect(isIndexable({ siteUrl: PLACEHOLDER_SITE_URL, vercelEnv: 'production' })).toBe(false);
  });
});
