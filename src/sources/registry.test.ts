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

import { COMPOUND_INTEREST_FIXTURES } from '@/calculators/compound-interest/__tests__/fixtures/external-examples';

import { sourceRegistry } from './registry';

describe('registro de fuentes', () => {
  it('no tiene incidencias de integridad', () => {
    const knownCalculators = new Set(calculatorRegistry.map((entry) => entry.calculator.id));
    expect(validateSourceRegistry(sourceRegistry, knownCalculators)).toEqual([]);
  });
});

describe('fuentes de la calculadora de interés compuesto', () => {
  it('ninguna está verificada sin confirmación del titular (sin fechas mientras sea unverified)', () => {
    for (const source of sourceRegistry) {
      if (source.status === 'unverified') {
        expect(source.accessedAt, source.id).toBeNull();
        expect(source.reviewedAt, source.id).toBeNull();
      }
    }
  });

  it('los fixtures de regresión citan las mismas URLs que el registro', () => {
    const byId = new Map(sourceRegistry.map((source) => [source.id, source.url]));
    for (const fixture of COMPOUND_INTEREST_FIXTURES) {
      if (fixture.provenance.kind !== 'source') continue;
      const registered = byId.get(fixture.provenance.sourceCandidateId);
      // La candidata de la UC3M no está registrada: no se pudo leer su PDF.
      if (registered !== undefined) expect(fixture.provenance.url, fixture.id).toBe(registered);
    }
  });

  it('cubren todas las fórmulas de la metodología', () => {
    const aspects = new Set(
      sourceRegistry.flatMap((source) =>
        source.supports
          .filter((support) => support.calculatorId === 'compound-interest')
          .map((support) => support.aspect),
      ),
    );
    for (const aspect of [
      'concept',
      'formula:periodic-compounding',
      'formula:contributions-end',
      'formula:contributions-start',
      'formula:effective-annual-rate',
      'formula:equivalent-periodic-rate',
      'terminology:tae',
    ]) {
      expect(aspects.has(aspect), aspect).toBe(true);
    }
  });
});
