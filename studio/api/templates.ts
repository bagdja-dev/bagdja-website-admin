import { studioRequest } from './client';
import type { WebsiteTemplateDto } from './types';

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
  fields: Array<{
    key: string;
    label: string;
    type: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    default?: unknown;
    options?: Array<{ value: string; label: string }>;
    itemFields?: any;
    minItems?: number;
    maxItems?: number;
    multiple?: boolean;
  }>;
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
