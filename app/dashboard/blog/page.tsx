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
import { hasMinRole, type WebsiteBlogPost } from '../../lib/types';
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
  const [editPost, setEditPost] = useState<WebsiteBlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
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
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCoverImage('');
    setIsPublished(false);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (post: WebsiteBlogPost) => {
    setEditPost(post);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? '');
    setContent(post.content ?? '');
    setCoverImage(post.cover_image ?? '');
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
        onClose={() => setModalOpen(false)}
        title={editPost ? 'Edit Artikel' : 'Artikel Baru'}
        size="xl"
        footer={
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan</Button>
          </>
        }
      >
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
          <FormSwitch label="Terbitkan" checked={isPublished} onChange={setIsPublished} />
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="Artikel Baru" onClick={openCreate} />}
      {dialog}
    </div>
  );
}
