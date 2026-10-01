/**
 * Adaptador de precisión decimal.
 *
 * ÚNICO módulo de la aplicación que importa `decimal.js` (ESLint lo impide en
 * cualquier otro archivo). El resto del código usa la clase `Decimal` de este
 * módulo, de modo que la librería puede sustituirse sin tocar ninguna fórmula.
 * Decisión y alternativas: docs/adr/0003-precision-numerica.md.
 *
 * PRECISIÓN
 *   40 dígitos significativos en el resultado de cada operación. Los valores
 *   construidos con `Decimal.from` conservan todos sus dígitos (decimal.js no
 *   redondea al construir). La capa de entrada limita los datos del usuario a
 *   30 dígitos (ver core/input/decimal-input.ts), por debajo de la precisión.
 *
 * REDONDEO
 *   - Interno (solo cuando una operación supera 40 dígitos, p. ej. 1/3):
 *     ROUND_HALF_EVEN, que no introduce sesgo acumulado.
 *   - Explícito: `round(dp, mode)` y `toFixed(dp, mode)`, con el modo SIEMPRE
 *     obligatorio. El redondeo monetario se hace al presentar (i18n/format),
 *     no durante el cálculo, salvo que una calculadora declare y justifique
 *     otra política (docs/adr/0007-redondeo.md).
 *
 * CONVERSIÓN
 *   - Entrada: `Decimal.from(string | bigint | number)`.
 *       · string: solo literal decimal canónico `-?\d+(\.\d+)?`. Se rechazan
 *         exponentes, hexadecimales, espacios, "Infinity" y "NaN".
 *       · number: solo enteros seguros (Number.isSafeInteger). Los decimales
 *         deben escribirse como string ('0.21', no 0.21) para que ningún valor
 *         pase por coma flotante binaria.
 *   - Salida: `toString()` (notación plana, sin exponente, precisión completa),
 *     `toFixed(dp, mode)`, y `toNumberLossy()` solo para gráficos, nunca para
 *     cálculos ni para mostrar importes.
 *
 * OPERACIONES PERMITIDAS
 *   plus, minus, times, dividedBy, pow, negated, abs, round,
 *   comparaciones (cmp, equals, lessThan…), isZero, isNegative, isPositive,
 *   isInteger, decimalPlaces, Decimal.min / Decimal.max.
 *   Si una calculadora necesita otra (ln, exp, sqrt…), se añade aquí con tests.
 *
 * LIMITACIONES CONOCIDAS
 *   - Nunca se produce NaN ni ±Infinity: cualquier resultado no finito
 *     (división por cero, 0^-1, raíz de negativo vía pow) lanza DecimalError.
 *   - pow con exponente no entero: decimal.js documenta que el resultado se
 *     redondea correctamente "casi siempre" (no está garantizado en el 100 %
 *     de los casos en el último dígito de los 40).
 *   - Resultados con más de 40 dígitos significativos se redondean (HALF_EVEN).
 *   - `-0` se normaliza a `0`.
 */
import DecimalJs from 'decimal.js';

const PRECISION = 40;

const Engine = DecimalJs.clone({
  precision: PRECISION,
  rounding: DecimalJs.ROUND_HALF_EVEN,
  // Rango máximo permitido por decimal.js: toString() nunca usa exponente.
  toExpNeg: -9e15,
  toExpPos: 9e15,
  crypto: false,
});

type EngineValue = InstanceType<typeof Engine>;

/**
 * Modos de redondeo con los mismos nombres que `Intl.NumberFormat`
 * (`roundingMode`), para que no haya dos vocabularios en el proyecto.
 */
export type RoundingMode = 'halfExpand' | 'halfEven' | 'trunc' | 'expand' | 'floor' | 'ceil';

const ROUNDING: Readonly<Record<RoundingMode, DecimalJs.Rounding>> = {
  halfExpand: DecimalJs.ROUND_HALF_UP, // .5 se aleja de cero (redondeo "escolar")
  halfEven: DecimalJs.ROUND_HALF_EVEN, // .5 va al par más cercano
  trunc: DecimalJs.ROUND_DOWN, // hacia cero
  expand: DecimalJs.ROUND_UP, // alejándose de cero
  floor: DecimalJs.ROUND_FLOOR, // hacia menos infinito
  ceil: DecimalJs.ROUND_CEIL, // hacia más infinito
};

const CANONICAL_DECIMAL = /^-?\d+(?:\.\d+)?$/;
const MAX_DECIMAL_PLACES = 100;

export class DecimalError extends Error {
  override readonly name = 'DecimalError';
}

