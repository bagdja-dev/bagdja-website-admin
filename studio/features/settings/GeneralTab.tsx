'use client';

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Switch } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { deleteWebsite, updateWebsiteActive } from '@/studio/api/domain';
import type { TenantRole, WebsiteDto } from '@/studio/api/types';
import { hasMinRole } from '@/studio/lib/roles';
import { useWebsiteStore } from '@/studio/stores/website-store';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

import { SettingsCard, StatusPill } from './parts';

function StatusCard({ website }: { website: WebsiteDto }) {
  const patchWebsite = useWebsiteStore((s) => s.patchWebsite);
  const { confirm, dialog } = useConfirm();
  const [saving, setSaving] = useState(false);

  const toggle = async (next: boolean): Promise<void> => {
    const ok = await confirm({
      title: next ? 'Aktifkan website?' : 'Nonaktifkan website?',
      description: next ? 'Website akan kembali bisa dibuka publik.' : 'Website akan disembunyikan dari publik. Data dan pengaturan tetap tersimpan.',
      confirmLabel: next ? 'Ya, aktifkan' : 'Ya, nonaktifkan',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const result = await updateWebsiteActive(website.id, next);
      patchWebsite(website.id, { is_active: result.is_active ?? next, updated_at: result.updated_at });
      notify.success(next ? 'Website diaktifkan.' : 'Website dinonaktifkan.');
    } catch (err) {
      notify.error('Gagal mengubah status website.', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard
      title="Status website"
      description="Nonaktifkan untuk menyembunyikan website dari publik."
      action={website.is_active ? <StatusPill tone="success">Aktif</StatusPill> : <StatusPill tone="neutral">Nonaktif</StatusPill>}
    >
      <Switch isSelected={website.is_active} isDisabled={saving} onValueChange={(v) => void toggle(v)} aria-label="Website aktif (publik)">
        <span className="text-sm font-semibold text-foreground">Website aktif (publik)</span>
      </Switch>
      {dialog}
    </SettingsCard>
  );
}

function DeleteDialog({ website, isOpen, onClose }: { website: WebsiteDto; isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const refresh = useWebsiteStore((s) => s.refresh);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim() === website.name.trim();

  const run = async (): Promise<void> => {
    if (!matches || deleting) return;
    setDeleting(true);
    try {
      await deleteWebsite(website.id);
      notify.success('Website dihapus.');
      // Daftar kosong → shell mengarahkan ke onboarding; selain itu website lain menjadi aktif.
      await refresh();
      router.replace('/studio');
    } catch (err) {
      notify.error('Gagal menghapus website.', errorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open && !deleting) { setTyped(''); onClose(); } }} placement="center" size="md" isDismissable={!deleting}>
      <ModalContent>
        <ModalHeader className="text-base font-semibold">Hapus website permanen?</ModalHeader>
        <ModalBody className="gap-3 text-sm text-default-600">
          <p>Semua halaman, produk, lokasi, FAQ, artikel, dan data tim terkait akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.</p>
          <Input
            label={`Ketik "${website.name}" untuk melanjutkan`}
            labelPlacement="outside"
            placeholder={website.name}
            value={typed}
            onValueChange={setTyped}
            autoComplete="off"
            classNames={{ label: 'font-semibold text-default-700' }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" isDisabled={deleting} onPress={() => { setTyped(''); onClose(); }}>Batal</Button>
          <Button color="danger" isDisabled={!matches} isLoading={deleting} onPress={() => void run()}>Ya, hapus permanen</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function DangerZone({ website }: { website: WebsiteDto }) {
  const [open, setOpen] = useState(false);
  return (
    <SettingsCard title="Zona bahaya" description="Menghapus website akan menghapus semua halaman, produk, dan data tim terkait." tone="danger">
      <Button color="danger" variant="flat" onPress={() => setOpen(true)}>Hapus website</Button>
      <DeleteDialog website={website} isOpen={open} onClose={() => setOpen(false)} />
    </SettingsCard>
  );
}

/** Tab "Umum": status publik website dan zona bahaya (hapus — owner saja). */
export function GeneralTab({ website, role }: { website: WebsiteDto; role: TenantRole | null }) {
  return (
    <div className="flex flex-col gap-5">
      <StatusCard website={website} />
      {hasMinRole(role, 'owner') && <DangerZone website={website} />}
    </div>
  );
}
