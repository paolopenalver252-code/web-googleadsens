/**
 * Contrato de una calculadora.
 *
 *   RAW (strings del formulario)
 *     → validación por campo                (numéricos: parse + límites;
 *                                            opción: pertenencia a la lista)
 *     → toInput(fields, context)            (reglas entre campos + reglas vigentes)
 *     → compute(input)                      (motor PURO: sin DOM, sin fecha actual)
 *     → Output                              (Decimal con precisión completa)
 *     → UI formatea con i18n/format         (redondeo solo al presentar)
 *
 * Una calculadora nueva solo define este objeto (y su UI); el parseo, la
 * validación, la gestión de errores y la presentación son comunes.
 */
import type { IsoDate } from '../dates/iso-date';
import type { DecimalParseNotice } from '../input/decimal-input';
import { DecimalError, type Decimal, type RoundingMode } from '../math/decimal';
import { err, ok, type Result } from '../result';
import {
  assertValidChoiceSpec,
  assertValidFieldSpec,
  validateChoiceField,
  validateDecimalField,
  type ChoiceFieldSpec,
  type FieldError,
  type FieldSpec,
  type NumberConventions,
  type ValidatedChoice,
  type ValidatedField,
} from '../validation/field';

export type FieldSpecs = Readonly<Record<string, FieldSpec>>;

/** Valor tipado de un campo: `Decimal` si es numérico; el literal de la opción si es de opción. */
export type ParsedFieldValue<S extends FieldSpec> =
  S extends ChoiceFieldSpec<infer V> ? V : Decimal;

/** Entrada tipada tras validar: los campos obligatorios nunca son `undefined`. */
export type ParsedFields<F extends FieldSpecs> = {
  readonly [K in keyof F]: F[K]['required'] extends true
    ? ParsedFieldValue<F[K]>
    : ParsedFieldValue<F[K]> | undefined;
};

export type ValidatedFieldValue = ValidatedField | ValidatedChoice;

function validateField(
  field: string,
  raw: string,
  spec: FieldSpec,
  conventions: NumberConventions,
): Result<ValidatedFieldValue, FieldError> {
  return spec.kind === 'choice'
    ? validateChoiceField(field, raw, spec)
    : validateDecimalField(field, raw, spec, conventions);
}

export type RawFieldValues<F extends FieldSpecs> = { readonly [K in keyof F]: string };

export type FieldNotices<F extends FieldSpecs> = {
  readonly [K in keyof F]?: readonly DecimalParseNotice[];
};

/** Datos del entorno que el motor NO obtiene por sí mismo (determinismo). */
export interface CalculatorContext {
  /** Día de calendario del usuario; decide qué reglas están vigentes. */
  readonly today: IsoDate;
}

export interface DisplayRounding {
  readonly fractionDigits: number;
  readonly mode: RoundingMode;
}

export interface RoundingPolicy {
  /** Redondeo al presentar resultados. */
  readonly display: {
    readonly currency: DisplayRounding;
    readonly percent: DisplayRounding;
    readonly number: DisplayRounding;
  };
  /**
   * Redondeo DURANTE el cálculo. 'none' salvo que una norma concreta lo exija;
   * en ese caso se describe y se cita la fuente (ids del registro).
   */
  readonly intermediate:
    'none' | { readonly description: string; readonly sources: readonly string[] };
}

/**
 * Política por defecto. DECISIÓN PENDIENTE (#7): modo de redondeo al mostrar.
 * Se propone `halfExpand` (0,005 → 0,01); cada calculadora puede declarar la
 * suya. Ver docs/adr/0007-redondeo.md.
 */
export const DEFAULT_ROUNDING_POLICY: RoundingPolicy = {
  display: {
    currency: { fractionDigits: 2, mode: 'halfExpand' },
    percent: { fractionDigits: 2, mode: 'halfExpand' },
    number: { fractionDigits: 2, mode: 'halfExpand' },
  },
  intermediate: 'none',
};

/** Metadatos que necesitan las páginas y los registros (sin el motor). */
export interface CalculatorMetadata {
  /** kebab-case estable; se usa en fuentes, tests y registro. */
  readonly id: string;
  /** Segmento de URL: /<slug>. */
  readonly slug: string;
  /** SemVer del motor. Cambiar una fórmula ⇒ subir versión y revisar regresión. */
  readonly version: string;
  /** Ids de calculadoras relacionadas, enlazadas explícitamente. */
  readonly related: readonly string[];
}

export interface CalculatorDefinition<
  F extends FieldSpecs,
  Input,
  Output,
> extends CalculatorMetadata {
  readonly fields: F;
  readonly toInput: (
    fields: ParsedFields<F>,
    context: CalculatorContext,
  ) => Result<Input, readonly FieldError[]>;
  readonly compute: (input: Input) => Output;
  readonly rounding: RoundingPolicy;
}

