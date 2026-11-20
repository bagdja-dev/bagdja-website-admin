import { PortfolioEditor } from '@/studio/features/portfolio/PortfolioEditor';

export default function StudioPortfolioEditorPage({ params }: { params: { projectId: string } }) {
  return <PortfolioEditor projectId={params.projectId} />;
}
