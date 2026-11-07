'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  deleteFulfillmentFlow,
  fetchFulfillmentFlows,
  updateFulfillmentFlow,
  type FulfillmentFlow,
} from '@/studio/api/fulfillment-flows';
import { errorMessage } from '@/studio/api/client';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import {
  actionsColumn,
  DataListPage,
  Pill,
  switchColumn,
  useDataList,
  type DataColumn,
  type PrimaryAction,
  type RowAction,
} from '@/studio/ui/data-list';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

function sortedSteps(flow: FulfillmentFlow) {
  return [...flow.steps].sort((a, b) => a.sequence - b.sequence);
}

function createColumns(
  onEdit: (flow: FulfillmentFlow) => void,
  onDelete: (flow: FulfillmentFlow) => void,
  onToggle: (flow: FulfillmentFlow, active: boolean) => void,
): DataColumn<FulfillmentFlow>[] {
  const actions: RowAction<FulfillmentFlow>[] = [
    { key: 'edit', label: 'Edit', minRole: 'editor', onAction: onEdit },
    { key: 'delete', label: 'Hapus', icon: 'trash', danger: true, minRole: 'admin', onAction: onDelete },
  ];
  return [
    {
      key: 'flow',
      header: 'Master Flow',
      mobile: 'title',
      render: (flow, ctx) => (
        <div className="min-w-0 md:max-w-[22rem]">
          {ctx.canAct('editor') ? (
            <button type="button" onClick={() => onEdit(flow)} className="block max-w-full truncate text-left text-sm font-bold text-foreground hover:text-primary">
              {flow.name}
            </button>
          ) : (
            <span className="block max-w-full truncate text-sm font-bold text-foreground">{flow.name}</span>
          )}
          {flow.description && (
            <p className={`mt-0.5 text-[13px] text-default-600 ${ctx.variant === 'card' ? 'line-clamp-2' : 'truncate'}`}>
              {flow.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'steps',
      header: 'Tahapan',
      mobile: 'subtitle',
      render: (flow) => (
        <div className="flex max-w-[34rem] flex-wrap gap-1.5">
          {sortedSteps(flow).map((step) => (
            <Pill key={step.id ?? `${flow.id}-${step.sequence}`} tone={step.phase === 'PRAORDER' ? 'warning' : 'default'}>
              {step.phase === 'PRAORDER' ? 'Praorder · ' : ''}{step.status_name}
            </Pill>
          ))}
          {flow.steps.length === 0 && <span className="text-[13px] text-danger">Belum ada step</span>}
        </div>
      ),
    },
    {
      key: 'release',
      header: 'Rilis bertahap',
      mobile: 'meta',
      render: (flow) => {
        const total = flow.steps.reduce((sum, step) => sum + (step.release_percentage ?? 0), 0);
        return <span className="whitespace-nowrap text-[13px] text-default-600">{total > 0 ? `${total}%` : '—'} · {flow.steps.length} step</span>;
      },
    },
    switchColumn<FulfillmentFlow>({
      key: 'is_active',
      header: 'Status',
      getValue: (flow) => flow.is_active,
      onToggle,
      ariaLabel: (flow) => `Status ${flow.name}`,
      minRole: 'editor',
    }),
    actionsColumn({ actions, getRowLabel: (flow) => flow.name }),
  ];
}

export function FlowsPage() {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const list = useDataList<FulfillmentFlow>({
    mode: 'client',
    searchKeys: ['name', 'description'],
    filters: [
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Semua status',
        options: [{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }],
        getValue: (flow) => flow.is_active ? 'active' : 'inactive',
        kind: 'chip',
      },
    ],
    load: async () => websiteId ? fetchFulfillmentFlows(websiteId) : [],
  });

  const openEdit = useCallback((flow: FulfillmentFlow) => {
    router.push(`/studio/flows/${encodeURIComponent(flow.id)}`);
  }, [router]);

  const handleDelete = useCallback(async (flow: FulfillmentFlow) => {
    if (!websiteId) return;
    const confirmed = await confirm({
      title: `Hapus Master Flow "${flow.name}"?`,
      description: 'Produk yang memakai flow ini akan kehilangan tracking tahapan. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus flow',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await deleteFulfillmentFlow(websiteId, flow.id);
      list.removeRows([flow.id]);
      notify.success('Master Flow dihapus.');
    } catch (err) {
      notify.error(errorMessage(err, 'Gagal menghapus Master Flow.'));
    }
  }, [confirm, list, websiteId]);

  const handleToggle = useCallback((flow: FulfillmentFlow, active: boolean) => {
    if (!websiteId) return;
    void list.optimisticUpdate(
      flow.id,
      { is_active: active },
      () => updateFulfillmentFlow(websiteId, flow.id, { is_active: active }),
      'Status flow gagal diubah',
    );
  }, [list, websiteId]);

  const columns = useMemo(
    () => createColumns(openEdit, (flow) => void handleDelete(flow), handleToggle),
    [handleDelete, handleToggle, openEdit],
  );

  const primaryAction: PrimaryAction = {
    label: 'Tambah flow',
    icon: 'plus',
    minRole: 'editor',
    href: '/studio/flows/new',
  };

  return (
    <div className="flex flex-col gap-6">
      <DataListPage
        title="Master Flow"
        description="Atur SOP fulfillment yang dapat dipakai ulang pada produk, dari tahap praorder hingga penyelesaian."
        list={list}
        columns={columns}
        getRowLabel={(flow) => flow.name}
        itemNoun="flow"
        primaryAction={primaryAction}
        searchPlaceholder="Cari nama atau deskripsi flow..."
        emptyState={{ title: 'Belum ada Master Flow', description: 'Buat flow untuk mengatur tahapan layanan atau pengiriman produk.' }}
      />
      {dialog}
    </div>
  );
}
