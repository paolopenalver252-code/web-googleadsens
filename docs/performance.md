# Rendimiento

## Objetivos

- HTML estático en todas las páginas, con cero JavaScript en las de contenido.
- Una sola isla por página de calculadora (lo comprueba un test E2E).
- Sin fuentes externas: se usan las fuentes del sistema.
- Sin imágenes decorativas. Iconos en SVG inline, sin librerías de iconos.
- Sin CLS: los espacios publicitarios reservan su altura, y el build falla si se activan sin ella.
- Carga diferida de lo no esencial (p. ej. un futuro gráfico, con `import()` tras el primer resultado).
- Core Web Vitals: LCP, INP y CLS.

## Presupuestos (`performance-budget.json`)

| Página                 | JS inicial (gzip) |
| ---------------------- | ----------------- |
| Calculadora (con isla) | ≤ 50 kB           |
| Contenido (sin isla)   | ≤ 1 kB            |

`npm run budget` (producción) y `npm run budget:test` (build de pruebas) miden el JS inicial de cada página siguiendo sus imports estáticos, y fallan si se supera el presupuesto o si hay scripts externos. **Si un presupuesto necesita revisión, se documenta aquí la medición; no se sube sin más.**

## Medición del build (2026-09-29)

| Página                                                                   | JS inicial (kB gz) |
| ------------------------------------------------------------------------ | ------------------ |
| `/index.html`                                                            | 0,00               |
| `/404.html`                                                              | 0,00               |
| `/test-harness/calculator-shell.html` (isla con la calculadora ficticia) | **29,04**          |

Desglose de la página con isla (gzip nivel 9, cada archivo por separado):

| Chunk                           | kB gz             | Contenido                                                                             |
| ------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| Isla (`EchoIsland-*.js`)        | 20,44             | CalculatorShell, componentes, i18n, core y **decimal.js** (≈ 12,73 kB gz por sí solo) |
| `preact.module`                 | 4,31              | Runtime de Preact                                                                     |
| `client`                        | 1,37              | Renderer de islas de @astrojs/preact                                                  |
| `hooks.module`                  | 1,13              | Hooks de Preact                                                                       |
| Script inline de islas de Astro | resto hasta 29,04 |                                                                                       |

El build también genera `signals.module` (2,91 kB gz), pero no forma parte de la carga inicial de esta página.

CSS: 4,56 kB gz (una sola hoja).

**Conclusión:** la infraestructura consume unos 29 kB de los 50 kB. Queda un margen de unos 21 kB gz para la lógica y la UI de cada calculadora. Una calculadora con gráfico debe cargarlo de forma diferida.

## Medición del build (2026-09-30): página de interés compuesto

| Página                                                    | JS inicial (kB gz) | Diferido (kB gz) |
| --------------------------------------------------------- | ------------------ | ---------------- |
| `/calculadora-interes-compuesto.html` (producción)        | **33,90**          | 4,52             |
| `/test-harness/compound-interest.html` (build de pruebas) | 34,72              | 4,54             |

- Antes de esta fase, la isla de interés compuesto medía **32,07 kB gz**. La tabla anual, la explicación y el cargador del gráfico añaden unos 1,8 kB a la carga inicial.
- **Gráfico: SVG propio, sin librería**, cargado con `import()` tras el primer resultado (ADR 0008). Su chunk ocupa unos 1,6 kB gz. El resto de lo diferido es `signals.module` (≈ 2,9 kB gz), que el renderer de Preact de Astro importa de forma dinámica y ya existía.
- **Corrección de la medición:** `check-budget.mjs` no detectaba los `import()` que Vite emite con comillas invertidas (``import(`./x.js`)``), así que la columna "diferido" salía a 0. Solo afectaba a esa columna informativa: el JS inicial se medía bien.
- Margen restante en la página de calculadora: unos 16 kB gz sobre el presupuesto de 50 kB.
