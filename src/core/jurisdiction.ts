/**
 * Jurisdicción como código ISO 3166: país ("ES") o subdivisión ISO 3166-2
 * ("ES-MD", "ES-PV", "ES-NA"…). La granularidad importa en España por los
 * tramos autonómicos y los regímenes forales.
 *
 * Solo se valida el FORMATO. Que un código concreto exista y corresponda a
 * la jurisdicción deseada se comprueba contra la norma ISO al registrarlo.
 */
const JURISDICTION_CODE = /^[A-Z]{2}(?:-[A-Z0-9]{1,3})?$/;

export function isJurisdictionCode(value: string): boolean {
  return JURISDICTION_CODE.test(value);
}
