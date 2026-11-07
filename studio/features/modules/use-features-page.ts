'use client';

import { useCallback, useMemo, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import type { ModuleInfoDto, ModuleKey } from '@/studio/api/types';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveRole } from '@/studio/stores/website-store';
import { notify } from '@/studio/ui/primitives/Toast';

import { FEATURE_SECTIONS } from './module-groups';

export interface FeatureCardModel {
  key: ModuleKey;
  label: string;
  description: string;
  enabled: boolean;
  comingSoon: boolean;
  dependsOnLabels: string[];
  /** Alasan switch dikunci (segera hadir / blockedReason API); `null` = bisa diubah. */
  lockReason: string | null;
  pending: boolean;
}

export interface DependencyRow {
  key: ModuleKey;
  label: string;
  alreadyEnabled: boolean;
}

export interface FeaturesPageState {
  ready: boolean;
  canEdit: boolean;
  /** API modul belum tersedia (404) → hanya tampil. */
  readOnlyReason: string | null;
  activeCount: number;
  totalCount: number;
  sections: Array<{ label: string; cards: FeatureCardModel[] }>;
  confirmKey: ModuleKey | null;
  confirmInfo: ModuleInfoDto | null;
  confirmDeps: DependencyRow[];
  requestToggle: (key: ModuleKey, next: boolean) => void;
  cancelConfirm: () => void;
  confirmEnable: () => Promise<void>;
  enabling: boolean;
}

/** Semua dependensi (rekursif) dari registry API. */
function resolveDeps(key: ModuleKey, byKey: Map<ModuleKey, ModuleInfoDto>, acc: ModuleKey[] = []): ModuleKey[] {
  for (const dep of byKey.get(key)?.dependsOn ?? []) {
    if (!acc.includes(dep)) {
      acc.push(dep);
      resolveDeps(dep, byKey, acc);
    }
  }
  return acc;
}

/** Logika halaman Fitur (§3.4): toggle via PATCH modul, modal dependensi, alasan blokir dari API. */
export function useFeaturesPage(): FeaturesPageState {
  const catalog = useModulesStore((s) => s.catalog);
  const enabledModules = useModulesStore((s) => s.enabledModules);
  const moduleStates = useModulesStore((s) => s.moduleStates);
  const source = useModulesStore((s) => s.source);
  const status = useModulesStore((s) => s.status);
  const updateModules = useModulesStore((s) => s.updateModules);
  const role = useActiveRole();
  const [pendingKey, setPendingKey] = useState<ModuleKey | null>(null);
  const [confirmKey, setConfirmKey] = useState<ModuleKey | null>(null);
  const [enabling, setEnabling] = useState(false);

  const byKey = useMemo(() => new Map((catalog?.modules ?? []).map((m) => [m.key, m])), [catalog]);
  const stateByKey = useMemo(() => new Map(moduleStates.map((m) => [m.key, m])), [moduleStates]);
  const enabledSet = useMemo(() => new Set(enabledModules), [enabledModules]);
  const label = useCallback((key: ModuleKey) => byKey.get(key)?.label ?? key, [byKey]);

  const readOnlyReason =
    source === 'api' ? null : 'Pengaturan fitur belum tersedia untuk website ini. Coba lagi nanti.';
  const canEdit = role === 'owner' && readOnlyReason === null;

  const sections = useMemo(
    () =>
      FEATURE_SECTIONS.map((section) => ({
        label: section.label,
        cards: section.keys
          .filter((key) => byKey.has(key))
          .map((key): FeatureCardModel => {
            const info = byKey.get(key) as ModuleInfoDto;
            const enabled = enabledSet.has(key);
            const comingSoon = info.status === 'coming_soon';
            const blocked = enabled ? stateByKey.get(key)?.blockedReason ?? null : null;
            return {
              key,
              label: info.label,
              description: info.description,
              enabled,
              comingSoon,
              dependsOnLabels: info.dependsOn.map(label),
              lockReason: comingSoon ? 'Segera hadir — aktif otomatis untuk jenis bisnismu saat siap' : blocked,
              pending: pendingKey === key,
            };
          }),
      })).filter((s) => s.cards.length > 0),
    [byKey, enabledSet, label, pendingKey, stateByKey],
  );

  const optional = (catalog?.modules ?? []).filter((m) => !m.core);
  const activeCount = optional.filter((m) => enabledSet.has(m.key)).length;

  const disable = async (key: ModuleKey): Promise<void> => {
    setPendingKey(key);
    try {
      await updateModules({ disable: [key] });
      notify.success(`${label(key)} dimatikan. Datanya tetap tersimpan.`);
    } catch (err) {
      notify.error(`${label(key)} tidak bisa dimatikan`, errorMessage(err));
    } finally {
      setPendingKey(null);
    }
  };

  const requestToggle = (key: ModuleKey, next: boolean): void => {
    if (!canEdit) return;
    if (next) setConfirmKey(key);
    else void disable(key);
  };

  const confirmEnable = async (): Promise<void> => {
    if (!confirmKey) return;
    const key = confirmKey;
    setEnabling(true);
    try {
      await updateModules({ enable: [key] });
      notify.success(`${label(key)} aktif. Menunya sudah muncul di samping.`);
      setConfirmKey(null);
    } catch (err) {
      notify.error(`${label(key)} gagal diaktifkan`, errorMessage(err));
    } finally {
      setEnabling(false);
    }
  };

  const confirmDeps = confirmKey
    ? resolveDeps(confirmKey, byKey).map((key) => ({ key, label: label(key), alreadyEnabled: enabledSet.has(key) }))
    : [];

  return {
    ready: status !== 'idle' && status !== 'loading' && catalog !== null,
    canEdit,
    readOnlyReason,
    activeCount,
    totalCount: optional.filter((m) => m.status === 'available').length,
    sections,
    confirmKey,
    confirmInfo: confirmKey ? byKey.get(confirmKey) ?? null : null,
    confirmDeps,
    requestToggle,
    cancelConfirm: () => setConfirmKey(null),
    confirmEnable,
    enabling,
  };
}
