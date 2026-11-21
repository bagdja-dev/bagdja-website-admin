import { jsonBody, studioRequest, websitePath } from './client';

export interface WebsiteLanguageDto {
  id: string;
  website_id: string;
  locale: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface ClientTranslationDto {
  id?: string;
  locale: string;
  name: string;
  description?: string | null;
}

export interface WebsiteClientDto {
  id: string;
  website_id: string;
  name?: string;
  logo_url: string | null;
  website_url: string | null;
  is_client?: boolean;
  is_provider?: boolean;
  is_public?: boolean;
  is_active: boolean;
  sort_order: number;
  translations?: ClientTranslationDto[];
}

export interface PartnerCategoryDto {
  id: string;
  website_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface PartnerAccountDto {
  id: string;
  partner_id: string;
  bagdja_account_id: string;
  role: string;
  status: 'active' | 'inactive';
}

export interface WebsitePartnerDto extends WebsiteClientDto {
  name: string;
  contact_whatsapp: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  is_client: boolean;
  is_provider: boolean;
  is_public: boolean;
  categories: PartnerCategoryDto[];
  bagdja_accounts: PartnerAccountDto[];
  vendor_locations: Array<{
    id: string;
    vendor_id: string;
    location_id: string;
    location?: { id: string; name: string; type: string } | null;
  }>;
}

export interface PortfolioTranslationDto {
  id?: string;
  locale: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  detail?: string | null;
  summary?: string | null;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_image?: string | null;
  seo_no_index: boolean;
  is_published: boolean;
}

export interface PortfolioPhotoDto {
  url: string;
  alt: string;
  caption: string;
}

export interface PortfolioCategoryTranslationDto {
  id?: string;
  locale: string;
  name: string;
  description?: string | null;
}

export interface PortfolioCategoryDto {
  id: string;
  website_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_public: boolean;
  is_active: boolean;
  sort_order: number;
  translations?: PortfolioCategoryTranslationDto[];
}

export interface PortfolioProjectDto {
  id: string;
  website_id: string;
  name: string;
  slug: string;
  client_id: string | null;
  category_ids?: string[];
  categories?: PortfolioCategoryDto[];
  tags: string[];
  cover_image: string | null;
  photos?: PortfolioPhotoDto[];
  video_url: string | null;
  model3d_url: string | null;
  project_url: string | null;
  project_type: string | null;
  year: number | null;
  sort_order: number;
  is_published: boolean;
  seo_no_index: boolean;
  translations?: PortfolioTranslationDto[];
}

export interface MenuTranslationDto {
  id?: string;
  locale: string;
  label: string;
  internal_slug?: string | null;
  external_url?: string | null;
  target: '_self' | '_blank';
  rel?: string | null;
  is_active: boolean;
}

export interface MenuItemDto {
  id: string;
  website_id: string;
  menu_key: string;
  parent_id: string | null;
  target_type: 'internal' | 'external';
  target_key: string | null;
  external_url: string | null;
  sort_order: number;
  is_active: boolean;
  translations?: MenuTranslationDto[];
}

export function fetchLanguages(websiteId: string) {
  return studioRequest<WebsiteLanguageDto[]>(websitePath(websiteId, '/languages'), { cache: 'no-store' });
}

export function upsertLanguage(websiteId: string, locale: string, payload: Omit<WebsiteLanguageDto, 'id' | 'website_id' | 'locale'> & { locale?: string }) {
  const method = payload.locale ? 'PATCH' : 'POST';
  const path = payload.locale
    ? websitePath(websiteId, `/languages/${encodeURIComponent(locale)}`)
    : websitePath(websiteId, '/languages');
  return studioRequest<WebsiteLanguageDto>(path, { method, ...jsonBody({ ...payload, locale }) });
}

export function removeLanguage(websiteId: string, locale: string) {
  return studioRequest<{ deleted: boolean }>(websitePath(websiteId, `/languages/${encodeURIComponent(locale)}`), { method: 'DELETE' });
}

export function fetchClients(websiteId: string) {
  return studioRequest<WebsiteClientDto[]>(websitePath(websiteId, '/clients'));
}

export function createClient(websiteId: string, payload: Partial<WebsiteClientDto>) {
  return studioRequest<WebsiteClientDto>(websitePath(websiteId, '/clients'), { method: 'POST', ...jsonBody(payload) });
}

export function updateClient(websiteId: string, clientId: string, payload: Partial<WebsiteClientDto>) {
  return studioRequest<WebsiteClientDto>(websitePath(websiteId, `/clients/${encodeURIComponent(clientId)}`), { method: 'PATCH', ...jsonBody(payload) });
}

export function removeClient(websiteId: string, clientId: string) {
  return studioRequest<{ deleted: boolean }>(websitePath(websiteId, `/clients/${encodeURIComponent(clientId)}`), { method: 'DELETE' });
}

export function upsertClientTranslation(websiteId: string, clientId: string, locale: string, payload: Omit<ClientTranslationDto, 'locale'>) {
  return studioRequest<ClientTranslationDto>(websitePath(websiteId, `/clients/${encodeURIComponent(clientId)}/translations/${encodeURIComponent(locale)}`), { method: 'PUT', ...jsonBody({ ...payload, locale }) });
}

export function fetchPartners(websiteId: string) {
  return studioRequest<WebsitePartnerDto[]>(websitePath(websiteId, '/partners'));
}

export function createPartner(websiteId: string, payload: Partial<WebsitePartnerDto> & { is_client: boolean; is_provider: boolean; category_ids?: string[]; location_ids?: string[] }) {
  return studioRequest<WebsitePartnerDto>(websitePath(websiteId, '/partners'), { method: 'POST', ...jsonBody(payload) });
}

export function updatePartner(websiteId: string, partnerId: string, payload: Partial<WebsitePartnerDto> & { category_ids?: string[]; location_ids?: string[] }) {
  return studioRequest<WebsitePartnerDto>(websitePath(websiteId, `/partners/${encodeURIComponent(partnerId)}`), { method: 'PATCH', ...jsonBody(payload) });
}

export function removePartner(websiteId: string, partnerId: string) {
  return studioRequest<{ deleted: boolean; status: 'inactive' }>(websitePath(websiteId, `/partners/${encodeURIComponent(partnerId)}`), { method: 'DELETE' });
}

export function fetchPartnerCategories(websiteId: string) {
  return studioRequest<PartnerCategoryDto[]>(websitePath(websiteId, '/partner-categories'));
}

export function createPartnerCategory(websiteId: string, payload: Partial<PartnerCategoryDto> & { name: string }) {
  return studioRequest<PartnerCategoryDto>(websitePath(websiteId, '/partner-categories'), { method: 'POST', ...jsonBody(payload) });
}

export function updatePartnerCategory(websiteId: string, categoryId: string, payload: Partial<PartnerCategoryDto> & { name: string }) {
  return studioRequest<PartnerCategoryDto>(websitePath(websiteId, `/partner-categories/${encodeURIComponent(categoryId)}`), { method: 'PATCH', ...jsonBody(payload) });
}

export function upsertPartnerTranslation(websiteId: string, partnerId: string, locale: string, payload: Omit<ClientTranslationDto, 'locale'>) {
  return studioRequest<ClientTranslationDto>(websitePath(websiteId, `/partners/${encodeURIComponent(partnerId)}/translations/${encodeURIComponent(locale)}`), { method: 'PUT', ...jsonBody({ ...payload, locale }) });
}

export function createPartnerAccount(websiteId: string, partnerId: string, payload: { bagdja_account_id: string; role: string }) {
  return studioRequest<PartnerAccountDto>(websitePath(websiteId, `/partners/${encodeURIComponent(partnerId)}/accounts`), { method: 'POST', ...jsonBody(payload) });
}

export function fetchPortfolioProjects(websiteId: string) {
  return studioRequest<PortfolioProjectDto[]>(websitePath(websiteId, '/portfolio-projects'));
}

export function fetchPortfolioProject(websiteId: string, projectId: string) {
  return studioRequest<PortfolioProjectDto>(websitePath(websiteId, `/portfolio-projects/${encodeURIComponent(projectId)}`));
}

export function createPortfolioProject(websiteId: string, payload: Partial<PortfolioProjectDto>) {
  return studioRequest<PortfolioProjectDto>(websitePath(websiteId, '/portfolio-projects'), { method: 'POST', ...jsonBody(payload) });
}

export function updatePortfolioProject(websiteId: string, projectId: string, payload: Partial<PortfolioProjectDto>) {
  return studioRequest<PortfolioProjectDto>(websitePath(websiteId, `/portfolio-projects/${encodeURIComponent(projectId)}`), { method: 'PATCH', ...jsonBody(payload) });
}

export function removePortfolioProject(websiteId: string, projectId: string) {
  return studioRequest<{ deleted: boolean }>(websitePath(websiteId, `/portfolio-projects/${encodeURIComponent(projectId)}`), { method: 'DELETE' });
}

export function upsertPortfolioTranslation(websiteId: string, projectId: string, locale: string, payload: Omit<PortfolioTranslationDto, 'locale'>) {
  return studioRequest<PortfolioTranslationDto>(websitePath(websiteId, `/portfolio-projects/${encodeURIComponent(projectId)}/translations/${encodeURIComponent(locale)}`), { method: 'PUT', ...jsonBody({ ...payload, locale }) });
}

export function fetchPortfolioCategories(websiteId: string) {
  return studioRequest<PortfolioCategoryDto[]>(websitePath(websiteId, '/portfolio-categories'));
}

export function createPortfolioCategory(websiteId: string, payload: Partial<PortfolioCategoryDto> & { name: string }) {
  return studioRequest<PortfolioCategoryDto>(websitePath(websiteId, '/portfolio-categories'), { method: 'POST', ...jsonBody(payload) });
}

export function updatePortfolioCategory(websiteId: string, categoryId: string, payload: Partial<PortfolioCategoryDto> & { name: string }) {
  return studioRequest<PortfolioCategoryDto>(websitePath(websiteId, `/portfolio-categories/${encodeURIComponent(categoryId)}`), { method: 'PATCH', ...jsonBody(payload) });
}

export function upsertPortfolioCategoryTranslation(websiteId: string, categoryId: string, locale: string, payload: Omit<PortfolioCategoryTranslationDto, 'locale'>) {
  return studioRequest<PortfolioCategoryTranslationDto>(websitePath(websiteId, `/portfolio-categories/${encodeURIComponent(categoryId)}/translations/${encodeURIComponent(locale)}`), { method: 'PUT', ...jsonBody({ ...payload, locale }) });
}

export function fetchMenu(websiteId: string, menuKey: string) {
  return studioRequest<MenuItemDto[]>(websitePath(websiteId, `/menus/${encodeURIComponent(menuKey)}`));
}

export function createMenuItem(websiteId: string, payload: Partial<MenuItemDto>) {
  return studioRequest<MenuItemDto>(websitePath(websiteId, '/menu-items'), { method: 'POST', ...jsonBody(payload) });
}

export function updateMenuItem(websiteId: string, itemId: string, payload: Partial<MenuItemDto>) {
  return studioRequest<MenuItemDto>(websitePath(websiteId, `/menu-items/${encodeURIComponent(itemId)}`), { method: 'PATCH', ...jsonBody(payload) });
}

export function removeMenuItem(websiteId: string, itemId: string) {
  return studioRequest<{ deleted: boolean }>(websitePath(websiteId, `/menu-items/${encodeURIComponent(itemId)}`), { method: 'DELETE' });
}

export function upsertMenuTranslation(websiteId: string, itemId: string, locale: string, payload: Omit<MenuTranslationDto, 'locale'>) {
  return studioRequest<MenuTranslationDto>(websitePath(websiteId, `/menu-items/${encodeURIComponent(itemId)}/translations/${encodeURIComponent(locale)}`), { method: 'PUT', ...jsonBody({ ...payload, locale }) });
}
