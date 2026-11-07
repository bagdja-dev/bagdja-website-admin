'use client';

import { Checkbox, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';

import type { RowSelection } from './use-row-selection';
import type { ColumnContext, DataColumn, DataRow } from './types';
import { rowClickHandler } from './row-click';

const SELECT_KEY = '__select';

export interface DataTableProps<T extends DataRow> {
  ariaLabel: string;
  rows: T[];
  columns: DataColumn<T>[];
  ctx: ColumnContext;
  selectable: boolean;
  selection: RowSelection;
  getRowLabel: (row: T) => string;
  isRowMuted?: (row: T) => boolean;
  /** Baris tanpa checkbox (mis. baris varian di bawah item induk). Default: semua bisa dipilih. */
  isRowSelectable?: (row: T) => boolean;
  /** Klik di area kosong baris membuka item (mis. detail pesanan). Klik pada kontrol di baris diabaikan. */
  onRowClick?: (row: T) => void;
}

type HeaderCell = { key: string; header: string; align?: 'start' | 'center' | 'end'; hideHeader?: boolean };

/**
 * Tabel ≥768px. Seleksi memakai kolom checkbox sendiri (bukan `selectionMode`
 * HeroUI) supaya klik switch/tombol di baris tidak ikut memilih baris.
 */
export function DataTable<T extends DataRow>({
  ariaLabel,
  rows,
  columns,
  ctx,
  selectable,
  selection,
  getRowLabel,
  isRowMuted,
  isRowSelectable,
  onRowClick,
}: DataTableProps<T>) {
  const pageIds = rows.filter((r) => isRowSelectable?.(r) ?? true).map((r) => r.id);
  const selectedOnPage = pageIds.filter((id) => selection.selectedIds.has(id)).length;
  const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  const headers: HeaderCell[] = [
    ...(selectable ? [{ key: SELECT_KEY, header: 'Pilih', hideHeader: true }] : []),
    ...columns.map((c) => ({ key: c.key, header: c.header, align: c.align, hideHeader: c.hideHeader })),
  ];
  const columnByKey = new Map(columns.map((c) => [c.key, c]));

  return (
    <Table
      aria-label={ariaLabel}
      removeWrapper
      classNames={{
        th: 'h-10 bg-default-50 text-xs font-semibold text-default-600 first:rounded-none last:rounded-none first:pl-4 last:pr-4',
        td: 'py-3 align-middle text-sm first:pl-4 last:pr-4',
        tr: 'border-t border-default-100',
      }}
    >
      <TableHeader columns={headers}>
        {(col) => (
          <TableColumn key={col.key} align={col.align} className={col.key === SELECT_KEY ? 'w-10' : undefined}>
            {col.key === SELECT_KEY ? (
              <Checkbox
                aria-label="Pilih semua di halaman ini"
                isSelected={allSelected}
                isIndeterminate={selectedOnPage > 0 && !allSelected}
                onValueChange={(value) => selection.setMany(pageIds, value)}
              />
            ) : col.hideHeader ? (
              <span className="sr-only">{col.header}</span>
            ) : (
              col.header
            )}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody items={rows}>
        {(row) => (
          <TableRow
            key={row.id}
            onClick={rowClickHandler(row, onRowClick)}
            className={`${selection.selectedIds.has(row.id) ? 'bg-primary-50' : isRowMuted?.(row) ? 'bg-default-50' : ''} ${
              onRowClick ? 'cursor-pointer hover:bg-default-50' : ''
            }`}
          >
            {(columnKey) => {
              const key = String(columnKey);
              if (key === SELECT_KEY) {
                if (isRowSelectable && !isRowSelectable(row)) return <TableCell>{null}</TableCell>;
                return (
                  <TableCell>
                    <Checkbox
                      aria-label={`Pilih ${getRowLabel(row)}`}
                      isSelected={selection.selectedIds.has(row.id)}
                      onValueChange={() => selection.toggle(row.id)}
                    />
                  </TableCell>
                );
              }
              const column = columnByKey.get(key);
              return <TableCell>{column ? column.render(row, ctx) : null}</TableCell>;
            }}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
