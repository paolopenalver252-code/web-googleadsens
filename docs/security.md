# Seguridad y privacidad

## Implementado

| Medida                                                                                                                                                                             | Dónde                              | Verificación                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Sin backend: todo es estático y el cálculo es local                                                                                                                                | `output: 'static'`                 | Build                                                                  |
| Prohibido `dangerouslySetInnerHTML`                                                                                                                                                | ESLint (`no-restricted-syntax`)    | `npm run lint`                                                         |
| Prohibido `set:html`, salvo en JSON-LD (con excepción justificada)                                                                                                                 | `astro/no-set-html-directive`      | `npm run lint`                                                         |
| JSON-LD escapado (`<`, `>`, `&`, U+2028, U+2029)                                                                                                                                   | `lib/seo/schema/json-ld.ts`        | Tests con `</script>` malicioso                                        |
| Entradas: longitud máxima 64, 30 dígitos significativos, límites obligatorios por campo, sin exponentes                                                                            | `core/input`, `core/validation`    | Tests unitarios y de propiedades                                       |
| Sin NaN ni infinito en cálculos (`DecimalError` → error de formulario)                                                                                                             | `core/math/decimal.ts`             | Tests                                                                  |
| CSP por página con hashes de los scripts inline de Astro (`script-src 'self' 'sha256-…'`), más `default-src 'self'`, `object-src 'none'`, `base-uri 'self'` y `form-action 'self'` | `astro.config.ts` → `security.csp` | E2E: la isla hidrata sin ninguna `securitypolicyviolation`             |
| `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP` y HSTS (sin `preload`)                                                     | `vercel.json`                      | **NO VERIFICADO — NECESITA PRUEBA** (requiere un despliegue en Vercel) |
| Botón «Calcular» deshabilitado hasta hidratar: sin JavaScript, los datos no pueden acabar en la URL al enviar                                                                      | `CalculatorShell`                  | E2E de privacidad                                                      |
| No se guardan datos: ni localStorage, ni sessionStorage, ni cookies                                                                                                                | Por diseño                         | E2E de privacidad                                                      |
| Ninguna petición a terceros                                                                                                                                                        | Por diseño                         | E2E y `check:dist` (busca scripts de Google, publicidad y analítica)   |
| Enlaces externos de fuentes con `rel="noreferrer"`                                                                                                                                 | `SourceList.astro`                 | Test de componente                                                     |
| Dependencias con versión exacta y lockfile; `npm ci`                                                                                                                               | `.npmrc`, `package-lock.json`      | `npm audit`: 0 vulnerabilidades (29/09/2026)                           |
| Sin scripts de instalación aprobados                                                                                                                                               | npm 11 `allowScripts`              | `npm install`                                                          |

## Pendiente o sin verificar

- **Cabeceras de `vercel.json` en producción: NO VERIFICADO — NECESITA PRUEBA.** Tras el primer despliegue, comprueba las cabeceras con `curl -I` o con las herramientas del navegador.
- **HSTS:** `max-age` de 2 años, **sin** `includeSubDomains` ni `preload`, porque el dominio no está definido y el `preload` es difícil de revertir. Revisar al definir el dominio.
- **CSP y AdSense:** los anuncios exigirán ampliar `script-src`, `frame-src`, `img-src` y `connect-src` a los dominios de Google. **NO VERIFICADO — NECESITA FUENTE** para la lista exacta de dominios.
- **Dependabot o Renovate** y `npm audit` en CI: pendiente de que exista un repositorio remoto y CI.
- **Skills de agentes de IA de terceros** (`.claude/skills`, `.agents`): se ejecutan con permisos completos del agente. No se versionan (`.gitignore`) y deben revisarse antes de usarlos.

## Privacidad

- Sin analítica, seguimiento, cookies ni publicidad.
- Cualquier integración futura requiere antes un módulo de consentimiento (`consentConfig` en `src/config/features.ts`, hoy `cmp: null`). Activar anuncios sin CMP certificada hace fallar el build (ADR 0009, docs/privacidad-y-legal.md).
- Para anuncios personalizados en el EEE y Reino Unido, Google exige una CMP certificada con IAB TCF desde el 16/01/2024 (support.google.com/adsense/answer/13554116, consultado el 29/09/2026).
- Requisitos legales españoles (LSSI-CE, RGPD/LOPDGDD, guía de cookies de la AEPD): **NO VERIFICADO — NECESITA FUENTE** y revisión jurídica.
