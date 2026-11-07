import { GatheringOrderPage } from '@/studio/features/orders/gathering/GatheringOrderPage';

interface StudioGatheringOrderPageProps {
  params: { groupId: string };
}

export default function StudioGatheringOrderPage({ params }: StudioGatheringOrderPageProps) {
  return <GatheringOrderPage key={params.groupId} groupId={params.groupId} />;
}
