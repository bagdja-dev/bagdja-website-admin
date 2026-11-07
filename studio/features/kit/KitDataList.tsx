'use client';

import { Select, SelectItem, Switch } from '@heroui/react';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { TenantRole } from '@/studio/api/types';
import { ROLE_LABEL } from '@/studio/lib/roles';
import {
  actionsColumn,
  chipColumn,
  chipFilter,
  currencyColumn,
  DataListPage,
  dateColumn,
  imageColumn,
  selectFilter,
  switchColumn,
  titleColumn,
  useDataList,
  type DataColumn,
} from '@/studio/ui/data-list';
import { notify } from '@/studio/ui/primitives/Toast';

import { fakeRequest, makeSampleFaqs, type SampleFaq } from './sample-data';

const CATEGORY_OPTIONS = [
  { value: 'umum', label: 'Umum' },
  { value: 'pembayaran', label: 'Pembayaran' },
  { value: 'pengiriman', label: 'Pengiriman' },
];
const ROLES: TenantRole[] = ['owner', 'admin', 'editor', 'viewer'];
const SEARCH_KEYS: ReadonlyArray<keyof SampleFaq> = ['question', 'answer'];

export function KitDataList() {
  const [role, setRole] = useState<TenantRole>('owner');
  const [failMode, setFailMode] = useState(false);
  const failRef = useRef(failMode);
  failRef.current = failMode;

  const filters = useMemo(
    () => [
      chipFilter<SampleFaq>({ key: 'status', label: 'Status', options: [{ value: 'active', label: 'Tampil' }, { value: 'inactive', label: 'Disembunyikan' }], getValue: (r) => (r.is_active ? 'active' : 'inactive') }),
      selectFilter<SampleFaq>({ key: 'category', label: 'Kategori', options: CATEGORY_OPTIONS, getValue: (r) => r.category }),
    ],
    [],
  );

  const load = useCallback(async () => {
    await fakeRequest(false, 500);
    return makeSampleFaqs();
  }, []);

  const list = useDataList<SampleFaq>({ mode: 'client', load, searchKeys: SEARCH_KEYS, filters, pageSize: 8 });

  const columns: DataColumn<SampleFaq>[] = [
    imageColumn({ key: 'image', header: 'Gambar', getSrc: (r) => r.image_url, getAlt: (r) => r.question }),
    titleColumn({ header: 'Pertanyaan', getTitle: (r) => r.question, getSubtitle: (r) => r.answer, onOpen: (r) => notify.info('Buka', r.question) }),
    chipColumn({ key: 'category', header: 'Kategori', getValue: (r) => r.category, options: { umum: { label: 'Umum' }, pembayaran: { label: 'Pembayaran' }, pengiriman: { label: 'Pengiriman' } } }),
    currencyColumn({ key: 'price', header: 'Harga', getValue: (r) => r.price }),
    dateColumn({ key: 'updated_at', header: 'Diubah', getValue: (r) => r.updated_at }),
    switchColumn({
      key: 'is_active',
      header: 'Tampil',
      minRole: 'editor',
      getValue: (r) => r.is_active,
      ariaLabel: (r) => `Tampilkan: ${r.question}`,
      onToggle: (r, next) => void list.optimisticUpdate(r.id, { is_active: next }, () => fakeRequest(failRef.current)),
    }),
    actionsColumn({
      getRowLabel: (r) => r.question,
      actions: [
        { key: 'edit', label: 'Ubah', icon: 'edit', minRole: 'editor', onAction: (r) => notify.info('Ubah', r.question) },
        { key: 'delete', label: 'Hapus', icon: 'trash', danger: true, minRole: 'admin', onAction: (r) => notify.info('Hapus', r.question) },
      ],
    }),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-large border border-dashed border-default-300 p-3">
        <Select
          label="Simulasi role"
          labelPlacement="outside"
          size="sm"
          variant="bordered"
          className="max-w-[12rem]"
          selectedKeys={[role]}
          onSelectionChange={(keys) => {
            const [first] = Array.from(keys);
            if (typeof first === 'string' && ROLES.includes(first as TenantRole)) setRole(first as TenantRole);
          }}
        >
          {ROLES.map((r) => (
            <SelectItem key={r}>{ROLE_LABEL[r]}</SelectItem>
          ))}
        </Select>
        <Switch size="sm" isSelected={failMode} onValueChange={setFailMode}>
          Mode gagal (uji rollback)
        </Switch>
      </div>
      <DataListPage
        embedded
        itemNoun="FAQ"
        isRowMuted={(r) => !r.is_active}
        title="FAQ (contoh)"
        description="Data contoh untuk menguji Data List di 360/768/1280."
        list={list}
        columns={columns}
        getRowLabel={(r) => r.question}
        roleOverride={role}
        searchPlaceholder="Cari pertanyaan atau jawaban"
        emptyState={{ title: 'Belum ada FAQ', description: 'Tambahkan pertanyaan yang sering ditanyakan pelanggan.' }}
        primaryAction={{ label: 'Tambah FAQ', minRole: 'editor', onPress: () => notify.info('Tambah FAQ') }}
        secondaryActions={[{ key: 'export', label: 'Ekspor', minRole: 'admin', onPress: () => notify.info('Ekspor (simulasi)') }]}
        bulkActions={[
          { key: 'hide', label: 'Sembunyikan', minRole: 'editor', onRun: async (rows) => { await fakeRequest(failRef.current); rows.forEach((r) => list.patchRow(r.id, { is_active: false })); list.selection.clear(); notify.success(`${rows.length} FAQ disembunyikan`); } },
          { key: 'delete', label: 'Hapus', icon: 'trash', danger: true, minRole: 'admin', onRun: async (rows) => { await fakeRequest(failRef.current); list.removeRows(rows.map((r) => r.id)); list.selection.clear(); notify.success(`${rows.length} FAQ dihapus`); } },
        ]}
        reorder={{ minRole: 'editor', onSave: () => fakeRequest(failRef.current) }}
      />
    </div>
  );
}
