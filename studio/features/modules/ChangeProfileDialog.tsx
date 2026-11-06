'use client';

import { Spinner } from '@heroui/react';

import { ProfileIcon } from '@/studio/features/onboarding/profile-icons';

import { DIALOG_PRIMARY, DIALOG_SECONDARY, StudioDialog } from './dialog-ui';
import type { ChangeProfileState } from './use-change-profile';

/** Dialog ganti jenis bisnis dengan opsi menambah atau menyelaraskan fitur preset. */
export function ChangeProfileDialog({ state }: { state: ChangeProfileState }) {
  const {
    open,
    setOpen,
    profiles,
    selected,
    select,
    applyPreset,
    setApplyPreset,
    resetFeaturesToPreset,
    setResetFeaturesToPreset,
    addedLabels,
    removedLabels,
    saving,
    save,
  } = state;
  return (
    <StudioDialog
      isOpen={open}
      onClose={() => setOpen(false)}
      isBusy={saving}
      title="Ganti jenis bisnis"
      footer={
        <>
          <button type="button" onClick={() => setOpen(false)} disabled={saving} className={DIALOG_SECONDARY}>
            Batal
          </button>
          <button type="button" onClick={() => void save()} disabled={saving || !selected} className={DIALOG_PRIMARY}>
            {saving && <Spinner size="sm" color="current" aria-label="Menyimpan" />}
            Simpan
          </button>
        </>
      }
    >
      <p className="text-sm text-default-600">Jenis bisnis dipakai untuk saran fitur dan template. Pilih apakah fitur aktif perlu disesuaikan dengan preset bisnis baru.</p>
      <div role="radiogroup" aria-label="Jenis bisnis" className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {profiles.map((p) => {
          const on = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => select(p.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${on ? 'border-2 border-primary bg-primary-50 px-[11px] py-[9px]' : 'border border-default-200 bg-white'}`}
            >
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${on ? 'bg-primary text-white' : 'bg-default-100 text-default-700'}`}>
                <ProfileIcon profileId={p.id} size={18} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-bold">{p.label}</span>
                <span className="truncate text-xs text-default-600">{p.examples}</span>
              </span>
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="flex flex-col gap-2 rounded-xl border border-default-200 bg-default-50 p-3.5">
          {!resetFeaturesToPreset && addedLabels.length > 0 ? (
            <>
              <label className="flex items-start gap-2.5 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={applyPreset}
                  onChange={(e) => setApplyPreset(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#7A1E48]"
                />
                Tambahkan fitur preset yang belum aktif
              </label>
              <p className="text-[13px] text-default-600">
                {applyPreset ? `Akan ditambahkan: ${addedLabels.join(', ')}.` : 'Fitur bawaan tidak akan diterapkan.'}
              </p>
            </>
          ) : null}
          <label className="flex items-start gap-2.5 text-sm font-bold">
            <input
              type="checkbox"
              checked={resetFeaturesToPreset}
              onChange={(e) => setResetFeaturesToPreset(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#7A1E48]"
            />
            Reset fitur sesuai standar jenis bisnis
          </label>
          {resetFeaturesToPreset ? (
            <div className="flex flex-col gap-1 text-[13px] text-default-600">
              <p>Akan diaktifkan: {addedLabels.length ? addedLabels.join(', ') : 'tidak ada fitur tambahan'}.</p>
              <p>Akan dimatikan: {removedLabels.length ? removedLabels.join(', ') : 'tidak ada fitur tambahan'}.</p>
              <p className="text-xs text-default-500">Data fitur tidak dihapus. Fitur dengan transaksi atau gathering berjalan tidak dapat direset.</p>
            </div>
          ) : (
            <p className="text-xs text-default-500">
              {addedLabels.length > 0
                ? 'Fitur aktif lainnya tetap aktif.'
                : 'Semua fitur bawaan jenis bisnis ini sudah aktif. Tidak ada fitur yang dimatikan.'}
            </p>
          )}
        </div>
      )}
    </StudioDialog>
  );
}
