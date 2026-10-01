import { describe, expect, it } from 'vitest';

import { andThen, err, map, ok, type Result } from './result';

describe('Result', () => {
  it('ok y err construyen las dos variantes discriminadas por `ok`', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('x')).toEqual({ ok: false, error: 'x' });
  });

  it('map transforma solo el valor correcto y conserva el error', () => {
    const good: Result<number, string> = ok(2);
    const bad: Result<number, string> = err('fallo');
    expect(map(good, (n: number) => n * 10)).toEqual(ok(20));
    expect(map(bad, (n: number) => n * 10)).toBe(bad);
  });

  it('andThen encadena operaciones que pueden fallar y corta en el primer error', () => {
    const half = (n: number): Result<number, string> =>
      n % 2 === 0 ? ok(n / 2) : err(`impar: ${String(n)}`);
    expect(andThen(ok(8), half)).toEqual(ok(4));
    expect(andThen(andThen(ok(6), half), half)).toEqual(err('impar: 3'));
    const initial: Result<number, string> = err('previo');
    expect(andThen(initial, half)).toBe(initial);
  });
});
