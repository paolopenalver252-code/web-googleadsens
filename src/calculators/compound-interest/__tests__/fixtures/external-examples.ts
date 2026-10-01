/**
 * Fixtures de regresión de la calculadora de interés compuesto (v1).
 *
 * REGLA: ningún valor esperado sale del motor. Todos se obtienen con
 * `independent-exact.mjs` (aritmética racional exacta con BigInt, sin
 * decimal.js ni código del proyecto) y, cuando existe, se contrastan con el
 * valor que publica una fuente.
 *
 *   expected.finalValue      valor independiente (exacto, o con 30 decimales)
 *   expected.exactInEngine   true ⇒ el valor exacto cabe en los 40 dígitos del
 *                            adaptador y el motor debe reproducirlo EXACTAMENTE;
 *                            false ⇒ se compara con tolerancia (TOLERANCE_EUR)
 *   provenance.publishedValue  lo que publica la fuente, tal cual; puede estar
 *                            truncado o redondeado a unidades (ver `tolerance`)
 *
 * Los ids de fuente son CANDIDATOS del informe de investigación: todavía no
 * están registrados ni verificados en src/sources/registry.ts.
 */
import type { ContributionTiming, Frequency, RateConvention } from '../../types';

/** Diferencia máxima admitida frente al valor independiente (muy por debajo del céntimo). */
export const TOLERANCE_EUR = `0.${'0'.repeat(19)}1`; // 1e-20

export type Provenance =
  | {
      readonly kind: 'source';
      /** Id candidato (informe de investigación, §14). NO verificado aún. */
      readonly sourceCandidateId: string;
      readonly url: string;
      /** Valor tal como lo publica la fuente. */
      readonly publishedValue: string;
      /** Diferencia máxima justificada entre el valor presentado y el publicado. */
      readonly tolerance: string;
      readonly note: string;
    }
  | { readonly kind: 'derivation'; readonly derivation: string };

export interface CompoundInterestFixture {
  readonly id: string;
  readonly covers: readonly string[];
  readonly input: {
    readonly initialCapital: string;
    /** Puntos porcentuales ("5" = 5 %). */
    readonly annualRatePercent: string;
    readonly rateConvention: RateConvention;
    readonly frequency: Frequency;
    readonly durationMonths: number;
    readonly contribution: { readonly amount: string; readonly timing: ContributionTiming } | null;
  };
  readonly expected: {
    readonly finalValue: string;
    readonly exactInEngine: boolean;
    /** halfExpand, 2 decimales. */
    readonly displayed: string;
    readonly totalInvested: string;
    /** halfExpand, 2 decimales. */
    readonly totalInterestDisplayed: string;
  };
  readonly provenance: Provenance;
}

