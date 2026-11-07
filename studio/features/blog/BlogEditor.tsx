'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem, Switch } from '@heroui/react';

import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { fetchBlogPosts, createBlogPost, updateBlogPost, type WebsiteBlogPost } from '@/studio/api/blog-posts';
import { fetchProducts, type WebsiteProduct } from '@/studio/api/products';
import { RichTextEditor } from '@/studio/ui/rich-text-editor';
import { Icon } from '@/studio/ui/icons';
import { notify } from '@/studio/ui/primitives/Toast';
import { uploadAsset } from '@/studio/lib/upload-asset';
import { slugify } from '@/app/lib/api-client';

export interface BlogEditorProps {
  isNew: boolean;
  postId: string | null;
}

export function BlogEditor({ isNew, postId }: BlogEditorProps) {
  const websiteId = useActiveWebsiteId();
  const [post, setPost] = useState<WebsiteBlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Form state.
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);

  // Product picker state.
  const [products, setProducts] = useState<WebsiteProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  useEffect(() => {
    if (!websiteId) return;
    setLoading(true);
    if (isNew) {
      setPost(null);
      setLoading(false);
      titleRef.current?.focus();
      return;
    }
    (async () => {
      try {
        const all = await fetchBlogPosts(websiteId);
        const found = all.find((p) => p.id === postId);
        if (!found) {
          notify.error('Artikel tidak ditemukan.');
          return;
        }
        setPost(found);
        setTitle(found.title);
        setSlug(found.slug);
        setExcerpt(found.excerpt ?? '');
        setContent(found.content ?? '');
        setCoverImage(found.cover_image ?? null);
        setIsPublished(found.is_published);
        setRelatedIds((found.related_product_ids ?? []).filter(Boolean));
      } catch {
        notify.error('Gagal memuat artikel.');
      } finally {
        setLoading(false);
      }
    })();
  }, [websiteId, isNew, postId]);

  const slugFromTitle = useCallback((t: string) => slugify(t), []);

  useEffect(() => {
    if (!post) return;
    const derived = slugFromTitle(title);
    if (title && (!slug || slug === slugFromTitle(post.title))) {
      setSlug(derived);
    }
  }, [title, slug, post, slugFromTitle]);

  const loadProducts = useCallback(async () => {
    if (!websiteId) return;
    setProductsLoading(true);
    try {
      const data = await fetchProducts(websiteId);
      setProducts(data);
    } catch {
      notify.error('Gagal memuat daftar produk.');
    } finally {
      setProductsLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    if (!isNew && post?.id) void loadProducts();
  }, [isNew, loadProducts, post?.id]);

  const canAdd = relatedIds.length < 3;

  const toggleRelatedProduct = useCallback(
    (productId: string) => {
      setRelatedIds((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
      setDirty(true);
      setProductPickerOpen(false);
    },
    [],
  );

  const removeRelatedProduct = useCallback((productId: string) => {
    setRelatedIds((prev) => prev.filter((id) => id !== productId));
    setDirty(true);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    return products.filter((p) => p.is_active && p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const handleSave = useCallback(
    async (publish: boolean) => {
      if (!websiteId) return;
      if (!title.trim()) {
        notify.error('Judul wajib diisi.');
        return;
      }
      if (!slug.trim()) {
        notify.error('Slug wajib diisi.');
        return;
      }
      setSaving(true);
      try {
        let saved: WebsiteBlogPost;
        if (isNew) {
          saved = await createBlogPost(websiteId, {
            title: title.trim(),
            slug: slug.trim(),
            excerpt: excerpt.trim() || null,
            content: content.trim() || null,
            cover_image: coverImage,
            is_published: publish,
            related_product_ids: relatedIds,
          });
          notify.success(publish ? 'Artikel diterbitkan.' : 'Draft disimpan.');
        } else {
          saved = await updateBlogPost(websiteId, post!.id, {
            title: title.trim(),
            slug: slug.trim(),
            excerpt: excerpt.trim() || null,
            content: content.trim() || null,
            cover_image: coverImage,
            is_published: publish,
            related_product_ids: relatedIds,
          });
          notify.success(publish ? 'Artikel diperbarui & diterbitkan.' : 'Perubahan disimpan.');
        }
        setPost(saved);
        setSlug(saved.slug);
        setIsPublished(saved.is_published);
        setRelatedIds(saved.related_product_ids ?? []);
        setDirty(false);
      } catch (err: any) {
        notify.error(err?.message ?? 'Gagal menyimpan artikel.');
      } finally {
        setSaving(false);
      }
    },
    [websiteId, isNew, post, title, slug, excerpt, content, coverImage, relatedIds],
  );

  const handleCoverUpload = async (file: File) => {
    if (!websiteId) {
      setCoverUploadError('Pilih website aktif sebelum mengunggah sampul.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setCoverUploadError('Pilih file gambar untuk sampul artikel.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCoverUploadError('Ukuran gambar sampul maksimal 5 MB.');
      return;
    }

    setCoverUploading(true);
    setCoverUploadError(null);
    try {
      const data = await uploadAsset(file, websiteId, 'content');
      setCoverImage(data.url);
      setDirty(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengunggah sampul.';
      setCoverUploadError(message);
      notify.error(message);
    } finally {
      setCoverUploading(false);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center">Memuat…</div>;

  const isEdit = !isNew && post;
  const saveLabel = isPublished ? (isEdit ? 'Jadikan draft' : 'Terbitkan') : (isEdit ? 'Perbarui' : 'Simpan draft');

  const rightPanel = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="hidden text-[12px] font-semibold uppercase tracking-wider text-default-600 lg:inline">Pengaturan artikel</span>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-foreground">Alamat artikel (slug)</label>
          <Input value={slug} size="sm" className="text-default-600" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-foreground">Ringkasan</label>
          <TextareaCounter
            value={excerpt}
            onChange={(v) => { setExcerpt(v); setDirty(true); }}
            max={160}
          />
          <p className="text-[11px] text-default-500">Maks. 160 karakter (hanya petunjuk, tidak diblokir).</p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-medium text-foreground">Pratinjau di Google</label>
          <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-blue-600 truncate">https://websiteku.com/blog/{slug}</div>
            <div className="text-lg font-bold text-foreground mt-1 truncate md:max-w-[360px]">{title || 'Judul artikel'}</div>
            <div className="text-[13px] text-default-600 mt-1.5 truncate md:max-w-[360px]">{excerpt || 'Ringkasan artikel akan ditampilkan di sini.'}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-[12px] font-semibold text-default-600 uppercase tracking-wider">Sampul artikel (opsional)</label>
          {coverImage ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL gambar dari storage service */}
              <img src={coverImage} alt="Sampul artikel" className="w-full h-40 object-cover rounded-[12px] border border-default-200 bg-default-50" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCoverImage(null);
                  setDirty(true);
                  setCoverUploadError(null);
                }}
                disabled={coverUploading}
                className="absolute top-1 right-1 rounded-full bg-red-600 text-white p-1 hover:bg-red-700 transition-colors"
                title="Hapus sampul"
              >
                <Icon name="trash" size={12} strokeWidth={1.4} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverFileRef.current?.click()}
              disabled={coverUploading}
              className="w-full h-40 rounded-[12px] border-2 border-dashed border-default-300 bg-white flex flex-col items-center justify-center gap-1.5 hover:border-default-400 hover:bg-default-50 transition-colors disabled:cursor-wait disabled:opacity-70"
            >
              <span className="text-lg">🖼️</span>
              <span className="text-[11px] font-medium text-default-600">
                {coverUploading ? 'Mengunggah sampul…' : 'Tambah gambar sampul'}
              </span>
              {!coverUploading && <span className="text-[10px] text-default-400">Klik untuk mengunggah</span>}
            </button>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            ref={coverFileRef}
            disabled={coverUploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleCoverUpload(f);
              e.currentTarget.value = '';
            }}
          />
        </div>
        {coverUploadError && <p role="alert" className="text-xs font-medium text-danger">{coverUploadError}</p>}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <label className="text-[12px] font-medium text-foreground">Produk terkait (maks. 3)</label>
              <p className="text-[11px] text-default-500">Urutkan produk yang akan menjadi CTA di artikel.</p>
            </div>
            <Button
              size="sm"
              variant="bordered"
              color="primary"
              className="shrink-0"
              isDisabled={!canAdd || productsLoading}
              onPress={() => {
                if (products.length === 0) void loadProducts();
                setProductPickerOpen(true);
              }}
            >
              + Pilih Produk
            </Button>
          </div>
          {relatedIds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-default-300 px-4 py-6 text-center text-sm text-default-400">
              Belum ada produk terkait.
            </div>
          ) : (
            <ul className="divide-y divide-default-100 overflow-hidden rounded-xl border border-default-200">
              {relatedIds.map((productId, index) => {
                const product = products.find((item) => item.id === productId);
                const productImage = product?.images?.find(Boolean) ?? product?.cover_image;
                return (
                  <li key={productId} className="flex items-center gap-3 px-3 py-2.5">
                    {productImage ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL gambar produk dari storage service
                      <img src={productImage} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-default-100 text-lg">
                        🛍️
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-left">{product?.name ?? 'Produk tidak tersedia'}</span>
                    <span className="text-xs text-default-400">{index + 1}</span>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-danger-600 transition-colors hover:bg-danger-50"
                      onClick={() => removeRelatedProduct(productId)}
                      aria-label={`Hapus ${product?.name ?? 'produk terkait'}`}
                      title="Hapus produk terkait"
                    >
                      <Icon name="trash" size={16} strokeWidth={1.7} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Switch isSelected={isPublished} onValueChange={setIsPublished} />
          <span className="text-[13px] text-default-600">Terbitkan artikel ini</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-default-50">
      <header className="border-b border-default-200 bg-white sticky top-0 z-10 px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="light" radius="sm" className="min-h-10 text-[13px] font-semibold" onPress={() => window.history.back()}>
            Kembali
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold ${
            isPublished ? 'bg-success-50 text-success border border-success-100' : 'bg-default-50 text-default-500 border border-default-200'
          }`}>
            {isPublished ? 'Terbit' : 'Draft'}
          </span>
          {dirty && <span className="px-2 py-1 rounded-[8px] bg-warning-50 text-warning-700 border border-warning-100 text-[11px] font-semibold">Tersimpan sementara</span>}
          <div className="flex items-center gap-2">
            <Button color="primary" radius="sm" className="min-h-10 px-4 text-[13px] font-bold" disabled={saving || !title.trim() || !slug.trim()} onPress={() => void handleSave(!isPublished)}>
              {saveLabel}
            </Button>
            <button
              type="button"
              onClick={() => setRightPanelOpen(true)}
              aria-label="Pengaturan artikel"
              title="Pengaturan artikel"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-default-300 bg-white text-default-700 hover:bg-default-50 lg:hidden"
            >
              <Icon name="settings" size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="flex h-full overflow-y-auto">
          <main className="w-full max-w-[740px] flex-1 border-r border-default-200 bg-white p-6 lg:p-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Input
                  ref={titleRef}
                  value={title}
                  onValueChange={(v) => {
                    setTitle(v);
                    setDirty(true);
                  }}
                  placeholder="Judul artikel"
                  className="text-2xl font-bold"
                  size="lg"
                />
                <Input
                  value={slug}
                  onValueChange={(v) => {
                    setSlug(v);
                    setDirty(true);
                  }}
                  placeholder="slug-artikel"
                  className="text-sm text-default-600 bg-default-50"
                  size="sm"
                />
                {slug && slug !== slugFromTitle(title) && (
                  <p className="text-[11px] text-warning-700">Slug diubah manual — periksa kembali tautan artikel yang sudah terbit.</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <RichTextEditor
                  label="Isi artikel"
                  value={content}
                  onChange={setContent}
                  websiteId={websiteId ?? undefined}
                  uploadFolder="content"
                />
              </div>
            </div>
          </main>

          {/* Right panel (desktop): hidden on mobile, opened via "Pengaturan" drawer. */}
          <aside className="w-full max-w-[360px] border-l border-default-200 bg-white p-6 lg:p-8 hidden lg:block">
            {rightPanel}
          </aside>
        </div>
      </div>

      {/* Right-side settings panel (mobile). */}
      <Drawer
        isOpen={rightPanelOpen}
        onOpenChange={setRightPanelOpen}
        placement="right"
        size="md"
        hideCloseButton
        classNames={{
          base: 'h-[100dvh] w-[min(100vw,440px)] max-w-none rounded-l-2xl rounded-r-none shadow-[-16px_0_40px_rgba(24,24,27,0.18)]',
        }}
      >
        <DrawerContent>
          <DrawerHeader className="shrink-0 border-b border-default-100 px-4 py-3">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">Pengaturan artikel</span>
              <button
                type="button"
                onClick={() => setRightPanelOpen(false)}
                aria-label="Tutup pengaturan artikel"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-default-200 bg-white text-foreground hover:bg-default-50"
              >
                <Icon name="close" size={18} strokeWidth={2} />
              </button>
            </div>
          </DrawerHeader>
          <DrawerBody className="min-h-0 overscroll-contain p-0">
            <div className="min-w-0 space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
              {rightPanel}
            </div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Product picker modal */}
      <Modal isOpen={productPickerOpen} onOpenChange={setProductPickerOpen}>
        <ModalContent>
          <ModalHeader>Pilih Produk</ModalHeader>
          <ModalBody className="p-0 flex flex-col gap-3">
            <div className="flex flex-col gap-2 px-4 py-3">
              <label className="text-[12px] font-medium text-default-600">Cari produk</label>
              <Input
                value={productSearch}
                onValueChange={setProductSearch}
                placeholder="Cari nama produk…"
                size="sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-3">
              {productsLoading ? (
                <div className="flex h-32 items-center justify-center text-default-500 text-sm">Memuat produk…</div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-default-500 text-sm">
                  {productSearch ? 'Tidak ada produk yang cocok.' : 'Belum ada produk.'}
                </div>
              ) : (
                <ul className="w-full divide-y divide-default-100">
                  {filteredProducts.map((p) => {
                    const already = relatedIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={already || !canAdd}
                        onClick={() => void toggleRelatedProduct(p.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-[10px] transition-colors ${
                          already || !canAdd
                            ? 'bg-default-50 text-default-300 pointer-events-none'
                            : 'bg-white border border-default-200 hover:bg-primary-50 hover:text-primary'
                        }`}
                      >
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-default-100 text-lg">
                            🛍️
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate text-left">{p.name}</div>
                          <div className="text-[11px] text-default-500 truncate text-left">{p.slug}</div>
                        </div>
                        {already && (
                          <span className="text-xs font-semibold text-success">Terpilih</span>
                        )}
                      </button>
                    );
                  })}
                </ul>
              )}
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-default-100 px-4 py-3 flex justify-end gap-2">
            <Button variant="bordered" radius="sm" size="sm" onPress={() => setProductPickerOpen(false)}>
              Batal
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function TextareaCounter({ value, onChange, max }: { value: string; onChange: (v: string) => void; max: number }) {
  const [count, setCount] = useState(value.length);
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setCount(v.length);
          onChange(v);
        }}
        rows={3}
        className="w-full border border-default-300 rounded-[10px] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        placeholder="Ringkasan singkat artikel…"
      />
      <span className={`absolute right-3.5 bottom-2.5 text-[11px] ${count > max ? 'text-danger' : 'text-default-500'}`}>
        {count}/{max}
      </span>
    </div>
  );
}
