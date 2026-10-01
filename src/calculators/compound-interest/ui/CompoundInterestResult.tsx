import { useEffect, useState } from 'preact/hooks';

import { DataTable, type DataTableColumn } from '@/components/calculator/DataTable';

import type { GrowthChartModel } from './chart-data';
import { compoundInterestCopy } from './copy.es-ES';
import type { FormattedCompoundInterestResult, FormattedScheduleRow } from './format-result';
import type { GrowthChart as GrowthChartComponent, GrowthChartProps } from './GrowthChart';

const copy = compoundInterestCopy.result;
const scheduleCopy = compoundInterestCopy.schedule;
const chartCopy = compoundInterestCopy.chart;

const ID = 'compound-interest';

const SCHEDULE_COLUMNS: readonly DataTableColumn<keyof FormattedScheduleRow>[] = [
  { key: 'period', header: scheduleCopy.columns.period, rowHeader: true },
  { key: 'interest', header: scheduleCopy.columns.interest, align: 'end' },
  { key: 'cumulativeInvested', header: scheduleCopy.columns.cumulativeInvested, align: 'end' },
  { key: 'cumulativeInterest', header: scheduleCopy.columns.cumulativeInterest, align: 'end' },
  { key: 'closingBalance', header: scheduleCopy.columns.closingBalance, align: 'end' },
];

function Metric({ term, value }: { readonly term: string; readonly value: string }) {
  return (
    <div class="flex flex-col gap-0.5 rounded-control border border-border bg-surface px-4 py-3">
      <dt class="text-sm text-muted">{term}</dt>
      <dd class="text-lg font-semibold text-text tabular-nums">{value}</dd>
    </div>
  );
}

export interface CompoundInterestResultProps {
  readonly result: FormattedCompoundInterestResult;
  /** Frase que resume el resultado; es también la alternativa textual del gráfico. */
  readonly explanation: string;
  readonly schedule: readonly FormattedScheduleRow[];
  readonly chart: GrowthChartModel;
}

/**
 * Resultado de la calculadora. Recibe los textos YA formateados y el modelo
 * del gráfico: no calcula ni redondea (ver format-result.ts y chart-data.ts).
 * Listas de definición (<dl>) para que cada cifra se lea junto a su concepto.
 */
export function CompoundInterestResult({
  result,
  explanation,
  schedule,
  chart,
}: CompoundInterestResultProps) {
  return (
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <dl class="rounded-card bg-accent-soft px-4 py-5 sm:px-5">
          <dt class="text-sm font-medium text-muted">{copy.finalValue}</dt>
          <dd class="mt-1 text-3xl font-bold tracking-tight text-text tabular-nums sm:text-4xl">
            {result.finalValue}
          </dd>
        </dl>
        <p class="text-text">{explanation}</p>
      </div>

      <div class="flex flex-col gap-3">
        <h3 class="text-base font-semibold text-text">{copy.summaryLabel}</h3>
        <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Metric term={copy.initialCapital} value={result.initialCapital} />
          <Metric term={copy.contributions} value={result.totalContributions} />
          <Metric term={copy.interest} value={result.totalInterest} />
          <Metric term={copy.effectiveAnnualRate} value={result.effectiveAnnualRate} />
          {result.hasContributions ? (
            <>
              <Metric term={copy.totalInvested} value={result.totalInvested} />
              <Metric term={copy.contributionCount} value={result.contributionCount} />
            </>
          ) : null}
        </dl>
      </div>

      <section aria-labelledby={`${ID}-chart-heading`} class="flex min-w-0 flex-col gap-3">
        <h3 id={`${ID}-chart-heading`} class="text-base font-semibold text-text">
          {chartCopy.heading}
        </h3>
        <DeferredGrowthChart id={`${ID}-chart`} model={chart} />
      </section>

      <section aria-labelledby={`${ID}-schedule-heading`} class="flex min-w-0 flex-col gap-3">
        <h3 id={`${ID}-schedule-heading`} class="text-base font-semibold text-text">
          {scheduleCopy.heading}
        </h3>
        <p class="text-sm text-muted">{scheduleCopy.note}</p>
        <DataTable
          id={`${ID}-schedule`}
          caption={scheduleCopy.caption}
          columns={SCHEDULE_COLUMNS}
          rows={schedule}
        />
      </section>
    </div>
  );
}

type ChartComponent = typeof GrowthChartComponent;

let chartModule: Promise<ChartComponent> | undefined;

/** El gráfico se descarga una sola vez, tras el primer resultado (docs/performance.md). */
function loadGrowthChart(): Promise<ChartComponent> {
  chartModule ??= import('./GrowthChart').then((module) => module.GrowthChart);
  return chartModule;
}

type ChartState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'ready'; readonly Chart: ChartComponent };

function DeferredGrowthChart(props: GrowthChartProps) {
  const [state, setState] = useState<ChartState>({ kind: 'loading' });

  useEffect(() => {
    let mounted = true;
    loadGrowthChart().then(
      (Chart) => {
        if (mounted) setState({ kind: 'ready', Chart });
      },
      () => {
        chartModule = undefined; // permite reintentar en el siguiente resultado
        if (mounted) setState({ kind: 'failed' });
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  if (state.kind === 'ready') return <state.Chart {...props} />;
  return (
    <p class="flex min-h-40 items-center justify-center rounded-control bg-surface-muted px-4 text-center text-sm text-muted">
      {state.kind === 'loading' ? chartCopy.loading : chartCopy.unavailable}
    </p>
  );
}
