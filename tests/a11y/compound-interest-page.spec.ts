/**
 * axe (incluido el contraste) sobre la página de PRODUCCIÓN de interés
 * compuesto, en tema claro y oscuro: estado inicial, con errores y con
 * resultado (gráfico y tabla cargados y preguntas frecuentes abiertas).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PATH = '/calculadora-interes-compuesto';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    })),
  ).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`axe — página de interés compuesto, tema ${colorScheme === 'light' ? 'claro' : 'oscuro'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(PATH);
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe(colorScheme === 'light' ? 'rgb(246, 247, 249)' : 'rgb(12, 17, 27)');
    await expect(page.getByRole('button', { name: 'Calcular interés compuesto' })).toBeEnabled();
    await expectNoViolations(page);

    await page.getByRole('button', { name: 'Calcular interés compuesto' }).click();
    await expect(page.getByRole('group', { name: /errores/ })).toBeVisible();
    await expectNoViolations(page);

    await page.getByLabel('Capital inicial').fill('2.000');
    await page.getByLabel('Aportación periódica').fill('500');
    await page.getByLabel('Tipo de interés anual').fill('4');
    await page
      .getByRole('radiogroup', { name: 'Tipo de tasa' })
      .getByLabel('TIN / tipo nominal anual')
      .check();
    await page
      .getByRole('radiogroup', { name: 'Frecuencia de capitalización y aportación' })
      .getByLabel('Semestral')
      .check();
    await page
      .getByRole('radiogroup', { name: 'Momento de la aportación' })
      .getByLabel('Al inicio de cada periodo')
      .check();
    await page.getByLabel('Duración', { exact: true }).fill('36');
    await page
      .getByRole('radiogroup', { name: 'Unidad de la duración' })
      .getByLabel('Meses')
      .check();
    await page.getByRole('button', { name: 'Calcular interés compuesto' }).click();
    await expect(
      page.getByRole('slider', { name: 'Explorar el gráfico por periodos' }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Resultado', exact: true }).getByRole('table'),
    ).toBeVisible();
    for (const summary of await page.locator('summary').all()) await summary.click();
    await expectNoViolations(page);
  });
}

test('con movimiento reducido no hay transiciones perceptibles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(PATH);
  const duration = await page
    .locator('summary svg')
    .first()
    .evaluate((icon) => getComputedStyle(icon).transitionDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
});