export const COMPOUND_INTEREST_FIXTURES: readonly CompoundInterestFixture[] = [
  {
    id: 'F1',
    covers: ['solo capital', 'tipo efectivo', 'anual', 'punto medio exacto de redondeo'],
    input: {
      initialCapital: '1000',
      annualRatePercent: '5',
      rateConvention: 'effective',
      frequency: 'annual',
      durationMonths: 36,
      contribution: null,
    },
    expected: {
      finalValue: '1157.625',
      exactInEngine: true,
      displayed: '1157.63',
      totalInvested: '1000',
      totalInterestDisplayed: '157.63',
    },
    provenance: {
      kind: 'source',
      sourceCandidateId: 'fpt-interes-simple-compuesto-2023',
      url: 'https://www.finanzasparatodos.es/interes-simple-e-interes-compuesto-sabes-que-es-cada-uno',
      publishedValue: '157.63',
      tolerance: '0',
      note: 'La fuente da los intereses de los años 1–3: 50; 52,50; 55,13 (exacto 55,125, redondeado por exceso). Suma = 157,63 = FV − P.',
    },
  },
  {
    id: 'F2',
    covers: ['solo capital', 'TIN', 'mensual'],
    input: {
      initialCapital: '5000',
      annualRatePercent: '3.8',
      rateConvention: 'nominal',
      frequency: 'monthly',
      durationMonths: 60,
      contribution: null,
    },
    expected: {
      finalValue: '6044.433178596639388270291428908414',
      exactInEngine: false,
      displayed: '6044.43',
      totalInvested: '5000',
      totalInterestDisplayed: '1044.43',
    },
    provenance: {
      kind: 'source',
      sourceCandidateId: 'openstax-contemporary-math-6-4',
      url: 'https://openstax.org/books/contemporary-mathematics/pages/6-4-compound-interest',
      publishedValue: '6044.43',
      tolerance: '0',
      note: 'Example 6.41: 5.000 $ al 3,8 % capitalizable mensualmente durante 5 años.',
    },
  },
  {
    id: 'F3',
    covers: ['capital 0', 'aportación sin capital', 'aportación al final', 'TIN', 'mensual'],
    input: {
      initialCapital: '0',
      annualRatePercent: '3',
      rateConvention: 'nominal',
      frequency: 'monthly',
      durationMonths: 36,
      contribution: { amount: '1200', timing: 'end' },
    },
    expected: {
      finalValue: '45144.672370974821261941811281818646',
      exactInEngine: false,
      displayed: '45144.67',
      totalInvested: '43200',
      totalInterestDisplayed: '1944.67',
    },
    provenance: {
      kind: 'source',
      sourceCandidateId: 'uc3m-ocw-mf-tema6-rentas',
      url: 'https://ocw.uc3m.es/pluginfile.php/3397/mod_page/content/18/leccion6.pdf',
      publishedValue: '45144.67',
      tolerance: '0',
      note: 'Tema 6, pp. 50-51: 1.200 €/mes al final de mes, 36 meses, 3 % anual capitalizable mensualmente.',
    },
  },
  {
    id: 'F4a',
    covers: ['aportación al final', 'TIN anual', 'anual'],
    input: {
      initialCapital: '0',
      annualRatePercent: '8',
      rateConvention: 'nominal',
      frequency: 'annual',
      durationMonths: 120,
      contribution: { amount: '15000', timing: 'end' },
    },
    expected: {
      finalValue: '217298.43698864750592',
      exactInEngine: true,
      displayed: '217298.44',
      totalInvested: '150000',
      totalInterestDisplayed: '67298.44',
    },
    provenance: {
      kind: 'source',
      sourceCandidateId: 'openstax-principles-finance-8-2',
      url: 'https://openstax.org/books/principles-finance/pages/8-2-annuities',
      publishedValue: '217298',
      tolerance: '1',
      note: 'La fuente redondea a unidades ("FVa ≈ $217,298") y usa un factor intermedio redondeado a 6 decimales.',
    },
  },
  {
    id: 'F4b',
    covers: ['aportación al inicio', 'TIN anual', 'anual'],
    input: {
      initialCapital: '0',
      annualRatePercent: '8',
      rateConvention: 'nominal',
      frequency: 'annual',
      durationMonths: 120,
      contribution: { amount: '15000', timing: 'start' },
    },
    expected: {
      finalValue: '234682.3119477393063936',
      exactInEngine: true,
      displayed: '234682.31',
      totalInvested: '150000',
      totalInterestDisplayed: '84682.31',
    },
    provenance: {
      kind: 'source',
      sourceCandidateId: 'openstax-principles-finance-8-2',
      url: 'https://openstax.org/books/principles-finance/pages/8-2-annuities',
      publishedValue: '234682',
      tolerance: '1',
      note: 'La fuente redondea a unidades ("FVa ≈ $234,682").',
    },
  },
  {
    id: 'F5',
    covers: ['solo capital', 'TIN', 'trimestral'],
    input: {
      initialCapital: '7500',
      annualRatePercent: '4.5',
      rateConvention: 'nominal',
      frequency: 'quarterly',
      durationMonths: 120,
      contribution: null,
    },
    expected: {
      finalValue: '11732.826490433066140917393725615804',
      exactInEngine: false,
      displayed: '11732.83',
      totalInvested: '7500',
      totalInterestDisplayed: '4232.83',
    },
    provenance: {
      kind: 'source',
      sourceCandidateId: 'openstax-contemporary-math-6-4',
      url: 'https://openstax.org/books/contemporary-mathematics/pages/6-4-compound-interest',
      publishedValue: '11732.82',
      tolerance: '0.01',
      note: 'Example 6.42. La fuente TRUNCA los céntimos (exacto 11.732,8265): de ahí la tolerancia de 1 céntimo.',
    },
  },
  {
    id: 'F6',
    covers: [
      'capital y aportaciones',
      'aportación al final',
      'tipo efectivo',
      'semestral',
      'raíz exacta',
    ],
    input: {
      initialCapital: '1000',
      annualRatePercent: '6.09',
      rateConvention: 'effective',
      frequency: 'semiannual',
      durationMonths: 24,
      contribution: { amount: '100', timing: 'end' },
    },
    expected: {
      finalValue: '1543.87151',
      exactInEngine: true,
      displayed: '1543.87',
      totalInvested: '1400',
      totalInterestDisplayed: '143.87',
    },
    provenance: {
      kind: 'derivation',
      derivation:
        'i = √1,0609 − 1 = 0,03 (exacto); n = 4; FV = 1000·1,03⁴ + 100·(1,03⁴ − 1)/0,03 = 1125,50881 + 418,3627 = 1543,87151.',
    },
  },
  {
    id: 'F7',
    covers: ['0 %', 'aportación al inicio', 'mensual'],
    input: {
      initialCapital: '1000',
      annualRatePercent: '0',
      rateConvention: 'nominal',
      frequency: 'monthly',
      durationMonths: 12,
      contribution: { amount: '50', timing: 'start' },
    },
    expected: {
      finalValue: '1600',
      exactInEngine: true,
      displayed: '1600.00',
      totalInvested: '1600',
      totalInterestDisplayed: '0.00',
    },
    provenance: {
      kind: 'derivation',
      derivation: 'i = 0 ⇒ s(n|0) = n ⇒ FV = P + n·C = 1000 + 12·50 = 1600 (sin dividir entre i).',
    },
  },
  {
    id: 'F8a',
    covers: ['duración mínima', 'aportación al final', 'TIN', 'trimestral'],
    input: {
      initialCapital: '1000',
      annualRatePercent: '6',
      rateConvention: 'nominal',
      frequency: 'quarterly',
      durationMonths: 3,
      contribution: { amount: '100', timing: 'end' },
    },
    expected: {
      finalValue: '1115',
      exactInEngine: true,
      displayed: '1115.00',
      totalInvested: '1100',
      totalInterestDisplayed: '15.00',
    },
    provenance: {
      kind: 'derivation',
      derivation:
        'n = 1, i = 0,06/4 = 0,015. Final: P(1+i) + C = 1015 + 100 = 1115 (la aportación no genera interés).',
    },
  },
  {
    id: 'F8b',
    covers: ['duración mínima', 'aportación al inicio', 'TIN', 'trimestral'],
    input: {
      initialCapital: '1000',
      annualRatePercent: '6',
      rateConvention: 'nominal',
      frequency: 'quarterly',
      durationMonths: 3,
      contribution: { amount: '100', timing: 'start' },
    },
    expected: {
      finalValue: '1116.5',
      exactInEngine: true,
      displayed: '1116.50',
      totalInvested: '1100',
      totalInterestDisplayed: '16.50',
    },
    provenance: {
      kind: 'derivation',
      derivation: 'n = 1, i = 0,015. Inicio: (P + C)(1+i) = 1100·1,015 = 1116,5.',
    },
  },
  {
    id: 'F9',
    covers: [
      'capital y aportaciones',
      'aportación al inicio',
      'tipo efectivo',
      'mensual',
      'raíz irracional',
    ],
    input: {
      initialCapital: '500',
      annualRatePercent: '5',
      rateConvention: 'effective',
      frequency: 'monthly',
      durationMonths: 12,
      contribution: { amount: '100', timing: 'start' },
    },
    expected: {
      finalValue: '1757.257752959728084062622637853341',
      exactInEngine: false,
      displayed: '1757.26',
      totalInvested: '1700',
      totalInterestDisplayed: '57.26',
    },
    provenance: {
      kind: 'derivation',
      derivation:
        'i = 1,05^(1/12) − 1 (Newton entero, 80 dígitos); FV = 500·1,05 + 100·s(12|i)·(1+i). Control: C·i·s(12|i) = C·X = 5 exacto.',
    },
  },
  {
    id: 'F10',
    covers: ['capital y aportaciones', 'aportación al inicio', 'TIN', 'semestral'],
    input: {
      initialCapital: '2000',
      annualRatePercent: '4',
      rateConvention: 'nominal',
      frequency: 'semiannual',
      durationMonths: 36,
      contribution: { amount: '500', timing: 'start' },
    },
    expected: {
      finalValue: '5469.46652976',
      exactInEngine: true,
      displayed: '5469.47',
      totalInvested: '5000',
      totalInterestDisplayed: '469.47',
    },
    provenance: {
      kind: 'derivation',
      derivation: 'i = 0,02, n = 6; FV = 2000·1,02⁶ + 500·s(6|0,02)·1,02.',
    },
  },
  {
    id: 'F11',
    covers: ['capital y aportaciones', 'aportación al final', 'tipo efectivo', 'trimestral'],
    input: {
      initialCapital: '1000',
      annualRatePercent: '4',
      rateConvention: 'effective',
      frequency: 'quarterly',
      durationMonths: 24,
      contribution: { amount: '100', timing: 'end' },
    },
    expected: {
      finalValue: '1909.739989905717936631272823199416',
      exactInEngine: false,
      displayed: '1909.74',
      totalInvested: '1800',
      totalInterestDisplayed: '109.74',
    },
    provenance: {
      kind: 'derivation',
      derivation: 'i = 1,04^(1/4) − 1, n = 8; FV = 1000·1,04² + 100·(1,04² − 1)/i.',
    },
  },
  {
    id: 'F12',
    covers: ['duración máxima', 'solo capital', 'tipo efectivo', 'anual'],
    input: {
      initialCapital: '1000',
      annualRatePercent: '5',
      rateConvention: 'effective',
      frequency: 'annual',
      durationMonths: 1200,
      contribution: null,
    },
    expected: {
      finalValue: '131501.257846303455025597532093716748',
      exactInEngine: false,
      displayed: '131501.26',
      totalInvested: '1000',
      totalInterestDisplayed: '130501.26',
    },
    provenance: {
      kind: 'derivation',
      derivation: 'n = 100; FV = 1000·1,05^100 (valor exacto de 200 decimales; aquí, 30).',
    },
  },
];
