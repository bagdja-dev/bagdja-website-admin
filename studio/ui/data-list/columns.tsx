'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type { TenantRole } from '@/studio/api/types';
import { formatCurrency, formatDate } from '@/studio/lib/format';

import { Icon } from '../icons';
import { StatusSwitch } from '../primitives/StatusSwitch';
import { RowActions } from './RowActions';
import type { DataColumn, DataRow, RowAction } from './types';

export function titleColumn<T extends DataRow>(opts: {
  header: string;
  getTitle: (row: T) => string;
  getSubtitle?: (row: T) => string | null | undefined;
  getHref?: (row: T) => string;
  onOpen?: (row: T) => void;
  key?: string;
}): DataColumn<T> {
  return {
    key: opts.key ?? 'title',
    header: opts.header,
    mobile: 'title',
    render: (row, ctx) => {
      const title = opts.getTitle(row);
      const subtitle = opts.getSubtitle?.(row);
      const card = ctx.variant === 'card';
      const size = card ? 'text-[15px] leading-snug' : 'truncate text-sm';
      const cls = `block w-full text-left font-bold text-foreground hover:text-primary focus-visible:outline-primary ${size}`;
      let titleNode = <span className={`block font-bold text-foreground ${size}`}>{title}</span>;
      if (opts.getHref) {
        titleNode = (
          <Link href={opts.getHref(row)} className={cls}>
            {title}
          </Link>
        );
      } else if (opts.onOpen) {
        const open = opts.onOpen;
        titleNode = (
          <button type="button" className={cls} onClick={() => open(row)}>
            {title}
          </button>
        );
      }
      return (
        <div className={card ? 'min-w-0' : 'min-w-0 max-w-[28rem]'}>
          {titleNode}
          {subtitle && <p className={`mt-0.5 text-[13px] text-default-600 ${card ? 'line-clamp-2' : 'truncate'}`}>{subtitle}</p>}
        </div>
      );
    },
  };
}

export type ChipTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

/** Warna pill (artboard FAQ-List: 12px tebal, padding 3/10). Status tidak memakai burgundi (§3.13 #4). */
const CHIP_TONE: Readonly<Record<ChipTone, string>> = {
  default: 'bg-default-100 text-default-700',
  primary: 'bg-primary-50 text-primary',
  success: 'bg-[#F0FDF4] text-success',
  warning: 'bg-[#FFFBEB] text-[#92400E]',
  danger: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export function Pill({ tone = 'default', children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-bold ${CHIP_TONE[tone]}`}>{children}</span>;
}

export function chipColumn<T extends DataRow>(opts: {
  key: string;
  header: string;
  getValue: (row: T) => string | null | undefined;
  /** Label & warna per nilai. */
  options: Record<string, { label: string; tone?: ChipTone }>;
}): DataColumn<T> {
  return {
    key: opts.key,
    header: opts.header,
    mobile: 'meta',
    render: (row) => {
      const value = opts.getValue(row);
      if (!value) return <span className="text-default-500">—</span>;
      const option = opts.options[value] ?? { label: value, tone: 'default' as const };
      return <Pill tone={option.tone}>{option.label}</Pill>;
    },
  };
}

export function switchColumn<T extends DataRow>(opts: {
  key: string;
  header: string;
  getValue: (row: T) => boolean;
  /** Biasanya `list.optimisticUpdate(...)` — rollback + toast ditangani di sana. */
  onToggle: (row: T, next: boolean) => void;
  ariaLabel: (row: T) => string;
  /** Di bawah role ini switch tampil read-only (bukan disembunyikan). */
  minRole?: TenantRole;
}): DataColumn<T> {
  return {
    key: opts.key,
    header: opts.header,
    mobile: 'trailing',
    render: (row, ctx) => (
      <StatusSwitch
        size={ctx.variant === 'card' ? 'md' : 'sm'}
        isSelected={opts.getValue(row)}
        onChange={(next) => opts.onToggle(row, next)}
        ariaLabel={opts.ariaLabel(row)}
        isDisabled={!ctx.canAct(opts.minRole)}
        isPending={ctx.isPending(row.id)}
      />
    ),
  };
}

export function dateColumn<T extends DataRow>(opts: {
  key: string;
  header: string;
  getValue: (row: T) => string | null | undefined;
  withTime?: boolean;
}): DataColumn<T> {
  return {
    key: opts.key,
    header: opts.header,
    mobile: 'meta',
    render: (row) => <span className="whitespace-nowrap text-sm text-default-600">{formatDate(opts.getValue(row), opts.withTime)}</span>,
  };
}

export function currencyColumn<T extends DataRow>(opts: {
  key: string;
  header: string;
  getValue: (row: T) => number | string | null | undefined;
}): DataColumn<T> {
  return {
    key: opts.key,
    header: opts.header,
    align: 'end',
    mobile: 'meta',
    render: (row) => <span className="whitespace-nowrap text-sm tabular-nums text-foreground">{formatCurrency(opts.getValue(row))}</span>,
  };
}

export function imageColumn<T extends DataRow>(opts: {
  key: string;
  header: string;
  getSrc: (row: T) => string | null | undefined;
  getAlt: (row: T) => string;
}): DataColumn<T> {
  return {
    key: opts.key,
    header: opts.header,
    mobile: 'media',
    hideHeader: true,
    render: (row) => {
      const src = opts.getSrc(row);
      return src ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL aset tenant dari banyak host; next/image butuh domain terdaftar
        <img src={src} alt={opts.getAlt(row)} className="h-10 w-10 shrink-0 rounded-medium object-cover" loading="lazy" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-medium bg-default-100 text-default-500">
          <Icon name="image" size={18} />
        </span>
      );
    },
  };
}

export function actionsColumn<T extends DataRow>(opts: {
  actions: RowAction<T>[];
  getRowLabel: (row: T) => string;
}): DataColumn<T> {
  return {
    key: 'actions',
    header: 'Aksi',
    align: 'end',
    mobile: 'actions',
    hideHeader: true,
    render: (row, ctx) => <RowActions row={row} actions={opts.actions} ctx={ctx} rowLabel={opts.getRowLabel(row)} />,
  };
}
