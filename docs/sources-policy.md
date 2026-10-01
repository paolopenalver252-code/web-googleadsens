# Política de fuentes

## Reglas absolutas

1. **Nunca se inventa una fuente, una URL, un dato ni una atribución.**
2. Nunca se atribuye una fórmula a un organismo sin haber comprobado que ese organismo la publica.
3. Si falta un dato, se escribe **"NO VERIFICADO — NECESITA FUENTE"** y la calculadora no se publica.
4. Un texto generado por IA no es una fuente. Una búsqueda tampoco: lo es el documento concreto que se ha leído.

## Prioridad

| Tipo (`type`) | Ejemplos de la categoría                                                         | Uso                                                                     |
| ------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `official`    | Boletines oficiales, organismos públicos, bancos centrales, agencias tributarias | **Obligatoria** para cualquier regla normativa (tipos, tramos, límites) |
| `academic`    | Publicaciones académicas o manuales universitarios                               | Fórmulas matemáticas y financieras generales                            |
| `educational` | Programas públicos de educación financiera                                       | Explicaciones divulgativas                                              |
| `secondary`   | Otras webs                                                                       | Solo como contexto, nunca como única base de un cálculo                 |

Esta tabla describe categorías. **No registra fuentes concretas:** cada fuente se registra solo tras comprobarla.

## Cómo registrar una fuente

1. Abre la URL exacta y lee la parte relevante.
2. Comprueba que respalda **exactamente** lo que vas a indicar en `supports` (fórmula, tramo, redondeo…).
3. Anota `accessedAt` (fecha de consulta) y `reviewedAt` (fecha de revisión del contenido).
4. Indica la `jurisdiction` (ISO 3166: `ES`, `ES-MD`…) y el periodo `appliesTo` si la fuente depende del ejercicio.
5. Resume en `notes` qué se ha comprobado y dónde (artículo, apartado, página).
6. Solo entonces marca `status: 'verified'`. Si falta algo, deja `unverified`.
7. Ejecuta `npm test`: la integridad del registro se comprueba automáticamente.

## Revisión

- Las fuentes de normativa anual se revisan al cambiar el ejercicio. Si la norma cambia, se crea un conjunto de reglas **nuevo** y nunca se edita el publicado (ADR 0002).
- `findStaleSources` detecta revisiones antiguas. **Umbral PENDIENTE DE DEFINIR.**
- Un comprobador periódico de enlaces rotos en CI está **PENDIENTE**. No se ejecuta en cada build porque depende de sitios externos.
