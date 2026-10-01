import type { ComponentChildren } from 'preact';

export type ResultStatus = 'idle' | 'current' | 'stale';

export interface ResultPanelProps {
  readonly id: string;
  readonly heading: string;
  readonly status: ResultStatus;
  readonly idleMessage: string;
  readonly staleMessage: string;
  readonly children?: ComponentChildren;
}

/**
 * Zona de resultados. NO es una región aria-live (leería tablas enteras):
 * el anuncio breve lo hace CalculatorShell con role="status". El estado
 * "desactualizado" se comunica con texto, no con color ni opacidad.
 */
export function ResultPanel({
  id,
  heading,
  status,
  idleMessage,
  staleMessage,
  children,
}: ResultPanelProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      class="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id={headingId} class="text-lg font-semibold text-text">
        {heading}
      </h2>
      {status === 'idle' ? (
        <p class="mt-2 text-muted">{idleMessage}</p>
      ) : (
        <>
          {status === 'stale' ? (
            <p class="mt-3 rounded-control bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
              {staleMessage}
            </p>
          ) : null}
          <div class="mt-4">{children}</div>
        </>
      )}
    </section>
  );
}
