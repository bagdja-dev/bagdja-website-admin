'use client';

import { useRef, useState } from 'react';

import { uploadAsset } from '@/studio/lib/upload-asset';
import { uploadVideo, VIDEO_UPLOAD_TYPES, videoUploadProblem } from '@/studio/lib/upload-video';
import { Icon } from '@/studio/ui/icons';
import { FullscreenImageButton } from '@/studio/ui/primitives/FullscreenImageButton';
import { notify } from '@/studio/ui/primitives/Toast';

import type { SectionProps } from '../editor-context';
import { HINT, ICON_BTN, INPUT } from '../fields';
import type { GalleryImage } from '../form-state';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMAGE_MAX = 5 * 1024 * 1024;
/** Maksimal video per produk (sama dengan ArrayMaxSize di DTO produk website-api). */
const VIDEO_LIMIT = 10;

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Bagian "Foto & video": images (+ alt/caption di metadata.gallery_images), video_urls (banyak video). */
export function MediaSection({ form, set, websiteId, canEdit }: SectionProps) {
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null);
  /** Progres unggah video: "2/3 · 45%". */
  const [videoProgress, setVideoProgress] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const images = form.images;
  const setImages = (next: GalleryImage[]) => set({ images: next });

  const uploadImages = async (files: FileList) => {
    const valid = Array.from(files).filter((f) => {
      if (!IMAGE_TYPES.includes(f.type)) {
        notify.error(`${f.name} bukan PNG/JPG/WebP/GIF.`);
        return false;
      }
      if (f.size > IMAGE_MAX) {
        notify.error(`${f.name} lebih dari 5 MB.`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;
    setUploading('image');
    const added: GalleryImage[] = [];
    for (const file of valid) {
      try {
        const res = await uploadAsset(file, websiteId, 'products');
        added.push({ url: res.url, alt: '', caption: '' });
      } catch (err) {
        notify.error(`Gagal mengunggah ${file.name}`, err instanceof Error ? err.message : undefined);
      }
    }
    setUploading(null);
    if (added.length) setImages([...images, ...added]);
  };

  const videos = form.videoUrls;
  const setVideos = (next: string[]) => set({ videoUrls: next });

  /** Banyak video sekaligus (website-api → storage-service, tanpa lewat Vercel), satu per satu dengan progres. */
  const uploadVideos = async (files: FileList) => {
    const room = VIDEO_LIMIT - videos.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > picked.length) notify.error(`Maksimal ${VIDEO_LIMIT} video per produk.`);
    const valid = picked.filter((file) => {
      const problem = videoUploadProblem(file);
      if (problem) notify.error(`${file.name}: ${problem}`);
      return !problem;
    });
    if (!valid.length) return;
    setUploading('video');
    const added: string[] = [];
    for (const [index, file] of valid.entries()) {
      try {
        setVideoProgress(`${index + 1}/${valid.length} · 0%`);
        const res = await uploadVideo(file, websiteId, (percent) => setVideoProgress(`${index + 1}/${valid.length} · ${percent}%`));
        added.push(res.url);
      } catch (err) {
        notify.error(`Gagal mengunggah ${file.name}`, err instanceof Error ? err.message : undefined);
      }
    }
    setUploading(null);
    setVideoProgress('');
    if (added.length) setVideos([...videos, ...added]);
  };

  const patchImage = (index: number, patch: Partial<GalleryImage>) => setImages(images.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  return (
    <>
      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {images.map((img, index) => (
          <li key={`${img.url}-${index}`} className="relative">
            <button type="button" onClick={() => setOpenIndex(openIndex === index ? null : index)} aria-label={`Atur foto ${index + 1}`} className={`block aspect-square w-full overflow-hidden rounded-xl border ${openIndex === index ? 'border-primary ring-2 ring-primary/30' : 'border-default-200'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL storage tenant */}
              <img src={img.url} alt={img.alt} className="h-full w-full object-cover" />
            </button>
            <FullscreenImageButton src={img.url} alt={img.alt || `Foto produk ${index + 1}`} />
            {index === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">Sampul</span>}
          </li>
        ))}
        {canEdit && (
          <li>
            <button type="button" disabled={uploading !== null} onClick={() => imageInput.current?.click()} aria-label="Tambah foto" className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-default-300 bg-default-50 text-default-600 hover:bg-default-100 disabled:opacity-60">
              {uploading === 'image' ? <span className="text-xs">Mengunggah…</span> : <Icon name="plus" size={22} />}
            </button>
          </li>
        )}
      </ul>
      <input ref={imageInput} type="file" accept={IMAGE_TYPES.join(',')} multiple hidden onChange={(e) => { if (e.target.files) void uploadImages(e.target.files); e.currentTarget.value = ''; }} />
      <span className={HINT}>PNG, JPG, WebP, GIF — maks. 5 MB. Foto pertama jadi sampul. Ketuk foto untuk mengatur urutan, teks alternatif, dan keterangan.</span>

      {openIndex !== null && images[openIndex] && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-default-200 bg-default-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-[13px] font-bold">Foto {openIndex + 1}</span>
            <button type="button" className={ICON_BTN} aria-label="Geser ke kiri" disabled={openIndex === 0} onClick={() => { setImages(move(images, openIndex, openIndex - 1)); setOpenIndex(openIndex - 1); }}>
              <Icon name="arrowUp" size={16} className="-rotate-90" />
            </button>
            <button type="button" className={ICON_BTN} aria-label="Geser ke kanan" disabled={openIndex === images.length - 1} onClick={() => { setImages(move(images, openIndex, openIndex + 1)); setOpenIndex(openIndex + 1); }}>
              <Icon name="arrowUp" size={16} className="rotate-90" />
            </button>
            <button type="button" className="min-h-9 rounded-[9px] border border-default-200 bg-white px-3 text-[13px] font-semibold" disabled={openIndex === 0} onClick={() => { setImages(move(images, openIndex, 0)); setOpenIndex(0); }}>
              Jadikan sampul
            </button>
            <button type="button" className={`${ICON_BTN} text-[#B91C1C]`} aria-label="Hapus foto" onClick={() => { setImages(images.filter((_, i) => i !== openIndex)); setOpenIndex(null); }}>
              <Icon name="trash" size={16} />
            </button>
          </div>
          <input className={INPUT} placeholder="Teks alternatif (untuk pembaca layar & SEO)" value={images[openIndex].alt} onChange={(e) => patchImage(openIndex, { alt: e.target.value })} aria-label="Teks alternatif" />
          <input className={INPUT} placeholder="Keterangan foto (opsional)" value={images[openIndex].caption} onChange={(e) => patchImage(openIndex, { caption: e.target.value })} aria-label="Keterangan foto" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold">Video</span>
        {videos.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videos.map((url, index) => (
              <div key={url} className="flex flex-col gap-2 rounded-xl border border-default-200 p-2">
                <video src={url} controls preload="metadata" className="aspect-video w-full rounded-lg bg-black" />
                {canEdit && (
                  <span className="flex items-center gap-1.5">
                    <button type="button" className={ICON_BTN} aria-label="Geser video ke kiri" disabled={index === 0} onClick={() => setVideos(move(videos, index, index - 1))}>
                      <Icon name="arrowUp" size={16} className="-rotate-90" />
                    </button>
                    <button type="button" className={ICON_BTN} aria-label="Geser video ke kanan" disabled={index === videos.length - 1} onClick={() => setVideos(move(videos, index, index + 1))}>
                      <Icon name="arrowUp" size={16} className="rotate-90" />
                    </button>
                    {index === 0 ? <span className="text-xs font-semibold text-default-500">Video utama</span> : null}
                    <button type="button" className={`${ICON_BTN} ml-auto text-[#B91C1C]`} aria-label="Hapus video" onClick={() => setVideos(videos.filter((_, i) => i !== index))}>
                      <Icon name="trash" size={16} />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && videos.length < VIDEO_LIMIT && (
          <button type="button" disabled={uploading !== null} onClick={() => videoInput.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-[10px] border border-dashed border-default-300 px-3.5 text-[13px] font-semibold disabled:opacity-60">
            {uploading === 'video' ? `Mengunggah video ${videoProgress}…` : '+ Tambah video'}
          </button>
        )}
        <p className={HINT}>MP4, WebM, atau MOV, maksimal 15 MB per video, hingga {VIDEO_LIMIT} video. Video pertama tampil lebih dulu.</p>
      </div>
      <input ref={videoInput} type="file" accept={VIDEO_UPLOAD_TYPES.join(',')} multiple hidden onChange={(e) => { if (e.target.files) void uploadVideos(e.target.files); e.currentTarget.value = ''; }} />
    </>
  );
}
