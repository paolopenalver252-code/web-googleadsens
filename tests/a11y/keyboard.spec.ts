import { expect, test } from '@playwright/test';

import { HARNESS_PATH } from '../e2e/helpers';

test.describe('navegación con teclado', () => {
  test('el primer Tab muestra el enlace de salto y Enter lleva al contenido principal', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Saltar al contenido principal' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });

  test('orden de tabulación lógico en la calculadora', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await expect(page.getByRole('button', { name: 'Calcular' })).toBeEnabled();

    const focusedNames: string[] = [];
    await page.getByRole('link', { name: 'Inicio' }).focus(); // último enlace antes de la calculadora (migas)
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      focusedNames.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          if (!(el instanceof HTMLElement)) return '';
          return el.id === '' ? el.textContent.trim() : el.id;
        }),
      );
    }
    expect(focusedNames).toEqual([
      'test-echo-importe',
      'test-echo-porcentaje',
      'test-echo-periodos',
      'Calcular',
    ]);
  });

  test('el foco es siempre visible (contorno sólido) en campos y botón', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await expect(page.getByRole('button', { name: 'Calcular' })).toBeEnabled();

    await page.getByLabel('Importe').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab'); // foco por teclado → :focus-visible
    const fieldOutline = await page
      .getByLabel('Importe')
      .evaluate((input) => getComputedStyle(input.parentElement ?? input).outlineStyle);
    expect(fieldOutline).toBe('solid');

    await page.getByLabel('Periodos').focus();
    await page.keyboard.press('Tab');
    const button = page.getByRole('button', { name: 'Calcular' });
    await expect(button).toBeFocused();
    expect(await button.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  });

  test('prefers-reduced-motion elimina las transiciones', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(HARNESS_PATH);
    const duration = await page
      .getByRole('button', { name: 'Calcular' })
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(duration).toBeLessThanOrEqual(0.001);
  });
});
