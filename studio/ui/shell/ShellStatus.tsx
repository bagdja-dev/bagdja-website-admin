'use client';

import { Button, Spinner } from '@heroui/react';

import { BrandLogo } from '../brand/BrandLogo';
import { Icon } from '../icons';
import { EmptyState } from '../primitives/EmptyState';

export function ShellLoading({ label = 'Memuat Studio…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background" role="status">
      <BrandLogo size="lg" />
      <Spinner size="sm" aria-label={label} />
    </div>
  );
}

export function ShellError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <EmptyState
        icon="warning"
        title="Studio gagal dimuat"
        description={message}
        action={
          <Button color="primary" onPress={onRetry} startContent={<Icon name="refresh" size={16} />}>
            Coba lagi
          </Button>
        }
      />
    </div>
  );
}

export function ModulesErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-medium border border-warning/40 bg-warning-50 px-3 py-2 text-sm text-default-700"
    >
      <Icon name="warning" size={18} className="text-warning" />
      <span className="min-w-0 flex-1">{message} Menu sementara menampilkan semua fitur.</span>
      <Button size="sm" variant="bordered" onPress={onRetry}>
        Coba lagi
      </Button>
    </div>
  );
}
