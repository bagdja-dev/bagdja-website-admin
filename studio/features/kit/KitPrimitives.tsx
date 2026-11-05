'use client';

import { Button, Input } from '@heroui/react';
import { useState, type ReactNode } from 'react';

import { BrandLogo, BrandMark } from '@/studio/ui/brand/BrandLogo';
import { ConfirmDialog, useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { StatusSwitch } from '@/studio/ui/primitives/StatusSwitch';
import { notify } from '@/studio/ui/primitives/Toast';

function KitSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-large border border-default-200 bg-background p-4 sm:p-5" aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-default-600">{title}</h2>
      {children}
    </section>
  );
}

export function KitPrimitives() {
  const { confirm, dialog } = useConfirm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [loadingDialog, setLoadingDialog] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <KitSection title="BrandLogo">
        <div className="flex flex-wrap items-center gap-4">
          <BrandLogo size="sm" />
          <BrandLogo size="md" />
          <BrandLogo size="lg" />
          <BrandMark size="xl" title="bagdja website" />
          <span className="rounded-medium bg-primary p-3">
            <BrandLogo size="md" inverted />
          </span>
        </div>
      </KitSection>

      <KitSection title="Toast & StatusSwitch">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="bordered" size="sm" onPress={() => notify.success('Tersimpan', 'Perubahan sudah disimpan.')}>Sukses</Button>
          <Button variant="bordered" size="sm" onPress={() => notify.error('Gagal menyimpan', 'Coba lagi beberapa saat.')}>Galat</Button>
          <Button variant="bordered" size="sm" onPress={() => notify.info('Info', 'Sekadar pemberitahuan.')}>Info</Button>
          <StatusSwitch isSelected={switchOn} onChange={setSwitchOn} ariaLabel="Contoh status" showLabel />
          <StatusSwitch isSelected ariaLabel="Contoh menyimpan" onChange={() => undefined} isPending />
        </div>
      </KitSection>

      <KitSection title="ConfirmDialog">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="bordered"
            size="sm"
            onPress={async () => {
              const ok = await confirm({ title: 'Mulai acara sekarang?', description: 'Peserta akan menerima notifikasi.', confirmLabel: 'Mulai' });
              notify.info(ok ? 'Dikonfirmasi' : 'Dibatalkan');
            }}
          >
            Netral (default)
          </Button>
          <Button
            variant="bordered"
            color="danger"
            size="sm"
            startContent={undefined}
            onPress={async () => {
              const ok = await confirm({ title: 'Hapus FAQ ini?', description: 'Tindakan ini tidak bisa dibatalkan.', confirmLabel: 'Hapus', tone: 'danger' });
              notify.info(ok ? 'Dihapus (simulasi)' : 'Dibatalkan');
            }}
          >
            Bahaya (hapus)
          </Button>
          <Button variant="bordered" size="sm" onPress={() => setLoadingDialog(true)}>Dengan loading</Button>
        </div>
        <ConfirmDialog
          isOpen={loadingDialog}
          isLoading
          title="Menyimpan…"
          description="Contoh dialog dalam keadaan memproses."
          onConfirm={() => undefined}
          onCancel={() => setLoadingDialog(false)}
        />
        {dialog}
      </KitSection>

      <KitSection title="EditDrawer">
        <Button color="primary" size="sm" onPress={() => setDrawerOpen(true)}>Buka drawer</Button>
        <EditDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Ubah FAQ"
          description="Layar penuh di HP, panel kanan di desktop."
          isSubmitting={saving}
          onSubmit={async () => {
            setSaving(true);
            await new Promise((r) => window.setTimeout(r, 700));
            setSaving(false);
            setDrawerOpen(false);
            notify.success('FAQ disimpan');
          }}
        >
          <Input label="Pertanyaan" labelPlacement="outside" placeholder="Tulis pertanyaan" variant="bordered" isRequired />
          <Input label="Jawaban" labelPlacement="outside" placeholder="Tulis jawaban" variant="bordered" />
        </EditDrawer>
      </KitSection>

      <KitSection title="EmptyState">
        <EmptyState compact title="Belum ada FAQ" description="Tambahkan pertanyaan yang sering ditanyakan pelanggan." />
      </KitSection>
    </div>
  );
}
