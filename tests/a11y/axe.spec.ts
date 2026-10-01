/**
 * Auditoría automática con axe-core en navegador real (incluye contraste de
 * color, que jsdom no puede evaluar), en tema claro y oscuro.
 *
 * axe detecta solo una parte de los problemas de accesibilidad: la revisión
 * manual con teclado y lector de pantalla sigue siendo obligatoria
 * (docs/calculator-definition-of-done.md).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { HARNESS_PATH } from '../e2e/helpers';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
  expect(summary).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe — tema ${colorScheme === 'light' ? 'claro' : 'oscuro'}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme });
    });

    test('página principal', async ({ page }) => {
      await page.goto('/');
      // Garantiza que el tema emulado se aplica de verdad (si no, este bloque
      // repetiría el tema claro y el resultado sería engañoso).
      const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(background).toBe(colorScheme === 'light' ? 'rgb(246, 247, 249)' : 'rgb(12, 17, 27)');
      await expectNoViolations(page);
    });

    test('página 404', async ({ page }) => {
      await page.goto('/no-existe');
      await expectNoViolations(page);
    });

    test('calculadora: estado inicial, con errores y con resultado', async ({ page }) => {
      await page.goto(HARNESS_PATH);
      await expect(page.getByRole('button', { name: 'Calcular' })).toBeEnabled();
      await expectNoViolations(page);

      await page.getByRole('button', { name: 'Calcular' }).click();
      await expect(page.getByRole('group', { name: /errores/ })).toBeVisible();
      await expectNoViolations(page);

      await page.getByLabel('Importe').fill('1.000');
      await page.getByLabel('Periodos').fill('2');
      await page.getByRole('button', { name: 'Calcular' }).click();
      await expect(page.getByRole('table')).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
