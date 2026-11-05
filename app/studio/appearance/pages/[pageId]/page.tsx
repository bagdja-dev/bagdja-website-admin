import { PageEditor } from '@/studio/features/appearance/page-editor/PageEditor';

interface StudioAppearancePageEditorProps {
  params: { pageId: string };
}

export default function StudioAppearancePageEditorPage({ params }: StudioAppearancePageEditorProps) {
  return <PageEditor pageId={params.pageId} />;
}
