import type { ComponentChildren, TargetedSubmitEvent } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

import {
  runCalculator,
  validateCalculatorField,
  type CalculatorContext,
  type CalculatorDefinition,
  type CalculatorRun,
  type FieldSpecs,
  type RawFieldValues,
} from '@/core/calculator/definition';
import { isoDateInTimeZone } from '@/core/dates/iso-date';
import { Decimal } from '@/core/math/decimal';
import type { ChoiceFieldSpec, DecimalFieldSpec, FieldError } from '@/core/validation/field';
import { fieldErrorMessage, noticeMessage, type CustomMessages } from '@/i18n/field-messages';
import type { LocaleDefinition } from '@/i18n/types';

import { ChoiceField } from './ChoiceField';
import { ErrorSummary } from './ErrorSummary';
import { NumberField } from './NumberField';
import { ResultPanel } from './ResultPanel';

/** Espera tras la última pulsación antes de refrescar el resultado visible. */
export const LIVE_UPDATE_DELAY_MS = 600;

export interface FieldPresentation {
  readonly label: string;
  readonly hint?: string;
  /** Solo campos numéricos: ejemplo de formato, nunca un valor por defecto. */
  readonly placeholder?: string;
  /** Solo campos numéricos: teclado en móvil (por defecto 'decimal'). */
  readonly inputMode?: 'decimal' | 'numeric';
}

/** Presentación de un campo de opción: etiqueta visible de cada opción. */
export interface ChoicePresentation<V extends string = string> extends FieldPresentation {
  readonly optionLabels: Readonly<Record<V, string>>;
}

export type PresentationFor<S> =
  S extends ChoiceFieldSpec<infer V> ? ChoicePresentation<V> : FieldPresentation;

export interface CalculatorShellProps<F extends FieldSpecs, Input, Output> {
  readonly definition: CalculatorDefinition<F, Input, Output>;
  readonly locale: LocaleDefinition;
  /** Etiqueta y ayuda de cada campo (el orden lo da `definition.fields`). */
  readonly fields: { readonly [K in keyof F]: PresentationFor<F[K]> };
  readonly renderResult: (run: CalculatorRun<F, Input, Output>) => ComponentChildren;
  /** Frase breve que se anuncia a lectores de pantalla tras calcular. */
  readonly summarize: (run: CalculatorRun<F, Input, Output>) => string;
  /** Texto del botón de envío; por defecto, el genérico del locale ("Calcular"). */
  readonly submitLabel?: string;
  readonly initialValues?: Partial<RawFieldValues<F>>;
  readonly customMessages?: CustomMessages;
  /** Inyectable en tests; por defecto, "hoy" en la zona horaria del locale. */
  readonly getContext?: () => CalculatorContext;
  readonly liveUpdateDelayMs?: number;
}

type FieldName<F> = keyof F & string;

/**
 * Contenedor común de todas las calculadoras (isla Preact).
 *
 * UX de cálculo (decisión aprobada):
 *   1. Primer cálculo SOLO con el botón «Calcular» (o Enter).
 *   2. Después, el resultado visible se refresca cuando los valores son
 *      válidos, con retardo (LIVE_UPDATE_DELAY_MS) tras dejar de escribir.
 *   3. Nada se ANUNCIA mientras se escribe: el anuncio (role="status") solo
 *      ocurre al pulsar Calcular o al confirmar un campo (salir de él).
 *   4. Mientras se escribe no aparecen errores nuevos; un error ya visible
 *      desaparece en cuanto se corrige. Los errores se validan al salir del
 *      campo y al enviar (con resumen de errores que recibe el foco).
 *
 * Privacidad: nada se guarda ni se envía; el cálculo es local.
 */
