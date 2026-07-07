'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppModal } from '../../components/app-modal';
import { FormInput, FormSelect } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../components/mobile-floating-action';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import { hasMinRole, type StaffInvitation, type TenantStaff, type TenantRole } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

const VIEW_TABS = [
  { key: 'members', label: 'Anggota' },
  { key: 'invitations', label: 'Undangan' },
] as const;

const INVITE_ROLES: TenantRole[] = ['admin', 'editor', 'viewer'];

const ROLE_OPTIONS = INVITE_ROLES.map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_THEME: Record<
  string,
  { gradient: string; glow: string; icon: string; ring: string; chipColor: 'primary' | 'secondary' | 'warning' | 'success' | 'default' }
> = {
  owner: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-300/25',
    icon: '👑',
    ring: 'ring-amber-100',
    chipColor: 'warning',
  },
  admin: {
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'bg-violet-300/25',
    icon: '🛡️',
    ring: 'ring-violet-100',
    chipColor: 'secondary',
  },
  editor: {
    gradient: 'from-cyan-500 to-sky-600',
    glow: 'bg-cyan-300/25',
    icon: '✏️',
    ring: 'ring-cyan-100',
    chipColor: 'primary',
  },
  viewer: {
    gradient: 'from-slate-500 to-gray-600',
    glow: 'bg-slate-300/25',
    icon: '👁️',
    ring: 'ring-slate-100',
    chipColor: 'default',
  },
};

const INVITE_THEME = {
  gradient: 'from-rose-500 to-pink-600',
  glow: 'bg-rose-300/25',
  icon: '✉️',
  ring: 'ring-rose-100',
};

function getRoleTheme(role: string) {
  return ROLE_THEME[role] ?? ROLE_THEME.viewer;
}

