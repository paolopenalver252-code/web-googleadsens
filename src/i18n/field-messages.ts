/**
 * Convierte códigos de error/aviso (core) en texto localizado (UI).
 * Los límites se formatean según la unidad del campo: "1.000.000 €", "100 %".
 */
import type { DecimalParseNotice } from '@/core/input/decimal-input';
import { Decimal } from '@/core/math/decimal';
import { percentPointsToRatio } from '@/core/math/percent';
import type {
  BuiltinFieldErrorCode,
  DecimalFieldSpec,
  FieldError,
  FieldSpec,
  FieldUnit,
} from '@/core/validation/field';

import { formatCurrency, formatNumber, formatPercent } from './format';
import type { LocaleDefinition, MessageParams } from './types';

export type CustomMessages = Readonly<Record<string, (params: MessageParams) => string>>;

const GENERIC_ERROR = 'El valor no es válido.';

/** Formatea un valor de campo tal cual (sin redondear), con su unidad. */
export function formatFieldValue(
  value: Decimal,
  unit: FieldUnit,
  locale: LocaleDefinition,
): string {
  const exact = { fractionDigits: value.decimalPlaces(), mode: 'halfExpand' } as const;
  switch (unit) {
    case 'currency':
      return formatCurrency(value, locale, exact);
    case 'percent':
      return formatPercent(percentPointsToRatio(value), locale, exact);
    case 'years':
    case 'months': {
      const suffix = locale.messages.unitSuffixes[unit];
      const number = formatNumber(value, locale, exact);
      return suffix === undefined ? number : `${number} ${suffix}`;
    }
    case 'count':
    case 'none':
      return formatNumber(value, locale, exact);
  }
}

/**
 * Mensaje de un error. Orden de resolución: mensajes comunes → mensajes
 * pasados por la calculadora (`customMessages`) → mensajes de calculadora del
 * locale (`calculatorErrors`) → texto genérico (nunca el código interno).
 */
export function fieldErrorMessage(
  error: FieldError,
  spec: FieldSpec | undefined,
  locale: LocaleDefinition,
  customMessages: CustomMessages = {},
): string {
  const unit = spec?.kind === 'decimal' ? spec.unit : 'none';
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(error.params ?? {})) {
    params[key] = value instanceof Decimal ? formatFieldValue(value, unit, locale) : String(value);
  }

  const builtin = locale.messages.fieldErrors;
  if (isBuiltinCode(error.code, builtin)) return builtin[error.code](params);
  const custom = customMessages[error.code] ?? localeCalculatorMessage(error.code, locale);
  return custom === undefined ? GENERIC_ERROR : custom(params);
}

function localeCalculatorMessage(
  code: string,
  locale: LocaleDefinition,
): ((params: MessageParams) => string) | undefined {
  const messages: Readonly<Record<string, (params: MessageParams) => string>> =
    locale.messages.calculatorErrors;
  return Object.hasOwn(messages, code) ? messages[code] : undefined;
}

export function noticeMessage(
  notice: DecimalParseNotice,
  value: Decimal,
  spec: DecimalFieldSpec,
  locale: LocaleDefinition,
): string {
  return locale.messages.notices[notice](formatFieldValue(value, spec.unit, locale));
}

function isBuiltinCode(
  code: string,
  messages: LocaleDefinition['messages']['fieldErrors'],
): code is BuiltinFieldErrorCode {
  return Object.hasOwn(messages, code);
}
