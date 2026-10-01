# Definition of Done de una calculadora

Una calculadora **no está terminada** porque se vea bien o porque funcione en un par de casos. Solo puede pasar a `status: 'published'` en `src/calculators/registry.ts` cuando cumple **todo** lo siguiente. Publicar es siempre un cambio explícito en el registro, nunca una consecuencia de crear archivos (ADR 0009).

Flujo: **desarrollo → `draft` → verificación con esta lista → `published`**. No existe un estado `verified`: la verificación es esta lista, completa.

Antes de escribir código, rellena la ficha de la calculadora a partir de [docs/calculators/ficha-plantilla.md](calculators/ficha-plantilla.md).

## 0. Intención

- [ ] Hay una ficha en `docs/calculators/` con una intención de búsqueda real: qué quiere calcular el usuario, qué datos tiene, qué espera obtener y qué dudas tendrá después.
- [ ] No hay ya otra URL del sitio que responda a la misma intención (una intención = una URL canónica). No se crean variantes por keyword («…-online», «…-gratis»…).

## 1. Fuentes y datos

- [ ] Cada fórmula, constante y regla tiene al menos una fuente en `src/sources/registry.ts`, con `supports` indicando qué respalda exactamente.
- [ ] Las reglas normativas tienen al menos una fuente `official`.
- [ ] Todas las fuentes están `verified`: alguien abrió la URL y anotó `accessedAt`, `reviewedAt` y `notes`.
- [ ] No hay datos inventados. Lo que falte figura como "NO VERIFICADO — NECESITA FUENTE" y **bloquea la publicación**.
- [ ] Si depende de normativa: hay conjuntos de reglas por vigencia (`defineRuleSet`), sin solapes (`validateRuleSets`), y el ejercicio anterior sigue disponible.

## 2. Lógica (tests unitarios)

- [ ] El motor (`engine.ts`) es puro: no usa DOM, fecha actual ni `number` para importes.
- [ ] Hay tests de casos normales, límites (mínimo y máximo de cada campo) y casos degenerados (tipo 0 %, plazo mínimo…).
- [ ] Hay tests de propiedades (fast-check) para las invariantes que la fórmula justifique.
- [ ] Hay tests de regresión con **resultados esperados de procedencia documentada**: cálculo manual, ejemplo oficial o simulador oficial. **Nunca** con valores generados por el propio motor.
- [ ] La cobertura de `src/core` y del motor cumple los umbrales de `vitest.config.ts`.

## 3. Validación (tests unitarios)

- [ ] Cada campo tiene límites mínimo y máximo justificados, y decimales máximos.
- [ ] Hay tests de cada error de campo y de las reglas entre campos (`toInput`), con mensajes propios en español.
- [ ] Se han probado las entradas en formato español y los casos ambiguos (ADR 0004).

## 4. Redondeo

- [ ] La política de redondeo está declarada. Si hay redondeo intermedio, está justificado con una fuente (ADR 0007).
- [ ] Todo texto visible sale del formateador de la calculadora (`format-result.ts` o equivalente). Tablas y gráficos consumen la salida del motor, sin un segundo cálculo (ADR 0008).

## 5. UI y accesibilidad

- [ ] La calculadora usa `CalculatorShell` y sus componentes, sin lógica matemática en la UI.
- [ ] Los tests de componente pasan: etiquetas, errores, resumen de errores y anuncio del resultado.
- [ ] axe no detecta violaciones en navegador real, en tema claro y oscuro, en estado inicial, con errores y con resultado.
- [ ] Hay E2E en navegador real: flujo completo, sin desbordamiento horizontal (320, 390, 768 y 1280 px como mínimo) y objetivos táctiles de al menos 44 × 44 px.
- [ ] **Revisión manual:** uso completo solo con teclado y con lector de pantalla (NVDA en Windows; VoiceOver si es posible), foco visible, zoom al 200 % y ancho de 320 px.
- [ ] Todo gráfico tiene una alternativa en tabla (`DataTable`) y una explicación en texto.

