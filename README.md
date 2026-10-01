# Plataforma de calculadoras (nombre provisional)

> **PLACEHOLDER — PENDIENTE DE DEFINIR:** marca, nombre y dominio.

Web estática de calculadoras online para España, con Astro, islas de Preact y TypeScript estricto. Todos los cálculos se hacen en el navegador. No hay backend, cookies, analítica ni anuncios. La publicidad (AdSense) está preparada pero desactivada: ver [docs/privacidad-y-legal.md](docs/privacidad-y-legal.md).

**Estado:** infraestructura completa y una calculadora en **borrador**: interés compuesto (`/calculadora-interes-compuesto`, `noindex` y fuera del sitemap hasta que se publique; ver [ADR 0008](docs/adr/0008-interes-compuesto.md)).

## Requisitos

Node 24 (`.nvmrc`) y npm 11.

## Comandos

| Comando                                  | Qué hace                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm ci`                                 | Instala exactamente las versiones del lockfile                                                     |
| `npm run dev`                            | Servidor de desarrollo                                                                             |
| `npm run build`                          | Build de producción en `dist/`                                                                     |
| `npm run build:test`                     | Build de pruebas en `dist-test/` (incluye `/test-harness/…`; **no desplegar**)                     |
| `npm run typecheck`                      | `astro check` y typecheck de las capas puras sin DOM (`tsconfig.core.json`)                        |
| `npm run lint`                           | ESLint, sin avisos permitidos                                                                      |
| `npm run format` / `format:check`        | Prettier                                                                                           |
| `npm test` / `npm run test:coverage`     | Vitest: unitarios, propiedades y componentes                                                       |
| `npm run test:e2e` / `npm run test:a11y` | Playwright contra el build estático de pruebas                                                     |
| `npm run check:dist`                     | Verifica el build de producción: sin páginas de prueba ni scripts de terceros, con metadatos y CSP |
| `npm run budget` / `budget:test`         | Presupuesto de JavaScript por página                                                               |
| `npm run verify`                         | **Todo lo anterior en orden.** Debe pasar antes de publicar                                        |

La primera vez que se ejecuten los tests E2E hace falta instalar Chromium: `npx playwright install chromium`.

## Estructura

```
src/
  core/            Lógica pura (sin Astro, Preact ni DOM): Decimal, Result, parseo,
                   validación, contrato de calculadora, reglas versionadas, fuentes
  i18n/            Locale es-ES, mensajes y formato (moneda, %, números, fechas)
  calculators/     registry.ts, categories.ts + una carpeta por calculadora (compound-interest: borrador)
  sources/         Registro de fuentes (vacío: nada sin verificar)
  components/      calculator/ (CalculatorShell, NumberField…), layout/, seo/, ads/
  layouts/         BaseLayout, CalculatorLayout
  lib/seo/         Metadatos, canonical y structured data (BreadcrumbList, WebApplication)
  config/          site.ts (identidad), env.ts (despliegue), features.ts (anuncios/consentimiento)
  pages/           index, 404, robots.txt, calculadora-interes-compuesto
  styles/          global.css (tokens de diseño)
tests/             e2e/, a11y/, fixtures/ (calculadora ficticia de identidad), setup/
docs/              ADR, Definition of Done, fichas de calculadoras, fuentes, privacidad, rendimiento, seguridad
integrations/      Inyección de páginas de prueba (solo en el build de pruebas)
scripts/           check-budget, check-dist, run-with-env
```

Arquitectura y motivos: [docs/adr/](docs/adr/).

## Identidad provisional: dónde cambiarla

| Qué                                   | Dónde                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nombre del sitio                      | `src/config/site.ts` → `siteIdentity.name`, y `isPlaceholder: false`                                                                                   |
| Dominio                               | Variable de entorno `PUBLIC_SITE_URL` en Vercel (solo el origen: `https://…`). Sin ella se usa `https://example.com` y el sitio **nunca** es indexable |
| Colores, radios, sombras y tipografía | `src/styles/global.css`: solo las secciones `:root`. `src/styles/tokens.test.ts` comprueba el contraste WCAG AA                                        |
| Favicon                               | `public/favicon.svg`                                                                                                                                   |
| Descripción de la portada             | `src/pages/index.astro`                                                                                                                                |
| Enlaces legales del pie               | `src/config/legal.ts` (ninguna página existe aún; pendiente de redacción y revisión jurídica)                                                          |

## Añadir una calculadora

Proceso completo y motivos: [ADR 0009](docs/adr/0009-portal-escalable.md).

1. Rellenar la ficha a partir de [docs/calculators/ficha-plantilla.md](docs/calculators/ficha-plantilla.md): sin una intención de búsqueda real, la calculadora no se crea.
2. Crear `src/calculators/<id>/` con `definition.ts` (`defineCalculator`), `engine.ts` (motor puro), sus tests y, si depende de normativa, `rules/<jurisdicción>/<validFrom>.ts`.
3. Registrar y **verificar** las fuentes en `src/sources/registry.ts` (docs/sources-policy.md).
4. Crear la isla `src/calculators/<id>/ui/<Nombre>Island.tsx` usando `CalculatorShell`, y sus textos.
5. Crear la página `src/pages/<slug>.astro` como `<CalculatorLayout {...calculatorPageProps('<id>')}>`: title, description, canonical, robots, H1 y migas salen del registro.
6. Añadir la entrada en `src/calculators/registry.ts` (nombre, H1, categoría, SEO) como `draft`, y pasarla a `published` solo cuando cumpla [docs/calculator-definition-of-done.md](docs/calculator-definition-of-done.md).

## Despliegue (Vercel)

`vercel.json` define el build, las URLs sin barra final y las cabeceras de seguridad. Vercel detecta el framework Astro y usa Node 24.x (`engines`). Las cabeceras en producción están **NO VERIFICADO — NECESITA PRUEBA** hasta el primer despliegue (docs/security.md).
