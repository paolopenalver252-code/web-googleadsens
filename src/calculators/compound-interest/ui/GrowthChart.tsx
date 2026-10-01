/**
 * Gráfico de evolución del saldo (SVG propio, sin librerías). Se carga de
 * forma diferida tras el primer resultado (docs/performance.md).
 *
 * Accesibilidad: el dibujo es decorativo para los lectores de pantalla
 * (aria-hidden); la información está en texto (explicación del resultado y
 * tabla anual). El contenedor es un control deslizante que recorre los
 * periodos con las flechas del teclado, y su valor (aria-valuetext) es la
 * descripción del punto activo, la misma que muestra el panel de detalle.
 * Sin animaciones ni estilos inline (CSP): solo atributos SVG y clases.
 */
import type { TargetedKeyboardEvent, TargetedPointerEvent } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

import type { GrowthChartModel } from './chart-data';
import { compoundInterestCopy } from './copy.es-ES';

const copy = compoundInterestCopy.chart;

const HEIGHT = 240;
const PADDING = { top: 20, right: 12, bottom: 28, left: 12 } as const;
/** Ancho mientras no se ha medido el contenedor (y en entornos sin maquetación). */
const FALLBACK_WIDTH = 640;

export interface GrowthChartProps {
  readonly id: string;
  readonly model: GrowthChartModel;
}

export function GrowthChart({ id, model }: GrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const lastIndex = model.points.length - 1;
  const [selected, setSelected] = useState(lastIndex);
  const active = Math.min(selected, lastIndex);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (element === null) return undefined;
    const measure = () => {
      const measured = Math.floor(element.getBoundingClientRect().width);
      if (measured > 0) setWidth(measured);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const baseline = PADDING.top + plotHeight;
  const x = (month: number) => PADDING.left + (month / model.durationMonths) * plotWidth;
  const y = (value: number) => PADDING.top + (1 - value / model.yMax) * plotHeight;

  /** Punto "x,y" de un trazado SVG, en píxeles. */
  const at = (month: number, value: number) =>
    `${String(fixed(x(month)))},${String(fixed(y(value)))}`;
  const line = (
    points: readonly GrowthChartModel['points'][number][],
    key: 'balance' | 'invested',
  ) => points.map((point) => at(point.month, point[key])).join(' L');
  const balanceLine = `M${line(model.points, 'balance')}`;
  const investedLine = `M${line(model.points, 'invested')}`;
  const first = model.points[0];
  const last = model.points[lastIndex];
  const investedArea =
    first && last ? `${investedLine} L${at(last.month, 0)} L${at(first.month, 0)} Z` : '';
  const interestArea = `${balanceLine} L${line([...model.points].reverse(), 'invested')} Z`;

  const point = model.points[active];

  const select = (index: number) => {
    setSelected(Math.max(0, Math.min(lastIndex, index)));
  };

  const selectAt = (event: TargetedPointerEvent<HTMLDivElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const month = ((event.clientX - left - PADDING.left) / plotWidth) * model.durationMonths;
    let nearest = 0;
    model.points.forEach((candidate, index) => {
      const current = model.points[nearest];
      if (current && Math.abs(candidate.month - month) < Math.abs(current.month - month)) {
        nearest = index;
      }
    });
    select(nearest);
  };

  const onKeyDown = (event: TargetedKeyboardEvent<HTMLDivElement>) => {
    const moves: Readonly<Record<string, number>> = {
      ArrowRight: active + 1,
      ArrowUp: active + 1,
      ArrowLeft: active - 1,
      ArrowDown: active - 1,
      Home: 0,
      End: lastIndex,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  };

  return (
    <div class="flex flex-col gap-3">
      <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-text">
        <li class="flex items-center gap-2">
          <svg aria-hidden="true" width="24" height="10" class="shrink-0">
            <line x1="0" y1="5" x2="24" y2="5" class="stroke-accent" stroke-width="3" />
          </svg>
          {copy.legendBalance}
        </li>
        <li class="flex items-center gap-2">
          <svg aria-hidden="true" width="24" height="10" class="shrink-0">
            <line
              x1="0"
              y1="5"
              x2="24"
              y2="5"
              class="stroke-muted"
              stroke-width="2"
              stroke-dasharray="5 3"
            />
          </svg>
          {copy.legendInvested}
        </li>
      </ul>

      <p
        id={`${id}-detail`}
        class="min-h-12 rounded-control bg-surface-muted px-3 py-2 text-sm text-text tabular-nums"
      >
        {point?.description}
      </p>

      <div
        ref={containerRef}
        id={id}
        role="slider"
        tabIndex={0}
        aria-label={copy.explore}
        aria-describedby={`${id}-instructions`}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={active}
        aria-valuetext={point?.description}
        class="min-w-0 cursor-crosshair touch-pan-y rounded-control"
        onKeyDown={onKeyDown}
        onPointerMove={selectAt}
        onPointerDown={selectAt}
      >
        {/* Ancho por CSS (nunca desborda) y viewBox con el ancho medido: 1 unidad = 1 px,
            así el texto no se deforma al escalar. */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${String(width)} ${String(HEIGHT)}`}
          height={HEIGHT}
          class="block w-full overflow-visible"
        >
          {model.yTicks.map((tick) => (
            <line
              key={`grid-${tick.label}`}
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={fixed(y(tick.value))}
              y2={fixed(y(tick.value))}
              class="stroke-border"
              stroke-width="1"
            />
          ))}

          <path d={investedArea} class="fill-border-strong/15" />
          <path d={interestArea} class="fill-accent/20" />
          <path
            d={investedLine}
            fill="none"
            class="stroke-muted"
            stroke-width="2"
            stroke-dasharray="5 3"
            stroke-linejoin="round"
          />
          <path
            d={balanceLine}
            fill="none"
            class="stroke-accent"
            stroke-width="3"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          {model.yTicks.map((tick) => (
            <text
              key={`label-${tick.label}`}
              x={PADDING.left + 2}
              y={fixed(y(tick.value) - 5)}
              class="fill-muted stroke-surface text-xs"
              stroke-width="4"
              paint-order="stroke"
            >
              {tick.label}
            </text>
          ))}

          {model.xTicks.map((tick, index) => (
            <text
              key={`x-${tick.label}`}
              x={fixed(x(tick.value))}
              y={HEIGHT - 8}
              text-anchor={index === 0 ? 'start' : 'middle'}
              class="fill-muted text-xs"
            >
              {tick.label}
            </text>
          ))}

          {point ? (
            <g>
              <line
                x1={fixed(x(point.month))}
                x2={fixed(x(point.month))}
                y1={PADDING.top}
                y2={baseline}
                class="stroke-border-strong"
                stroke-width="1"
              />
              <circle
                cx={fixed(x(point.month))}
                cy={fixed(y(point.invested))}
                r="4"
                class="fill-surface stroke-muted"
                stroke-width="2"
              />
              <circle
                cx={fixed(x(point.month))}
                cy={fixed(y(point.balance))}
                r="5"
                class="fill-surface stroke-accent"
                stroke-width="3"
              />
            </g>
          ) : null}
        </svg>
      </div>

      <p id={`${id}-instructions`} class="text-xs text-muted">
        {copy.axes(model.unit)} {copy.instructions}
      </p>
    </div>
  );
}

/** Coordenadas en píxeles con 1 decimal: suficiente para dibujar y acorta el SVG. */
function fixed(value: number): number {
  return Math.round(value * 10) / 10;
}
