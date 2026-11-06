'use client';

import { Checkbox, Input, Select, SelectItem, Textarea } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';

import type { VendorDraft, VendorStatus, WebsiteVendor } from '@/studio/api/vendors';
import type { WebsiteLocationRow } from '@/studio/api/locations';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';

interface VendorForm {
  name: string;
  contact_whatsapp: string;
  notes: string;
  status: VendorStatus;
  location_ids: string[];
}

function formFromVendor(vendor: WebsiteVendor | null): VendorForm {
  return {
    name: vendor?.name ?? '',
    contact_whatsapp: vendor?.contact_whatsapp ?? '',
    notes: vendor?.notes ?? '',
    status: vendor?.status ?? 'active',
    location_ids: vendor?.vendor_locations.map((coverage) => coverage.location_id) ?? [],
  };
}

interface EditVendorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: WebsiteVendor | null;
  locations: WebsiteLocationRow[];
  onSave: (draft: VendorDraft) => Promise<void>;
}

export function EditVendorDrawer({ isOpen, onClose, vendor, locations, onSave }: EditVendorDrawerProps) {
  const [form, setForm] = useState<VendorForm>(() => formFromVendor(vendor));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFromVendor(vendor));
    setError(null);
  }, [isOpen, vendor]);

  const setField = <K extends keyof VendorForm>(key: K, value: VendorForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = useCallback(async () => {
    const name = form.name.trim();
    if (name.length < 2) {
      setError('Nama vendor minimal 2 karakter.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        name,
        contact_whatsapp: form.contact_whatsapp.trim(),
        notes: form.notes.trim(),
        status: form.status,
        location_ids: form.location_ids,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan vendor.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onSave]);

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={vendor ? 'Edit vendor' : 'Tambah vendor'}
      description="Atur kontak dan lokasi layanan vendor."
      onSubmit={handleSubmit}
      submitLabel={vendor ? 'Simpan perubahan' : 'Tambah vendor'}
      isSubmitting={isSubmitting}
      isSubmitDisabled={form.name.trim().length < 2}
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h3 className="text-[13px] font-bold text-foreground">Informasi vendor</h3>
          <Input
            label="Nama vendor"
            labelPlacement="outside"
            value={form.name}
            onValueChange={(value) => setField('name', value)}
            placeholder="Mis. Bengkel Karya Jaya"
            maxLength={255}
            minLength={2}
            isRequired
            variant="bordered"
          />
          <Input
            label="WhatsApp"
            labelPlacement="outside"
            value={form.contact_whatsapp}
            onValueChange={(value) => setField('contact_whatsapp', value)}
            placeholder="628123456789"
            maxLength={50}
            variant="bordered"
            description="Nomor kontak utama vendor, gunakan kode negara bila tersedia."
          />
          <Textarea
            label="Catatan"
            labelPlacement="outside"
            value={form.notes}
            onValueChange={(value) => setField('notes', value)}
            minRows={3}
            variant="bordered"
            placeholder="Catatan internal tentang vendor..."
          />
          {vendor && (
            <Select
              label="Status"
              labelPlacement="outside"
              selectedKeys={[form.status]}
              onSelectionChange={(keys) => {
                const [status] = Array.from(keys);
                if (status === 'active' || status === 'inactive') setField('status', status);
              }}
              variant="bordered"
            >
              <SelectItem key="active">Aktif</SelectItem>
              <SelectItem key="inactive">Nonaktif</SelectItem>
            </Select>
          )}
        </section>

        <section className="flex flex-col gap-3 border-t border-default-100 pt-4">
          <div>
            <h3 className="text-[13px] font-bold text-foreground">Lokasi layanan</h3>
            <p className="mt-1 text-[12px] text-default-500">Pilih cabang atau lokasi yang dapat dilayani vendor ini.</p>
          </div>
          {locations.length > 0 ? (
            <fieldset className="max-h-64 overflow-y-auto rounded-[10px] border border-default-200 p-3">
              <legend className="sr-only">Pilih lokasi layanan</legend>
              <div className="flex flex-col gap-1">
                {locations.map((location) => {
                  const checked = form.location_ids.includes(location.id);
                  return (
                    <Checkbox
                      key={location.id}
                      size="sm"
                      isSelected={checked}
                      isDisabled={isSubmitting}
                      onValueChange={(selected) => setField(
                        'location_ids',
                        selected
                          ? [...form.location_ids, location.id]
                          : form.location_ids.filter((id) => id !== location.id),
                      )}
                      classNames={{ base: 'max-w-full rounded-md px-2 py-2 hover:bg-default-50' }}
                    >
                      <span className="text-[13px]">{location.name}</span>
                      <span className="ml-1 text-[11px] text-default-500">
                        {location.type === 'branch' ? 'Cabang' : location.type === 'warehouse' ? 'Gudang' : location.type === 'pickup' ? 'Pickup' : 'Kantor'}
                      </span>
                    </Checkbox>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <p className="rounded-[10px] border border-dashed border-default-300 px-3 py-4 text-[13px] text-default-600">
              Belum ada lokasi. Vendor tetap dapat disimpan tanpa cakupan lokasi.
            </p>
          )}
          {form.location_ids.length > 0 && (
            <p className="text-[12px] text-default-500">{form.location_ids.length} lokasi dipilih.</p>
          )}
        </section>
        {error && <p role="alert" className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">{error}</p>}
      </div>
    </EditDrawer>
  );
}
