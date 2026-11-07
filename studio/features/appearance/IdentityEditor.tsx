'use client';

import { Button, Input, Textarea } from '@heroui/react';

import { LogoField } from '@/studio/features/onboarding/LogoField';
import { hasMinRole } from '@/studio/lib/roles';
import { useActiveRole, useActiveWebsite, useWebsiteStore } from '@/studio/stores/website-store';

import { SOCIAL_FIELDS, useIdentityEditor } from './use-identity-editor';

const INPUT_CLASSES = { label: 'font-semibold text-default-700' } as const;

/** Tab "Identitas": nama, logo, tagline, kontak, dan media sosial. Hanya owner yang boleh menyimpan. */
export function IdentityEditor() {
  const websiteEntry = useActiveWebsite();
  const role = useActiveRole();
  const patchWebsite = useWebsiteStore((state) => state.patchWebsite);
  const website = websiteEntry?.website;
  const canEdit = hasMinRole(role, 'owner');
  const form = useIdentityEditor(website, patchWebsite);

  if (!website) {
    return <div className="rounded-[14px] border border-default-200 bg-white p-6 text-sm text-default-600">Pilih website untuk mengatur identitas.</div>;
  }

  const { values, errors } = form;
  const readOnly = !canEdit;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-[14px] border border-default-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">Identitas</h2>
            <p className="mt-1 text-sm text-default-600">Nama, logo, dan kontak bisnis yang tampil di website dan footer.</p>
          </div>
          <Button color="primary" isDisabled={readOnly || !form.isDirty || form.saving || form.logoUploading} isLoading={form.saving} onPress={() => void form.save()}>
            Simpan perubahan
          </Button>
        </div>
        {readOnly && (
          <p className="mt-3 rounded-[10px] bg-warning-50 px-3 py-2 text-xs text-warning-700">
            Hanya owner website yang dapat mengubah identitas.
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <LogoField
              variant="settings"
              disabled={readOnly}
              logoUrl={values.logoUrl || null}
              uploading={form.logoUploading}
              error={form.logoError}
              onPick={(file) => void form.pickLogo(file)}
              onRemove={() => form.setField('logoUrl', '')}
            />
          </div>

          <Input
            label="Nama website"
            labelPlacement="outside"
            placeholder="Nama bisnis kamu"
            classNames={INPUT_CLASSES}
            value={values.name}
            maxLength={255}
            isRequired
            isReadOnly={readOnly}
            isInvalid={Boolean(errors.name)}
            errorMessage={errors.name}
            onValueChange={(value) => form.setField('name', value)}
          />
          <Input
            label="Tagline"
            labelPlacement="outside"
            placeholder="Premium Barbershop sejak 2020"
            classNames={INPUT_CLASSES}
            value={values.tagline}
            maxLength={500}
            isReadOnly={readOnly}
            onValueChange={(value) => form.setField('tagline', value)}
          />
        </div>
      </section>

      <section className="rounded-[14px] border border-default-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-bold text-foreground">Kontak</h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Input
            label="WhatsApp"
            labelPlacement="outside"
            placeholder="081234567890"
            description="Format 08… otomatis menjadi 628…"
            classNames={INPUT_CLASSES}
            inputMode="tel"
            value={values.whatsapp}
            isReadOnly={readOnly}
            isInvalid={Boolean(errors.whatsapp)}
            errorMessage={errors.whatsapp}
            onValueChange={(value) => form.setField('whatsapp', value)}
          />
          <Input
            label="Telepon"
            labelPlacement="outside"
            placeholder="+62 812 3456 7890"
            classNames={INPUT_CLASSES}
            inputMode="tel"
            value={values.phone}
            maxLength={50}
            isReadOnly={readOnly}
            onValueChange={(value) => form.setField('phone', value)}
          />
          <Input
            className="sm:col-span-2"
            label="Email"
            labelPlacement="outside"
            type="email"
            placeholder="halo@bisnis.com"
            classNames={INPUT_CLASSES}
            value={values.email}
            maxLength={320}
            isReadOnly={readOnly}
            isInvalid={Boolean(errors.email)}
            errorMessage={errors.email}
            onValueChange={(value) => form.setField('email', value)}
          />
        </div>
      </section>

      <section className="rounded-[14px] border border-default-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-bold text-foreground">Jam operasional</h3>
        <Textarea
          className="mt-4"
          label="Keterangan jam buka"
          labelPlacement="outside"
          placeholder="Senin–Sabtu 09:00–21:00"
          description="Teks bebas yang tampil di website. Kosongkan untuk menyembunyikan."
          classNames={INPUT_CLASSES}
          minRows={2}
          maxLength={500}
          value={values.openingNote}
          isReadOnly={readOnly}
          onValueChange={(value) => form.setField('openingNote', value)}
        />
      </section>

      <section className="rounded-[14px] border border-default-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-bold text-foreground">Media sosial</h3>
        <p className="mt-1 text-xs text-default-500">Tampil di blok media sosial pada footer. Kosongkan untuk menyembunyikan.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {SOCIAL_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              labelPlacement="outside"
              placeholder={field.placeholder}
              classNames={INPUT_CLASSES}
              value={values.social[field.key]}
              isReadOnly={readOnly}
              onValueChange={(value) => form.setSocial(field.key, value)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
