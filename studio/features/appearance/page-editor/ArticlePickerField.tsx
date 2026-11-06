'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react';

import { fetchBlogPosts, type WebsiteBlogPost } from '@/studio/api/blog-posts';

interface ArticlePickerFieldProps {
  value: unknown;
  websiteId: string;
  multiple: boolean;
  onChange: (value: string | string[]) => void;
}

function selectedIdsFrom(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === 'string');
  return typeof value === 'string' && value ? [value] : [];
}

export function ArticlePickerField({ value, websiteId, multiple, onChange }: ArticlePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [posts, setPosts] = useState<WebsiteBlogPost[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const selectedIds = selectedIdsFrom(value);

  useEffect(() => {
    if (!isOpen || posts.length > 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchBlogPosts(websiteId)
      .then((result) => {
        if (!cancelled) setPosts(result);
      })
      .catch(() => {
        if (!cancelled) setError('Daftar artikel gagal dimuat. Coba muat ulang.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, loadAttempt, posts.length, websiteId]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return posts;
    return posts.filter((post) =>
      [post.title, post.slug, post.excerpt ?? ''].some((text) => text.toLocaleLowerCase().includes(normalizedQuery)),
    );
  }, [posts, query]);

  const selectedPosts = selectedIds
    .map((id) => posts.find((post) => post.id === id))
    .filter((post): post is WebsiteBlogPost => Boolean(post));

  const togglePost = (postId: string) => {
    setDraftIds((current) => {
      if (current.includes(postId)) return current.filter((id) => id !== postId);
      return multiple ? [...current, postId] : [postId];
    });
  };

  const applySelection = () => {
    onChange(multiple ? draftIds : draftIds[0] ?? '');
    setIsOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="bordered"
          radius="sm"
          className="justify-start"
          onPress={() => {
            setDraftIds(selectedIds);
            setQuery('');
            setIsOpen(true);
          }}
        >
          {selectedIds.length > 0
            ? `Ubah pilihan (${selectedIds.length} artikel)`
            : 'Pilih artikel'}
        </Button>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-live="polite">
            {selectedPosts.length > 0 ? (
              selectedPosts.map((post) => (
                <span key={post.id} className="max-w-full truncate rounded-md bg-default-100 px-2 py-1 text-xs text-default-700">
                  {post.title}
                </span>
              ))
            ) : (
              <span className="text-xs text-default-500">{selectedIds.length} artikel dipilih</span>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) setIsOpen(false);
        }}
        placement="center"
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">Pilih artikel</ModalHeader>
          <ModalBody className="gap-3">
            <Input
              aria-label="Cari artikel"
              placeholder="Cari berdasarkan judul atau slug..."
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
            {loading ? (
              <p className="py-8 text-center text-sm text-default-500">Memuat artikel…</p>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-danger">{error}</p>
                <Button variant="bordered" size="sm" onPress={() => setLoadAttempt((attempt) => attempt + 1)}>
                  Coba lagi
                </Button>
              </div>
            ) : posts.length === 0 ? (
              <p className="py-8 text-center text-sm text-default-500">
                Belum ada artikel. Buat artikel terlebih dahulu di menu Blog.
              </p>
            ) : filteredPosts.length === 0 ? (
              <p className="py-8 text-center text-sm text-default-500">Tidak ada artikel yang cocok dengan pencarian.</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-default-200">
                {filteredPosts.map((post) => (
                  <label
                    key={post.id}
                    className="flex cursor-pointer items-start gap-3 border-b border-default-100 px-3 py-3 last:border-b-0 hover:bg-default-50"
                  >
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name="article-picker-selection"
                      checked={draftIds.includes(post.id)}
                      onChange={() => togglePost(post.id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--studio-primary)]"
                    />
                    {post.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.cover_image} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-default-100 text-xs text-default-400">
                        Artikel
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{post.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-default-500">/{post.slug}</span>
                      {post.excerpt && <span className="mt-1 line-clamp-2 block text-xs text-default-500">{post.excerpt}</span>}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        post.is_published ? 'bg-success-50 text-success-700' : 'bg-default-100 text-default-500'
                      }`}
                    >
                      {post.is_published ? 'Terbit' : 'Draf'}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {multiple && !loading && !error && posts.length > 0 && (
              <p className="text-xs text-default-500">{draftIds.length} artikel dipilih</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsOpen(false)}>Batal</Button>
            <Button color="primary" onPress={applySelection} isDisabled={loading || Boolean(error)}>
              Gunakan pilihan
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
