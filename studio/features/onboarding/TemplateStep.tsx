'use client';

import { Skeleton } from '@heroui/react';

import { EmptyState } from '@/studio/ui/primitives/EmptyState';

import { templateFitText } from './template-meta';
import { TemplateCard } from './TemplateCard';
import { TemplateFilters } from './TemplateFilters';
import type { TemplateCatalogState } from './use-template-catalog';
import { ARROW_LEFT, Arrow, LoadError, StepActions, WizardButton } from './wizard-ui';

export interface TemplateStepProps {
  catalog: TemplateCatalogState;
  profileLabel: string | null;
  profileLabelOf: (profileId: string) => string | null;
  onOpen: (templateId: string) => void;
  onBack: () => void;
}

/** Langkah 2 — marketplace template (artboard Wizard-Template, tampilan grid). */
export function TemplateStep({ catalog, profileLabel, profileLabelOf, onOpen, onBack }: TemplateStepProps) {
  const emptyPremium = catalog.status === 'ready' && catalog.templates.length === 0 && catalog.priceFilter === 'premium';

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-[18px] px-4 pb-28 pt-5 md:px-6 md:pb-8 md:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="hidden text-[13px] font-bold uppercase tracking-[0.08em] text-primary md:block">Langkah 2 dari 3</p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.02em] text-foreground md:text-[28px]">Pilih tampilan website</h1>
          <p className="text-sm text-default-600 md:text-[15px]">
            Template resmi gratis, atau template premium dari desainer mitra. Bisa diganti kapan saja.
          </p>
        </div>
        <TemplateFilters
          price={catalog.priceFilter}
          onPrice={catalog.setPriceFilter}
          counts={catalog.priceCounts}
          profileLabel={profileLabel}
          showMatch={catalog.hasMatches}
          matchOnly={catalog.matchOnly}
          onMatchOnly={catalog.setMatchOnly}
        />
      </div>

      {catalog.status === 'error' && <LoadError message={catalog.error ?? 'Gagal memuat.'} onRetry={catalog.reload} />}

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
        {catalog.status === 'loading' &&
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[280px] rounded-2xl" />)}
        {catalog.status === 'ready' &&
          catalog.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              fitText={templateFitText(template, catalog.isRecommended(template.id) ? profileLabel : null, profileLabelOf)}
              onOpen={() => onOpen(template.id)}
            />
          ))}
      </div>

      {catalog.status === 'ready' && catalog.templates.length === 0 && (
        <EmptyState
          compact
          title={emptyPremium ? 'Belum ada template premium' : 'Tidak ada template yang cocok'}
          description={
            emptyPremium
              ? 'Template premium dari desainer mitra segera hadir. Pakai template gratis dulu, bisa diganti kapan saja.'
              : 'Matikan filter "Cocok untuk …" untuk melihat semua template.'
          }
        />
      )}

      <StepActions>
        <WizardButton variant="secondary" onClick={onBack}>
          <Arrow d={ARROW_LEFT} /> Kembali
        </WizardButton>
      </StepActions>
    </div>
  );
}
