'use client';

import { useEffect, useMemo, useState } from 'react';

import type { UserWebsiteDto } from '@/studio/api/types';
import { hasMinRole } from '@/studio/lib/roles';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveWebsite } from '@/studio/stores/website-store';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';

import { buildChecklist } from './checklist-steps';
import { ChecklistCard } from './ChecklistCard';
import { MoreFeaturesCard, StatsCard, WebsiteCard } from './HomeCards';
import { useHomeActions } from './use-home-actions';
import { useHomeData } from './use-home-data';

/** `/studio` Beranda — artboard "5 · Beranda + checklist" (plan §3.6). */
export function StudioHome() {
  const active = useActiveWebsite();
  if (!active) return null;
  // key: state per website (panduan tersembunyi, status checklist) direset saat ganti website.
  return <HomeContent key={active.website.id} active={active} />;
}

function HomeContent({ active }: { active: UserWebsiteDto }) {
  const { website, role } = active;
  const enabledModules = useModulesStore((s) => s.enabledModules);
  const businessProfile = useModulesStore((s) => s.businessProfile);
  const { signals, loading, setLinkSharedAt } = useHomeData(website, enabledModules);
  const actions = useHomeActions(website.id, website.slug, setLinkSharedAt);
  const [welcome, setWelcome] = useState(false);

  // `?welcome=1` dari layar "Website jadi" (dibaca setelah mount → aman hidrasi).
  useEffect(() => {
    setWelcome(new URLSearchParams(window.location.search).get('welcome') === '1');
  }, []);

  const steps = useMemo(
    () =>
      buildChecklist({
        website,
        businessProfile,
        enabled: new Set(enabledModules),
        status: signals.status,
        canEditWebsite: hasMinRole(role, 'admin'),
      }),
    [businessProfile, enabledModules, role, signals.status, website],
  );
  const allDone = !loading && steps.every((s) => s.done);
  const showChecklist = !actions.guideHidden && !allDone;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Beranda" />
      {welcome && (
        <section role="status" className="rounded-2xl border border-primary-200 bg-primary-50 px-5 py-4">
          <p className="text-base font-bold text-primary">Selamat datang di {website.name}!</p>
          <p className="mt-1 text-sm text-default-700">Website kamu sudah online. Ikuti langkah di bawah untuk menyiapkannya.</p>
        </section>
      )}
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-[999_1_460px]">
          {showChecklist ? (
            <ChecklistCard
              steps={steps}
              loading={loading}
              uploadingLogo={actions.uploadingLogo}
              onUploadLogo={(file) => void actions.uploadAndSaveLogo(file)}
              onCopyLink={() => void actions.copyLink()}
              onHide={() => actions.setGuideHidden(true)}
            />
          ) : (
            <>
              <StatsCard newOrders={signals.newOrders} unreadChats={signals.unreadChats} />
              {!allDone && (
                <button
                  type="button"
                  onClick={() => actions.setGuideHidden(false)}
                  className="self-start text-[13px] font-semibold text-primary"
                >
                  Tampilkan panduan persiapan
                </button>
              )}
            </>
          )}
        </div>
        <aside className="flex w-full min-w-0 flex-col gap-4 lg:flex-[1_1_300px]">
          <WebsiteCard website={website} />
          {showChecklist && <StatsCard newOrders={signals.newOrders} unreadChats={signals.unreadChats} />}
          <MoreFeaturesCard />
        </aside>
      </div>
    </div>
  );
}
