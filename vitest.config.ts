/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/**
 * Tests unitarios y de componentes (docs/adr/0002-arquitectura.md → Testing).
 *
 * `getViteConfig` reutiliza la configuración de Astro (alias, JSX de Preact,
 * compilación de .astro para el Container API), así que los tests compilan
 * igual que el sitio.
 *
 *   unit → lógica pura, validación, formato, SEO, fuentes, reglas (Node)
 *   ui   → componentes Preact (jsdom) y componentes .astro (Container API)
 *
 * E2E y accesibilidad en navegador real: Playwright (playwright.config.ts).
 */
export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./tests/setup/ui.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: [
        'src/core/**',
        'src/i18n/**',
        'src/lib/**',
        'src/sources/**',
        'src/config/site.ts',
        'src/calculators/**',
      ],
      exclude: ['**/*.test.*', '**/types.ts', '**/__tests__/**'],
      thresholds: {
        // Umbral alto en la lógica: una calculadora no está terminada solo
        // porque "se vea bien". Ver docs/calculator-definition-of-done.md.
        'src/core/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
        // Mismo umbral para las calculadoras (motor, validación y UI).
        'src/calculators/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
      },
    },
  },
});
