import { expect, test } from '@playwright/test';

import { HARNESS_PATH, probePage } from './helpers';

test.describe('página principal', () => {
  test('carga como HTML estático con metadatos, noindex y CSP', async ({ page, baseURL }) => {
    const probe = await probePage(page, baseURL ?? '');
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/\S/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    // Dominio placeholder + build no productivo ⇒ nunca indexable.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://example.com/',
    );
    await expect(page.locator('meta[http-equiv="content-security-policy"]')).toHaveAttribute(
      'content',
      /script-src 'self'/,
    );

    // Página de contenido: sin JavaScript de islas.
    expect(await page.locator('astro-island').count()).toBe(0);
    expect(await page.locator('script[type="module"]').count()).toBe(0);

    expect(probe.consoleErrors).toEqual([]);
    expect(probe.externalRequests).toEqual([]);
    expect(await probe.cspViolations()).toEqual([]);
  });

  test('landmarks básicos: cabecera, principal y pie', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
  });
});

test.describe('navegación', () => {
  test('desde la 404 se vuelve al inicio por la cabecera y por el enlace', async ({ page }) => {
    await page.goto('/no-existe');
    await page
      .getByRole('banner')
      .getByRole('link', { name: 'Calculadoras', exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/no-existe');
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('el enlace de navegación lleva a la sección de calculadoras', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link').click();
    await expect(page).toHaveURL(/#calculadoras$/);
    await expect(page.getByRole('heading', { name: 'Calculadoras', level: 2 })).toBeVisible();
  });
});

test.describe('404', () => {
  test('una URL inexistente responde 404 con página propia y noindex', async ({ page }) => {
    const response = await page.goto('/esta-pagina-no-existe');
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });
});

test.describe('robots.txt y sitemap', () => {
  test('robots.txt no bloquea el rastreo (el noindex debe poder leerse) y no anuncia sitemap si no es indexable', async ({
    request,
  }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).not.toContain('Disallow: /');
    expect(body).not.toContain('Sitemap:');
  });

  test('el sitemap existe y excluye la 404 y las páginas de prueba', async ({ request }) => {
    expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).toContain('<loc>https://example.com/</loc>');
    expect(sitemap).not.toContain('404');
    expect(sitemap).not.toContain('test-harness');
  });
});

test.describe('maquetación responsive', () => {
  for (const path of ['/', '/no-existe', HARNESS_PATH]) {
    test(`sin desbordamiento horizontal a 320 px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
