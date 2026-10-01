import { describe, expect, it } from 'vitest';

import {
  declaredLegalPages,
  legalOwner,
  legalPages,
  legalTextsReviewed,
  missingOwnerData,
  unindexableLegalPaths,
} from './legal';

describe('páginas legales', () => {
  it('las tres están declaradas, en orden estable', () => {
    expect(declaredLegalPages().map((page) => page.path)).toEqual([
      '/aviso-legal',
      '/privacidad',
      '/cookies',
    ]);
  });

  it('solo devuelve las declaradas', () => {
    expect(
      declaredLegalPages({
        cookies: { label: 'Cookies', path: '/cookies' },
        'legal-notice': { label: 'Aviso legal', path: '/aviso-legal' },
        privacy: null,
      }),
    ).toEqual([
      { label: 'Aviso legal', path: '/aviso-legal' },
      { label: 'Cookies', path: '/cookies' },
    ]);
    expect(Object.keys(legalPages)).toHaveLength(3);
  });
});

describe('datos del titular y revisión jurídica', () => {
  it('estado actual: borrador sin revisar, con NIF y domicilio facilitados por el titular', () => {
    expect(legalTextsReviewed).toBe(false);
    expect(legalOwner.nif).toBe('54627623R');
    expect(legalOwner.address).toBe(
      'Carrer Mossèn Andreu Llabrés Feliu, 10, Inca, Mallorca (Islas Baleares), España',
    );
    expect(missingOwnerData()).toEqual([]);
  });

  it('el NIF tiene formato de DNI y su letra de control es correcta', () => {
    const match = /^(\d{8})([A-Z])$/.exec(legalOwner.nif ?? '');
    expect(match).not.toBeNull();
    const [, digits = '', letter] = match ?? [];
    expect('TRWAGMYFPDXBNJZSQVHLCKE'[Number(digits) % 23]).toBe(letter);
  });

  it('sin revisión, las tres páginas son noindex y quedan fuera del sitemap', () => {
    expect(unindexableLegalPaths()).toEqual(['/aviso-legal', '/privacidad', '/cookies']);
  });

  it('marcarlas como revisadas sin NIF o domicilio rompe el build', () => {
    expect(() => unindexableLegalPaths(true, { ...legalOwner, address: null })).toThrow(/address/);
    expect(() => unindexableLegalPaths(true, { ...legalOwner, nif: null })).toThrow(/nif/);
  });

  it('revisadas y con los datos completos, pueden indexarse', () => {
    const complete = { ...legalOwner, nif: 'NIF', address: 'Domicilio' };
    expect(missingOwnerData(complete)).toEqual([]);
    expect(unindexableLegalPaths(true, complete)).toEqual([]);
  });
});
