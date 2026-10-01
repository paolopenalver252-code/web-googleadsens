/**
 * Integridad del registro REAL de fuentes. Hoy está vacío a propósito (no se
 * registra ninguna fuente sin comprobarla); este test se vuelve efectivo en
 * cuanto se añada la primera. La detección de revisiones antiguas
 * (findStaleSources) está probada en src/core/sources/integrity.test.ts; su
 * umbral para el registro real está PENDIENTE DE DEFINIR.
 */
import { describe, expect, it } from 'vitest';

import { calculatorRegistry } from '@/calculators/registry';
import { validateSourceRegistry } from '@/core/sources/integrity';

import { sourceRegistry } from './registry';

describe('registro de fuentes', () => {
  it('no tiene incidencias de integridad', () => {
    const knownCalculators = new Set(calculatorRegistry.map((entry) => entry.calculator.id));
    expect(validateSourceRegistry(sourceRegistry, knownCalculators)).toEqual([]);
  });
});
