import { UNVERIFIED_LABEL } from '@/core/sources/types';

import type { LocaleDefinition } from '../types';

/**
 * Español de España.
 *
 * Los símbolos numéricos coinciden con los que produce Intl para 'es-ES'
 * (lo comprueba src/i18n/locales/es-ES.test.ts).
 *
 * Zona horaria: 'Europe/Madrid'. LIMITACIÓN CONOCIDA: Canarias usa
 * 'Atlantic/Canary' (una hora menos); entre las 23:00 y las 24:00 del día
 * anterior a un cambio normativo, un usuario canario vería las reglas nuevas
 * una hora antes. Si una calculadora depende de ese matiz, debe resolverlo
 * con la jurisdicción (ES-CN).
 */
export const esES: LocaleDefinition = {
  tag: 'es-ES',
  ogLocale: 'es_ES',
  currency: 'EUR',
  timeZone: 'Europe/Madrid',
  numbers: {
    decimal: ',',
    group: '.',
    currencySymbol: '€',
    percentSign: '%',
  },
  messages: {
    fieldErrors: {
      required: () => 'Este campo es obligatorio.',
      invalid_option: () => 'Selecciona una de las opciones disponibles.',
      too_long: () => 'El valor es demasiado largo.',
      invalid_characters: () => 'Introduce solo números. Usa la coma (,) para los decimales.',
      invalid_format: () => 'El formato del número no es válido. Ejemplo: 1.234,56',
      invalid_grouping: () => 'Los separadores de miles no son correctos. Ejemplo: 1.234.567',
      ambiguous_separator: () => 'Usa la coma (,) para los decimales. Ejemplo: 12,5',
      too_many_digits: () => 'El número tiene demasiadas cifras.',
      not_integer: () => 'Introduce un número entero, sin decimales.',
      too_many_decimals: ({ max }) =>
        max === '1'
          ? 'Introduce como máximo 1 decimal.'
          : `Introduce como máximo ${max ?? ''} decimales.`,
      below_min: ({ min }) => `El valor mínimo es ${min ?? ''}.`,
      above_max: ({ max }) => `El valor máximo es ${max ?? ''}.`,
      calculation_out_of_range: () =>
        'No se puede calcular con estos valores: el resultado queda fuera del rango admitido.',
    },
    calculatorErrors: {
      'compound-interest.duration_incompatible': ({ multiple }) =>
        `Con la frecuencia elegida, la duración debe ser un múltiplo de ${multiple ?? ''} meses.`,
      'compound-interest.duration_too_long': ({ maxMonths }) =>
        `La duración máxima es de ${maxMonths ?? ''} meses.`,
      'compound-interest.timing_required': () =>
        'Indica si las aportaciones se hacen al inicio o al final de cada periodo.',
      'compound-interest.result_too_large': ({ max }) =>
        `El valor final supera el límite de ${max ?? ''} € que admite esta calculadora.`,
    },
    notices: {
      group_separator_interpreted: (formatted) =>
        `Interpretado como ${formatted} (el punto separa los miles).`,
    },
    unitDescriptions: {
      currency: 'en euros',
      percent: 'en porcentaje',
      years: 'en años',
      months: 'en meses',
      count: '',
      none: '',
    },
    unitSuffixes: {
      years: 'años',
      months: 'meses',
    },
    sourceTypes: {
      official: 'Fuente oficial',
      academic: 'Fuente académica',
      educational: 'Fuente educativa',
      secondary: 'Fuente secundaria',
    },
    jurisdictions: {
      ES: 'España',
    },
    ui: {
      skipLink: 'Saltar al contenido principal',
      mainNavLabel: 'Navegación principal',
      home: 'Inicio',
      breadcrumbsLabel: 'Ruta de navegación',
      calculate: 'Calcular',
      resultHeading: 'Resultado',
      resultIdle: 'Introduce los datos y pulsa «Calcular».',
      resultStale:
        'Hay datos pendientes de corregir: el resultado corresponde a los últimos valores válidos.',
      errorSummaryTitle: (count) =>
        count === 1
          ? 'Hay 1 error en el formulario'
          : `Hay ${String(count)} errores en el formulario`,
      errorPrefix: 'Error:',
      jsRequired: 'Esta calculadora necesita JavaScript. Actívalo en tu navegador para usarla.',
      methodologyHeading: 'Metodología',
      engineVersion: (version) => `Versión del cálculo: ${version}`,
      sourcesHeading: 'Fuentes',
      sourceAccessed: (date) => `Consultada el ${date}`,
      sourceReviewed: (date) => `Revisada el ${date}`,
      sourceAppliesTo: (from, to) =>
        to === null ? `Aplicable desde el ${from}` : `Aplicable del ${from} al ${to}`,
      unverified: UNVERIFIED_LABEL,
      noSources: UNVERIFIED_LABEL,
      disclaimerHeading: 'Aviso',
      disclaimerPlaceholder:
        'PLACEHOLDER — PENDIENTE DE DEFINIR: texto del aviso pendiente de revisión legal.',
      relatedHeading: 'Calculadoras relacionadas',
      rulesApplied: ({ from, to, jurisdiction }) =>
        to === null
          ? `Reglas aplicadas: vigentes desde el ${from} · ${jurisdiction}`
          : `Reglas aplicadas: vigentes del ${from} al ${to} · ${jurisdiction}`,
      // AdSense solo admite "Anuncios" o "Enlaces patrocinados" (ver AdSlot.astro).
      adLabel: 'Anuncios',
      calculatorsHeading: 'Calculadoras',
      noCalculatorsYet: 'Todavía no hay calculadoras publicadas.',
      placeholderIdentityNotice: 'Sitio en desarrollo · identidad provisional',
      legalNavLabel: 'Información legal',
    },
  },
};
