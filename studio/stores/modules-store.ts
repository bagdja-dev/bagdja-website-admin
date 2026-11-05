'use client';

import { create } from 'zustand';

import { errorMessage } from '@/studio/api/client';
import { fetchBusinessProfiles, fetchWebsiteModules, updateWebsiteModules } from '@/studio/api/modules';
import type {
  BusinessProfileId,
  BusinessProfilesResponseDto,
  ModuleKey,
  UpdateWebsiteModulesRequestDto,
  WebsiteDto,
  WebsiteModulesResponseDto,
  WebsiteModuleStateDto,
} from '@/studio/api/types';
import { CORE_MODULES, FALLBACK_AVAILABLE_MODULES, FALLBACK_MODULE_LABELS } from '@/studio/lib/modules';

import type { LoadStatus } from './website-store';

/** `api` = dari `GET /websites/:id/modules`; `legacy-fallback` = endpoint belum ada. */
export type ModulesSource = 'api' | 'legacy-fallback';

type WebsiteModuleSnapshot = Pick<WebsiteDto, 'id' | 'business_profile' | 'enabled_modules'>;

interface ModulesState {
  catalog: BusinessProfilesResponseDto | null;
  website: WebsiteModuleSnapshot | null;
  businessProfile: BusinessProfileId;
  enabledModules: ModuleKey[];
  moduleStates: WebsiteModuleStateDto[];
  source: ModulesSource;
  status: LoadStatus;
  errorMessage: string | null;
  loadForWebsite: (website: WebsiteModuleSnapshot) => Promise<void>;
  refresh: () => Promise<void>;
  /** PATCH lalu langsung memperbarui himpunan efektif (sidebar ikut berubah tanpa reload). */
  updateModules: (body: UpdateWebsiteModulesRequestDto) => Promise<WebsiteModulesResponseDto>;
  hasModule: (key: ModuleKey) => boolean;
  moduleLabel: (key: ModuleKey) => string;
}

let catalogPromise: Promise<BusinessProfilesResponseDto | null> | null = null;
let requestSeq = 0;

function ensureCatalog(): Promise<BusinessProfilesResponseDto | null> {
  catalogPromise ??= fetchBusinessProfiles().catch(() => {
    catalogPromise = null; // boleh dicoba lagi nanti
    return null;
  });
  return catalogPromise;
}

/** Perilaku legacy (kontrak §1.2): kosong → semua modul `available` aktif. */
function legacyEffectiveModules(
  website: WebsiteModuleSnapshot,
  catalog: BusinessProfilesResponseDto | null,
): ModuleKey[] {
  const stored = website.enabled_modules ?? [];
  if (stored.length > 0) return Array.from(new Set<ModuleKey>([...CORE_MODULES, ...stored]));
  const available = catalog
    ? catalog.modules.filter((m) => m.status === 'available').map((m) => m.key)
    : [...FALLBACK_AVAILABLE_MODULES];
  return Array.from(new Set<ModuleKey>([...CORE_MODULES, ...available]));
}

function fromResponse(res: WebsiteModulesResponseDto): Pick<
  ModulesState,
  'businessProfile' | 'enabledModules' | 'moduleStates' | 'source'
> {
  return {
    businessProfile: res.businessProfile,
    enabledModules: res.enabledModules,
    moduleStates: res.modules,
    source: 'api',
  };
}

export const useModulesStore = create<ModulesState>()((set, get) => ({
  catalog: null,
  website: null,
  businessProfile: 'legacy',
  enabledModules: [],
  moduleStates: [],
  source: 'legacy-fallback',
  status: 'idle',
  errorMessage: null,

  loadForWebsite: async (website) => {
    const seq = ++requestSeq;
    const switching = get().website?.id !== website.id;
    set({ website, ...(switching ? { status: 'loading', errorMessage: null } : {}) });
    try {
      const [catalog, res] = await Promise.all([ensureCatalog(), fetchWebsiteModules(website.id)]);
      if (seq !== requestSeq) return;
      if (res) {
        set({ catalog, ...fromResponse(res), status: 'ready', errorMessage: null });
        return;
      }
      set({
        catalog,
        businessProfile: website.business_profile ?? 'legacy',
        enabledModules: legacyEffectiveModules(website, catalog),
        moduleStates: [],
        source: 'legacy-fallback',
        status: 'ready',
        errorMessage: null,
      });
    } catch (error) {
      if (seq !== requestSeq) return;
      // Galat selain 404: tetap pakai himpunan legacy agar Studio bisa dipakai,
      // tapi simpan pesan galat supaya shell bisa menawarkan "Coba lagi".
      set({
        businessProfile: website.business_profile ?? 'legacy',
        enabledModules: legacyEffectiveModules(website, get().catalog),
        moduleStates: [],
        source: 'legacy-fallback',
        status: 'error',
        errorMessage: errorMessage(error, 'Gagal memuat fitur website.'),
      });
    }
  },

  refresh: async () => {
    const website = get().website;
    if (website) await get().loadForWebsite(website);
  },

  updateModules: async (body) => {
    const website = get().website;
    if (!website) throw new Error('Website aktif belum dimuat.');
    const res = await updateWebsiteModules(website.id, body);
    if (get().website?.id === website.id) set({ ...fromResponse(res), status: 'ready' });
    return res;
  },

  hasModule: (key) => get().enabledModules.includes(key),

  moduleLabel: (key) => get().catalog?.modules.find((m) => m.key === key)?.label ?? FALLBACK_MODULE_LABELS[key],
}));

/** Reaktif: komponen ikut render ulang saat modul diaktifkan/dimatikan. */
export function useHasModule(key: ModuleKey): boolean {
  return useModulesStore((s) => s.enabledModules.includes(key));
}

export function useModuleLabel(key: ModuleKey): string {
  return useModulesStore(
    (s) => s.catalog?.modules.find((m) => m.key === key)?.label ?? FALLBACK_MODULE_LABELS[key],
  );
}
