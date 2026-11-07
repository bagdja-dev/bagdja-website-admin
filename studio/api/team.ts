import { jsonBody, studioRequest, websitePath } from './client';
import type { TenantRole } from './types';

export interface WebsiteTeamMember {
  id: string;
  website_id: string;
  user_id: string;
  email?: string | null;
  role: TenantRole;
  is_active: boolean;
  created_at: string;
}

export interface StaffInvitation {
  id: string;
  website_id: string;
  email: string;
  role: TenantRole;
  expires_at: string;
  is_accepted: boolean;
  created_at: string;
}

export interface StaffInvitationResult extends StaffInvitation {
  emailSent?: boolean;
}

export function fetchTeamMembers(websiteId: string): Promise<WebsiteTeamMember[]> {
  return studioRequest<WebsiteTeamMember[]>(websitePath(websiteId, '/staff'));
}

export function fetchStaffInvitations(websiteId: string): Promise<StaffInvitation[]> {
  return studioRequest<StaffInvitation[]>(websitePath(websiteId, '/staff/invitations'));
}

export function inviteStaff(
  websiteId: string,
  email: string,
  role: Exclude<TenantRole, 'owner'>,
): Promise<StaffInvitationResult> {
  return studioRequest<StaffInvitationResult>(websitePath(websiteId, '/staff/invitations'), {
    method: 'POST',
    ...jsonBody({ email, role }),
  });
}

export function updateStaffRole(
  websiteId: string,
  staffId: string,
  role: TenantRole,
): Promise<void> {
  return studioRequest<void>(websitePath(websiteId, `/staff/${encodeURIComponent(staffId)}`), {
    method: 'PATCH',
    ...jsonBody({ role }),
  });
}

export function removeStaffMember(websiteId: string, staffId: string): Promise<void> {
  return studioRequest<void>(
    websitePath(websiteId, `/staff/${encodeURIComponent(staffId)}`),
    { method: 'DELETE' },
  );
}

export function cancelStaffInvitation(websiteId: string, invitationId: string): Promise<void> {
  return studioRequest<void>(
    websitePath(websiteId, `/staff/invitations/${encodeURIComponent(invitationId)}`),
    { method: 'DELETE' },
  );
}
