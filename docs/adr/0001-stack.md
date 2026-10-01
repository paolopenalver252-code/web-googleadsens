# ADR 0001 — Stack tecnológico

- **Estado:** aceptada
- **Fecha:** 2026-09-29

## Contexto

Proyecto nuevo (carpeta vacía: sin código previo que conservar). El producto es una web de calculadoras para España, con estas prioridades: resultados correctos, Core Web Vitals, poco JavaScript, SEO, accesibilidad y monetización futura con AdSense sin degradar la experiencia. Las páginas son sobre todo contenido, con una única zona interactiva (la calculadora). Se despliega en Vercel.

## Decisión

| Pieza                            | Versión fijada   | Papel                                               |
| -------------------------------- | ---------------- | --------------------------------------------------- |
| Astro                            | 7.3.5            | Generación estática de páginas (`output: 'static'`) |
| Preact + @astrojs/preact         | 10.29.8 / 6.0.5  | Islas interactivas (solo la calculadora)            |
| Tailwind CSS + @tailwindcss/vite | 4.3.3            | Estilos con tokens de diseño                        |
| TypeScript                       | **6.0.3**        | Modo estricto (`astro/tsconfigs/strictest`)         |
| decimal.js                       | 10.6.0           | Precisión decimal (ver ADR 0003)                    |
| Vitest / fast-check              | 5.0.2 / 4.10.2   | Tests unitarios, de propiedades y de componentes    |
| Playwright / axe-core            | 1.63.0 / 4.13.0  | E2E y accesibilidad en navegador real               |
| ESLint / typescript-eslint       | 10.11.0 / 8.71.0 | Lint con tipos y fronteras entre capas              |
| Prettier                         | 3.9.9            | Formato                                             |
| Node                             | 24.x             | `.nvmrc` y `engines` (Vercel usa la última 24.x)    |

Todas las versiones están fijadas de forma exacta (`.npmrc`: `save-exact=true`) y bloqueadas en `package-lock.json`.

## Alternativas

- **Vite + React (SPA):** el HTML se genera en el navegador (perjudica SEO y LCP salvo que se añada un prerender) y cada página carga React completo.
- **Next.js 16 (export estático):** buen ecosistema, pero toda la página se construye sobre el runtime de React y se hidrata. Envía más JS del necesario para páginas de contenido.
- **Astro + React en las islas:** viable. Preact ofrece la misma API (JSX + hooks) con un runtime mucho menor. El cambio a React quedaría limitado a la capa de UI.

## Motivo

Astro produce HTML estático sin JavaScript por defecto y solo hidrata las islas declaradas. Es exactamente el caso de estas páginas. Medición real del build (docs/performance.md): **0 kB de JS** en páginas de contenido y **29,04 kB gz** en una página con la isla de calculadora (presupuesto: 50 kB).

**TypeScript 6.0.3 y no 7.x:** comprobado el 29/09/2026 en los `peerDependencies`. `typescript-eslint@8.71.0` exige `typescript >=4.8.4 <6.1.0` y `@astrojs/check@0.9.10` exige `^5 || ^6`. TypeScript 7 rompería el lint con tipos y el typecheck de los `.astro`.

**ESLint 10 + `eslint-plugin-jsx-a11y-x`:** `eslint-plugin-astro@3.2.1` exige ESLint ≥ 10, y `eslint-plugin-jsx-a11y@6.10.2` solo admite hasta ESLint 9. El fork `eslint-plugin-jsx-a11y-x@0.2.0` (MIT, es-tooling) admite ESLint 10 y `eslint-plugin-astro` lo reconoce oficialmente como alternativa.

## Consecuencias

- Revisar la compatibilidad antes de actualizar TypeScript a 7.x: esperar a que typescript-eslint y @astrojs/check lo admitan.
- `npm install` avisa de que el `postinstall` de esbuild no está aprobado (npm 11 `allowScripts`). El build funciona sin él: esbuild instala su binario mediante dependencias opcionales. No se ha aprobado ningún script de instalación.
- Astro recopila telemetría anónima por defecto. Se desactiva con `npx astro telemetry disable` o con `ASTRO_TELEMETRY_DISABLED=1`. **Decisión pendiente.**
