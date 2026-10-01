/**
 * Textos de la interfaz de la calculadora de interés compuesto (es-ES).
 *
 * Los placeholders son EJEMPLOS DE FORMATO, no recomendaciones ni valores por
 * defecto. No hay ningún valor preseleccionado: todos los campos empiezan
 * vacíos y las opciones sin elegir.
 *
 * Tipado contra la definición: si se añade, quita o renombra un campo o una
 * opción, TypeScript obliga a actualizar estos textos.
 */
import type { PresentationFor } from '@/components/calculator/CalculatorShell';

import type { compoundInterestFields } from '../definition';

type Fields = typeof compoundInterestFields;

export const compoundInterestFieldsCopy: {
  readonly [K in keyof Fields]: PresentationFor<Fields[K]>;
} = {
  initialCapital: {
    label: 'Capital inicial',
    hint: 'Cantidad de dinero con la que comienzas.',
    placeholder: 'Ej.: 10.000',
  },
  contributionAmount: {
    label: 'Aportación periódica',
    hint: 'Cantidad que aportas de forma periódica. Déjala vacía si no quieres hacer aportaciones.',
    placeholder: 'Ej.: 200',
  },
  annualRate: {
    label: 'Tipo de interés anual',
    placeholder: 'Ej.: 5',
  },
  rateConvention: {
    label: 'Tipo de tasa',
    hint: 'La TAE es un tipo efectivo anual. El TIN es un tipo nominal anual cuya frecuencia determina su equivalente efectivo.',
    optionLabels: {
      effective: 'TAE / tipo efectivo anual',
      nominal: 'TIN / tipo nominal anual',
    },
  },
  frequency: {
    label: 'Frecuencia de capitalización y aportación',
    hint: 'Indica cada cuánto se capitaliza el interés y se realiza la aportación.',
    optionLabels: {
      annual: 'Anual',
      semiannual: 'Semestral',
      quarterly: 'Trimestral',
      monthly: 'Mensual',
    },
  },
  contributionTiming: {
    label: 'Momento de la aportación',
    hint: 'Obligatorio solo si indicas una aportación periódica.',
    optionLabels: {
      start: 'Al inicio de cada periodo',
      end: 'Al final de cada periodo',
    },
  },
  durationValue: {
    label: 'Duración',
    inputMode: 'numeric',
    hint: 'Número entero. Debe ser compatible con la frecuencia: múltiplo de 12 meses si es anual, de 6 si es semestral y de 3 si es trimestral.',
  },
  durationUnit: {
    label: 'Unidad de la duración',
    optionLabels: {
      years: 'Años',
      months: 'Meses',
    },
  },
};

export const compoundInterestCopy = {
  submit: 'Calcular interés compuesto',
  result: {
    finalValue: 'Valor final',
    summaryLabel: 'Resumen',
    initialCapital: 'Capital inicial',
    contributions: 'Aportaciones',
    interest: 'Intereses generados',
    /** No se llama "TAE": no incluye comisiones (Mathematical Closure, decisión 1). */
    effectiveAnnualRate: 'Tipo efectivo anual equivalente',
    totalInvested: 'Total invertido',
    contributionCount: 'Número de aportaciones',
    /** Explicación breve del resultado; es también la alternativa textual del gráfico. */
    explanation: (parts: {
      readonly duration: string;
      readonly finalValue: string;
      readonly totalInvested: string;
      readonly totalInterest: string;
    }): string =>
      `Al cabo de ${parts.duration}, el valor final estimado es de ${parts.finalValue}: ` +
      `${parts.totalInvested} corresponden al capital aportado (capital inicial más aportaciones) ` +
      `y ${parts.totalInterest}, a intereses generados.`,
  },
  duration: {
    years: (count: number): string => (count === 1 ? '1 año' : `${String(count)} años`),
    months: (count: number): string => (count === 1 ? '1 mes' : `${String(count)} meses`),
    yearsAndMonths: (years: string, months: string): string => `${years} y ${months}`,
  },
  schedule: {
    heading: 'Evolución año a año',
    caption: 'Saldo al final de cada año',
    /** Fuera de la tabla: dentro del <caption> se desplazaría con ella en móvil. */
    note: 'El capital aportado incluye el capital inicial y las aportaciones realizadas hasta ese momento. Si la tabla no cabe en la pantalla, desplázala en horizontal.',
    columns: {
      period: 'Periodo',
      interest: 'Intereses del periodo',
      cumulativeInvested: 'Capital aportado',
      cumulativeInterest: 'Intereses acumulados',
      closingBalance: 'Saldo final',
    },
    year: (index: number): string => `Año ${String(index)}`,
    /** Tramo que no llega a un año completo: se nombra por sus meses, sin inventar años. */
    months: (from: number, to: number): string =>
      from === to ? `Mes ${String(from)}` : `Meses ${String(from)}–${String(to)}`,
  },
  chart: {
    heading: 'Evolución del saldo',
    legendBalance: 'Saldo (capital aportado más intereses)',
    legendInvested: 'Capital aportado',
    explore: 'Explorar el gráfico por periodos',
    instructions:
      'Pasa el cursor o el dedo sobre el gráfico, o usa las flechas del teclado, para ver cada periodo. La tabla siguiente contiene los mismos datos.',
    axes: (unit: 'years' | 'months'): string =>
      `Eje horizontal: ${unit === 'years' ? 'años' : 'meses'} transcurridos. Eje vertical: saldo en euros.`,
    start: 'Inicio',
    point: (parts: {
      readonly period: string;
      readonly balance: string;
      readonly invested: string;
      readonly interest: string;
    }): string =>
      `${parts.period}: saldo ${parts.balance}; capital aportado ${parts.invested}; intereses acumulados ${parts.interest}.`,
    loading: 'Cargando el gráfico…',
    unavailable: 'No se ha podido cargar el gráfico. Los mismos datos están en la tabla siguiente.',
  },
  announcement: (finalValue: string, interest: string): string =>
    `Valor final: ${finalValue}. Intereses generados: ${interest}.`,
} as const;
