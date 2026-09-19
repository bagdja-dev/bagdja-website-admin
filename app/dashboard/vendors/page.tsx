'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';

import { AppModal } from '../../components/app-modal';
import { FormInput, FormTextarea } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import { hasMinRole, type WebsiteLocation } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

interface Vendor {
  id: string;
  name: string;
  contact_whatsapp?: string | null;
  notes?: string | null;
  status: 'active' | 'inactive';
  vendor_locations?: Array<{ location_id: string; location?: { name?: string } }>;
}

export default function VendorsPage() {
  const { websiteId, role, loading: contextLoading } = useWebsiteContext();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<WebsiteLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [locationFilter, setLocationFilter] = useState('all');
  const [form, setForm] = useState({ name: '', contact_whatsapp: '', notes: '', location_ids: [] as string[] });

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  // Backend DELETE /vendors/:id (nonaktifkan) di-guard @Roles('admin'), lebih
  // ketat dari CRUD vendor lainnya (editor) — tombolnya harus ikut role ini,
  // bukan disamakan dengan canEdit (kalau tidak, editor klik lalu dapat 403).
  const canDeactivate = role ? hasMinRole(role, 'admin') : false;
  const visibleVendors = locationFilter === 'all'
    ? vendors
    : vendors.filter((vendor) => (vendor.vendor_locations ?? []).some((coverage) => coverage.location_id === locationFilter));

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const [vendorData, locationData] = await Promise.all([
        apiClient<Vendor[]>(`/api/websites/${websiteId}/vendors`),
        apiClient<WebsiteLocation[]>(`/api/websites/${websiteId}/locations`),
      ]);
      setVendors(vendorData);
      setLocations(locationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat vendor');
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditingVendor(null);
    setForm({ name: '', contact_whatsapp: '', notes: '', location_ids: [] });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      contact_whatsapp: vendor.contact_whatsapp ?? '',
      notes: vendor.notes ?? '',
      location_ids: (vendor.vendor_locations ?? []).map((location) => location.location_id),
    });
    setError('');
    setModalOpen(true);
  };

  const saveVendor = async () => {
    if (!websiteId || !form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await apiClient(`/api/websites/${websiteId}/vendors${editingVendor ? `/${editingVendor.id}` : ''}`, {
        method: editingVendor ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, name: form.name.trim() }),
      });
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan vendor');
    } finally {
      setSaving(false);
    }
  };

  const deactivateVendor = async (vendor: Vendor) => {
    if (!websiteId || vendor.status === 'inactive') return;
    setSaving(true);
    try {
      await apiClient(`/api/websites/${websiteId}/vendors/${vendor.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menonaktifkan vendor');
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vendor</h1>
          <p className="mt-1 text-default-500">Kelola vendor internal dan lokasi layanan mereka. Penugasan ke pesanan tetap manual.</p>
        </div>
        {canEdit && <Button color="primary" onPress={openCreate}>+ Tambah Vendor</Button>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[['Total Vendor', vendors.length], ['Aktif', vendors.filter((vendor) => vendor.status === 'active').length], ['Lokasi Tersedia', locations.length]].map(([label, value]) => (
          <Card key={String(label)} className="border-0 shadow-md ring-1 ring-default-100"><CardBody><p className="text-sm text-default-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardBody></Card>
        ))}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setLocationFilter('all')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${locationFilter === 'all' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25' : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'}`}
        >
          Semua Lokasi ({vendors.length})
        </button>
        {locations.map((location) => {
          const count = vendors.filter((vendor) => (vendor.vendor_locations ?? []).some((coverage) => coverage.location_id === location.id)).length;
          return (
            <button
              key={location.id}
              type="button"
              onClick={() => setLocationFilter(location.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${locationFilter === location.id ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25' : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'}`}
            >
              {location.name} ({count})
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {loading ? <LoadingSpinner className="h-40" /> : visibleVendors.length === 0 ? (
        <Card><CardBody className="py-12 text-center text-default-500">Belum ada vendor.</CardBody></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleVendors.map((vendor) => (
            <Card key={vendor.id} className="border-0 shadow-md ring-1 ring-default-100">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="font-semibold">{vendor.name}</h2>{vendor.contact_whatsapp && <p className="text-sm text-default-500">{vendor.contact_whatsapp}</p>}</div>
                  <Chip size="sm" color={vendor.status === 'active' ? 'success' : 'default'} variant="flat">{vendor.status === 'active' ? 'Aktif' : 'Nonaktif'}</Chip>
                </div>
                {vendor.notes && <p className="text-sm text-default-600">{vendor.notes}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {(vendor.vendor_locations ?? []).map((coverage) => <Chip key={coverage.location_id} size="sm" variant="flat">{coverage.location?.name ?? coverage.location_id}</Chip>)}
                  {(vendor.vendor_locations ?? []).length === 0 && <span className="text-xs text-default-400">Belum ada lokasi layanan</span>}
                </div>
                {(canEdit || canDeactivate) && (
                  <div className="flex gap-2 border-t border-default-100 pt-3">
                    {canEdit && <Button size="sm" color="primary" variant="flat" className="flex-1" onPress={() => openEdit(vendor)}>Edit</Button>}
                    {canDeactivate && <Button size="sm" color="danger" variant="light" className="flex-1" isDisabled={vendor.status === 'inactive' || saving} onPress={() => deactivateVendor(vendor)}>Nonaktifkan</Button>}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingVendor ? 'Edit Vendor' : 'Tambah Vendor'}
        size="lg"
        footer={<><Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button><Button color="primary" isLoading={saving} isDisabled={!form.name.trim()} onPress={saveVendor}>Simpan</Button></>}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Nama vendor" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} required />
            <FormInput label="WhatsApp" value={form.contact_whatsapp} onChange={(value) => setForm((prev) => ({ ...prev, contact_whatsapp: value }))} />
          </div>
          <FormTextarea label="Catatan" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
          <div>
            <p className="mb-2 text-sm font-medium">Lokasi yang dilayani</p>
            <div className="flex flex-wrap gap-2">
              {locations.map((location) => {
                const checked = form.location_ids.includes(location.id);
                return <label key={location.id} className="flex items-center gap-2 rounded-full border border-default-200 px-3 py-1.5 text-sm"><input type="checkbox" checked={checked} onChange={() => setForm((prev) => ({ ...prev, location_ids: checked ? prev.location_ids.filter((id) => id !== location.id) : [...prev.location_ids, location.id] }))} />{location.name}</label>;
              })}
            </div>
          </div>
        </div>
      </AppModal>
    </div>
  );
}