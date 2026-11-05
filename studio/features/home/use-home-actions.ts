'use client';

import { useState } from 'react';

import { errorMessage } from '@/studio/api/client';
import { markOnboardingLinkShared, updateWebsiteLogo } from '@/studio/api/home';
import { uploadLogo } from '@/studio/api/onboarding';
import { buildTenantWebUrl } from '@/studio/lib/template-preview';
import { useWebsiteStore } from '@/studio/stores/website-store';
import { notify } from '@/studio/ui/primitives/Toast';

import { homeStorage } from './home-storage';
import { markLegacyLinkShared } from './legacy-onboarding-status';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * Aksi checklist: unggah logo (upload + PATCH website), salin link (+ POST link-shared),
 * sembunyikan panduan. `onLinkShared` menerima waktu tersimpan (ISO) untuk memperbarui status.
 */
export function useHomeActions(websiteId: string, slug: string, onLinkShared: (iso: string) => void) {
  const refreshWebsites = useWebsiteStore((s) => s.refresh);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [guideHidden, setGuideHiddenState] = useState(() => homeStorage.isGuideHidden(websiteId));

  const uploadAndSaveLogo = async (file: File): Promise<void> => {
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > MAX_LOGO_BYTES) {
      notify.error('Logo tidak valid', 'Gunakan PNG/JPG maks. 2 MB.');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadLogo(file);
      await updateWebsiteLogo(websiteId, url);
      await refreshWebsites();
      notify.success('Logo tersimpan');
    } catch (err) {
      notify.error('Logo gagal disimpan', errorMessage(err));
    } finally {
      setUploadingLogo(false);
    }
  };

  const markShared = async (): Promise<void> => {
    try {
      const res = await markOnboardingLinkShared(websiteId);
      onLinkShared(res?.linkSharedAt ?? markLegacyLinkShared(websiteId));
    } catch {
      // Link sudah tersalin; status checklist akan dicoba lagi saat salin berikutnya.
    }
  };

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildTenantWebUrl(slug));
    } catch {
      notify.error('Gagal menyalin link');
      return;
    }
    notify.success('Link website disalin');
    await markShared();
  };

  const setGuideHidden = (hidden: boolean): void => {
    homeStorage.setGuideHidden(websiteId, hidden);
    setGuideHiddenState(hidden);
  };

  return { uploadingLogo, uploadAndSaveLogo, copyLink, guideHidden, setGuideHidden };
}
