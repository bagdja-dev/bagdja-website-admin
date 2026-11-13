'use client';

import { Modal, ModalContent } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';

import { fetchTemplateManifest, fetchWebsiteTemplates, type TemplateManifestSection } from '@/studio/api/templates';
import type { ModuleKey } from '@/studio/api/types';
import { useModulesStore } from '@/studio/stores/modules-store';
import { Icon } from '@/studio/ui/icons';

import { SectionThumb, sectionThumbKind } from './SectionThumb';

/** Kategori skema section API → label tab (artboard "Tambah bagian"). */
const CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ['all', 'Semua'],
  ['opening', 'Pembuka'],
  ['story', 'Cerita & Konten'],
  ['sell', 'Jualan'],
  ['info', 'Info & Kontak'],
  ['blog', 'Blog'],
];

type SupportedSectionsState =
  | { status: 'loading' }
  | { status: 'ready'; templateId: string; types: Set<string> }
  | { status: 'error'; templateId: string | null; message: string };

/** Cache hanya hasil sukses; kegagalan harus dapat dicoba ulang. */
const supportedCache = new Map<string, Promise<Set<string>>>();

function loadSupportedTypes(templateId: string): Promise<Set<string>> {
  const cached = supportedCache.get(templateId);
  if (cached) return cached;
  const promise = fetchWebsiteTemplates()
    .then((templates) => {
      const slug = templates.find((template) => template.id === templateId)?.slug;
      if (!slug) throw new Error('Template aktif tidak ditemukan.');
      return fetchTemplateManifest(slug);
    })
    .then((manifest) => new Set(manifest.sections))
    .catch((error: unknown) => {
      supportedCache.delete(templateId);
      throw error;
    });
  supportedCache.set(templateId, promise);
  return promise;
}

export interface AddSectionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Katalog skema section (`GET /api/section-schemas`). */
  schemas: TemplateManifestSection[];
  /** Template aktif website; section yang tidak didukung template disembunyikan. */
  templateId: string | null;
  /** Type section yang sudah ada di halaman (untuk singleton seperti hero). */
  existingTypes: ReadonlySet<string>;
  /** Label section terpilih — penyisipan dilakukan setelahnya. */
  insertAfterLabel: string | null;
  busy?: boolean;
  onAdd: (type: string) => void;
}

