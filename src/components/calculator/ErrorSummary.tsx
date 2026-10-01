import type { Ref } from 'preact';

export interface ErrorSummaryItem {
  /** Id del campo al que enlaza; ausente en errores del formulario completo. */
  readonly fieldId?: string | undefined;
  readonly message: string;
}

export interface ErrorSummaryProps {
  readonly id: string;
  readonly title: string;
  readonly items: readonly ErrorSummaryItem[];
  /** El contenedor recibe el foco al enviar con errores (tabIndex=-1). */
  readonly containerRef: Ref<HTMLDivElement>;
}

/**
 * Resumen de errores al enviar el formulario. Recibe el foco para que el
 * lector de pantalla lo anuncie, y cada error enlaza a su campo: al activarlo
 * se lleva el foco al control (un ancla sola solo desplazaría la página).
 */
export function ErrorSummary({ id, title, items, containerRef }: ErrorSummaryProps) {
  const titleId = `${id}-title`;
  return (
    <div
      ref={containerRef}
      id={id}
      role="group"
      aria-labelledby={titleId}
      tabIndex={-1}
      class="rounded-card border-2 border-danger bg-danger-soft p-4"
    >
      <h2 id={titleId} class="font-semibold text-danger">
        {title}
      </h2>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-text">
        {items.map((item, index) => (
          <li key={`${item.fieldId ?? 'form'}-${String(index)}`}>
            {item.fieldId === undefined ? (
              item.message
            ) : (
              <a
                href={`#${item.fieldId}`}
                class="text-danger"
                onClick={(event) => {
                  const target = document.getElementById(item.fieldId ?? '');
                  if (target === null) return;
                  event.preventDefault();
                  target.scrollIntoView({ block: 'center' });
                  target.focus({ preventScroll: true });
                }}
              >
                {item.message}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
