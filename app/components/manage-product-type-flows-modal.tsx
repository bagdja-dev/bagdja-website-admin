'use client';

import { Button } from '@heroui/react';
import { useEffect, useState } from 'react';

import { AppModal } from './app-modal';
import { FormSelect, FormSwitch, type FormSelectOption } from './form-field';
import { apiClient } from '../lib/api-client';
import { PRODUCT_TYPE_LABELS, type FulfillmentFlow } from '../lib/types';

interface ManageProductTypeFlowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  websiteId: string;
  onChanged: () => void;
}

interface TypeRowState {
  apply: boolean;
  flowId: string;
}

function emptyRows(): Record<string, TypeRowState> {
  return Object.fromEntries(
    Object.keys(PRODUCT_TYPE_LABELS).map((type) => [type, { apply: false, flowId: '' }]),
  );
}

/**
 * Modal "Kelola Flow" — bulk assign fulfillment flow BERDASARKAN TYPE
 * produk (bukan per produk satu-satu), supaya setup awal lebih cepat kalau
 * seller mau semua produk fisik (mis. type "product") pakai Flow yang
 * sama. Cuma type yang di-toggle "Terapkan" yang ikut disimpan — type lain
 * dibiarkan apa adanya (tidak ada efek diam-diam ke type yang tidak
 * disentuh sama sekali).
 */
export function ManageProductTypeFlowsModal({
  isOpen,
  onClose,
  websiteId,
  onChanged,
}: ManageProductTypeFlowsModalProps) {
  const [flows, setFlows] = useState<FulfillmentFlow[]>([]);
  const [rows, setRows] = useState<Record<string, TypeRowState>>(emptyRows());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setRows(emptyRows());
    setError('');
    setLoading(true);
    apiClient<FulfillmentFlow[]>(`/api/websites/${websiteId}/fulfillment-flows`)
      .then(setFlows)
      .catch(() => setFlows([]))
      .finally(() => setLoading(false));
  }, [isOpen, websiteId]);

  const flowOptions: FormSelectOption[] = [
    { value: '', label: 'Tanpa tracking' },
    ...flows.filter((f) => f.is_active).map((f) => ({ value: f.id, label: f.name })),
  ];

  const updateRow = (type: string, patch: Partial<TypeRowState>) => {
    setRows((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  };

  const typesToApply = Object.entries(rows).filter(([, row]) => row.apply);

  const handleSave = async () => {
    if (typesToApply.length === 0) {
      setError('Aktifkan minimal 1 toggle "Terapkan" dulu');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        typesToApply.map(([type, row]) =>
          apiClient(`/api/websites/${websiteId}/products/fulfillment-flow-by-type`, {
            method: 'PATCH',
            body: JSON.stringify({ type, fulfillment_flow_id: row.flowId || null }),
          }),
        ),
      );
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Flow per Tipe Produk"
      size="lg"
      footer={
        <>
          <Button variant="light" onPress={onClose}>Batal</Button>
          <Button color="primary" isLoading={saving} isDisabled={loading} onPress={handleSave}>
            Terapkan
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-default-500">
          Terapkan satu Flow pengiriman ke SEMUA produk dengan tipe tertentu sekaligus — mempermudah setup awal
          dibanding mengatur satu per satu di form produk. Cuma tipe yang toggle-nya diaktifkan yang ikut diubah;
          tipe lain tidak tersentuh.
        </p>

        {loading ? (
          <p className="text-sm text-default-400">Memuat daftar flow...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(PRODUCT_TYPE_LABELS).map(([type, label]) => {
              const row = rows[type];
              return (
                <div key={type} className="rounded-xl border border-default-200 p-4">
                  <FormSwitch
                    label={`Terapkan ke semua produk "${label}"`}
                    checked={row?.apply ?? false}
                    onChange={(checked) => updateRow(type, { apply: checked })}
                  />
                  {row?.apply && (
                    <div className="mt-3">
                      <FormSelect
                        label="Flow Pengiriman"
                        value={row.flowId}
                        onChange={(v) => updateRow(type, { flowId: v })}
                        options={flowOptions}
                        placeholder="Tanpa tracking"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
      </div>
    </AppModal>
  );
}