/** Popup pemilih section (artboard Editor-Tambah-Bagian): cari, tab kategori, kartu dengan sketsa, kunci per modul. */
export function AddSectionDialog({ open, onClose, schemas, templateId, existingTypes, insertAfterLabel, busy, onAdd }: AddSectionDialogProps) {
  const hasModule = useModulesStore((s) => s.hasModule);
  const moduleLabel = useModulesStore((s) => s.moduleLabel);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [supported, setSupported] = useState<SupportedSectionsState>({ status: 'loading' });

  useEffect(() => {
    if (!open) return;
    setCategory('all');
    setQuery('');
    setPicked(null);
    if (!templateId) {
      setSupported({
        status: 'error',
        templateId: null,
        message: 'Template aktif tidak ditemukan. Muat ulang halaman lalu coba lagi.',
      });
      return;
    }
    let cancelled = false;
    setSupported({ status: 'loading' });
    void loadSupportedTypes(templateId)
      .then((types) => {
        if (!cancelled) setSupported({ status: 'ready', templateId, types });
      })
      .catch(() => {
        if (!cancelled) {
          setSupported({
            status: 'error',
            templateId,
            message: 'Dukungan section template gagal dimuat. Periksa koneksi lalu coba lagi.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, templateId, retryKey]);

  const supportReady = supported.status === 'ready' && supported.templateId === templateId;
  const supportError = supported.status === 'error' && supported.templateId === templateId;

  const items = useMemo(() => {
    if (!supportReady || supported.status !== 'ready') return [];
    const q = query.trim().toLowerCase();
    return schemas
      .filter((s) => supported.types.has(s.type))
      .filter((s) => category === 'all' || s.category === category)
      .filter((s) => !q || `${s.label} ${s.description ?? ''}`.toLowerCase().includes(q))
      .map((s) => {
        const missingModule = s.requiredModule && !hasModule(s.requiredModule as ModuleKey) ? s.requiredModule : null;
        const duplicate = Boolean(s.singleton) && existingTypes.has(s.type);
        return {
          schema: s,
          lockedReason: missingModule
            ? `Butuh fitur ${moduleLabel(missingModule as ModuleKey)} — aktifkan di menu Fitur`
            : duplicate
              ? 'Sudah ada di halaman ini'
              : null,
        };
      });
  }, [schemas, supported, supportReady, category, query, hasModule, moduleLabel, existingTypes]);

  const pickedSchema =
    supportReady && supported.status === 'ready' && picked && supported.types.has(picked)
      ? schemas.find((s) => s.type === picked) ?? null
      : null;

  return (
    <Modal isOpen={open} onClose={onClose} size="5xl" scrollBehavior="inside" hideCloseButton classNames={{ base: 'rounded-[20px]' }}>
      <ModalContent>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-3.5 pt-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl font-extrabold text-foreground">Tambah bagian</h2>
            <span className="text-[13px] text-default-600">
              {insertAfterLabel ? (
                <>Disisipkan setelah <strong className="text-foreground">{insertAfterLabel}</strong></>
              ) : (
                'Ditambahkan di akhir halaman'
              )}
            </span>
          </div>
          <div className="flex flex-[0_1_320px] items-center gap-2.5">
            <input
              type="search"
              aria-label="Cari bagian"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari: galeri, testimoni, harga…"
              className="w-full rounded-[10px] border border-default-300 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              aria-label="Tutup"
              onClick={onClose}
              className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-default-200 text-default-700 hover:bg-default-50"
            >
              <Icon name="close" size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="Kategori bagian" className="flex flex-wrap gap-1.5 border-b border-default-100 px-6 pb-3.5">
          {CATEGORIES.map(([key, label]) => {
            const on = category === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setCategory(key)}
                className={`min-h-[38px] rounded-full border px-3.5 text-[13px] ${
                  on ? 'border-primary-200 bg-primary-50 font-bold text-primary' : 'border-default-200 bg-white font-medium text-default-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid max-h-[60vh] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5 overflow-y-auto bg-default-50 px-6 py-[18px]">
          {!supportReady && !supportError && (
            <p role="status" className="col-span-full my-6 text-center text-sm text-default-600">
              Memuat section yang didukung template…
            </p>
          )}
          {supportError && supported.status === 'error' && (
            <div className="col-span-full my-6 flex flex-col items-center gap-3 text-center">
              <p role="alert" className="text-sm text-danger">{supported.message}</p>
              <button
                type="button"
                onClick={() => setRetryKey((key) => key + 1)}
                className="min-h-10 rounded-[10px] border border-default-300 bg-white px-4 text-sm font-semibold text-foreground hover:bg-default-50"
              >
                Coba lagi
              </button>
            </div>
          )}
          {supportReady && items.map(({ schema, lockedReason }) => {
            const on = !lockedReason && picked === schema.type;
            return (
              <button
                key={schema.type}
                type="button"
                aria-pressed={on}
                disabled={Boolean(lockedReason)}
                onClick={() => setPicked(schema.type)}
                onDoubleClick={() => !lockedReason && !busy && onAdd(schema.type)}
                className={`flex flex-col gap-2.5 rounded-[14px] bg-white text-left text-foreground ${
                  lockedReason
                    ? 'cursor-not-allowed border border-default-200 p-2.5 opacity-60'
                    : on
                      ? 'border-2 border-primary p-[9px] shadow-[0_6px_18px_rgba(122,30,72,0.15)]'
                      : 'border border-default-200 p-2.5 hover:border-default-300'
                }`}
              >
                <SectionThumb kind={sectionThumbKind(schema.type)} />
                <span className="flex flex-col gap-1 px-0.5">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold">{schema.label}</span>
                    {(schema.dataSource || schema.requiredModule) && (
                      <span className="rounded-full bg-primary-50 px-[7px] py-0.5 text-[11px] font-bold text-primary">Otomatis</span>
                    )}
                  </span>
                  {schema.description && <span className="text-xs leading-[1.45] text-default-600">{schema.description}</span>}
                  {lockedReason && <span className="text-xs font-semibold text-[#92400E]">{lockedReason}</span>}
                </span>
              </button>
            );
          })}
          {supportReady && items.length === 0 && (
            <p className="col-span-full my-6 text-center text-sm text-default-600">
              {query.trim() ? `Tidak ada bagian yang cocok dengan "${query.trim()}".` : 'Tidak ada bagian di kategori ini.'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default-200 px-6 py-3.5">
          <span className="text-[13px] text-default-600">{pickedSchema ? `Dipilih: ${pickedSchema.label}` : 'Pilih satu bagian'}</span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-[10px] border border-default-300 px-[18px] text-sm font-semibold text-foreground hover:bg-default-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!supportReady || !pickedSchema || busy}
              onClick={() => pickedSchema && onAdd(pickedSchema.type)}
              className="min-h-11 rounded-[10px] bg-primary px-5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? 'Menambahkan…' : 'Tambahkan'}
            </button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
