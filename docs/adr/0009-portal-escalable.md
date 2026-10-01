# ADR 0009 — Arquitectura escalable del portal de calculadoras

- **Estado:** aceptada
- **Fecha:** 2026-10-01

## Contexto

El sitio debe pasar de 1 calculadora a 10 y después a más de 50, cada una con contenido propio, SEO técnico correcto, enlazado interno y, más adelante, publicidad con AdSense. La primera calculadora (interés compuesto, ADR 0008) demostró el flujo completo, pero sus metadatos SEO estaban escritos a mano en la página, no había categorías y la infraestructura de anuncios solo controlaba la altura reservada. Esta fase consolida lo necesario para que añadir una calculadora sea un proceso predecible, **sin** convertir el sitio en una granja de páginas.

## Decisión

### 1. El registro es la fuente de verdad de cada calculadora

`src/calculators/registry.ts` declara por calculadora: definición (id, slug, versión del motor, `related`), `name`, `heading` (H1), `category`, `seo.title`, `seo.description` y `status`.

- La **página** obtiene title, description, ruta, robots, H1 y migas con `calculatorPageProps('<id>')` (`src/lib/seo/calculator-page.ts`). Un test exige que toda página registrada lo use.
- La **portada**, el **sitemap** (`unpublishedCalculatorPaths`) y las **calculadoras relacionadas** leen el mismo registro.
- `validateCalculatorRegistry` comprueba ids, slugs, slugs reservados (incluido `calculadoras`), campos vacíos, categorías desconocidas, **titles y descriptions repetidos** y enlaces de páginas publicadas a borradores.

Separación (sin cambios respecto a ADR 0002): motor y definición puros y probados sin Astro → isla Preact sobre `CalculatorShell` → página Astro sobre `CalculatorLayout`. La página consume la calculadora; no contiene lógica matemática.

### 2. Estados: `draft` y `published`, sin `verified`

| Estado      | Página | robots              | Sitemap | Portada / listados | Destino de enlaces internos |
| ----------- | ------ | ------------------- | ------- | ------------------ | --------------------------- |
| `draft`     | Sí     | `noindex, nofollow` | No      | No                 | Solo desde otros borradores |
| `published` | Sí     | `index, follow`\*   | Sí      | Sí                 | Sí                          |

\* Solo en el despliegue de producción con dominio definitivo (ADR 0005); en cualquier otro entorno todo es `noindex`.

No se añade un estado `verified`: la verificación es la Definition of Done (docs/calculator-definition-of-done.md). Pasar a `published` es un cambio explícito en el registro y nunca ocurre por crear archivos.

### 3. Categorías

`src/calculators/categories.ts`. Hoy solo existe **`finanzas`**, porque es la única con una calculadora. Una categoría no se declara sin al menos una calculadora (lo comprueba un test). Sirve para agrupar la portada (`publishedByCategory`, que omite las categorías sin calculadoras publicadas) y para el enlazado interno.

**Las categorías no crean páginas.** No existen `/calculadoras` ni `/calculadoras/<categoría>`. Su ruta queda reservada, y la página se creará solo cuando aporte navegación real: varias calculadoras publicadas en la categoría y una introducción editorial propia. El umbral concreto es una decisión pendiente (ver Consecuencias). Mientras no exista la página, las migas son Inicio → calculadora: una miga siempre enlaza a una URL real.

### 4. URLs

Una intención = una URL canónica: `/calculadora-<tema>`, en minúsculas y sin barra final (ADR 0005). No se crean variantes por keyword («-online», «-gratis», «-españa»), ni rutas anidadas profundas, ni URLs indexables a partir de parámetros. El canonical elimina siempre la query.

### 5. Contenido

Cada calculadora parte de una ficha (`docs/calculators/ficha-plantilla.md`) que fija la intención antes de escribir código. `CalculatorLayout` ofrece huecos flexibles (intro, contenido, metodología, aviso): cada página usa solo las secciones que aportan algo. Cada afirmación técnica se clasifica como **derived-from-engine**, **source-backed** o **editorial-explanation** (Definition of Done §6). No hay CMS: el contenido vive en la página `.astro`, revisado como código.

