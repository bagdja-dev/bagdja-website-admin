'use client';

import { Checkbox, Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';
import { useCallback, useEffect, useState } from 'react';

import type { LocationDraft, WebsiteLocationRow } from '@/studio/api/locations';
import { EditDrawer } from '@/studio/ui/primitives/EditDrawer';

import { LocationAreaSearch } from './LocationAreaSearch';

const TYPES = [
  { value: 'branch', label: 'Cabang' },
  { value: 'warehouse', label: 'Gudang' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'office', label: 'Kantor' },
] as const;

const COURIERS = [
  ['jne', 'JNE'],
  ['jnt', 'J&T Express'],
  ['sicepat', 'SiCepat'],
  ['pos', 'Pos Indonesia'],
  ['tiki', 'TIKI'],
  ['anteraja', 'AnterAja'],
  ['wahana', 'Wahana'],
  ['ninja', 'Ninja Xpress'],
  ['lion', 'Lion Parcel'],
  ['sap', 'SAP Express'],
] as const;

interface LocationForm {
  name: string;
  type: string;
  address_line: string;
  city: string;
  province: string;
  postal_code: string;
  phone: string;
  whatsapp: string;
  maps_url: string;
  latitude: string;
  longitude: string;
  shipping_area_name: string;
  active_couriers: string[];
  is_public: boolean;
  is_active: boolean;
}

const emptyForm = (): LocationForm => ({
  name: '',
  type: 'branch',
  address_line: '',
  city: '',
  province: '',
  postal_code: '',
  phone: '',
  whatsapp: '',
  maps_url: '',
  latitude: '',
  longitude: '',
  shipping_area_name: '',
  active_couriers: [],
  is_public: true,
  is_active: true,
});

function formFromLocation(location: WebsiteLocationRow | null): LocationForm {
  if (!location) return emptyForm();
  return {
    name: location.name,
    type: location.type,
    address_line: location.address_line ?? '',
    city: location.city ?? '',
    province: location.province ?? '',
    postal_code: location.postal_code ?? '',
    phone: location.phone ?? '',
    whatsapp: location.whatsapp ?? '',
    maps_url: location.maps_url ?? '',
    latitude: location.latitude == null ? '' : String(location.latitude),
    longitude: location.longitude == null ? '' : String(location.longitude),
    shipping_area_name: location.shipping_area_name ?? '',
    active_couriers: location.active_couriers ?? [],
    is_public: location.is_public,
    is_active: location.is_active,
  };
}

function nullableText(value: string): string | null {
  return value.trim() || null;
}

function coordinatesFromMapsUrl(url: string): { latitude: number; longitude: number } | null {
  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url.trim())) return null;
  const match =
    url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i) ??
    url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ??
    url.match(/[?&](?:q|ll|center)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

interface EditLocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  location: WebsiteLocationRow | null;
  onSave: (draft: LocationDraft) => Promise<void>;
}

