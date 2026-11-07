'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { deleteProduct } from '@/studio/api/products';
import { errorMessage } from '@/studio/api/client';
import { Icon } from '@/studio/ui/icons';
import { ListSkeleton } from '@/studio/ui/data-list';
import { useConfirm } from '@/studio/ui/primitives/ConfirmDialog';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';

import { CATALOG_PATH, FEATURES_PATH, editorHref, isProductTypeKey, isTypeModuleEnabled, ITEM_TYPES } from '../catalog-types';
import { variantLabelOf } from '../product-utils';
import { useModulesStore } from '@/studio/stores/modules-store';
import { completenessChecks, sectionComplete } from './completeness';
import { Notice, SectionCard } from './fields';
import { EditorTypeBar } from './EditorTypeBar';
import { PreviewPanel } from './PreviewPanel';
import { SaveResultPanel } from './SaveResultPanel';
import { SECTION_VIEWS } from './section-components';
import { SECTION_LABELS } from './section-registry';
import { useProductEditor } from './use-product-editor';
import { useUnsavedGuard } from './use-unsaved-guard';
import { sectionOfError } from './validate';

export interface ProductEditorProps {
  productId: string | null;
  initialType: string;
  /** D12: item Acara diedit di bawah area Gathering (`/studio/events/items/*`). */
  area: 'catalog' | 'events';
}

