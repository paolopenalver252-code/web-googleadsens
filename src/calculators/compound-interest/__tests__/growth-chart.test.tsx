/** Maquetación del gráfico: se redibuja con el ancho real del contenedor. */
import { act, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GrowthChartModel } from '../ui/chart-data';
import { GrowthChart } from '../ui/GrowthChart';

const model: GrowthChartModel = {
  durationMonths: 12,
  unit: 'years',
  points: [
    { month: 0, invested: 100, balance: 100, description: 'Inicio' },
    { month: 12, invested: 100, balance: 110, description: 'Año 1' },
  ],
  xTicks: [
    { value: 0, label: '0' },
    { value: 12, label: '1' },
  ],
  yTicks: [
    { value: 0, label: '0 €' },
    { value: 100, label: '100 €' },
    { value: 200, label: '200 €' },
  ],
  yMax: 200,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GrowthChart', () => {
  it('usa el ancho medido (viewBox 1:1) y se actualiza al redimensionar', async () => {
    let notify: (() => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    let width = 320;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 0, width, 240),
    );

    const view = render(<GrowthChart id="chart" model={model} />);
    const svg = () => screen.getByRole('slider').querySelector('svg');
    expect(svg()).toHaveAttribute('viewBox', '0 0 320 240');

    width = 500;
    await act(() => {
      notify?.();
    });
    expect(svg()).toHaveAttribute('viewBox', '0 0 500 240');

    view.unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('dibuja ambas series, las marcas de los ejes y el punto activo (el último)', () => {
    render(<GrowthChart id="chart" model={model} />);
    const svg = screen.getByRole('slider').querySelector('svg');
    expect(svg?.querySelectorAll('path')).toHaveLength(4);
    expect([...(svg?.querySelectorAll('text') ?? [])].map((text) => text.textContent)).toEqual([
      '0 €',
      '100 €',
      '200 €',
      '0',
      '1',
    ]);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Año 1');
  });
});