export function CalculatorShell<F extends FieldSpecs, Input, Output>(
  props: CalculatorShellProps<F, Input, Output>,
) {
  const { definition, locale, fields } = props;
  const { ui } = locale.messages;
  const names = Object.keys(definition.fields) as FieldName<F>[];
  const delay = props.liveUpdateDelayMs ?? LIVE_UPDATE_DELAY_MS;
  const fieldId = (name: string): string => `${definition.id}-${name}`;

  const initialRaw = Object.fromEntries(
    names.map((name) => [name, props.initialValues?.[name] ?? '']),
  ) as Record<FieldName<F>, string>;

  const [raw, setRaw] = useState(initialRaw);
  const rawRef = useRef(initialRaw);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, FieldError>>>({});
  const [notices, setNotices] = useState<Partial<Record<string, string>>>({});
  const [summaryErrors, setSummaryErrors] = useState<readonly FieldError[]>([]);
  const [run, setRun] = useState<CalculatorRun<F, Input, Output> | null>(null);
  const [stale, setStale] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [summaryFocusRequest, setSummaryFocusRequest] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Hasta hidratar, el botón está deshabilitado: sin JavaScript el
    // formulario no puede enviarse (evita que los datos acaben en la URL).
    setHydrated(true);
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  // useLayoutEffect: el foco se mueve en cuanto el resumen existe en el DOM,
  // sin esperar al siguiente frame.
  useLayoutEffect(() => {
    if (summaryFocusRequest > 0) summaryRef.current?.focus();
  }, [summaryFocusRequest]);

  const context = (): CalculatorContext =>
    props.getContext?.() ?? { today: isoDateInTimeZone(new Date(), locale.timeZone) };

  const execute = () =>
    runCalculator(definition, rawRef.current as RawFieldValues<F>, locale.numbers, context());

  const announce = (message: string): void => {
    // Un texto idéntico no se vuelve a leer: se alterna un espacio invisible.
    setAnnouncement((previous) => (previous === message ? `${message}\xA0` : message));
  };

  const messageFor = (error: FieldError): string =>
    fieldErrorMessage(
      error,
      error.field === null ? undefined : definition.fields[error.field],
      locale,
      props.customMessages,
    );

  const recompute = (shouldAnnounce: boolean): void => {
    const result = execute();
    if (result.ok) {
      setRun(result.value);
      setStale(false);
      if (shouldAnnounce) announce(props.summarize(result.value));
    } else {
      setStale(true);
    }
  };

  const handleInput = (name: FieldName<F>, value: string): void => {
    rawRef.current = { ...rawRef.current, [name]: value };
    setRaw(rawRef.current);
    setNotices((previous) => ({ ...previous, [name]: undefined }));

    if (fieldErrors[name] !== undefined) {
      const check = validateCalculatorField(definition, name, value, locale.numbers);
      if (check.ok) setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
    }

    if (run !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        recompute(false);
      }, delay);
    }
  };

  const handleCommit = (name: FieldName<F>): void => {
    const value = rawRef.current[name];
    const check = validateCalculatorField(definition, name, value, locale.numbers);
    setFieldErrors((previous) => ({ ...previous, [name]: check.ok ? undefined : check.error }));

    const spec = definition.fields[name];
    const [notice] = check.ok ? check.value.notices : [];
    setNotices((previous) => ({
      ...previous,
      [name]:
        notice !== undefined &&
        spec?.kind === 'decimal' &&
        check.ok &&
        check.value.value instanceof Decimal
          ? noticeMessage(notice, check.value.value, spec, locale)
          : undefined,
    }));

    if (run !== null) {
      clearTimeout(timerRef.current);
      recompute(true);
    }
  };

  /** En un campo de opción, elegir equivale a escribir y confirmar a la vez. */
  const handleChoose = (name: FieldName<F>, value: string): void => {
    handleInput(name, value);
    handleCommit(name);
  };

  const handleSubmit = (event: TargetedSubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    clearTimeout(timerRef.current);
    const result = execute();

    if (result.ok) {
      setRun(result.value);
      setStale(false);
      setFieldErrors({});
      setSummaryErrors([]);
      announce(props.summarize(result.value));
      return;
    }

    const byField: Partial<Record<string, FieldError>> = {};
    for (const error of result.error) {
      if (error.field !== null) byField[error.field] ??= error;
    }
    setFieldErrors(byField);
    setSummaryErrors(result.error);
    setSummaryFocusRequest((count) => count + 1);
    if (run !== null) setStale(true);
  };

  const resultStatus = run === null ? 'idle' : stale ? 'stale' : 'current';

  return (
    <div class="flex flex-col gap-6">
      <div class="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <form noValidate class="flex flex-col gap-5" onSubmit={handleSubmit}>
          {summaryErrors.length > 0 ? (
            <ErrorSummary
              id={`${definition.id}-errors`}
              containerRef={summaryRef}
              title={ui.errorSummaryTitle(summaryErrors.length)}
              items={summaryErrors.map((error) => ({
                fieldId: error.field === null ? undefined : fieldId(error.field),
                message:
                  error.field === null
                    ? messageFor(error)
                    : `${fields[error.field]?.label ?? error.field}: ${messageFor(error)}`,
              }))}
            />
          ) : null}

          {names.map((name) => {
            const spec = definition.fields[name];
            const presentation = fields[name];
            const error = fieldErrors[name];
            if (spec?.kind === 'choice') {
              // Aserción justificada: `PresentationFor` asigna ChoicePresentation
              // a todo campo cuya especificación es de opción.
              const choice = presentation as ChoicePresentation;
              return (
                <ChoiceField
                  key={name}
                  id={fieldId(name)}
                  name={name}
                  legend={choice.label}
                  required={spec.required}
                  hint={choice.hint}
                  value={raw[name]}
                  options={spec.options.map((option) => ({
                    value: option,
                    label: choice.optionLabels[option] ?? option,
                  }))}
                  error={error === undefined ? undefined : messageFor(error)}
                  errorPrefix={ui.errorPrefix}
                  onChoose={(value) => {
                    handleChoose(name, value);
                  }}
                />
              );
            }
            return (
              <NumberField
                key={name}
                id={fieldId(name)}
                name={name}
                label={presentation.label}
                hint={presentation.hint}
                placeholder={presentation.placeholder}
                inputMode={presentation.inputMode}
                value={raw[name]}
                unitSymbol={spec === undefined ? undefined : unitSymbol(spec.unit, locale)}
                unitDescription={
                  spec === undefined
                    ? undefined
                    : locale.messages.unitDescriptions[spec.unit] || undefined
                }
                error={error === undefined ? undefined : messageFor(error)}
                notice={notices[name]}
                errorPrefix={ui.errorPrefix}
                onValueInput={(value) => {
                  handleInput(name, value);
                }}
                onCommit={() => {
                  handleCommit(name);
                }}
              />
            );
          })}

          <div>
            <button
              type="submit"
              disabled={!hydrated}
              class="inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-6 font-semibold text-accent-contrast transition-colors duration-(--duration-fast) ease-(--ease-standard) hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {props.submitLabel ?? ui.calculate}
            </button>
          </div>
        </form>
        <p role="status" aria-atomic="true" class="sr-only">
          {announcement}
        </p>
      </div>

      <ResultPanel
        id={`${definition.id}-result`}
        heading={ui.resultHeading}
        status={resultStatus}
        idleMessage={ui.resultIdle}
        staleMessage={ui.resultStale}
      >
        {run === null ? null : props.renderResult(run)}
      </ResultPanel>
    </div>
  );
}

function unitSymbol(unit: DecimalFieldSpec['unit'], locale: LocaleDefinition): string | undefined {
  switch (unit) {
    case 'currency':
      return locale.numbers.currencySymbol;
    case 'percent':
      return locale.numbers.percentSign;
    case 'years':
    case 'months':
      return locale.messages.unitSuffixes[unit];
    case 'count':
    case 'none':
      return undefined;
  }
}
