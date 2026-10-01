import { describe, expect, it } from 'vitest';

import { adsConfig, consentConfig, type AdsConfig } from '@/config/features';

import { adsScriptBlockers, adSlotBlockers } from './readiness';

// Ids FICTICIOS: marcadores evidentes de test, nunca reales.
const enabled: AdsConfig = {
  enabled: true,
  publisherId: null,
  slots: {
    'after-result': { reservedHeightClass: null, adUnitId: null, mobile: false },
    sidebar: { reservedHeightClass: 'min-h-40', adUnitId: 'TEST-SLOT', mobile: false },
    'end-of-content': { reservedHeightClass: null, adUnitId: null, mobile: false },
  },
};

describe('adSlotBlockers', () => {
  it('configuración real: anuncios desactivados en todas las posiciones, sin ids ni CMP', () => {
    for (const position of ['after-result', 'sidebar', 'end-of-content'] as const) {
      expect(adSlotBlockers(position, adsConfig, consentConfig)).toEqual(['ads_disabled']);
      expect(adsConfig.slots[position].adUnitId).toBeNull();
    }
    expect(adsConfig.publisherId).toBeNull();
    expect(consentConfig.cmp).toBeNull();
  });

  it('activados: enumera todo lo que falta', () => {
    expect(adSlotBlockers('after-result', enabled, { cmp: null })).toEqual([
      'missing_publisher_id',
      'missing_cmp',
      'missing_ad_unit',
      'missing_reserved_height',
    ]);
  });

  it('con id de editor, CMP certificada, bloque y altura: sin bloqueos', () => {
    expect(
      adSlotBlockers(
        'sidebar',
        { ...enabled, publisherId: 'ca-pub-TEST' },
        { cmp: { name: 'CMP de prueba', googleCertified: true, iabTcf: true } },
      ),
    ).toEqual([]);
  });
});

describe('adsScriptBlockers', () => {
  it('configuración real: desactivado', () => {
    expect(adsScriptBlockers(adsConfig, consentConfig)).toEqual(['ads_disabled']);
  });

  it('activado: exige id de editor y CMP certificada', () => {
    expect(adsScriptBlockers(enabled, { cmp: null })).toEqual([
      'missing_publisher_id',
      'missing_cmp',
    ]);
    expect(
      adsScriptBlockers(
        { ...enabled, publisherId: 'ca-pub-TEST' },
        { cmp: { name: 'CMP de prueba', googleCertified: true, iabTcf: true } },
      ),
    ).toEqual([]);
  });
});
