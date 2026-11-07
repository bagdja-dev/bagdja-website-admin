'use client';

import { useEffect, useState } from 'react';

import { errorMessage, isApiError } from '@/studio/api/client';
import type { WebsiteDto } from '@/studio/api/types';
import { updateWebsiteIdentity } from '@/studio/api/websites';
import { uploadLogo } from '@/studio/api/onboarding';
import { normalizeWhatsapp } from '@/studio/features/onboarding/use-identity-form';
import { notify } from '@/studio/ui/primitives/Toast';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = new Set(['image/jpeg', 'image/png']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'username atau URL' },
  { key: 'facebook', label: 'Facebook', placeholder: 'nama halaman atau URL' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'username atau URL' },
] as const;

export type SocialKey = typeof SOCIAL_FIELDS[number]['key'];

export interface IdentityFormValues {
  name: string;
  tagline: string;
  logoUrl: string;
  whatsapp: string;
  phone: string;
  email: string;
  social: Record<SocialKey, string>;
  /** Catatan jam operasional (`opening_hours.note`). */
  openingNote: string;
}

function socialValue(website: WebsiteDto | undefined, key: SocialKey): string {
  const value = website?.social_links?.[key];
  return typeof value === 'string' ? value : '';
}

function openingNoteOf(website: WebsiteDto | undefined): string {
  const note = website?.opening_hours?.note;
  return typeof note === 'string' ? note : '';
}

function fromWebsite(website: WebsiteDto | undefined): IdentityFormValues {
  return {
    name: website?.name ?? '',
    tagline: website?.tagline ?? '',
    logoUrl: website?.logo_url ?? '',
    whatsapp: website?.whatsapp ?? '',
    phone: website?.phone ?? '',
    email: website?.email ?? '',
    social: { instagram: socialValue(website, 'instagram'), facebook: socialValue(website, 'facebook'), tiktok: socialValue(website, 'tiktok') },
    openingNote: openingNoteOf(website),
  };
}

export interface IdentityErrors {
  name?: string;
  whatsapp?: string;
  email?: string;
}

export function validateIdentity(values: IdentityFormValues): IdentityErrors {
  const errors: IdentityErrors = {};
  if (!values.name.trim()) errors.name = 'Nama website wajib diisi.';
  const wa = normalizeWhatsapp(values.whatsapp);
  if (values.whatsapp.trim() && (wa.length < 9 || wa.length > 15)) errors.whatsapp = 'Nomor WhatsApp tidak valid (9–15 angka).';
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Format email tidak valid.';
  return errors;
}

/** State form Identitas: dirty check, unggah logo, dan simpan lewat PATCH website (owner saja). */
export function useIdentityEditor(website: WebsiteDto | undefined, onSaved: (id: string, patch: Partial<WebsiteDto>) => void) {
  const [values, setValues] = useState<IdentityFormValues>(() => fromWebsite(website));
  const [saved, setSaved] = useState<IdentityFormValues>(() => fromWebsite(website));
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const next = fromWebsite(website);
    setValues(next);
    setSaved(next);
    setShowErrors(false);
    setLogoError(null);
    // Muat ulang hanya saat website/nilai tersimpan di store berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [website?.id, website?.updated_at, website?.name, website?.logo_url, website?.tagline, website?.whatsapp, website?.phone, website?.email, website?.social_links, website?.opening_hours]);

  const isDirty = JSON.stringify(values) !== JSON.stringify(saved);
  const errors = validateIdentity(values);

  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const setField = <K extends keyof Omit<IdentityFormValues, 'social'>>(key: K, value: IdentityFormValues[K]): void =>
    setValues((current) => ({ ...current, [key]: value }));
  const setSocial = (key: SocialKey, value: string): void =>
    setValues((current) => ({ ...current, social: { ...current.social, [key]: value } }));

  const pickLogo = async (file: File): Promise<void> => {
    setLogoError(null);
    if (!LOGO_TYPES.has(file.type)) return setLogoError('Format logo harus PNG atau JPG.');
    if (file.size > MAX_LOGO_BYTES) return setLogoError('Ukuran logo maksimal 2 MB.');
    setLogoUploading(true);
    try {
      setField('logoUrl', await uploadLogo(file));
    } catch (err) {
      setLogoError(errorMessage(err, 'Logo gagal diunggah.'));
    } finally {
      setLogoUploading(false);
    }
  };

  const save = async (): Promise<void> => {
    if (!website || !isDirty || saving) return;
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    const social_links: Record<string, unknown> = { ...(website.social_links ?? {}) };
    for (const { key } of SOCIAL_FIELDS) {
      const value = values.social[key].trim();
      if (value) social_links[key] = value;
      else delete social_links[key];
    }
    // Pertahankan kunci lain di opening_hours; hanya `note` yang diedit di sini.
    const opening_hours: Record<string, unknown> = { ...(website.opening_hours ?? {}) };
    const note = values.openingNote.trim();
    if (note) opening_hours.note = note;
    else delete opening_hours.note;
    setSaving(true);
    try {
      const result = await updateWebsiteIdentity(website.id, {
        name: values.name.trim(),
        tagline: values.tagline.trim() || null,
        logo_url: values.logoUrl.trim() || null,
        whatsapp: values.whatsapp.trim() ? normalizeWhatsapp(values.whatsapp) : null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        social_links,
        opening_hours,
      });
      onSaved(website.id, {
        name: result.name,
        tagline: result.tagline ?? null,
        logo_url: result.logo_url ?? null,
        whatsapp: result.whatsapp ?? null,
        phone: result.phone ?? null,
        email: result.email ?? null,
        social_links: result.social_links ?? social_links,
        opening_hours: result.opening_hours ?? opening_hours,
        updated_at: result.updated_at,
      });
      notify.success('Identitas website tersimpan.');
    } catch (err) {
      notify.error(
        'Gagal menyimpan identitas.',
        isApiError(err) && err.status === 403 ? 'Hanya owner website yang dapat mengubah identitas.' : errorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };

  return { values, setField, setSocial, isDirty, saving, errors: showErrors ? errors : {}, logoUploading, logoError, pickLogo, save };
}
