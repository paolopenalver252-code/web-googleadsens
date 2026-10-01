export interface DataTableColumn<K extends string> {
  readonly key: K;
  readonly header: string;
  /** Las cifras se alinean al final para poder compararlas. */
  readonly align?: 'start' | 'end';
  /** La celda de esta columna actúa como cabecera de fila (<th scope="row">). */
  readonly rowHeader?: boolean;
}

export interface DataTableProps<K extends string> {
  readonly id: string;
  readonly caption: string;
  readonly columns: readonly DataTableColumn<K>[];
  /** Valores YA formateados: la tabla no formatea ni calcula. */
  readonly rows: readonly Readonly<Record<K, string>>[];
}

/**
 * Tabla de datos accesible: <caption>, cabeceras con scope y contenedor
 * desplazable con foco de teclado (en móvil una tabla ancha se desplaza en
 * horizontal sin desbordar la página). Es también la alternativa accesible
 * de cualquier gráfico.
 */
export function DataTable<K extends string>({ id, caption, columns, rows }: DataTableProps<K>) {
  const captionId = `${id}-caption`;
  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      class="overflow-x-auto rounded-control border border-border"
    >
      <table id={id} class="w-full border-collapse text-sm">
        <caption id={captionId} class="px-3 py-2 text-left font-medium text-text">
          {caption}
        </caption>
        <thead class="bg-surface-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                class={`px-3 py-2 font-semibold text-text ${column.align === 'end' ? 'text-right' : 'text-left'}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={String(rowIndex)} class="border-t border-border">
              {columns.map((column) => {
                const alignment = column.align === 'end' ? 'text-right tabular-nums' : 'text-left';
                return column.rowHeader === true ? (
                  <th
                    key={column.key}
                    scope="row"
                    class={`px-3 py-2 font-medium text-text ${alignment}`}
                  >
                    {row[column.key]}
                  </th>
                ) : (
                  <td key={column.key} class={`px-3 py-2 text-text ${alignment}`}>
                    {row[column.key]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
