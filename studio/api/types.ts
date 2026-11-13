/**
 * DTO Studio — ditulis ulang (tidak mengimpor app/lib/types) dan diselaraskan
 * dengan template-contract.md §1 serta DTO NestJS bagdja-website-api.
 */

export type BusinessProfileId =
  | 'service_business'
  | 'online_store'
  | 'project_quotation'
  | 'place_rental'
  | 'vehicle_rental'
  | 'event_ticketing'
  | 'gathering'
  | 'digital_goods'
  | 'company_profile'
  | 'legacy';

export type ModuleKey =
  // inti — selalu aktif
  | 'site_content'
  | 'team'
  | 'subscription'
  | 'wallet'
  | 'settings'
  // opsional
  | 'catalog'
  | 'orders'
  | 'quotes'
  | 'billing'
  | 'fulfillment'
  | 'events'
  | 'digital_delivery'
  | 'locations'
  | 'vendors'
  | 'customer_chat'
  | 'faq'
  | 'blog'
  | 'android_app'
  // baru, belum dibangun
  | 'appointments'
  | 'rental'
  | 'asset_tracking'
  | 'ticketing';

export type AvailabilityStatus = 'available' | 'coming_soon';

export type TenantRole = 'owner' | 'admin' | 'editor' | 'viewer';

/** `GET /api/business-profiles` → `profiles[]` */
export interface BusinessProfileDto {
  id: Exclude<BusinessProfileId, 'legacy'>;
  label: string;
  examples: string;
  icon: string;
  status: AvailabilityStatus;
  defaultModules: ModuleKey[];
  sortOrder: number;
}

/** `GET /api/business-profiles` → `modules[]` */
export interface ModuleInfoDto {
  key: ModuleKey;
  label: string;
  description: string;
  core: boolean;
  dependsOn: ModuleKey[];
  status: AvailabilityStatus;
  ownerOnly: boolean;
}

export interface BusinessProfilesResponseDto {
  profiles: BusinessProfileDto[];
  modules: ModuleInfoDto[];
}

/** `manifest.preview` (template-contract §3). */
export interface TemplateManifestPreviewDto {
  imageUrl?: string;
  demoPath?: string;
}

/** `website_templates.manifest` (R1). `null` = template belum mendeklarasikan manifest. */
export interface TemplateManifestDto {
  slug: string;
  name: string;
  version: string;
  rendererApiVersion: number;
  isBuiltin: boolean;
  businessProfiles: BusinessProfileId[];
  capabilities: string[];
  sections: string[];
  preview?: TemplateManifestPreviewDto;
}

/** Item `GET /api/templates[?business_profile=]`. */
export interface WebsiteTemplateDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  preview_image: string | null;
  structure: Record<string, unknown>;
  business_profiles: BusinessProfileId[];
  manifest: TemplateManifestDto | null;
  is_active: boolean;
  /**
   * Belum ada di API (marketplace R2–R4). Opsional supaya tombol "Beli" bisa
   * dirender dari data begitu kolom harga/pembuat tersedia; kosong = gratis, Bagdja.
   */
  price?: number | null;
  author_name?: string | null;
}

/** Body `POST /api/websites` (CreateWebsiteDto). */
export interface CreateWebsiteRequestDto {
  name: string;
  slug: string;
  template_id: string;
  template_trial_submission_id?: string;
  business_profile: Exclude<BusinessProfileId, 'legacy'>;
  logo_url?: string;
  whatsapp?: string;
}

/** Respons `POST /api/websites` (entity website; field lain diabaikan). */
export interface CreatedWebsiteDto {
  id: string;
  name: string;
  slug: string;
}

export type WebsiteFooterBlockType = 'brand' | 'page_links' | 'contact' | 'social_links' | 'text' | 'copyright';

export interface WebsiteFooterBlockDto {
  id: string;
  type: WebsiteFooterBlockType;
  content: Record<string, unknown>;
}

export interface WebsiteFooterSettingsDto {
  blocks: WebsiteFooterBlockDto[];
}

