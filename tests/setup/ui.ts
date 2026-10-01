import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';

// jsdom no implementa scrollIntoView (todos los navegadores sí). El
// desplazamiento real se comprueba en los tests E2E con Playwright.
Element.prototype.scrollIntoView = function scrollIntoView() {
  // sin efecto en jsdom
};

afterEach(() => {
  cleanup();
});
