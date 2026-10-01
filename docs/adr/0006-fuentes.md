# ADR 0006 — Sistema de fuentes

- **Estado:** aceptada
- **Fecha:** 2026-09-29

## Contexto

Las calculadoras deben basarse en fuentes verificables, y las oficiales tienen prioridad. Nunca se puede inventar una fuente, una URL ni una atribución. Hay que poder registrar el organismo, la URL, las fechas, la jurisdicción, el periodo aplicable y qué parte de la calculadora respalda cada fuente.

## Decisión

- **Tipos** en `src/core/sources/types.ts`. Cada `SourceRecord` tiene: `id`, `title`, `publisher`, `url`, `type` (`official` | `academic` | `educational` | `secondary`), `jurisdiction` (ISO 3166), `appliesTo`, `accessedAt`, `reviewedAt`, `supports: [{ calculatorId, aspect, note? }]`, `status` (`verified` | `unverified`) y `notes`.
- **Registro:** `src/sources/registry.ts`. **Está vacío a propósito.**
- **Relación con las calculadoras:** `supports` es la única fuente de verdad sobre qué respalda cada fuente. Las reglas y las políticas de redondeo referencian fuentes por `id`.
- **Integridad** (`src/core/sources/integrity.ts`):
  - `validateSourceRegistry` detecta ids duplicados o mal formados, URLs que no son https, jurisdicciones inválidas, campos vacíos, periodos invertidos, fuentes verificadas sin fechas, fecha de revisión anterior a la de consulta, fuentes sin `supports` y referencias a calculadoras inexistentes.
  - `resolveSourceIds` **lanza** ante un id inexistente, y `SourceList.astro` lo usa, así que **el build falla**.
  - `publicationBlockers` indica qué impide publicar una calculadora: falta de fuentes o fuentes sin verificar. `src/calculators/registry.test.ts` lo aplica a toda calculadora publicada.
  - `findStaleSources` detecta revisiones antiguas. **Umbral PENDIENTE DE DEFINIR.**
- **Presentación:** `SourceList` ordena por autoridad (oficial → académica → educativa → secundaria). Las fuentes sin verificar muestran "NO VERIFICADO — NECESITA FUENTE", y una calculadora sin fuentes muestra lo mismo.

## Alternativas

- **Colección de contenido de Astro (YAML/JSON):** viable, pero exigiría duplicar el esquema en Zod y quedaría fuera del typecheck del core. Con TypeScript tipado se obtiene la validación del compilador y los tests de integridad sin coste en el cliente.
- **Fuentes dentro de cada calculadora:** dificulta reutilizar una misma fuente oficial en varias calculadoras.

## Motivo

Una referencia rota o una fuente sin verificar nunca llegan a producción en silencio: el test o el build fallan.

## Consecuencias

- Registrar una fuente exige haberla comprobado a mano (docs/sources-policy.md).
- Los tests de integridad del registro real no comprueban nada hasta que se registre la primera fuente. La mecánica sí está probada con registros ficticios del dominio reservado `example.org`.
