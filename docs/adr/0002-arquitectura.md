# ADR 0002 — Arquitectura por capas

- **Estado:** aceptada
- **Fecha:** 2026-09-29

## Contexto

Habrá muchas calculadoras (interés compuesto, IVA, préstamos, hipoteca, sueldo neto, IRPF…). Algunas dependerán de normativa que cambia cada año. Una fórmula nunca debe quedar escondida en un componente visual, y añadir una calculadora no debe obligar a duplicar infraestructura.

## Decisión

### Capas

```
UI (Astro estático + isla Preact)        src/components, src/layouts, src/pages, calculators/*/ui
  ↓
VALIDACIÓN  (RAW → PARSE → VALIDATION)    src/core/input, src/core/validation, calculators/*/validation
  ↓
MOTOR (puro, determinista)                calculators/*/engine  (usa core/math/decimal)
  ↓
REGLAS versionadas                        calculators/*/rules/<jurisdicción>/<validFrom>.ts
  ↓
FUENTES                                   src/sources/registry.ts (tipos en core/sources)
  ↓
TESTS                                     *.test.ts junto al módulo; tests/e2e, tests/a11y
```

**Capas puras:** `src/core`, `src/i18n`, `src/sources` y `src/calculators` (salvo `ui/`). No pueden depender de Astro, Preact, componentes ni APIs del navegador. Hay dos barreras complementarias:

1. `tsconfig.core.json` compila esas capas con `lib: ["ES2023"]` y `types: []`, es decir, sin DOM ni Node. Usar `window`, `document`, `URL` o `process` es un error de compilación.
2. ESLint prohíbe en esas capas importar `preact`, `astro`, `astro:*`, `*.astro` y `@/components`, y usar `window`, `document`, `localStorage` o `fetch`. **Esta barrera es necesaria:** importar `preact` añade los tipos del DOM al programa, así que la primera barrera no detectaría ese caso. Comprobado empíricamente.

### Contrato de calculadora

Cada calculadora exporta un `CalculatorDefinition` (`src/core/calculator/definition.ts`), validado y congelado por `defineCalculator` al cargar el módulo:

- `fields`: especificación de cada campo (unidad, obligatorio, **límites mínimo y máximo obligatorios**, decimales).
- `toInput(fields, context)`: reglas entre campos y resolución de las reglas vigentes. El "hoy" llega en `context`; el motor nunca consulta la fecha.
- `compute(input)`: motor puro.
- `rounding`: política de redondeo (ADR 0007).
- `id`, `slug`, `version` (SemVer del motor) y `related` (enlaces internos explícitos).

La UI común (`CalculatorShell`) hace el parseo, la validación, el resumen de errores, los anuncios accesibles y la zona de resultado. Cada calculadora solo aporta su definición, las etiquetas y cómo presentar el resultado (`calculators/<id>/ui/`). **Las islas no reciben funciones como props:** cada calculadora tiene su propia isla, que importa su definición en el cliente.

### Reglas versionadas

`defineRuleSet` crea conjuntos **inmutables** con `validFrom`/`validTo` (días de calendario, ambos inclusivos), `jurisdiction` (ISO 3166), `sources` y `status`. `resolveRules(sets, { date, jurisdiction })` devuelve un único conjunto vigente o un error explícito: `no_rules_for_date`, `ambiguous_rules` o `unverified_rules`. Nunca devuelve un valor por defecto. Una norma nueva es un archivo nuevo, así que los años anteriores siguen siendo reproducibles. `validateRuleSets` detecta ids duplicados y vigencias solapadas.

### UX de cálculo (decisión aprobada)

1. El primer cálculo solo se lanza con «Calcular» (o Enter).
2. Después, la vista se refresca con retardo (600 ms) cuando los valores son válidos.
3. Solo se anuncia (`role="status"`) al calcular o al confirmar un campo, nunca mientras se escribe.
4. Mientras se escribe no aparecen errores nuevos. Un error visible desaparece en cuanto se corrige.

### Publicidad (preparada, desactivada)

`AdSlot` solo admite las posiciones `after-result`, `sidebar` y `end-of-content`. No hay forma de colocar un anuncio dentro del formulario ni entre los campos y el resultado. Está desactivado (`adsConfig.enabled = false`), no carga ningún script, y falla el build si se activa sin altura reservada definida (evita CLS).

## Alternativas

- **Fórmulas dentro de los componentes:** descartado; es justo lo que se quiere evitar.
- **Ruta dinámica `[slug].astro` para todas las calculadoras:** obligaría a resolver en tiempo de ejecución qué isla hidratar y complica el code splitting. Se usa una página fina por calculadora (unas 15 líneas sobre `CalculatorLayout`).
- **Reglas en carpetas por año (`rules/2026/`):** no cubre cambios a mitad de año. Se versiona por fecha de vigencia.

## Motivo

La separación hace que la lógica sea verificable con tests unitarios sin navegador y que la UI sea reemplazable. Además, las fronteras no dependen solo de la disciplina: el compilador y el linter las comprueban.

## Consecuencias

- Una calculadora nueva son unos pocos archivos en `src/calculators/<id>/`, más su página y su entrada en el registro.
- La lógica de "hoy" usa la zona horaria del locale (`Europe/Madrid`). **Limitación conocida:** Canarias (`Atlantic/Canary`) vería un cambio normativo una hora antes. Si una calculadora depende de ello, debe resolverlo con la jurisdicción `ES-CN`.
- La posición de anuncio `sidebar` requerirá una maquetación a dos columnas cuando se activen los anuncios.
