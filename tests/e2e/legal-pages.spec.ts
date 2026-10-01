/**
 * Páginas legales (borrador pendiente de revisión jurídica): accesibles desde
 * el pie, noindex, fuera del sitemap, con los datos pendientes marcados de
 * forma explícita y coherentes con lo que afirman (sin cookies ni
 * almacenamiento, sin terceros).
 */
import { expect, test } from '@playwright/test';

import { probePage } from './helpers';

const PAGES = [
  { path: '/aviso-legal', heading: 'Aviso legal', link: 'Aviso legal' },
  { path: '/privacidad', heading: 'Política de privacidad', link: 'Política de privacidad' },
  { path: '/cookies', heading: 'Política de cookies', link: 'Política de cookies' },
] as const;

for (const legal of PAGES) {
  test(`${legal.path}: borrador noindex, con aviso de revisión pendiente y fecha provisional`, async ({
    page,
    baseURL,
  }) => {
    const probe = await probePage(page, baseURL ?? '');
    const response = await page.goto(legal.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(legal.heading);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://example.com${legal.path}`,
    );
    await expect(
      page.getByRole('heading', { name: 'Borrador pendiente de revisión jurídica' }),
    ).toBeVisible();
    await expect(page.getByText('(fecha provisional del borrador)')).toBeVisible();
    await expect(page.getByText(/PLACEHOLDER/)).toHaveCount(0);

    // Coherencia con lo que dicen los textos: ni cookies, ni almacenamiento, ni terceros.
    expect(await page.context().cookies()).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    expect(probe.externalRequests).toEqual([]);
    expect(probe.consoleErrors).toEqual([]);
    expect(await probe.cspViolations()).toEqual([]);
  });

  test(`${legal.path}: se llega desde el pie de la portada`, async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Información legal' })
      .getByRole('link', { name: legal.link })
      .click();
    await expect(page).toHaveURL(new RegExp(`${legal.path}$`));
  });
}

test('NIF y domicilio del titular visibles, sin marcadores pendientes', async ({ page }) => {
  for (const path of ['/aviso-legal', '/privacidad']) {
    await page.goto(path);
    await expect(page.getByText('54627623R')).toBeVisible();
    await expect(
      page.getByText(
        'Carrer Mossèn Andreu Llabrés Feliu, 10, Inca, Mallorca (Islas Baleares), España',
      ),
    ).toBeVisible();
    await expect(page.getByText('[NIF PENDIENTE]')).toHaveCount(0);
    await expect(page.getByText('[DOMICILIO COMPLETO PENDIENTE]')).toHaveCount(0);
    await expect(page.getByText('Paolo Eloy Peñalver').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'paolopenalver252@gmail.com' }).first(),
    ).toHaveAttribute('href', 'mailto:paolopenalver252@gmail.com');
  }
});

test('la política de cookies declara que no se usan cookies ni almacenamiento', async ({
  page,
}) => {
  await page.goto('/cookies');
  await expect(
    page.getByText('CalculDS no utiliza cookies ni guarda información en tu navegador.'),
  ).toBeVisible();
});

test('las páginas legales en borrador no están en el sitemap', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  for (const legal of PAGES) expect(sitemap).not.toContain(legal.path);
});

for (const width of [320, 768, 1280]) {
  test(`sin desbordamiento horizontal a ${String(width)} px en las páginas legales`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const legal of PAGES) {
      await page.goto(legal.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, legal.path).toBeLessThanOrEqual(0);
    }
  });
}
