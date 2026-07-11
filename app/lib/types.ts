export interface Website {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
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

export interface WebsiteProduct {
  id: string;
  website_id: string;
  type: ProductType | string;
  category?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  detail?: string | null;
  price: number;
  images: string[];
  metadata: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
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
