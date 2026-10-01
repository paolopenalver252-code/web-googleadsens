# ADR 0004 — Entrada, parseo y validación

- **Estado:** aceptada
- **Fecha:** 2026-09-29

## Contexto

Los usuarios españoles escriben `1.234,56`. `parseFloat('1.234,56')` devuelve `1.234`: dato erróneo en silencio. `<input type="number">` no acepta la coma decimal de forma fiable, cambia el valor con la rueda del ratón y reporta `""` ante entradas que el usuario sí ve. Además, `1.234` es ambiguo: mil doscientos treinta y cuatro según la convención española, o uno coma dos tres cuatro para quien use el punto decimal.

## Decisión

Flujo obligatorio: **RAW INPUT → PARSE → VALIDATION → TYPED INPUT**.

1. **RAW:** `<input type="text" inputmode="decimal">`. El valor es siempre un texto.
2. **PARSE** (`src/core/input/decimal-input.ts`): convierte el texto en un `Decimal` exacto sin `parseFloat` ni `Number`. Recibe los símbolos del locale como datos. Devuelve `empty`, `ok` (con avisos) o `error` (con código).
3. **VALIDATION** (`src/core/validation/field.ts`): obligatorio/opcional, entero, decimales máximos y **límites mínimo y máximo inclusivos, obligatorios en todo campo**.
4. **TYPED INPUT** (`parseCalculatorInput`): objeto tipado en el que los campos obligatorios nunca son `undefined`, más las reglas entre campos (`toInput`).

### Interpretación en es-ES (tests en `decimal-input.test.ts`)

| Entrada                             | Resultado                   | Motivo                                                                                                                                               |
| ----------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1` · `1,5` · `,5`                  | 1 · 1.5 · 0.5               | Coma decimal                                                                                                                                         |
| `1234,56` · `1.234,56` · `1 234,56` | 1234.56                     | Los separadores de miles son opcionales; también se admite el espacio                                                                                |
| **`1.234`**                         | **1234 + aviso**            | **Caso ambiguo.** Se aplica la convención española (el punto separa los miles) y se muestra "Interpretado como 1.234 € (el punto separa los miles)." |
| `1.234.567`                         | 1234567, sin aviso          | Con dos puntos no puede tratarse de un decimal                                                                                                       |
| `12.5` · `0.25` · `.234`            | error `ambiguous_separator` | El grupo de miles no es válido: casi seguro es un punto decimal. **No se adivina:** se pide usar la coma                                             |
| `1,234.56` · `5,` · `1,2,3`         | error `invalid_format`      |                                                                                                                                                      |
| `1.23.456`                          | error `invalid_grouping`    |                                                                                                                                                      |
| `1e5` · `abc` · `0x10`              | error `invalid_characters`  | No se admite notación científica                                                                                                                     |
| `-5` · `−5` · `- 5`                 | −5                          | Se admite el signo; el mínimo lo decide la validación                                                                                                |
| `""` · `"   "`                      | empty                       | La validación decide si el campo es obligatorio                                                                                                      |
| Más de 64 caracteres                | error `too_long`            | Limita el trabajo ante entradas abusivas                                                                                                             |
| Más de 30 dígitos significativos    | error `too_many_digits`     | Queda por debajo de la precisión de 40                                                                                                               |

Se aceptan el símbolo de la unidad pegado junto al número (`€` en importes, `%` en porcentajes) y los espacios Unicode que produce `Intl` (U+00A0, U+202F).

Los mensajes de error son códigos (`required`, `below_min`…) que se traducen en `src/i18n`. Los errores propios de una calculadora llevan espacio de nombres: `"<id>.<código>"`.

## Alternativas

- **Zod o Valibot en el cliente:** añaden peso a la isla para validar pocos campos numéricos, y no resuelven el parseo del formato español, que es la parte difícil. Astro usa Zod internamente en tiempo de build (`astro:env`), lo que no afecta al cliente.
- **Adivinar el separador según el contexto:** descartado. Un dato financiero interpretado en silencio de forma distinta a la intención del usuario es peor que pedir que lo corrija.

## Motivo

Es una implementación pequeña, sin dependencias y probada, incluidas propiedades como "lo que formatea `Intl` es-ES se parsea al mismo valor" y "nunca lanza ante texto arbitrario". Los casos ambiguos quedan documentados y probados.

## Consecuencias

- El parser admite otros locales si se le pasan sus símbolos. Hay un test con `en-US`.
- Añadir un tipo de campo nuevo (fecha, selección) requiere su propia especificación y validación en `core/validation`.
