import { describe, expect, it } from 'vitest';

import { declaredLegalPages, legalPages } from './legal';

describe('páginas legales', () => {
  it('hoy no hay ninguna declarada: el pie no enlaza páginas inexistentes', () => {
    expect(Object.values(legalPages)).toEqual([null, null, null]);
    expect(declaredLegalPages()).toEqual([]);
  });

  it('solo devuelve las declaradas, en orden estable', () => {
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
  });
});
