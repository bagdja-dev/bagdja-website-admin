import { studioRequest } from './client';
import type { WebsiteTemplateDto } from './types';

export interface TemplateManifestField {
  key: string;
  label: string;
  /** text | textarea | richtext | number | url | phone | email | select | iconPicker | switch | image | gallery | list | …Picker */
  type: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  itemFields?: TemplateManifestField[];
  minItems?: number;
  maxItems?: number;
  multiple?: boolean;
  /** Tampil hanya bila nilai field `field` (level yang sama) sama dengan `equals`; nilai yang disembunyikan tetap disimpan. */
  showWhen?: { field: string; equals: string | string[] };
  /** `select` satu pilihan sebagai chip/segmen, bukan dropdown. */
  display?: 'segmented';
}

export interface TemplateManifestSection {
  type: string;
  label: string;
  category: string;
  icon: string;
  description?: string;
  requiredModule?: string;
  dataSource?: string;
  singleton?: boolean;
  pinned?: 'top';
  fields: TemplateManifestField[];
  defaults: Record<string, unknown>;
}

export interface TemplateManifestResponse {
  slug: string;
  name: string;
  version: string;
  rendererApiVersion: number;
  isBuiltin: boolean;
  businessProfiles: string[];
  capabilities: string[];
  sections: string[];
  preview?: { imageUrl?: string; demoPath?: string };
  sectionSchemas?: TemplateManifestSection[];
}

export interface SectionSchemasResponseDto {
  catalogVersion: number;
  sections: TemplateManifestSection[];
}

function templatesPath(suffix = ''): string {
  return `/api/templates${suffix}`;
}

export function fetchWebsiteTemplates(businessProfile?: string): Promise<WebsiteTemplateDto[]> {
  const url = businessProfile ? `${templatesPath()}?business_profile=${encodeURIComponent(businessProfile)}` : templatesPath();
  return studioRequest<WebsiteTemplateDto[]>(url);
}

export function fetchTemplateManifest(slug: string): Promise<TemplateManifestResponse> {
  return studioRequest<TemplateManifestResponse>(`${templatesPath()}/${encodeURIComponent(slug)}/manifest`);
}

export function fetchSectionSchemas(): Promise<SectionSchemasResponseDto> {
  return studioRequest<SectionSchemasResponseDto>('/api/section-schemas');
}
