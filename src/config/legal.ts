/**
 * Páginas legales y datos del titular (docs/privacidad-y-legal.md).
 *
 * Los textos de /aviso-legal, /privacidad y /cookies son un BORRADOR
 * INFORMATIVO pendiente de revisión jurídica. Mientras `legalTextsReviewed`
 * sea `false`, las tres páginas son noindex, quedan fuera del sitemap y
 * muestran un aviso de borrador.
 *
 * Datos del titular: proporcionados por él mismo. Ningún dato se inventa: lo
 * que falta es `null` y la página muestra un marcador explícito
 * ("[NIF PENDIENTE]", "[DOMICILIO COMPLETO PENDIENTE]").
 */
export type LegalPageId = 'legal-notice' | 'privacy' | 'cookies';

export interface LegalPage {
  readonly label: string;
  /** Ruta desde la raíz ("/aviso-legal"). */
  readonly path: string;
}

export const legalPages: Readonly<Record<LegalPageId, LegalPage | null>> = {
  'legal-notice': { label: 'Aviso legal', path: '/aviso-legal' },
  privacy: { label: 'Política de privacidad', path: '/privacidad' },
  cookies: { label: 'Política de cookies', path: '/cookies' },
};

/** Páginas legales declaradas, en orden estable para el pie. */
export function declaredLegalPages(
  pages: Readonly<Record<LegalPageId, LegalPage | null>> = legalPages,
): readonly LegalPage[] {
  return (['legal-notice', 'privacy', 'cookies'] as const)
    .map((id) => pages[id])
    .filter((page): page is LegalPage => page !== null);
}

export interface LegalOwner {
  readonly kind: 'natural-person';
  readonly fullName: string;
  /** Localidad de residencia indicada por el titular (no es un domicilio completo). */
  readonly residence: string;
  /** Domicilio completo. PENDIENTE: lo introduce el titular; nunca se inventa. */
  readonly address: string | null;
  /** NIF facilitado por el titular (`null` si falta; nunca se inventa). */
  readonly nif: string | null;
  readonly email: string;
}

export const legalOwner: LegalOwner = {
  kind: 'natural-person',
  fullName: 'Paolo Eloy Peñalver',
  residence: 'Inca, Mallorca (Islas Baleares), España',
  address: 'Carrer Mossèn Andreu Llabrés Feliu, 10, Inca, Mallorca (Islas Baleares), España',
  nif: '54627623R',
  email: 'paolopenalver252@gmail.com',
};

/**
 * `true` SOLO cuando un profesional del derecho haya revisado los tres
 * textos. Hasta entonces son un borrador: noindex y fuera del sitemap.
 */
export const legalTextsReviewed = false;

/** Fecha del borrador (provisional mientras no haya revisión jurídica). */
export const legalTextsLastUpdated = '2026-10-01';

export const PENDING_NIF = '[NIF PENDIENTE]';
export const PENDING_ADDRESS = '[DOMICILIO COMPLETO PENDIENTE]';

/** Datos del titular que aún faltan (vacío ⇒ completos). */
export function missingOwnerData(owner: LegalOwner = legalOwner): readonly string[] {
  return [...(owner.nif === null ? ['nif'] : []), ...(owner.address === null ? ['address'] : [])];
}

/**
 * Rutas legales que no deben indexarse ni ir al sitemap. Lanza si los textos
 * se marcan como revisados sin los datos obligatorios del titular.
 */
export function unindexableLegalPaths(
  reviewed: boolean = legalTextsReviewed,
  owner: LegalOwner = legalOwner,
): readonly string[] {
  const missing = missingOwnerData(owner);
  if (reviewed && missing.length > 0) {
    throw new Error(`Textos legales marcados como revisados sin: ${missing.join(', ')}`);
  }
  return reviewed ? [] : declaredLegalPages().map((page) => page.path);
}
