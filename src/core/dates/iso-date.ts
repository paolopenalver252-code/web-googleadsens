/**
 * Fechas de calendario como texto ISO 8601 "YYYY-MM-DD".
 *
 * Las vigencias normativas y las fechas de consulta son días de calendario,
 * no instantes: representarlas como `Date` introduce desfases por zona
 * horaria (el 1 de enero en Madrid aún es 31 de diciembre en UTC durante una
 * hora). Por eso se guardan como texto validado y se comparan
 * lexicográficamente, lo que es correcto para el formato fijo YYYY-MM-DD.
 */
declare const isoDateBrand: unique symbol;

export type IsoDate = string & { readonly [isoDateBrand]: true };

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_DATE.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function toIsoDate(value: string): IsoDate {
  if (!isIsoDate(value)) {
    throw new Error(`Fecha ISO inválida (se espera YYYY-MM-DD real): "${value}"`);
  }
  return value;
}

export function compareIsoDates(a: IsoDate, b: IsoDate): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isoDateParts(date: IsoDate): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
} {
  const [year, month, day] = date.split('-').map(Number);
  return { year: year ?? 0, month: month ?? 0, day: day ?? 0 };
}

/**
 * Día de calendario de un instante en una zona horaria IANA concreta
 * (p. ej. "Europe/Madrid"). Así "hoy" para las reglas es el día legal del
 * usuario y no el de UTC.
 */
export function isoDateInTimeZone(instant: Date, timeZone: string): IsoDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return toIsoDate(`${get('year')}-${get('month')}-${get('day')}`);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
