'use client';

import { useMemo, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import type { BusinessProfileDto, BusinessProfileId } from '@/studio/api/types';
import { CORE_MODULES } from '@/studio/lib/modules';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useWebsiteStore } from '@/studio/stores/website-store';
import { notify } from '@/studio/ui/primitives/Toast';

type SelectableProfileId = Exclude<BusinessProfileId, 'legacy'>;

export interface ChangeProfileState {
  open: boolean;
  setOpen: (open: boolean) => void;
  profiles: BusinessProfileDto[];
  selected: SelectableProfileId | null;
  select: (id: SelectableProfileId) => void;
  applyPreset: boolean;
  setApplyPreset: (value: boolean) => void;
  /** Label modul preset yang BELUM aktif (akan ditambahkan bila preset diterapkan). */
  addedLabels: string[];
  saving: boolean;
  save: () => Promise<void>;
}

/** Ganti jenis bisnis (§3.4): informatif; preset hanya MENAMBAH modul, ditampilkan sebagai diff. */
export function useChangeProfile(): ChangeProfileState {
  const catalog = useModulesStore((s) => s.catalog);
  const current = useModulesStore((s) => s.businessProfile);
  const enabledModules = useModulesStore((s) => s.enabledModules);
  const changeBusinessProfile = useModulesStore((s) => s.changeBusinessProfile);
  const refreshWebsites = useWebsiteStore((s) => s.refresh);
  const [open, setOpenState] = useState(false);
  const [selected, setSelected] = useState<SelectableProfileId | null>(null);
  const [applyPreset, setApplyPreset] = useState(true);
  const [saving, setSaving] = useState(false);

  const profiles = useMemo(
    () => (catalog?.profiles ?? []).filter((p) => p.status === 'available').sort((a, b) => a.sortOrder - b.sortOrder),
    [catalog],
  );

  const addedLabels = useMemo(() => {
    const profile = profiles.find((p) => p.id === selected);
    if (!profile || !catalog) return [];
    const enabled = new Set(enabledModules);
    return profile.defaultModules
      .filter((key) => !CORE_MODULES.includes(key) && !enabled.has(key))
      .map((key) => catalog.modules.find((m) => m.key === key))
      .filter((m): m is NonNullable<typeof m> => Boolean(m) && m?.status === 'available')
      .map((m) => m.label);
  }, [catalog, enabledModules, profiles, selected]);

  const setOpen = (value: boolean): void => {
    if (value) {
      setSelected(current === 'legacy' ? null : current);
      setApplyPreset(true);
    }
    setOpenState(value);
  };

  const save = async (): Promise<void> => {
    if (!selected) return;
    setSaving(true);
    try {
      await changeBusinessProfile({ businessProfile: selected, applyPreset: applyPreset && addedLabels.length > 0 });
      await refreshWebsites();
      notify.success('Jenis bisnis diperbarui');
      setOpenState(false);
    } catch (err) {
      notify.error('Jenis bisnis gagal diganti', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return { open, setOpen, profiles, selected, select: setSelected, applyPreset, setApplyPreset, addedLabels, saving, save };
}
