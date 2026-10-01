/**
 * Infraestructura de calculadora en navegador real, con la calculadora
 * FICTICIA de identidad (tests/fixtures/echo-calculator): sin fórmulas.
 */
import { expect, test } from '@playwright/test';

import { HARNESS_PATH, probePage } from './helpers';

test.describe('isla de calculadora bajo CSP', () => {
  test('hidrata sin violaciones de CSP, sin errores y sin peticiones externas', async ({
    page,
    baseURL,
  }) => {
    const probe = await probePage(page, baseURL ?? '');
    await page.goto(HARNESS_PATH);

    // El botón solo se habilita al hidratar: si la CSP bloqueara la isla, seguiría deshabilitado.
    await expect(page.getByRole('button', { name: 'Calcular' })).toBeEnabled();
    expect(await probe.cspViolations()).toEqual([]);
    expect(probe.consoleErrors).toEqual([]);
    expect(probe.externalRequests).toEqual([]);
  });

  test('la página de calculadora incluye una sola isla', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    expect(await page.locator('astro-island').count()).toBe(1);
  });
});

test.describe('flujo de cálculo', () => {
  test('envío vacío: resumen de errores con foco y enlaces a los campos', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await page.getByRole('button', { name: 'Calcular' }).click();

    const summary = page.getByRole('group', { name: 'Hay 2 errores en el formulario' });
    await expect(summary).toBeFocused();
    await summary.getByRole('link', { name: /^Periodos:/ }).click();
    await expect(page.getByLabel('Periodos')).toBeFocused();
    await expect(page.getByLabel('Periodos')).toBeInViewport();
  });

  test('entrada española → resultado formateado y anuncio accesible', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await page.getByLabel('Importe').fill('1.234,56');
    await page.getByLabel('Porcentaje (opcional)').fill('5,25');
    await page.getByLabel('Periodos').fill('12');
    await page.getByRole('button', { name: 'Calcular' }).click();

    const table = page.getByRole('table', { name: 'Valores interpretados' });
    await expect(table.getByRole('cell').nth(0)).toHaveText('1.234,56 €');
    await expect(table.getByRole('cell').nth(1)).toHaveText('5,25 %');
    await expect(page.getByRole('status')).toHaveText(
      'Valores interpretados. Importe: 1.234,56 €.',
    );
  });

  test('solo con teclado: tabulación en orden y Enter para calcular', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await page.getByLabel('Importe').focus();
    await page.keyboard.type('50');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Porcentaje (opcional)')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Periodos')).toBeFocused();
    await page.keyboard.type('3');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table', { name: 'Valores interpretados' })).toBeVisible();
  });

  test('privacidad: no guarda datos ni cookies y no los pone en la URL', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await page.getByLabel('Importe').fill('999');
    await page.getByLabel('Periodos').fill('1');
    await page.getByRole('button', { name: 'Calcular' }).click();
    await expect(page.getByRole('table')).toBeVisible();

    expect(new URL(page.url()).search).toBe('');
    const storage = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
      cookie: document.cookie,
    }));
    expect(storage).toEqual({ local: 0, session: 0, cookie: '' });
    expect(await page.context().cookies()).toEqual([]);
  });

  test('JSON-LD BreadcrumbList válido en la página', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(raw ?? '{}') as {
      '@type': string;
      itemListElement: { position: number }[];
    };
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement.map((item) => item.position)).toEqual([1, 2]);
  });
});
