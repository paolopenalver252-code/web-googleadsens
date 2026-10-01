/**
 * Formateo localizado de resultados.
 *
 * Reparto de responsabilidades (docs/adr/0007-redondeo.md):
 *   1. El REDONDEO lo hace siempre el adaptador Decimal, con el modo declarado
 *      en la política de la calculadora. Es la fuente de verdad.
 *   2. Intl.NumberFormat solo LOCALIZA un valor ya redondeado: recibe un
 *      string decimal exacto (nunca un `number`) con exactamente los decimales
 *      pedidos, así que no redondea nada por su cuenta.
 *
 * `useGrouping: 'always'` es imprescindible: con el valor por defecto, Intl
 * formatea 1234,56 como "1234,56 €" en es-ES (solo agrupa desde 5 cifras).
 */
import type { DisplayRounding } from '@/core/calculator/definition';
import { isoDateParts, type IsoDate } from '@/core/dates/iso-date';
import type { Decimal } from '@/core/math/decimal';
import { percentPointsToRatio, ratioToPercentPoints } from '@/core/math/percent';

import type { LocaleDefinition } from './types';

type NumericString = `${number}`;

const formatterCache = new Map<string, Intl.NumberFormat>();

function numberFormat(tag: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${tag}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(tag, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function exact(value: Decimal): NumericString {
  // Decimal.toString() produce siempre notación plana válida como literal numérico.
  return value.toString() as NumericString;
}

function fractionOptions(digits: number): Intl.NumberFormatOptions {
  return { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: 'always' };
}

export function formatNumber(
  value: Decimal,
  locale: LocaleDefinition,
  rounding: DisplayRounding,
): string {
  const rounded = value.round(rounding.fractionDigits, rounding.mode);
  return numberFormat(locale.tag, fractionOptions(rounding.fractionDigits)).format(exact(rounded));
}

export function formatCurrency(
  value: Decimal,
  locale: LocaleDefinition,
  rounding: DisplayRounding,
): string {
  const rounded = value.round(rounding.fractionDigits, rounding.mode);
  return numberFormat(locale.tag, {
    style: 'currency',
    currency: locale.currency,
    ...fractionOptions(rounding.fractionDigits),
  }).format(exact(rounded));
}

/**
 * Recibe un RATIO (0.0525 → "5,25 %"), como Intl. El redondeo se aplica a
 * los puntos porcentuales, que es lo que ve el usuario.
 */
export function formatPercent(
  ratio: Decimal,
  locale: LocaleDefinition,
  rounding: DisplayRounding,
): string {
  const points = ratioToPercentPoints(ratio).round(rounding.fractionDigits, rounding.mode);
  return numberFormat(locale.tag, {
    style: 'percent',
    ...fractionOptions(rounding.fractionDigits),
  }).format(exact(percentPointsToRatio(points)));
}

/** Formatea un día de calendario sin desfases de zona horaria. */
export function formatIsoDate(
  date: IsoDate,
  locale: LocaleDefinition,
  style: 'long' | 'medium' | 'short' = 'long',
): string {
  const { year, month, day } = isoDateParts(date);
  return new Intl.DateTimeFormat(locale.tag, { dateStyle: style, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
