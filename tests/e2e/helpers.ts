import type { Page } from '@playwright/test';

export const HARNESS_PATH = '/test-harness/calculator-shell';

export interface PageProbe {
  readonly consoleErrors: string[];
  readonly externalRequests: string[];
  readonly cspViolations: () => Promise<string[]>;
}

/**
 * Registra errores de consola, peticiones a otros orígenes (privacidad: no
 * debe haber ninguna) y violaciones de CSP (securitypolicyviolation).
 */
export async function probePage(page: Page, baseURL: string): Promise<PageProbe> {
  const origin = new URL(baseURL).origin;
  const consoleErrors: string[] = [];
  const externalRequests: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith('data:')) externalRequests.push(url);
  });

  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = violations;
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });

  return {
    consoleErrors,
    externalRequests,
    cspViolations: () =>
      page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations),
  };
}
