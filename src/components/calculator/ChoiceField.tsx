import { FieldErrorMessage } from './CalculatorField';

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
}

export interface ChoiceFieldProps {
  /** Id del PRIMER radio: es el destino de los enlaces del resumen de errores. */
  readonly id: string;
  readonly name: string;
  readonly legend: string;
  readonly options: readonly ChoiceOption[];
  /** Opción seleccionada ('' = ninguna). */
  readonly value: string;
  readonly required?: boolean;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  readonly errorPrefix: string;
  /** Elegir una opción es a la vez escribir y confirmar el valor. */
  readonly onChoose: (value: string) => void;
}

/**
 * Campo de opción cerrada como grupo de radios nativos.
 *
 * - Contenedor `role="radiogroup"` con nombre (aria-labelledby → texto visible
 *   de la pregunta): el lector de pantalla lo anuncia al entrar en el grupo.
 *   Ayuda y error se enlazan con aria-describedby; el estado de error
 *   (aria-invalid) y la obligatoriedad (aria-required) pertenecen al GRUPO,
 *   porque ARIA no los admite en `role="radio"`.
 * - Radios nativos: Tab entra en el grupo una vez y las flechas cambian de
 *   opción (comportamiento estándar del navegador, sin JavaScript propio).
 * - Cada opción es una etiqueta clicable de al menos 44 px de alto (WCAG
 *   2.5.8), con el foco visible en la tarjeta y la selección indicada por el
 *   radio además del color.
 */
export function ChoiceField({
  id,
  name,
  legend,
  options,
  value,
  required = false,
  hint,
  error,
  errorPrefix,
  onChoose,
}: ChoiceFieldProps) {
  const legendId = `${id}-legend`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div class="flex min-w-0 flex-col gap-1.5" data-field={id}>
      <p id={legendId} class="font-medium text-text">
        {legend}
      </p>
      {hint ? (
        <p id={hintId} class="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error && errorId ? (
        <FieldErrorMessage id={errorId} prefix={errorPrefix} message={error} />
      ) : null}
      <div
        role="radiogroup"
        aria-labelledby={legendId}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required ? 'true' : undefined}
        class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
      >
        {options.map((option, index) => {
          const inputId = index === 0 ? id : `${id}-${option.value}`;
          return (
            <label
              key={option.value}
              for={inputId}
              class={[
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-control border bg-surface px-3 py-2 text-text',
                'has-checked:border-accent has-checked:bg-accent-soft',
                'has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                error ? 'border-danger' : 'border-border-strong',
              ].join(' ')}
            >
              <input
                type="radio"
                id={inputId}
                name={name}
                value={option.value}
                checked={value === option.value}
                class="size-4 shrink-0 accent-accent focus-visible:outline-none"
                onChange={() => {
                  onChoose(option.value);
                }}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
