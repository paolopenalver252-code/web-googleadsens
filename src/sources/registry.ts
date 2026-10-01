/**
 * Registro de fuentes del sitio. Política: docs/sources-policy.md.
 *
 * NUNCA se añade una fuente, una URL o una atribución sin haberla comprobado.
 * Una fuente pasa a `status: 'verified'` solo cuando el titular del sitio ha
 * abierto la URL y confirmado personalmente su contenido; entonces se anotan
 * `accessedAt` y `reviewedAt`. Hasta ese momento se registra como
 * `unverified`, sin fechas, y se muestra como "NO VERIFICADO — NECESITA FUENTE".
 *
 * Ejemplo de la FORMA de un registro (datos ficticios, no copiar):
 *
 *   {
 *     id: 'organismo-documento-2026',
 *     title: '<título exacto del documento>',
 *     publisher: '<organismo>',
 *     url: 'https://<url exacta comprobada>',
 *     type: 'official',
 *     jurisdiction: 'ES',
 *     appliesTo: { from: toIsoDate('2026-01-01'), to: toIsoDate('2026-12-31') },
 *     accessedAt: toIsoDate('<fecha de consulta>'),
 *     reviewedAt: toIsoDate('<fecha de revisión>'),
 *     supports: [{ calculatorId: '<id>', aspect: 'formula' }],
 *     status: 'verified',
 *     notes: '<qué se comprobó exactamente>',
 *   }
 */
import { toIsoDate } from '@/core/dates/iso-date';
import type { SourceRecord } from '@/core/sources/types';

/**
 * Fuentes de la calculadora de interés compuesto. Localizadas y leídas por el
 * asistente el 01/10/2026 y verificadas personalmente por el titular del
 * sitio ese mismo día (contenido, autoría y lo que respalda cada una).
 */
const VERIFIED_ON = toIsoDate('2026-10-01');
const VERIFIED_NOTE = 'Verificada personalmente por el titular del sitio el 01/10/2026.';

export const sourceRegistry: readonly SourceRecord[] = [
  {
    id: 'fpt-interes-simple-compuesto-2023',
    title: 'Interés simple e interés compuesto: ¿sabes qué es cada uno?',
    publisher:
      'Plan de Educación Financiera (CNMV, Banco de España y Ministerio de Asuntos Económicos y TD)',
    url: 'https://www.finanzasparatodos.es/interes-simple-e-interes-compuesto-sabes-que-es-cada-uno',
    type: 'educational',
    jurisdiction: 'ES',
    appliesTo: null,
    accessedAt: VERIFIED_ON,
    reviewedAt: VERIFIED_ON,
    supports: [
      {
        calculatorId: 'compound-interest',
        aspect: 'concept',
        note: 'Los intereses de cada periodo se suman al capital; diferencia con el interés simple.',
      },
      {
        calculatorId: 'compound-interest',
        aspect: 'example:F1',
        note: '1.000 € al 5 %: intereses de 50 €, 52,50 € y 55,13 € en los años 1, 2 y 3.',
      },
    ],
    status: 'verified',
    notes: `Publicado el 09/03/2023. ${VERIFIED_NOTE}`,
  },
  {
    id: 'openstax-contemporary-math-6-4',
    title: '6.4 Compound Interest (Contemporary Mathematics)',
    publisher: 'OpenStax, Rice University (autora: Donna Kirk)',
    url: 'https://openstax.org/books/contemporary-mathematics/pages/6-4-compound-interest',
    type: 'academic',
    jurisdiction: 'US',
    appliesTo: null,
    accessedAt: VERIFIED_ON,
    reviewedAt: VERIFIED_ON,
    supports: [
      {
        calculatorId: 'compound-interest',
        aspect: 'formula:periodic-compounding',
        note: 'A = P(1 + r/n)^(nt): tipo nominal (TIN) dividido entre los periodos del año.',
      },
    ],
    status: 'verified',
    notes: `Ejemplos 6.41 y 6.42 (fixtures F2 y F5). Licencia CC BY-NC-SA. ${VERIFIED_NOTE}`,
  },
  {
    id: 'openstax-principles-finance-8-2',
    title: '8.2 Annuities (Principles of Finance)',
    publisher: 'OpenStax, Rice University (autores: Julie Dahlquist y Rainford Knight)',
    url: 'https://openstax.org/books/principles-finance/pages/8-2-annuities',
    type: 'academic',
    jurisdiction: 'US',
    appliesTo: null,
    accessedAt: VERIFIED_ON,
    reviewedAt: VERIFIED_ON,
    supports: [
      {
        calculatorId: 'compound-interest',
        aspect: 'formula:contributions-end',
        note: 'Valor final de una renta con pagos al final de cada periodo: C · ((1 + i)^n − 1) / i.',
      },
      {
        calculatorId: 'compound-interest',
        aspect: 'formula:contributions-start',
        note: 'Renta con pagos al inicio de cada periodo: el mismo valor multiplicado por (1 + i).',
      },
    ],
    status: 'verified',
    notes: `Ejemplos ≈ 217.298 $ y ≈ 234.682 $ (fixtures F4a y F4b). Licencia CC BY-NC-SA 4.0. ${VERIFIED_NOTE}`,
  },
  {
    id: 'olivier-business-math-9-6',
    title: '9.6 Equivalent and Effective Interest Rates (Business Math: A Step-by-Step Handbook)',
    publisher: 'Jean-Paul Olivier; Lyryx Learning y BCcampus (edición en LibreTexts)',
    url: 'https://math.libretexts.org/Bookshelves/Applied_Mathematics/Business_Math_(Olivier)/09:_Compound_Interest_Working_With_Single_Payments/9.06:_Equivalent_and_Effective_Interest_Rates',
    type: 'academic',
    jurisdiction: 'CA',
    appliesTo: null,
    accessedAt: VERIFIED_ON,
    reviewedAt: VERIFIED_ON,
    supports: [
      {
        calculatorId: 'compound-interest',
        aspect: 'formula:effective-annual-rate',
        note: 'Tipo efectivo f = (1 + i)^CY − 1 (tipo efectivo anual equivalente de un TIN).',
      },
      {
        calculatorId: 'compound-interest',
        aspect: 'formula:equivalent-periodic-rate',
        note: 'Fórmula 9.4: i_New = (1 + i_Old)^(CY_Old ÷ CY_New) − 1; con CY_Old = 1 y CY_New = m da i = (1 + X)^(1/m) − 1.',
      },
    ],
    status: 'verified',
    notes: `Licencia CC BY-NC-SA 4.0. ${VERIFIED_NOTE}`,
  },
  {
    id: 'bde-glosario-tae',
    title: 'Tasa Anual Equivalente (TAE) — Glosario de estadísticas',
    publisher: 'Banco de España',
    url: 'https://www.bde.es/webbe/es/estadisticas/recursos/glosario/conceptos/tasa-anual-equivalente.html',
    type: 'official',
    jurisdiction: 'ES',
    appliesTo: null,
    accessedAt: VERIFIED_ON,
    reviewedAt: VERIFIED_ON,
    supports: [
      {
        calculatorId: 'compound-interest',
        aspect: 'terminology:tae',
        note: 'La TAE incluye comisiones y algunos gastos: por eso la calculadora no llama TAE a su tipo efectivo anual equivalente.',
      },
    ],
    status: 'verified',
    notes: `Definición sin fórmula; solo respalda la terminología. ${VERIFIED_NOTE}`,
  },
];
