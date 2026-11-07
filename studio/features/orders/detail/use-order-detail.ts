'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage, isNotFound } from '@/studio/api/client';
import {
  fetchCancelledPreorders,
  fetchOrderDetail,
  fetchOrderLookup,
  type OrderDetail,
  type OrderLookup,
} from '@/studio/api/order-detail';
import { useRealtime } from '@/studio/features/realtime/RealtimeProvider';
import { REALTIME_EVENTS } from '@/studio/features/realtime/event-payload';
import { useActiveWebsiteId } from '@/studio/stores/website-store';

export type OrderDetailState =
  | { kind: 'loading' }
  | { kind: 'ready'; order: OrderDetail }
  | { kind: 'cancelled'; preorder: OrderLookup }
  | { kind: 'redirecting' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

/**
 * Rantai fallback (parity §2): transaksi → order (redirect ke transaksinya,
 * atau ke Penawaran bila masih PENDING) → praorder dibatalkan → tidak ditemukan.
 * `reload({ silent: true })` dipakai setelah aksi & event realtime (tanpa skeleton).
 */
export function useOrderDetail(id: string): {
  state: OrderDetailState;
  reload: (options?: { silent?: boolean }) => Promise<void>;
} {
  const router = useRouter();
  const websiteId = useActiveWebsiteId();
  const { subscribe } = useRealtime();
  const [state, setState] = useState<OrderDetailState>({ kind: 'loading' });
  const requestRef = useRef(0);

  const reload = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!websiteId || !id) return;
      const request = ++requestRef.current;
      const stale = (): boolean => request !== requestRef.current;
      if (!options?.silent) setState({ kind: 'loading' });
      try {
        const order = await fetchOrderDetail(websiteId, id);
        if (!stale()) setState({ kind: 'ready', order });
        return;
      } catch (transactionError) {
        if (options?.silent && !isNotFound(transactionError)) {
          // Muat ulang diam-diam gagal: biarkan data lama, beri tahu lewat state hanya bila belum ada data.
          if (!stale()) setState((prev) => (prev.kind === 'ready' ? prev : { kind: 'error', message: errorMessage(transactionError) }));
          return;
        }
        try {
          const lookup = await fetchOrderLookup(websiteId, id);
          if (stale()) return;
          if (lookup.transaction_id && lookup.transaction_id !== id) {
            setState({ kind: 'redirecting' });
            router.replace(`/studio/orders/${encodeURIComponent(lookup.transaction_id)}`);
            return;
          }
          if (lookup.status === 'PENDING') {
            setState({ kind: 'redirecting' });
            router.replace(`/studio/quotes?order=${encodeURIComponent(lookup.id)}`);
            return;
          }
          setState({ kind: 'cancelled', preorder: lookup });
          return;
        } catch {
          try {
            const cancelled = await fetchCancelledPreorders(websiteId);
            const found = cancelled.find((o) => o.id === id);
            if (stale()) return;
            if (found) {
              setState({ kind: 'cancelled', preorder: found });
              return;
            }
          } catch {
            // Pertahankan error transaksi asli bila fallback juga gagal.
          }
        }
        if (stale()) return;
        setState(
          isNotFound(transactionError)
            ? { kind: 'not-found' }
            : { kind: 'error', message: errorMessage(transactionError, 'Gagal memuat detail pesanan.') },
        );
      }
    },
    [websiteId, id, router],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  // Notifikasi pesanan ini (langkah diisi pembeli, pembayaran, komplain) → muat ulang diam-diam.
  useEffect(
    () =>
      subscribe(REALTIME_EVENTS.notificationCreated, (data) => {
        const actionUrl = typeof data.actionUrl === 'string' ? data.actionUrl : '';
        if (id && actionUrl.includes(id)) void reload({ silent: true });
      }),
    [subscribe, reload, id],
  );

  return { state, reload };
}
