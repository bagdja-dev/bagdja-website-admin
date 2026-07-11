'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '../lib/api-client';
import type { WebsiteBlogPost } from '../lib/types';

interface BlogPostPickerProps {
  label: string;
  description?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  websiteId?: string;
  disabled?: boolean;
}

export function BlogPostPicker({
  label,
  description,
  value,
  onChange,
  websiteId,
  disabled = false,
}: BlogPostPickerProps) {
  const [posts, setPosts] = useState<WebsiteBlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!websiteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await apiClient<WebsiteBlogPost[]>(`/api/websites/${websiteId}/blog-posts`);
        if (!cancelled) setPosts(data);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>

      <div className="max-h-64 overflow-y-auto rounded-xl border border-default-300 bg-white">
        {loading ? (
          <p className="p-4 text-sm text-default-400">Memuat artikel…</p>
        ) : posts.length === 0 ? (
          <p className="p-4 text-sm text-default-400">Belum ada artikel blog — buat dulu di menu Blog.</p>
        ) : (
          posts.map((post) => (
            <label
              key={post.id}
              className="flex cursor-pointer items-center gap-3 border-b border-default-100 px-3 py-2 last:border-b-0 hover:bg-default-50"
            >
              <input
                type="checkbox"
                checked={value.includes(post.id)}
                onChange={() => toggle(post.id)}
                disabled={disabled}
                className="h-4 w-4 shrink-0 rounded border-default-300"
              />
              {post.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover_image} alt="" className="h-8 w-12 shrink-0 rounded object-cover" />
              ) : (
                <span className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-default-100 text-xs">
                  📝
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{post.title}</span>
              {!post.is_published && (
                <span className="shrink-0 rounded bg-default-100 px-1.5 py-0.5 text-[10px] font-medium text-default-500">
                  Draf
                </span>
              )}
            </label>
          ))
        )}
      </div>

      {description && <p className="text-xs text-default-500">{description}</p>}
      {value.length > 0 && <p className="text-xs text-default-400">{value.length} artikel dipilih</p>}
    </div>
  );
}
