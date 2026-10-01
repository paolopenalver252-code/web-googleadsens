/**
 * Si la descarga diferida del gráfico falla, el resultado sigue completo: se
 * informa con texto y la tabla (con los mismos datos) sigue disponible.
 */
import { render, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { toIsoDate } from '@/core/dates/iso-date';

import CompoundInterestIsland from '../ui/CompoundInterestIsland';

vi.mock('../ui/GrowthChart', () => {
  throw new Error('Fallo de red simulado');
});

describe('gráfico no disponible', () => {
  it('muestra un aviso en texto y mantiene la tabla anual', async () => {
    const user = userEvent.setup();
    render(<CompoundInterestIsland getContext={() => ({ today: toIsoDate('2026-09-30') })} />);
    await user.type(screen.getByLabelText('Capital inicial'), '1.000');
    await user.type(screen.getByLabelText('Tipo de interés anual'), '5');
    const group = (name: string) => screen.getByRole('radiogroup', { name });
    await user.click(within(group('Tipo de tasa')).getByLabelText('TAE / tipo efectivo anual'));
    await user.click(
      within(group('Frecuencia de capitalización y aportación')).getByLabelText('Anual'),
    );
    await user.type(screen.getByLabelText('Duración'), '3');
    await user.click(within(group('Unidad de la duración')).getByLabelText('Años'));
    await user.click(screen.getByRole('button', { name: 'Calcular interés compuesto' }));

    const panel = screen.getByRole('region', { name: 'Resultado' });
    expect(await within(panel).findByText(/No se ha podido cargar el gráfico/)).toBeVisible();
    expect(within(panel).queryByRole('slider')).toBeNull();
    expect(within(panel).getByRole('table')).toBeVisible();
  });
});
