/**
 * Páginas legales del sitio (docs/privacidad-y-legal.md).
 *
 * PLACEHOLDER — PENDIENTE DE DEFINIR: ninguna existe todavía. Cada una se
 * declara aquí SOLO cuando su página exista con texto revisado jurídicamente;
 * el pie (Footer.astro) enlaza únicamente las declaradas, así que nunca hay
 * un enlace a una página inexistente.
 */
export type LegalPageId = 'legal-notice' | 'privacy' | 'cookies';

export interface LegalPage {
  readonly label: string;
  /** Ruta desde la raíz ("/aviso-legal"). */
  readonly path: string;
}

export const legalPages: Readonly<Record<LegalPageId, LegalPage | null>> = {
  'legal-notice': null,
  privacy: null,
  cookies: null,
};

/** Páginas legales declaradas, en orden estable para el pie. */
export function declaredLegalPages(
  pages: Readonly<Record<LegalPageId, LegalPage | null>> = legalPages,
): readonly LegalPage[] {
  return (['legal-notice', 'privacy', 'cookies'] as const)
    .map((id) => pages[id])
    .filter((page): page is LegalPage => page !== null);
}
