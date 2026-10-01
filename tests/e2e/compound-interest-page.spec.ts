/**
 * Página de PRODUCCIÓN de la calculadora de interés compuesto
 * (/calculadora-interes-compuesto): metadatos, estructura, integración de la
 * isla con gráfico y tabla, y maquetación responsive.
 * Importes esperados: fixtures independientes (F1, F10), nunca el motor.
 */
import { expect, test, type Page } from '@playwright/test';

import { probePage } from './helpers';

const PATH = '/calculadora-interes-compuesto';
const SUBMIT = 'Calcular interés compuesto';

const group = (page: Page, name: string) => page.getByRole('radiogroup', { name });
const resultRegion = (page: Page) => page.getByRole('region', { name: 'Resultado', exact: true });
const valueOf = (page: Page, term: string) =>
  resultRegion(page)
    .locator('dt')
    .getByText(term, { exact: true })
    .locator('xpath=following-sibling::dd[1]');

async function fillF1(page: Page): Promise<void> {
  await page.getByLabel('Capital inicial').fill('1.000');
  await page.getByLabel('Tipo de interés anual').fill('5');
  await group(page, 'Tipo de tasa').getByLabel('TAE / tipo efectivo anual').check();
  await group(page, 'Frecuencia de capitalización y aportación').getByLabel('Anual').check();
  await page.getByLabel('Duración', { exact: true }).fill('3');
  await group(page, 'Unidad de la duración').getByLabel('Años').check();
}

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

/** Abre la página y espera a que la isla hidrate (antes, el botón está deshabilitado). */
async function open(page: Page): Promise<void> {
  await page.goto(PATH);
  await expect(page.getByRole('button', { name: SUBMIT })).toBeEnabled();
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('metadatos y SEO', () => {
  test('title, description, canonical, robots (borrador ⇒ noindex), idioma y CSP', async ({
    page,
    baseURL,
  }) => {
    const probe = await probePage(page, baseURL ?? '');
    const response = await page.goto(PATH);
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle('Calculadora de interés compuesto · Calculadoras');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Calcula cómo puede evolucionar un capital con interés compuesto y aportaciones periódicas, con TIN o tipo efectivo anual, varias frecuencias y tabla año a año.',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://example.com/calculadora-interes-compuesto',
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://example.com/calculadora-interes-compuesto',
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES');
    await expect(page.getByRole('button', { name: SUBMIT })).toBeEnabled();

    expect(await probe.cspViolations()).toEqual([]);
    expect(probe.consoleErrors).toEqual([]);
    expect(probe.externalRequests).toEqual([]);
  });

  test('un solo H1, jerarquía de encabezados sin saltos y una sola isla', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Calculadora de interés compuesto',
    );
    const levels = await page
      .locator('main :is(h1, h2, h3, h4)')
      .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
    expect(levels[0]).toBe(1);
    levels.forEach((level, index) => {
      if (index > 0) expect(level - (levels[index - 1] ?? 1)).toBeLessThanOrEqual(1);
    });
    expect(await page.locator('astro-island').count()).toBe(1);
  });

  test('migas de pan visibles y BreadcrumbList idéntico; sin FAQPage (ADR 0005)', async ({
    page,
  }) => {
    await open(page);
    const breadcrumbs = page.getByRole('navigation', { name: 'Ruta de navegación' });
    await expect(breadcrumbs.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveText(
      'Calculadora de interés compuesto',
    );
    const schemas = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent) as unknown));
    expect(schemas).toEqual([
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://example.com/' },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Calculadora de interés compuesto',
            item: 'https://example.com/calculadora-interes-compuesto',
          },
        ],
      },
    ]);
  });

  test('el borrador no aparece en el sitemap ni en la portada', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('calculadora-interes-compuesto');
    await page.goto('/');
    expect(await page.locator('a[href="/calculadora-interes-compuesto"]').count()).toBe(0);
    // Sin calculadoras publicadas no se lista ninguna categoría (nada de secciones vacías).
    await expect(page.getByText('Todavía no hay calculadoras publicadas.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Finanzas' })).toHaveCount(0);
  });

  test('la introducción dice qué se calcula y qué resultado se obtiene', async ({ page }) => {
    await open(page);
    await expect(
      page.getByText(/^Calcula cuánto puede crecer un capital con interés compuesto/),
    ).toBeVisible();
    await expect(
      page.getByText(/Obtendrás el valor final estimado, el capital aportado/),
    ).toBeVisible();
  });
});

test.describe('contenido', () => {
  test('secciones editoriales, metodología, FAQ, fuentes pendientes y aviso', async ({ page }) => {
    await open(page);
    for (const name of [
      '¿Qué es el interés compuesto?',
      '¿Cómo se calcula?',
      'Diferencia entre TIN y tipo efectivo anual',
      'Frecuencia de capitalización',
      'Aportaciones al inicio o al final del periodo',
      'Ejemplo con aportaciones periódicas',
      'Cómo interpretar el resultado',
      'Supuestos y limitaciones',
      'Preguntas frecuentes',
      'Metodología',
      'Fuentes',
      'Aviso',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
    }
    // Las 5 fuentes están verificadas: muestran sus fechas de consulta y
    // revisión y ninguna lleva la marca de "no verificado".
    const section = page.locator('section[aria-labelledby="fuentes"]');
    const sources = section.locator('li[data-source-id]');
    await expect(sources).toHaveCount(5);
    await expect(section.getByText('NO VERIFICADO — NECESITA FUENTE')).toHaveCount(0);
    for (const source of await sources.all()) {
      await expect(source.getByText(/Consultada el 1 de octubre de 2026/)).toBeVisible();
      await expect(source.locator('a')).toHaveAttribute('rel', 'noreferrer');
    }
    // El aviso está redactado (no es el placeholder).
    await expect(page.getByText(/PLACEHOLDER/)).toHaveCount(0);
    // Nunca se presenta el tipo equivalente como TAE.
    await expect(page.getByText('TAE equivalente')).toHaveCount(0);
  });

  test('las preguntas frecuentes se abren con el teclado', async ({ page }) => {
    await open(page);
    const summary = page.locator('summary', {
      hasText: '¿Qué ocurre si el tipo de interés es 0 %?',
    });
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText(/No se generan intereses: el valor final es exactamente/),
    ).toBeVisible();
  });
});

