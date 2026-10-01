import type { AstroIntegration } from 'astro';

/**
 * Prefijo de las páginas de prueba. Solo existen en builds con
 * INCLUDE_TEST_PAGES=1 (npm run build:test → dist-test/). El build de
 * producción nunca las incluye (lo verifica scripts/check-dist.mjs).
 */
export const TEST_ROUTE_PREFIX = '/test-harness/';

export function testPages(): AstroIntegration {
  return {
    name: 'test-pages',
    hooks: {
      'astro:config:setup': ({ injectRoute, logger }) => {
        logger.warn(
          'INCLUDE_TEST_PAGES=1: se incluyen páginas de prueba. Este build NO debe desplegarse.',
        );
        injectRoute({
          pattern: `${TEST_ROUTE_PREFIX}calculator-shell`,
          entrypoint: './tests/fixtures/pages/calculator-shell.astro',
          prerender: true,
        });
        // Isla real de interés compuesto, para E2E y accesibilidad en navegador.
        // NO es la página de producción (src/pages/calculadora-interes-compuesto.astro).
        injectRoute({
          pattern: `${TEST_ROUTE_PREFIX}compound-interest`,
          entrypoint: './tests/fixtures/pages/compound-interest.astro',
          prerender: true,
        });
      },
    },
  };
}
