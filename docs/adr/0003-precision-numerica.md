# ADR 0003 — Precisión numérica

- **Estado:** aceptada
- **Fecha:** 2026-09-29

## Contexto

Las calculadoras son financieras. En coma flotante binaria, `0.1 + 0.2 = 0.30000000000000004` (comprobado en Node 24). Los errores se acumulan en procesos iterativos (cuadros de amortización, búsqueda numérica de un tipo) y dificultan las comparaciones exactas en los tests. El proyecto no tenía ninguna solución previa.

## Decisión

Se usa **decimal.js 10.6.0 (MIT) aislado tras un adaptador**: `src/core/math/decimal.ts`.

- **Aislamiento:** es el único archivo que puede importar `decimal.js` (regla `no-restricted-imports` de ESLint). El resto usa la clase `Decimal` del adaptador, inmutable y con API cerrada.
- **Instancia propia:** `DecimalJs.clone(...)`. La configuración global de la librería nunca se modifica.
- **Precisión:** 40 dígitos significativos por operación. La entrada del usuario se limita a 30 dígitos significativos.
- **Redondeo interno:** `ROUND_HALF_EVEN`. Solo actúa si un resultado supera los 40 dígitos (p. ej. 1/3).
- **Conversión de entrada:** `Decimal.from(string | bigint | number)`. Solo se aceptan literales canónicos `-?\d+(\.\d+)?` y, como `number`, solo enteros seguros. Los decimales se escriben como texto (`'0.21'`), así que ningún valor pasa por coma flotante.
- **Conversión de salida:** `toString()` en notación plana, sin exponente (`toExpNeg`/`toExpPos` al máximo); `toFixed(dp, modo)`; `toNumberLossy()` **solo** para aproximaciones visuales (gráficos).
- **Operaciones permitidas:** `plus`, `minus`, `times`, `dividedBy`, `pow`, `negated`, `abs`, `round`, comparaciones, `isZero`, `isNegative`, `isPositive`, `isInteger`, `decimalPlaces`, `min` y `max`. Una operación nueva (`ln`, `exp`, `sqrt`…) se añade al adaptador con tests.
- **Sin NaN ni infinito:** cualquier resultado no finito lanza `DecimalError`. `runCalculator` lo convierte en el error de formulario `calculation_out_of_range`.
- `-0` se normaliza a `0`.

## Alternativas

| Opción           | Motivo de descarte                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `number` nativo  | Errores binarios; comparaciones inexactas en los tests                                          |
| big.js           | `pow` solo admite exponentes enteros; convertir un tipo anual a mensual requiere `(1+r)^(1/12)` |
| dinero.js        | Pensada para importes en unidades mínimas (céntimos), no para tipos ni exponenciales            |
| decimal.js-light | No se ha verificado su soporte de `pow` con exponente no entero: **NO VERIFICADO**              |

## Motivo

decimal.js es la opción revisada que cubre las operaciones que exigirán las calculadoras previstas sin tener que escribir matemáticas propias. El adaptador limita el acoplamiento a un solo archivo.

## Consecuencias

- **Coste medido:** decimal.js minificado ocupa 31,6 kB, que son 12,73 kB con gzip. Es la mayor parte del JavaScript de una página de calculadora (29,04 kB gz en total, docs/performance.md).
- **Limitación documentada por decimal.js:** `pow` con exponente no entero da un resultado correctamente redondeado "casi siempre", pero no está garantizado en el último de los 40 dígitos. Es irrelevante al mostrar el resultado con 2 decimales, pero las calculadoras que dependan de ello deben tenerlo en cuenta en sus tests.