/** Editor item per bagian (artboard "17 · Produk dan Jasa — editor item", plan §3.12). */
export function ProductEditor({ productId, initialType, area }: ProductEditorProps) {
  const router = useRouter();
  const ed = useProductEditor({ productId, initialType });
  const { confirm, dialog } = useConfirm();
  const [activeSection, setActiveSection] = useState<string>('info');
  useUnsavedGuard(ed.dirty && !ed.saving, confirm);

  const loadedType = ed.data.item?.product.type;
  const wrongArea = loadedType !== undefined && (loadedType === 'gathering') !== (area === 'events');
  useEffect(() => {
    if (wrongArea && ed.data.item) router.replace(editorHref(ed.data.item.product));
  }, [ed.data.item, router, wrongArea]);

  const hasModule = useModulesStore((s) => s.hasModule);
  const byVariant = ed.byVariant;
  const checks = useMemo(() => completenessChecks(ed.form, ed.sections), [ed.form, ed.sections]);
  const backHref = area === 'events' ? `${CATALOG_PATH}?type=gathering` : CATALOG_PATH;
  const parent = ed.data.item?.parent ?? null;
  const variantLabel = parent && ed.saved
    ? variantLabelOf({ ...ed.saved, name: ed.form.name }, parent.name)
    : ed.form.name.trim();
  const title = parent ? variantLabel : ed.form.name.trim() || (ed.isNew ? 'Item baru' : 'Item');

  const remove = async () => {
    if (!ed.saved || !ed.websiteId) return;
    const variants = ed.data.item?.children.length ?? 0;
    const ok = await confirm({
      title: 'Hapus item ini?',
      description: `"${ed.saved.name}"${variants ? ` beserta ${variants} variannya` : ''} akan dihapus dari website dan tidak bisa dikembalikan.`,
      confirmLabel: 'Hapus',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteProduct(ed.websiteId, ed.saved.id);
      notify.success('Item dihapus.');
      router.push(backHref);
    } catch (err) {
      notify.error('Item gagal dihapus', errorMessage(err));
    }
  };

  const statusText = ed.saving ? 'Menyimpan…' : ed.dirty || ed.isNew ? 'Belum disimpan' : 'Tersimpan';
  const header = (
    <PageHeader
      title={title}
      titlePrefix={parent ? { label: parent.name, href: editorHref(parent) } : undefined}
      back={{ href: backHref, label: 'Produk dan Jasa' }}
      actions={
        <>
          <span className={`text-[13px] font-semibold ${ed.dirty || ed.isNew ? 'text-[#92400E]' : 'text-[#15803D]'}`} aria-live="polite">
            {statusText}
          </span>
          {ed.saved && ed.canDelete && (
            <button type="button" onClick={() => void remove()} className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-default-300 bg-white px-3 text-[13px] font-semibold text-[#B91C1C]">
              <Icon name="trash" size={14} /> Hapus
            </button>
          )}
          {ed.canEdit && (
            <button type="button" disabled={ed.saving} onClick={() => void ed.save()} className="min-h-10 rounded-[10px] bg-primary px-[18px] text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60">
              Simpan
            </button>
          )}
        </>
      }
    />
  );

  if (ed.data.status === 'not-found') {
    return <StatusScreen icon={<Icon name="search" size={28} />} title="Item tidak ditemukan" description="Item mungkin sudah dihapus." actions={[{ label: 'Kembali ke daftar', href: CATALOG_PATH }]} />;
  }
  if (ed.data.status === 'error') {
    return <StatusScreen icon={<Icon name="warning" size={28} />} title="Item gagal dimuat" description={ed.data.error ?? undefined} actions={[{ label: 'Kembali ke daftar', href: CATALOG_PATH }]} />;
  }
  if (ed.isNew && productId === null) {
    const t = ed.effectiveType;
    const allowed = isProductTypeKey(t) && ITEM_TYPES[t].creatable && (t === 'gathering') === (area === 'events');
    if (!allowed) {
      return <StatusScreen icon={<Icon name="catalog" size={28} />} title="Jenis item tidak tersedia" description="Jenis item ini belum bisa dibuat dari Studio." actions={[{ label: 'Kembali ke daftar', href: CATALOG_PATH }]} />;
    }
    if (!isTypeModuleEnabled(t, hasModule)) {
      const mod = ITEM_TYPES[t].module;
      return <StatusScreen icon={<Icon name="lock" size={28} />} title={`Aktifkan fitur ${mod ? ed.sectionProps?.moduleLabel(mod) ?? '' : ''} dulu`} description="Jenis item ini butuh fitur yang belum aktif di website kamu." actions={[{ label: 'Buka Fitur', href: FEATURES_PATH }, { label: 'Kembali ke daftar', href: CATALOG_PATH, variant: 'secondary' }]} />;
    }
  }
  if (ed.data.status === 'loading' || !ed.sectionProps || wrongArea) {
    return (
      <>
        {header}
        <ListSkeleton rows={6} />
      </>
    );
  }

  const props = ed.sectionProps;
  return (
    <>
      {header}
      <EditorTypeBar isNew={ed.isNew} area={area} type={ed.effectiveType} onChange={(type) => {
          ed.set({ type, requiresShipping: type === 'product' });
          window.history.replaceState(null, '', `/studio/catalog/new?type=${type}`);
        }} />
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-5 pb-16 lg:flex-row lg:items-start">
        <nav aria-label="Bagian form" className="-mx-3 flex gap-1 overflow-x-auto px-3 lg:sticky lg:top-24 lg:mx-0 lg:w-[200px] lg:shrink-0 lg:flex-col lg:overflow-visible lg:px-0">
          {ed.sections.map((id) => {
            const on = activeSection === id;
            const hasError = Object.keys(ed.errors).some((k) => sectionOfError(k) === id);
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setActiveSection(id)}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[9px] px-3 py-2 text-sm no-underline ${on ? 'bg-white font-bold text-foreground shadow-sm' : 'font-medium text-default-600 hover:bg-white/60'}`}
              >
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${hasError ? 'bg-danger' : id === 'advanced' ? 'bg-default-300' : sectionComplete(id, checks) ? 'bg-[#16A34A]' : 'bg-[#F59E0B]'}`} />
                {SECTION_LABELS[id]}
              </a>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {ed.results && <SaveResultPanel results={ed.results} onDismiss={ed.dismissResults} />}
          {!ed.canEdit && <Notice>Kamu hanya bisa melihat item ini. Mengubah item butuh role Editor.</Notice>}
          <fieldset disabled={!ed.canEdit || ed.saving} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
            {ed.sections.map((id) => {
              const view = SECTION_VIEWS[id];
              const label = id === 'variants' && !props.form.hasVariants ? 'Varian & stok' : id === 'advanced' ? 'Pengaturan lanjutan' : SECTION_LABELS[id];
              return (
                <SectionCard key={id} id={id} title={label} description={view.description} aside={view.Aside ? <view.Aside {...props} /> : undefined}>
                  <view.Body {...props} />
                </SectionCard>
              );
            })}
          </fieldset>
        </div>
        <aside aria-label="Pratinjau" className="flex w-full flex-col gap-3.5 lg:sticky lg:top-24 lg:w-[300px] lg:shrink-0">
          <PreviewPanel form={ed.form} byVariant={byVariant} checks={checks} onToggleActive={(isActive) => ed.set({ isActive })} canEdit={ed.canEdit} />
        </aside>
      </div>
      {dialog}
    </>
  );
}
