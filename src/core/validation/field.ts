/**
 * PARSE → VALIDATION → TYPED INPUT
 *
 * Valida un campo numérico a partir del texto bruto: parsea (core/input),
 * decide si el vacío es aceptable y aplica las reglas de dominio del campo.
 * Devuelve códigos de error, nunca textos: los mensajes se resuelven en i18n.
 */
import {
  parseDecimalInput,
  type DecimalParseErrorCode,
  type DecimalParseNotice,
  type NumberSymbols,
} from '../input/decimal-input';
import { Decimal } from '../math/decimal';
import { err, ok, type Result } from '../result';

/** Convenciones numéricas del locale que necesita la capa de entrada. */
export interface NumberConventions extends NumberSymbols {
  readonly currencySymbol: string;
  readonly percentSign: string;
}

/**
 * Unidad del campo. Determina los símbolos que se admiten al pegar un valor,
 * cómo se formatean los límites en los mensajes y el sufijo visible en la UI.
 *
 * IMPORTANTE: un campo `percent` recibe PUNTOS porcentuales tal como los
 * escribe el usuario ("5,25" = 5,25 %). Convertirlo a ratio (0,0525) es una
 * decisión explícita de cada calculadora (ver `percentPointsToRatio`).
 */
export type FieldUnit = 'currency' | 'percent' | 'years' | 'months' | 'count' | 'none';

export interface DecimalFieldSpec {
  readonly kind: 'decimal';
  readonly required: boolean;
  readonly unit: FieldUnit;
  /** Límite inferior INCLUSIVO. Obligatorio: ningún campo numérico va sin límites. */
  readonly min: Decimal;
  /** Límite superior INCLUSIVO. Obligatorio: ningún campo numérico va sin límites. */
  readonly max: Decimal;
  readonly integer?: boolean;
  /** Máximo de decimales admitidos (p. ej. 2 para céntimos). */
  readonly maxFractionDigits?: number;
}

/**
 * Campo de opción cerrada (p. ej. frecuencia). El valor bruto es el
 * identificador de la opción (texto); las etiquetas visibles viven en la UI.
 */
export interface ChoiceFieldSpec<V extends string = string> {
  readonly kind: 'choice';
  readonly required: boolean;
  /** Identificadores permitidos, en el orden en que se muestran. */
  readonly options: readonly V[];
}

export type FieldSpec = DecimalFieldSpec | ChoiceFieldSpec;

export type BuiltinFieldErrorCode =
  | DecimalParseErrorCode
  | 'invalid_option'
  | 'required'
  | 'not_integer'
  | 'too_many_decimals'
  | 'below_min'
  | 'above_max'
  | 'calculation_out_of_range';

/** Códigos propios de una calculadora, con espacio de nombres: "<id>.<codigo>". */
export type CustomFieldErrorCode = `${string}.${string}`;

export type FieldErrorCode = BuiltinFieldErrorCode | CustomFieldErrorCode;

export type FieldErrorParams = Readonly<Record<string, Decimal | number | string>>;

export interface FieldError {
  /** Campo afectado; `null` para errores del formulario completo. */
  readonly field: string | null;
  readonly code: FieldErrorCode;
  readonly params?: FieldErrorParams;
}

export interface ValidatedField {
  /** `undefined` solo si el campo es opcional y está vacío. */
  readonly value: Decimal | undefined;
  readonly notices: readonly DecimalParseNotice[];
}

const MAX_FRACTION_DIGITS_LIMIT = 20;

export function validateDecimalField(
  field: string,
  raw: string,
  spec: DecimalFieldSpec,
  conventions: NumberConventions,
): Result<ValidatedField, FieldError> {
  const parsed = parseDecimalInput(raw, conventions, {
    affixes: affixesFor(spec.unit, conventions),
  });

  if (parsed.status === 'empty') {
    return spec.required ? err({ field, code: 'required' }) : ok({ value: undefined, notices: [] });
  }
  if (parsed.status === 'error') {
    return err({ field, code: parsed.code });
  }

  const { value } = parsed;
  if (spec.integer === true && !value.isInteger()) {
    return err({ field, code: 'not_integer' });
  }
  if (spec.maxFractionDigits !== undefined && value.decimalPlaces() > spec.maxFractionDigits) {
    return err({ field, code: 'too_many_decimals', params: { max: spec.maxFractionDigits } });
  }
  if (value.lessThan(spec.min)) {
    return err({ field, code: 'below_min', params: { min: spec.min } });
  }
  if (value.greaterThan(spec.max)) {
    return err({ field, code: 'above_max', params: { max: spec.max } });
  }
  return ok({ value, notices: parsed.notices });
}

