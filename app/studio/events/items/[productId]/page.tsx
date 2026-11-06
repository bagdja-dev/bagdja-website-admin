import { ProductEditor } from '@/studio/features/catalog/editor/ProductEditor';

interface StudioEventItemPageProps {
  params: { productId: string };
}

/** D12: editor item Acara = halaman sendiri di bawah area Gathering (modul `events`). */
export default function StudioEventItemPage({ params }: StudioEventItemPageProps) {
  return <ProductEditor key={params.productId} productId={params.productId} initialType="gathering" area="events" />;
}
