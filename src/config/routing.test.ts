/**
 * Regresión de enrutado: la política de URL debe ser la misma en el build de
 * Astro y en Vercel (ADR 0005). Si divergen, una página existe en dist/ pero
 * producción la sirve en otra URL o la redirige en bucle.
 *
 * Comprobado en producción el 01/10/2026: /calculadora-interes-compuesto → 200;
 * …/calculadora-interes-compuesto.html y …/calculadora-interes-compuesto/ → 308
 * a la URL limpia.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('política de URL: Astro y Vercel coinciden', () => {
  it('vercel.json: URLs limpias, sin barra final, build de Astro en dist/ y sin reescrituras', () => {
    const vercel = JSON.parse(read('vercel.json')) as Record<string, unknown>;
    expect(vercel).toMatchObject({
      framework: 'astro',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      cleanUrls: true,
      trailingSlash: false,
    });
    // Una reescritura o redirección podría ocultar o desviar rutas de calculadoras.
    expect(vercel).not.toHaveProperty('rewrites');
    expect(vercel).not.toHaveProperty('redirects');
  });

  it('astro.config.ts: sin barra final, una página = un archivo .html, sitio estático y sin base', () => {
    const config = read('astro.config.ts');
    expect(config).toMatch(/trailingSlash:\s*'never'/);
    expect(config).toMatch(/build:\s*\{\s*format:\s*'file'\s*\}/);
    expect(config).toMatch(/output:\s*'static'/);
    expect(config).not.toMatch(/\bbase:/);
  });
});
