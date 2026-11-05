import type { ReactNode } from 'react';

import { Icon, type IconName } from '../icons';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  /** `compact` untuk dipakai di dalam kartu/tabel. */
  compact?: boolean;
}

export function EmptyState({ title, description, icon = 'empty', action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-16'}`}
      role="status"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-default-100 text-default-600">
        <Icon name={icon} size={24} />
      </span>
      <div className="max-w-md">
        <p className="text-base font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-default-600">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
