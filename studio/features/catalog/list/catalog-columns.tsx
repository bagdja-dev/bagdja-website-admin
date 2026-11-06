'use client';

import Link from 'next/link';

import { RowActions, type DataColumn } from '@/studio/ui/data-list';
import { Icon } from '@/studio/ui/icons';
import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';

import { editorHref, typeMeta } from '../catalog-types';
import { coverOf, formatPriceRange, formatRupiah, metaInt, metaOf, priceOf, stockOf, variantLabelOf } from '../product-utils';
import type { CatalogRow } from './catalog-query';

export interface CatalogColumnOptions {
  categoryLabel: (categoryId: string) => string | null;
  isExpanded: (id: string) => boolean;
  toggleExpanded: (id: string) => void;
  onToggleVisible: (row: CatalogRow, next: boolean) => void;
  onDelete: (row: CatalogRow) => void;
  onEdit: (row: CatalogRow) => void;
}

function Thumb({ row }: { row: CatalogRow }) {
  const src = coverOf(row.product);
  const size = row.kind === 'variant' ? 'h-[30px] w-[30px] rounded-[7px] opacity-80' : 'h-11 w-11 rounded-[9px]';
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- URL aset tenant dari banyak host
    <img src={src} alt="" className={`shrink-0 object-cover ${size}`} loading="lazy" />
  ) : (
    <span className={`flex shrink-0 items-center justify-center bg-default-100 text-default-500 ${size}`}>
      <Icon name="image" size={row.kind === 'variant' ? 14 : 18} />
    </span>
  );
}

function subtitle(row: CatalogRow, categoryLabel: CatalogColumnOptions['categoryLabel']): string {
  if (row.kind === 'variant') return `Varian dari ${row.parentName ?? 'item induk'}`;
  const parts: string[] = [];
  const cat = row.product.category_id ? categoryLabel(row.product.category_id) : null;
  parts.push(cat ?? 'Tanpa kategori');
  if (row.variants.length > 0) parts.push(`${row.variants.length} varian`);
  if (row.product.quotable) parts.push('perlu penawaran');
  return parts.join(' · ');
}

function priceText(row: CatalogRow): string {
  const p = row.product;
  if (row.kind === 'item' && row.variants.length > 0) {
    const prices = row.variants.map(priceOf).filter((n): n is number => n !== null);
    return formatPriceRange(prices.length ? prices : [priceOf(p) ?? 0]);
  }
  const base = formatRupiah(priceOf(p));
  const unit = p.uom?.symbol ? ` /${p.uom.symbol}` : '';
  return `${p.quotable ? 'Mulai ' : ''}${base}${unit}`;
}

function StockCell({ row }: { row: CatalogRow }) {
  const p = row.product;
  const meta = metaOf(p);
  if (p.type === 'service') {
    const minutes = metaInt(meta, 'duration_minutes');
    return <span className="text-[13px] text-default-700">{minutes ? `${minutes} menit` : '—'}</span>;
  }
  if (p.type === 'gathering') {
    const max = metaInt(meta, 'max_attendees');
    return <span className="text-[13px] text-default-700">{max ? `Maks ${max} peserta` : '—'}</span>;
  }
  if (p.type === 'digital') return <span className="text-[13px] text-default-700">File digital</span>;
  const stocks = row.kind === 'item' && row.variants.length > 0 ? row.variants.map(stockOf) : [stockOf(p)];
  const known = stocks.filter((n): n is number => n !== null);
  if (known.length === 0) return <span className="text-[13px] text-default-500">—</span>;
  const total = known.reduce((a, b) => a + b, 0);
  if (total <= 0) return <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-xs font-bold text-[#B91C1C]">Habis</span>;
  if (total <= 3) return <span className="rounded-full bg-[#FFFBEB] px-2 py-0.5 text-xs font-bold text-[#B45309]">{total}</span>;
  return <span className="text-[13px] tabular-nums text-default-700">{total}</span>;
}

export function catalogColumns(opts: CatalogColumnOptions): DataColumn<CatalogRow>[] {
  return [
    {
      key: 'item',
      header: 'Item',
      mobile: 'title',
      render: (row, ctx) => {
        const isVariant = row.kind === 'variant';
        const name = isVariant ? variantLabelOf(row.product, row.parentName ?? undefined) : row.product.name;
        const expandable = row.kind === 'item' && row.variants.length > 0;
        const open = opts.isExpanded(row.id);
        const indent = isVariant ? (ctx.variant === 'card' ? 'pl-4' : 'pl-[52px]') : expandable || ctx.variant === 'card' ? '' : 'pl-[38px]';
        return (
          <span className={`flex min-w-0 items-center gap-2.5 ${indent}`}>
            {expandable && (
              <button
                type="button"
                onClick={() => opts.toggleExpanded(row.id)}
                aria-expanded={open}
                aria-label={`${open ? 'Sembunyikan' : 'Tampilkan'} varian ${row.product.name}`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-default-600 hover:bg-default-100"
              >
                <Icon name="chevronDown" size={16} className={open ? '' : '-rotate-90'} />
              </button>
            )}
            <Thumb row={row} />
            <Link href={editorHref(row.product)} className="min-w-0 no-underline">
              <span className={`block truncate text-foreground ${isVariant ? 'text-[13px] font-semibold' : 'font-bold'} ${row.product.is_active ? '' : 'text-default-500'} md:max-w-[22rem]`}>
                {name}
              </span>
              <span className="block truncate text-xs text-default-600 md:max-w-[22rem]">{subtitle(row, opts.categoryLabel)}</span>
            </Link>
          </span>
        );
      },
    },
    {
      key: 'type',
      header: 'Tipe',
      mobile: 'meta',
      render: (row) => {
        if (row.kind === 'variant') return null;
        const meta = typeMeta(row.product.type);
        return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-bold ${meta.badgeClass}`}>{meta.label}</span>;
      },
    },
    {
      key: 'price',
      header: 'Harga',
      mobile: 'meta',
      render: (row) => <span className="whitespace-nowrap text-sm tabular-nums text-foreground">{priceText(row)}</span>,
    },
    { key: 'stock', header: 'Stok / durasi', mobile: 'meta', render: (row) => <StockCell row={row} /> },
    {
      key: 'visible',
      header: 'Tampil',
      mobile: 'trailing',
      render: (row, ctx) => (
        <StatusSwitch
          size={ctx.variant === 'card' ? 'md' : 'sm'}
          isSelected={row.product.is_active}
          onChange={(next) => opts.onToggleVisible(row, next)}
          ariaLabel={`Tampilkan di website: ${row.product.name}`}
          isDisabled={!ctx.canAct('editor')}
          isPending={ctx.isPending(row.id) || (row.parentId !== null && ctx.isPending(row.parentId))}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      hideHeader: true,
      align: 'end',
      mobile: 'actions',
      render: (row, ctx) => (
        <RowActions
          row={row}
          ctx={ctx}
          rowLabel={row.product.name}
          actions={[
            { key: 'edit', label: ctx.canAct('editor') ? 'Edit' : 'Lihat', onAction: opts.onEdit },
            { key: 'delete', label: 'Hapus', icon: 'trash', danger: true, minRole: 'admin', onAction: opts.onDelete },
          ]}
        />
      ),
    },
  ];
}
