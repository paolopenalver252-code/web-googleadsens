import {
  CalculatorShell,
  type CalculatorShellProps,
} from '@/components/calculator/CalculatorShell';
import { DataTable } from '@/components/calculator/DataTable';
import { percentPointsToRatio } from '@/core/math/percent';
import { formatCurrency, formatNumber, formatPercent } from '@/i18n/format';
import { esES } from '@/i18n/locales/es-ES';

import { echoCalculator, echoCustomMessages } from './definition';

type EchoDefinition = typeof echoCalculator;
type EchoShellProps = CalculatorShellProps<
  EchoDefinition['fields'],
  ReturnType<EchoDefinition['compute']>,
  ReturnType<EchoDefinition['compute']>
>;

const { display } = echoCalculator.rounding;

/** Configuración compartida por la isla y por los tests de componentes. */
export const echoShellProps: EchoShellProps = {
  definition: echoCalculator,
  locale: esES,
  customMessages: echoCustomMessages,
  fields: {
    importe: { label: 'Importe', hint: 'Ejemplo: 1.234,56' },
    porcentaje: { label: 'Porcentaje (opcional)' },
    periodos: { label: 'Periodos' },
  },
  renderResult: ({ output }) => (
    <DataTable
      id="test-echo-table"
      caption="Valores interpretados"
      columns={[
        { key: 'campo', header: 'Campo', rowHeader: true },
        { key: 'valor', header: 'Valor', align: 'end' },
      ]}
      rows={[
        { campo: 'Importe', valor: formatCurrency(output.importe, esES, display.currency) },
        {
          campo: 'Porcentaje',
          valor:
            output.porcentaje === undefined
              ? '—'
              : formatPercent(percentPointsToRatio(output.porcentaje), esES, display.percent),
        },
        {
          campo: 'Periodos',
          valor: formatNumber(output.periodos, esES, { fractionDigits: 0, mode: 'halfExpand' }),
        },
      ]}
    />
  ),
  summarize: ({ output }) =>
    `Valores interpretados. Importe: ${formatCurrency(output.importe, esES, display.currency)}.`,
};

/** Isla de prueba: compone la infraestructura común con la calculadora ficticia. */
export default function EchoIsland() {
  return <CalculatorShell {...echoShellProps} />;
}
