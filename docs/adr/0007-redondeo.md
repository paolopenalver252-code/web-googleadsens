# ADR 0007 — Redondeo

- **Estado:** aceptada. La decisión pendiente #7 (modo de presentación por defecto) se cerró el 2026-09-30: `halfExpand` con 2 decimales.
- **Fecha:** 2026-09-29 (actualizada el 2026-09-30)

## Contexto

El redondeo monetario debe producirse al mostrar el resultado, no durante los cálculos internos, salvo que una fórmula concreta exija otro tratamiento. `Intl.NumberFormat` redondea por su cuenta y, con `number`, arrastra la representación binaria.

## Decisión

1. **Durante el cálculo no se redondea** (`rounding.intermediate: 'none'`). El motor trabaja con 40 dígitos significativos (ADR 0003).
2. **Excepción justificada:** si una norma exige redondear en cada periodo (p. ej. la cuota mensual de un préstamo), la calculadora lo declara en `rounding.intermediate` con una descripción y las fuentes que lo respaldan. En cada caso concreto: **NO VERIFICADO — NECESITA FUENTE**.
3. **Al presentar**, el redondeo lo hace **siempre el adaptador Decimal** (`value.round(dp, mode)`) con el modo declarado en la política (`rounding.display.currency | percent | number`). `Intl.NumberFormat` recibe después un **texto decimal exacto** con exactamente `dp` decimales, así que solo localiza y no redondea.
4. **Modos** con los nombres de `Intl`: `halfExpand`, `halfEven`, `trunc`, `expand`, `floor` y `ceil`.
5. **Por defecto** (`DEFAULT_ROUNDING_POLICY`): 2 decimales en `halfExpand` (0,005 → 0,01; la mitad se aleja de cero) para moneda, porcentaje y número. Cada calculadora puede declarar su propia política.
6. **Porcentajes:** el formateador recibe un **ratio** (0,0525), como `Intl`, y redondea sobre los puntos porcentuales que ve el usuario. Los campos de porcentaje reciben **puntos** ("5,25"), y la conversión es explícita (`percentPointsToRatio`).
7. `useGrouping: 'always'` es obligatorio: sin esta opción, `Intl` formatea 1234,56 como "1234,56 €" en es-ES (verificado en Node 24).

### Cierre de la decisión #7 (2026-09-30)

Se confirma `halfExpand` con 2 decimales como modo de presentación por defecto. Documenta lo que ya está implementado; no cambia ningún comportamiento:

- `DEFAULT_ROUNDING_POLICY` (`src/core/calculator/definition.ts`) y la política que declara explícitamente la calculadora de interés compuesto (`src/calculators/compound-interest/definition.ts`) usan `halfExpand` y 2 decimales en moneda, porcentaje y número.
- Está fijado por tests con puntos medios exactos: 1.157,625 → **1.157,63 €**, no 1.157,62 € como daría `halfEven` (fixture F1, `format-result.test.ts`).
- **Motivo:** es el redondeo aritmético que espera un usuario al leer un importe (la mitad sube), y solo afecta a la presentación: el cálculo no redondea, así que no hay sesgo acumulado que justifique `halfEven`.
- **Alcance:** es una convención de presentación del producto, **no una norma**. Una calculadora que dependa de un redondeo normativo (p. ej. una cuota o un impuesto) debe declarar su propio modo con la fuente que lo respalde (punto 2).

## Alternativas

- **Redondear con `Intl` (`roundingMode`):** depende del soporte del navegador (Intl.NumberFormat v3) y, con `number`, de la representación binaria. Además, dejaría dos fuentes de verdad.
- **Redondear en cada operación:** acumula errores de redondeo que la norma no pide.

## Motivo

Hay una sola implementación del redondeo, exacta, probada e independiente del navegador.

## Consecuencias

- En navegadores sin soporte de `useGrouping: 'always'` (anteriores a Intl.NumberFormat v3), el separador de miles podría no mostrarse en números de 4 cifras. El valor seguiría siendo correcto. Navegadores objetivo: **PENDIENTE DE DEFINIR**.
- Un valor que redondea a cero se muestra como "0,00 €", nunca "-0,00 €".
