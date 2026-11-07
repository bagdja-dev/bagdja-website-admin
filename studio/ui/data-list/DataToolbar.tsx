'use client';

import { Icon } from '../icons';
import type { DataRow, FilterCounts, FilterDef, FilterValues, ToolbarAction } from './types';

export interface DataToolbarProps<T extends DataRow> {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters: FilterDef<T>[];
  filterValues: FilterValues;
  filterCounts: FilterCounts;
  onFilterChange: (key: string, value: string) => void;
  secondaryActions?: ToolbarAction[];
  /** Mode urutkan aktif → cari & filter dinonaktifkan. */
  isDisabled?: boolean;
}

const COUNT = (on: boolean): string =>
  `rounded-full px-1.5 py-px text-[11px] font-bold ${on ? 'bg-primary text-white' : 'bg-default-100 text-default-600'}`;
const CHIP = (on: boolean): string =>
  `inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors disabled:opacity-50 ${
    on ? 'border-primary-200 bg-primary-50 font-bold text-primary' : 'border-default-200 bg-white font-medium text-default-700 hover:bg-default-50'
  }`;
const CONTROL = 'rounded-[10px] border border-default-300 bg-white text-foreground disabled:opacity-50';

function countOf(counts: FilterCounts, key: string, value: string): number | null {
  const n = counts[key]?.[value];
  return typeof n === 'number' ? n : null;
}

/** Toolbar (artboard FAQ-List): cari, chip berhitung, select, aksi sekunder; di HP chip bergulir horizontal. */
export function DataToolbar<T extends DataRow>({
  search,
  onSearchChange,
  searchPlaceholder = 'Cari…',
  filters,
  filterValues,
  filterCounts,
  onFilterChange,
  secondaryActions = [],
  isDisabled = false,
}: DataToolbarProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative w-full md:max-w-[360px] md:flex-[1_1_260px]">
        <Icon name="search" size={16} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-default-500" />
        <label htmlFor="data-list-search" className="sr-only">
          Cari
        </label>
        <input
          id="data-list-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={isDisabled}
          className={`${CONTROL} w-full py-2.5 pl-9 pr-3 text-[15px] md:text-sm`}
        />
      </div>

      {filters.map((filter) =>
        filter.kind === 'chip' ? (
          <div
            key={filter.key}
            role="group"
            aria-label={filter.label}
            className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 md:mx-0 md:w-auto md:flex-wrap md:overflow-visible md:px-0"
          >
            {[{ value: '', label: filter.allLabel }, ...filter.options].map((option) => {
              const on = (filterValues[filter.key] ?? '') === option.value;
              const n = countOf(filterCounts, filter.key, option.value);
              return (
                <button
                  key={option.value || '__all'}
                  type="button"
                  aria-pressed={on}
                  disabled={isDisabled}
                  onClick={() => onFilterChange(filter.key, option.value)}
                  className={CHIP(on)}
                >
                  {option.label}
                  {n !== null && <span className={`hidden md:inline ${COUNT(on)}`}>{n}</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <span key={filter.key}>
            <label htmlFor={`data-list-filter-${filter.key}`} className="sr-only">
              {filter.label}
            </label>
            <select
              id={`data-list-filter-${filter.key}`}
              value={filterValues[filter.key] ?? ''}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              disabled={isDisabled}
              className={`${CONTROL} min-h-9 px-2.5 py-2 text-[13px]`}
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => {
                const n = countOf(filterCounts, filter.key, option.value);
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {n !== null ? ` (${n})` : ''}
                  </option>
                );
              })}
            </select>
          </span>
        ),
      )}

      {secondaryActions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={action.onPress}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] border border-default-300 bg-white px-3 text-[13px] font-semibold text-foreground hover:bg-default-50"
        >
          {action.icon && <Icon name={action.icon} size={16} strokeWidth={2} />}
          {action.label}
        </button>
      ))}
    </div>
  );
}
