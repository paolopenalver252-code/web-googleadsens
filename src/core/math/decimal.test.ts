import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { Decimal, DecimalError, type RoundingMode } from './decimal';
import { percentPointsToRatio, ratioToPercentPoints } from './percent';

const d = (value: string): Decimal => Decimal.from(value);

describe('Decimal.from', () => {
  it('acepta literales decimales canónicos, bigint y enteros seguros', () => {
    expect(d('0.1').toString()).toBe('0.1');
    expect(d('-12.345').toString()).toBe('-12.345');
    expect(Decimal.from(12345678901234567890n).toString()).toBe('12345678901234567890');
    expect(Decimal.from(42).toString()).toBe('42');
  });

  it('rechaza números no enteros para impedir el paso por coma flotante', () => {
    expect(() => Decimal.from(0.1)).toThrow(DecimalError);
    expect(() => Decimal.from(2 ** 53)).toThrow(DecimalError);
    expect(() => Decimal.from(Number.NaN)).toThrow(DecimalError);
  });

  it.each(['', ' 1', '1e5', '0x10', 'Infinity', 'NaN', '1.', '.5', '1,5', '+1', '--1'])(
    'rechaza el literal no canónico %j',
    (literal) => {
      expect(() => Decimal.from(literal)).toThrow(DecimalError);
    },
  );

  it('normaliza -0 a 0', () => {
    expect(d('-0').toString()).toBe('0');
    expect(d('-0.000').isNegative()).toBe(false);
  });

  it('conserva todos los dígitos de valores fuera del rango exacto de number', () => {
    expect(d('9007199254740993').toString()).toBe('9007199254740993');
    expect(d('0.1234567890123456789012345').toString()).toBe('0.1234567890123456789012345');
  });
});

describe('aritmética exacta', () => {
  it('0,1 + 0,2 = 0,3 exactamente (en coma flotante sería 0.30000000000000004)', () => {
    expect(d('0.1').plus(d('0.2')).equals(d('0.3'))).toBe(true);
  });

  it('opera con precisión decimal', () => {
    expect(d('1.1').times(d('1.1')).toString()).toBe('1.21');
    expect(d('10').minus(d('0.01')).toString()).toBe('9.99');
    expect(d('1').dividedBy(d('8')).toString()).toBe('0.125');
    expect(d('-5.5').abs().toString()).toBe('5.5');
    expect(d('5.5').negated().toString()).toBe('-5.5');
  });

  it('redondea a 40 dígitos significativos las divisiones no exactas', () => {
    expect(d('1').dividedBy(d('3')).toString()).toBe(`0.${'3'.repeat(40)}`);
  });

  it('pow admite exponentes enteros y no enteros', () => {
    expect(d('1.1').pow(d('2')).toString()).toBe('1.21');
    expect(d('2').pow(d('-2')).toString()).toBe('0.25');
    expect(d('1.21').pow(d('0.5')).toString()).toBe('1.1');
    expect(d('5').pow(d('0')).toString()).toBe('1');
  });

  it('lanza DecimalError en lugar de producir NaN o infinito', () => {
    expect(() => d('1').dividedBy(Decimal.ZERO)).toThrow(DecimalError);
    expect(() => Decimal.ZERO.pow(d('-1'))).toThrow(DecimalError);
    expect(() => d('-4').pow(d('0.5'))).toThrow(DecimalError);
  });
});

describe('comparaciones', () => {
  it('compara por valor, no por representación', () => {
    expect(d('1.50').equals(d('1.5'))).toBe(true);
    expect(d('2').cmp(d('10'))).toBe(-1);
    expect(d('10').cmp(d('2'))).toBe(1);
    expect(d('2').lessThanOrEqual(d('2'))).toBe(true);
    expect(d('3').greaterThanOrEqual(d('2'))).toBe(true);
    expect(d('3').greaterThan(d('3'))).toBe(false);
  });

  it('min y max', () => {
    expect(Decimal.min(d('3'), d('-1'), d('2')).toString()).toBe('-1');
    expect(Decimal.max(d('3'), d('-1'), d('7.5')).toString()).toBe('7.5');
  });

  it('predicados de signo y tipo', () => {
    expect(Decimal.ZERO.isZero()).toBe(true);
    expect(Decimal.ZERO.isPositive()).toBe(false);
    expect(Decimal.ZERO.isNegative()).toBe(false);
    expect(d('-0.01').isNegative()).toBe(true);
    expect(d('0.01').isPositive()).toBe(true);
    expect(d('3.000').isInteger()).toBe(true);
    expect(d('3.001').isInteger()).toBe(false);
    expect(d('1.50').decimalPlaces()).toBe(1);
  });
});