export class Decimal {
  readonly #value: EngineValue;

  private constructor(value: EngineValue) {
    if (!value.isFinite()) {
      throw new DecimalError('Resultado no finito (NaN o infinito).');
    }
    this.#value = value.isZero() ? new Engine(0) : value;
  }

  static from(input: string | bigint | number): Decimal {
    if (typeof input === 'string') {
      if (!CANONICAL_DECIMAL.test(input)) {
        throw new DecimalError(`Literal decimal no canónico: "${input}"`);
      }
      return new Decimal(new Engine(input));
    }
    if (typeof input === 'bigint') {
      return new Decimal(new Engine(input.toString()));
    }
    if (!Number.isSafeInteger(input)) {
      throw new DecimalError(
        `Solo se aceptan enteros seguros como number (recibido ${String(input)}). ` +
          'Usa un string para valores decimales.',
      );
    }
    return new Decimal(new Engine(input));
  }

  static readonly ZERO: Decimal = Decimal.from(0);
  static readonly ONE: Decimal = Decimal.from(1);

  static min(first: Decimal, ...rest: readonly Decimal[]): Decimal {
    return rest.reduce((acc, value) => (value.lessThan(acc) ? value : acc), first);
  }

  static max(first: Decimal, ...rest: readonly Decimal[]): Decimal {
    return rest.reduce((acc, value) => (value.greaterThan(acc) ? value : acc), first);
  }

  plus(other: Decimal): Decimal {
    return new Decimal(this.#value.plus(other.#value));
  }

  minus(other: Decimal): Decimal {
    return new Decimal(this.#value.minus(other.#value));
  }

  times(other: Decimal): Decimal {
    return new Decimal(this.#value.times(other.#value));
  }

  dividedBy(divisor: Decimal): Decimal {
    if (divisor.isZero()) {
      throw new DecimalError('División por cero.');
    }
    return new Decimal(this.#value.dividedBy(divisor.#value));
  }

  pow(exponent: Decimal): Decimal {
    return new Decimal(this.#value.pow(exponent.#value));
  }

  negated(): Decimal {
    return new Decimal(this.#value.negated());
  }

  abs(): Decimal {
    return new Decimal(this.#value.abs());
  }

  /** Redondea a `decimalPlaces` decimales con un modo explícito. */
  round(decimalPlaces: number, mode: RoundingMode): Decimal {
    assertDecimalPlaces(decimalPlaces);
    return new Decimal(this.#value.toDecimalPlaces(decimalPlaces, ROUNDING[mode]));
  }

  cmp(other: Decimal): -1 | 0 | 1 {
    const result = this.#value.cmp(other.#value);
    return result < 0 ? -1 : result > 0 ? 1 : 0;
  }

  equals(other: Decimal): boolean {
    return this.cmp(other) === 0;
  }

  lessThan(other: Decimal): boolean {
    return this.cmp(other) < 0;
  }

  lessThanOrEqual(other: Decimal): boolean {
    return this.cmp(other) <= 0;
  }

  greaterThan(other: Decimal): boolean {
    return this.cmp(other) > 0;
  }

  greaterThanOrEqual(other: Decimal): boolean {
    return this.cmp(other) >= 0;
  }

  isZero(): boolean {
    return this.#value.isZero();
  }

  isNegative(): boolean {
    return this.#value.isNegative() && !this.#value.isZero();
  }

  isPositive(): boolean {
    return this.#value.isPositive() && !this.#value.isZero();
  }

  isInteger(): boolean {
    return this.#value.isInteger();
  }

  /** Número de decimales significativos (1.50 → 1, 2 → 0). */
  decimalPlaces(): number {
    return this.#value.decimalPlaces();
  }

  /** Notación plana con precisión completa. Nunca usa exponente. */
  toString(): string {
    return this.#value.toString();
  }

  toFixed(decimalPlaces: number, mode: RoundingMode): string {
    assertDecimalPlaces(decimalPlaces);
    return this.#value.toFixed(decimalPlaces, ROUNDING[mode]);
  }

  /**
   * Conversión con pérdida a coma flotante. SOLO para representaciones
   * aproximadas (p. ej. coordenadas de un gráfico). Nunca para cálculos,
   * comparaciones ni para mostrar importes.
   */
  toNumberLossy(): number {
    return this.#value.toNumber();
  }

  toJSON(): string {
    return this.toString();
  }
}

function assertDecimalPlaces(decimalPlaces: number): void {
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > MAX_DECIMAL_PLACES) {
    throw new DecimalError(`Número de decimales inválido: ${String(decimalPlaces)}`);
  }
}
