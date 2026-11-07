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
  resetFeaturesToPreset: boolean;
  setResetFeaturesToPreset: (value: boolean) => void;
  /** Label modul preset yang BELUM aktif (akan ditambahkan bila preset diterapkan). */
  addedLabels: string[];
  /** Label modul non-inti aktif yang tidak ada di preset pilihan. */
  removedLabels: string[];
  saving: boolean;
  save: () => Promise<void>;
}

/** Ganti jenis bisnis: preset dapat ditambahkan atau diselaraskan sepenuhnya, ditampilkan sebagai diff. */
export function useChangeProfile(): ChangeProfileState {
  const catalog = useModulesStore((s) => s.catalog);
  const current = useModulesStore((s) => s.businessProfile);
  const enabledModules = useModulesStore((s) => s.enabledModules);
  const changeBusinessProfile = useModulesStore((s) => s.changeBusinessProfile);
  const refreshWebsites = useWebsiteStore((s) => s.refresh);
  const [open, setOpenState] = useState(false);
  const [selected, setSelected] = useState<SelectableProfileId | null>(null);
  const [applyPreset, setApplyPreset] = useState(true);
  const [resetFeaturesToPreset, setResetFeaturesToPreset] = useState(false);
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

  const removedLabels = useMemo(() => {
    const profile = profiles.find((p) => p.id === selected);
    if (!profile || !catalog) return [];
    const preset = new Set(profile.defaultModules);
    const core = new Set(catalog.modules.filter((module) => module.core).map((module) => module.key));
    return enabledModules
      .filter((key) => !core.has(key) && !preset.has(key))
      .map((key) => catalog.modules.find((module) => module.key === key))
      .filter((module): module is NonNullable<typeof module> => Boolean(module))
      .map((module) => module.label);
  }, [catalog, enabledModules, profiles, selected]);

  const setOpen = (value: boolean): void => {
    if (value) {
      setSelected(current === 'legacy' ? null : current);
      setApplyPreset(true);
      setResetFeaturesToPreset(false);
    }
    setOpenState(value);
  };

  const save = async (): Promise<void> => {
    if (!selected) return;
    setSaving(true);
    try {
      await changeBusinessProfile({
        businessProfile: selected,
        applyPreset: !resetFeaturesToPreset && applyPreset && addedLabels.length > 0,
        resetFeaturesToPreset,
      });
      await refreshWebsites();
      notify.success(resetFeaturesToPreset ? 'Jenis bisnis dan fitur diperbarui' : 'Jenis bisnis diperbarui');
      setOpenState(false);
    } catch (err) {
      notify.error('Jenis bisnis gagal diganti', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return {
    open,
    setOpen,
    profiles,
    selected,
    select: setSelected,
    applyPreset,
    setApplyPreset,
    resetFeaturesToPreset,
    setResetFeaturesToPreset,
    addedLabels,
    removedLabels,
    saving,
    save,
  };
}
