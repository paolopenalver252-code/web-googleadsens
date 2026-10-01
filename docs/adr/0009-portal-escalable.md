# ADR 0009 — Arquitectura escalable del portal de calculadoras

- **Estado:** aceptada
- **Fecha:** 2026-10-01 (ampliada el mismo día: anuncios solo en calculadoras publicadas, script global único, filtro del sitemap y guardas de arquitectura)

## Contexto

El sitio debe pasar de 1 calculadora a 10 y después a más de 50, cada una con contenido propio, SEO técnico correcto, enlazado interno y, más adelante, publicidad con AdSense. La primera calculadora (interés compuesto, ADR 0008) demostró el flujo completo, pero sus metadatos SEO estaban escritos a mano en la página, no había categorías y la infraestructura de anuncios solo controlaba la altura reservada. Esta fase consolida lo necesario para que añadir una calculadora sea un proceso predecible, **sin** convertir el sitio en una granja de páginas.

## Decisión

### 1. El registro es la fuente de verdad de cada calculadora

`src/calculators/registry.ts` declara por calculadora: definición (id, slug, versión del motor, `related`), `name`, `heading` (H1), `category`, `seo.title`, `seo.description` y `status`.

- La **página** obtiene title, description, ruta, robots, H1 y migas con `calculatorPageProps('<id>')` (`src/lib/seo/calculator-page.ts`). Un test exige que toda página registrada lo use.
- La **portada** (`CalculatorDirectory`), el **sitemap** (`createSitemapFilter`) y las **calculadoras relacionadas** leen el mismo registro. La URL de una calculadora se construye solo en `calculatorPath()` (`/` + slug).
- Que la portada muestre «Todavía no hay calculadoras publicadas» mientras todas sean borradores es el **comportamiento previsto**: un borrador solo es accesible por su URL directa.
- `validateCalculatorRegistry` comprueba ids, slugs, slugs reservados (incluido `calculadoras`), campos vacíos, categorías desconocidas, **titles y descriptions repetidos** y enlaces de páginas publicadas a borradores.

Separación (sin cambios respecto a ADR 0002): motor y definición puros y probados sin Astro → isla Preact sobre `CalculatorShell` → página Astro sobre `CalculatorLayout`. La página consume la calculadora; no contiene lógica matemática.

### 2. Estados: `draft` y `published`, sin `verified`

| Estado      | Página | robots              | Sitemap | Portada / listados | Destino de enlaces internos | Anuncios |
| ----------- | ------ | ------------------- | ------- | ------------------ | --------------------------- | -------- |
| `draft`     | Sí     | `noindex, nofollow` | No      | No                 | Solo desde otros borradores | No       |
| `published` | Sí     | `index, follow`\*   | Sí      | Sí                 | Sí                          | Sí\*\*   |

\* Solo en el despliegue de producción con dominio definitivo (ADR 0005); en cualquier otro entorno todo es `noindex`. El canonical se construye con `PUBLIC_SITE_URL` y nunca con la URL de un despliegue de Vercel (guarda en `src/architecture.test.ts`). Mientras no se defina, apunta al dominio provisional `example.com` y el sitio no es indexable.

\*\* Si los anuncios están activados globalmente. Todo se deriva de `status`: en `calculatorPageProps` (`noindex`, `monetizable`) y en `createSitemapFilter` (`src/lib/seo/sitemap.ts`). `src/components/publishing-flow.test.ts` registra una segunda calculadora ficticia y comprueba ambos estados sin tocar ninguna pieza global.

No se añade un estado `verified`: la verificación es la Definition of Done (docs/calculator-definition-of-done.md). Pasar a `published` es un cambio explícito en el registro y nunca ocurre por crear archivos.

### 3. Categorías

`src/calculators/categories.ts`. Hoy solo existe **`finanzas`**, porque es la única con una calculadora. Una categoría no se declara sin al menos una calculadora (lo comprueba un test). Sirve para agrupar la portada (`publishedByCategory`, que omite las categorías sin calculadoras publicadas) y para el enlazado interno.

**Las categorías no crean páginas.** No existen `/calculadoras` ni `/calculadoras/<categoría>`. Su ruta queda reservada, y la página se creará solo cuando aporte navegación real: varias calculadoras publicadas en la categoría y una introducción editorial propia. El umbral concreto es una decisión pendiente (ver Consecuencias). Mientras no exista la página, las migas son Inicio → calculadora: una miga siempre enlaza a una URL real.

### 4. URLs

Una intención = una URL canónica: `/calculadora-<tema>`, en minúsculas y sin barra final (ADR 0005). No se crean variantes por keyword («-online», «-gratis», «-españa»), ni rutas anidadas profundas, ni URLs indexables a partir de parámetros. El canonical elimina siempre la query.

### 5. Contenido

Cada calculadora parte de una ficha (`docs/calculators/ficha-plantilla.md`) que fija la intención antes de escribir código. `CalculatorLayout` ofrece huecos flexibles (intro, contenido, metodología, aviso): cada página usa solo las secciones que aportan algo. Cada afirmación técnica se clasifica como **derived-from-engine**, **source-backed** o **editorial-explanation** (Definition of Done §6). No hay CMS: el contenido vive en la página `.astro`, revisado como código.

### 6. Structured data

Sin cambios: solo `BreadcrumbList`, generado de las migas visibles. Evaluado por separado:

