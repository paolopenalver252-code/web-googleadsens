/**
 * Guardas de arquitectura (ADR 0009): impiden que una calculadora nueva se
 * salte las piezas centrales al copiar código. Analizan el código fuente
 * (sin tests), no el comportamiento.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.(ts|tsx|astro)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  path: relative(process.cwd(), path).replaceAll('\\', '/'),
  source: readFileSync(path, 'utf8'),
}));

const matching = (pattern: RegExp) =>
  files.filter((file) => pattern.test(file.source)).map((file) => file.path);

describe('arquitectura', () => {
  it('ningún archivo carga ni referencia el script de AdSense (punto único futuro: AdsScript)', () => {
    expect(matching(/adsbygoogle|googlesyndication|pagead2/)).toEqual([]);
  });

  it('AdsScript solo se incluye en BaseLayout (una vez por página)', () => {
    expect(matching(/import AdsScript\b/)).toEqual(['src/layouts/BaseLayout.astro']);
  });

  it('los espacios publicitarios solo se colocan desde CalculatorLayout, nunca en una calculadora', () => {
    expect(matching(/<AdSlot\b/)).toEqual(['src/layouts/CalculatorLayout.astro']);
  });

  it('la URL de una calculadora solo se construye en calculatorPath()', () => {
    expect(matching(/`\/\$\{[^}`]*\.slug\}`/)).toEqual(['src/calculators/registry.ts']);
  });

  it('el canonical nunca usa la URL de un despliegue concreto de Vercel', () => {
    expect(matching(/VERCEL_URL|VERCEL_BRANCH_URL|VERCEL_PROJECT_PRODUCTION_URL/)).toEqual([]);
  });
});