describe('redondeo explícito', () => {
  // Tabla derivada a mano de la definición de cada modo (mismos nombres que Intl).
  const cases: readonly [string, RoundingMode, string][] = [
    ['2.345', 'halfExpand', '2.35'],
    ['2.345', 'halfEven', '2.34'],
    ['2.355', 'halfEven', '2.36'],
    ['-2.345', 'halfExpand', '-2.35'],
    ['2.349', 'trunc', '2.34'],
    ['-2.349', 'trunc', '-2.34'],
    ['2.341', 'expand', '2.35'],
    ['-2.341', 'floor', '-2.35'],
    ['2.341', 'ceil', '2.35'],
    ['1.005', 'halfExpand', '1.01'],
  ];

  it.each(cases)('%s con %s → %s', (value, mode, expected) => {
    expect(d(value).round(2, mode).toString()).toBe(expected);
    expect(d(value).toFixed(2, mode)).toBe(expected);
  });

  it('toFixed conserva los ceros finales (útil para mostrar céntimos)', () => {
    expect(d('3').toFixed(2, 'halfExpand')).toBe('3.00');
  });

  it('rechaza un número de decimales inválido', () => {
    expect(() => d('1').round(-1, 'halfExpand')).toThrow(DecimalError);
    expect(() => d('1').round(1.5, 'halfExpand')).toThrow(DecimalError);
    expect(() => d('1').toFixed(101, 'halfExpand')).toThrow(DecimalError);
  });
});

describe('conversiones de salida', () => {
  it('toString nunca usa notación exponencial', () => {
    // 1 / 10^25 = 10^-25 → "0." seguido de 24 ceros y un 1.
    expect(
      d('1')
        .dividedBy(d(`1${'0'.repeat(25)}`))
        .toString(),
    ).toBe(`0.${'0'.repeat(24)}1`);
    expect(d(`1${'0'.repeat(30)}`).toString()).toBe(`1${'0'.repeat(30)}`);
  });

  it('toJSON serializa como texto exacto', () => {
    expect(JSON.stringify({ v: d('0.1') })).toBe('{"v":"0.1"}');
  });

  it('toNumberLossy existe solo para usos aproximados', () => {
    expect(d('0.5').toNumberLossy()).toBe(0.5);
  });
});

describe('puntos porcentuales y ratio', () => {
  it('convierte de forma exacta en ambos sentidos', () => {
    expect(percentPointsToRatio(d('5.25')).toString()).toBe('0.0525');
    expect(ratioToPercentPoints(d('0.0525')).toString()).toBe('5.25');
  });
});

describe('propiedades algebraicas (property-based)', () => {
  const decimalLiteral = fc
    .tuple(fc.boolean(), fc.bigInt({ min: 0n, max: 10n ** 15n }), fc.integer({ min: 0, max: 8 }))
    .map(([negative, digits, scale]) => {
      const text = digits.toString().padStart(scale + 1, '0');
      const literal = scale === 0 ? text : `${text.slice(0, -scale)}.${text.slice(-scale)}`;
      return negative && digits !== 0n ? `-${literal}` : literal;
    });

  it('la suma es conmutativa y asociativa (exacta dentro de la precisión)', () => {
    fc.assert(
      fc.property(decimalLiteral, decimalLiteral, decimalLiteral, (a, b, c) => {
        const [x, y, z] = [d(a), d(b), d(c)];
        expect(x.plus(y).equals(y.plus(x))).toBe(true);
        expect(
          x
            .plus(y)
            .plus(z)
            .equals(x.plus(y.plus(z))),
        ).toBe(true);
      }),
    );
  });

  it('(a + b) − b = a', () => {
    fc.assert(
      fc.property(decimalLiteral, decimalLiteral, (a, b) => {
        expect(d(a).plus(d(b)).minus(d(b)).equals(d(a))).toBe(true);
      }),
    );
  });

  it('toString → from reproduce el mismo valor', () => {
    fc.assert(
      fc.property(decimalLiteral, (a) => {
        expect(Decimal.from(d(a).toString()).equals(d(a))).toBe(true);
      }),
    );
  });
});
