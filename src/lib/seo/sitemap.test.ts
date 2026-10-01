import { describe, expect, it } from 'vitest';

import type { CalculatorEntry } from '@/core/calculator/registry-integrity';

import { createSitemapFilter } from './sitemap';

const entry = (id: string, status: CalculatorEntry['status']): CalculatorEntry => ({
  calculator: { id, slug: `calculadora-${id}`, version: '1.0.0', related: [] },
  name: id,
  heading: `Calculadora ${id}`,
  category: 'finanzas',
  seo: { title: `Título ${id}`, description: `Descripción ${id}.` },
  status,
});

describe('createSitemapFilter', () => {
  const filter = createSitemapFilter({
    excludedPrefixes: ['/test-harness/'],
    registry: [entry('publicada', 'published'), entry('borrador', 'draft')],
  });
  const url = (path: string) => `https://example.com${path}`;

  it('incluye la portada y las calculadoras publicadas', () => {
    expect(filter(url('/'))).toBe(true);
    expect(filter(url('/calculadora-publicada'))).toBe(true);
  });

  it('excluye borradores (con o sin barra final) y rutas de prueba', () => {
    expect(filter(url('/calculadora-borrador'))).toBe(false);
    expect(filter(url('/calculadora-borrador/'))).toBe(false);
    expect(filter(url('/test-harness/compound-interest'))).toBe(false);
    expect(filter(url('/test-harness'))).toBe(false);
  });

  it('un prefijo excluido no captura rutas que solo empiezan igual', () => {
    expect(filter(url('/test-harnessing'))).toBe(true);
  });

  it('con el registro real, interés compuesto (publicada) entra en el sitemap', () => {
    const real = createSitemapFilter({ excludedPrefixes: [] });
    expect(real(url('/calculadora-interes-compuesto'))).toBe(true);
    expect(real(url('/'))).toBe(true);
  });
});

describe('createSitemapFilter: rutas exactas excluidas', () => {
  it('excluye las páginas legales pendientes de revisión, sin afectar a otras', () => {
    const filter = createSitemapFilter({
      excludedPrefixes: [],
      excludedPaths: ['/aviso-legal', '/privacidad', '/cookies'],
      registry: [],
    });
    expect(filter('https://example.com/aviso-legal')).toBe(false);
    expect(filter('https://example.com/cookies/')).toBe(false);
    expect(filter('https://example.com/cookies-extra')).toBe(true);
    expect(filter('https://example.com/')).toBe(true);
  });
});
