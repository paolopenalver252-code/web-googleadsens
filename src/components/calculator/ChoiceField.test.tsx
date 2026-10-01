import { render, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState } from 'preact/hooks';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_ROUNDING_POLICY, defineCalculator } from '@/core/calculator/definition';
import { ok } from '@/core/result';
import { choiceField, decimalField } from '@/core/validation/field';
import { esES } from '@/i18n/locales/es-ES';

import { CalculatorShell } from './CalculatorShell';
import { ChoiceField } from './ChoiceField';

const OPTIONS = [
  { value: 'annual', label: 'Anual' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'monthly', label: 'Mensual' },
];

function Controlled({
  onChoose = () => undefined,
  error,
}: {
  onChoose?: (value: string) => void;
  error?: string;
}) {
  const [value, setValue] = useState('');
  return (
    <ChoiceField
      id="frecuencia"
      name="frequency"
      legend="Frecuencia de capitalización y aportación"
      hint="Periodicidad del interés y de las aportaciones."
      options={OPTIONS}
      value={value}
      error={error}
      errorPrefix="Error:"
      onChoose={(next) => {
        setValue(next);
        onChoose(next);
      }}
    />
  );
}

describe('ChoiceField', () => {
  it('grupo con nombre accesible (legend), descripción y una etiqueta por opción', () => {
    render(<Controlled />);
    const group = screen.getByRole('radiogroup', {
      name: 'Frecuencia de capitalización y aportación',
    });
    expect(group).toHaveAccessibleDescription('Periodicidad del interés y de las aportaciones.');
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('value')),
    ).toEqual(['annual', 'semiannual', 'quarterly', 'monthly']);
    expect(screen.getByLabelText('Mensual')).toHaveAttribute('type', 'radio');
  });

  it('el primer radio lleva el id del campo (destino del resumen de errores)', () => {
    render(<Controlled />);
    expect(screen.getByLabelText('Anual')).toHaveAttribute('id', 'frecuencia');
  });

  it('se usa con teclado: Tab entra en el grupo y las flechas cambian la opción', async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<Controlled onChoose={onChoose} />);
    await user.tab();
    expect(screen.getByLabelText('Anual')).toHaveFocus();
    await user.keyboard('[Space]');
    expect(screen.getByLabelText('Anual')).toBeChecked();
    await user.keyboard('[ArrowRight]');
    expect(screen.getByLabelText('Semestral')).toBeChecked();
    expect(onChoose).toHaveBeenLastCalledWith('semiannual');
  });

  it('con error: mensaje con prefijo textual en la descripción y aria-invalid en el grupo', () => {
    render(<Controlled error="Este campo es obligatorio." />);
    const group = screen.getByRole('radiogroup', {
      name: 'Frecuencia de capitalización y aportación',
    });
    expect(group).toHaveAccessibleDescription(/Error: Este campo es obligatorio\./);
    expect(group).toHaveAttribute('aria-invalid', 'true');
    for (const radio of within(group).getAllByRole('radio')) {
      expect(radio).not.toHaveAttribute('aria-invalid');
    }
  });

  it('sin violaciones de axe (contraste: se comprueba en navegador real)', async () => {
    const { container } = render(<Controlled error="Este campo es obligatorio." />);
    const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations).toEqual([]);
  });
});

describe('CalculatorShell con campos de opción', () => {
  // Definición FICTICIA de identidad: solo ejercita la infraestructura.
  const definition = defineCalculator({
    id: 'prueba-shell-opciones',
    slug: 'prueba-shell-opciones',
    version: '1.0.0',
    fields: {
      importe: decimalField({ required: true, unit: 'currency', min: '0', max: '1000' }),
      frecuencia: choiceField({ required: true, options: ['annual', 'monthly'] as const }),
    },
    toInput: (parsed) => ok(parsed),
    compute: (input) => input,
    rounding: DEFAULT_ROUNDING_POLICY,
    related: [],
  });

  function renderShell() {
    return render(
      <CalculatorShell
        definition={definition}
        locale={esES}
        fields={{
          importe: { label: 'Importe' },
          frecuencia: {
            label: 'Frecuencia',
            optionLabels: { annual: 'Anual', monthly: 'Mensual' },
          },
        }}
        renderResult={({ output }) => <p>Frecuencia elegida: {output.frecuencia}</p>}
        summarize={({ output }) => `Frecuencia ${output.frecuencia}`}
      />,
    );
  }

  it('renderiza el grupo de radios y exige una opción al enviar', async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.getByRole('radiogroup', { name: 'Frecuencia' })).toHaveAttribute(
      'aria-required',
      'true',
    );
    await user.type(screen.getByLabelText('Importe'), '10');
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    const link = screen.getByRole('link', { name: 'Frecuencia: Este campo es obligatorio.' });
    await user.click(link);
    expect(screen.getByLabelText('Anual')).toHaveFocus();
  });

  it('elegir una opción corrige el error y permite calcular', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.type(screen.getByLabelText('Importe'), '10');
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    await user.click(screen.getByLabelText('Mensual'));
    expect(screen.getByRole('radiogroup', { name: 'Frecuencia' })).not.toHaveAttribute(
      'aria-invalid',
    );
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(screen.getByText('Frecuencia elegida: monthly')).toBeInTheDocument();
  });

  it('tras el primer cálculo, cambiar de opción recalcula y lo anuncia', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.type(screen.getByLabelText('Importe'), '10');
    await user.click(screen.getByLabelText('Anual'));
    await user.click(screen.getByRole('button', { name: 'Calcular' }));
    await user.click(screen.getByLabelText('Mensual'));
    expect(screen.getByText('Frecuencia elegida: monthly')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Frecuencia monthly');
  });
});
