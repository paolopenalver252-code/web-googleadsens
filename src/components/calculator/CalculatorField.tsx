import type { ComponentChildren } from 'preact';

/** Atributos de accesibilidad que el campo entrega a su control. */
export interface FieldControlProps {
  readonly id: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
}

export interface CalculatorFieldProps {
  readonly id: string;
  readonly label: string;
  readonly hint?: string | undefined;
  /** Texto solo para lectores de pantalla que describe la unidad ("en euros"). */
  readonly unitDescription?: string | undefined;
  readonly error?: string | undefined;
  readonly notice?: string | undefined;
  /** Prefijo leído antes del error ("Error:"), para no depender del color. */
  readonly errorPrefix: string;
  readonly children: (control: FieldControlProps) => ComponentChildren;
}

/**
 * Mensaje de error de un campo: icono y prefijo textual además del color
 * (WCAG 1.4.1). Compartido por los campos numéricos y los de opción.
 */
export function FieldErrorMessage({
  id,
  prefix,
  message,
}: {
  readonly id: string;
  readonly prefix: string;
  readonly message: string;
}) {
  return (
    <p id={id} class="flex items-start gap-1.5 text-sm font-medium text-danger">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        class="mt-0.5 size-4 shrink-0"
        fill="currentColor"
      >
        <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-.9 4.2h1.8v5.6H9.1V5.7Zm0 7.2h1.8v1.8H9.1v-1.8Z" />
      </svg>
      <span>
        {/* El espacio es un nodo de texto propio: dentro del span oculto se
            pierde al calcular la descripción y se leería "Error:Este…". */}
        <span class="sr-only">{prefix}</span> {message}
      </span>
    </p>
  );
}

/**
 * Estructura común de un campo: etiqueta real (<label for>), ayuda, error y
 * aviso, todos enlazados al control con aria-describedby. El error se
 * muestra encima del control (sigue visible con zoom) y lleva icono y
 * prefijo textual además del color.
 */
export function CalculatorField({
  id,
  label,
  hint,
  unitDescription,
  error,
  notice,
  errorPrefix,
  children,
}: CalculatorFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const unitId = unitDescription ? `${id}-unit` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const noticeId = notice && !error ? `${id}-notice` : undefined;
  const describedBy = [hintId, unitId, errorId, noticeId].filter(Boolean).join(' ') || undefined;

  return (
    <div class="flex flex-col gap-1.5" data-field={id}>
      <label for={id} class="font-medium text-text">
        {label}
      </label>
      {hint ? (
        <p id={hintId} class="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {unitDescription ? (
        <span id={unitId} class="sr-only">
          {unitDescription}
        </span>
      ) : null}
      {error && errorId ? (
        <FieldErrorMessage id={errorId} prefix={errorPrefix} message={error} />
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {noticeId ? (
        <p id={noticeId} class="text-sm text-muted">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
