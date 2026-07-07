'use client';

import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { desktopAddButtonClass, MobileFloatingActionBar, mobileFabPagePadding } from '../../components/mobile-floating-action';
import { AppModal } from '../../components/app-modal';
import { FormInput, FormSelect, FormSwitch, FormTextarea } from '../../components/form-field';
import { LoadingSpinner } from '../../components/loading-spinner';
import { NoWebsiteState } from '../../components/no-website-state';
import { apiClient } from '../../lib/api-client';
import {
  FAQ_CATEGORY_LABELS,
  hasMinRole,
  type WebsiteFaq,
} from '../../lib/types';
import { useWebsiteContext } from '../../context/website-context';

const CATEGORY_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'general', label: 'Umum' },
  { key: 'booking', label: 'Booking' },
  { key: 'payment', label: 'Pembayaran' },
  { key: 'product', label: 'Produk' },
] as const;

const CATEGORY_OPTIONS = Object.entries(FAQ_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const CATEGORY_THEME: Record<
  string,
  { gradient: string; glow: string; icon: string; ring: string; chipColor: 'primary' | 'secondary' | 'warning' | 'success' }
> = {
  general: {
    gradient: 'from-fuchsia-500 to-purple-600',
    glow: 'bg-fuchsia-300/25',
    icon: '❓',
    ring: 'ring-fuchsia-100',
    chipColor: 'secondary',
  },
  booking: {
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'bg-violet-300/25',
    icon: '📅',
    ring: 'ring-violet-100',
    chipColor: 'primary',
  },
  payment: {
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'bg-emerald-300/25',
    icon: '💳',
    ring: 'ring-emerald-100',
    chipColor: 'success',
  },
  product: {
    gradient: 'from-cyan-500 to-sky-600',
    glow: 'bg-cyan-300/25',
    icon: '🛍️',
    ring: 'ring-cyan-100',
    chipColor: 'warning',
  },
};

function getCategoryTheme(category: string | null | undefined) {
  return CATEGORY_THEME[category ?? 'general'] ?? CATEGORY_THEME.general;
}

interface FaqCardProps {
  faq: WebsiteFaq;
  globalIndex: number;
  total: number;
  canEdit: boolean;
  canDelete: boolean;
  reordering: boolean;
  onEdit: (faq: WebsiteFaq) => void;
  onDelete: (faqId: string) => void;
  onMove: (globalIndex: number, direction: 'up' | 'down') => void;
}

function FaqCard({
  faq,
  globalIndex,
  total,
  canEdit,
  canDelete,
  reordering,
  onEdit,
  onDelete,
  onMove,
}: FaqCardProps) {
  const cat = faq.category ?? 'general';
  const theme = getCategoryTheme(cat);
  const initial = faq.question.trim().charAt(0).toUpperCase() || '?';

  return (
    <Card className="group overflow-hidden border-0 shadow-md ring-1 ring-default-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex gap-0">
        {canEdit && (
          <div className="flex flex-col items-center justify-center gap-1 border-r border-default-100 bg-default-50/80 px-2 py-3">
            <button
              type="button"
              disabled={globalIndex === 0 || reordering}
              onClick={() => onMove(globalIndex, 'up')}
              className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-30"
              aria-label="Naik"
            >
              ↑
            </button>
            <span className="text-xs font-bold text-default-400">{globalIndex + 1}</span>
            <button
              type="button"
              disabled={globalIndex === total - 1 || reordering}
              onClick={() => onMove(globalIndex, 'down')}
              className="rounded-lg p-1.5 text-default-400 transition-colors hover:bg-white hover:text-primary disabled:opacity-30"
              aria-label="Turun"
            >
              ↓
            </button>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className={`relative bg-gradient-to-br ${theme.gradient} px-4 pb-8 pt-4 sm:px-5 sm:pt-5`}>
            <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${theme.glow} blur-2xl`} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <Chip
                      size="sm"
                      variant="flat"
                      color={theme.chipColor}
                      className="border border-white/25 bg-white/15 backdrop-blur-sm"
                      classNames={{ content: 'font-semibold text-white text-[10px] uppercase tracking-wide' }}
                    >
                      {FAQ_CATEGORY_LABELS[cat] ?? cat}
                    </Chip>
                    <Chip
                      size="sm"
                      variant="flat"
                      className={`border backdrop-blur-sm ${faq.is_active ? 'border-emerald-300/40 bg-emerald-500/20' : 'border-white/20 bg-white/10'}`}
                      classNames={{ content: `font-semibold text-[10px] ${faq.is_active ? 'text-emerald-100' : 'text-white/70'}` }}
                    >
                      {faq.is_active ? '● Aktif' : '○ Nonaktif'}
                    </Chip>
                  </div>
                  <h3 className="line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">
                    {faq.question}
                  </h3>
                </div>
              </div>
              <div className="hidden shrink-0 rounded-xl bg-white/15 p-2 text-xl backdrop-blur-sm sm:block">
                {theme.icon}
              </div>
            </div>
          </div>

          <CardBody className="relative -mt-4 space-y-3 rounded-t-2xl bg-white px-4 pb-4 pt-4 sm:px-5">
            <p className="line-clamp-3 text-sm leading-relaxed text-default-600">{faq.answer}</p>

            <div className="flex flex-wrap gap-2">
              {faq.is_public && (
                <Chip size="sm" variant="flat" color="secondary" className="text-xs">
                  Publik
                </Chip>
              )}
              {!faq.is_public && (
                <Chip size="sm" variant="flat" className="text-xs">
                  Internal
                </Chip>
              )}
            </div>

            {(canEdit || canDelete) && (
              <div className="flex gap-2 border-t border-default-100 pt-3">
                {canEdit && (
                  <Button size="sm" color="primary" variant="flat" className="flex-1 font-medium" onPress={() => onEdit(faq)}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" color="danger" variant="light" className="flex-1" onPress={() => onDelete(faq.id)}>
                    Hapus
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </div>
      </div>
    </Card>
  );
}

export default function FaqsManagement() {
  const { websiteId, role, loading: ctxLoading } = useWebsiteContext();
  const [faqs, setFaqs] = useState<WebsiteFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editFaq, setEditFaq] = useState<WebsiteFaq | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('general');
  const [isPublic, setIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState('');

  const canEdit = role ? hasMinRole(role, 'editor') : false;
  const canDelete = role ? hasMinRole(role, 'admin') : false;

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const data = await apiClient<WebsiteFaq[]>(`/api/websites/${websiteId}/faqs`);
      setFaqs(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredFaqs = useMemo(() => {
    if (categoryFilter === 'all') return faqs;
    return faqs.filter((f) => (f.category ?? 'general') === categoryFilter);
  }, [faqs, categoryFilter]);

  const stats = useMemo(() => {
    const active = filteredFaqs.filter((f) => f.is_active).length;
    const publicCount = filteredFaqs.filter((f) => f.is_public).length;
    return { total: filteredFaqs.length, active, publicCount };
  }, [filteredFaqs]);

  const openCreate = () => {
    setEditFaq(null);
    setQuestion('');
    setAnswer('');
    setCategory(categoryFilter !== 'all' ? categoryFilter : 'general');
    setIsPublic(true);
    setIsActive(true);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (faq: WebsiteFaq) => {
    setEditFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category ?? 'general');
    setIsPublic(faq.is_public);
    setIsActive(faq.is_active);
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!websiteId || !question.trim() || !answer.trim()) {
      setError('Pertanyaan dan jawaban wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        question: question.trim(),
        answer: answer.trim(),
        category,
        is_public: isPublic,
        is_active: isActive,
      };
      if (editFaq) {
        await apiClient(`/api/websites/${websiteId}/faqs/${editFaq.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiClient(`/api/websites/${websiteId}/faqs`, {
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

  const handleDelete = async (faqId: string) => {
    if (!websiteId || !confirm('Hapus FAQ ini?')) return;
    try {
      await apiClient(`/api/websites/${websiteId}/faqs/${faqId}`, { method: 'DELETE' });
      await load();
    } catch {
      alert('Gagal menghapus FAQ');
    }
  };

  const handleMove = async (globalIndex: number, direction: 'up' | 'down') => {
    if (!websiteId || reordering) return;
    const targetIndex = direction === 'up' ? globalIndex - 1 : globalIndex + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const reordered = [...faqs];
    [reordered[globalIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[globalIndex]];

    setReordering(true);
    setFaqs(reordered);
    try {
      await apiClient(`/api/websites/${websiteId}/faqs/reorder`, {
        method: 'POST',
        body: JSON.stringify({ faq_ids: reordered.map((f) => f.id) }),
      });
    } catch {
      await load();
      alert('Gagal mengubah urutan');
    } finally {
      setReordering(false);
    }
  };

  if (ctxLoading) return <LoadingSpinner />;
  if (!websiteId) return <NoWebsiteState />;

  return (
    <div className={`space-y-6 ${canEdit ? mobileFabPagePadding : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">FAQ</h1>
          <p className="mt-1 text-default-500">Kelola pertanyaan yang sering diajukan pelanggan.</p>
        </div>
        {canEdit && (
          <Button color="primary" onPress={openCreate} className={desktopAddButtonClass}>
            + FAQ Baru
          </Button>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const active = categoryFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoryFilter(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-500 text-white shadow-md shadow-fuchsia-500/25'
                  : 'bg-white text-default-600 ring-1 ring-default-200 hover:bg-default-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {!loading && filteredFaqs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip variant="flat" color="primary" className="font-medium">
            {stats.total} FAQ
          </Chip>
          <Chip variant="flat" color="success" className="font-medium">
            {stats.active} aktif
          </Chip>
          <Chip variant="flat" color="secondary" className="font-medium">
            {stats.publicCount} publik
          </Chip>
        </div>
      )}

      {canEdit && faqs.length > 1 && categoryFilter === 'all' && (
        <p className="text-xs font-medium uppercase tracking-wide text-default-400">
          Urutan tampil di website (atas → bawah) — gunakan ↑↓ di setiap card
        </p>
      )}

      {loading ? (
        <LoadingSpinner className="h-48" />
      ) : filteredFaqs.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md ring-1 ring-default-100">
          <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-100 to-purple-100 text-3xl ring-4 ring-fuchsia-50">
              ❓
            </div>
            <div>
              <p className="text-lg font-semibold">Belum ada FAQ</p>
              <p className="mt-1 max-w-sm text-sm text-default-500">
                {categoryFilter === 'all'
                  ? 'Tambahkan pertanyaan umum untuk membantu pelanggan.'
                  : `Belum ada FAQ kategori ${FAQ_CATEGORY_LABELS[categoryFilter]?.toLowerCase() ?? categoryFilter}.`}
              </p>
            </div>
            {canEdit && (
              <Button color="primary" onPress={openCreate} className="hidden font-semibold sm:inline-flex">
                + FAQ Baru
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredFaqs.map((faq) => {
            const globalIndex = faqs.findIndex((f) => f.id === faq.id);
            return (
              <FaqCard
                key={faq.id}
                faq={faq}
                globalIndex={globalIndex}
                total={faqs.length}
                canEdit={canEdit}
                canDelete={canDelete}
                reordering={reordering}
                onEdit={openEdit}
                onDelete={handleDelete}
                onMove={handleMove}
              />
            );
          })}
        </div>
      )}

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editFaq ? 'Edit FAQ' : 'FAQ Baru'}
        footer={
          <>
            <Button variant="light" onPress={() => setModalOpen(false)}>Batal</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave}>Simpan</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormInput label="Pertanyaan" value={question} onChange={setQuestion} required />
          <FormTextarea label="Jawaban" value={answer} onChange={setAnswer} required rows={4} />
          <FormSelect label="Kategori" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
          <FormSwitch label="Tampilkan di website (publik)" checked={isPublic} onChange={setIsPublic} />
          <FormSwitch label="Aktif" checked={isActive} onChange={setIsActive} />
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
      </AppModal>

      {canEdit && <MobileFloatingActionBar label="FAQ Baru" onClick={openCreate} />}
    </div>
  );
}
