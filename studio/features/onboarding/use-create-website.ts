'use client';

import { useState } from 'react';

import { errorMessage, isApiError } from '@/studio/api/client';
import { createWebsite } from '@/studio/api/onboarding';
import type { CreatedWebsiteDto, CreateWebsiteRequestDto } from '@/studio/api/types';
import { useWebsiteStore } from '@/studio/stores/website-store';

export interface CreateWebsiteState {
  submitting: boolean;
  error: string | null;
  created: CreatedWebsiteDto | null;
  submit: (body: CreateWebsiteRequestDto) => Promise<boolean>;
}

/**
 * `POST /api/websites`, lalu website baru DIJADIKAN AKTIF lewat store
 * (`switchWebsite` memuat ulang daftar bila id belum ada — memperbaiki bug lama).
 */
export function useCreateWebsite(): CreateWebsiteState {
  const switchWebsite = useWebsiteStore((s) => s.switchWebsite);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedWebsiteDto | null>(null);

  const submit = async (body: CreateWebsiteRequestDto): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      const website = await createWebsite(body);
      await switchWebsite(website.id);
      setCreated(website);
      return true;
    } catch (err) {
      setError(
        isApiError(err) && err.status === 409
          ? 'Alamat website sudah dipakai. Coba alamat lain.'
          : errorMessage(err, 'Website gagal dibuat. Coba lagi.'),
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, created, submit };
}
