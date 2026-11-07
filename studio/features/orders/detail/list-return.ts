/**
 * Daftar Pesanan menyimpan query-nya (tab/filter/cari/halaman) saat membuka
 * detail, supaya tombol kembali di detail memulihkan tampilan daftar yang sama.
 */
export const ORDERS_LIST_QUERY_KEY = 'studio:orders:list-query';

export function rememberOrdersListQuery(): void {
  try {
    window.sessionStorage.setItem(ORDERS_LIST_QUERY_KEY, window.location.search);
  } catch {
    // sessionStorage tidak tersedia: detail kembali ke daftar default.
  }
}

export function readOrdersListHref(): string {
  try {
    const query = window.sessionStorage.getItem(ORDERS_LIST_QUERY_KEY);
    if (query && query.startsWith('?')) return `/studio/orders${query}`;
  } catch {
    // abaikan
  }
  return '/studio/orders';
}
