import type { ReactNode } from 'react';

import type { TenantRole } from '@/studio/api/types';

import type { IconName } from '../icons';

export interface DataRow {
  id: string;
}

/** Penempatan kolom di tampilan kartu (<768px). */
export type MobileSlot = 'media' | 'title' | 'subtitle' | 'meta' | 'trailing' | 'actions' | 'hidden';

export interface ColumnContext {
  /** Tempat sel dirender: tabel (≥768px) atau kartu HP. */
  variant: 'table' | 'card';
  /** Role user memenuhi `minRole`? (tanpa minRole = selalu boleh) */
  canAct: (minRole?: TenantRole) => boolean;
  isPending: (rowId: string) => boolean;
}

export interface DataColumn<T extends DataRow> {
  key: string;
  header: string;
  render: (row: T, ctx: ColumnContext) => ReactNode;
  align?: 'start' | 'center' | 'end';
  /** Kolom disembunyikan bila role kurang. */
  minRole?: TenantRole;
  mobile?: MobileSlot;
  /** Header hanya untuk pembaca layar (mis. kolom aksi). */
  hideHeader?: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBase<T extends DataRow> {
  key: string;
  label: string;
  allLabel: string;
  options: FilterOption[];
  /** Nilai baris untuk filter & hitungan (mode client). */
  getValue: (row: T) => string | null | undefined;
}

export interface ChipFilterDef<T extends DataRow> extends FilterBase<T> {
  kind: 'chip';
}

export interface SelectFilterDef<T extends DataRow> extends FilterBase<T> {
  kind: 'select';
}

export type FilterDef<T extends DataRow> = ChipFilterDef<T> | SelectFilterDef<T>;

/** '' = semua. */
export type FilterValues = Record<string, string>;

/** Hitungan per filter → per nilai opsi. */
export type FilterCounts = Record<string, Record<string, number>>;

export interface RowAction<T extends DataRow> {
  key: string;
  label: string;
  icon?: IconName;
  danger?: boolean;
  minRole?: TenantRole;
  isHidden?: (row: T) => boolean;
  onAction: (row: T) => void;
}

export interface BulkAction<T extends DataRow> {
  key: string;
  label: string;
  icon?: IconName;
  /** Aksi bahaya selalu lewat konfirmasi. */
  danger?: boolean;
  minRole?: TenantRole;
  confirm?: { title: string; description?: string; confirmLabel?: string };
  onRun: (rows: T[]) => Promise<void> | void;
}

export interface ToolbarAction {
  key: string;
  label: string;
  icon?: IconName;
  minRole?: TenantRole;
  onPress: () => void;
}

export interface PrimaryAction {
  label: string;
  icon?: IconName;
  minRole?: TenantRole;
  href?: string;
  onPress?: () => void;
}

export interface ReorderConfig<T extends DataRow> {
  minRole?: TenantRole;
  /** Simpan urutan baru (seluruh data, bukan yang terfilter). Lempar galat → rollback. */
  onSave: (ordered: T[]) => Promise<void>;
}

export interface ServerQuery {
  page: number;
  pageSize: number;
  search: string;
  filters: FilterValues;
}

export interface ServerPage<T extends DataRow> {
  items: T[];
  total: number;
  counts?: FilterCounts;
}

export type EmptyKind = 'none' | 'no-data' | 'no-match';
