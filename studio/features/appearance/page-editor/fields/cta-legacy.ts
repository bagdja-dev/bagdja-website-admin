import type { WebsiteSection } from '@/studio/api/pages';

/**
 * Section `cta` lama (schemaVersion 1) tidak punya `button_action`, dan renderer
 * memperlakukannya sebagai `link` yang memakai `button_url`. Form harus
 * menampilkan hal yang sama, bukan default `whatsapp` milik section baru.
 * Hanya mengisi `button_action` bila belum ada dan `button_url` terisi.
 */
export function normalizeLegacyCta(section: WebsiteSection): WebsiteSection {
  if (section.type !== 'cta') return section;
  const content = section.content ?? {};
  if (typeof content.button_action === 'string' && content.button_action) return section;
  const url = typeof content.button_url === 'string' ? content.button_url.trim() : '';
  if (!url) return section;
  return { ...section, content: { ...content, button_action: 'link' } };
}
