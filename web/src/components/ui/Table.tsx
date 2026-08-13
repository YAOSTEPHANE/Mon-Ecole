import React, { isValidElement } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  /** Texte et espacements plus compacts (ex. liste élèves) */
  dense?: boolean;
}

function formatCellValue(value: unknown): React.ReactNode {
  if (value == null) return '—';
  if (isValidElement(value)) return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function Table<T extends { id?: string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'Aucune donnée disponible',
  dense = false,
}: TableProps<T>) {
  const thClass = dense
    ? 'px-4 py-2.5 text-left text-[10px] font-semibold text-amber-50/90 uppercase tracking-[0.14em]'
    : 'px-6 py-3.5 text-left text-xs font-semibold text-amber-50 uppercase tracking-[0.12em]';
  const tdClass = dense
    ? 'px-4 py-2 whitespace-nowrap text-xs text-stone-800'
    : 'px-6 py-4 whitespace-nowrap text-sm text-stone-800';
  const emptyTdClass = dense ? 'px-4 py-6 text-center text-stone-500 text-xs' : 'px-6 py-8 text-center text-stone-500';

  return (
    <div className="overflow-x-auto rounded-2xl shadow-dash-card ring-1 ring-stone-200/70">
      <table className="min-w-full divide-y divide-stone-200/70">
        <thead className="border-b border-cptb-gold/25 bg-gradient-to-r from-[#0a0f2e] via-[#001270] to-stone-950">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={thClass}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100/90 bg-white/96">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={emptyTdClass}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={item.id || index}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors duration-200 hover:bg-amber-50/50 ${onRowClick ? 'cursor-pointer' : ''} ${
                  index % 2 === 1 ? 'bg-stone-50/60' : ''
                }`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={tdClass}>
                    {column.render ? column.render(item) : formatCellValue((item as Record<string, unknown>)[column.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;






