/**
 * Registro de fuentes. Política completa: docs/sources-policy.md.
 *
 * Una fuente solo puede tener `status: 'verified'` si una persona ha abierto
 * la URL, ha comprobado que respalda exactamente lo que dice `supports` y ha
 * anotado las fechas. Nunca se inventan fuentes, URLs ni atribuciones.
 */
import type { IsoDate } from '../dates/iso-date';

/** Orden de prioridad: la primera es la de mayor autoridad. */
export const SOURCE_TYPES = ['official', 'academic', 'educational', 'secondary'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export type SourceStatus = 'verified' | 'unverified';

/** Qué parte concreta de una calculadora respalda la fuente. */
export interface SourceSupport {
  readonly calculatorId: string;
  /** Aspecto respaldado, p. ej. "formula", "rule:tramos", "rounding". */
  readonly aspect: string;
  readonly note?: string;
}

export interface SourcePeriod {
  readonly from: IsoDate;
  /** `null` = sin fecha de fin conocida. */
  readonly to: IsoDate | null;
}

export interface SourceRecord {
  /** Identificador estable, en kebab-case: "organismo-documento-2026". */
  readonly id: string;
  readonly title: string;
  /** Organismo o entidad que publica la fuente. */
  readonly publisher: string;
  /** URL exacta comprobada (https). */
  readonly url: string;
  readonly type: SourceType;
  /** Código ISO 3166 (ver core/jurisdiction.ts). */
  readonly jurisdiction: string;
  /** Año o periodo al que aplica; `null` si no depende del tiempo. */
  readonly appliesTo: SourcePeriod | null;
  /** Fecha en que se consultó la URL. Obligatoria si está verificada. */
  readonly accessedAt: IsoDate | null;
  /** Fecha de la última revisión del contenido. Obligatoria si está verificada. */
  readonly reviewedAt: IsoDate | null;
  readonly supports: readonly SourceSupport[];
  readonly status: SourceStatus;
  readonly notes?: string;
}

/** Texto obligatorio cuando falta una fuente o no está comprobada. */
export const UNVERIFIED_LABEL = 'NO VERIFICADO — NECESITA FUENTE';
