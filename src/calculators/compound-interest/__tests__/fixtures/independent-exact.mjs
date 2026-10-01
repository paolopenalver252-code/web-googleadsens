/* global console -- script de Node */
/* eslint-disable no-console -- script de procedencia: imprime la tabla de valores */
/**
 * PROCEDENCIA DE LOS VALORES ESPERADOS (external-examples.ts).
 *
 * Cálculo INDEPENDIENTE del motor: aritmética racional EXACTA con BigInt.
 * No usa decimal.js ni ningún código del proyecto. Las raíces m-ésimas (tipo
 * efectivo → tipo de periodo) se resuelven exactamente si la raíz es exacta y,
 * si no, por Newton entero con 80 dígitos.
 *
 * Modelo v1 (Mathematical Closure):
 *   n = M·m/12 ;  s(n|i) = ((1+i)^n − 1)/i  (i > 0) ;  s(n|0) = n
 *   final:  FV = P(1+i)^n + C·s(n|i)
 *   inicio: FV = P(1+i)^n + C·s(n|i)·(1+i)
 *   TIN r: i = r/m ;  efectivo X: i = (1+X)^(1/m) − 1
 *
 * Ejecutar:  node src/calculators/compound-interest/__tests__/fixtures/independent-exact.mjs
 */
const abs = (x) => (x < 0n ? -x : x);
const gcd = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a || 1n;
};
const R = (n, d = 1n) => {
  const g = gcd(abs(n), abs(d));
  const s = d < 0n ? -1n : 1n;
  return { n: (s * n) / g, d: (s * d) / g };
};
const dec = (str) => {
  const [i, f = ''] = str.split('.');
  return R(BigInt(i + f), 10n ** BigInt(f.length));
};
const add = (a, b) => R(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => R(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => R(a.n * b.n, a.d * b.d);
const div = (a, b) => R(a.n * b.d, a.d * b.n);
const pow = (a, k) => R(a.n ** BigInt(k), a.d ** BigInt(k));
const ONE = R(1n);

function iroot(v, m) {
  let lo = 0n;
  let hi = v + 1n;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (mid ** BigInt(m) < v) lo = mid + 1n;
    else hi = mid;
  }
  return lo ** BigInt(m) === v ? lo : null;
}

function root(x, m, P = 80) {
  const rn = iroot(x.n, m);
  const rd = iroot(x.d, m);
  if (rn !== null && rd !== null) return { value: R(rn, rd), exact: true };
  const scale = 10n ** BigInt(P);
  const N = (x.n * scale ** BigInt(m)) / x.d;
  let y = 10n ** BigInt(Math.ceil(N.toString().length / m) + 1);
  for (;;) {
    const next = ((BigInt(m) - 1n) * y + N / y ** BigInt(m - 1)) / BigInt(m);
    if (next >= y) break;
    y = next;
  }
  return { value: R(y, scale), exact: false };
}

function round(x, dp) {
  const s = 10n ** BigInt(dp);
  const num = abs(x.n) * s;
  const q = num / x.d;
  const r = num % x.d;
  const v = 2n * r >= x.d ? q + 1n : q; // halfExpand
  const t = v.toString().padStart(dp + 1, '0');
  return `${x.n < 0n ? '-' : ''}${t.slice(0, -dp) || '0'}.${t.slice(-dp)}`;
}

/** Decimal finito (denominador solo con factores 2 y 5): se puede escribir exacto. */
function terminating(x) {
  let d = x.d;
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  return d === 1n;
}

const PERIODS = { annual: 1, semiannual: 2, quarterly: 4, monthly: 12 };
const sNi = (i, n) => (i.n === 0n ? R(BigInt(n)) : div(sub(pow(add(ONE, i), n), ONE), i));

function run(f) {
  const m = PERIODS[f.frequency];
  const n = (f.months * m) / 12;
  const rate = div(dec(f.ratePercent), R(100n));
  let i;
  let rootExact = true;
  if (f.convention === 'nominal') i = div(rate, R(BigInt(m)));
  else {
    const r = root(add(ONE, rate), m);
    i = sub(r.value, ONE);
    rootExact = r.exact;
  }
  const P = dec(f.P);
  const C = dec(f.C ?? '0');
  const s = sNi(i, n);
  const contributions = f.timing === 'start' ? mul(mul(C, s), add(ONE, i)) : mul(C, s);
  const FV = add(mul(P, pow(add(ONE, i), n)), contributions);
  return {
    id: f.id,
    n,
    'FV (30 decimales)': round(FV, 30),
    'FV 2 dec (halfExpand)': round(FV, 2),
    'decimal finito': rootExact && terminating(FV) ? 'sí' : 'no',
  };
}

const fixtures = [
  {
    id: 'F1',
    P: '1000',
    ratePercent: '5',
    convention: 'effective',
    frequency: 'annual',
    months: 36,
  },
  {
    id: 'F2',
    P: '5000',
    ratePercent: '3.8',
    convention: 'nominal',
    frequency: 'monthly',
    months: 60,
  },
  {
    id: 'F3',
    P: '0',
    C: '1200',
    ratePercent: '3',
    convention: 'nominal',
    frequency: 'monthly',
    months: 36,
    timing: 'end',
  },
  {
    id: 'F4a',
    P: '0',
    C: '15000',
    ratePercent: '8',
    convention: 'nominal',
    frequency: 'annual',
    months: 120,
    timing: 'end',
  },
  {
    id: 'F4b',
    P: '0',
    C: '15000',
    ratePercent: '8',
    convention: 'nominal',
    frequency: 'annual',
    months: 120,
    timing: 'start',
  },
  {
    id: 'F5',
    P: '7500',
    ratePercent: '4.5',
    convention: 'nominal',
    frequency: 'quarterly',
    months: 120,
  },
  {
    id: 'F6',
    P: '1000',
    C: '100',
    ratePercent: '6.09',
    convention: 'effective',
    frequency: 'semiannual',
    months: 24,
    timing: 'end',
  },
  {
    id: 'F7',
    P: '1000',
    C: '50',
    ratePercent: '0',
    convention: 'nominal',
    frequency: 'monthly',
    months: 12,
    timing: 'start',
  },
  {
    id: 'F8a',
    P: '1000',
    C: '100',
    ratePercent: '6',
    convention: 'nominal',
    frequency: 'quarterly',
    months: 3,
    timing: 'end',
  },
  {
    id: 'F8b',
    P: '1000',
    C: '100',
    ratePercent: '6',
    convention: 'nominal',
    frequency: 'quarterly',
    months: 3,
    timing: 'start',
  },
  {
    id: 'F9',
    P: '500',
    C: '100',
    ratePercent: '5',
    convention: 'effective',
    frequency: 'monthly',
    months: 12,
    timing: 'start',
  },
  {
    id: 'F10',
    P: '2000',
    C: '500',
    ratePercent: '4',
    convention: 'nominal',
    frequency: 'semiannual',
    months: 36,
    timing: 'start',
  },
  {
    id: 'F11',
    P: '1000',
    C: '100',
    ratePercent: '4',
    convention: 'effective',
    frequency: 'quarterly',
    months: 24,
    timing: 'end',
  },
  {
    id: 'F12',
    P: '1000',
    ratePercent: '5',
    convention: 'effective',
    frequency: 'annual',
    months: 1200,
  },
];

console.table(fixtures.map(run));
