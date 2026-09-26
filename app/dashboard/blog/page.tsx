'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../components/mobile-floating-action';
import { AppModal } from '../../components/app-modal';
import { useConfirmDialog } from '../../components/confirm-dialog';
import { CoverImageUpload } from '../../components/cover-image-upload';
import { FormInput, FormSwitch, FormTextarea } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { RichTextEditor } from '../../components/rich-text-editor';
import { apiClient, slugify } from '../../lib/api-client';
import { hasMinRole, type WebsiteBlogPost, type WebsiteProduct } from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

const STATUS_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'published', label: 'Terbit' },
  { key: 'draft', label: 'Draf' },
] as const;

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface BlogCardProps {
  post: WebsiteBlogPost;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (post: WebsiteBlogPost) => void;
  onDelete: (postId: string) => void;
}

function BlogCard({ post, canEdit, canDelete, onEdit, onDelete }: BlogCardProps) {
  const summary = post.excerpt?.trim() || stripHtml(post.content);
  const publishedLabel = formatDate(post.published_at);

  return (
    <Card className="group overflow-hidden border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900">
        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">📝</div>
        )}
        <div className="absolute left-3 top-3">
          <Chip
            size="sm"
            variant="flat"
            className={`border backdrop-blur-sm ${post.is_published ? 'border-emerald-300/40 bg-emerald-500/20' : 'border-white/20 bg-white/10'}`}
            classNames={{ content: `font-semibold text-[10px] ${post.is_published ? 'text-emerald-100' : 'text-white/80'}` }}
          >
            {post.is_published ? '● Terbit' : '○ Draf'}
          </Chip>
        </div>
      </div>

      <CardBody className="space-y-3 px-4 pb-4 pt-4 sm:px-5">
        <div>
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground sm:text-lg">
            {post.title}
          </h3>
          {publishedLabel && <p className="mt-1 text-xs text-default-400">Terbit {publishedLabel}</p>}
        </div>

        {summary && <p className="line-clamp-2 text-sm text-default-500">{summary}</p>}

        {(canEdit || canDelete) && (
          <div className="flex gap-2 border-t border-default-100 pt-3">
            {canEdit && (
              <Button size="sm" color="primary" variant="flat" className="flex-1 font-medium" onPress={() => onEdit(post)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button size="sm" color="danger" variant="light" className="flex-1" onPress={() => onDelete(post.id)}>
                Hapus
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function BlogManagement() {
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const { confirm, dialog } = useConfirmDialog();
  const [posts, setPosts] = useState<WebsiteBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [editPost, setEditPost] = useState<WebsiteBlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [relatedProductIds, setRelatedProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<WebsiteProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const canDelete = role ? hasMinRole(role, 'admin') : false;

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const data = await apiClient<WebsiteBlogPost[]>(`/api/websites/${websiteId}/blog-posts`);
      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  const loadProducts = useCallback(async () => {
    if (!websiteId) return;
    setProductsLoading(true);
    try {
      setProducts(await apiClient<WebsiteProduct[]>(`/api/websites/${websiteId}/products`));
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPosts = useMemo(() => {
    if (statusFilter === 'published') return posts.filter((p) => p.is_published);
    if (statusFilter === 'draft') return posts.filter((p) => !p.is_published);
    return posts;
  }, [posts, statusFilter]);

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.is_published).length;
    return { total: posts.length, published, draft: posts.length - published };
  }, [posts]);

  const openCreate = () => {
    setEditPost(null);
    setProductPickerOpen(false);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCoverImage('');
    setRelatedProductIds([]);
    setIsPublished(false);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (post: WebsiteBlogPost) => {
    void loadProducts();
    setEditPost(post);
    setProductPickerOpen(false);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? '');
    setContent(post.content ?? '');
    setCoverImage(post.cover_image ?? '');
    setRelatedProductIds(post.related_product_ids ?? post.related_products?.map((product) => product.id) ?? []);
    setIsPublished(post.is_published);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!websiteId || !title.trim() || !slug.trim()) {
      setError('Judul dan slug wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || undefined,
        content: content.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        related_product_ids: relatedProductIds,
        is_published: isPublished,
      };
      if (editPost) {
        await apiClient(`/api/websites/${websiteId}/blog-posts/${editPost.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiClient(`/api/websites/${websiteId}/blog-posts`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const moveRelatedProduct = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= relatedProductIds.length) return;
    setRelatedProductIds((current) => {
      const next = current.slice();
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const toggleRelatedProduct = (productId: string) => {
    setRelatedProductIds((current) => {
      if (current.includes(productId)) return current.filter((id) => id !== productId);
      if (current.length >= 3) return current;
      return [...current, productId];
    });
  };

  const handleDelete = async (postId: string) => {
    if (!websiteId) return;
    const ok = await confirm({ title: 'Hapus Artikel Ini?', message: 'Artikel yang dihapus tidak bisa dikembalikan.' });
    if (!ok) return;
    try {
      await apiClient(`/api/websites/${websiteId}/blog-posts/${postId}`, { method: 'DELETE' });
      await load();
    } catch {
      alert('Gagal menghapus artikel');
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className={`space-y-6 ${canEdit ? mobileFabPagePadding : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Blog</h1>
          <p className="mt-1 text-default-500">Kelola artikel blog website Anda.</p>
        </div>
        {canEdit && (
          <Button color="primary" onPress={openCreate} className={desktopAddButtonClass}>
            + Artikel Baru
          </Button>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!loading && posts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip variant="flat" color="primary" className="font-medium">
            {stats.total} artikel
          </Chip>
          <Chip variant="flat" color="success" className="font-medium">
            {stats.published} terbit
          </Chip>
          <Chip variant="flat" className="font-medium">
            {stats.draft} draf
          </Chip>
        </div>
      )}

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : filteredPosts.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-3xl ring-4 ring-slate-50">
              📝
            </div>
            <div>
              <p className="text-lg font-semibold">Belum ada artikel</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">
                {statusFilter === 'all'
                  ? 'Tulis artikel blog pertama untuk website Anda.'
                  : `Belum ada artikel ${statusFilter === 'published' ? 'yang terbit' : 'draf'}.`}
              </p>
            </div>
            {canEdit && (
              <Button color="primary" onPress={openCreate} className="hidden font-semibold sm:inline-flex">
                + Artikel Baru
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((post) => (
            <BlogCard
              key={post.id}
              post={post}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setProductPickerOpen(false);
        }}
        title={productPickerOpen ? 'Pilih Produk Terkait' : editPost ? 'Edit Artikel' : 'Artikel Baru'}
        size="xl"
        footer={
          productPickerOpen ? (
            <Button color="primary" onPress={() => setProductPickerOpen(false)}>Selesai</Button>
          ) : (
            <>
              <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
              <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan</Button>
            </>
          )
        }
      >
        {productPickerOpen ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-default-500">Pilih maksimal 3 produk. Produk terpilih ditambahkan mengikuti urutan pilihan.</p>
              <span className="shrink-0 text-xs font-semibold text-default-500">{relatedProductIds.length}/3</span>
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-default-200">
              {productsLoading ? (
                <p className="p-5 text-sm text-default-400">Memuat produk...</p>
              ) : products.length === 0 ? (
                <p className="p-5 text-sm text-default-400">Belum ada produk atau layanan.</p>
              ) : products.map((product) => {
                const selected = relatedProductIds.includes(product.id);
                const limitReached = relatedProductIds.length >= 3;
                return (
                  <label key={product.id} className="flex cursor-pointer items-center gap-3 border-b border-default-100 px-3 py-3 last:border-b-0 hover:bg-default-50">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selected && limitReached}
                      onChange={() => toggleRelatedProduct(product.id)}
                      className="h-4 w-4 shrink-0"
                    />
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0]} alt="" className="h-11 w-14 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-md bg-default-100 text-lg">🛍️</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{product.name}</span>
                      <span className="text-xs text-default-500">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(product.price)}</span>
                    </span>
                    {!product.is_active && <span className="text-xs text-default-400">Nonaktif</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
        <div className="flex flex-col gap-5">
          <FormInput
            label="Judul"
            value={title}
            onChange={(v) => {
              setTitle(v);
              if (!editPost) setSlug(slugify(v));
            }}
            required
          />
          <FormInput label="Slug" value={slug} onChange={setSlug} required />
          <FormTextarea
            label="Ringkasan"
            description="Opsional — ditampilkan di daftar artikel. Kalau kosong, diambil otomatis dari isi artikel."
            value={excerpt}
            onChange={setExcerpt}
            rows={3}
          />
          <CoverImageUpload
            value={coverImage}
            onChange={setCoverImage}
            websiteId={websiteId ?? undefined}
            uploadFolder="blog"
          />
          <RichTextEditor
            label="Isi Artikel"
            value={content}
            onChange={setContent}
            websiteId={websiteId ?? undefined}
            uploadFolder="blog"
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Produk Terkait</p>
                <p className="text-xs text-default-500">Urutkan produk yang akan menjadi CTA di artikel.</p>
              </div>
              <Button
                size="sm"
                variant="flat"
                color="primary"
                isDisabled={relatedProductIds.length >= 3}
                onPress={() => {
                  void loadProducts();
                  setProductPickerOpen(true);
                }}
              >
                + Tambah Produk
              </Button>
            </div>
            {relatedProductIds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-default-300 px-4 py-6 text-center text-sm text-default-400">Belum ada produk terkait.</div>
            ) : (
              <ul className="divide-y divide-default-100 overflow-hidden rounded-xl border border-default-200">
                {relatedProductIds.map((productId, index) => {
                  const product = products.find((item) => item.id === productId);
                  return (
                    <li key={productId} className="flex items-center gap-3 px-3 py-2.5">
                      {product?.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-default-100 text-lg">🛍️</span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{product?.name ?? 'Produk tidak tersedia'}</span>
                      <span className="text-xs text-default-400">{index + 1}</span>
                      <div className="flex items-center gap-1">
                        <Button isIconOnly size="sm" variant="light" aria-label="Naikkan posisi" isDisabled={index === 0} onPress={() => moveRelatedProduct(index, -1)}>
                          <span aria-hidden="true">↑</span>
                        </Button>
                        <Button isIconOnly size="sm" variant="light" aria-label="Turunkan posisi" isDisabled={index === relatedProductIds.length - 1} onPress={() => moveRelatedProduct(index, 1)}>
                          <span aria-hidden="true">↓</span>
                        </Button>
                        <Button isIconOnly size="sm" variant="light" color="danger" aria-label="Hapus produk terkait" onPress={() => toggleRelatedProduct(productId)}>
                          <span aria-hidden="true">×</span>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <FormSwitch label="Terbitkan" checked={isPublished} onChange={setIsPublished} />
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
        )}
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="Artikel Baru" onClick={openCreate} />}
      {dialog}
    </div>
  );
}
