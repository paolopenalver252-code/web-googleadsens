/** axe (incluido el contraste) en las páginas legales, en tema claro y oscuro. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const colorScheme of ['light', 'dark'] as const) {
  test(`axe — páginas legales, tema ${colorScheme === 'light' ? 'claro' : 'oscuro'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    for (const path of ['/aviso-legal', '/privacidad', '/cookies']) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(
        results.violations.map((violation) => ({
          path,
          id: violation.id,
          targets: violation.nodes.map((node) => node.target.join(' ')),
        })),
      ).toEqual([]);
    }
  });
}
