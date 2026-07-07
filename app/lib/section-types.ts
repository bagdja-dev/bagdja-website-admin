export type SectionFieldType =
  | 'text'
  | 'textarea'
  | 'switch'
  | 'select'
  | 'richtext'
  | 'gallery';

export interface GalleryImage {
  url: string;
  alt?: string;
  caption?: string;
}

export type SectionFormValue = string | boolean | GalleryImage[];

export interface SectionFieldDef {
  key: string;
  label: string;
  type: SectionFieldType;
  description?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface SectionTypeConfig {
  type: string;
  label: string;
  description: string;
  category: 'narrative' | 'master';
  categoryLabel: string;
  gradient: string;
  icon: string;
  fields: SectionFieldDef[];
  defaults: Record<string, unknown>;
  manageHint?: string;
}

export const SECTION_TYPE_CONFIGS: SectionTypeConfig[] = [
  {
    type: 'hero',
    label: 'Hero Banner',
    description: 'Bagian atas halaman dengan judul brand dan tombol WhatsApp.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-blue-600 to-cyan-500',
    icon: '🎯',
    defaults: { subtitle: '', show_whatsapp_cta: true },
    fields: [
      { key: 'subtitle', label: 'Subjudul', type: 'text', placeholder: 'Premium Barbershop' },
      {
        key: 'show_whatsapp_cta',
        label: 'Tampilkan tombol WhatsApp',
        type: 'switch',
        description: 'Tombol hubungi via nomor WhatsApp profil brand.',
      },
    ],
  },
  {
    type: 'text_block',
    label: 'Teks Plain',
    description: 'Blok teks sederhana — mengikuti gaya typography template.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-slate-600 to-gray-500',
    icon: '📝',
    defaults: { title: '', body: '', align: 'left' },
    fields: [
      { key: 'title', label: 'Judul', type: 'text', placeholder: 'Judul section (opsional)' },
      {
        key: 'body',
        label: 'Isi Teks',
        type: 'textarea',
        placeholder: 'Tulis paragraf di sini...',
        description: 'Plain text — di website akan mengikuti font & warna template.',
      },
      {
        key: 'align',
        label: 'Perataan',
        type: 'select',
        options: [
          { value: 'left', label: 'Kiri' },
          { value: 'center', label: 'Tengah' },
        ],
      },
    ],
  },
  {
    type: 'rich_text',
    label: 'Rich Text',
    description: 'Konten WYSIWYG dengan gaya independen — tidak terpengaruh tema template.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-orange-600 to-red-500',
    icon: '✍️',
    defaults: { title: '', html: '', standalone: true },
    fields: [
      { key: 'title', label: 'Judul', type: 'text', placeholder: 'Judul section (opsional)' },
      {
        key: 'html',
        label: 'Konten',
        type: 'richtext',
        description: 'Format teks bebas — tampil dengan gaya standar (background putih).',
      },
    ],
  },
  {
    type: 'about',
    label: 'Tentang Kami',
    description: 'Section profil bisnis dengan teks dan foto — berbeda dari teks bebas.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-violet-600 to-purple-500',
    icon: '📖',
    defaults: { title: 'Tentang Kami', body: '', image_url: '' },
    fields: [
      { key: 'title', label: 'Judul', type: 'text', placeholder: 'Tentang Kami' },
      {
        key: 'body',
        label: 'Cerita / Profil',
        type: 'textarea',
        placeholder: 'Ceritakan bisnis Anda...',
      },
      {
        key: 'image_url',
        label: 'URL Foto Profil',
        type: 'text',
        placeholder: 'https://...',
        description: 'Foto tim atau interior — opsional.',
      },
    ],
  },
  {
    type: 'gallery',
    label: 'Galeri Foto',
    description: 'Koleksi foto diunggah ke Supabase — portofolio, interior, hasil kerja.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-amber-600 to-orange-500',
    icon: '🖼️',
    defaults: { title: 'Galeri Kami', layout: 'grid', images: [] as GalleryImage[] },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text', placeholder: 'Galeri Kami' },
      {
        key: 'layout',
        label: 'Layout',
        type: 'select',
        options: [
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
        ],
      },
      {
        key: 'images',
        label: 'Gambar',
        type: 'gallery',
        description: 'PNG, JPG, WebP, GIF — maks. 5 MB per file.',
      },
    ],
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Blok ajakan bertindak dengan tombol link.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-rose-600 to-pink-500',
    icon: '📣',
    defaults: { title: '', subtitle: '', button_text: 'Hubungi Kami', button_url: '' },
    fields: [
      { key: 'title', label: 'Judul', type: 'text' },
      { key: 'subtitle', label: 'Subjudul', type: 'text' },
      { key: 'button_text', label: 'Teks Tombol', type: 'text' },
      { key: 'button_url', label: 'Link Tombol', type: 'text', placeholder: 'https://...' },
    ],
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    description: 'Ulasan dan testimoni pelanggan.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-emerald-600 to-teal-500',
    icon: '💬',
    defaults: { title: 'Apa Kata Mereka' },
    fields: [{ key: 'title', label: 'Judul Section', type: 'text' }],
  },
  {
    type: 'contact',
    label: 'Kontak',
    description: 'Informasi kontak dan formulir.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-slate-600 to-zinc-500',
    icon: '📞',
    defaults: { title: 'Hubungi Kami' },
    fields: [{ key: 'title', label: 'Judul Section', type: 'text' }],
  },
  {
    type: 'services_grid',
    label: 'Grid Layanan',
    description: 'Menampilkan layanan dari menu Produk & Layanan.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-indigo-600 to-blue-500',
    icon: '✂️',
    manageHint: 'Kelola layanan di menu Produk & Layanan → filter Layanan.',
    defaults: { title: 'Layanan Kami', source: 'products', filter_type: 'service' },
    fields: [{ key: 'title', label: 'Judul Section', type: 'text' }],
  },
  {
    type: 'products_grid',
    label: 'Grid Produk',
    description: 'Menampilkan produk dari menu Produk & Layanan.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-cyan-600 to-sky-500',
    icon: '🛍️',
    manageHint: 'Kelola produk di menu Produk & Layanan → filter Produk.',
    defaults: { title: 'Produk Kami', source: 'products', filter_type: 'product' },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text' },
      {
        key: 'filter_type',
        label: 'Tipe Produk',
        type: 'select',
        options: [
          { value: 'product', label: 'Produk' },
          { value: 'package', label: 'Paket' },
          { value: 'digital', label: 'Digital' },
        ],
      },
    ],
  },
  {
    type: 'locations_list',
    label: 'Daftar Lokasi',
    description: 'Menampilkan cabang dari menu Lokasi & Cabang.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-teal-600 to-emerald-500',
    icon: '📍',
    manageHint: 'Kelola cabang di menu Lokasi & Cabang.',
    defaults: { title: 'Kunjungi Kami', source: 'locations', filter_types: ['branch'] },
    fields: [{ key: 'title', label: 'Judul Section', type: 'text' }],
  },
  {
    type: 'faq_list',
    label: 'Daftar FAQ',
    description: 'Menampilkan pertanyaan umum dari menu FAQ.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-fuchsia-600 to-purple-500',
    icon: '❓',
    manageHint: 'Kelola FAQ di menu FAQ.',
    defaults: { title: 'Pertanyaan Umum', source: 'faqs' },
    fields: [{ key: 'title', label: 'Judul Section', type: 'text' }],
  },
];

