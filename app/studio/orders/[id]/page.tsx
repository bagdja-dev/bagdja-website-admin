import { OrderDetailPage } from '@/studio/features/orders/detail/OrderDetailPage';

interface StudioOrderDetailPageProps {
  params: { id: string };
}

export default function StudioOrderDetailPage({ params }: StudioOrderDetailPageProps) {
  return <OrderDetailPage key={params.id} id={params.id} />;
}