test.describe('calculadora en la página', () => {
  test('F1: resultado, explicación, tabla (coincide con el ejemplo del texto) y gráfico', async ({
    page,
  }) => {
    await open(page);
    await fillF1(page);
    await page.getByRole('button', { name: SUBMIT }).click();
    await expect(valueOf(page, 'Valor final')).toHaveText('1.157,63 €');
    await expect(
      resultRegion(page).getByText(/^Al cabo de 3 años, el valor final estimado es de 1\.157,63/),
    ).toBeVisible();

    const table = resultRegion(page).getByRole('table');
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(3);
    // Mismas cifras que el ejemplo de «¿Qué es el interés compuesto?».
    await expect(rows.locator('td:nth-of-type(1)')).toHaveText(['50,00 €', '52,50 €', '55,13 €']);
    await expect(rows.last().locator('td').last()).toHaveText('1.157,63 €');

    const slider = resultRegion(page).getByRole('slider', {
      name: 'Explorar el gráfico por periodos',
    });
    await expect(slider).toHaveAttribute(
      'aria-valuetext',
      // Intl separa el importe y "€" con un espacio duro (U+00A0): \s lo admite.
      /^Año 3: saldo 1\.157,63\s€; capital aportado 1\.000,00\s€; intereses acumulados 157,63\s€\.$/,
    );
  });

  test('el gráfico y la tabla se actualizan al cambiar los datos', async ({ page }) => {
    await open(page);
    await fillF1(page);
    await page.getByRole('button', { name: SUBMIT }).click();
    const slider = resultRegion(page).getByRole('slider');
    await expect(slider).toHaveAttribute('aria-valuemax', '3');

    await page.getByLabel('Duración', { exact: true }).fill('5');
    await page.getByRole('button', { name: SUBMIT }).click();
    await expect(slider).toHaveAttribute('aria-valuemax', '5');
    await expect(resultRegion(page).locator('tbody tr')).toHaveCount(5);
    await expect(resultRegion(page).locator('tbody tr').last().locator('td').last()).toHaveText(
      await valueOf(page, 'Valor final').innerText(),
    );
  });

  test('el gráfico se recorre con el ratón y con el teclado', async ({ page }) => {
    await open(page);
    await fillF10(page);
    await page.getByRole('button', { name: SUBMIT }).click();
    const slider = resultRegion(page).getByRole('slider');
    await expect(slider).toHaveAttribute('aria-valuenow', '3');

    // El ratón solo actúa dentro del viewport: primero se lleva el gráfico a la vista.
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    if (box === null) throw new Error('El gráfico no tiene caja');
    await page.mouse.move(box.x + 14, box.y + box.height / 2);
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('#compound-interest-chart-detail')).toHaveText(
      /^Inicio: saldo 2\.000,00\s€/,
    );

    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveAttribute('aria-valuenow', '3');
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', '2');
    const outline = await slider.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).toBe('solid');
    // Tab sale del gráfico: no atrapa el foco.
    await page.keyboard.press('Tab');
    await expect(slider).not.toBeFocused();
  });

  test('duración inferior a un año: una sola fila por meses, sin años inventados', async ({
    page,
  }) => {
    await open(page);
    await page.getByLabel('Capital inicial').fill('1.000');
    await page.getByLabel('Tipo de interés anual').fill('3');
    await group(page, 'Tipo de tasa').getByLabel('TIN / tipo nominal anual').check();
    await group(page, 'Frecuencia de capitalización y aportación').getByLabel('Mensual').check();
    await page.getByLabel('Duración', { exact: true }).fill('6');
    await group(page, 'Unidad de la duración').getByLabel('Meses').check();
    await page.getByRole('button', { name: SUBMIT }).click();
    await expect(resultRegion(page).locator('tbody th')).toHaveText(['Meses 1–6']);
  });
});

test.describe('responsive', () => {
  for (const width of [320, 375, 390, 768, 1024, 1280, 1440]) {
    test(`sin desbordamiento horizontal a ${String(width)} px (vacío y con gráfico y tabla)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page);
      expect(await overflow(page)).toBeLessThanOrEqual(0);

      await fillF10(page);
      await page.getByRole('button', { name: SUBMIT }).click();
      await expect(resultRegion(page).getByRole('slider')).toBeVisible();
      expect(await overflow(page)).toBeLessThanOrEqual(0);

      // El gráfico ocupa el ancho disponible sin salirse de su contenedor.
      const chart = await resultRegion(page).getByRole('slider').boundingBox();
      expect((chart?.x ?? 0) + (chart?.width ?? 0)).toBeLessThanOrEqual(width);

      // Los objetivos táctiles de las preguntas frecuentes miden al menos 44 px.
      const heights = await page
        .locator('summary')
        .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
      for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
    });
  }

  test('a 320 px la tabla se desplaza dentro de su región, no la página', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await open(page);
    await fillF10(page);
    await page.getByRole('button', { name: SUBMIT }).click();
    const region = resultRegion(page).getByRole('region', { name: /^Saldo al final de cada año/ });
    const scrollable = await region.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    expect(scrollable).toBe(true);
    await expect(region).toHaveAttribute('tabindex', '0');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});