const configMap = new Map(SECTION_TYPE_CONFIGS.map((c) => [c.type, c]));

export function getSectionTypeConfig(type: string): SectionTypeConfig {
  return (
    configMap.get(type) ?? {
      type,
      label: type,
      description: 'Tipe section kustom',
      category: 'narrative',
      categoryLabel: 'Lainnya',
      gradient: 'from-gray-600 to-gray-500',
      icon: '📦',
      fields: [],
      defaults: {},
    }
  );
}

function parseGalleryImages(raw: unknown): GalleryImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
    .map((item) => ({
      url: typeof item.url === 'string' ? item.url : '',
      alt: typeof item.alt === 'string' ? item.alt : '',
      caption: typeof item.caption === 'string' ? item.caption : '',
    }))
    .filter((img) => img.url);
}

export function getDefaultFormValues(type: string): Record<string, SectionFormValue> {
  const config = getSectionTypeConfig(type);
  const values: Record<string, SectionFormValue> = {};

  for (const field of config.fields) {
    const def = config.defaults[field.key];

    if (field.type === 'switch') {
      values[field.key] = def === true;
    } else if (field.type === 'gallery') {
      values[field.key] = parseGalleryImages(def);
    } else if (field.type === 'richtext') {
      values[field.key] = typeof def === 'string' ? def : '';
    } else if (def != null && typeof def !== 'object') {
      values[field.key] = String(def);
    } else {
      values[field.key] = '';
    }
  }

  return values;
}

