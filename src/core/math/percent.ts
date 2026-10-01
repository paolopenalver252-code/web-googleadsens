/**
 * Conversión de unidades entre puntos porcentuales y ratio.
 *
 * Los campos `percent` reciben puntos ("5,25" → 5.25) y los formateadores de
 * porcentaje reciben ratios (0.0525 → "5,25 %"), igual que Intl.NumberFormat.
 * Estas funciones hacen la conversión explícita para que nunca se confundan.
 * No es una fórmula financiera: es un cambio de unidad exacto (÷100 / ×100).
 */
import { Decimal } from './decimal';

const HUNDRED = Decimal.from(100);

export function percentPointsToRatio(points: Decimal): Decimal {
  return points.dividedBy(HUNDRED);
}

export function ratioToPercentPoints(ratio: Decimal): Decimal {
  return ratio.times(HUNDRED);
}
