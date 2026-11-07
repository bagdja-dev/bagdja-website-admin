'use client';

import type { DataListState } from './use-data-list';
import type { DataRow } from './types';

const BTN =
  'min-h-[34px] rounded-lg border border-default-200 bg-white px-3 text-[13px] text-foreground disabled:text-default-400 hover:enabled:bg-default-50';

/** Kaki daftar (artboard FAQ-List): "Menampilkan X dari Y" + Sebelumnya / Berikutnya. */
export function ListPager<T extends DataRow>({ list }: { list: DataListState<T> }) {
  if (list.status !== 'ready' || list.emptyKind !== 'none') return null;
  return (
    <nav
      aria-label="Halaman daftar"
      className="flex flex-wrap items-center justify-between gap-2.5 border-default-100 px-1 py-2 text-[13px] text-default-600 md:border-t md:px-4 md:py-3"
    >
      <span aria-live="polite">
        Menampilkan {list.rows.length} dari {list.matchCount}
      </span>
      {list.pageCount > 1 && (
        <span className="flex items-center gap-1.5">
          <button type="button" className={BTN} disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
            Sebelumnya
          </button>
          <span className="px-1 text-xs text-default-500">
            {list.page}/{list.pageCount}
          </span>
          <button type="button" className={BTN} disabled={list.page >= list.pageCount} onClick={() => list.setPage(list.page + 1)}>
            Berikutnya
          </button>
        </span>
      )}
    </nav>
  );
}
