'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../components/mobile-floating-action';
import { AppModal } from '../../components/app-modal';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { FormInput, FormSelect, FormSwitch, FormTextarea } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import {
  formatCoord,
  getMapsCoordSourceLabel,
  hasValidCoords,
  isShortGoogleMapsUrl,
  parseGoogleMapsUrl,
} from '../../lib/parse-google-maps-url';
import {
  hasMinRole,
  LOCATION_TYPE_LABELS,
  type WebsiteLocation,
} from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

const TYPE_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'branch', label: 'Cabang' },
  { key: 'warehouse', label: 'Gudang' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'office', label: 'Kantor' },
] as const;

const TYPE_OPTIONS = Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const TYPE_THEME: Record<
  string,
  { gradient: string; glow: string; icon: string; ring: string; chipColor: 'primary' | 'secondary' | 'warning' | 'success' }
> = {
  branch: {
    gradient: 'from-teal-500 to-emerald-600',
    glow: 'bg-emerald-300/25',
    icon: '📍',
    ring: 'ring-emerald-100',
    chipColor: 'success',
  },
  warehouse: {
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-orange-300/25',
    icon: '🏭',
    ring: 'ring-orange-100',
    chipColor: 'warning',
  },
  pickup: {
    gradient: 'from-cyan-500 to-sky-600',
    glow: 'bg-cyan-300/25',
    icon: '📦',
    ring: 'ring-cyan-100',
    chipColor: 'primary',
  },
  office: {
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'bg-violet-300/25',
    icon: '🏢',
    ring: 'ring-violet-100',
    chipColor: 'secondary',
  },
};

function getTypeTheme(type: string) {
  return TYPE_THEME[type] ?? TYPE_THEME.branch;
}

