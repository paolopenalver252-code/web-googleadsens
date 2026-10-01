import { MAX_INPUT_LENGTH } from '@/core/input/decimal-input';

import { CalculatorField } from './CalculatorField';

export interface NumberFieldProps {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly hint?: string | undefined;
  /** Ejemplo de formato ("Ej.: 10.000"). Nunca sustituye a la etiqueta ni es un valor por defecto. */
  readonly placeholder?: string | undefined;
  /**
   * Teclado en móvil: 'decimal' (por defecto) o 'numeric' (sin separador
   * decimal), opcional por campo, p. ej. para una duración en años o meses.
   */
  readonly inputMode?: 'decimal' | 'numeric' | undefined;
  /** Sufijo visible ("€", "%", "años"). Decorativo: la unidad se describe aparte. */
  readonly unitSymbol?: string | undefined;
  readonly unitDescription?: string | undefined;
  readonly error?: string | undefined;
  readonly notice?: string | undefined;
  readonly errorPrefix: string;
  /** Cada pulsación: actualiza el valor, sin validar de forma agresiva. */
  readonly onValueInput: (value: string) => void;
  /** Al confirmar el valor (salir del campo / Enter): se valida. */
  readonly onCommit: () => void;
}

/**
 * Campo numérico para formato español.
 *
 * `type="text"` + `inputmode="decimal"`, NO `type="number"`: este último no
 * acepta la coma decimal de forma fiable, cambia el valor con la rueda del
 * ratón y reporta "" ante entradas que el usuario sí ve. El parseo real lo
 * hace core/input/decimal-input.ts. Un campo puede pedir
 * `inputmode="numeric"` (teclado sin separador decimal).
 */
export function NumberField({
  id,
  name,
  label,
  value,
  hint,
  placeholder,
  inputMode = 'decimal',
  unitSymbol,
  unitDescription,
  error,
  notice,
  errorPrefix,
  onValueInput,
  onCommit,
}: NumberFieldProps) {
  return (
    <CalculatorField
      id={id}
      label={label}
      hint={hint}
      unitDescription={unitDescription}
      error={error}
      notice={notice}
      errorPrefix={errorPrefix}
    >
      {({ describedBy, invalid }) => (
        <div
          class={[
            'flex items-stretch overflow-hidden rounded-control border bg-surface',
            'focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus',
            invalid
              ? 'border-danger shadow-[inset_0_0_0_1px_var(--color-danger)]'
              : 'border-border-strong',
          ].join(' ')}
        >
          <input
            id={id}
            name={name}
            type="text"
            inputMode={inputMode}
            autocomplete="off"
            spellcheck={false}
            enterKeyHint="done"
            maxLength={MAX_INPUT_LENGTH}
            value={value}
            placeholder={placeholder}
            aria-describedby={describedBy}
            aria-invalid={invalid ? 'true' : undefined}
            class="min-h-11 w-full min-w-0 bg-transparent px-3 py-2 text-base text-text tabular-nums outline-none placeholder:text-muted"
            onInput={(event) => {
              onValueInput(event.currentTarget.value);
            }}
            onChange={() => {
              onCommit();
            }}
          />
          {unitSymbol ? (
            <span
              aria-hidden="true"
              class="flex items-center border-l border-border bg-surface-muted px-3 text-muted"
            >
              {unitSymbol}
            </span>
          ) : null}
        </div>
      )}
    </CalculatorField>
  );
}
