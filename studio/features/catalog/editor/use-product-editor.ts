'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CatalogProduct } from '@/studio/api/products';
import { hasMinRole } from '@/studio/lib/roles';
import { useModulesStore } from '@/studio/stores/modules-store';
import { useActiveRole, useActiveWebsiteId } from '@/studio/stores/website-store';
import { notify } from '@/studio/ui/primitives/Toast';

import { editorHref } from '../catalog-types';
import { variantAttributesOf } from '../product-utils';
import { buildProductPayload, slugifyProduct, usesVariantPricing } from './build-payload';
import type { FormErrors, SectionProps } from './editor-context';
import { emptyForm, formFromProduct, type ProductForm } from './form-state';
import { runStagedSave, type StepKey, type StepResult } from './save-runner';
import { sectionsFor } from './section-registry';
import { useEditorData, type LoadedItem } from './use-editor-data';
import { validateForm } from './validate';

export interface UseProductEditorOptions {
  productId: string | null;
  initialType: string;
}

export function useProductEditor({ productId, initialType }: UseProductEditorOptions) {
  const websiteId = useActiveWebsiteId();
  const role = useActiveRole();
  const hasModule = useModulesStore((s) => s.hasModule);
  const moduleLabel = useModulesStore((s) => s.moduleLabel);
  const canEdit = hasMinRole(role, 'editor');
  const canDelete = hasMinRole(role, 'admin');

  const [saved, setSaved] = useState<CatalogProduct | null>(null);
  const [knownChildren, setKnownChildren] = useState<CatalogProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(() => emptyForm(initialType));
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(emptyForm(initialType)));
  const [errors, setErrors] = useState<FormErrors>({});
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveType = saved?.type ?? form.type;
  const data = useEditorData(websiteId, productId, effectiveType);

  const applyLoaded = useCallback((loaded: LoadedItem) => {
    const next = formFromProduct(loaded);
    setSaved(loaded.product);
    setKnownChildren(loaded.children);
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, []);

  const loadedRef = useRef<LoadedItem | null>(null);
  useEffect(() => {
    if (data.item && data.item !== loadedRef.current) {
      loadedRef.current = data.item;
      applyLoaded(data.item);
    }
  }, [applyLoaded, data.item]);

  const set = useCallback((patch: Partial<ProductForm>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.name !== undefined && !prev.slugTouched) next.slug = slugifyProduct(patch.name);
      return next;
    });
  }, []);

  const parent = data.item?.parent ?? null;
  const sectionCtx = useMemo(
    () => ({ isChild: Boolean(saved?.parent_product_id), savedVariantCount: knownChildren.length }),
    [knownChildren.length, saved?.parent_product_id],
  );
  const sections = useMemo(() => sectionsFor(effectiveType, sectionCtx), [effectiveType, sectionCtx]);
  const attendeeUomId = data.lookups.uoms.find((u) => u.code === 'ATTENDEE')?.id ?? null;
  const dirty = JSON.stringify(form) !== baseline;

  const save = useCallback(async (): Promise<boolean> => {
    if (!websiteId || !canEdit || saving) return false;
    let filled = form.slug.trim() ? form : { ...form, slug: slugifyProduct(form.name) };
    // Item baru dengan slug otomatis: hindari bentrok slug (409) dengan menambah akhiran.
    if (!saved && !filled.slugTouched && data.allSlugs.includes(filled.slug)) {
      let n = 2;
      while (data.allSlugs.includes(`${filled.slug}-${n}`)) n += 1;
      filled = { ...filled, slug: `${filled.slug}-${n}` };
    }
    const nextErrors = validateForm(filled, {
      ...sectionCtx,
      attendeeUomMissing: effectiveType === 'gathering' && data.lookups.uoms.length > 0 && !attendeeUomId,
      gatheringOptionsBlocked: data.gatheringOptionsBlocked,
      assetLinksBlocked: data.assetLinksBlocked,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      notify.error('Periksa kembali isian', Object.values(nextErrors)[0]);
      return false;
    }
    if (filled !== form) setForm(filled);

    const steps: StepKey[] = ['product'];
    if (sections.includes('variants')) steps.push('variants');
    if (effectiveType === 'gathering') steps.push('options');
    if (effectiveType === 'digital') steps.push('assets');
    setResults(steps.map((key) => ({ key, label: '', status: 'pending' })));
    setSaving(true);

    let current = filled;
    const body = buildProductPayload(filled, { base: saved, ...sectionCtx, attendeeUomId });
    const outcome = await runStagedSave(
      { websiteId, form: filled, body, existing: saved, loadedChildren: knownChildren, allSlugs: data.allSlugs, steps },
      {
        onStep: (r) => setResults((prev) => (prev ?? []).map((x) => (x.key === r.key ? r : x))),
        onProductSaved: (p) => {
          setSaved((prev) => prev ?? p);
          if (!saved) window.history.replaceState(null, '', editorHref(p));
        },
        onVariantCreated: (draftKey, child) => {
          setKnownChildren((prev) => [...prev, child]);
          const name = current.variants.find((v) => v.key === draftKey)?.name ?? '';
          current = { ...current, variants: current.variants.map((v) => (v.key === draftKey ? { ...v, id: child.id, loadedName: name, loadedAttributes: variantAttributesOf(child) } : v)) };
          setForm(current);
        },
        onVariantDeleted: (id) => setKnownChildren((prev) => prev.filter((c) => c.id !== id)),
        onVariantError: (key, message) =>
          setErrors((prev) => {
            const next = { ...prev };
            const k = key.startsWith('delete:') ? 'variants' : `variant.${key}`;
            if (message) next[k] = message;
            else delete next[k];
            return next;
          }),
        onOptionsSaved: (options) => {
          const byKey = new Map(options.map((o) => [`${o.option_group_key}:${o.option_key}`, o]));
          current = {
            ...current,
            gatheringOptions: current.gatheringOptions.map((d) => {
              const match = [...byKey.values()].find((o) => o.id === d.id) ?? byKey.get(`${slugifyProduct(d.group)}:${d.optionKey ?? slugifyProduct(d.label)}`);
              return match ? { ...d, id: match.id, optionKey: match.option_key } : d;
            }),
          };
          setForm(current);
        },
      },
    );
    setSaving(false);

    if (outcome.ok && outcome.product) {
      const reloaded = await data.reload(outcome.product.id);
      if (reloaded) {
        loadedRef.current = reloaded;
        applyLoaded(reloaded);
      } else {
        setBaseline(JSON.stringify(current));
      }
      notify.success(saved ? 'Perubahan disimpan.' : 'Item dibuat.');
    } else if (outcome.product) {
      notify.warning('Sebagian belum tersimpan', 'Data item sudah tersimpan. Perbaiki langkah yang gagal lalu tekan Simpan lagi.');
    }
    return outcome.ok;
  }, [applyLoaded, attendeeUomId, canEdit, data, effectiveType, form, knownChildren, saved, saving, sectionCtx, sections, websiteId]);

  const sectionProps: SectionProps | null = websiteId
    ? { form, set, errors, lookups: data.lookups, websiteId, product: saved, parent, canEdit, canDelete, hasModule, moduleLabel, addCategory: data.addCategory }
    : null;

  return {
    websiteId,
    data,
    form,
    set,
    errors,
    sections,
    sectionProps,
    saved,
    isNew: saved === null,
    dirty,
    saving,
    save,
    results,
    dismissResults: () => setResults(null),
    canEdit,
    canDelete,
    effectiveType,
    byVariant: usesVariantPricing(form, sectionCtx),
  };
}
