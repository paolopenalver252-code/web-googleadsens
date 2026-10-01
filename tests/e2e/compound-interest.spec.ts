/**
 * UI de interés compuesto en navegador real (página de prueba, no de producción).
 * Importes esperados: fixtures independientes (F1, F10), nunca el motor.
 */
import { expect, test, type Page } from '@playwright/test';

import { probePage } from './helpers';

const PATH = '/test-harness/compound-interest';

const group = (page: Page, name: string) => page.getByRole('radiogroup', { name });
/** <dd> del concepto con texto EXACTO (hasText sería una subcadena: "Aportaciones" ⊂ "Número de aportaciones"). */
const valueOf = (page: Page, term: string) =>
  page
    .getByRole('region', { name: 'Resultado' })
    .locator('dt')
    .getByText(term, { exact: true })
    .locator('xpath=following-sibling::dd[1]');

async function fillF10(page: Page): Promise<void> {
  await page.getByLabel('Capital inicial').fill('2.000');
  await page.getByLabel('Aportación periódica').fill('500');
  await page.getByLabel('Tipo de interés anual').fill('4');
  await group(page, 'Tipo de tasa').getByLabel('TIN / tipo nominal anual').check();
  await group(page, 'Frecuencia de capitalización y aportación').getByLabel('Semestral').check();
  await group(page, 'Momento de la aportación').getByLabel('Al inicio de cada periodo').check();
  await page.getByLabel('Duración', { exact: true }).fill('36');
  await group(page, 'Unidad de la duración').getByLabel('Meses').check();
}

test('hidrata bajo CSP sin violaciones, errores ni peticiones externas', async ({
  page,
  baseURL,
}) => {
  const probe = await probePage(page, baseURL ?? '');
  await page.goto(PATH);
  await expect(page.getByRole('button', { name: 'Calcular interés compuesto' })).toBeEnabled();
  expect(await probe.cspViolations()).toEqual([]);
  expect(probe.consoleErrors).toEqual([]);
  expect(probe.externalRequests).toEqual([]);
});

test('F10: resultado completo con formato español', async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByRole('button', { name: 'Calcular interés compuesto' })).toBeEnabled(); // hidratada
  await fillF10(page);
  await page.getByRole('button', { name: 'Calcular interés compuesto' }).click();
  await expect(valueOf(page, 'Valor final')).toHaveText('5.469,47 €');
  await expect(valueOf(page, 'Capital inicial')).toHaveText('2.000,00 €');
  await expect(valueOf(page, 'Aportaciones')).toHaveText('3.000,00 €');
  await expect(valueOf(page, 'Intereses generados')).toHaveText('469,47 €');
  await expect(valueOf(page, 'Tipo efectivo anual equivalente')).toHaveText('4,04 %');
  await expect(valueOf(page, 'Total invertido')).toHaveText('5.000,00 €');
  await expect(valueOf(page, 'Número de aportaciones')).toHaveText('6');
});

test('solo con teclado: Tab recorre los campos en orden y Enter calcula (F1)', async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByRole('button', { name: 'Calcular interés compuesto' })).toBeEnabled();
  await page.getByLabel('Capital inicial').focus();
  await page.keyboard.type('1.000');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Aportación periódica')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Tipo de interés anual')).toBeFocused();
  await page.keyboard.type('5');
  await page.keyboard.press('Tab');
  await expect(group(page, 'Tipo de tasa').getByLabel('TAE / tipo efectivo anual')).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(
    group(page, 'Frecuencia de capitalización y aportación').getByLabel('Anual'),
  ).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(
    group(page, 'Momento de la aportación').getByLabel('Al inicio de cada periodo'),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Duración', { exact: true })).toBeFocused();
  await page.keyboard.type('3');
  await page.keyboard.press('Tab');
  await expect(group(page, 'Unidad de la duración').getByLabel('Años')).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Calcular interés compuesto' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(valueOf(page, 'Valor final')).toHaveText('1.157,63 €');
});

test('las flechas cambian de opción y el foco de cada opción es visible', async ({ page }) => {
  await page.goto(PATH);
  await expect(page.getByRole('button', { name: 'Calcular interés compuesto' })).toBeEnabled(); // hidratada
  const annual = group(page, 'Frecuencia de capitalización y aportación').getByLabel('Anual');
  await page.getByLabel('Tipo de interés anual').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab'); // primer radio de la frecuencia (foco por teclado)
  await expect(annual).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    group(page, 'Frecuencia de capitalización y aportación').getByLabel('Semestral'),
  ).toBeChecked();
  const outline = await group(page, 'Frecuencia de capitalización y aportación')
    .getByLabel('Semestral')
    .evaluate((input) => getComputedStyle(input.closest('label') ?? input).outlineStyle);
  expect(outline).toBe('solid');
});

test('las opciones son objetivos táctiles de al menos 44 px de alto', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(PATH);
  const heights = await page
    .locator('[role="radiogroup"] label')
    .evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect().height));
  expect(heights.length).toBe(10);
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
});

for (const width of [320, 768, 1280]) {
  test(`sin desbordamiento horizontal a ${String(width)} px (vacío, con errores y con resultado)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PATH);
    const overflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    expect(await overflow()).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'Calcular interés compuesto' }).click();
    expect(await overflow()).toBeLessThanOrEqual(0);
    await fillF10(page);
    await page.getByRole('button', { name: 'Calcular interés compuesto' }).click();
    await expect(valueOf(page, 'Valor final')).toHaveText('5.469,47 €');
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
}
