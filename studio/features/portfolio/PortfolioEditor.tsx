'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Select, SelectItem, Switch, Textarea } from '@heroui/react';

import { errorMessage } from '@/studio/api/client';
import { createPortfolioProject, fetchLanguages, fetchPortfolioCategories, fetchPortfolioProject, removePortfolioProject, updatePortfolioProject, upsertPortfolioTranslation, type PortfolioCategoryDto, type PortfolioPhotoDto, type PortfolioTranslationDto, type WebsiteLanguageDto } from '@/studio/api/company-profile';
import { uploadAsset } from '@/studio/lib/upload-asset';
import { uploadVideo, videoUploadProblem } from '@/studio/lib/upload-video';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { Icon } from '@/studio/ui/icons';
import { RichTextEditor } from '@/studio/ui/rich-text-editor';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { StatusScreen } from '@/studio/ui/primitives/StatusScreen';
import { notify } from '@/studio/ui/primitives/Toast';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const MODEL_MAX_BYTES = 50 * 1024 * 1024;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 100;

type PortfolioTranslationDraft = {
  title: string;
  slug: string;
  excerpt: string;
  detail: string;
  is_published: boolean;
};

const EMPTY_TRANSLATION: PortfolioTranslationDraft = {
  title: '',
  slug: '',
  excerpt: '',
  detail: '',
  is_published: true,
};

function toTranslationDraft(translation: PortfolioTranslationDto): PortfolioTranslationDraft {
  return {
    title: translation.title,
    slug: translation.slug,
    excerpt: translation.excerpt ?? translation.summary ?? '',
    detail: translation.detail ?? translation.description ?? '',
    is_published: translation.is_published,
  };
}

