/**
 * UI de la calculadora de interés compuesto (jsdom): renderizado, validación,
 * interacción, resultado y accesibilidad. Los importes esperados proceden de
 * fixtures/external-examples.ts o de cálculos independientes (BigInt), nunca
 * del motor.
 */
import { render, screen, waitFor, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { toIsoDate } from '@/core/dates/iso-date';

import CompoundInterestIsland from '../ui/CompoundInterestIsland';

type User = ReturnType<typeof userEvent.setup>;

function renderIsland() {
  const user = userEvent.setup();
  const view = render(
    <CompoundInterestIsland getContext={() => ({ today: toIsoDate('2026-09-30') })} />,
  );
  return { user, view };
}

const group = (name: string) => screen.getByRole('radiogroup', { name });
const choose = (user: User, groupName: string, option: string) =>
  user.click(within(group(groupName)).getByLabelText(option));
const submit = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Calcular interés compuesto' }));
const resultPanel = () => screen.getByRole('region', { name: 'Resultado' });

/** "Error: <mensaje>" dentro de la descripción accesible (los espacios pueden ser U+00A0). */
function errorPattern(message: string): RegExp {
  const escaped = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s');
  return new RegExp(`Error:\\s${escaped}`);
}

/** Texto de la cifra (<dd>) asociada a un concepto (<dt>), con espacios normalizados. */
function valueOf(term: string): string {
  const dt = within(resultPanel()).getByText(term, { selector: 'dt' });
  return (dt.nextElementSibling?.textContent ?? '').replace(/\s/g, ' ');
}

interface FormValues {
  readonly capital?: string;
  readonly contribution?: string;
  readonly rate?: string;
  readonly convention?: 'TAE / tipo efectivo anual' | 'TIN / tipo nominal anual';
  readonly frequency?: 'Anual' | 'Semestral' | 'Trimestral' | 'Mensual';
  /** `undefined` explícito = no elegir el momento (casos de validación). */
  readonly timing?: 'Al inicio de cada periodo' | 'Al final de cada periodo' | undefined;
  readonly duration?: string;
  readonly unit?: 'Años' | 'Meses';
}

async function fill(user: User, values: FormValues): Promise<void> {
  if (values.capital !== undefined)
    await user.type(screen.getByLabelText('Capital inicial'), values.capital);
  if (values.contribution !== undefined) {
    await user.type(screen.getByLabelText('Aportación periódica'), values.contribution);
  }
  if (values.rate !== undefined)
    await user.type(screen.getByLabelText('Tipo de interés anual'), values.rate);
  if (values.convention) await choose(user, 'Tipo de tasa', values.convention);
  if (values.frequency)
    await choose(user, 'Frecuencia de capitalización y aportación', values.frequency);
  if (values.timing) await choose(user, 'Momento de la aportación', values.timing);
  if (values.duration !== undefined)
    await user.type(screen.getByLabelText('Duración'), values.duration);
  if (values.unit) await choose(user, 'Unidad de la duración', values.unit);
}

/** F10 (fixtures): 2.000 € + 500 € al inicio, TIN 4 % semestral, 36 meses. */
const F10: FormValues = {
  capital: '2.000',
  contribution: '500',
  rate: '4',
  convention: 'TIN / tipo nominal anual',
  frequency: 'Semestral',
  timing: 'Al inicio de cada periodo',
  duration: '36',
  unit: 'Meses',
};

describe('renderizado', () => {
  it('muestra todos los campos, en el orden especificado', () => {
    const { view } = renderIsland();
    const names = [
      ...view.container.querySelectorAll(
        'label[for$="-initialCapital"], label[for$="-contributionAmount"], label[for$="-annualRate"], label[for$="-durationValue"], [role="radiogroup"]',
      ),
    ].map((element) =>
      element.getAttribute('role') === 'radiogroup'
        ? document.getElementById(element.getAttribute('aria-labelledby') ?? '')?.textContent
        : element.textContent,
    );
    expect(names).toEqual([
      'Capital inicial',
      'Aportación periódica',
      'Tipo de interés anual',
      'Tipo de tasa',
      'Frecuencia de capitalización y aportación',
      'Momento de la aportación',
      'Duración',
      'Unidad de la duración',
    ]);
  });

  it('opciones correctas en cada grupo', () => {
    renderIsland();
    const labels = (name: string) =>
      within(group(name))
        .getAllByRole('radio')
        .map((radio) => radio.closest('label')?.textContent);
    expect(labels('Tipo de tasa')).toEqual([
      'TAE / tipo efectivo anual',
      'TIN / tipo nominal anual',
    ]);
    expect(labels('Frecuencia de capitalización y aportación')).toEqual([
      'Anual',
      'Semestral',
      'Trimestral',
      'Mensual',
    ]);
    expect(labels('Momento de la aportación')).toEqual([
      'Al inicio de cada periodo',
      'Al final de cada periodo',
    ]);
    expect(labels('Unidad de la duración')).toEqual(['Años', 'Meses']);
  });

  it('un único selector de frecuencia: no hay frecuencias independientes de capitalización y aportación', () => {
    renderIsland();
    const groups = screen
      .getAllByRole('radiogroup')
      .map(
        (element) =>
          document.getElementById(element.getAttribute('aria-labelledby') ?? '')?.textContent,
      );
    expect(groups.filter((name) => /frecuencia/i.test(name ?? ''))).toEqual([
      'Frecuencia de capitalización y aportación',
    ]);
    expect(screen.getAllByRole('radiogroup')).toHaveLength(4);
  });

  it('estado inicial: todo vacío, nada preseleccionado y sin resultado', () => {
    renderIsland();
    for (const label of [
      'Capital inicial',
      'Aportación periódica',
      'Tipo de interés anual',
      'Duración',
    ]) {
      expect(screen.getByLabelText(label)).toHaveValue('');
    }
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(screen.getByLabelText('Capital inicial')).toHaveAttribute('placeholder', 'Ej.: 10.000');
    expect(screen.getByLabelText('Aportación periódica')).toHaveAttribute(
      'placeholder',
      'Ej.: 200',
    );
    expect(screen.getByLabelText('Tipo de interés anual')).toHaveAttribute('placeholder', 'Ej.: 5');
    expect(within(resultPanel()).queryByText('Valor final')).not.toBeInTheDocument();
  });

  it('la duración usa teclado numérico entero; los importes, teclado decimal', () => {
    renderIsland();
    expect(screen.getByLabelText('Duración')).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Capital inicial')).toHaveAttribute('inputmode', 'decimal');
  });
});

describe('validación', () => {
  it('envío vacío: capital, tasa, tipo de tasa, frecuencia, duración y unidad son obligatorios; aportación y momento no', async () => {
    const { user } = renderIsland();
    await submit(user);
    const summary = screen.getByRole('group', { name: /Hay 6 errores/ });
    expect(summary).toHaveFocus();
    const links = within(summary)
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).toEqual([
      'Capital inicial: Este campo es obligatorio.',
      'Tipo de interés anual: Este campo es obligatorio.',
      'Tipo de tasa: Este campo es obligatorio.',
      'Frecuencia de capitalización y aportación: Este campo es obligatorio.',
      'Duración: Este campo es obligatorio.',
      'Unidad de la duración: Este campo es obligatorio.',
    ]);
  });

  it.each([
    ['abc', 'Introduce solo números. Usa la coma (,) para los decimales.'],
    ['5,12345', 'Introduce como máximo 4 decimales.'],
    ['-1', 'El valor mínimo es 0 %.'],
    ['100,5', 'El valor máximo es 100 %.'],
  ])('tasa inválida %j', async (rate, message) => {
    const { user } = renderIsland();
    await user.type(screen.getByLabelText('Tipo de interés anual'), rate);
    await user.tab();
    const input = screen.getByLabelText('Tipo de interés anual');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(errorPattern(message));
  });

  it.each([
    ['1,5', 'Introduce un número entero, sin decimales.'],
    ['0', 'El valor mínimo es 1.'],
  ])('duración inválida %j', async (duration, message) => {
    const { user } = renderIsland();
    await user.type(screen.getByLabelText('Duración'), duration);
    await user.tab();
    expect(screen.getByLabelText('Duración')).toHaveAccessibleDescription(errorPattern(message));
  });

  it.each([
    ['Anual', '18', 12],
    ['Trimestral', '19', 3],
    ['Semestral', '9', 6],
  ] as const)('duración incompatible: %s con %s meses', async (frequency, months, multiple) => {
    const { user } = renderIsland();
    await fill(user, {
      capital: '1000',
      rate: '5',
      convention: 'TAE / tipo efectivo anual',
      frequency,
      duration: months,
      unit: 'Meses',
    });
    await submit(user);
    expect(
      screen.getByRole('link', {
        name: `Duración: Con la frecuencia elegida, la duración debe ser un múltiplo de ${String(multiple)} meses.`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Duración')).toHaveAttribute('aria-invalid', 'true');
  });

  it('duración compatible: trimestral con 18 meses y anual con 24 meses calculan', async () => {
    const { user } = renderIsland();
    await fill(user, {
      capital: '1000',
      rate: '5',
      convention: 'TAE / tipo efectivo anual',
      frequency: 'Trimestral',
      duration: '18',
      unit: 'Meses',
    });
    await submit(user);
    expect(within(resultPanel()).getByText('Valor final')).toBeInTheDocument();
  });

  it('aportación > 0 sin momento: error asociado al campo "Momento de la aportación"', async () => {
    const { user } = renderIsland();
    await fill(user, { ...F10, timing: undefined });
    await submit(user);
    const message = 'Indica si las aportaciones se hacen al inicio o al final de cada periodo.';
    expect(
      screen.getByRole('link', { name: `Momento de la aportación: ${message}` }),
    ).toBeInTheDocument();
    const timing = group('Momento de la aportación');
    expect(timing).toHaveAttribute('aria-invalid', 'true');
    expect(timing).toHaveAccessibleDescription(errorPattern(message));
  });

  it('aportación 0 sin momento: calcula sin exigir el momento', async () => {
    const { user } = renderIsland();
    await fill(user, { ...F10, contribution: '0', timing: undefined });
    await submit(user);
    expect(within(resultPanel()).getByText('Valor final')).toBeInTheDocument();
    expect(valueOf('Aportaciones')).toBe('0,00 €');
  });
});

describe('interacción', () => {
  it('seleccionar opciones marca el radio correspondiente', async () => {
    const { user } = renderIsland();
    await fill(user, {
      convention: 'TIN / tipo nominal anual',
      frequency: 'Trimestral',
      timing: 'Al final de cada periodo',
      unit: 'Años',
    });
    expect(within(group('Tipo de tasa')).getByLabelText('TIN / tipo nominal anual')).toBeChecked();
    expect(
      within(group('Frecuencia de capitalización y aportación')).getByLabelText('Trimestral'),
    ).toBeChecked();
    expect(
      within(group('Momento de la aportación')).getByLabelText('Al final de cada periodo'),
    ).toBeChecked();
    expect(within(group('Unidad de la duración')).getByLabelText('Años')).toBeChecked();
    await choose(user, 'Tipo de tasa', 'TAE / tipo efectivo anual');
    expect(
      within(group('Tipo de tasa')).getByLabelText('TIN / tipo nominal anual'),
    ).not.toBeChecked();
  });

  it('TAE y TIN se conectan con conversiones distintas (5 %, mensual, 12 meses)', async () => {
    const { user } = renderIsland();
    await fill(user, {
      capital: '1000',
      rate: '5',
      convention: 'TAE / tipo efectivo anual',
      frequency: 'Mensual',
      duration: '12',
      unit: 'Meses',
    });
    await submit(user);
    // TAE 5 %: 1000·1,05 = 1050 exacto.
    expect(valueOf('Valor final')).toBe('1.050,00 €');
    expect(valueOf('Tipo efectivo anual equivalente')).toBe('5,00 %');

    await choose(user, 'Tipo de tasa', 'TIN / tipo nominal anual');
    // TIN 5 % mensual: 1000·(241/240)^12 = 1051,1618… (BigInt independiente).
    await waitFor(() => {
      expect(valueOf('Valor final')).toBe('1.051,16 €');
    });
    expect(valueOf('Tipo efectivo anual equivalente')).toBe('5,12 %');
  });

  it('años y meses equivalentes dan el mismo resultado', async () => {
    const { user } = renderIsland();
    await fill(user, {
      capital: '1000',
      rate: '5',
      convention: 'TAE / tipo efectivo anual',
      frequency: 'Anual',
      duration: '3',
      unit: 'Años',
    });
    await submit(user);
    const inYears = valueOf('Valor final');
    await user.clear(screen.getByLabelText('Duración'));
    await user.type(screen.getByLabelText('Duración'), '36');
    await choose(user, 'Unidad de la duración', 'Meses');
    await waitFor(() => {
      expect(valueOf('Valor final')).toBe(inYears);
    });
    expect(inYears).toBe('1.157,63 €'); // F1
  });

  it('inicio y final se conectan con fórmulas distintas (F4: 15.000 €/año, 8 %, 10 años)', async () => {
    const { user } = renderIsland();
    await fill(user, {
      capital: '0',
      contribution: '15.000',
      rate: '8',
      convention: 'TIN / tipo nominal anual',
      frequency: 'Anual',
      timing: 'Al final de cada periodo',
      duration: '10',
      unit: 'Años',
    });
    await submit(user);
    expect(valueOf('Valor final')).toBe('217.298,44 €');
    await choose(user, 'Momento de la aportación', 'Al inicio de cada periodo');
    await waitFor(() => {
      expect(valueOf('Valor final')).toBe('234.682,31 €');
    });
  });
});

describe('resultado', () => {
  it('F10: valor final, capital, aportaciones, intereses, tipo efectivo, total invertido y nº de aportaciones', async () => {
    const { user } = renderIsland();
    await fill(user, F10);
    await submit(user);
    expect(valueOf('Valor final')).toBe('5.469,47 €');
    expect(valueOf('Capital inicial')).toBe('2.000,00 €');
    expect(valueOf('Aportaciones')).toBe('3.000,00 €');
    expect(valueOf('Intereses generados')).toBe('469,47 €');
    expect(valueOf('Tipo efectivo anual equivalente')).toBe('4,04 %');
    expect(valueOf('Total invertido')).toBe('5.000,00 €');
    expect(valueOf('Número de aportaciones')).toBe('6');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Valor final: 5.469,47 €. Intereses generados: 469,47 €.',
    );
  });

  it('sin aportaciones (F1) no muestra total invertido ni número de aportaciones', async () => {
    const { user } = renderIsland();
    await fill(user, {
      capital: '1.000',
      rate: '5',
      convention: 'TAE / tipo efectivo anual',
      frequency: 'Anual',
      duration: '36',
      unit: 'Meses',
    });
    await submit(user);
    expect(valueOf('Valor final')).toBe('1.157,63 €');
    expect(valueOf('Intereses generados')).toBe('157,63 €');
    expect(within(resultPanel()).queryByText('Total invertido')).not.toBeInTheDocument();
    expect(within(resultPanel()).queryByText('Número de aportaciones')).not.toBeInTheDocument();
  });

  it('tras un cálculo, un dato inválido marca el resultado como desactualizado (patrón del shell)', async () => {
    const { user } = renderIsland();
    await fill(user, F10);
    await submit(user);
    await user.clear(screen.getByLabelText('Capital inicial'));
    await user.type(screen.getByLabelText('Capital inicial'), 'x');
    await user.tab();
    expect(
      within(resultPanel()).getByText(/el resultado corresponde a los últimos valores válidos/),
    ).toBeInTheDocument();
  });
});

describe('configuración de la isla', () => {
  it('sin props usa el contexto por defecto del shell (camino de producción) y calcula', async () => {
    const user = userEvent.setup();
    render(<CompoundInterestIsland />);
    await fill(user, {
      capital: '1.000',
      rate: '5',
      convention: 'TAE / tipo efectivo anual',
      frequency: 'Anual',
      duration: '3',
      unit: 'Años',
    });
    await submit(user);
    expect(valueOf('Valor final')).toBe('1.157,63 €');
  });

  it('tras el primer cálculo, el resultado se actualiza al escribir (con retardo) sin anunciarlo', async () => {
    const user = userEvent.setup();
    render(<CompoundInterestIsland liveUpdateDelayMs={30} />);
    await fill(user, {
      capital: '1.000',
      rate: '5',
      convention: 'TAE / tipo efectivo anual',
      frequency: 'Anual',
      duration: '3',
      unit: 'Años',
    });
    await submit(user);
    const announced = screen.getByRole('status').textContent;
    await user.clear(screen.getByLabelText('Capital inicial'));
    await user.type(screen.getByLabelText('Capital inicial'), '10.000'); // sin salir del campo
    await waitFor(() => {
      expect(valueOf('Valor final')).toBe('11.576,25 €'); // 10·F1 = 11.576,25 exacto
    });
    expect(screen.getByRole('status').textContent).toBe(announced);
  });
});

describe('accesibilidad', () => {
  it('cada campo numérico tiene etiqueta real y su ayuda en la descripción', () => {
    renderIsland();
    expect(screen.getByLabelText('Capital inicial')).toHaveAccessibleDescription(
      'Cantidad de dinero con la que comienzas. en euros',
    );
    expect(screen.getByLabelText('Tipo de interés anual')).toHaveAccessibleDescription(
      'en porcentaje',
    );
  });

  it('los grupos de opciones son radiogroups con nombre, ayuda y obligatoriedad', () => {
    renderIsland();
    expect(group('Tipo de tasa')).toHaveAttribute('aria-required', 'true');
    expect(group('Tipo de tasa')).toHaveAccessibleDescription(/La TAE es un tipo efectivo anual/);
    expect(group('Momento de la aportación')).not.toHaveAttribute('aria-required');
  });

  it('se usa con teclado: Espacio y flechas en los grupos, Enter para calcular', async () => {
    // El orden de tabulación completo se comprueba en navegador real
    // (tests/e2e/compound-interest.spec.ts): jsdom no emula fielmente el
    // recorrido de Tab por los grupos de radios.
    const { user } = renderIsland();
    screen.getByLabelText('Capital inicial').focus();
    await user.keyboard('1000');
    screen.getByLabelText('Tipo de interés anual').focus();
    await user.keyboard('5');

    within(group('Tipo de tasa')).getByLabelText('TAE / tipo efectivo anual').focus();
    await user.keyboard('[Space]');
    within(group('Frecuencia de capitalización y aportación')).getByLabelText('Anual').focus();
    await user.keyboard('[Space]');
    await user.keyboard('[ArrowRight]');
    expect(
      within(group('Frecuencia de capitalización y aportación')).getByLabelText('Semestral'),
    ).toBeChecked();
    await user.keyboard('[ArrowLeft]');
    expect(
      within(group('Frecuencia de capitalización y aportación')).getByLabelText('Anual'),
    ).toBeChecked();

    within(group('Unidad de la duración')).getByLabelText('Años').focus();
    await user.keyboard('[Space]');
    screen.getByLabelText('Duración').focus();
    await user.keyboard('3{Enter}');
    expect(valueOf('Valor final')).toBe('1.157,63 €');
  });

  it('con errores, el resumen recibe el foco y cada enlace lleva al campo (incluidos los grupos)', async () => {
    const { user } = renderIsland();
    await submit(user);
    expect(screen.getByRole('group', { name: /errores/ })).toHaveFocus();
    await user.click(screen.getByRole('link', { name: /^Tipo de tasa:/ }));
    expect(within(group('Tipo de tasa')).getByLabelText('TAE / tipo efectivo anual')).toHaveFocus();
    await user.click(screen.getByRole('link', { name: /^Capital inicial:/ }));
    expect(screen.getByLabelText('Capital inicial')).toHaveFocus();
  });

  it('sin violaciones de axe en estado inicial, con errores y con resultado', async () => {
    const { user, view } = renderIsland();
    const options = { rules: { 'color-contrast': { enabled: false } } };
    expect((await axe.run(view.container, options)).violations).toEqual([]);
    await submit(user);
    expect((await axe.run(view.container, options)).violations).toEqual([]);
    await fill(user, F10);
    await submit(user);
    expect((await axe.run(view.container, options)).violations).toEqual([]);
  });
});

describe('explicación, gráfico y tabla anual', () => {
  const normalize = (text: string | null | undefined) => (text ?? '').replace(/\s/g, ' ');

  it('F10: la explicación resume el resultado con las mismas cifras', async () => {
    const { user } = renderIsland();
    await fill(user, F10);
    await submit(user);
    expect(
      within(resultPanel()).getByText(/^Al cabo de 3 años, el valor final estimado/),
    ).toHaveTextContent(
      normalize(
        'Al cabo de 3 años, el valor final estimado es de 5.469,47 €: 5.000,00 € corresponden al capital aportado (capital inicial más aportaciones) y 469,47 €, a intereses generados.',
      ),
      { normalizeWhitespace: true },
    );
  });

  it('F10: tabla anual con caption y cabeceras; la última fila coincide con el valor final', async () => {
    const { user } = renderIsland();
    await fill(user, F10);
    await submit(user);
    const table = within(resultPanel()).getByRole('table');
    expect(table.querySelector('caption')?.textContent).toBe('Saldo al final de cada año');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'Periodo',
      'Intereses del periodo',
      'Capital aportado',
      'Intereses acumulados',
      'Saldo final',
    ]);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'Año 1',
      'Año 2',
      'Año 3',
    ]);
    const lastCells = [...(rows.at(-1)?.querySelectorAll('td') ?? [])].map((cell) =>
      normalize(cell.textContent),
    );
    expect(lastCells.at(-1)).toBe(valueOf('Valor final'));
    expect(lastCells.at(-2)).toBe(valueOf('Intereses generados'));
    expect(lastCells.at(-3)).toBe(valueOf('Total invertido'));
  });

  it('el gráfico se carga tras el resultado y se recorre con el teclado', async () => {
    const { user } = renderIsland();
    await fill(user, F10);
    await submit(user);
    const slider = await within(resultPanel()).findByRole('slider', {
      name: 'Explorar el gráfico por periodos',
    });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '3');
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    expect(normalize(slider.getAttribute('aria-valuetext'))).toBe(
      'Año 3: saldo 5.469,47 €; capital aportado 5.000,00 €; intereses acumulados 469,47 €.',
    );
    expect(slider.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    slider.focus();
    await user.keyboard('[Home]');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(normalize(slider.getAttribute('aria-valuetext'))).toMatch(/^Inicio: saldo 2\.000,00 €/);
    await user.keyboard('[ArrowRight]');
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    await user.keyboard('[ArrowLeft][ArrowLeft]');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    await user.keyboard('[End]');
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    await user.keyboard('[ArrowUp]');
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    await user.keyboard('[ArrowDown]');
    expect(slider).toHaveAttribute('aria-valuenow', '2');
    await user.keyboard('a');
    expect(slider).toHaveAttribute('aria-valuenow', '2');
    // El panel de detalle muestra el mismo texto que se anuncia.
    expect(normalize(document.getElementById('compound-interest-chart-detail')?.textContent)).toBe(
      normalize(slider.getAttribute('aria-valuetext')),
    );
  });

  it('el puntero selecciona el periodo más cercano', async () => {
    const { user } = renderIsland();
    await fill(user, F10);
    await submit(user);
    const slider = await within(resultPanel()).findByRole('slider');
    // jsdom no maqueta: ancho 640 px por defecto, área de dibujo de 12 a 628 px.
    slider.getBoundingClientRect = () => new DOMRect(0, 0, 640, 240);
    const pointer = (clientX: number) =>
      slider.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX }));
    pointer(12);
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '0');
    });
    pointer(12 + 616 / 3 + 10);
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '1');
    });
  });

  it('el gráfico y la tabla cambian con los datos', async () => {
    const { user } = renderIsland();
    await fill(user, F10);
    await submit(user);
    await within(resultPanel()).findByRole('slider');
    const duration = screen.getByLabelText('Duración');
    await user.clear(duration);
    await user.type(duration, '12');
    await submit(user);
    await waitFor(() => {
      expect(within(resultPanel()).getByRole('slider')).toHaveAttribute('aria-valuemax', '1');
    });
    expect(within(resultPanel()).getAllByRole('row')).toHaveLength(2);
  });

  it('duración inferior a un año: una fila por meses y eje en meses', async () => {
    const { user } = renderIsland();
    await fill(user, {
      capital: '1.000',
      rate: '3',
      convention: 'TIN / tipo nominal anual',
      frequency: 'Mensual',
      duration: '6',
      unit: 'Meses',
    });
    await submit(user);
    const table = within(resultPanel()).getByRole('table');
    expect(within(table).getByRole('rowheader')).toHaveTextContent('Meses 1–6');
    await within(resultPanel()).findByRole('slider');
    expect(screen.getByText(/^Eje horizontal: meses transcurridos/)).toBeInTheDocument();
  });
});
