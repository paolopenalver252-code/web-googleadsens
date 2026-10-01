import { render, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { createRef } from 'preact';
import { describe, expect, it, vi } from 'vitest';

import { toIsoDate } from '@/core/dates/iso-date';
import { esES } from '@/i18n/locales/es-ES';

import { DataTable } from './DataTable';
import { ErrorSummary } from './ErrorSummary';
import { NumberField } from './NumberField';
import { RulesVersionBadge } from './RulesVersionBadge';

describe('NumberField', () => {
  const baseProps = {
    id: 'campo',
    name: 'campo',
    label: 'Importe',
    value: '',
    errorPrefix: 'Error:',
    onValueInput: () => undefined,
    onCommit: () => undefined,
  };

  it('asocia etiqueta, ayuda y unidad al control', () => {
    render(
      <NumberField
        {...baseProps}
        hint="Ejemplo: 1.234,56"
        unitSymbol="€"
        unitDescription="en euros"
      />,
    );
    const input = screen.getByLabelText('Importe');
    expect(input).toHaveAttribute('aria-describedby', 'campo-hint campo-unit');
    expect(input).toHaveAccessibleDescription('Ejemplo: 1.234,56 en euros');
    // El símbolo visible es decorativo: la unidad se describe en texto.
    expect(screen.getByText('€')).toHaveAttribute('aria-hidden', 'true');
  });

  it('con error: aria-invalid, descripción con prefijo textual (no solo color)', () => {
    render(<NumberField {...baseProps} error="Este campo es obligatorio." />);
    const input = screen.getByLabelText('Importe');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Error: Este campo es obligatorio.');
  });

  it('el aviso no se muestra si hay un error (evita mensajes contradictorios)', () => {
    render(<NumberField {...baseProps} error="Mal." notice="Interpretado como 1.234" />);
    expect(screen.queryByText('Interpretado como 1.234')).not.toBeInTheDocument();
  });

  it('distingue escribir (input) de confirmar (change)', async () => {
    const onValueInput = vi.fn();
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<NumberField {...baseProps} onValueInput={onValueInput} onCommit={onCommit} />);
    await user.type(screen.getByLabelText('Importe'), '12');
    expect(onValueInput).toHaveBeenCalledTimes(2);
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorSummary', () => {
  it('lista los errores; los de campo enlazan al campo y le dan el foco', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ErrorSummary
          id="resumen"
          containerRef={createRef()}
          title="Hay 2 errores en el formulario"
          items={[
            { fieldId: 'objetivo', message: 'Importe: obligatorio' },
            { message: 'Error general' },
          ]}
        />
        <input id="objetivo" aria-label="Objetivo" />
      </>,
    );
    const summary = screen.getByRole('group', { name: 'Hay 2 errores en el formulario' });
    expect(summary).toHaveAttribute('tabindex', '-1');
    expect(within(summary).getByText('Error general').tagName).toBe('LI');
    await user.click(screen.getByRole('link', { name: 'Importe: obligatorio' }));
    expect(screen.getByLabelText('Objetivo')).toHaveFocus();
  });
});

describe('DataTable', () => {
  it('tabla con caption, cabeceras con scope y región desplazable con foco', () => {
    render(
      <DataTable
        id="t"
        caption="Tabla de ejemplo"
        columns={[
          { key: 'concepto', header: 'Concepto', rowHeader: true },
          { key: 'valor', header: 'Valor', align: 'end' },
        ]}
        rows={[{ concepto: 'A', valor: '1,00' }]}
      />,
    );
    const region = screen.getByRole('region', { name: 'Tabla de ejemplo' });
    expect(region).toHaveAttribute('tabindex', '0');
    const table = screen.getByRole('table', { name: 'Tabla de ejemplo' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.getAttribute('scope')),
    ).toEqual(['col', 'col']);
    expect(within(table).getByRole('rowheader', { name: 'A' })).toHaveAttribute('scope', 'row');
    expect(within(table).getByRole('cell', { name: '1,00' })).toHaveClass('text-right');
  });
});

describe('RulesVersionBadge', () => {
  const base = {
    validFrom: toIsoDate('2026-01-01'),
    jurisdiction: 'ES',
    status: 'verified' as const,
  };

  it('describe la vigencia y la jurisdicción aplicadas', () => {
    render(
      <RulesVersionBadge locale={esES} ruleSet={{ ...base, validTo: toIsoDate('2026-12-31') }} />,
    );
    expect(
      screen.getByText(
        'Reglas aplicadas: vigentes del 1 de enero de 2026 al 31 de diciembre de 2026 · España',
      ),
    ).toBeInTheDocument();
  });

  it('marca las reglas sin verificar', () => {
    render(
      <RulesVersionBadge
        locale={esES}
        ruleSet={{ ...base, validTo: null, status: 'unverified', jurisdiction: 'ES-MD' }}
      />,
    );
    expect(
      screen.getByText('Reglas aplicadas: vigentes desde el 1 de enero de 2026 · ES-MD'),
    ).toBeInTheDocument();
    expect(screen.getByText('NO VERIFICADO — NECESITA FUENTE')).toBeInTheDocument();
  });
});
