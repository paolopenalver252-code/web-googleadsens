import { render, screen, waitFor, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { toIsoDate } from '@/core/dates/iso-date';
import { echoShellProps } from '@tests/fixtures/echo-calculator/EchoIsland';

import { CalculatorShell } from './CalculatorShell';

// Testing Library normaliza los espacios (incluido U+00A0) a ' ' al comparar
// texto; el carácter exacto que produce Intl se comprueba en src/i18n/format.test.ts.
const SP = ' ';
const LIVE_DELAY = 40;

function renderShell() {
  const user = userEvent.setup();
  const view = render(
    <CalculatorShell
      {...echoShellProps}
      liveUpdateDelayMs={LIVE_DELAY}
      getContext={() => ({ today: toIsoDate('2026-09-29') })}
    />,
  );
  const importe = screen.getByLabelText('Importe');
  const porcentaje = screen.getByLabelText('Porcentaje (opcional)');
  const periodos = screen.getByLabelText('Periodos');
  const submit = screen.getByRole('button', { name: 'Calcular' });
  const status = screen.getByRole('status');
  return { user, view, importe, porcentaje, periodos, submit, status };
}

const resultRegion = () => screen.getByRole('region', { name: 'Resultado' });
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('CalculatorShell — estado inicial', () => {
  it('campos con etiqueta real, texto + inputmode decimal (no type=number)', () => {
    const { importe, periodos } = renderShell();
    for (const input of [importe, periodos]) {
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('inputmode', 'decimal');
      expect(input).not.toHaveAttribute('aria-invalid');
    }
    expect(importe).toHaveAccessibleDescription(/Ejemplo: 1\.234,56.*en euros/);
  });

  it('el botón se habilita al hidratar y no hay resultado todavía', () => {
    const { submit } = renderShell();
    expect(submit).toBeEnabled();
    expect(
      within(resultRegion()).getByText('Introduce los datos y pulsa «Calcular».'),
    ).toBeInTheDocument();
  });

  it('no escribe resultados antes del primer cálculo aunque los valores sean válidos', async () => {
    const { user, importe, periodos, status } = renderShell();
    await user.type(importe, '100');
    await user.type(periodos, '2');
    await user.tab();
    await pause(LIVE_DELAY * 3);
    expect(within(resultRegion()).queryByRole('table')).not.toBeInTheDocument();
    expect(status).toHaveTextContent('');
  });
});

describe('CalculatorShell — envío con errores', () => {
  it('muestra el resumen de errores, le da el foco y marca los campos', async () => {
    const { user, submit, importe, periodos } = renderShell();
    await user.click(submit);

    const summary = screen.getByRole('group', { name: 'Hay 2 errores en el formulario' });
    expect(summary).toHaveFocus();
    expect(importe).toHaveAttribute('aria-invalid', 'true');
    expect(periodos).toHaveAttribute('aria-invalid', 'true');
    expect(importe).toHaveAccessibleDescription(/Error: Este campo es obligatorio\./);
  });

  it('cada error del resumen enlaza y lleva el foco a su campo', async () => {
    const { user, submit, periodos } = renderShell();
    await user.click(submit);
    await user.click(screen.getByRole('link', { name: 'Periodos: Este campo es obligatorio.' }));
    expect(periodos).toHaveFocus();
  });

  it('muestra los errores propios de la calculadora (reglas entre campos)', async () => {
    const { user, importe, periodos, submit } = renderShell();
    await user.type(importe, '10');
    await user.type(periodos, '60');
    await user.click(submit);
    expect(
      screen.getByRole('link', { name: /Indica un porcentaje cuando hay más de 50 periodos/ }),
    ).toBeInTheDocument();
  });
});

describe('CalculatorShell — cálculo y actualizaciones', () => {
  it('calcula con el botón, muestra el resultado formateado y lo anuncia', async () => {
    const { user, importe, periodos, submit, status } = renderShell();
    await user.type(importe, '1.234,56');
    await user.type(periodos, '12');
    await user.click(submit);

    const table = within(resultRegion()).getByRole('table', { name: 'Valores interpretados' });
    expect(within(table).getByText(`1.234,56${SP}€`)).toBeInTheDocument();
    expect(status).toHaveTextContent(`Valores interpretados. Importe: 1.234,56${SP}€.`);
    expect(screen.queryByRole('group', { name: /errores?/ })).not.toBeInTheDocument();
  });

  it('Enter en un campo también calcula', async () => {
    const { user, importe, periodos } = renderShell();
    await user.type(importe, '5');
    await user.type(periodos, '1{Enter}');
    expect(within(resultRegion()).getByRole('table')).toBeInTheDocument();
  });

  it('tras el primer cálculo: actualiza la vista con retardo mientras se escribe, SIN anunciar', async () => {
    const { user, importe, periodos, submit, status } = renderShell();
    await user.type(importe, '100');
    await user.type(periodos, '1');
    await user.click(submit);
    const announced = status.textContent;

    await user.type(importe, '0'); // 1000, sin salir del campo
    expect(within(resultRegion()).getByText(`100,00${SP}€`)).toBeInTheDocument();
    await waitFor(() => {
      expect(within(resultRegion()).getByText(`1.000,00${SP}€`)).toBeInTheDocument();
    });
    expect(status.textContent).toBe(announced);
  });

  it('al confirmar un campo (salir de él) recalcula y anuncia', async () => {
    const { user, importe, periodos, submit, status } = renderShell();
    await user.type(importe, '100');
    await user.type(periodos, '1');
    await user.click(submit);

    await user.clear(importe);
    await user.type(importe, '250');
    await user.tab();
    expect(status).toHaveTextContent(`Importe: 250,00${SP}€`);
  });

  it('un valor inválido mientras se escribe no muestra error nuevo; marca el resultado como desactualizado', async () => {
    const { user, importe, periodos, submit } = renderShell();
    await user.type(importe, '100');
    await user.type(periodos, '1');
    await user.click(submit);

    await user.type(importe, 'x');
    await waitFor(() => {
      expect(
        within(resultRegion()).getByText(/resultado corresponde a los últimos valores válidos/),
      ).toBeInTheDocument();
    });
    expect(importe).not.toHaveAttribute('aria-invalid');

    await user.tab(); // al confirmar, sí se valida
    expect(importe).toHaveAttribute('aria-invalid', 'true');
  });

  it('un error visible desaparece en cuanto se corrige, sin esperar a salir del campo', async () => {
    const { user, importe, submit } = renderShell();
    await user.click(submit);
    expect(importe).toHaveAttribute('aria-invalid', 'true');
    await user.type(importe, '5');
    expect(importe).not.toHaveAttribute('aria-invalid');
  });

  it('explica la interpretación de "1.000" al salir del campo', async () => {
    const { user, importe } = renderShell();
    await user.type(importe, '1.000');
    await user.tab();
    expect(importe).toHaveAccessibleDescription(
      /Interpretado como 1\.000.€ \(el punto separa los miles\)/,
    );
  });
});

describe('CalculatorShell — accesibilidad automática (axe en jsdom)', () => {
  // El contraste de color no puede evaluarse en jsdom: se comprueba con
  // Playwright en navegador real (tests/a11y) y en src/styles/tokens.test.ts.
  const options = { rules: { 'color-contrast': { enabled: false } } };

  it('sin violaciones en estado inicial, con errores y con resultado', async () => {
    const { user, view, importe, periodos, submit } = renderShell();
    expect((await axe.run(view.container, options)).violations).toEqual([]);

    await user.click(submit);
    expect((await axe.run(view.container, options)).violations).toEqual([]);

    await user.type(importe, '10');
    await user.type(periodos, '2');
    await user.click(submit);
    expect((await axe.run(view.container, options)).violations).toEqual([]);
  });
});
