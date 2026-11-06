'use client';

import { Checkbox } from '@heroui/react';

import type { RowSelection } from './use-row-selection';
import type { ColumnContext, DataColumn, DataRow, MobileSlot } from './types';
import { rowClickHandler } from './row-click';

export interface DataCardListProps<T extends DataRow> {
  ariaLabel: string;
  rows: T[];
  columns: DataColumn<T>[];
  ctx: ColumnContext;
  selectable: boolean;
  selection: RowSelection;
  getRowLabel: (row: T) => string;
  /** Baris "redup" (mis. nonaktif) → latar #FAFAFA seperti artboard FAQ-HP. */
  isRowMuted?: (row: T) => boolean;
  /** Kartu tanpa checkbox (mis. varian). Default: semua bisa dipilih. */
  isRowSelectable?: (row: T) => boolean;
  /** Ketuk kartu membuka item. Ketukan pada kontrol di kartu diabaikan. */
  onRowClick?: (row: T) => void;
}

function bySlot<T extends DataRow>(columns: DataColumn<T>[], slot: MobileSlot): DataColumn<T>[] {
  return columns.filter((c) => (c.mobile ?? 'meta') === slot);
}

/** Kartu <768px (artboard FAQ-HP): kartu terpisah radius 14, judul 15px tebal, meta, switch di kanan. */
export function DataCardList<T extends DataRow>({
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
}: DataCardListProps<T>) {
  const media = bySlot(columns, 'media');
  const titles = [...bySlot(columns, 'title'), ...bySlot(columns, 'subtitle')];
  const meta = bySlot(columns, 'meta');
  const trailing = bySlot(columns, 'trailing');
  const actions = bySlot(columns, 'actions');
  const cardCtx: ColumnContext = { ...ctx, variant: 'card' };

  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-2">
      {rows.map((row) => {
        const selected = selection.selectedIds.has(row.id);
        const muted = isRowMuted?.(row) ?? false;
        return (
          <li
            key={row.id}
            onClick={rowClickHandler(row, onRowClick)}
            className={`flex items-center gap-3 rounded-[14px] border p-3.5 ${onRowClick ? 'cursor-pointer active:bg-default-50' : ''} ${
              selected ? 'border-primary-200 bg-primary-50' : `border-default-200 ${muted ? 'bg-default-50' : 'bg-white'}`
            }`}
          >
            {selectable && (isRowSelectable?.(row) ?? true) && (
              <Checkbox aria-label={`Pilih ${getRowLabel(row)}`} isSelected={selected} onValueChange={() => selection.toggle(row.id)} />
            )}
            {media.map((c) => (
              <div key={c.key} className="shrink-0">
                {c.render(row, cardCtx)}
              </div>
            ))}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {titles.map((c) => (
                <div key={c.key}>
                  {c.render(row, cardCtx)}
                </div>
              ))}
              {meta.length > 0 && (
                <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-default-500">
                  {meta.map((c) => (
                    <div key={c.key} className="flex items-center">
                      <dt className="sr-only">{c.header}</dt>
                      <dd>{c.render(row, cardCtx)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {trailing.map((c) => (
              <div key={c.key} className="shrink-0">
                {c.render(row, cardCtx)}
              </div>
            ))}
            {actions.length > 0 && (
              <div className="shrink-0">
                {actions.map((c) => (
                  <div key={c.key}>{c.render(row, cardCtx)}</div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
