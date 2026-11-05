'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';

import { fetchPages, updatePage, type WebsitePage } from '@/studio/api/pages';
import { updateWebsiteFooterSettings } from '@/studio/api/websites';
import type { WebsiteFooterBlockDto, WebsiteFooterBlockType, WebsiteFooterSettingsDto } from '@/studio/api/types';
import { notify } from '@/studio/ui/primitives/Toast';
import { Icon } from '@/studio/ui/icons';
import { useActiveRole, useActiveWebsite, useWebsiteStore } from '@/studio/stores/website-store';
import { hasMinRole } from '@/studio/lib/roles';

const BLOCK_TYPES: Array<{ type: WebsiteFooterBlockType; label: string; description: string }> = [
  { type: 'brand', label: 'Identitas bisnis', description: 'Logo, nama bisnis, dan tagline' },
  { type: 'page_links', label: 'Navigasi halaman', description: 'Tautan halaman yang ditandai untuk footer' },
  { type: 'contact', label: 'Informasi kontak', description: 'Alamat, WhatsApp, telepon, dan email' },
  { type: 'social_links', label: 'Media sosial', description: 'Tautan sosial yang tersimpan di profil website' },
  { type: 'text', label: 'Teks tambahan', description: 'Kolom teks dengan judul dan isi bebas' },
  { type: 'copyright', label: 'Hak cipta', description: 'Baris hak cipta di bagian bawah footer' },
];

const PAGE_PLACEMENT_OPTIONS = [
  { value: 'regular', label: 'Tidak di navigasi' },
  { value: 'header', label: 'Navigasi header' },
  { value: 'footer', label: 'Navigasi footer' },
] as const;

function isBlockType(value: unknown): value is WebsiteFooterBlockType {
  return BLOCK_TYPES.some((item) => item.type === value);
}

function normalizeBlocks(value: unknown): WebsiteFooterBlockDto[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const rawBlocks = (value as { blocks?: unknown }).blocks;
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const block = raw as Record<string, unknown>;
    if (!isBlockType(block.type)) return [];
    const content = block.content && typeof block.content === 'object' && !Array.isArray(block.content)
      ? block.content as Record<string, unknown>
      : {};
    return [{
      id: typeof block.id === 'string' && block.id ? block.id : `footer-block-${index}`,
      type: block.type,
      content,
    }];
  });
}

function createBlock(type: WebsiteFooterBlockType): WebsiteFooterBlockDto {
  const content: Record<string, unknown> = {
    brand: { show_logo: true, show_business_name: true, show_tagline: true },
    page_links: { title: 'Navigasi' },
    contact: { title: 'Kontak', show_address: true, show_whatsapp: true, show_phone: true, show_email: true },
    social_links: { title: 'Ikuti Kami' },
    text: { title: '', body: '' },
    copyright: { text: '' },
  }[type];
  return { id: crypto.randomUUID(), type, content };
}

function stringValue(content: Record<string, unknown>, key: string): string {
  return typeof content[key] === 'string' ? content[key] as string : '';
}

function SwitchField({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[10px] border border-default-200 px-3 py-2.5 text-sm text-default-700">
      <span>{label}</span>
      <Switch size="sm" isSelected={checked} onValueChange={onChange} aria-label={label} isDisabled={disabled} />
    </label>
  );
}