/**
 * Construye una especificación de campo con los límites escritos como
 * literales decimales ('0', '1000000'), sin pasar por coma flotante.
 * Conserva el tipo literal de `required` para inferir la entrada tipada.
 */
export function decimalField<const R extends boolean>(options: {
  readonly required: R;
  readonly unit: FieldUnit;
  readonly min: string;
  readonly max: string;
  readonly integer?: boolean;
  readonly maxFractionDigits?: number;
}): DecimalFieldSpec & { readonly required: R } {
  const spec: DecimalFieldSpec & { readonly required: R } = {
    kind: 'decimal',
    required: options.required,
    unit: options.unit,
    min: Decimal.from(options.min),
    max: Decimal.from(options.max),
    ...(options.integer === undefined ? {} : { integer: options.integer }),
    ...(options.maxFractionDigits === undefined
      ? {}
      : { maxFractionDigits: options.maxFractionDigits }),
  };
  return spec;
}

/** Comprueba la coherencia de una especificación. Lanza: es un error de programación. */
export function assertValidFieldSpec(field: string, spec: DecimalFieldSpec): void {
  if (spec.min.greaterThan(spec.max)) {
    throw new Error(
      `Campo "${field}": min (${spec.min.toString()}) > max (${spec.max.toString()}).`,
    );
  }
  if (spec.maxFractionDigits !== undefined) {
    const digits = spec.maxFractionDigits;
    if (!Number.isInteger(digits) || digits < 0 || digits > MAX_FRACTION_DIGITS_LIMIT) {
      throw new Error(`Campo "${field}": maxFractionDigits inválido (${String(digits)}).`);
    }
    if (spec.integer === true && digits > 0) {
      throw new Error(`Campo "${field}": un campo entero no puede admitir decimales.`);
    }
  }
  if (spec.integer === true && (!spec.min.isInteger() || !spec.max.isInteger())) {
    throw new Error(`Campo "${field}": los límites de un campo entero deben ser enteros.`);
  }
}

export interface ValidatedChoice<V extends string = string> {
  /** `undefined` solo si el campo es opcional y no se ha elegido nada. */
  readonly value: V | undefined;
  /** Las opciones no generan avisos de interpretación; se mantiene la forma común. */
  readonly notices: readonly DecimalParseNotice[];
}

/** Valida que el valor bruto sea exactamente una de las opciones permitidas. */
export function validateChoiceField<V extends string>(
  field: string,
  raw: string,
  spec: ChoiceFieldSpec<V>,
): Result<ValidatedChoice<V>, FieldError> {
  if (raw === '') {
    return spec.required ? err({ field, code: 'required' }) : ok({ value: undefined, notices: [] });
  }
  const option = spec.options.find((candidate) => candidate === raw);
  return option === undefined
    ? err({ field, code: 'invalid_option' })
    : ok({ value: option, notices: [] });
}

/** Construye un campo de opción conservando los literales de las opciones. */
export function choiceField<const V extends string, const R extends boolean>(options: {
  readonly required: R;
  readonly options: readonly V[];
}): ChoiceFieldSpec<V> & { readonly required: R } {
  return { kind: 'choice', required: options.required, options: options.options };
}

const OPTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Comprueba la coherencia de un campo de opción. Lanza: es un error de programación. */
export function assertValidChoiceSpec(field: string, spec: ChoiceFieldSpec): void {
  if (spec.options.length < 2) {
    throw new Error(`Campo "${field}": un campo de opción necesita al menos dos opciones.`);
  }
  if (new Set(spec.options).size !== spec.options.length) {
    throw new Error(`Campo "${field}": opciones duplicadas.`);
  }
  for (const option of spec.options) {
    if (!OPTION_ID.test(option)) {
      throw new Error(`Campo "${field}": identificador de opción inválido "${option}".`);
    }
  }
}

function affixesFor(unit: FieldUnit, conventions: NumberConventions): readonly string[] {
  switch (unit) {
    case 'currency':
      return [conventions.currencySymbol];
    case 'percent':
      return [conventions.percentSign];
    case 'years':
    case 'months':
    case 'count':
    case 'none':
      return [];
  }
}
