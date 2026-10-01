import { defineConfig, devices } from '@playwright/test';

/**
 * E2E y accesibilidad en navegador real, contra el build ESTÁTICO de pruebas
 * (dist-test/, que incluye las páginas de /test-harness/). Así se prueba lo
 * mismo que se despliega, incluida la CSP generada por Astro.
 */
const PORT = 4329;
const isCI = process.env.CI !== undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'a11y', testDir: './tests/a11y', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build:test && npm run preview:test',
    url: `http://localhost:${String(PORT)}`,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