export function contentToFormValues(
  type: string,
  content: Record<string, unknown>,
): Record<string, SectionFormValue> {
  const config = getSectionTypeConfig(type);
  const values = getDefaultFormValues(type);

  for (const field of config.fields) {
    const val = content[field.key];

    if (field.type === 'switch') {
      values[field.key] = val === true;
    } else if (field.type === 'gallery') {
      values[field.key] = parseGalleryImages(val);
    } else if (field.type === 'richtext') {
      values[field.key] = typeof val === 'string' ? val : '';
    } else if (val != null && typeof val !== 'object') {
      values[field.key] = String(val);
    }
  }

  return values;
}

export function formValuesToContent(
  type: string,
  values: Record<string, SectionFormValue>,
): Record<string, unknown> {
  const config = getSectionTypeConfig(type);
  const content: Record<string, unknown> = { ...config.defaults };

  for (const field of config.fields) {
    const val = values[field.key];

    if (field.type === 'switch') {
      content[field.key] = val === true;
      continue;
    }

    if (field.type === 'gallery') {
      const images = Array.isArray(val) ? val : [];
      content[field.key] = images.filter((img) => img.url);
      continue;
    }

    if (field.type === 'richtext') {
      content[field.key] = typeof val === 'string' ? val : '';
      if (type === 'rich_text') content.standalone = true;
      continue;
    }

    if (typeof val === 'string' && val.trim()) {
      content[field.key] = val.trim();
    } else {
      delete content[field.key];
    }
  }

  if (type === 'rich_text') {
    content.standalone = true;
  }

  return content;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getSectionPreview(type: string, content: Record<string, unknown>): string {
  if (type === 'gallery') {
    const images = parseGalleryImages(content.images);
    const title = typeof content.title === 'string' ? content.title.trim() : '';
    if (title && images.length) return `${title} · ${images.length} gambar`;
    if (title) return title;
    if (images.length) return `${images.length} gambar`;
  }

  if (type === 'rich_text') {
    const title = typeof content.title === 'string' ? content.title.trim() : '';
    const html = typeof content.html === 'string' ? stripHtml(content.html) : '';
    if (title) return title;
    if (html) return html.slice(0, 60) + (html.length > 60 ? '…' : '');
  }

  if (type === 'text_block') {
    const title = typeof content.title === 'string' ? content.title.trim() : '';
    const body = typeof content.body === 'string' ? content.body.trim() : '';
    if (title) return title;
    if (body) return body.slice(0, 60) + (body.length > 60 ? '…' : '');
  }

  const title = content.title ?? content.subtitle;
  if (typeof title === 'string' && title.trim()) return title.trim();

  const keys = Object.keys(content).filter((k) => {
    const v = content[k];
    return v != null && v !== '' && typeof v !== 'object';
  });
  if (keys.length === 0) return 'Belum ada konten';
  const first = content[keys[0]];
  return typeof first === 'boolean' ? (first ? 'Aktif' : 'Nonaktif') : String(first);
}
