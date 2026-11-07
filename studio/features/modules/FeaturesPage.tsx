'use client';

import { Skeleton } from '@heroui/react';

import { ProfileIcon } from '@/studio/features/onboarding/profile-icons';
import { useModulesStore } from '@/studio/stores/modules-store';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { profileLabelOf } from '@/studio/ui/shell/site-identity';

import { ChangeProfileDialog } from './ChangeProfileDialog';
import { EnableModuleDialog } from './EnableModuleDialog';
import { ModuleCard } from './ModuleCard';
import { useChangeProfile } from './use-change-profile';
import { useFeaturesPage } from './use-features-page';

/** `/studio/features` — artboard "7 · Fitur (aktivasi modul)". */
export function FeaturesPage() {
  const page = useFeaturesPage();
  const change = useChangeProfile();
  const businessProfile = useModulesStore((s) => s.businessProfile);
  const catalog = useModulesStore((s) => s.catalog);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fitur" description="Aktifkan hanya yang kamu butuhkan. Menu di samping ikut menyesuaikan." />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-default-200 bg-white px-5 py-[18px]">
        <div className="flex items-center gap-3.5">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-primary-50 text-primary">
            <ProfileIcon profileId={businessProfile} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] text-default-600">Jenis bisnis</span>
            <span className="text-base font-bold">
              {profileLabelOf(businessProfile, catalog)} · {page.activeCount} dari {page.totalCount} fitur aktif
            </span>
          </span>
        </div>
        {page.canEdit && (
          <button
            type="button"
            onClick={() => change.setOpen(true)}
            className="min-h-11 rounded-[10px] border border-default-300 bg-white px-4 text-sm font-semibold text-foreground hover:bg-default-50"
          >
            Ganti jenis bisnis
          </button>
        )}
      </section>

      {(page.readOnlyReason || !page.canEdit) && page.ready && (
        <p role="status" className="rounded-xl border border-default-200 bg-white px-4 py-3 text-sm text-default-600">
          {page.readOnlyReason ?? 'Hanya owner website yang bisa mengaktifkan atau mematikan fitur.'}
        </p>
      )}

      {!page.ready &&
        Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}

      {page.ready &&
        page.sections.map((section) => (
          <section key={section.label} aria-labelledby={`features-${section.label}`} className="flex flex-col gap-3">
            <h2 id={`features-${section.label}`} className="text-[13px] font-bold uppercase tracking-[0.08em] text-default-600">
              {section.label}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
              {section.cards.map((card) => (
                <ModuleCard key={card.key} card={card} canEdit={page.canEdit} onToggle={(next) => page.requestToggle(card.key, next)} />
              ))}
            </div>
          </section>
        ))}

      <p className="text-[13px] text-default-500">
        Mematikan fitur tidak menghapus data. Data akan muncul lagi saat fitur diaktifkan kembali. Tampilan Website, Tim,
        Langganan, dan Pengaturan selalu aktif.
      </p>

      <EnableModuleDialog
        info={page.confirmInfo}
        deps={page.confirmDeps}
        busy={page.enabling}
        onCancel={page.cancelConfirm}
        onConfirm={() => void page.confirmEnable()}
      />
      <ChangeProfileDialog state={change} />
    </div>
  );
}