export type ThemeModeDto = 'light' | 'dark';
export type ThemeAccentDto = 'amber' | 'blue' | 'emerald' | 'rose' | 'violet' | 'indigo' | 'orange' | 'teal';
export type ThemePresetDto = 'dark' | 'light' | 'custom';
export type ThemeHeadingScaleDto = 'compact' | 'default' | 'large';
export type ThemeHeadingWeightDto = '500' | '600' | '700';
export type ThemeBodyWeightDto = '400' | '500';
export type ThemeFontDto = 'Inter' | 'Poppins' | 'Roboto' | 'Open Sans' | 'Lato' | 'Montserrat' | 'Playfair Display' | 'Merriweather';

export interface WebsiteThemeConfigDto {
  mode?: ThemeModeDto;
  accent?: ThemeAccentDto;
  preset?: ThemePresetDto;
  font?: string;
  colors?: {
    background?: string;
    surface?: string;
    text?: string;
    textMuted?: string;
    accent?: string;
    accentHover?: string;
    border?: string;
    onAccent?: string;
    heading?: string;
    accentMuted?: string;
    success?: string;
    warning?: string;
    danger?: string;
  };
  components?: {
    header?: { background?: string; text?: string; border?: string };
    footer?: { background?: string; text?: string; heading?: string; link?: string; border?: string };
    button?: { primaryBackground?: string; primaryText?: string; secondaryText?: string; secondaryBorder?: string };
  };
  typography?: {
    headingFont?: ThemeFontDto;
    bodyFont?: ThemeFontDto;
    headingWeight?: ThemeHeadingWeightDto;
    bodyWeight?: ThemeBodyWeightDto;
    headingScale?: ThemeHeadingScaleDto;
  };
}

/** `GET /api/websites/slug-availability?slug=` */
export interface WebsiteSlugAvailabilityDto {
  slug: string;
  available: boolean;
}

export interface WebsiteModuleStateDto {
  key: ModuleKey;
  enabled: boolean;
  core: boolean;
  status: AvailabilityStatus;
  dependsOn: ModuleKey[];
  blockedReason: string | null;
}

/** `GET|PATCH /api/websites/:id/modules` */
export interface WebsiteModulesResponseDto {
  businessProfile: BusinessProfileId;
  enabledModules: ModuleKey[];
  modules: WebsiteModuleStateDto[];
}

/** Body `PATCH /api/websites/:id/modules` (owner). */
export interface UpdateWebsiteModulesRequestDto {
  enable?: ModuleKey[];
  disable?: ModuleKey[];
}

/** Objek `website` dari `GET /api/user/websites`. */
export interface WebsiteDto {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  domain_verified_at?: string | null;
  template_id?: string | null;
  template_runtime_version?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Peta platform → username/URL (mis. `instagram`, `facebook`, `tiktok`). */
  social_links?: Record<string, unknown> | null;
  /** Jam operasional; bentuk yang diedit UI: `{ note: string }` (kosong = `{}`). */
  opening_hours?: Record<string, unknown> | null;
  theme?: WebsiteThemeConfigDto | null;
  footer_settings?: WebsiteFooterSettingsDto | null;
  notification_sound_enabled?: boolean;
  notification_sound_url?: string | null;
  /** Kontrak §1.3 — opsional selama API S1 belum rilis (dianggap `legacy`). */
  business_profile?: BusinessProfileId;
  /** Nilai mentah kolom; untuk `legacy` kosong = semua modul `available`. */
  enabled_modules?: ModuleKey[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Item `GET /api/user/websites`. */
export interface UserWebsiteDto {
  website: WebsiteDto;
  role: TenantRole;
  is_active: boolean;
}

export interface WebsiteNotificationDto {
  id: string;
  website_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponseDto {
  items?: WebsiteNotificationDto[];
}

export interface CountResponseDto {
  count: number;
}

export interface PaginatedMetaResponseDto {
  meta: { total: number };
}

export interface GatheringCalendarRowDto {
  status: string;
  workflow_step: string;
}

export interface RealtimeTokenResponseDto {
  access_token?: string;
  accessToken?: string;
  channels?: string[];
}
