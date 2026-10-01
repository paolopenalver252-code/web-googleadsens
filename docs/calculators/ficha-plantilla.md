# Ficha de calculadora — plantilla

Copia este archivo como `docs/calculators/<slug>.md` **antes** de escribir código. Si no se puede rellenar la intención, la calculadora no debe existir todavía.

Los campos marcados con → se trasladan tal cual al registro (`src/calculators/registry.ts`). El resto orienta el motor, los tests y el contenido.

| Campo                      | Contenido                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| → Nombre (`name`)          | Nombre corto para enlaces y listados                                                              |
| → H1 (`heading`)           |                                                                                                   |
| → Slug                     | `calculadora-…`; minúsculas, sin variantes de keyword                                             |
| → Categoría (`category`)   | Id de `src/calculators/categories.ts` (si es nueva, justificarla)                                 |
| → SEO title                | Único en el sitio; sin el nombre del sitio (se añade solo)                                        |
| → SEO description          | Escrita para el usuario; única en el sitio                                                        |
| → Relacionadas (`related`) | Solo calculadoras existentes y relevantes                                                         |
| Intención principal        | Qué quiere calcular el usuario, en una frase                                                      |
| Datos que tiene el usuario | Qué sabe ya y qué puede necesitar buscar                                                          |
| Inputs                     | Campo, unidad, obligatorio, mínimo, máximo, decimales                                             |
| Outputs                    | Qué cifras se muestran y con qué redondeo                                                         |
| Fórmula                    | Exacta, con casos especiales (divisiones entre cero, límites)                                     |
| Casos de uso               | Situaciones reales en las que se usa                                                              |
| Preguntas frecuentes       | Dudas reales tras ver el resultado                                                                |
| Fuentes                    | Candidatas (URL, organismo) **y estado de verificación**. Nunca se marcan verificadas sin leerlas |
| Contenido relacionado      | Conceptos que el usuario necesita entender                                                        |
| Fuera de alcance           | Lo que la calculadora NO modela (va a «Supuestos y limitaciones»)                                 |
