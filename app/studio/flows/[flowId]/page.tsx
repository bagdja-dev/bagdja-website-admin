import { FlowDetailPage } from '@/studio/features/flows/FlowDetailPage';

interface FlowRouteProps {
  params: { flowId: string };
}

export default function FlowRoute({ params }: FlowRouteProps) {
  return <FlowDetailPage flowId={params.flowId} />;
}
