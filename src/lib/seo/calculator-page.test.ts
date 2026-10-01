import { describe, expect, it } from 'vitest';

import type { CalculatorEntry } from '@/core/calculator/registry-integrity';

import { calculatorPageProps } from './calculator-page';

const entry = (status: CalculatorEntry['status']): CalculatorEntry => ({
  calculator: { id: 'x', slug: 'calculadora-x', version: '1.0.0', related: [] },
  name: 'X',
  heading: 'Calculadora X',
  category: 'finanzas',
  seo: { title: 'Calculadora X: título', description: 'Descripción de X.' },
  status,
});

describe('calculatorPageProps', () => {
  it('deriva title, description, ruta, H1 y migas del registro', () => {
    expect(calculatorPageProps('x', [entry('published')])).toEqual({
      page: {
        title: 'Calculadora X: título',
        description: 'Descripción de X.',
        path: '/calculadora-x',
        noindex: false,
      },
      heading: 'Calculadora X',
      breadcrumbs: [
        { name: 'Inicio', path: '/' },
        { name: 'Calculadora X', path: '/calculadora-x' },
      ],
      calculator: { id: 'x', slug: 'calculadora-x', version: '1.0.0', related: [] },
      monetizable: true,
    });
  });

  it('un borrador es siempre noindex y nunca muestra anuncios', () => {
    const props = calculatorPageProps('x', [entry('draft')]);
    expect(props.page.noindex).toBe(true);
    expect(props.monetizable).toBe(false);
  });

  it('la calculadora real de interés compuesto es borrador: noindex', () => {
    const props = calculatorPageProps('compound-interest');
    expect(props.page).toMatchObject({ path: '/calculadora-interes-compuesto', noindex: true });
    expect(props.heading).toBe('Calculadora de interés compuesto');
  });

  it('un id no registrado rompe el build', () => {
    expect(() => calculatorPageProps('no-existe', [])).toThrow(/no registrada/);
  });
});