function getInitial(email?: string | null, userId?: string): string {
  if (email?.trim()) return email.trim().charAt(0).toUpperCase();
  if (userId) return userId.charAt(0).toUpperCase();
  return '?';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface StaffCardProps {
  member: TenantStaff;
  canManage: boolean;
  onRoleChange: (staffId: string, role: string) => void;
  onRemove: (staffId: string) => void;
}

function StaffCard({ member, canManage, onRoleChange, onRemove }: StaffCardProps) {
  const theme = getRoleTheme(member.role);
  const initial = getInitial(member.email, member.user_id);
  const displayEmail = member.email ?? `${member.user_id.slice(0, 8)}…`;
  const isOwner = member.role === 'owner';

  return (
    <Card className="group overflow-hidden border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative bg-gradient-to-br ${theme.gradient} px-4 pb-10 pt-4 sm:px-5 sm:pt-5`}>
        <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${theme.glow} blur-2xl`} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Chip
                  size="sm"
                  variant="flat"
                  color={theme.chipColor}
                  className="border border-white/25 bg-white/15 capitalize backdrop-blur-sm"
                  classNames={{ content: 'font-semibold text-white text-[10px] uppercase tracking-wide' }}
                >
                  {ROLE_LABELS[member.role] ?? member.role}
                </Chip>
                <Chip
                  size="sm"
                  variant="flat"
                  className={`border backdrop-blur-sm ${member.is_active ? 'border-emerald-300/40 bg-emerald-500/20' : 'border-white/20 bg-white/10'}`}
                  classNames={{ content: `font-semibold text-[10px] ${member.is_active ? 'text-emerald-100' : 'text-white/70'}` }}
                >
                  {member.is_active ? '● Aktif' : '○ Nonaktif'}
                </Chip>
              </div>
              <p className="truncate text-base font-bold text-white sm:text-lg">{displayEmail}</p>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-xl bg-white/15 p-2 text-xl backdrop-blur-sm sm:block">
            {theme.icon}
          </div>
        </div>
      </div>

      <CardBody className="relative -mt-5 space-y-3 rounded-t-2xl bg-white px-4 pb-4 pt-4 sm:px-5">
        <p className="text-xs text-default-400">
          Bergabung {formatDate(member.created_at)}
        </p>

        {canManage && !isOwner && (
          <FormSelect
            label="Role"
            value={member.role}
            onChange={(v) => onRoleChange(member.id, v)}
            options={ROLE_OPTIONS}
          />
        )}

        {isOwner && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
            Pemilik website — role tidak dapat diubah.
          </p>
        )}

        {canManage && !isOwner && (
          <div className="border-t border-default-100 pt-3">
            <Button size="sm" color="danger" variant="light" className="w-full" onPress={() => onRemove(member.id)}>
              Hapus dari Tim
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

interface InvitationCardProps {
  invitation: StaffInvitation;
  onCancel: (id: string) => void;
}

function InvitationCard({ invitation, onCancel }: InvitationCardProps) {
  const initial = getInitial(invitation.email);
  const theme = INVITE_THEME;
  const roleTheme = getRoleTheme(invitation.role);

  return (
    <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative bg-gradient-to-br ${theme.gradient} px-4 pb-10 pt-4 sm:px-5 sm:pt-5`}>
        <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${theme.glow} blur-2xl`} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm">
              {initial}
            </div>
            <div className="min-w-0">
              <Chip
                size="sm"
                variant="flat"
                className="mb-1 border border-white/25 bg-white/15 backdrop-blur-sm"
                classNames={{ content: 'font-semibold text-white text-[10px] uppercase tracking-wide' }}
              >
                Menunggu
              </Chip>
              <p className="truncate text-base font-bold text-white sm:text-lg">{invitation.email}</p>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-xl bg-white/15 p-2 text-xl backdrop-blur-sm sm:block">
            {theme.icon}
          </div>
        </div>
      </div>

      <CardBody className="relative -mt-5 space-y-3 rounded-t-2xl bg-white px-4 pb-4 pt-4 sm:px-5">
        <div className="flex flex-wrap gap-2">
          <Chip size="sm" variant="flat" color={roleTheme.chipColor} className="capitalize">
            Role: {ROLE_LABELS[invitation.role] ?? invitation.role}
          </Chip>
          <Chip size="sm" variant="flat" className="text-xs">
            Exp: {formatDate(invitation.expires_at)}
          </Chip>
        </div>
        <Button size="sm" color="danger" variant="light" className="w-full" onPress={() => onCancel(invitation.id)}>
          Batalkan Undangan
        </Button>
      </CardBody>
    </Card>
  );
}

export default function StaffManagement() {
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const [staff, setStaff] = useState<TenantStaff[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<string>('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('editor');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');

  const canManage = role ? hasMinRole(role, 'admin') : false;

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const staffData = await apiClient<TenantStaff[]>(`/api/websites/${websiteId}/staff`);
      setStaff(staffData);
      if (canManage) {
        const invData = await apiClient<StaffInvitation[]>(
          `/api/websites/${websiteId}/staff/invitations`,
        );
        setInvitations(invData.filter((i) => !i.is_accepted));
      } else {
        setInvitations([]);
      }
    } catch {
      setStaff([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const memberStats = useMemo(() => {
    const active = staff.filter((s) => s.is_active).length;
    const owners = staff.filter((s) => s.role === 'owner').length;
    return { total: staff.length, active, owners };
  }, [staff]);

  const visibleTabs = useMemo(() => {
    if (canManage) return VIEW_TABS;
    return VIEW_TABS.filter((t) => t.key === 'members');
  }, [canManage]);

  const handleInvite = async () => {
    if (!websiteId || !email.trim()) {
      setError('Email wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    setInviteNotice('');
    try {
      const result = await apiClient<StaffInvitation & { emailSent?: boolean }>(
        `/api/websites/${websiteId}/staff/invitations`,
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), role: inviteRole }),
        },
      );
      setInviteOpen(false);
      setEmail('');
      setViewTab('invitations');
      if (result.emailSent === false) {
        setInviteNotice(
          'Undangan tersimpan, tetapi email gagal dikirim. Periksa template StaffInvitation di Console atau coba undang ulang.',
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim undangan');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (staffId: string, newRole: string) => {
    if (!websiteId || newRole === staff.find((s) => s.id === staffId)?.role) return;
    try {
      await apiClient(`/api/websites/${websiteId}/staff/${staffId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      await load();
    } catch {
      alert('Gagal mengubah role');
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!websiteId || !confirm('Hapus anggota tim ini?')) return;
    try {
      await apiClient(`/api/websites/${websiteId}/staff/${staffId}`, { method: 'DELETE' });
      await load();
    } catch {
      alert('Gagal menghapus staff');
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    if (!websiteId || !confirm('Batalkan undangan?')) return;
    try {
      await apiClient(
        `/api/websites/${websiteId}/staff/invitations/${invitationId}`,
        { method: 'DELETE' },
      );
      await load();
    } catch {
      alert('Gagal membatalkan undangan');
    }
  };

  const openInvite = () => {
    setError('');
    setInviteNotice('');
    setInviteOpen(true);
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className={`space-y-6 ${canManage ? mobileFabPagePadding : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tim</h1>
          <p className="mt-1 text-default-500">Kelola anggota tim dan undangan staff.</p>
        </div>
        {canManage && (
          <Button color="primary" onPress={openInvite} className={desktopAddButtonClass}>
            + Undang Staff
          </Button>
        )}
      </div>

      {inviteNotice && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          {inviteNotice}
        </div>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {visibleTabs.map((tab) => {
          const active = viewTab === tab.key;
          const count = tab.key === 'members' ? staff.length : invitations.length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setViewTab(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {viewTab === 'members' && !loading && staff.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip variant="flat" color="primary" className="font-medium">
            {memberStats.total} anggota
          </Chip>
          <Chip variant="flat" color="success" className="font-medium">
            {memberStats.active} aktif
          </Chip>
          {memberStats.owners > 0 && (
            <Chip variant="flat" color="warning" className="font-medium">
              {memberStats.owners} owner
            </Chip>
          )}
        </div>
      )}

      {viewTab === 'invitations' && !loading && invitations.length > 0 && (
        <Chip variant="flat" color="secondary" className="font-medium">
          {invitations.length} undangan menunggu
        </Chip>
      )}

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : viewTab === 'members' ? (
        staff.length === 0 ? (
          <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
            <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-3xl ring-4 ring-violet-50">
                👥
              </div>
              <div>
                <p className="text-lg font-semibold">Belum ada anggota tim</p>
                <p className="mt-1 max-w-sm text-sm text-default-500">
                  Undang rekan kerja untuk membantu mengelola website.
                </p>
              </div>
              {canManage && (
                <Button color="primary" onPress={openInvite} className="hidden font-semibold sm:inline-flex">
                  + Undang Staff
                </Button>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {staff.map((member) => (
              <StaffCard
                key={member.id}
                member={member}
                canManage={canManage}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveStaff}
              />
            ))}
          </div>
        )
      ) : invitations.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-3xl ring-4 ring-rose-50">
              ✉️
            </div>
            <div>
              <p className="text-lg font-semibold">Tidak ada undangan pending</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">
                Undangan yang belum diterima akan muncul di sini.
              </p>
            </div>
            {canManage && (
              <Button color="primary" onPress={openInvite} className="hidden font-semibold sm:inline-flex">
                + Undang Staff
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {invitations.map((inv) => (
            <InvitationCard key={inv.id} invitation={inv} onCancel={handleCancelInvite} />
          ))}
        </div>
      )}

      <AppModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Undang Staff Baru"
        footer={
          <>
            <Button variant="light" onPress={() => setInviteOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleInvite}>Kirim Undangan</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormInput
            label="Email"
            type="email"
            placeholder="staff@example.com"
            value={email}
            onChange={setEmail}
            required
          />
          <FormSelect
            label="Role"
            value={inviteRole}
            onChange={setInviteRole}
            options={ROLE_OPTIONS}
          />
          <div className="rounded-xl border border-default-200 bg-default-50/80 px-4 py-3 text-xs leading-relaxed text-default-500">
            <span className="font-medium text-foreground">Level akses:</span>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li><strong>Admin</strong> — kelola tim, hapus data</li>
              <li><strong>Editor</strong> — edit konten website</li>
              <li><strong>Viewer</strong> — hanya lihat</li>
            </ul>
          </div>
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      {canManage && <MobileFloatingActionBar label="Undang Staff" onClick={openInvite} />}
    </div>
  );
}
