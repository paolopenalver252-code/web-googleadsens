/**
 * CALCULADORA FICTICIA DE PRUEBA — NO ES UNA CALCULADORA NI CONTIENE FÓRMULAS.
 *
 * `compute` es la identidad: devuelve los valores interpretados tal cual. Su
 * único propósito es ejercitar la infraestructura (parseo, validación,
 * errores, resumen de errores, anuncios accesibles, resultado) en tests
 * unitarios y E2E. Vive en tests/ y solo se incluye en el build de pruebas.
 *
 * La regla entre campos (porcentaje obligatorio con más de 50 periodos) es
 * arbitraria y existe solo para probar los errores personalizados.
 */
import { DEFAULT_ROUNDING_POLICY, defineCalculator } from '@/core/calculator/definition';
import { Decimal } from '@/core/math/decimal';
import { err, ok } from '@/core/result';
import { decimalField } from '@/core/validation/field';

const LONG_PERIOD_THRESHOLD = Decimal.from(50);

export const echoCalculator = defineCalculator({
  id: 'test-echo',
  slug: 'test-echo',
  version: '0.0.0',
  fields: {
    importe: decimalField({
      required: true,
      unit: 'currency',
      min: '0',
      max: '1000000000',
      maxFractionDigits: 2,
    }),
    porcentaje: decimalField({
      required: false,
      unit: 'percent',
      min: '-100',
      max: '100',
      maxFractionDigits: 4,
    }),
    periodos: decimalField({ required: true, unit: 'years', min: '1', max: '100', integer: true }),
  },
  toInput: (fields) => {
    if (fields.periodos.greaterThan(LONG_PERIOD_THRESHOLD) && fields.porcentaje === undefined) {
      return err([{ field: 'porcentaje', code: 'test-echo.percent_required' }]);
    }
    return ok(fields);
  },
  compute: (input) => input,
  rounding: DEFAULT_ROUNDING_POLICY,
  related: [],
});

export const echoCustomMessages = {
  'test-echo.percent_required': () => 'Indica un porcentaje cuando hay más de 50 periodos.',
};
