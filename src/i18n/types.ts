import type { DecimalParseNotice } from '@/core/input/decimal-input';
import type { SourceType } from '@/core/sources/types';
import type {
  BuiltinFieldErrorCode,
  CustomFieldErrorCode,
  FieldUnit,
  NumberConventions,
} from '@/core/validation/field';

/** Parámetros ya formateados (texto) que reciben los mensajes. */
export interface MessageParams {
  readonly min?: string;
  readonly max?: string;
  /** Parámetros propios de los errores de cada calculadora. */
  readonly [key: string]: string | undefined;
}

/** Mensaje de un error propio de calculadora, con clave "<id>.<código>". */
export type CalculatorErrorMessages = Readonly<
  Record<CustomFieldErrorCode, (params: MessageParams) => string>
>;

export interface Messages {
  readonly fieldErrors: Readonly<Record<BuiltinFieldErrorCode, (params: MessageParams) => string>>;
  /** Errores propios de las calculadoras (validación entre campos). */
  readonly calculatorErrors: CalculatorErrorMessages;
  readonly notices: Readonly<Record<DecimalParseNotice, (formattedValue: string) => string>>;
  /** Descripción de la unidad para lectores de pantalla ("en euros"). */
  readonly unitDescriptions: Readonly<Record<FieldUnit, string>>;
  /** Sufijo textual de unidades sin símbolo propio ("años"). */
  readonly unitSuffixes: Readonly<Partial<Record<FieldUnit, string>>>;
  readonly sourceTypes: Readonly<Record<SourceType, string>>;
  /** Nombres de jurisdicción conocidos (ISO 3166). */
  readonly jurisdictions: Readonly<Record<string, string>>;
  readonly ui: {
    readonly skipLink: string;
    readonly mainNavLabel: string;
    readonly home: string;
    readonly breadcrumbsLabel: string;
    readonly calculate: string;
    readonly resultHeading: string;
    readonly resultIdle: string;
    readonly resultStale: string;
    readonly errorSummaryTitle: (count: number) => string;
    readonly errorPrefix: string;
    readonly jsRequired: string;
    readonly methodologyHeading: string;
    readonly engineVersion: (version: string) => string;
    readonly sourcesHeading: string;
    readonly sourceAccessed: (date: string) => string;
    readonly sourceReviewed: (date: string) => string;
    readonly sourceAppliesTo: (from: string, to: string | null) => string;
    readonly unverified: string;
    readonly noSources: string;
    readonly disclaimerHeading: string;
    readonly disclaimerPlaceholder: string;
    readonly relatedHeading: string;
    readonly rulesApplied: (params: {
      readonly from: string;
      readonly to: string | null;
      readonly jurisdiction: string;
    }) => string;
    readonly adLabel: string;
    readonly calculatorsHeading: string;
    readonly noCalculatorsYet: string;
    readonly placeholderIdentityNotice: string;
    readonly legalNavLabel: string;
  };
}

export interface LocaleDefinition {
  /** Etiqueta BCP 47, también usada en <html lang>. */
  readonly tag: string;
  /** Formato de Open Graph (og:locale). */
  readonly ogLocale: string;
  /** Moneda ISO 4217. */
  readonly currency: string;
  /** Zona horaria IANA que define "hoy" para las reglas vigentes. */
  readonly timeZone: string;
  readonly numbers: NumberConventions;
  readonly messages: Messages;
}