function formatAddress(loc: WebsiteLocation): string | null {
  const parts = [loc.address_line, loc.city, loc.province].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

interface LocationCardProps {
  location: WebsiteLocation;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (loc: WebsiteLocation) => void;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
}

function LocationCard({
  location,
  canEdit,
  canDelete,
  onEdit,
  onSetPrimary,
  onDelete,
}: LocationCardProps) {
  const theme = getTypeTheme(location.type);
  const initial = location.name.trim().charAt(0).toUpperCase() || 'L';
  const address = formatAddress(location);

  return (
    <Card className="group overflow-hidden border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative bg-gradient-to-br ${theme.gradient} px-4 pb-10 pt-4 sm:px-5 sm:pt-5`}>
        <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${theme.glow} blur-2xl`} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Chip
                  size="sm"
                  variant="flat"
                  color={theme.chipColor}
                  className="border border-white/25 bg-white/15 backdrop-blur-sm"
                  classNames={{ content: 'font-semibold text-white text-[10px] uppercase tracking-wide' }}
                >
                  {LOCATION_TYPE_LABELS[location.type] ?? location.type}
                </Chip>
                {location.is_primary && (
                  <Chip
                    size="sm"
                    variant="flat"
                    className="border border-amber-300/40 bg-amber-400/20 backdrop-blur-sm"
                    classNames={{ content: 'font-semibold text-amber-50 text-[10px] uppercase tracking-wide' }}
                  >
                    ★ Utama
                  </Chip>
                )}
                <Chip
                  size="sm"
                  variant="flat"
                  className={`border backdrop-blur-sm ${location.is_active ? 'border-emerald-300/40 bg-emerald-500/20' : 'border-white/20 bg-white/10'}`}
                  classNames={{ content: `font-semibold text-[10px] ${location.is_active ? 'text-emerald-100' : 'text-white/70'}` }}
                >
                  {location.is_active ? '● Aktif' : '○ Nonaktif'}
                </Chip>
              </div>
              <h3 className="line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                {location.name}
              </h3>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-xl bg-white/15 p-2 text-xl backdrop-blur-sm sm:block">
            {theme.icon}
          </div>
        </div>
      </div>

      <CardBody className="relative -mt-5 space-y-3 rounded-t-2xl bg-white px-4 pb-4 pt-4 sm:px-5">
        {address ? (
          <p className="line-clamp-2 text-sm text-default-600">{address}</p>
        ) : (
          <p className="text-sm italic text-default-400">Alamat belum diisi</p>
        )}

        <div className="flex flex-wrap gap-2">
          {location.is_public && (
            <Chip size="sm" variant="flat" color="secondary" className="text-xs">
              Publik
            </Chip>
          )}
          {location.postal_code && (
            <Chip size="sm" variant="flat" className="text-xs">
              {location.postal_code}
            </Chip>
          )}
          {hasValidCoords(location.latitude, location.longitude) && (
            <Chip size="sm" variant="flat" color="success" className="text-xs font-mono">
              {formatCoord(location.latitude, 4)}, {formatCoord(location.longitude, 4)}
            </Chip>
          )}
        </div>

        {(location.phone || location.whatsapp) && (
          <div className="space-y-1 text-sm text-default-600">
            {location.phone && (
              <p className="flex items-center gap-1.5">
                <span className="text-default-400">📞</span>
                {location.phone}
              </p>
            )}
            {location.whatsapp && (
              <p className="flex items-center gap-1.5">
                <span className="text-default-400">💬</span>
                {location.whatsapp}
              </p>
            )}
          </div>
        )}

        {location.maps_url && (
          <a
            href={location.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-lg bg-default-100 px-2.5 py-1.5 text-xs font-medium text-primary ring-1 ${theme.ring} hover:bg-primary-50`}
          >
            Buka di Maps ↗
          </a>
        )}

        {(canEdit || canDelete) && (
          <div className="flex flex-row gap-2 border-t border-default-100 pt-3 sm:flex-row justify-end">
            {canEdit && (
              <Button size="sm" color="primary" variant="flat" className="flex-1 font-medium" onPress={() => onEdit(location)}>
                <span className="text-lg">✏️</span>
              </Button>
         
            )}
            {canEdit && !location.is_primary && location.type === 'branch' && (
              <Button size="sm" variant="flat" className="flex-1 font-medium" onPress={() => onSetPrimary(location.id)}>
                <span className="text-lg">⭐</span>
              </Button>
         
            )}
            {canDelete && (
              <Button size="sm" color="danger" variant="light" className="flex-1" onPress={() => onDelete(location.id)}>
                <span className="text-lg">🗑️</span>
              </Button>
         
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function LocationsManagement() {
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const [locations, setLocations] = useState<WebsiteLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<WebsiteLocation | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('branch');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [coordsModalOpen, setCoordsModalOpen] = useState(false);
  const [coordsPasteUrl, setCoordsPasteUrl] = useState('');
  const [coordsError, setCoordsError] = useState('');
  const [coordsSuccess, setCoordsSuccess] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const canDelete = role ? hasMinRole(role, 'admin') : false;

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const data = await apiClient<WebsiteLocation[]>(`/api/websites/${websiteId}/locations`);
      setLocations(data);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLocations = useMemo(() => {
    if (typeFilter === 'all') return locations;
    return locations.filter((loc) => loc.type === typeFilter);
  }, [locations, typeFilter]);

  const stats = useMemo(() => {
    const active = filteredLocations.filter((l) => l.is_active).length;
    const primary = filteredLocations.find((l) => l.is_primary);
    return { total: filteredLocations.length, active, primaryName: primary?.name };
  }, [filteredLocations]);

  const resetForm = () => {
    setName('');
    setType('branch');
    setAddressLine('');
    setCity('');
    setProvince('');
    setPostalCode('');
    setPhone('');
    setWhatsapp('');
    setMapsUrl('');
    setLatitude('');
    setLongitude('');
    setIsPublic(true);
    setIsActive(true);
    setError('');
  };

  const openCreate = () => {
    setEditLocation(null);
    resetForm();
    if (typeFilter !== 'all') setType(typeFilter);
    setModalOpen(true);
  };

  const openEdit = (loc: WebsiteLocation) => {
    setEditLocation(loc);
    setName(loc.name);
    setType(loc.type);
    setAddressLine(loc.address_line ?? '');
    setCity(loc.city ?? '');
    setProvince(loc.province ?? '');
    setPostalCode(loc.postal_code ?? '');
    setPhone(loc.phone ?? '');
    setWhatsapp(loc.whatsapp ?? '');
    setMapsUrl(loc.maps_url ?? '');
    setLatitude(loc.latitude != null ? String(loc.latitude) : '');
    setLongitude(loc.longitude != null ? String(loc.longitude) : '');
    setIsPublic(loc.is_public);
    setIsActive(loc.is_active);
    setError('');
    setModalOpen(true);
  };

  const parseCoordInput = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : undefined;
  };

  const openCoordsModal = () => {
    setCoordsPasteUrl(mapsUrl);
    setCoordsError('');
    setCoordsSuccess('');
    setCoordsModalOpen(true);
  };

  const applyCoordsFromUrl = () => {
    setCoordsError('');
    setCoordsSuccess('');
    const url = coordsPasteUrl.trim();
    if (!url) {
      setCoordsError('Paste URL Google Maps terlebih dahulu.');
      return;
    }
    if (isShortGoogleMapsUrl(url)) {
      setCoordsError(
        'Link pendek (goo.gl) tidak bisa dibaca otomatis. Buka link di browser, salin URL panjang dari address bar, lalu paste di sini.',
      );
      return;
    }
    const parsed = parseGoogleMapsUrl(url);
    if (!parsed) {
      setCoordsError('Koordinat tidak ditemukan. Pastikan URL dari Google Maps (format /place/... atau berisi !3d...!4d...).');
      return;
    }
    setLatitude(formatCoord(parsed.latitude));
    setLongitude(formatCoord(parsed.longitude));
    if (!mapsUrl.trim()) setMapsUrl(url);
    setCoordsSuccess(
      `Koordinat berhasil diambil (${getMapsCoordSourceLabel(parsed.source)}): ${formatCoord(parsed.latitude)}, ${formatCoord(parsed.longitude)}`,
    );
    setTimeout(() => setCoordsModalOpen(false), 600);
  };

  const handleSave = async () => {
    if (!websiteId || !name.trim()) {
      setError('Nama lokasi wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    const lat = parseCoordInput(latitude);
    const lng = parseCoordInput(longitude);
    if (latitude.trim() && lat === undefined) {
      setError('Latitude tidak valid');
      setSaving(false);
      return;
    }
    if (longitude.trim() && lng === undefined) {
      setError('Longitude tidak valid');
      setSaving(false);
      return;
    }
    if ((lat != null && lng == null) || (lat == null && lng != null)) {
      setError('Isi latitude dan longitude keduanya, atau kosongkan keduanya');
      setSaving(false);
      return;
    }
    try {
      const body = {
        name: name.trim(),
        type,
        address_line: addressLine.trim() || undefined,
        city: city.trim() || undefined,
        province: province.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        maps_url: mapsUrl.trim() || undefined,
        latitude: lat,
        longitude: lng,
        is_public: isPublic,
        is_active: isActive,
      };
      if (editLocation) {
        await apiClient(`/api/websites/${websiteId}/locations/${editLocation.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiClient(`/api/websites/${websiteId}/locations`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (locationId: string) => {
    if (!websiteId) return;
    try {
      await apiClient(`/api/websites/${websiteId}/locations/${locationId}/set-primary`, {
        method: 'POST',
      });
      await load();
    } catch {
      alert('Gagal menetapkan cabang utama');
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!websiteId) return;
    const ok = await confirm({ title: 'Hapus Lokasi Ini?', message: 'Lokasi yang dihapus tidak bisa dikembalikan.' });
    if (!ok) return;
    try {
      await apiClient(`/api/websites/${websiteId}/locations/${locationId}`, { method: 'DELETE' });
      await load();
    } catch {
      alert('Gagal menghapus lokasi');
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className={`space-y-6 ${canEdit ? mobileFabPagePadding : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Lokasi & Cabang</h1>
          <p className="mt-1 text-default-500">Kelola cabang, gudang, dan titik pickup.</p>
        </div>
        {canEdit && (
          <Button color="primary" onPress={openCreate} className={desktopAddButtonClass}>
            + Lokasi Baru
          </Button>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {TYPE_TABS.map((tab) => {
          const active = typeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTypeFilter(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!loading && filteredLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip variant="flat" color="primary" className="font-medium">
            {stats.total} lokasi
          </Chip>
          <Chip variant="flat" color="success" className="font-medium">
            {stats.active} aktif
          </Chip>
          {stats.primaryName && (
            <Chip variant="flat" color="warning" className="font-medium">
              Utama: {stats.primaryName}
            </Chip>
          )}
        </div>
      )}

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : filteredLocations.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 text-3xl ring-4 ring-teal-50">
              📍
            </div>
            <div>
              <p className="text-lg font-semibold">Belum ada lokasi</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">
                {typeFilter === 'all'
                  ? 'Tambahkan cabang atau titik layanan pertama.'
                  : `Belum ada ${LOCATION_TYPE_LABELS[typeFilter]?.toLowerCase() ?? 'lokasi'} terdaftar.`}
              </p>
            </div>
            {canEdit && (
              <Button color="primary" onPress={openCreate} className="hidden font-semibold sm:inline-flex">
                + Lokasi Baru
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredLocations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={openEdit}
              onSetPrimary={handleSetPrimary}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editLocation ? 'Edit Lokasi' : 'Lokasi Baru'}
        size="xl"
        footer={
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormInput label="Nama" value={name} onChange={setName} required />
          <FormSelect label="Tipe" value={type} onChange={setType} options={TYPE_OPTIONS} />
          <FormTextarea label="Alamat" value={addressLine} onChange={setAddressLine} rows={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Kota" value={city} onChange={setCity} />
            <FormInput label="Provinsi" value={province} onChange={setProvince} />
          </div>
          <FormInput label="Kode Pos" value={postalCode} onChange={setPostalCode} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Telepon" value={phone} onChange={setPhone} />
            <FormInput label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
          </div>

          <FormInput
            label="Link Google Maps"
            value={mapsUrl}
            onChange={setMapsUrl}
            placeholder="https://maps.google.com/..."
            description="Buka Google Maps → Share → Copy link. Link ini untuk navigasi pengunjung."
          />

          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-foreground">Koordinat (Latitude / Longitude)</span>
              <button
                type="button"
                onClick={openCoordsModal}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                Ambil dari URL Maps
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Latitude"
                value={latitude}
                onChange={setLatitude}
                placeholder="-7.041225"
                description="Contoh: -7.041225"
              />
              <FormInput
                label="Longitude"
                value={longitude}
                onChange={setLongitude}
                placeholder="107.967659"
                description="Contoh: 107.967659"
              />
            </div>
            <p className="text-xs text-default-500">
              Opsional — dipakai untuk marker peta di website. Bisa diisi manual atau via tombol di atas.
            </p>
          </div>

          <FormSwitch label="Tampilkan di website (publik)" checked={isPublic} onChange={setIsPublic} />
          <FormSwitch label="Aktif" checked={isActive} onChange={setIsActive} />
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      <AppModal
        isOpen={coordsModalOpen}
        onClose={() => setCoordsModalOpen(false)}
        title="Ambil Koordinat dari Google Maps"
        size="lg"
        footer={
          <>
            <Button variant="light" onPress={() => setCoordsModalOpen(false)}>Batal</Button>
            <Button color="primary" onPress={applyCoordsFromUrl}>Terapkan Koordinat</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-default-200 bg-default-50/80 px-4 py-3 text-sm leading-relaxed text-default-600">
            <p className="font-medium text-foreground">Petunjuk:</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>Buka lokasi di Google Maps (browser/desktop).</li>
              <li>Klik <strong>Share</strong> atau salin URL dari address bar.</li>
              <li>Paste URL panjang di bawah (bukan link pendek goo.gl).</li>
              <li>Klik <strong>Terapkan Koordinat</strong> — latitude & longitude terisi otomatis.</li>
            </ol>
            <p className="mt-3 text-xs text-default-500">
              Format yang didukung: URL dengan <code className="rounded bg-white px-1">!3d...!4d...</code> (titik lokasi)
              atau <code className="rounded bg-white px-1">@lat,lng</code> (pusat peta).
            </p>
          </div>

          <FormTextarea
            label="URL Google Maps"
            value={coordsPasteUrl}
            onChange={setCoordsPasteUrl}
            rows={4}
            placeholder="https://www.google.com/maps/place/..."
            className="font-mono text-xs"
          />

          {coordsSuccess && (
            <div className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">
              {coordsSuccess}
            </div>
          )}
          {coordsError && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {coordsError}
            </div>
          )}
        </div>
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="Lokasi Baru" onClick={openCreate} />}
      {dialog}
    </div>
  );
}
