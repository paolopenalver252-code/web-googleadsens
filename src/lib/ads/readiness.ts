/**
 * ¿Puede activarse un espacio publicitario? (ADR 0009)
 *
 * Función pura: no carga scripts ni decide nada sobre la calculadora. AdSlot
 * la usa en el build; con anuncios activados y algún bloqueo, el build falla
 * en lugar de publicar un espacio a medias (sin CMP, sin ids reales o sin
 * altura reservada, que provocaría CLS).
 */
import type { AdPosition, AdsConfig, ConsentConfig } from '@/config/features';

export type AdBlocker =
  /** Los anuncios están desactivados globalmente (estado actual). */
  | 'ads_disabled'
  /** Falta el id de editor de AdSense. */
  | 'missing_publisher_id'
  /** Falta una CMP certificada con IAB TCF (EEE, Reino Unido y Suiza). */
  | 'missing_cmp'
  /** Falta el id del bloque de anuncios de esta posición. */
  | 'missing_ad_unit'
  /** Falta la altura reservada de esta posición (evita CLS). */
  | 'missing_reserved_height';

export function adSlotBlockers(
  position: AdPosition,
  ads: AdsConfig,
  consent: ConsentConfig,
): readonly AdBlocker[] {
  if (!ads.enabled) return ['ads_disabled'];
  const slot = ads.slots[position];
  const blockers: AdBlocker[] = [];
  if (ads.publisherId === null) blockers.push('missing_publisher_id');
  if (consent.cmp === null) blockers.push('missing_cmp');
  if (slot.adUnitId === null) blockers.push('missing_ad_unit');
  if (slot.reservedHeightClass === null) blockers.push('missing_reserved_height');
  return blockers;
}