### 6. Structured data

Sin cambios: solo `BreadcrumbList`, generado de las migas visibles. FAQPage, WebApplication, WebPage, SoftwareApplication y Organization no se añaden mientras no haya una justificación compatible con el contenido real (ADR 0005).

### 7. Publicidad (preparada, desactivada)

- **Posiciones:** solo las de `AdPosition` (`after-result`, `sidebar`, `end-of-content`), ninguna dentro de la calculadora ni entre los campos y el resultado. No se añade una posición entre el contenido y las preguntas frecuentes: el layout no la necesita hoy y cada posición nueva debe justificarse.
- **Móvil:** cada posición declara `mobile`; por defecto `false`, así que en pantallas estrechas no se muestra (`hidden lg:flex`).
- **Requisitos de activación** (`adSlotBlockers`): id de editor, CMP certificada con IAB TCF, id del bloque y altura reservada. Con anuncios activados y cualquiera de ellos sin definir, **el build falla**. No hay ningún id: no se inventan.
- **Etiqueta:** «Anuncios». Las «Políticas sobre el emplazamiento publicitario» de AdSense (https://support.google.com/adsense/answer/1346295, consultado el 01/10/2026) indican que los anuncios solo pueden etiquetarse como «Anuncios» o «Enlaces patrocinados»; antes el sitio usaba «Publicidad». La misma página pide que los anuncios se distingan claramente del contenido y avisa del riesgo de clics accidentales al colocarlos cerca de enlaces o botones.
- **Independencia:** `AdSlot` nunca carga scripts. La carga de AdSense será una pieza aparte, condicionada al consentimiento. La calculadora funciona igual si el anuncio tarda, falla, no hay consentimiento o el navegador lo bloquea, porque no depende de él.
- **Consentimiento:** `CmpIntegration` solo admite una CMP con `googleCertified: true` e `iabTcf: true` (requisito verificado; docs/privacidad-y-legal.md). No se implementa ninguna CMP ni ningún banner propio.

### 8. Search Console

No hace falta código. `check:dist` comprueba ahora además que el canonical de cada HTML apunta a su propia ruta y que el sitemap solo enumera páginas que existen. La verificación de la propiedad (preferiblemente por DNS) y el envío del sitemap se harán cuando exista el dominio.

## Alternativas

- **Ruta dinámica `[slug].astro`:** descartada en ADR 0002 (hidratación de islas y code splitting). Se mantiene una página fina por calculadora.
- **CMS o colección de contenido:** innecesario para decenas de páginas revisadas como código. Duplicaría el esquema fuera del typecheck.
- **Crear ya `/calculadoras` y las categorías:** con una sola calculadora en borrador serían páginas vacías o casi vacías.
- **Estado `verified`:** añade un estado sin efecto distinto de `draft`. La lista de verificación cumple esa función.

## Motivo

Cada dato de una calculadora se escribe una vez y todo lo demás (página, portada, sitemap, migas, enlaces) se deriva de él, con comprobaciones automáticas que impiden los errores típicos al escalar: metadatos duplicados, borradores indexables, categorías vacías, enlaces rotos y anuncios activados a medias.

## Consecuencias

- **Añadir una calculadora:** ficha → motor, definición, tipos y constantes → tests → isla y textos → página sobre `CalculatorLayout` con `calculatorPageProps` → fuentes → entrada `draft` en el registro → Definition of Done → `published`. Se reutilizan el shell, los validadores, el layout, el SEO, las migas, la metodología, las fuentes, el aviso, `DataTable` y la infraestructura de tests.
- **Decisiones pendientes:** umbral para crear páginas de categoría y `/calculadoras`; qué posiciones de anuncio se activan y si alguna se muestra en móvil; CMP concreta. Todas antes de activar AdSense.
