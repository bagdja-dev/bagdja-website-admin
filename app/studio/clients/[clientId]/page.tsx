import { ClientEditor } from '@/studio/features/clients/ClientEditor';

export default function StudioClientEditorPage({ params }: { params: { clientId: string } }) {
  return <ClientEditor clientId={params.clientId} />;
}
