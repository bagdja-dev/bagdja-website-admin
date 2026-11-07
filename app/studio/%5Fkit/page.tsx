import { notFound } from 'next/navigation';

import { ComponentKit } from '@/studio/features/kit/ComponentKit';

/**
 * `/studio/_kit` — folder `%5Fkit` karena folder berawalan `_` adalah private
 * folder di App Router (tidak menjadi rute). Hanya development.
 */
export default function StudioKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ComponentKit />;
}
