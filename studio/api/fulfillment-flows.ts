import { jsonBody, studioRequest, websitePath } from './client';

export type FulfillmentFlowPhase = 'PRAORDER' | 'PASCAORDER';
export type FulfillmentStepFilledBy = 'admin' | 'buyer';
export type FulfillmentStepFieldType =
  | 'text'
  | 'number'
  | 'textarea'
  | 'select'
  | 'pdf'
  | 'foto'
  | 'video'
  | 'lokasi';

export interface FulfillmentStepFormField {
  key: string;
  label: string;
  type: FulfillmentStepFieldType;
  required?: boolean;
  options?: string[];
  max_files?: number;
}

export interface FulfillmentFlowStep {
  id?: string;
  sequence: number;
  phase?: FulfillmentFlowPhase;
  filled_by?: FulfillmentStepFilledBy;
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

export interface FulfillmentFlowDraft {
  name: string;
  description?: string | null;
  is_active?: boolean;
  steps: FulfillmentFlowStep[];
}

export type FulfillmentFlowUpdate = Partial<FulfillmentFlowDraft>;

export function fetchFulfillmentFlows(websiteId: string): Promise<FulfillmentFlow[]> {
  return studioRequest<FulfillmentFlow[]>(websitePath(websiteId, '/fulfillment-flows'));
}

export function fetchFulfillmentFlow(websiteId: string, flowId: string): Promise<FulfillmentFlow> {
  return studioRequest<FulfillmentFlow>(
    websitePath(websiteId, `/fulfillment-flows/${encodeURIComponent(flowId)}`),
  );
}

export function createFulfillmentFlow(websiteId: string, draft: FulfillmentFlowDraft): Promise<FulfillmentFlow> {
  return studioRequest<FulfillmentFlow>(websitePath(websiteId, '/fulfillment-flows'), {
    method: 'POST',
    ...jsonBody(draft),
  });
}

export function updateFulfillmentFlow(
  websiteId: string,
  flowId: string,
  draft: FulfillmentFlowUpdate,
): Promise<FulfillmentFlow> {
  return studioRequest<FulfillmentFlow>(
    websitePath(websiteId, `/fulfillment-flows/${encodeURIComponent(flowId)}`),
    { method: 'PATCH', ...jsonBody(draft) },
  );
}

export function deleteFulfillmentFlow(websiteId: string, flowId: string): Promise<{ success: boolean }> {
  return studioRequest<{ success: boolean }>(
    websitePath(websiteId, `/fulfillment-flows/${encodeURIComponent(flowId)}`),
    { method: 'DELETE' },
  );
}
