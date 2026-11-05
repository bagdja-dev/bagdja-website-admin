'use client';

import { addToast, ToastProvider } from '@heroui/react';

/** Dipasang sekali di root Studio. Pojok bawah agar tidak bertabrakan dengan toaster notifikasi (kanan atas). */
export function StudioToastProvider() {
  return <ToastProvider placement="bottom-right" maxVisibleToasts={3} toastOffset={16} />;
}

interface NotifyInput {
  title: string;
  description?: string;
}

function show(color: 'success' | 'danger' | 'default' | 'warning', { title, description }: NotifyInput): void {
  addToast({ title, description, color, timeout: color === 'danger' ? 7000 : 4000, shouldShowTimeoutProgress: true });
}

/** Pengganti `alert()`: umpan balik singkat tanpa memblokir. */
export const notify = {
  success: (title: string, description?: string): void => show('success', { title, description }),
  error: (title: string, description?: string): void => show('danger', { title, description }),
  warning: (title: string, description?: string): void => show('warning', { title, description }),
  info: (title: string, description?: string): void => show('default', { title, description }),
};
