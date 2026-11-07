import { Skeleton } from '@heroui/react';

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-label="Memuat data">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-medium" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/5 rounded-full" />
            <Skeleton className="h-3 w-3/5 rounded-full" />
          </div>
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