## 6. Contenido

- [ ] Introducción que dice qué calcula, para quién sirve y qué resultado da.
- [ ] Solo las secciones que aportan algo a esta calculadora (explicación, cómo usarla, interpretación, ejemplo práctico, supuestos, limitaciones, preguntas frecuentes). Ninguna sección de relleno.
- [ ] Ejemplos numéricos reproducibles y comprobados por un test.
- [ ] Metodología que describe exactamente el motor, con sus fuentes.
- [ ] Cada afirmación técnica es de uno de estos tipos, sin mezclarlos:
  - **derived-from-engine:** describe el comportamiento del motor y un test lo respalda;
  - **source-backed:** la respalda una fuente `verified` del registro;
  - **editorial-explanation:** explicación conceptual, sin cifras ni reglas que dependan de una fuente.
- [ ] Calculadoras financieras: lenguaje descriptivo («con los valores introducidos, el modelo calcula…»). Nada de recomendaciones, garantías ni rentabilidades aseguradas.
- [ ] Aviso (`Disclaimer`) redactado y **revisado**. Nunca el placeholder.

## 7. SEO

- [ ] Entrada del registro con `name`, `heading` (H1), `category`, `seo.title` y `seo.description` propios. Title y description únicos en el sitio (lo comprueba `validateCalculatorRegistry`).
- [ ] La página usa `calculatorPageProps('<id>')`: canonical, robots, Open Graph y migas salen del registro (lo comprueba `registry.test.ts`).
- [ ] Un solo H1 y jerarquía de encabezados sin saltos (test E2E).
- [ ] Al publicar: `index, follow` en el despliegue de producción y presencia en el sitemap; en borrador, `noindex` y fuera del sitemap (automático según `status`).
- [ ] Solo structured data que corresponda a contenido visible y cumpla las directrices vigentes de Google (hoy, solo BreadcrumbList; ADR 0005).
- [ ] Enlaces internos: `related` solo con calculadoras relevantes y publicadas. Nunca enlaces a páginas inexistentes ni bloques automáticos de enlaces.

## 8. Rendimiento y seguridad

- [ ] `npm run verify` pasa completo, incluidos `check:dist` y los presupuestos de `performance-budget.json`.
- [ ] Una sola isla por página. Lo secundario (gráficos) se carga de forma diferida.
- [ ] Sin imágenes ni fuentes externas que penalicen el LCP. Sin desplazamientos de maquetación (CLS) al mostrar el resultado. Sin trabajo largo en cada pulsación (INP).
- [ ] No hay peticiones a terceros ni se guardan datos del usuario (test E2E de privacidad).

## 9. Preparación para AdSense (cuando se activen los anuncios)

- [ ] La página es útil y completa sin anuncios: el contenido se sostiene por sí mismo.
- [ ] Los anuncios solo van en las posiciones de `AdPosition` (nunca en el formulario, entre campos y resultado, junto a botones ni entre una pregunta y su respuesta).
- [ ] Cada espacio activado tiene altura reservada (sin CLS) e id de bloque real; el build falla si no (`adSlotBlockers`).
- [ ] El script de AdSense solo se carga desde `AdsScript.astro` (una vez, en `BaseLayout`) y los anuncios solo aparecen en calculadoras `published` (`monetizable`, automático). Lo vigilan `src/architecture.test.ts` y `publishing-flow.test.ts`.
- [ ] La calculadora funciona igual si el anuncio tarda, falla, no hay consentimiento o el navegador lo bloquea.
- [ ] Existen las páginas legales y la CMP certificada (docs/privacidad-y-legal.md).

## 10. Registro

- [ ] Entrada en `src/calculators/registry.ts` y página en `src/pages/<slug>.astro`.
- [ ] `version` SemVer del motor y registro de cambios si se modifica una fórmula.
