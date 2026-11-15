import { fetchTemplateCandidatePreview } from '@/studio/api/template-trials';
import { loadTemplateBrowserBundle } from '@/studio/lib/template-browser-bundle';
import { buildClientPreviewDocument, buildPreviewDocument } from '@/studio/lib/template-preview-document';

/**
 * Dokumen iframe pratinjau kandidat untuk Studio (kartu katalog & panggung versi uji).
 * Mode client bila kandidat punya browser.js — dirender di iframe dari file yang sama dengan yang dipakai
 * pengunjung, tanpa container runtime (template-client-rendering-plan §8); selain itu HTML SSR + client.js.
 */
export async function loadTemplateCandidatePreviewDocument(submissionId: string, fixture = 'home'): Promise<string> {
  const preview = await fetchTemplateCandidatePreview(submissionId, fixture);
  if (preview.mode === 'client' && preview.browserBundle && preview.props) {
    const bundleSource = await loadTemplateBrowserBundle(preview.browserBundle);
    return buildClientPreviewDocument(bundleSource, preview.props, true);
  }
  return buildPreviewDocument(preview.html, preview.clientScript, true);
}
