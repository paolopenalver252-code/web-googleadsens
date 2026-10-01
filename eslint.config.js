// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Capas PURAS (docs/adr/0002-arquitectura.md): no pueden depender de Astro,
 * Preact, componentes ni APIs del navegador. tsconfig.core.json lo refuerza
 * compilándolas sin la librería DOM.
 */
const PURE_LAYERS = [
  'src/core/**/*.ts',
  'src/i18n/**/*.ts',
  'src/sources/**/*.ts',
  'src/calculators/**/*.ts',
];
const PURE_LAYER_EXCEPTIONS = ['src/calculators/**/ui/**', '**/*.test.ts', '**/__tests__/**'];

/** decimal.js solo puede importarse desde el adaptador. */
const DECIMAL_JS_RESTRICTION = {
  name: 'decimal.js',
  message: 'Usa el adaptador "@/core/math/decimal": decimal.js está aislado (ADR 0003).',
};

const UI_AND_FRAMEWORK_PATTERNS = [
  {
    group: ['preact', 'preact/*', '@preact/*', 'astro', 'astro/*', 'astro:*', '*.astro'],
    message: 'Las capas puras no pueden depender de Astro ni Preact (ADR 0002).',
  },
  {
    group: ['@/components/*', '@/layouts/*', '@/pages/*', '@/config/env', '@/lib/*'],
    message: 'Las capas puras no pueden importar UI, páginas ni configuración de despliegue.',
  },
];

export default defineConfig(
  {
    ignores: [
      'dist/',
      'dist-test/',
      '.astro/',
      'coverage/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      '.claude/',
      '.agents/',
    ],
  },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  astro.configs['flat/recommended'],
  astro.configs['flat/jsx-a11y-strict'],
  {
    files: ['**/*.tsx'],
    ...jsxA11y.configs.strict,
  },
  {
    files: ['**/*.tsx'],
    rules: {
      // Una región desplazable (tabla ancha en móvil) debe poder recibir el
      // foco para desplazarse con teclado (axe: scrollable-region-focusable).
      'jsx-a11y-x/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'region'] },
      ],
    },
  },

  // Reglas del proyecto (todas las fuentes)
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': ['error', { paths: [DECIMAL_JS_RESTRICTION] }],
      // Seguridad (ADR 0002): nunca HTML sin escapar desde componentes.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'Prohibido: inyecta HTML sin escapar (riesgo de XSS).',
        },
      ],
      'astro/no-set-html-directive': 'error',
      'astro/no-unsafe-inline-scripts': 'error',
    },
  },

  // Adaptador decimal: único archivo autorizado a importar decimal.js.
  {
    files: ['src/core/math/decimal.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // Capas puras: sin framework, sin UI, sin APIs del navegador.
  {
    files: PURE_LAYERS,
    ignores: PURE_LAYER_EXCEPTIONS,
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [DECIMAL_JS_RESTRICTION], patterns: UI_AND_FRAMEWORK_PATTERNS },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          'window',
          'document',
          'navigator',
          'location',
          'localStorage',
          'sessionStorage',
          'fetch',
        ].map((name) => ({
          name,
          message: 'Las capas puras no acceden al entorno del navegador (ADR 0002).',
        })),
      ],
    },
  },
  {
    files: ['src/core/math/decimal.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: UI_AND_FRAMEWORK_PATTERNS }],
    },
  },

  // Archivos .astro y JS de configuración: sin análisis con tipos
  {
    files: ['**/*.astro', '**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['scripts/**/*.mjs', '*.config.js', '*.config.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
);
