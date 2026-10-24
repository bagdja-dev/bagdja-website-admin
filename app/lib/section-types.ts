export type SectionFieldType =
  | 'text'
  | 'textarea'
  | 'switch'
  | 'select'
  | 'richtext'
  | 'gallery'
  | 'blogPostPicker'
  | 'productPicker'
  | 'image'
  | 'json'
  | 'flowPicker';

export interface GalleryImage {
  url: string;
  alt?: string;
  caption?: string;
}

export type SectionFormValue = string | boolean | GalleryImage[] | string[];

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

function formatJsonField(value: unknown): string {
  return value == null ? '' : JSON.stringify(value, null, 2);
}

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
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
    defaults: { subtitle: '', show_whatsapp_cta: true, image_url: '' },
    fields: [
      { key: 'subtitle', label: 'Subjudul', type: 'text', placeholder: 'Premium Barbershop' },
      {
        key: 'image_url',
        label: 'Gambar Hero',
        type: 'image',
        description: 'Opsional — dipakai template yang mendukung hero dengan gambar (mis. Store Classic).',
      },
      {
        key: 'show_whatsapp_cta',
        label: 'Tampilkan tombol WhatsApp',
        type: 'switch',
        description: 'Tombol hubungi via nomor WhatsApp profil brand.',
      },
      { key: 'headline', label: 'Headline', type: 'text', placeholder: 'Dibangun untuk bertahan.' },
      { key: 'lede', label: 'Deskripsi Hero', type: 'textarea' },
      { key: 'stats', label: 'Statistik (JSON)', type: 'json', description: 'Format: [{ "value": "10+", "label": "Tahun pengalaman" }]' },
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
        label: 'Foto Profil',
        type: 'image',
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
    type: 'features_grid',
    label: 'Blok Fitur/USP',
    description: 'Keunggulan bisnis dalam 2-4 kolom (mis. Gratis Ongkir, Garansi, Layanan 24/7).',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-sky-600 to-blue-500',
    icon: '⭐',
    defaults: {
      title: 'Kenapa Pilih Kami',
      feature_1_icon: '🚚',
      feature_1_title: '',
      feature_1_desc: '',
      feature_2_icon: '🛡️',
      feature_2_title: '',
      feature_2_desc: '',
      feature_3_icon: '💬',
      feature_3_title: '',
      feature_3_desc: '',
    },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text' },
      { key: 'feature_1_icon', label: 'Ikon Fitur 1 (emoji)', type: 'text', placeholder: '🚚' },
      { key: 'feature_1_title', label: 'Judul Fitur 1', type: 'text' },
      { key: 'feature_1_desc', label: 'Deskripsi Fitur 1', type: 'textarea' },
      { key: 'feature_2_icon', label: 'Ikon Fitur 2 (emoji)', type: 'text', placeholder: '🛡️' },
      { key: 'feature_2_title', label: 'Judul Fitur 2', type: 'text' },
      { key: 'feature_2_desc', label: 'Deskripsi Fitur 2', type: 'textarea' },
      { key: 'feature_3_icon', label: 'Ikon Fitur 3 (emoji)', type: 'text', placeholder: '💬' },
      { key: 'feature_3_title', label: 'Judul Fitur 3', type: 'text' },
      { key: 'feature_3_desc', label: 'Deskripsi Fitur 3', type: 'textarea' },
      { key: 'feature_4_icon', label: 'Ikon Fitur 4', type: 'text', placeholder: '04' },
      { key: 'feature_4_title', label: 'Judul Fitur 4', type: 'text' },
      { key: 'feature_4_desc', label: 'Deskripsi Fitur 4', type: 'textarea' },
    ],
  },
  {
    type: 'logo_wall',
    label: 'Deretan Logo',
    description: 'Logo brand/partner/media untuk membangun kredibilitas.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-neutral-600 to-gray-500',
    icon: '🏷️',
    defaults: { title: 'Dipercaya Oleh', layout: 'grid', logos: [] as GalleryImage[] },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text', placeholder: 'Dipercaya Oleh' },
      {
        key: 'layout',
        label: 'Layout',
        type: 'select',
        options: [
          { value: 'grid', label: 'Grid' },
          { value: 'carousel', label: 'Carousel' },
        ],
      },
      { key: 'logos', label: 'Logo', type: 'gallery', description: 'PNG/WebP transparan disarankan.' },
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
    type: 'service_process_section',
    label: 'Alur Layanan',
    description: 'Menampilkan langkah dari Master Flow yang dipilih.',
    category: 'narrative',
    categoryLabel: 'Konten',
    gradient: 'from-orange-700 to-amber-500',
    icon: '⚙️',
    defaults: { title: 'Alur Pengerjaan', subtitle: '', flow_id: '' },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text' },
      { key: 'subtitle', label: 'Subjudul', type: 'text' },
      { key: 'flow_id', label: 'Master Flow', type: 'flowPicker' },
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
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text' },
      { key: 'items', label: 'Testimonial (JSON)', type: 'json', description: 'Format: [{ "quote": "...", "context": "...", "location": "..." }]' },
    ],
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
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text' },
      { key: 'subtitle', label: 'Subjudul', type: 'text' },
      { key: 'show_form', label: 'Tampilkan formulir', type: 'switch' },
      { key: 'service_options', label: 'Pilihan layanan (JSON)', type: 'json', description: 'Array string, contoh: ["Kanopi", "Pagar"]' },
    ],
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
    type: 'category_grid',
    label: 'Grid Kategori',
    description: 'Kartu navigasi kategori produk/layanan (dikelompokkan otomatis dari field Kategori).',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-purple-600 to-indigo-500',
    icon: '🗃️',
    manageHint: 'Kategori diambil dari field "Kategori" di menu Produk & Layanan.',
    defaults: { title: 'Kategori Pilihan', source: 'products' },
    fields: [{ key: 'title', label: 'Judul Section', type: 'text' }],
  },
  {
    type: 'featured_product',
    label: 'Spotlight Produk',
    description: 'Banner promosi untuk 1 produk/layanan unggulan dari katalog.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-yellow-600 to-amber-500',
    icon: '🌟',
    manageHint: 'Kelola produk di menu Produk & Layanan.',
    defaults: { title: '', subtitle: '', product_ids: [] as string[], button_text: 'Lihat Detail' },
    fields: [
      { key: 'title', label: 'Judul', type: 'text', placeholder: 'Opsional' },
      { key: 'subtitle', label: 'Subjudul', type: 'text', placeholder: 'Opsional' },
      {
        key: 'product_ids',
        label: 'Pilih Produk',
        type: 'productPicker',
        description: 'Pilih 1 produk/layanan yang ingin ditonjolkan.',
      },
      { key: 'button_text', label: 'Teks Tombol', type: 'text', placeholder: 'Lihat Detail' },
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
  {
    type: 'blog_list',
    label: 'Blog Page',
    description: 'Menampilkan semua artikel blog yang sudah terbit, klik untuk baca artikel penuh.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-slate-600 to-zinc-500',
    icon: '📰',
    manageHint: 'Kelola artikel di menu Blog.',
    defaults: { title: 'Artikel Terbaru', source: 'blog_posts', limit: '' },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text' },
      {
        key: 'limit',
        label: 'Jumlah Ditampilkan',
        type: 'select',
        options: [
          { value: '', label: 'Semua' },
          { value: '3', label: '3 artikel' },
          { value: '6', label: '6 artikel' },
          { value: '9', label: '9 artikel' },
          { value: '12', label: '12 artikel' },
        ],
      },
    ],
  },
  {
    type: 'blog_search',
    label: 'Blog Search',
    description: 'Tombol pencarian — klik membuka popup untuk cari artikel blog.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-neutral-600 to-stone-500',
    icon: '🔍',
    manageHint: 'Kelola artikel di menu Blog.',
    defaults: { title: '', placeholder: 'Cari artikel...', source: 'blog_posts' },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text', placeholder: 'Opsional' },
      { key: 'placeholder', label: 'Placeholder Pencarian', type: 'text', placeholder: 'Cari artikel...' },
    ],
  },
  {
    type: 'blog_collection',
    label: 'Blog Collection',
    description: 'Pilih artikel blog tertentu secara manual untuk ditampilkan di section ini.',
    category: 'master',
    categoryLabel: 'Data Master',
    gradient: 'from-amber-600 to-yellow-500',
    icon: '🗂️',
    manageHint: 'Kelola artikel di menu Blog.',
    defaults: { title: 'Artikel Pilihan', source: 'blog_posts', post_ids: [] as string[] },
    fields: [
      { key: 'title', label: 'Judul Section', type: 'text' },
      {
        key: 'post_ids',
        label: 'Pilih Artikel',
        type: 'blogPostPicker',
        description: 'Centang artikel yang ingin ditampilkan di section ini.',
      },
    ],
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

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
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
    } else if (field.type === 'blogPostPicker' || field.type === 'productPicker') {
      values[field.key] = parseStringArray(def);
    } else if (field.type === 'richtext') {
      values[field.key] = typeof def === 'string' ? def : '';
    } else if (field.type === 'json') {
      values[field.key] = formatJsonField(def);
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
    } else if (field.type === 'blogPostPicker' || field.type === 'productPicker') {
      values[field.key] = parseStringArray(val);
    } else if (field.type === 'richtext') {
      values[field.key] = typeof val === 'string' ? val : '';
    } else if (field.type === 'json') {
      values[field.key] = formatJsonField(val);
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
      const images = parseGalleryImages(val);
      content[field.key] = images.filter((img) => img.url);
      continue;
    }

    if (field.type === 'blogPostPicker' || field.type === 'productPicker') {
      content[field.key] = parseStringArray(val);
      continue;
    }

    if (field.type === 'richtext') {
      content[field.key] = typeof val === 'string' ? val : '';
      if (type === 'rich_text') content.standalone = true;
      continue;
    }

    if (field.type === 'json') {
      const parsed = parseJsonField(val);
      if (parsed !== undefined) content[field.key] = parsed;
      else delete content[field.key];
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

  if (type === 'blog_collection') {
    const title = typeof content.title === 'string' ? content.title.trim() : '';
    const count = parseStringArray(content.post_ids).length;
    if (title && count) return `${title} · ${count} artikel dipilih`;
    if (title) return `${title} · belum ada artikel dipilih`;
    if (count) return `${count} artikel dipilih`;
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
