import { ProductEditor } from '@/studio/features/catalog/editor/ProductEditor';

interface StudioCatalogNewPageProps {
  searchParams: { type?: string };
}

export default function StudioCatalogNewPage({ searchParams }: StudioCatalogNewPageProps) {
  const type = typeof searchParams.type === 'string' ? searchParams.type : 'service';
  return <ProductEditor key={`new-${type}`} productId={null} initialType={type} area="catalog" />;
}
