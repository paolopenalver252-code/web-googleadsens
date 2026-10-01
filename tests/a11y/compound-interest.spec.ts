/**
 * axe (incluido el contraste) sobre la UI de interés compuesto en navegador
 * real, en tema claro y oscuro: estado inicial, con errores y con resultado.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const PATH = '/test-harness/compound-interest';
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
  test(`axe — interés compuesto, tema ${colorScheme === 'light' ? 'claro' : 'oscuro'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(PATH);
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
      page.getByRole('region', { name: 'Resultado' }).getByText('Valor final', { exact: true }),
    ).toBeVisible();
    await expectNoViolations(page);
  });
}
