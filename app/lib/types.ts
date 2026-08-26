export interface Website {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  domain_verification_token?: string | null;
  domain_verified_at?: string | null;
  template_id?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  social_links?: Record<string, unknown>;
  opening_hours?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWebsite {
  website: Website;
  role: string;
  is_active: boolean;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  preview_image?: string | null;
  structure?: Record<string, unknown>;
  is_active: boolean;
}

export type PagePlacement = 'regular' | 'header' | 'footer';

export interface WebsitePage {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>;
  is_home: boolean;
  placement: PagePlacement;
  order: number;
  sections?: WebsiteSection[];
  created_at: string;
  updated_at: string;
}

export interface WebsiteSection {
  id: string;
  page_id: string;
  type: string;
  content: Record<string, unknown>;
  order: number;
  created_at: string;
  updated_at: string;
}

export type ProductType = 'product' | 'service' | 'package' | 'digital';

export interface WebsiteCategory {
  id: string;
  website_id: string;
  label: string;
  images: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Satu cara/link pembayaran checkout — polymorphic per `payment_mode`. Mode baru cukup nambah union di sini + config di payment-mode-types.ts. */
export interface LynkPaymentMeta {
  payment_mode: 'LYNK';
  payment_link: string;
}

export interface AddToCartPaymentMeta {
  payment_mode: 'ADD_TO_CART';
}

export interface EscrowPaymentMeta {
  payment_mode: 'ESCROW';
}

export type PaymentMetaEntry =
  | LynkPaymentMeta
  | AddToCartPaymentMeta
  | EscrowPaymentMeta;

export interface WebsiteProduct {
  id: string;
  website_id: string;
  type: ProductType | string;
  category_id?: string | null;
  /** Kalau diisi, produk ini adalah varian (mis. warna/ukuran) dari produk lain. */
  parent_product_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  detail?: string | null;
  price: number;
  images: string[];
  /** Video produk (opsional), diupload lewat bagdja-storage-service. */
  video_url?: string | null;
  /** Model 3D produk (opsional, glTF/GLB), diupload lewat bagdja-storage-service. */
  model3d_url?: string | null;
  metadata: Record<string, unknown>;
  payment_meta: PaymentMetaEntry[];
  sort_order: number;
  is_active: boolean;
  /** Order Handling Phase 3 — SOP pengiriman kustom (null = tidak butuh tracking). */
  fulfillment_flow_id?: string | null;
  /** Order Handling Phase 3 §3.0.2 — masa garansi (hari) sebelum seller boleh force-complete transaksi kalau buyer tidak konfirm terima barang. Null = force-complete dinonaktifkan untuk produk ini. */
  final_release_guaranty_days?: number | null;
  /** Berat produk (gram), untuk hitung ongkir. Null = default 250g dipakai saat hitung ongkir. */
  weight_grams?: number | null;
  /** Panjang kemasan (cm). Null = default 30cm. */
  length_cm?: number | null;
  /** Lebar kemasan (cm). Null = default 30cm. */
  width_cm?: number | null;
  /** Tinggi kemasan (cm). Null = default 5cm. */
  height_cm?: number | null;
  created_at: string;
  updated_at: string;
}

export type LocationType = 'branch' | 'warehouse' | 'pickup' | 'office';

export interface WebsiteLocation {
  id: string;
  website_id: string;
  name: string;
  type: LocationType | string;
  is_primary: boolean;
  is_public: boolean;
  address_line?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  phone?: string | null;
  whatsapp?: string | null;
  opening_hours: Record<string, unknown>;
  maps_url?: string | null;
  maps_embed?: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  /** Nama area di bagdja-shipping-service (hasil search) — dipakai sebagai asal pengiriman saat hitung ongkir. Kosong = lokasi ini tidak bisa dipilih buyer sebagai asal kirim. */
  shipping_area_name?: string | null;
  /** Kode kurir aktif untuk lokasi ini (mis. ['jne','sicepat']) — kosong = shipping-service pakai daftar default sendiri. */
  active_couriers?: string[];
  created_at: string;
  updated_at: string;
}

export type FaqCategory = 'general' | 'booking' | 'payment' | 'product';

export interface WebsiteFaq {
  id: string;
  website_id: string;
  question: string;
  answer: string;
  category?: string | null;
  sort_order: number;
  is_public: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WebsiteBlogPost {
  id: string;
  website_id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  cover_image?: string | null;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantStaff {
  id: string;
  website_id: string;
  user_id: string;
  email?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface StaffInvitation {
  id: string;
  website_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  is_accepted: boolean;
  created_at: string;
}

export type TenantRole = 'owner' | 'admin' | 'editor' | 'viewer';

const ROLE_LEVEL: Record<TenantRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

export function hasMinRole(userRole: string, minRole: TenantRole): boolean {
  return (ROLE_LEVEL[userRole as TenantRole] ?? -1) >= ROLE_LEVEL[minRole];
}

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  product: 'Produk',
  service: 'Layanan',
  package: 'Paket',
  digital: 'Digital',
};

/**
 * Order Handling Phase 1 (plan/website-builder/order-hanlde-plan.md) —
 * daftar pesanan masuk ke website (tenant-scoped), dibaca lewat
 * `GET /api/websites/:websiteId/transactions`.
 */
export interface TransactionProduct {
  name?: string;
  images?: string[];
}

export interface TransactionItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  order?: { product?: TransactionProduct | null } | null;
}

export interface EscrowMilestoneSummary {
  id: string;
  sequence: number;
  status: string;
}

export interface EscrowSummary {
  id: string;
  status: string;
  amount_held: number;
  amount_released: number;
  remaining_hold: number;
  milestones: EscrowMilestoneSummary[];
}

/** Tersimpan di `transaction.metadata.shipping` — hanya ada kalau checkout lewat flow baru (search-select + cek ongkir real, bukan tombol label statis). */
export interface TransactionShippingMetadata {
  location_id: string;
  destination_area_id: string;
  destination_area_name?: string;
  courier_code: string;
  courier_service_name?: string;
  /** Nama layanan hasil resolve server-side saat submit (lihat transactions.service.ts createCheckout()) — sumber kebenaran tampilan kalau `courier_service_name` client kosong. */
  resolved_service?: string;
}

export interface WebsiteTransaction {
  id: string;
  website_id: string;
  buyer_user_id: string;
  buyer_identifier: string | null;
  recipient_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  postal_code: string | null;
  courier: string | null;
  /** Biaya ongkir — kolom terpisah dari total_amount (breakdown). Selalu berisi angka (default 0), BUKAN indikator "ongkir belum ditentukan" — pakai `metadata.shipping` untuk itu. */
  shipping_cost?: number | null;
  total_amount: number;
  currency: string;
  payment_mode: 'ADD_TO_CART' | 'ESCROW';
  status: string;
  /** Order Handling Phase 3 — status BARANG, independen dari `status` (uang) di atas. */
  fulfillment_status: string;
  checkout_url: string | null;
  created_at: string;
  items?: TransactionItem[];
  /** Hanya ada di response detail (`GET .../transactions/:id`), bukan list. */
  escrow?: EscrowSummary | null;
  /** `{ order_id: progress }` — hanya ada di response detail. */
  fulfillment?: Record<string, OrderFulfillmentProgress>;
  metadata?: { shipping?: TransactionShippingMetadata } | null;
}

/**
 * Order Handling Phase 3 (plan/website-builder/order-hanlde-plan.md §3.0.1)
 * — Master Flow: SOP pengiriman kustom, reusable lintas produk 1 website.
 */
export interface FulfillmentStepFormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
}

export interface FulfillmentFlowStep {
  id?: string;
  sequence: number;
  status_name: string;
  description?: string | null;
  process_day?: number | null;
  form_schema?: FulfillmentStepFormField[] | null;
  release_percentage?: number | null;
  guaranty_days?: number | null;
}

export interface FulfillmentFlow {
  id: string;
  website_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  steps: FulfillmentFlowStep[];
  created_at: string;
  updated_at: string;
}

export interface OrderFulfillmentStepProgress {
  stepName: string;
  description: string | null;
  processDay: number | null;
  releasePercentage: number | null;
  guarantyDays: number | null;
  formSchema: FulfillmentStepFormField[] | null;
  completed: boolean;
  formData: Record<string, unknown> | null;
  releaseApproved: boolean;
  releaseAmount: number | null;
  releaseApprovedBy: 'buyer' | 'seller_guaranty' | null;
  disputed: boolean;
}

export interface OrderFulfillmentProgress {
  flowName: string;
  steps: OrderFulfillmentStepProgress[];
}

/** Status pembayaran/escrow — vocabulary sama dengan `EscrowStatus` payment-service + `CANCELLED`/`PENDING_PAYMENT` lokal. */
export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu pembayaran',
  PENDING_PAYMENT: 'Menunggu pembayaran',
  HELD: 'Dibayar — dana ditahan',
  COMPLETED: 'Selesai',
  REFUNDED: 'Direfund',
  CLOSED: 'Ditutup',
  DISPUTED: 'Dalam sengketa',
  CANCELLED: 'Dibatalkan',
};

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  branch: 'Cabang',
  warehouse: 'Gudang',
  pickup: 'Pickup Point',
  office: 'Kantor',
};

export const FAQ_CATEGORY_LABELS: Record<string, string> = {
  general: 'Umum',
  booking: 'Booking',
  payment: 'Pembayaran',
  product: 'Produk',
};
