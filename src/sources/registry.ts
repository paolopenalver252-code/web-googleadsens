/**
 * Registro de fuentes del sitio. Política: docs/sources-policy.md.
 *
 * Vacío a propósito: en esta fase no se registra ninguna fuente financiera.
 * NUNCA se añade una fuente, una URL o una atribución sin haberla comprobado.
 * Una fuente pendiente de comprobar se registra con `status: 'unverified'` y
 * se muestra como "NO VERIFICADO — NECESITA FUENTE".
 *
 * Ejemplo de la FORMA de un registro (datos ficticios, no copiar):
 *
 *   {
 *     id: 'organismo-documento-2026',
 *     title: '<título exacto del documento>',
 *     publisher: '<organismo>',
 *     url: 'https://<url exacta comprobada>',
 *     type: 'official',
 *     jurisdiction: 'ES',
 *     appliesTo: { from: toIsoDate('2026-01-01'), to: toIsoDate('2026-12-31') },
 *     accessedAt: toIsoDate('<fecha de consulta>'),
 *     reviewedAt: toIsoDate('<fecha de revisión>'),
 *     supports: [{ calculatorId: '<id>', aspect: 'formula' }],
 *     status: 'verified',
 *     notes: '<qué se comprobó exactamente>',
 *   }
 */
import type { SourceRecord } from '@/core/sources/types';

export const sourceRegistry: readonly SourceRecord[] = [];