export function EditLocationDrawer({ isOpen, onClose, location, onSave }: EditLocationDrawerProps) {
  const [form, setForm] = useState<LocationForm>(() => formFromLocation(location));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = location !== null;

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFromLocation(location));
    setError(null);
  }, [isOpen, location]);

  const setField = <K extends keyof LocationForm>(key: K, value: LocationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyMapsCoordinates = () => {
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(form.maps_url.trim())) {
      setError('Link pendek Google Maps tidak dapat dibaca. Salin URL panjang dari address bar.');
      return;
    }
    const coordinates = coordinatesFromMapsUrl(form.maps_url);
    if (!coordinates) {
      setError('Koordinat tidak ditemukan pada URL Google Maps.');
      return;
    }
    setForm((current) => ({
      ...current,
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
    }));
    setError(null);
  };

  const handleSubmit = useCallback(async () => {
    const latitude = form.latitude.trim() ? Number(form.latitude) : null;
    const longitude = form.longitude.trim() ? Number(form.longitude) : null;
    if (!form.name.trim()) return setError('Nama lokasi wajib diisi.');
    if ((latitude !== null && !Number.isFinite(latitude)) || (longitude !== null && !Number.isFinite(longitude))) {
      return setError('Latitude dan longitude harus berupa angka yang valid.');
    }
    if ((latitude === null) !== (longitude === null)) {
      return setError('Isi latitude dan longitude keduanya, atau kosongkan keduanya.');
    }
    if (latitude !== null && (latitude < -90 || latitude > 90)) return setError('Latitude harus berada di antara -90 dan 90.');
    if (longitude !== null && (longitude < -180 || longitude > 180)) return setError('Longitude harus berada di antara -180 dan 180.');

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        name: form.name.trim(),
        type: form.type,
        address_line: nullableText(form.address_line),
        city: nullableText(form.city),
        province: nullableText(form.province),
        postal_code: nullableText(form.postal_code),
        phone: nullableText(form.phone),
        whatsapp: nullableText(form.whatsapp),
        maps_url: nullableText(form.maps_url),
        latitude,
        longitude,
        shipping_area_name: nullableText(form.shipping_area_name),
        active_couriers: form.active_couriers,
        is_public: form.is_public,
        is_active: form.is_active,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan lokasi.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onSave]);

  return (
    <EditDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit lokasi' : 'Tambah lokasi'}
      description="Atur informasi cabang, titik layanan, dan asal pengiriman."
      onSubmit={handleSubmit}
      submitLabel={isEditing ? 'Simpan perubahan' : 'Tambah lokasi'}
      isSubmitting={isSubmitting}
      isSubmitDisabled={!form.name.trim()}
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <h3 className="text-[13px] font-bold text-foreground">Informasi lokasi</h3>
          <Input
            label="Nama lokasi"
            labelPlacement="outside"
            value={form.name}
            onValueChange={(value) => setField('name', value)}
            placeholder="Mis. Cabang Kemang"
            maxLength={255}
            isRequired
            variant="bordered"
          />
          <Select
            label="Tipe lokasi"
            labelPlacement="outside"
            selectedKeys={TYPES.some((type) => type.value === form.type) ? [form.type] : ['branch']}
            onSelectionChange={(keys) => {
              const [value] = Array.from(keys);
              if (typeof value === 'string') setField('type', value);
            }}
            variant="bordered"
          >
            {TYPES.map((type) => <SelectItem key={type.value}>{type.label}</SelectItem>)}
          </Select>
          <Textarea
            label="Alamat"
            labelPlacement="outside"
            value={form.address_line}
            onValueChange={(value) => setField('address_line', value)}
            maxLength={500}
            minRows={2}
            variant="bordered"
            placeholder="Nama jalan, nomor, gedung..."
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Kota" labelPlacement="outside" value={form.city} onValueChange={(value) => setField('city', value)} maxLength={100} variant="bordered" />
            <Input label="Provinsi" labelPlacement="outside" value={form.province} onValueChange={(value) => setField('province', value)} maxLength={100} variant="bordered" />
            <Input label="Kode pos" labelPlacement="outside" value={form.postal_code} onValueChange={(value) => setField('postal_code', value)} maxLength={20} variant="bordered" />
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-default-100 pt-4">
          <h3 className="text-[13px] font-bold text-foreground">Kontak & peta</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Telepon" labelPlacement="outside" value={form.phone} onValueChange={(value) => setField('phone', value)} maxLength={50} variant="bordered" />
            <Input label="WhatsApp" labelPlacement="outside" value={form.whatsapp} onValueChange={(value) => setField('whatsapp', value)} maxLength={50} variant="bordered" />
          </div>
          <Input
            label="Link Google Maps"
            labelPlacement="outside"
            value={form.maps_url}
            onValueChange={(value) => setField('maps_url', value)}
            placeholder="https://maps.google.com/..."
            maxLength={500}
            variant="bordered"
            description="Link ini digunakan pengunjung untuk membuka navigasi."
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-default-600">Koordinat</span>
              <button type="button" onClick={applyMapsCoordinates} className="text-[12px] font-semibold text-primary hover:underline">
                Ambil dari URL Maps
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input aria-label="Latitude" value={form.latitude} onValueChange={(value) => setField('latitude', value)} placeholder="Latitude" variant="bordered" />
              <Input aria-label="Longitude" value={form.longitude} onValueChange={(value) => setField('longitude', value)} placeholder="Longitude" variant="bordered" />
            </div>
            <p className="text-[12px] text-default-500">Opsional, untuk menampilkan titik lokasi di peta website.</p>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-default-100 pt-4">
          <h3 className="text-[13px] font-bold text-foreground">Pengiriman</h3>
          <LocationAreaSearch
            value={form.shipping_area_name}
            onChange={(value) => setField('shipping_area_name', value)}
            disabled={isSubmitting}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[12px] font-semibold text-default-600">Kurir aktif</legend>
            <div className="grid grid-cols-2 gap-2">
              {COURIERS.map(([code, label]) => (
                <Checkbox
                  key={code}
                  size="sm"
                  isSelected={form.active_couriers.includes(code)}
                  onValueChange={(checked) => setField(
                    'active_couriers',
                    checked
                      ? [...form.active_couriers, code]
                      : form.active_couriers.filter((courier) => courier !== code),
                  )}
                  isDisabled={isSubmitting}
                >
                  {label}
                </Checkbox>
              ))}
            </div>
            <p className="text-[12px] text-default-500">Jika tidak ada yang dipilih, sistem memakai semua kurir default.</p>
          </fieldset>
        </section>

        <section className="flex flex-col gap-3 border-t border-default-100 pt-4">
          <h3 className="text-[13px] font-bold text-foreground">Visibilitas</h3>
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-default-200 p-3">
            <span className="text-[13px] text-foreground">Tampilkan di website</span>
            <Switch size="sm" isSelected={form.is_public} onValueChange={(value) => setField('is_public', value)} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-default-200 p-3">
            <span className="text-[13px] text-foreground">Lokasi aktif</span>
            <Switch size="sm" isSelected={form.is_active} onValueChange={(value) => setField('is_active', value)} />
          </div>
        </section>
        {error && <p role="alert" className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">{error}</p>}
      </div>
    </EditDrawer>
  );
}