- **FAQPage:** descartado (ADR 0005: Google ya no muestra ese resultado enriquecido).
- **WebApplication / SoftwareApplication:** el resultado enriquecido exige `offers` y además `aggregateRating` o `review`, que el sitio no tiene. Sigue como decisión pendiente en ADR 0005, sin uso.
- **WebPage:** solo repetiría el título, la descripción y la URL que ya dan los metadatos; no aporta nada verificable.
- **Organization:** solo cuando exista un titular identificado.

### 7. Publicidad (preparada, desactivada)

- **Posiciones:** solo las de `AdPosition` (`after-result`, `sidebar`, `end-of-content`), ninguna dentro de la calculadora ni entre los campos y el resultado. No se añade una posición entre el contenido y las preguntas frecuentes: el layout no la necesita hoy y cada posición nueva debe justificarse.
- **Móvil:** cada posición declara `mobile`; por defecto `false`, así que en pantallas estrechas no se muestra (`hidden lg:flex`).
- **Requisitos de activación** (`adSlotBlockers`): id de editor, CMP certificada con IAB TCF, id del bloque y altura reservada. Con anuncios activados y cualquiera de ellos sin definir, **el build falla**. No hay ningún id: no se inventan.
- **Etiqueta:** «Anuncios». Las «Políticas sobre el emplazamiento publicitario» de AdSense (https://support.google.com/adsense/answer/1346295, consultado el 01/10/2026) indican que los anuncios solo pueden etiquetarse como «Anuncios» o «Enlaces patrocinados»; antes el sitio usaba «Publicidad». La misma página pide que los anuncios se distingan claramente del contenido y avisa del riesgo de clics accidentales al colocarlos cerca de enlaces o botones.
- **Solo en calculadoras publicadas:** `CalculatorLayout` pasa a `AdSlot` el permiso `monetizable` de `calculatorPageProps` (falso por defecto). Un borrador nunca muestra anuncios.
- **Script global único:** `AdsScript.astro`, incluido una sola vez en `BaseLayout`. Hoy no renderiza nada. Con anuncios activados, el build falla si faltan el id de editor o la CMP, y **también** si está todo, hasta que se implemente ahí la carga (comprobando antes la documentación vigente de Google y ampliando la CSP). Las guardas de `src/architecture.test.ts` impiden referenciar el script de AdSense en cualquier otro archivo y colocar `AdSlot` fuera de `CalculatorLayout`.
- **Huecos descartados por ahora:** `top` y `before-calculator` (anuncios antes de que el usuario identifique la herramienta) y `mid-content` (no hace falta todavía).
- **Anuncios automáticos (Auto ads):** decisión pendiente. Colocan anuncios en posiciones que el sitio no controla y pueden saltarse estas reglas (entre secciones del contenido, en móvil). Recomendación: solo anuncios manuales.
- **Configuración:** centralizada en `src/config/features.ts` y revisada como código, no en variables de entorno: un cambio de entorno no puede activar anuncios sin pasar por las comprobaciones del build.
- **Independencia:** `AdSlot` nunca carga scripts. La calculadora funciona igual si el anuncio tarda, falla, no hay consentimiento o el navegador lo bloquea, porque no depende de él.
- **Consentimiento:** `CmpIntegration` solo admite una CMP con `googleCertified: true` e `iabTcf: true` (requisito verificado; docs/privacidad-y-legal.md). No se implementa ninguna CMP ni ningún banner propio.

### 8. Analítica

No se implementa ninguna capa de eventos: hoy no tendría consumidor y sería código muerto. Cuando se integre GA4 (después de la CMP), los eventos (`calculator_view`, `calculator_submit`, `calculator_error`, `calculator_result`) se emitirán desde `CalculatorShell` mediante una función inyectada, sin enviar nunca los valores introducidos.

### 9. Search Console

No hace falta código. `check:dist` comprueba ahora además que el canonical de cada HTML apunta a su propia ruta, que todo enlace interno apunta a algo que existe en el build y que el sitemap solo enumera páginas que existen. La verificación de la propiedad (preferiblemente por DNS) y el envío del sitemap se harán cuando exista el dominio.

## Alternativas

- **Ruta dinámica `[slug].astro`:** descartada en ADR 0002 (hidratación de islas y code splitting). Se mantiene una página fina por calculadora.
- **CMS o colección de contenido:** innecesario para decenas de páginas revisadas como código. Duplicaría el esquema fuera del typecheck.
- **Crear ya `/calculadoras` y las categorías:** con una sola calculadora en borrador serían páginas vacías o casi vacías.
- **Estado `verified`:** añade un estado sin efecto distinto de `draft`. La lista de verificación cumple esa función.

## Motivo

Cada dato de una calculadora se escribe una vez y todo lo demás (página, portada, sitemap, migas, enlaces) se deriva de él, con comprobaciones automáticas que impiden los errores típicos al escalar: metadatos duplicados, borradores indexables, categorías vacías, enlaces rotos y anuncios activados a medias.

## Consecuencias

- **Añadir una calculadora:** ficha → motor, definición, tipos y constantes → tests → isla y textos → página sobre `CalculatorLayout` con `calculatorPageProps` → fuentes → entrada `draft` en el registro → Definition of Done → `published`. Se reutilizan el shell, los validadores, el layout, el SEO, las migas, la metodología, las fuentes, el aviso, `DataTable` y la infraestructura de tests.
- **Decisiones pendientes:** dominio definitivo (`PUBLIC_SITE_URL`); umbral para crear páginas de categoría y `/calculadoras`; qué posiciones de anuncio se activan y si alguna se muestra en móvil; anuncios automáticos sí o no; CMP concreta. Todas antes de activar AdSense.
