/**
 * Isla Preact de la calculadora de interés compuesto: compone la
 * infraestructura común (CalculatorShell) con la definición existente.
 *
 * Flujo: textos del formulario → definition (validación) → engine → output
 * → format-result (único redondeo, de presentación) → CompoundInterestResult.
 * El gráfico (chart-data) y la tabla anual consumen el MISMO `output`: no
 * hay un segundo cálculo. Esta capa no contiene lógica financiera.
 *
 * Página de producción: src/pages/calculadora-interes-compuesto.astro.
 */
import { useMemo } from 'preact/hooks';

import { CalculatorShell } from '@/components/calculator/CalculatorShell';
import type { CalculatorContext } from '@/core/calculator/definition';
import { esES } from '@/i18n/locales/es-ES';

import { compoundInterest } from '../definition';
import type { CompoundInterestOutput } from '../types';
import { buildGrowthChart } from './chart-data';
import { compoundInterestCopy, compoundInterestFieldsCopy } from './copy.es-ES';
import { CompoundInterestResult } from './CompoundInterestResult';
import {
  formatCompoundInterestResult,
  formatCompoundInterestSchedule,
  formatDuration,
} from './format-result';

export interface CompoundInterestIslandProps {
  /** Inyectables en tests; en producción se usan los valores por defecto del shell. */
  readonly getContext?: () => CalculatorContext;
  readonly liveUpdateDelayMs?: number;
}

const format = (output: CompoundInterestOutput) =>
  formatCompoundInterestResult(output, esES, compoundInterest.rounding);

/** Se formatea una vez por resultado (no en cada pulsación mientras se escribe). */
function ResultView({ output }: { readonly output: CompoundInterestOutput }) {
  const view = useMemo(() => {
    const result = format(output);
    const schedule = formatCompoundInterestSchedule(output, esES, compoundInterest.rounding);
    return {
      result,
      schedule,
      explanation: compoundInterestCopy.result.explanation({
        duration: formatDuration(output.durationMonths),
        finalValue: result.finalValue,
        totalInvested: result.totalInvested,
        totalInterest: result.totalInterest,
      }),
      chart: buildGrowthChart(output, schedule, esES, compoundInterest.rounding),
    };
  }, [output]);
  return <CompoundInterestResult {...view} />;
}

export default function CompoundInterestIsland(props: CompoundInterestIslandProps) {
  return (
    <CalculatorShell
      definition={compoundInterest}
      locale={esES}
      fields={compoundInterestFieldsCopy}
      submitLabel={compoundInterestCopy.submit}
      renderResult={({ output }) => <ResultView output={output} />}
      summarize={({ output }) => {
        const result = format(output);
        return compoundInterestCopy.announcement(result.finalValue, result.totalInterest);
      }}
      {...(props.getContext ? { getContext: props.getContext } : {})}
      {...(props.liveUpdateDelayMs === undefined
        ? {}
        : { liveUpdateDelayMs: props.liveUpdateDelayMs })}
    />
  );
}
