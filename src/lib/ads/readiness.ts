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
  const global = adsScriptBlockers(ads, consent);
  if (global.includes('ads_disabled')) return global;
  const slot = ads.slots[position];
  const blockers: AdBlocker[] = [...global];
  if (slot.adUnitId === null) blockers.push('missing_ad_unit');
  if (slot.reservedHeightClass === null) blockers.push('missing_reserved_height');
  return blockers;
}

export type AdsScriptBlocker = Extract<
  AdBlocker,
  'ads_disabled' | 'missing_publisher_id' | 'missing_cmp'
>;

/** Requisitos globales para cargar el script de AdSense (una vez por página). */
export function adsScriptBlockers(
  ads: AdsConfig,
  consent: ConsentConfig,
): readonly AdsScriptBlocker[] {
  if (!ads.enabled) return ['ads_disabled'];
  const blockers: AdsScriptBlocker[] = [];
  if (ads.publisherId === null) blockers.push('missing_publisher_id');
  if (consent.cmp === null) blockers.push('missing_cmp');
  return blockers;
}
