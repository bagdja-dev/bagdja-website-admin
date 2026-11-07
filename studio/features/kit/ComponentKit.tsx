'use client';

import { PageHeader } from '@/studio/ui/primitives/PageHeader';

import { KitDataList } from './KitDataList';
import { KitPrimitives } from './KitPrimitives';

/** Showcase internal komponen Studio (hanya development). Cek di lebar 360 / 768 / 1280. */
export function ComponentKit() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Studio UI Kit" description="Halaman internal (development) — tidak tersedia di production." />
      <KitPrimitives />
      <KitDataList />
    </div>
  );
}
