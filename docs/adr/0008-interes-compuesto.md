# ADR 0008 — Calculadora de interés compuesto: convenciones y página

- **Estado:** aceptada
- **Fecha:** 2026-09-30

## Contexto

La calculadora de interés compuesto es la primera del sitio. Su motor, su validación y su UI ya estaban implementados y probados (especificación "Mathematical Closure"). En esta fase se crea su página de producción (`/calculadora-interes-compuesto`) con gráfico, tabla anual, contenido, metodología y SEO. Hay que dejar por escrito las convenciones del cálculo para que el contenido, los tests y las calculadoras futuras no las contradigan, y la forma en que la presentación consume el resultado.

## Decisión

### Convenciones del cálculo (comportamiento existente, sin cambios)

| Convención                             | Detalle                                                                                                                                                                                                                                                                  | Dónde                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **Frecuencia única**                   | La misma frecuencia rige la capitalización y la aportación: anual (m = 1), semestral (2), trimestral (4) o mensual (12). No hay semanal ni diaria: no encajan en una duración en meses enteros                                                                           | `constants.ts` → `FREQUENCIES`, `types.ts`   |
| **Frecuencia siempre visible**         | El campo es obligatorio y se muestra siempre, sin valor preseleccionado, aunque no haya aportaciones: también determina la capitalización                                                                                                                                | `definition.ts`, `copy.es-ES.ts`             |
| **Momento de la aportación visible**   | El campo (inicio / final) se muestra siempre, sin valor preseleccionado                                                                                                                                                                                                  | `definition.ts`                              |
| **Obligación condicional del momento** | El campo es opcional, pero con aportación > 0 es obligatorio (`compound-interest.timing_required`). Una aportación vacía o de 0 se representa como `contribution: null`                                                                                                  | `definition.ts` → `toCompoundInterestInput`  |
| **Duración compatible**                | La duración en meses M debe ser múltiplo de 12/m y como mucho 1.200 meses; n = M · m / 12 es siempre entero                                                                                                                                                              | `definition.ts`, `engine.ts` → `periodCount` |
| **Conversión de tipos**                | TIN r → i = r/m. Tipo efectivo anual X → i = (1 + X)^(1/m) − 1 (nunca X/m). Equivalente mostrado: (1 + i)^m − 1                                                                                                                                                          | `rates.ts`                                   |
| **Tratamiento del 0 %**                | Con i = 0, s(n\|i) = n: rama propia, nunca se divide entre cero. El valor final es P + n · C                                                                                                                                                                             | `engine.ts` → `annuityFactor`                |
| **Límite operativo de 10¹⁵ €**         | Si el valor final supera 10¹⁵ € se devuelve el error de formulario `compound-interest.result_too_large`. Es una decisión de producto sobre el rango que se muestra, no una limitación del adaptador decimal                                                              | `constants.ts` → `MAX_FINAL_VALUE`           |
| **Cálculo cerrado de saldos**          | Todo saldo (valor final y cada fila anual) se obtiene con la fórmula cerrada para los periodos transcurridos, no acumulando periodo a periodo. Por eso la última fila coincide exactamente con el valor final                                                            | `engine.ts` → `balanceAfter`                 |
| **"Tipo efectivo anual equivalente"**  | Es el nombre de la métrica en toda la interfaz y el contenido. **No se llama TAE**: el cálculo no incluye comisiones ni otros gastos, así que no es una TAE regulatoria. "TAE / tipo efectivo anual" solo aparece como etiqueta de la opción de entrada del tipo de tasa | `copy.es-ES.ts`, `types.ts`                  |

### Separación entre cálculo y presentación

```
definition (validación) → engine (Decimal, precisión completa) → output
  output → format-result.ts   → textos del resultado y filas de la tabla (ÚNICO redondeo)
  output → chart-data.ts      → geometría del gráfico (toNumberLossy) + textos de format-result
```

1. **Redondeo solo en la presentación.** El motor no redondea (`rounding.intermediate: 'none'`). Todo texto visible sale de `format-result.ts` con la política de la definición (2 decimales, `halfExpand`, ADR 0007). No se usa `toFixed` ni `Intl` para redondear.
2. **Tabla y gráfico son consumidores del resultado del motor.** La tabla formatea `output.years` fila a fila. El gráfico dibuja un punto inicial (saldo = capital inicial) más un punto por fila de `output.years`. Ninguno recalcula intereses, saldos ni tipos.
3. **Geometría con `toNumberLossy()`.** El adaptador lo permite solo para gráficos (ADR 0003): la posición en píxeles puede ser aproximada; las cifras que se leen, nunca. Las marcas del eje vertical (1, 2 o 5 × 10^k) se calculan con `Decimal`, así que su etiqueta es exacta.
4. **Tramos parciales.** Si la duración no es un número entero de años, el motor devuelve un último tramo con menos de 12 meses. La tabla lo etiqueta por sus meses («Meses 25–30»; «Mes 1» / «Meses 1–6» si no llega a un año). No se inventan años.

