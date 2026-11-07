'use client';

import { useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { fetchTemplates } from '@/studio/api/onboarding';
import type { BusinessProfileId, WebsiteTemplateDto } from '@/studio/api/types';

export type PriceFilter = 'all' | 'free' | 'premium';

export function isPaidTemplate(template: WebsiteTemplateDto): boolean {
  return typeof template.price === 'number' && template.price > 0;
}

export interface TemplateCatalogState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  reload: () => void;
  /** Template yang tampil setelah filter. */
  templates: WebsiteTemplateDto[];
  allCount: number;
  /** Jumlah per chip harga, dihitung setelah filter "Cocok untuk …". */
  priceCounts: Record<PriceFilter, number>;
  priceFilter: PriceFilter;
  setPriceFilter: (filter: PriceFilter) => void;
  /** Ada template yang cocok untuk profile → toggle "Cocok untuk …" ditampilkan. */
  hasMatches: boolean;
  matchOnly: boolean;
  setMatchOnly: (value: boolean) => void;
  isRecommended: (templateId: string) => boolean;
  findById: (templateId: string) => WebsiteTemplateDto | null;
}

/**
 * `GET /api/templates?business_profile=` (cocok) + `GET /api/templates` (semua).
 * Bila tidak ada yang cocok, filter "Cocok untuk …" disembunyikan dan semua tampil.
 */
export function useTemplateCatalog(profileId: BusinessProfileId | null): TemplateCatalogState {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState<WebsiteTemplateDto[]>([]);
  const [matchIds, setMatchIds] = useState<ReadonlySet<string>>(() => new Set());
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [matchOnly, setMatchOnly] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    setStatus('loading');
    setError(null);
    Promise.all([fetchTemplates(), fetchTemplates(profileId)])
      .then(([everything, matching]) => {
        if (cancelled) return;
        setAll(everything);
        setMatchIds(new Set(matching.map((t) => t.id)));
        setMatchOnly(matching.length > 0);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err, 'Template gagal dimuat.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, profileId]);

  const hasMatches = matchIds.size > 0;

  const byMatch = useMemo(
    () => (hasMatches && matchOnly ? all.filter((t) => matchIds.has(t.id)) : all),
    [all, hasMatches, matchIds, matchOnly],
  );

  const priceCounts = useMemo<Record<PriceFilter, number>>(() => {
    const premium = byMatch.filter(isPaidTemplate).length;
    return { all: byMatch.length, free: byMatch.length - premium, premium };
  }, [byMatch]);

  const templates = useMemo(() => {
    const byPrice =
      priceFilter === 'all' ? byMatch : byMatch.filter((t) => (priceFilter === 'premium' ? isPaidTemplate(t) : !isPaidTemplate(t)));
    // Rekomendasi di depan, sisanya urut nama (API sudah urut nama).
    return [...byPrice].sort((a, b) => Number(matchIds.has(b.id)) - Number(matchIds.has(a.id)));
  }, [byMatch, matchIds, priceFilter]);

  return {
    status,
    error,
    reload: () => setAttempt((n) => n + 1),
    templates,
    allCount: all.length,
    priceCounts,
    priceFilter,
    setPriceFilter,
    hasMatches,
    matchOnly,
    setMatchOnly,
    isRecommended: (id) => matchIds.has(id),
    findById: (id) => all.find((t) => t.id === id) ?? null,
  };
}
