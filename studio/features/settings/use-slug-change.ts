'use client';

import { useEffect, useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { updateWebsiteSlug } from '@/studio/api/domain';
import { checkWebsiteSlug } from '@/studio/api/onboarding';
import type { WebsiteDto } from '@/studio/api/types';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '@/studio/lib/slug';
import { displayHost } from '@/studio/lib/template-preview';
import { useWebsiteStore } from '@/studio/stores/website-store';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { notify } from '@/studio/ui/primitives/Toast';

export type SlugCheck = 'same' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

/** Ubah alamat bawaan (slug): cek ketersediaan (debounce) → konfirmasi → PATCH. */
export function useSlugChange(website: WebsiteDto) {
  const patchWebsite = useWebsiteStore((s) => s.patchWebsite);
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState(website.slug);
  const [check, setCheck] = useState<SlugCheck>('same');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSlug(website.slug);
    setEditing(false);
  }, [website.id, website.slug]);

  useEffect(() => {
    if (!editing) return undefined;
    if (slug === website.slug) { setCheck('same'); return undefined; }
    if (!SLUG_PATTERN.test(slug) || slug.length > SLUG_MAX_LENGTH) { setCheck('invalid'); return undefined; }
    setCheck('checking');
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkWebsiteSlug(slug, { signal: controller.signal })
        .then((res) => setCheck(res.available ? 'available' : 'taken'))
        .catch((err: unknown) => { if (!controller.signal.aborted) setCheck('error'); void err; });
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [slug, editing, website.slug]);

  const save = async (): Promise<void> => {
    if (check !== 'available' || saving) return;
    const ok = await confirm({
      title: 'Ubah alamat website?',
      description: `Link lama (${displayHost(website.slug)}) akan berhenti bekerja. Alamat baru: ${displayHost(slug)}. Bagikan ulang link ke pelanggan.`,
      confirmLabel: 'Ya, ubah alamat',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const result = await updateWebsiteSlug(website.id, slug);
      patchWebsite(website.id, { slug: result.slug ?? slug, updated_at: result.updated_at });
      setEditing(false);
      notify.success('Alamat website diubah.');
    } catch (err) {
      notify.error('Gagal mengubah alamat.', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return { editing, setEditing, slug, setSlug: (v: string) => setSlug(v.toLowerCase().trim()), check, saving, save, dialog };
}
