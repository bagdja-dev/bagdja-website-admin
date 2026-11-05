'use client';

import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react';

import { Icon } from '../icons';
import type { ColumnContext, DataRow, RowAction } from './types';

interface RowActionsProps<T extends DataRow> {
  row: T;
  actions: RowAction<T>[];
  ctx: ColumnContext;
  rowLabel: string;
}

const TEXT_BUTTON =
  'inline-flex min-h-9 items-center rounded-lg border border-default-200 bg-white px-3 text-[13px] font-semibold text-foreground hover:bg-default-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';

/**
 * Artboard FAQ-List: aksi utama baris = tombol garis teks ("Edit"). Aksi lain
 * (termasuk hapus) masuk menu "lainnya". Aksi tanpa hak role disembunyikan.
 */
export function RowActions<T extends DataRow>({ row, actions, ctx, rowLabel }: RowActionsProps<T>) {
  const visible = actions.filter((a) => ctx.canAct(a.minRole) && !a.isHidden?.(row));
  if (visible.length === 0) return null;
  const primary: RowAction<T> | null = visible[0].danger ? null : visible[0];
  const rest: RowAction<T>[] = primary ? visible.slice(1) : visible;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {primary && (
        <button type="button" onClick={() => primary.onAction(row)} aria-label={`${primary.label}: ${rowLabel}`} className={TEXT_BUTTON}>
          {primary.label}
        </button>
      )}
      {rest.length > 0 && (
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <button type="button" aria-label={`Aksi lain: ${rowLabel}`} className={`${TEXT_BUTTON} px-2`}>
              <Icon name="more" size={18} />
            </button>
          </DropdownTrigger>
          <DropdownMenu aria-label={`Aksi untuk ${rowLabel}`} onAction={(key) => rest.find((a) => a.key === String(key))?.onAction(row)}>
            {rest.map((action) => (
              <DropdownItem
                key={action.key}
                color={action.danger ? 'danger' : 'default'}
                className={action.danger ? 'text-[#B91C1C]' : undefined}
                startContent={action.icon ? <Icon name={action.icon} size={16} /> : undefined}
              >
                {action.label}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
      )}
    </div>
  );
}