### Gráfico

- **SVG propio, sin librería.** Un gráfico de áreas de dos series (capital aportado y saldo) no justifica una dependencia. Medido: 1,6 kB gz, **cargado de forma diferida** con `import()` tras el primer resultado (docs/performance.md). Si la descarga falla, se muestra un aviso en texto y la tabla sigue disponible.
- **Accesibilidad:** el dibujo es `aria-hidden`. La información está en texto: la explicación del resultado («Al cabo de 3 años, el valor final estimado es…») y la tabla anual (`DataTable`, la alternativa accesible prevista para todo gráfico). El contenedor es un `role="slider"` que recorre los periodos con las flechas, Inicio y Fin; su `aria-valuetext` es la descripción del punto, la misma que muestra el panel de detalle visible. También responde al ratón y al tacto (`touch-action: pan-y`, no bloquea el desplazamiento vertical).
- **CSP y temas:** sin estilos inline; solo atributos SVG y clases con los tokens del tema (claro y oscuro). Sin animaciones.
- **Responsive:** ancho por CSS (`w-full`) y `viewBox` con el ancho medido (`ResizeObserver`), de modo que 1 unidad = 1 px y el texto no se deforma.

### Página

- `src/pages/calculadora-interes-compuesto.astro` sobre `CalculatorLayout`, con su orden fijo (ADR 0005): migas → H1 + intro → isla → contenido → metodología → fuentes → aviso. "Supuestos y limitaciones" y "Preguntas frecuentes" van al final del contenido, antes de la metodología, porque el layout no admite contenido entre metodología y fuentes; no se ha cambiado la plantilla común.
- Migas: Inicio → Calculadora de interés compuesto. No existe una ruta `/calculadoras`, así que no se enlaza.
- **Structured data:** solo el `BreadcrumbList` que ya genera `Breadcrumbs.astro`. Sin FAQPage (ADR 0005: Google no muestra ese rich result desde el 15/06/2026), sin WebApplication (decisión pendiente en ADR 0005) y sin WebPage (no aporta nada verificable que no esté ya en los metadatos).
- **Borrador:** registrada como `draft`. Mientras lo sea, la página se marca `noindex` (derivado del registro, no escrito a mano), no aparece en la portada y `astro.config.ts` la excluye del sitemap (`unpublishedCalculatorPaths`).

### Fuentes

El registro de fuentes sigue **vacío**. Los fixtures de regresión citan cuatro ids **candidatos** (`fpt-interes-simple-compuesto-2023`, `openstax-contemporary-math-6-4`, `uc3m-ocw-mf-tema6-rentas`, `openstax-principles-finance-8-2`) con su URL, procedentes del informe de investigación. **Ninguno está verificado:** docs/sources-policy.md exige que una persona abra la URL, compruebe exactamente lo que respalda y anote título, organismo y fechas. No se registran como `unverified` porque faltan datos que solo da esa comprobación (título exacto y organismo), y registrarlos con datos supuestos sería inventarlos. La página muestra «NO VERIFICADO — NECESITA FUENTE» en la sección de fuentes, y la calculadora no puede pasar a `published` hasta que esto se resuelva (`publicationBlockers`).

## Alternativas

- **Librería de gráficos** (Chart.js, uPlot, Recharts…): decenas de kB para dos series, y varias usan `<canvas>` sin alternativa accesible o estilos inline que chocan con la CSP.
- **Calcular la tabla o el gráfico en la UI:** descartado. Una segunda fórmula puede divergir del motor en un céntimo y romper la garantía de que la última fila es el valor final.
- **Segunda isla para el gráfico:** docs/performance.md exige una sola isla por página. El gráfico vive dentro del resultado de la isla existente.
- **Tabla desplegable (`<details>`):** descartada; la tabla es la alternativa accesible del gráfico y debe estar a la vista.

## Motivo

Una única fuente de verdad (el motor) y un único punto de redondeo (`format-result.ts`) hacen imposible que el resultado, la tabla, el gráfico y el texto muestren cifras distintas. Las convenciones escritas aquí son las que describen la metodología y las preguntas frecuentes de la página.

## Consecuencias

- Cambiar una convención de esta tabla es cambiar el motor o la validación: exige subir `ENGINE_VERSION`, revisar las regresiones y actualizar la metodología de la página.
- **Pendiente para publicar:** verificar y registrar fuentes, revisión legal del aviso y revisión manual con lector de pantalla y zoom al 200 % (docs/calculator-definition-of-done.md).