function slugify(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function parseTags(value: string) { return value.split(',').map((tag) => tag.trim()).filter(Boolean); }

export function PortfolioEditor({ projectId }: { projectId: string | null }) {
  const websiteId = useActiveWebsiteId();
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const isNew = projectId === null || projectId === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [uploading, setUploading] = useState<'photo' | 'video' | 'model' | null>(null);
  const [languages, setLanguages] = useState<WebsiteLanguageDto[]>([]);
  const [portfolioCategories, setPortfolioCategories] = useState<PortfolioCategoryDto[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [locale, setLocale] = useState('id');
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, PortfolioTranslationDraft>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState('');
  const [photos, setPhotos] = useState<PortfolioPhotoDto[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [model3dUrl, setModel3dUrl] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const currentTranslation = translationDrafts[locale] ?? EMPTY_TRANSLATION;
  const { title, slug, excerpt, detail, is_published: published } = currentTranslation;

  const updateCurrentTranslation = (patch: Partial<PortfolioTranslationDraft>) => {
    setTranslationDrafts((current) => ({
      ...current,
      [locale]: { ...(current[locale] ?? EMPTY_TRANSLATION), ...patch },
    }));
  };

  const loadLanguages = useCallback(async () => {
    if (!websiteId) return;
    setLanguagesLoading(true);
    try {
      const items = await fetchLanguages(websiteId);
      const activeLanguages = items.filter((item) => item.is_active || item.is_default);
      setLanguages(activeLanguages);
      setLocale((currentLocale) =>
        activeLanguages.some((item) => item.locale === currentLocale)
          ? currentLocale
          : (activeLanguages.find((item) => item.is_default) ?? activeLanguages[0])?.locale ?? 'id',
      );
    } catch (error) {
      notify.error('Gagal memuat bahasa.', errorMessage(error));
    } finally {
      setLanguagesLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void loadLanguages();
    const refreshLanguages = () => {
      if (document.visibilityState === 'visible') void loadLanguages();
    };
    window.addEventListener('focus', refreshLanguages);
    document.addEventListener('visibilitychange', refreshLanguages);
    return () => {
      window.removeEventListener('focus', refreshLanguages);
      document.removeEventListener('visibilitychange', refreshLanguages);
    };
  }, [loadLanguages]);

  useEffect(() => {
    if (!websiteId) return;
    let cancelled = false;
    setCategoriesLoading(true);
    fetchPortfolioCategories(websiteId)
      .then((items) => { if (!cancelled) setPortfolioCategories(items); })
      .catch((error) => { if (!cancelled) notify.error('Gagal memuat kategori portofolio.', errorMessage(error)); })
      .finally(() => { if (!cancelled) setCategoriesLoading(false); });
    return () => { cancelled = true; };
  }, [websiteId]);

  useEffect(() => {
    if (isNew) {
      setCategoryIds([]);
      return;
    }
    if (!websiteId) return;
    setLoading(true);
    void fetchPortfolioProject(websiteId, projectId as string).then((project) => {
      setTranslationDrafts(Object.fromEntries(
        (project.translations ?? []).map((translation) => [translation.locale, toTranslationDraft(translation)]),
      ));
      setTags(project.tags ?? []);
      setCategoryIds(project.category_ids ?? []);
      setProjectName(project.name);
      setTagInput('');
      setTagError('');
      setPhotos(project.photos?.length
        ? project.photos
        : project.cover_image ? [{ url: project.cover_image, alt: '', caption: '' }] : []);
      setVideoUrl(project.video_url ?? '');
      setModel3dUrl(project.model3d_url ?? '');
      setProjectUrl(project.project_url ?? '');
    }).catch((error) => notify.error('Gagal memuat proyek.', errorMessage(error))).finally(() => setLoading(false));
  }, [websiteId, isNew, projectId]);

  const uploadPhotos = async (files: FileList) => {
    const room = 4 - photos.length;
    const selected = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > selected.length) notify.error('Maksimal 4 foto per proyek.');
    const valid = selected.filter((file) => {
      if (!PHOTO_TYPES.includes(file.type)) {
        notify.error(`${file.name}: pilih gambar PNG, JPG, WebP, atau GIF.`);
        return false;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        notify.error(`${file.name}: ukuran foto maksimal 5 MB.`);
        return false;
      }
      return true;
    });
    if (!valid.length || !websiteId) return;

    setUploading('photo');
    const added: PortfolioPhotoDto[] = [];
    for (const file of valid) {
      try {
        const uploaded = await uploadAsset(file, websiteId, 'content');
        added.push({ url: uploaded.url, alt: '', caption: '' });
      } catch (error) {
        notify.error(`Gagal mengunggah ${file.name}.`, errorMessage(error));
      }
    }
    setPhotos((current) => [...current, ...added].slice(0, 4));
    setUploading(null);
  };

  const uploadProjectVideo = async (file: File) => {
    if (!websiteId) return;
    const problem = videoUploadProblem(file);
    if (problem) {
      notify.error(problem);
      return;
    }
    setUploading('video');
    try {
      const uploaded = await uploadVideo(file, websiteId);
      setVideoUrl(uploaded.url);
    } catch (error) {
      notify.error('Gagal mengunggah video.', errorMessage(error));
    } finally {
      setUploading(null);
    }
  };

  const uploadProjectModel = async (file: File) => {
    if (!websiteId) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      notify.error('Model 3D harus berformat .glb atau .gltf.');
      return;
    }
    if (file.size > MODEL_MAX_BYTES) {
      notify.error('Ukuran model 3D maksimal 50 MB.');
      return;
    }
    setUploading('model');
    try {
      const uploaded = await uploadAsset(file, websiteId, 'products');
      setModel3dUrl(uploaded.url);
    } catch (error) {
      notify.error('Gagal mengunggah model 3D.', errorMessage(error));
    } finally {
      setUploading(null);
    }
  };

  const addTags = (value = tagInput) => {
    const newTags = parseTags(value).filter((tag, index, list) =>
      list.findIndex((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase()) === index
      && !tags.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase()),
    );
    if (!newTags.length) {
      setTagInput('');
      setTagError('');
      return;
    }
    if (newTags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      setTagError(`Setiap tag maksimal ${MAX_TAG_LENGTH} karakter.`);
      return;
    }
    if (tags.length + newTags.length > MAX_TAGS) {
      setTagError(`Maksimal ${MAX_TAGS} tag per proyek.`);
      return;
    }
    setTags((current) => [...current, ...newTags]);
    setTagInput('');
    setTagError('');
  };

  const save = async () => {
    if (!websiteId || !projectName.trim() || !title.trim()) return;
    setSaving(true);
    try {
      const normalizedTags = [...new Map([...tags, ...parseTags(tagInput)].map((tag) => [tag.toLocaleLowerCase(), tag])).values()];
      if (normalizedTags.length > MAX_TAGS || normalizedTags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
        notify.error('Tag tidak valid.', 'Maksimal 20 tag, dan setiap tag maksimal 100 karakter.');
        return;
      }
      const coverImage = photos[0]?.url ?? null;
      const payload = {
        name: projectName.trim(),
        ...(isNew ? { slug: slugify(projectName) } : {}),
        cover_image: coverImage,
        photos,
        video_url: videoUrl.trim() || null,
        model3d_url: model3dUrl.trim() || null,
        project_url: projectUrl.trim() || null,
        tags: normalizedTags,
        category_ids: categoryIds,
        is_published: published,
      };
      const project = isNew ? await createPortfolioProject(websiteId, payload) : await updatePortfolioProject(websiteId, projectId as string, payload);
      await upsertPortfolioTranslation(websiteId, project.id, locale, {
        slug: slugify(slug || title),
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        detail: detail.trim() || null,
        seo_title: title.trim(),
        seo_description: excerpt.trim() || null,
        seo_image: coverImage,
        seo_no_index: false,
        is_published: published,
      });
      notify.success(isNew ? 'Proyek ditambahkan.' : 'Proyek diperbarui.');
      if (isNew) router.replace(`/studio/portfolio/${project.id}`); else router.refresh();
    } catch (error) {
      notify.error('Gagal menyimpan proyek.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!websiteId || isNew) return;
    setSaving(true);
    try {
      await removePortfolioProject(websiteId, projectId as string);
      notify.success('Proyek dihapus.');
      router.push('/studio/portfolio');
    } catch (error) {
      notify.error('Gagal menghapus proyek.', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <StatusScreen icon={<span aria-hidden="true">…</span>} title="Memuat proyek" description="Mengambil data portofolio…" />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={projectName.trim() || (isNew ? 'Proyek baru' : 'Proyek')} back={{ href: '/studio/portfolio', label: 'Portofolio' }} actions={<><Switch size="sm" isSelected={published} onValueChange={(value) => updateCurrentTranslation({ is_published: value })}>Terbit</Switch>{!isNew && <Button size="sm" color="danger" variant="flat" isDisabled={saving} onPress={() => void remove()}>Hapus</Button>}<Button size="sm" color="primary" isDisabled={!projectName.trim() || !title.trim() || uploading !== null} isLoading={saving} onPress={() => void save()}>Simpan</Button></>} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col gap-4 rounded-[14px] border border-default-200 bg-white p-5">
          <div className="flex flex-col gap-1">
            <Input label="Nama proyek" labelPlacement="outside" value={projectName} onValueChange={setProjectName} isRequired />
            <p className="text-xs text-default-500">Nama internal untuk mengenali proyek di daftar dan editor; tidak berubah saat bahasa konten diganti.</p>
          </div>
          <Input label="Judul" labelPlacement="outside" value={title} onValueChange={(value) => updateCurrentTranslation({ title: value, ...(isNew ? { slug: slugify(value) } : {}) })} />
          <Input label="Slug" labelPlacement="outside" value={slug} onValueChange={(value) => updateCurrentTranslation({ slug: slugify(value) })} />
          <Textarea label="Excerpt" labelPlacement="outside" value={excerpt ?? ''} onValueChange={(value) => updateCurrentTranslation({ excerpt: value })} minRows={3} maxLength={500} />
          <RichTextEditor label="Detail" value={detail ?? ''} onChange={(value) => updateCurrentTranslation({ detail: value })} websiteId={websiteId ?? undefined} uploadFolder="content" />
          <div className="flex flex-col gap-2">
            <label htmlFor="portfolio-tags" className="text-sm font-medium text-foreground">Tag</label>
            <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-default-300 bg-white px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              {tags.map((tag) => (
                <span key={tag.toLocaleLowerCase()} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                  {tag}
                  <button type="button" className="rounded-full px-1 text-sm leading-none hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={`Hapus tag ${tag}`} onClick={() => setTags((current) => current.filter((item) => item.toLocaleLowerCase() !== tag.toLocaleLowerCase()))}>×</button>
                </span>
              ))}
              <Input
                id="portfolio-tags"
                aria-label="Tambah tag"
                aria-describedby="portfolio-tags-help"
                aria-invalid={Boolean(tagError)}
                variant="flat"
                size="sm"
                classNames={{ base: 'min-w-[160px] flex-1', inputWrapper: 'h-8 min-h-8 bg-transparent px-1 shadow-none data-[hover=true]:bg-transparent group-data-[focus=true]:bg-transparent', input: 'text-sm' }}
                value={tagInput}
                onValueChange={(value) => { setTagInput(value); setTagError(''); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    addTags();
                  } else if (event.key === 'Backspace' && !tagInput && tags.length) {
                    setTags((current) => current.slice(0, -1));
                  }
                }}
                onBlur={() => { if (tagInput.trim()) addTags(); }}
                placeholder={tags.length ? 'Tambah tag…' : 'Contoh: Branding'}
              />
              {tagInput.trim() && <Button size="sm" variant="light" onMouseDown={(event) => event.preventDefault()} onPress={() => addTags()}>Tambah</Button>}
            </div>
            <p id="portfolio-tags-help" className={`text-xs ${tagError ? 'text-danger' : 'text-default-500'}`} aria-live="polite">
              {tagError || `Tekan Enter atau koma untuk menambahkan tag. ${tags.length}/${MAX_TAGS} tag.`}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-default-200 pt-4">
            <div>
              <h2 className="text-sm font-semibold">Foto proyek</h2>
              <p className="text-xs text-default-500">Maksimal 4 foto, masing-masing 5 MB. Foto pertama menjadi sampul.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo, index) => (
                <div key={`${photo.url}-${index}`} className="flex min-w-0 flex-col gap-2 rounded-xl border border-default-200 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL dari storage tenant */}
                  <img src={photo.url} alt={photo.alt} className="aspect-square w-full rounded-lg object-cover" />
                  <Input size="sm" aria-label={`Teks alternatif foto ${index + 1}`} placeholder="Teks alternatif" value={photo.alt} onValueChange={(alt) => setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alt } : item))} />
                  <Input size="sm" aria-label={`Keterangan foto ${index + 1}`} placeholder="Keterangan" value={photo.caption} onValueChange={(caption) => setPhotos((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, caption } : item))} />
                  <Button size="sm" color="danger" variant="light" onPress={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Hapus foto</Button>
                </div>
              ))}
              {photos.length < 4 && <Button variant="bordered" isDisabled={uploading !== null} isLoading={uploading === 'photo'} className="aspect-square h-auto" onPress={() => photoInput.current?.click()}>Tambah foto</Button>}
            </div>
            <input ref={photoInput} type="file" accept={PHOTO_TYPES.join(',')} multiple hidden onChange={(event) => { if (event.target.files) void uploadPhotos(event.target.files); event.currentTarget.value = ''; }} />
          </div>

          <div className="flex flex-col gap-3 border-t border-default-200 pt-4">
            <div>
              <h2 className="text-sm font-semibold">Video proyek</h2>
              <p className="text-xs text-default-500">MP4, WebM, atau MOV, maksimal 15 MB.</p>
            </div>
            {videoUrl && <video src={videoUrl} controls preload="metadata" className="aspect-video max-w-lg rounded-lg bg-black" />}
            <div className="flex gap-2">
              <Button size="sm" variant="bordered" isDisabled={uploading !== null} isLoading={uploading === 'video'} onPress={() => videoInput.current?.click()}>{videoUrl ? 'Ganti video' : 'Unggah video'}</Button>
              {videoUrl && <Button size="sm" color="danger" variant="light" onPress={() => setVideoUrl('')}>Hapus video</Button>}
            </div>
            <input ref={videoInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProjectVideo(file); event.currentTarget.value = ''; }} />
          </div>

          <div className="flex flex-col gap-3 border-t border-default-200 pt-4">
            <div>
              <h2 className="text-sm font-semibold">Aset 3D</h2>
              <p className="text-xs text-default-500">Format GLB atau GLTF, maksimal 50 MB.</p>
            </div>
            {model3dUrl && <a className="truncate text-sm text-primary underline" href={model3dUrl} target="_blank" rel="noreferrer">Buka aset 3D</a>}
            <div className="flex gap-2">
              <Button size="sm" variant="bordered" isDisabled={uploading !== null} isLoading={uploading === 'model'} onPress={() => modelInput.current?.click()}>{model3dUrl ? 'Ganti aset 3D' : 'Unggah aset 3D'}</Button>
              {model3dUrl && <Button size="sm" color="danger" variant="light" onPress={() => setModel3dUrl('')}>Hapus aset</Button>}
            </div>
            <input ref={modelInput} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadProjectModel(file); event.currentTarget.value = ''; }} />
          </div>
        </section>

        {mobileSettingsOpen && (
          <button
            type="button"
            aria-label="Tutup panel pengaturan proyek"
            onClick={() => setMobileSettingsOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          />
        )}
        {mobileSettingsOpen === false && (
          <button
            type="button"
            aria-label="Buka pengaturan proyek"
            aria-expanded={false}
            aria-controls="portfolio-project-settings"
            onClick={() => setMobileSettingsOpen(true)}
            className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-default-300 bg-white px-2 py-3 text-[10px] font-semibold leading-tight text-default-700 shadow-lg lg:hidden"
          >
            <Icon name="menu" size={17} strokeWidth={1.8} />
            <span className="[writing-mode:vertical-rl]">Pengaturan</span>
          </button>
        )}
        <aside
          id="portfolio-project-settings"
          className={`flex-col gap-3 border border-default-200 bg-white p-5 ${mobileSettingsOpen ? 'fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-[min(88vw,360px)] overflow-y-auto rounded-l-2xl shadow-2xl lg:static lg:h-auto lg:w-[320px] lg:overflow-visible lg:rounded-[14px] lg:shadow-none' : 'hidden lg:flex lg:rounded-[14px]'}`}
        >
          <div className="flex items-center justify-between border-b border-default-100 pb-3 lg:hidden">
            <h2 className="text-sm font-semibold">Pengaturan proyek</h2>
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(false)}
              className="rounded-lg p-2 text-default-500 hover:bg-default-100"
              aria-label="Tutup pengaturan proyek"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <Select
            label="Bahasa"
            labelPlacement="outside"
            isLoading={languagesLoading}
            isDisabled={languagesLoading || languages.length < 2}
            selectedKeys={languages.some((item) => item.locale === locale) ? [locale] : []}
            onSelectionChange={(keys) => {
              const nextLocale = Array.from(keys)[0]?.toString();
              if (nextLocale && languages.some((item) => item.locale === nextLocale)) {
                setLocale(nextLocale);
                setTagInput('');
                setTagError('');
              }
            }}
            renderValue={(items) => items.map((item) => item.textValue).join(', ')}
          >
            {languages.map((item) => {
              const label = `${item.label} (${item.locale})`;
              return <SelectItem key={item.locale} textValue={label}>{label}</SelectItem>;
            })}
          </Select>
          {languages.length < 2 && !languagesLoading && <p className="text-xs text-default-500">Belum ada bahasa aktif tambahan. Periksa Pengaturan → Bahasa.</p>}

          <div className="flex flex-col gap-3 rounded-xl border border-default-200 bg-default-50/50 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-default-900">Kategori proyek</h2>
                <p className="mt-1 text-xs text-default-500">Kelompokkan proyek untuk memudahkan pengunjung menjelajah portofolio.</p>
              </div>
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {categoryIds.length}
              </span>
            </div>
            <Select
              aria-label="Kategori proyek"
              selectionMode="multiple"
              selectedKeys={new Set(categoryIds)}
              onSelectionChange={(keys) => setCategoryIds(Array.from(keys, String))}
              isDisabled={categoriesLoading}
              isLoading={categoriesLoading}
              placeholder="Pilih satu atau beberapa kategori"
              renderValue={(items) => items.length ? items.map((item) => item.textValue).join(', ') : 'Belum ada kategori dipilih'}
              classNames={{ trigger: 'min-h-11' }}
            >
              {portfolioCategories.map((category) => (
                <SelectItem key={category.id} textValue={category.name}>
                  {category.name}{!category.is_active ? ' (nonaktif)' : ''}
                </SelectItem>
              ))}
            </Select>
            {categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Kategori terpilih">
                {portfolioCategories
                  .filter((category) => categoryIds.includes(category.id))
                  .map((category) => (
                    <span key={category.id} className="rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
                      {category.name}
                    </span>
                  ))}
              </div>
            )}
            {portfolioCategories.length === 0 && !categoriesLoading && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-default-500">Belum ada kategori untuk dipilih.</p>
                <Link href="/studio/portfolio/categories" className="text-xs font-semibold text-primary hover:underline">
                  Kelola kategori
                </Link>
              </div>
            )}
          </div>
          <Input label="Project URL eksternal" labelPlacement="outside" value={projectUrl} onValueChange={setProjectUrl} placeholder="https://..." />
        </aside>
      </div>
    </div>
  );
}