export function FooterEditor() {
  const website = useActiveWebsite();
  const role = useActiveRole();
  const patchWebsite = useWebsiteStore((state) => state.patchWebsite);
  const websiteId = website?.website.id;
  const [blocks, setBlocks] = useState<WebsiteFooterBlockDto[]>(() => normalizeBlocks(website?.website.footer_settings));
  const [savedBlocks, setSavedBlocks] = useState<WebsiteFooterBlockDto[]>(() => normalizeBlocks(website?.website.footer_settings));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [updatingPageId, setUpdatingPageId] = useState<string | null>(null);

  const canSaveSettings = hasMinRole(role, 'admin');
  const canEditPages = hasMinRole(role, 'editor');
  const isDirty = JSON.stringify(blocks) !== JSON.stringify(savedBlocks);
  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? null;

  useEffect(() => {
    const nextBlocks = normalizeBlocks(website?.website.footer_settings);
    setBlocks(nextBlocks);
    setSavedBlocks(nextBlocks);
    setSelectedId(nextBlocks[0]?.id ?? null);
  }, [website?.website.id, website?.website.footer_settings]);

  const loadPages = useCallback(async () => {
    if (!websiteId) {
      setPages([]);
      setPagesLoading(false);
      setPagesError(null);
      return;
    }
    setPagesLoading(true);
    setPagesError(null);
    try {
      setPages(await fetchPages(websiteId));
    } catch {
      setPagesError('Daftar halaman gagal dimuat.');
    } finally {
      setPagesLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const addBlock = (type: WebsiteFooterBlockType) => {
    const block = createBlock(type);
    setBlocks((current) => [...current, block]);
    setSelectedId(block.id);
  };

  const updateSelectedContent = (key: string, value: string | boolean) => {
    if (!selectedBlock) return;
    setBlocks((current) => current.map((block) => (
      block.id === selectedBlock.id
        ? { ...block, content: { ...block.content, [key]: value } }
        : block
    )));
  };

  const moveBlock = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= blocks.length) return;
    setBlocks((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeBlock = (blockId: string) => {
    const index = blocks.findIndex((block) => block.id === blockId);
    const next = blocks.filter((block) => block.id !== blockId);
    setBlocks(next);
    if (selectedId === blockId) setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
  };

  const save = async () => {
    if (!websiteId || !canSaveSettings || !isDirty || saving) return;
    setSaving(true);
    try {
      const payload: WebsiteFooterSettingsDto = { blocks };
      const saved = await updateWebsiteFooterSettings(websiteId, payload);
      const canonical = normalizeBlocks(saved.footer_settings ?? payload);
      setBlocks(canonical);
      setSavedBlocks(canonical);
      patchWebsite(websiteId, { footer_settings: { blocks: canonical } });
      notify.success('Pengaturan footer tersimpan.');
    } catch {
      notify.error('Gagal menyimpan footer. Perubahan belum disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const changePagePlacement = async (page: WebsitePage, placement: WebsitePage['placement']) => {
    if (!websiteId || !canEditPages || page.placement === placement || updatingPageId) return;
    setUpdatingPageId(page.id);
    try {
      const updated = await updatePage(websiteId, page.id, { placement });
      setPages((current) => current.map((item) => item.id === page.id ? updated : item));
      notify.success('Navigasi halaman diperbarui.');
    } catch {
      notify.error(`Gagal memperbarui navigasi "${page.title}".`);
    } finally {
      setUpdatingPageId(null);
    }
  };

  const selectedMeta = useMemo(
    () => selectedBlock ? BLOCK_TYPES.find((item) => item.type === selectedBlock.type) : null,
    [selectedBlock],
  );

  if (!website) {
    return <div className="rounded-[14px] border border-default-200 bg-white p-6 text-sm text-default-600">Pilih website untuk mengatur footer.</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-[14px] border border-default-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground">Editor Footer</h2>
            <p className="mt-1 max-w-2xl text-sm text-default-600">
              Susun blok yang tampil pada footer website <span className="font-semibold">{website.website.name}</span>.
              Data kontak, media sosial, logo, dan tagline diambil dari profil website.
            </p>
          </div>
          <Button
            color="primary"
            isDisabled={!canSaveSettings || !isDirty || saving}
            isLoading={saving}
            onPress={() => void save()}
          >
            Simpan perubahan
          </Button>
        </div>
        {!canSaveSettings && (
          <p className="mt-3 rounded-[10px] bg-warning-50 px-3 py-2 text-xs text-warning-700">
            Hanya admin atau pemilik yang dapat menyimpan pengaturan footer.
          </p>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Susunan blok</h3>
                <p className="text-xs text-default-500">{blocks.length} dari 12 blok</p>
              </div>
            </div>
            {blocks.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-default-300 px-4 py-8 text-center text-sm text-default-500">
                Footer belum memiliki blok. Tambahkan blok untuk mulai menyusun.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {blocks.map((block, index) => {
                  const meta = BLOCK_TYPES.find((item) => item.type === block.type)!;
                  return (
                    <div
                      key={block.id}
                      className={`flex items-center gap-2 rounded-[11px] border p-2 ${
                        selectedId === block.id ? 'border-primary-300 bg-primary-50/60' : 'border-default-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(block.id)}
                        className="min-w-0 flex-1 px-2 py-1 text-left"
                      >
                        <span className="block truncate text-sm font-semibold text-foreground">{meta.label}</span>
                        <span className="block truncate text-xs text-default-500">{meta.description}</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button isIconOnly size="sm" variant="light" aria-label={`Pindahkan ${meta.label} ke atas`} isDisabled={!canSaveSettings || index === 0} onPress={() => moveBlock(index, -1)}>
                          <span aria-hidden="true">↑</span>
                        </Button>
                        <Button isIconOnly size="sm" variant="light" aria-label={`Pindahkan ${meta.label} ke bawah`} isDisabled={!canSaveSettings || index === blocks.length - 1} onPress={() => moveBlock(index, 1)}>
                          <span aria-hidden="true">↓</span>
                        </Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" aria-label={`Hapus ${meta.label}`} isDisabled={!canSaveSettings} onPress={() => removeBlock(block.id)}>
                          <Icon name="trash" size={15} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="rounded-[12px] border border-default-100 bg-default-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-600">Tambah blok</p>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {BLOCK_TYPES.map((item) => {
                  const isCopyrightAlreadyAdded = item.type === 'copyright' && blocks.some((block) => block.type === 'copyright');
                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={!canSaveSettings || blocks.length >= 12 || isCopyrightAlreadyAdded}
                      onClick={() => addBlock(item.type)}
                      className="flex min-h-9 items-center gap-2 rounded-[8px] px-2 text-left text-xs font-medium text-default-700 transition-colors hover:bg-white hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Icon name="plus" size={13} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {blocks.length >= 12 && <p className="mt-2 text-xs text-warning-700">Batas maksimum 12 blok tercapai.</p>}
            </div>
          </div>

          <div className="min-h-[280px] rounded-[12px] border border-default-200 bg-default-50/70 p-4 sm:p-5">
            {selectedBlock && selectedMeta ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pengaturan blok</p>
                  <h3 className="mt-1 text-base font-bold text-foreground">{selectedMeta.label}</h3>
                  <p className="mt-1 text-sm text-default-600">{selectedMeta.description}</p>
                </div>

                {selectedBlock.type === 'brand' && (
                  <div className="flex flex-col gap-2">
                    <SwitchField label="Tampilkan logo" checked={selectedBlock.content.show_logo !== false} onChange={(value) => updateSelectedContent('show_logo', value)} disabled={!canSaveSettings} />
                    <SwitchField label="Tampilkan nama bisnis" checked={selectedBlock.content.show_business_name !== false} onChange={(value) => updateSelectedContent('show_business_name', value)} disabled={!canSaveSettings} />
                    <SwitchField label="Tampilkan tagline" checked={selectedBlock.content.show_tagline !== false} onChange={(value) => updateSelectedContent('show_tagline', value)} disabled={!canSaveSettings} />
                  </div>
                )}

                {(selectedBlock.type === 'page_links' || selectedBlock.type === 'contact' || selectedBlock.type === 'social_links') && (
                  <Input
                    label="Judul kolom"
                    labelPlacement="outside"
                    value={stringValue(selectedBlock.content, 'title')}
                    onValueChange={(value) => updateSelectedContent('title', value)}
                    placeholder={selectedBlock.type === 'page_links' ? 'Navigasi' : selectedBlock.type === 'contact' ? 'Kontak' : 'Ikuti Kami'}
                    variant="bordered"
                    isDisabled={!canSaveSettings}
                  />
                )}

                {selectedBlock.type === 'contact' && (
                  <div className="flex flex-col gap-2">
                    <SwitchField label="Alamat" checked={selectedBlock.content.show_address !== false} onChange={(value) => updateSelectedContent('show_address', value)} disabled={!canSaveSettings} />
                    <SwitchField label="WhatsApp" checked={selectedBlock.content.show_whatsapp !== false} onChange={(value) => updateSelectedContent('show_whatsapp', value)} disabled={!canSaveSettings} />
                    <SwitchField label="Telepon" checked={selectedBlock.content.show_phone !== false} onChange={(value) => updateSelectedContent('show_phone', value)} disabled={!canSaveSettings} />
                    <SwitchField label="Email" checked={selectedBlock.content.show_email !== false} onChange={(value) => updateSelectedContent('show_email', value)} disabled={!canSaveSettings} />
                  </div>
                )}

                {selectedBlock.type === 'text' && (
                  <>
                    <Input
                      label="Judul"
                      labelPlacement="outside"
                      value={stringValue(selectedBlock.content, 'title')}
                      onValueChange={(value) => updateSelectedContent('title', value)}
                      placeholder="Tentang kami"
                      variant="bordered"
                      isDisabled={!canSaveSettings}
                    />
                    <Textarea
                      label="Isi teks"
                      labelPlacement="outside"
                      value={stringValue(selectedBlock.content, 'body')}
                      onValueChange={(value) => updateSelectedContent('body', value)}
                      placeholder="Tulis informasi singkat untuk pengunjung."
                      minRows={4}
                      maxLength={2000}
                      variant="bordered"
                      isDisabled={!canSaveSettings}
                    />
                  </>
                )}

                {selectedBlock.type === 'copyright' && (
                  <Input
                    label="Teks hak cipta"
                    labelPlacement="outside"
                    value={stringValue(selectedBlock.content, 'text')}
                    onValueChange={(value) => updateSelectedContent('text', value)}
                    placeholder={`© ${new Date().getFullYear()} ${website.website.name}`}
                    description="Kosongkan untuk menggunakan teks otomatis berdasarkan nama bisnis."
                    variant="bordered"
                    isDisabled={!canSaveSettings}
                  />
                )}

                {selectedBlock.type === 'page_links' && (
                  <div className="rounded-[10px] border border-primary-100 bg-primary-50 px-3 py-2.5 text-xs leading-relaxed text-primary-800">
                    Tautan yang muncul di kolom ini diatur pada bagian Navigasi Footer di bawah.
                  </div>
                )}
                {selectedBlock.type === 'social_links' && (
                  <div className="rounded-[10px] border border-primary-100 bg-primary-50 px-3 py-2.5 text-xs leading-relaxed text-primary-800">
                    Tautan media sosial diambil dari profil website. Blok ini tersembunyi bila belum ada tautan sosial.
                  </div>
                )}
                {selectedBlock.type === 'contact' && (
                  <div className="rounded-[10px] border border-primary-100 bg-primary-50 px-3 py-2.5 text-xs leading-relaxed text-primary-800">
                    Informasi kontak diambil dari profil website. Baris yang datanya belum tersedia tidak akan ditampilkan.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-sm text-default-500">
                Pilih blok di sebelah kiri atau tambahkan blok baru untuk mengatur isinya.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[14px] border border-default-200 bg-white p-5 sm:p-6">
        <div>
          <h2 className="text-base font-bold text-foreground">Navigasi Footer</h2>
          <p className="mt-1 text-sm text-default-600">Pilih posisi setiap halaman. Hanya halaman dengan posisi “Navigasi footer” yang tampil pada blok tautan footer.</p>
        </div>
        {!canEditPages && (
          <p className="mt-3 rounded-[10px] bg-warning-50 px-3 py-2 text-xs text-warning-700">Peran editor atau lebih tinggi diperlukan untuk mengubah posisi halaman.</p>
        )}
        {pagesLoading ? (
          <div className="mt-4 rounded-[10px] bg-default-50 px-4 py-6 text-center text-sm text-default-500">Memuat daftar halaman…</div>
        ) : pagesError ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-danger-50 px-4 py-3 text-sm text-danger">
            <span>{pagesError}</span>
            <Button size="sm" variant="bordered" onPress={() => void loadPages()}>Coba lagi</Button>
          </div>
        ) : pages.length === 0 ? (
          <p className="mt-4 rounded-[10px] bg-default-50 px-4 py-6 text-center text-sm text-default-500">Belum ada halaman untuk ditambahkan ke navigasi.</p>
        ) : (
          <div className="mt-4 divide-y divide-default-100 rounded-[11px] border border-default-200">
            {pages.map((page) => (
              <div key={page.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{page.title}{page.is_home ? ' (Utama)' : ''}</p>
                  <p className="truncate text-xs text-default-500">/{page.slug}</p>
                </div>
                <Select
                  aria-label={`Posisi navigasi ${page.title}`}
                  selectedKeys={[page.placement]}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === 'regular' || value === 'header' || value === 'footer') {
                      void changePagePlacement(page, value);
                    }
                  }}
                  isDisabled={!canEditPages || updatingPageId !== null}
                  isLoading={updatingPageId === page.id}
                  className="w-full sm:max-w-[220px]"
                  size="sm"
                  variant="bordered"
                >
                  {PAGE_PLACEMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value}>{option.label}</SelectItem>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
