import type { SectionFieldDef, SectionFormValue } from './section-types';
import type { FooterBlock, FooterBlockType } from './types';

export interface FooterBlockConfig {
  type: FooterBlockType;
  label: string;
  description: string;
  icon: string;
  gradient: string;
  /** Hanya boleh ada satu blok ini di footer */
  single?: boolean;
  fields: SectionFieldDef[];
  defaults: Record<string, string | boolean>;
  hint?: string;
}

export const FOOTER_BLOCK_CONFIGS: FooterBlockConfig[] = [
  {
    type: 'brand',
    label: 'Brand',
    description: 'Logo, nama bisnis, dan tagline.',
    icon: '🏷️',
    gradient: 'from-violet-600 to-indigo-500',
    defaults: { show_logo: true, show_business_name: true, show_tagline: true },
    fields: [
      { key: 'show_logo', label: 'Logo', type: 'switch' },
      { key: 'show_business_name', label: 'Nama bisnis', type: 'switch' },
      { key: 'show_tagline', label: 'Tagline', type: 'switch' },
    ],
    hint: 'Logo, nama, dan tagline diambil dari Profil Brand di menu Pengaturan.',
  },
  {
    type: 'page_links',
    label: 'Link Halaman',
    description: 'Daftar halaman dengan penempatan "Footer".',
    icon: '🔗',
    gradient: 'from-blue-600 to-cyan-500',
    defaults: { title: 'Halaman' },
    fields: [{ key: 'title', label: 'Judul kolom', type: 'text', placeholder: 'Halaman' }],
    hint: 'Atur halaman mana yang tampil lewat menu Halaman → penempatan "Footer".',
  },
  {
    type: 'contact',
    label: 'Kontak',
    description: 'Alamat lokasi utama, WhatsApp, telepon, dan email.',
    icon: '📍',
    gradient: 'from-emerald-600 to-teal-500',
    defaults: { title: 'Kontak', show_address: true, show_whatsapp: true, show_phone: true, show_email: true },
    fields: [
      { key: 'title', label: 'Judul kolom', type: 'text', placeholder: 'Kontak' },
      { key: 'show_address', label: 'Alamat lokasi utama', type: 'switch' },
      { key: 'show_whatsapp', label: 'WhatsApp', type: 'switch' },
      { key: 'show_phone', label: 'Telepon', type: 'switch' },
      { key: 'show_email', label: 'Email', type: 'switch' },
    ],
    hint: 'Data kontak dari Profil Brand; alamat dari menu Lokasi & Cabang.',
  },
  {
    type: 'social_links',
    label: 'Media Sosial',
    description: 'Ikon tautan media sosial.',
    icon: '💬',
    gradient: 'from-pink-600 to-rose-500',
    defaults: { title: 'Ikuti Kami' },
    fields: [{ key: 'title', label: 'Judul kolom', type: 'text', placeholder: 'Ikuti Kami' }],
    hint: 'Tautan diambil dari Media Sosial di menu Pengaturan.',
  },
  {
    type: 'text',
    label: 'Teks',
    description: 'Kolom teks bebas, mis. jam buka atau catatan.',
    icon: '📝',
    gradient: 'from-amber-500 to-orange-500',
    defaults: { title: '', body: '' },
    fields: [
      { key: 'title', label: 'Judul kolom', type: 'text' },
      { key: 'body', label: 'Isi', type: 'textarea' },
    ],
  },
  {
    type: 'copyright',
    label: 'Copyright',
    description: 'Baris hak cipta di paling bawah footer.',
    icon: '©️',
    gradient: 'from-slate-700 to-slate-500',
    single: true,
    defaults: { text: '' },
    fields: [
      {
        key: 'text',
        label: 'Teks copyright',
        type: 'text',
        placeholder: '© 2026 Nama Bisnis',
        description: 'Kosongkan untuk memakai "© {tahun} {nama bisnis}".',
      },
    ],
    hint: 'Selalu tampil di baris paling bawah, apa pun urutannya.',
  },
];

export function getFooterBlockConfig(type: FooterBlockType): FooterBlockConfig {
  return FOOTER_BLOCK_CONFIGS.find((config) => config.type === type) ?? FOOTER_BLOCK_CONFIGS[0];
}

export function footerBlockToFormValues(block: Pick<FooterBlock, 'type' | 'content'>): Record<string, SectionFormValue> {
  const config = getFooterBlockConfig(block.type);
  const values: Record<string, SectionFormValue> = {};
  for (const field of config.fields) {
    const raw = block.content[field.key] ?? config.defaults[field.key];
    values[field.key] = field.type === 'switch' ? raw !== false : typeof raw === 'string' ? raw : '';
  }
  return values;
}

export function formValuesToFooterContent(
  type: FooterBlockType,
  values: Record<string, SectionFormValue>,
): Record<string, unknown> {
  const config = getFooterBlockConfig(type);
  const content: Record<string, unknown> = {};
  for (const field of config.fields) {
    const value = values[field.key];
    if (field.type === 'switch') content[field.key] = value === true;
    else if (typeof value === 'string' && value.trim()) content[field.key] = value.trim();
  }
  return content;
}

export function getFooterBlockSummary(block: FooterBlock): string {
  const config = getFooterBlockConfig(block.type);
  const title = typeof block.content.title === 'string' ? block.content.title.trim() : '';
  if (block.type === 'copyright') {
    const text = typeof block.content.text === 'string' ? block.content.text.trim() : '';
    return text || 'Otomatis: © tahun + nama bisnis';
  }
  if (block.type === 'text') {
    const body = typeof block.content.body === 'string' ? block.content.body.trim() : '';
    return title || (body ? body.slice(0, 60) + (body.length > 60 ? '…' : '') : 'Belum ada isi');
  }
  const switches = config.fields.filter((field) => field.type === 'switch');
  if (switches.length > 0) {
    const shown = switches.filter((field) => block.content[field.key] !== false).map((field) => field.label);
    const prefix = title ? `${title} · ` : '';
    return shown.length > 0 ? `${prefix}${shown.join(', ')}` : `${prefix}Semua item disembunyikan`;
  }
  return title || config.description;
}

export function createFooterBlockId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
}
