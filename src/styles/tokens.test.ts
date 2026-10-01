/**
 * Contraste de los tokens de color (WCAG 2.2 AA) en tema claro y oscuro.
 * Lee los valores reales de global.css: si alguien cambia la marca por
 * colores que no cumplen, este test falla.
 *
 *   Texto normal: ≥ 4,5:1 (1.4.3) · Componentes de interfaz y foco: ≥ 3:1 (1.4.11)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

function tokensIn(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/--c-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) tokens[name] = value;
  }
  return tokens;
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const themes = {
  claro: tokensIn(css.slice(0, darkStart)),
  oscuro: tokensIn(css.slice(darkStart, css.indexOf('@theme'))),
};

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const TEXT_PAIRS: readonly [string, string][] = [
  ['text', 'canvas'],
  ['text', 'surface'],
  ['text', 'surface-muted'],
  ['text-muted', 'canvas'],
  ['text-muted', 'surface'],
  ['text-muted', 'surface-muted'],
  ['accent', 'canvas'],
  ['accent', 'surface'],
  ['accent-contrast', 'accent'],
  ['danger', 'surface'],
  ['danger', 'danger-soft'],
  ['text', 'danger-soft'],
  ['success', 'surface'],
  ['warning-text', 'warning-soft'],
  ['warning-text', 'canvas'],
];

const UI_PAIRS: readonly [string, string][] = [
  ['border-strong', 'surface'],
  ['border-strong', 'canvas'],
  ['focus', 'canvas'],
  ['focus', 'surface'],
  ['danger', 'surface'],
];

describe.each(Object.entries(themes))('tokens de color — tema %s', (_theme, tokens) => {
  it('define todos los tokens usados en los pares', () => {
    for (const [a, b] of [...TEXT_PAIRS, ...UI_PAIRS]) {
      expect(tokens[a], `falta --c-${a}`).toBeDefined();
      expect(tokens[b], `falta --c-${b}`).toBeDefined();
    }
  });

  it.each(TEXT_PAIRS)('texto %s sobre %s ≥ 4,5:1', (fg, bg) => {
    expect(contrast(tokens[fg] ?? '#000000', tokens[bg] ?? '#000000')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('componente %s sobre %s ≥ 3:1', (fg, bg) => {
    expect(contrast(tokens[fg] ?? '#000000', tokens[bg] ?? '#000000')).toBeGreaterThanOrEqual(3);
  });
});
