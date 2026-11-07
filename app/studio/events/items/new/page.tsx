import { ProductEditor } from '@/studio/features/catalog/editor/ProductEditor';

/** D12: editor item Acara = halaman sendiri di bawah area Gathering (modul `events`). */
export default function StudioEventItemNewPage() {
  return <ProductEditor key="new-gathering" productId={null} initialType="gathering" area="events" />;
}
