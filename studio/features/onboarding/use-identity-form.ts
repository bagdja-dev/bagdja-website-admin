'use client';

import { useEffect, useState } from 'react';

import { checkWebsiteSlug, uploadLogo } from '@/studio/api/onboarding';
import { errorMessage } from '@/studio/api/client';
import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugify } from '@/studio/lib/slug';

export type SlugStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

/** Artboard Wizard-Identitas: "PNG/JPG, persegi, maks. 2 MB". */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = new Set(['image/jpeg', 'image/png']);

export interface IdentityFormState {
  name: string;
  setName: (value: string) => void;
  slug: string;
  setSlug: (value: string) => void;
  slugStatus: SlugStatus;
  whatsapp: string;
  setWhatsapp: (value: string) => void;
  logoUrl: string | null;
  logoUploading: boolean;
  logoError: string | null;
  pickLogo: (file: File) => Promise<void>;
  removeLogo: () => void;
  nameError: string | null;
  whatsappError: string | null;
  /** Tandai field sudah disentuh (tampilkan galat). */
  touch: () => void;
  isValid: boolean;
}

/** Hanya angka; `08…` → `628…`. Kosong = tidak diisi. */
export function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
}

/** Langkah 3 "Nama & logo": slug otomatis dari nama sampai user mengubahnya sendiri. */
export function useIdentityForm(): IdentityFormState {
  const [name, setNameState] = useState('');
  const [slug, setSlugState] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const setName = (value: string): void => {
    setNameState(value);
    if (!slugEdited) setSlugState(slugify(value));
  };

  const setSlug = (value: string): void => {
    setSlugEdited(true);
    setSlugState(value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, SLUG_MAX_LENGTH));
  };

  useEffect(() => {
    if (!slug) {
      setSlugStatus('idle');
      return;
    }
    if (!SLUG_PATTERN.test(slug)) {
      setSlugStatus('invalid');
      return;
    }
    setSlugStatus('checking');
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkWebsiteSlug(slug, { signal: controller.signal })
        .then((res) => setSlugStatus(res.available ? 'available' : 'taken'))
        .catch(() => {
          if (!controller.signal.aborted) setSlugStatus('error');
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  const pickLogo = async (file: File): Promise<void> => {
    setLogoError(null);
    if (!LOGO_TYPES.has(file.type)) {
      setLogoError('Format logo harus PNG atau JPG.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Ukuran logo maksimal 2 MB.');
      return;
    }
    setLogoUploading(true);
    try {
      setLogoUrl(await uploadLogo(file));
    } catch (err) {
      setLogoError(errorMessage(err, 'Logo gagal diunggah.'));
    } finally {
      setLogoUploading(false);
    }
  };

  const wa = normalizeWhatsapp(whatsapp);
  const nameError = touched && !name.trim() ? 'Nama bisnis wajib diisi.' : null;
  const whatsappError = touched && wa && (wa.length < 9 || wa.length > 15) ? 'Nomor WhatsApp tidak valid.' : null;

  return {
    name,
    setName,
    slug,
    setSlug,
    slugStatus,
    whatsapp,
    setWhatsapp,
    logoUrl,
    logoUploading,
    logoError,
    pickLogo,
    removeLogo: () => setLogoUrl(null),
    nameError,
    whatsappError,
    touch: () => setTouched(true),
    isValid:
      name.trim().length > 0 &&
      slugStatus === 'available' &&
      !logoUploading &&
      (!wa || (wa.length >= 9 && wa.length <= 15)),
  };
}