const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

/**
 * Valida y congela una definición al cargar el módulo: un error aquí rompe
 * los tests y el build, nunca llega al usuario.
 */
export function defineCalculator<const F extends FieldSpecs, Input, Output>(
  definition: CalculatorDefinition<F, Input, Output>,
): CalculatorDefinition<F, Input, Output> {
  const { id, slug, version, fields, related, rounding } = definition;
  if (!KEBAB_ID.test(id)) throw new Error(`Calculadora: id inválido "${id}"`);
  if (!KEBAB_ID.test(slug)) throw new Error(`Calculadora "${id}": slug inválido "${slug}"`);
  if (!SEMVER.test(version)) throw new Error(`Calculadora "${id}": versión no SemVer "${version}"`);

  const names = Object.keys(fields);
  if (names.length === 0) throw new Error(`Calculadora "${id}": no define campos`);
  for (const name of names) {
    const spec = fields[name];
    if (spec?.kind === 'choice') assertValidChoiceSpec(name, spec);
    else if (spec) assertValidFieldSpec(name, spec);
  }

  if (related.includes(id)) throw new Error(`Calculadora "${id}": se relaciona consigo misma`);
  if (new Set(related).size !== related.length) {
    throw new Error(`Calculadora "${id}": calculadoras relacionadas duplicadas`);
  }

  for (const display of Object.values(rounding.display)) {
    if (
      !Number.isInteger(display.fractionDigits) ||
      display.fractionDigits < 0 ||
      display.fractionDigits > 20
    ) {
      throw new Error(`Calculadora "${id}": decimales de presentación inválidos`);
    }
  }

  return Object.freeze({ ...definition });
}

/** Valida un único campo (p. ej. al salir del campo en la UI). */
export function validateCalculatorField<F extends FieldSpecs, Input, Output>(
  definition: CalculatorDefinition<F, Input, Output>,
  field: keyof F & string,
  raw: string,
  conventions: NumberConventions,
): Result<ValidatedFieldValue, FieldError> {
  const spec = definition.fields[field];
  if (spec === undefined) throw new Error(`Campo desconocido: "${field}"`);
  return validateField(field, raw, spec, conventions);
}

export interface ParsedCalculatorInput<F extends FieldSpecs, Input> {
  readonly input: Input;
  readonly notices: FieldNotices<F>;
}

/** RAW → entrada tipada. Devuelve TODOS los errores de campo a la vez. */
export function parseCalculatorInput<F extends FieldSpecs, Input, Output>(
  definition: CalculatorDefinition<F, Input, Output>,
  raw: RawFieldValues<F>,
  conventions: NumberConventions,
  context: CalculatorContext,
): Result<ParsedCalculatorInput<F, Input>, readonly FieldError[]> {
  const errors: FieldError[] = [];
  const values: Record<string, Decimal | string | undefined> = {};
  const notices: Record<string, readonly DecimalParseNotice[]> = {};

  for (const [name, spec] of Object.entries(definition.fields)) {
    const result = validateField(name, raw[name] ?? '', spec, conventions);
    if (result.ok) {
      values[name] = result.value.value;
      if (result.value.notices.length > 0) notices[name] = result.value.notices;
    } else {
      errors.push(result.error);
    }
  }
  if (errors.length > 0) return err(errors);

  // Aserción justificada: `values` contiene exactamente las claves de
  // `definition.fields`, cada campo obligatorio ha pasado la validación (un
  // obligatorio vacío habría producido 'required') y cada valor es del tipo de
  // su especificación (Decimal para numéricos, una opción permitida para opción).
  const input = definition.toInput(values as ParsedFields<F>, context);
  if (!input.ok) return input;
  return ok({ input: input.value, notices });
}

export interface CalculatorRun<F extends FieldSpecs, Input, Output> extends ParsedCalculatorInput<
  F,
  Input
> {
  readonly output: Output;
}

/** Parseo + cálculo. Un DecimalError del motor se convierte en error de formulario. */
export function runCalculator<F extends FieldSpecs, Input, Output>(
  definition: CalculatorDefinition<F, Input, Output>,
  raw: RawFieldValues<F>,
  conventions: NumberConventions,
  context: CalculatorContext,
): Result<CalculatorRun<F, Input, Output>, readonly FieldError[]> {
  const parsed = parseCalculatorInput(definition, raw, conventions, context);
  if (!parsed.ok) return parsed;
  try {
    return ok({ ...parsed.value, output: definition.compute(parsed.value.input) });
  } catch (error) {
    if (error instanceof DecimalError) {
      return err([{ field: null, code: 'calculation_out_of_range' }]);
    }
    throw error;
  }
}
