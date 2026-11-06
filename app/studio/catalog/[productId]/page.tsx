import { ProductEditor } from '@/studio/features/catalog/editor/ProductEditor';

interface StudioCatalogItemPageProps {
  params: { productId: string };
}

export default function StudioCatalogItemPage({ params }: StudioCatalogItemPageProps) {
  return <ProductEditor key={params.productId} productId={params.productId} initialType="product" area="catalog" />;
}
