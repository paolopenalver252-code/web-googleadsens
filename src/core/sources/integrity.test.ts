import { describe, expect, it } from 'vitest';

import { toIsoDate } from '../dates/iso-date';
import {
  findMissingSourceIds,
  findStaleSources,
  publicationBlockers,
  resolveSourceIds,
  sourcesForCalculator,
  validateSourceRegistry,
} from './integrity';
import type { SourceRecord } from './types';

/**
 * Registros FICTICIOS (dominio reservado example.org, RFC 2606). Solo
 * comprueban la mecánica del registro; no son fuentes reales.
 */
function source(overrides: Partial<SourceRecord> & { id: string }): SourceRecord {
  return {
    title: 'Documento ficticio',
    publisher: 'Organismo ficticio',
    url: 'https://example.org/documento',
    type: 'official',
    jurisdiction: 'ES',
    appliesTo: null,
    accessedAt: toIsoDate('2026-09-01'),
    reviewedAt: toIsoDate('2026-09-02'),
    supports: [{ calculatorId: 'calc-a', aspect: 'formula' }],
    status: 'verified',
    ...overrides,
  };
}

const known = new Set(['calc-a', 'calc-b']);

describe('validateSourceRegistry', () => {
  it('un registro coherente no tiene incidencias', () => {
    expect(validateSourceRegistry([source({ id: 'fuente-a' })], known)).toEqual([]);
  });

  it('detecta cada tipo de incidencia', () => {
    const issues = validateSourceRegistry(
      [
        source({ id: 'dup' }),
        source({ id: 'dup' }),
        source({ id: 'Id Mal' }),
        source({ id: 'http', url: 'http://example.org' }),
        source({ id: 'sin-dominio', url: 'https://localhost' }),
        source({ id: 'juris', jurisdiction: 'Spain' }),
        source({ id: 'vacia', title: '  ', publisher: '' }),
        source({
          id: 'periodo',
          appliesTo: { from: toIsoDate('2026-12-31'), to: toIsoDate('2026-01-01') },
        }),
        source({ id: 'sin-fechas', accessedAt: null }),
        source({
          id: 'orden',
          accessedAt: toIsoDate('2026-09-10'),
          reviewedAt: toIsoDate('2026-09-01'),
        }),
        source({ id: 'sin-apoyo', supports: [] }),
        source({
          id: 'calc-desconocida',
          supports: [{ calculatorId: 'no-existe', aspect: 'formula' }],
        }),
      ],
      known,
    );
    expect(issues).toEqual([
      { kind: 'duplicate_id', sourceId: 'dup' },
      { kind: 'invalid_id', sourceId: 'Id Mal' },
      { kind: 'invalid_url', sourceId: 'http' },
      { kind: 'invalid_url', sourceId: 'sin-dominio' },
      { kind: 'invalid_jurisdiction', sourceId: 'juris' },
      { kind: 'empty_field', sourceId: 'vacia', field: 'title' },
      { kind: 'empty_field', sourceId: 'vacia', field: 'publisher' },
      { kind: 'invalid_period', sourceId: 'periodo' },
      { kind: 'verified_without_dates', sourceId: 'sin-fechas' },
      { kind: 'reviewed_before_accessed', sourceId: 'orden' },
      { kind: 'no_supports', sourceId: 'sin-apoyo' },
      { kind: 'unknown_calculator', sourceId: 'calc-desconocida', calculatorId: 'no-existe' },
    ]);
  });

  it('una fuente sin verificar puede no tener fechas todavía', () => {
    const pending = source({
      id: 'pendiente',
      status: 'unverified',
      accessedAt: null,
      reviewedAt: null,
    });
    expect(validateSourceRegistry([pending], known)).toEqual([]);
  });
});

describe('referencias a fuentes', () => {
  const registry = [
    source({ id: 'secundaria', type: 'secondary' }),
    source({ id: 'oficial', type: 'official' }),
    source({
      id: 'academica',
      type: 'academic',
      supports: [{ calculatorId: 'calc-b', aspect: 'formula' }],
    }),
    source({ id: 'educativa', type: 'educational' }),
  ];

  it('detecta referencias a fuentes inexistentes', () => {
    expect(findMissingSourceIds(registry, ['oficial', 'inventada', 'inventada'])).toEqual([
      'inventada',
    ]);
    expect(() => resolveSourceIds(registry, ['oficial', 'inventada'])).toThrow(/inventada/);
  });

  it('ordena por autoridad: oficial → académica → educativa → secundaria', () => {
    expect(
      resolveSourceIds(registry, ['secundaria', 'educativa', 'academica', 'oficial']).map(
        (s) => s.id,
      ),
    ).toEqual(['oficial', 'academica', 'educativa', 'secundaria']);
  });

  it('devuelve las fuentes que respaldan una calculadora', () => {
    expect(sourcesForCalculator(registry, 'calc-a').map((s) => s.id)).toEqual([
      'oficial',
      'educativa',
      'secundaria',
    ]);
    expect(sourcesForCalculator(registry, 'calc-b').map((s) => s.id)).toEqual(['academica']);
    expect(sourcesForCalculator(registry, 'otra')).toEqual([]);
  });
});

describe('publicationBlockers', () => {
  it('bloquea sin fuentes o con fuentes sin verificar', () => {
    expect(publicationBlockers([], 'calc-a')).toEqual(['sin fuentes que respalden la calculadora']);
    expect(publicationBlockers([source({ id: 'x', status: 'unverified' })], 'calc-a')).toEqual([
      'fuente no verificada: x',
    ]);
    expect(publicationBlockers([source({ id: 'x' })], 'calc-a')).toEqual([]);
  });
});

describe('findStaleSources', () => {
  it('marca las fuentes con revisión más antigua que el umbral', () => {
    const recent = source({ id: 'reciente', reviewedAt: toIsoDate('2026-09-01') });
    const old = source({
      id: 'antigua',
      accessedAt: toIsoDate('2025-01-01'),
      reviewedAt: toIsoDate('2025-01-01'),
    });
    const never = source({ id: 'sin-revisar', status: 'unverified', reviewedAt: null });
    expect(
      findStaleSources([recent, old, never], toIsoDate('2026-09-29'), 365).map((s) => s.id),
    ).toEqual(['antigua']);
  });
});
