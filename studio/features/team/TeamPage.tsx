'use client';

import { Input, Select, SelectItem } from '@heroui/react';
import { useCallback, useMemo, useState } from 'react';

import {
  cancelStaffInvitation,
  fetchStaffInvitations,
  fetchTeamMembers,
  inviteStaff,
  removeStaffMember,
  updateStaffRole,
  type StaffInvitation,
  type WebsiteTeamMember,
} from '@/studio/api/team';
import { errorMessage } from '@/studio/api/client';
import type { TenantRole } from '@/studio/api/types';
import { hasMinRole, ROLE_LABEL } from '@/studio/lib/roles';
import { useActiveRole, useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  actionsColumn,
  chipColumn,
  chipFilter,
  DataListPage,
  dateColumn,
  type DataColumn,
  type PrimaryAction,
  type RowAction,
  useDataList,
} from '@/studio/ui/data-list';
import { Icon } from '@/studio/ui/icons';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';

const INVITABLE_ROLES: Exclude<TenantRole, 'owner'>[] = ['admin', 'editor', 'viewer'];

type TeamTab = 'members' | 'invitations';

function memberLabel(member: WebsiteTeamMember): string {
  return member.email ?? `ID pengguna ${member.user_id.slice(0, 8)}…`;
}

function createMemberColumns(
  onRemove: (member: WebsiteTeamMember) => void,
  onRoleChange: (member: WebsiteTeamMember, role: Exclude<TenantRole, 'owner'>) => void,
): DataColumn<WebsiteTeamMember>[] {
  const actions: RowAction<WebsiteTeamMember>[] = [
    {
      key: 'remove',
      label: 'Hapus dari tim',
      icon: 'trash',
      danger: true,
      minRole: 'admin',
      isHidden: (member) => member.role === 'owner',
      onAction: onRemove,
    },
  ];

  return [
    {
      key: 'member',
      header: 'Anggota',
      mobile: 'title',
      render: (member, ctx) => (
        <div className="min-w-0 md:max-w-[24rem]">
          <span className="block truncate text-sm font-bold text-foreground">{memberLabel(member)}</span>
          {!member.email && <p className="mt-0.5 truncate text-[13px] text-default-500">{member.user_id}</p>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      mobile: 'meta',
      render: (member, ctx) => {
        if (!ctx.canAct('admin') || member.role === 'owner') {
          return <span className="text-sm font-medium text-default-700">{ROLE_LABEL[member.role] ?? member.role}</span>;
        }
        return (
          <Select
            aria-label={`Role ${memberLabel(member)}`}
            size={ctx.variant === 'card' ? 'sm' : 'sm'}
            selectedKeys={[member.role]}
            onChange={(event) => {
              const nextRole = event.target.value as Exclude<TenantRole, 'owner'>;
              if (INVITABLE_ROLES.includes(nextRole)) onRoleChange(member, nextRole);
            }}
            isDisabled={ctx.isPending(member.id)}
            className={ctx.variant === 'card' ? 'min-w-[140px]' : 'min-w-[130px]'}
            variant="bordered"
          >
            {INVITABLE_ROLES.map((role) => <SelectItem key={role}>{ROLE_LABEL[role]}</SelectItem>)}
          </Select>
        );
      },
    },
    chipColumn({
      key: 'status',
      header: 'Status',
      getValue: (member) => member.is_active ? 'active' : 'inactive',
      options: {
        active: { label: 'Aktif', tone: 'success' },
        inactive: { label: 'Nonaktif', tone: 'default' },
      },
    }),
    dateColumn({ key: 'created_at', header: 'Bergabung', getValue: (member) => member.created_at }),
    actionsColumn({ actions, getRowLabel: memberLabel }),
  ];
}

function createInvitationColumns(
  onCancel: (invitation: StaffInvitation) => void,
): DataColumn<StaffInvitation>[] {
  const actions: RowAction<StaffInvitation>[] = [
    {
      key: 'cancel',
      label: 'Batalkan undangan',
      icon: 'trash',
      danger: true,
      minRole: 'admin',
      onAction: onCancel,
    },
  ];
  return [
    {
      key: 'email',
      header: 'Email',
      mobile: 'title',
      render: (invitation) => <span className="block max-w-[25rem] truncate text-sm font-bold text-foreground">{invitation.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      mobile: 'meta',
      render: (invitation) => <span className="text-sm text-default-700">{ROLE_LABEL[invitation.role] ?? invitation.role}</span>,
    },
    dateColumn({ key: 'created_at', header: 'Dikirim', getValue: (invitation) => invitation.created_at }),
    dateColumn({ key: 'expires_at', header: 'Kedaluwarsa', getValue: (invitation) => invitation.expires_at }),
    actionsColumn({ actions, getRowLabel: (invitation) => invitation.email }),
  ];
}

interface InviteStaffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited: (invitation: StaffInvitation, emailSent?: boolean) => void;
}

function InviteStaffDrawer({ isOpen, onClose, onInvited }: InviteStaffDrawerProps) {
  const websiteId = useActiveWebsiteId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<TenantRole, 'owner'>>('editor');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = useCallback(async () => {
    if (!websiteId) throw new Error('Website aktif tidak ditemukan.');
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Email wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await inviteStaff(websiteId, normalizedEmail, role);
      onInvited(result, result.emailSent);
      setEmail('');
      setRole('editor');
      onClose();
    } catch (submitError) {
      setError(errorMessage(submitError, 'Gagal mengirim undangan.'));
    } finally {
      setSaving(false);
    }
  }, [email, onClose, onInvited, role, websiteId]);

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Undang anggota tim"
      description="Berikan akses kepada rekan kerja untuk mengelola website."
      onSubmit={submit}
      submitLabel="Kirim undangan"
      isSubmitting={saving}
      isSubmitDisabled={!email.trim()}
    >
      <Input
        type="email"
        label="Email"
        labelPlacement="outside"
        placeholder="nama@email.com"
        value={email}
        onValueChange={setEmail}
        isRequired
        variant="bordered"
      />
      <Select
        label="Role"
        labelPlacement="outside"
        selectedKeys={[role]}
        onChange={(event) => {
          const nextRole = event.target.value as Exclude<TenantRole, 'owner'>;
          if (INVITABLE_ROLES.includes(nextRole)) setRole(nextRole);
        }}
        variant="bordered"
      >
        {INVITABLE_ROLES.map((option) => <SelectItem key={option}>{ROLE_LABEL[option]}</SelectItem>)}
      </Select>
      <div className="rounded-xl border border-default-200 bg-default-50 px-4 py-3 text-sm text-default-600">
        <p className="font-semibold text-foreground">Hak akses role</p>
        <ul className="mt-2 space-y-1">
          <li><strong>Admin</strong> — kelola tim dan pengaturan website.</li>
          <li><strong>Editor</strong> — kelola dan ubah konten.</li>
          <li><strong>Pengamat</strong> — melihat informasi tanpa mengubahnya.</li>
        </ul>
      </div>
      {error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">{error}</p>}
    </EditDrawer>
  );
}

export function TeamPage() {
  const websiteId = useActiveWebsiteId();
  const role = useActiveRole();
  const canManage = hasMinRole(role, 'admin');
  const { confirm, dialog } = useConfirm();
  const [activeTab, setActiveTab] = useState<TeamTab>('members');
  const [inviteOpen, setInviteOpen] = useState(false);

  const memberFilters = useMemo(() => [
    chipFilter<WebsiteTeamMember>({
      key: 'status',
      label: 'Status',
      options: [{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }],
      getValue: (member) => member.is_active ? 'active' : 'inactive',
    }),
  ], []);

  const loadMembers = useCallback(
    () => websiteId ? fetchTeamMembers(websiteId) : Promise.resolve([]),
    [websiteId],
  );
  const loadInvitations = useCallback(
    async () => websiteId && canManage
      ? (await fetchStaffInvitations(websiteId)).filter((invitation) => !invitation.is_accepted)
      : [],
    [canManage, websiteId],
  );

  const memberList = useDataList<WebsiteTeamMember>({
    mode: 'client',
    load: loadMembers,
    searchKeys: ['email', 'user_id', 'role'],
    filters: memberFilters,
  });
  const invitationList = useDataList<StaffInvitation>({
    mode: 'client',
    load: loadInvitations,
    searchKeys: ['email', 'role'],
  });

  const handleRemoveMember = useCallback(async (member: WebsiteTeamMember) => {
    if (!websiteId || member.role === 'owner') return;
    const accepted = await confirm({
      title: 'Hapus anggota dari tim?',
      description: `Akses ${memberLabel(member)} ke website akan dicabut.`,
      confirmLabel: 'Hapus anggota',
      tone: 'danger',
    });
    if (!accepted) return;
    try {
      await removeStaffMember(websiteId, member.id);
      memberList.removeRows([member.id]);
      notify.success('Anggota dihapus dari tim.');
    } catch (error) {
      notify.error(errorMessage(error, 'Gagal menghapus anggota tim.'));
    }
  }, [confirm, memberList, websiteId]);

  const handleRoleChange = useCallback(async (
    member: WebsiteTeamMember,
    nextRole: Exclude<TenantRole, 'owner'>,
  ) => {
    if (!websiteId || member.role === 'owner' || nextRole === member.role) return;
    await memberList.optimisticUpdate(
      member.id,
      { role: nextRole },
      () => updateStaffRole(websiteId, member.id, nextRole),
      'Gagal mengubah role anggota',
    );
  }, [memberList, websiteId]);

  const handleCancelInvitation = useCallback(async (invitation: StaffInvitation) => {
    if (!websiteId) return;
    const accepted = await confirm({
      title: 'Batalkan undangan?',
      description: `Undangan untuk ${invitation.email} tidak dapat digunakan lagi.`,
      confirmLabel: 'Batalkan undangan',
      tone: 'danger',
    });
    if (!accepted) return;
    try {
      await cancelStaffInvitation(websiteId, invitation.id);
      invitationList.removeRows([invitation.id]);
      notify.success('Undangan dibatalkan.');
    } catch (error) {
      notify.error(errorMessage(error, 'Gagal membatalkan undangan.'));
    }
  }, [confirm, invitationList, websiteId]);

  const handleInvited = useCallback((invitation: StaffInvitation, emailSent?: boolean) => {
    invitationList.replaceRows([invitation, ...invitationList.allRows.filter((item) => item.id !== invitation.id)]);
    setActiveTab('invitations');
    if (emailSent === false) {
      notify.warning('Undangan tersimpan, tetapi email gagal dikirim. Periksa konfigurasi email lalu coba lagi.');
    } else {
      notify.success('Undangan berhasil dikirim.');
    }
  }, [invitationList]);

  const memberColumns = useMemo(
    () => createMemberColumns((member) => void handleRemoveMember(member), (member, nextRole) => void handleRoleChange(member, nextRole)),
    [handleRemoveMember, handleRoleChange],
  );
  const invitationColumns = useMemo(
    () => createInvitationColumns((invitation) => void handleCancelInvitation(invitation)),
    [handleCancelInvitation],
  );

  const primaryAction: PrimaryAction | undefined = canManage
    ? { label: 'Undang anggota', icon: 'plus', minRole: 'admin', onPress: () => setInviteOpen(true) }
    : undefined;

  if (!websiteId) {
    return (
      <StatusScreen
        icon={<Icon name="warning" size={28} />}
        title="Website belum dipilih"
        description="Pilih website aktif sebelum mengelola anggota tim."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-default-200" role="tablist" aria-label="Data tim">
        <TabButton label="Anggota" count={memberList.totalCount} active={activeTab === 'members'} onPress={() => setActiveTab('members')} />
        {canManage && (
          <TabButton label="Undangan" count={invitationList.totalCount} active={activeTab === 'invitations'} onPress={() => setActiveTab('invitations')} />
        )}
      </div>

      {activeTab === 'members' ? (
        <DataListPage<WebsiteTeamMember>
          title="Tim"
          description="Kelola anggota dan akses mereka ke website ini."
          list={memberList}
          columns={memberColumns}
          getRowLabel={memberLabel}
          itemNoun="anggota"
          primaryAction={primaryAction}
          searchPlaceholder="Cari email atau role..."
          emptyState={{ title: 'Belum ada anggota tim', description: 'Undang rekan kerja untuk membantu mengelola website.' }}
        />
      ) : (
        <DataListPage<StaffInvitation>
          title="Undangan tim"
          description="Pantau dan kelola undangan anggota tim yang belum diterima."
          list={invitationList}
          columns={invitationColumns}
          getRowLabel={(invitation) => invitation.email}
          itemNoun="undangan"
          primaryAction={primaryAction}
          searchPlaceholder="Cari email undangan..."
          emptyState={{ title: 'Belum ada undangan pending', description: 'Undangan yang belum diterima akan muncul di sini.' }}
        />
      )}

      {canManage && <InviteStaffDrawer isOpen={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={handleInvited} />}
      {dialog}
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onPress}
      className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${
        active ? 'border-primary text-primary' : 'border-transparent text-default-600 hover:text-foreground'
      }`}
    >
      {label}
      <span className="rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-600">{count}</span>
    </button>
  );
}
