/**
 * WebApplication (schema.org) — PREPARADO, NO USADO TODAVÍA.
 *
 * Solo admite propiedades que el propio sitio puede demostrar. Por diseño NO
 * existen parámetros para `offers`, `price`, `aggregateRating`, `review`,
 * `author` ni `publisher`: no hay forma de emitirlos desde aquí.
 *
 * Consecuencia verificada (29/09/2026,
 * https://developers.google.com/search/docs/appearance/structured-data/software-app):
 * el rich result de software exige `offers.price` Y además `aggregateRating`
 * o `review`. Como no tenemos valoraciones reales, este marcado NO optará a
 * ese rich result; solo describe la página. Decisión pendiente (#9): usarlo
 * en su forma mínima u omitirlo.
 */
import { buildCanonicalUrl } from '../canonical';
import type { JsonLdObject } from './json-ld';

export interface WebApplicationInput {
  readonly name: string;
  readonly path: string;
  readonly description?: string;
  /** Texto libre de schema.org; solo si es cierto para la herramienta. */
  readonly applicationCategory?: string;
  /** Solo si la herramienta es realmente gratuita (decisión del titular). */
  readonly isAccessibleForFree?: boolean;
  /** Idioma de la interfaz (BCP 47). */
  readonly inLanguage?: string;
}

export function buildWebApplication(input: WebApplicationInput, siteUrl: string): JsonLdObject {
  if (input.name.trim() === '') throw new Error('WebApplication: falta el nombre');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.name,
    url: buildCanonicalUrl(siteUrl, input.path),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.applicationCategory === undefined
      ? {}
      : { applicationCategory: input.applicationCategory }),
    ...(input.isAccessibleForFree === undefined
      ? {}
      : { isAccessibleForFree: input.isAccessibleForFree }),
    ...(input.inLanguage === undefined ? {} : { inLanguage: input.inLanguage }),
  };
}
