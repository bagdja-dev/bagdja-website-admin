'use client';

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@heroui/react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cancelQuote,
  fetchCancelledQuotes,
  fetchDraftQuotes,
  fetchQuoteOrder,
  openQuoteChat,
  saveQuote,
  saveQuoteStep,
  type CancelledQuote,
  type DraftQuote,
  type QuoteTerminInput,
} from '@/studio/api/quotes';
import type { StepProgress } from '@/studio/api/order-detail';
import { errorMessage } from '@/studio/api/client';
import { hasMinRole } from '@/studio/lib/roles';
import { useActiveRole, useActiveWebsiteId } from '@/studio/stores/website-store';
import { StepFieldInput } from '@/studio/features/orders/detail/StepFieldInput';
import { StepFieldValues } from '@/studio/features/orders/detail/StepFieldValue';
import { Icon } from '@/studio/ui/icons';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { notify } from '@/studio/ui/primitives/Toast';

type QuoteTab = 'aktif' | 'dibatalkan';
type TerminRow = { label: string; amount: string; anchor_step_name: string };

const INITIAL_TERMIN_ROWS: TerminRow[] = [
  { label: 'DP', amount: '', anchor_step_name: '' },
  { label: 'Pelunasan', amount: '', anchor_step_name: '' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function maskInteger(value: string): string {
  return value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function readyForCheckout(draft: DraftQuote): boolean {
  return draft.quoted_total_amount != null || (!draft.product?.quotable && draft.unit_price > 0);
}

function totalLabel(draft: DraftQuote): string {
  if (draft.quoted_total_amount == null) return 'Total awal';
  return typeof draft.metadata?.quote_first_termin_label === 'string'
    ? `Termin 1 · ${draft.metadata.quote_first_termin_label}`
    : 'Sekali bayar';
}

function tabHref(tab: QuoteTab): string {
  return tab === 'dibatalkan' ? '/studio/quotes?tab=dibatalkan' : '/studio/quotes';
}

export function QuotesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-default-500">Memuat penawaran…</div>}>
      <QuotesPageContent />
    </Suspense>
  );
}

function QuotesPageContent() {
  const websiteId = useActiveWebsiteId();
  const role = useActiveRole();
  const canEdit = hasMinRole(role, 'editor');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const tab: QuoteTab = searchParams.get('tab') === 'dibatalkan' ? 'dibatalkan' : 'aktif';
  const [drafts, setDrafts] = useState<DraftQuote[]>([]);
  const [cancelledQuotes, setCancelledQuotes] = useState<CancelledQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeError, setActiveError] = useState('');
  const [cancelledError, setCancelledError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDraft, setSelectedDraft] = useState<DraftQuote | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [quotePrice, setQuotePrice] = useState('');
  const [terminEnabled, setTerminEnabled] = useState(false);
  const [terminRows, setTerminRows] = useState<TerminRow[]>(INITIAL_TERMIN_ROWS);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [stepFormData, setStepFormData] = useState<Record<string, unknown>>({});
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [stepBusy, setStepBusy] = useState<string | null>(null);
  const [stepError, setStepError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [quoteSettingsOpen, setQuoteSettingsOpen] = useState(false);
  const [quoteSheetExpanded, setQuoteSheetExpanded] = useState(false);
  const [quoteSheetDragY, setQuoteSheetDragY] = useState(0);
  const quoteSheetDragStartY = useRef<number | null>(null);
  const loadRequestId = useRef(0);

  const selectedDraftId = selectedDraft?.id;
  const selectedInitialPrice = selectedDraft
    ? String(selectedDraft.quoted_total_amount ?? (selectedDraft.unit_price > 0 ? selectedDraft.unit_price : ''))
    : '';

  const load = useCallback(async () => {
    if (!websiteId) return;
    const requestId = ++loadRequestId.current;
    setLoading(true);
    const [activeResult, cancelledResult] = await Promise.allSettled([
        fetchDraftQuotes(websiteId),
        fetchCancelledQuotes(websiteId),
    ]);
    if (requestId !== loadRequestId.current) return;
    if (activeResult.status === 'fulfilled') {
      setDrafts(activeResult.value);
      setActiveError('');
    } else {
      setActiveError(errorMessage(activeResult.reason, 'Gagal memuat penawaran aktif.'));
    }
    if (cancelledResult.status === 'fulfilled') {
      setCancelledQuotes(cancelledResult.value);
      setCancelledError('');
    } else {
      setCancelledError(errorMessage(cancelledResult.reason, 'Gagal memuat penawaran dibatalkan.'));
    }
    setLoading(false);
  }, [websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!websiteId || !orderId) {
      setSelectedDraft(null);
      setDetailError('');
      setDetailLoading(false);
      return;
    }
    const listedDraft = drafts.find((draft) => draft.id === orderId);
    if (listedDraft) {
      setSelectedDraft(listedDraft);
      setDetailError('');
      setDetailLoading(false);
      return;
    }

    let active = true;
    setSelectedDraft(null);
    setDetailLoading(true);
    setDetailError('');
    fetchQuoteOrder(websiteId, orderId)
      .then((draft) => {
        if (!active) return;
        if (draft.transaction_id) {
          router.replace(`/studio/orders/${encodeURIComponent(draft.transaction_id)}`);
          return;
        }
        setSelectedDraft(draft);
      })
      .catch((error: unknown) => {
        if (active) setDetailError(errorMessage(error, 'Gagal memuat detail penawaran.'));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [drafts, orderId, router, websiteId]);

  useEffect(() => {
    if (!selectedDraftId) return;
    setQuotePrice(selectedInitialPrice);
    setTerminEnabled(false);
    setTerminRows(INITIAL_TERMIN_ROWS.map((row) => ({ ...row })));
    setOpenStep(null);
    setStepFormData({});
    setStepError('');
    setQuoteSettingsOpen(false);
    setQuoteSheetExpanded(false);
    setQuoteSheetDragY(0);
  }, [selectedDraftId, selectedInitialPrice]);

  const filteredDrafts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    if (!query) return drafts;
    return drafts.filter((draft) =>
      [draft.buyer_identifier, draft.product?.name, draft.location?.name, draft.vendor?.name]
        .some((value) => value?.toLocaleLowerCase('id-ID').includes(query)),
    );
  }, [drafts, search]);

  const openDraft = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'aktif');
    params.set('order', id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const closeDetail = () => {
    router.push(tabHref('aktif'));
  };

  const updateTerminRow = (index: number, patch: Partial<TerminRow>) => {
    setTerminRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const saveQuotation = async () => {
    if (!websiteId || !selectedDraft) return false;
    const finalPrice = Number(digitsOnly(quotePrice));
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      setDetailError('Isi harga final yang valid (lebih dari nol) sebelum menyimpan.');
      return false;
    }
    let termins: QuoteTerminInput[] | undefined;
    if (terminEnabled) {
      if (terminRows.length < 2) {
        setDetailError('Atur termin memerlukan minimal dua baris pembayaran.');
        return false;
      }
      termins = terminRows.map((row) => ({
        label: row.label.trim(),
        amount: Number(digitsOnly(row.amount)),
        anchor_step_name: row.anchor_step_name.trim() || undefined,
      }));
      if (termins.some((row) => !row.label || !Number.isFinite(row.amount) || row.amount <= 0)) {
        setDetailError('Isi label dan jumlah setiap termin dengan benar (semua wajib lebih dari nol).');
        return false;
      }
      const sum = termins.reduce((total, row) => total + row.amount, 0);
      if (Math.abs(sum - finalPrice) > 1) {
        setDetailError(`Total termin (${formatCurrency(sum)}) harus sama dengan harga final (${formatCurrency(finalPrice)}).`);
        return false;
      }
    }
    setQuoteSaving(true);
    setDetailError('');
    try {
      await saveQuote(websiteId, selectedDraft.id, finalPrice, termins);
      await load();
      notify.success('Quotation berhasil disimpan');
      setDetailError('');
      return true;
    } catch (error) {
      setDetailError(errorMessage(error, 'Gagal menyimpan quotation.'));
      return false;
    } finally {
      setQuoteSaving(false);
    }
  };

  const saveStep = async (step: StepProgress, complete: boolean) => {
    if (!websiteId || !selectedDraft) return;
    const key = `${selectedDraft.id}::${step.stepName}`;
    if (complete) {
      for (const field of step.formSchema ?? []) {
        const value = stepFormData[field.key];
        if (field.required && (
          value == null ||
          (typeof value === 'string' && !value.trim()) ||
          (Array.isArray(value) && value.length === 0)
        )) {
          setStepError(`Field "${field.label}" wajib diisi.`);
          return;
        }
      }
    }
    const formData: Record<string, unknown> = {};
    for (const field of step.formSchema ?? []) {
      const value = stepFormData[field.key];
      if (Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() !== '' : value != null) {
        formData[field.key] = typeof value === 'string' ? value.trim() : value;
      }
    }
    setStepBusy(key);
    setStepError('');
    try {
      await saveQuoteStep(websiteId, selectedDraft.id, step.stepName, formData, complete);
      if (complete) {
        setOpenStep(null);
        notify.success(`${step.stepName} berhasil dikirim`);
      } else {
        notify.success('Draft langkah tersimpan');
      }
      await load();
    } catch (error) {
      setStepError(errorMessage(error, complete ? 'Gagal menyelesaikan langkah.' : 'Gagal menyimpan draft langkah.'));
    } finally {
      setStepBusy(null);
    }
  };

  const submitCancellation = async () => {
    if (!websiteId || !selectedDraft) return;
    setCancelBusy(true);
    setCancelError('');
    try {
      await cancelQuote(websiteId, selectedDraft.id, cancelReason.trim() || undefined);
      setCancelOpen(false);
      setCancelReason('');
      await load();
      router.replace(tabHref('dibatalkan'));
      notify.success('Penawaran dibatalkan');
    } catch (error) {
      setCancelError(errorMessage(error, 'Gagal membatalkan penawaran.'));
    } finally {
      setCancelBusy(false);
    }
  };

  const startBuyerChat = async () => {
    if (!websiteId || !selectedDraft || chatBusy) return;
    setChatBusy(true);
    try {
      const threadId = await openQuoteChat(websiteId, selectedDraft);
      router.push(threadId ? `/studio/inbox?thread=${encodeURIComponent(threadId)}` : '/studio/inbox');
    } catch (error) {
      notify.error('Gagal membuka chat', errorMessage(error, 'Tidak dapat menyiapkan percakapan dengan pembeli.'));
    } finally {
      setChatBusy(false);
    }
  };

  const currentStep = selectedDraft?.praorderProgress?.steps.find((step, index, steps) => (
    !step.completed &&
    steps.slice(0, index).every((prior) => prior.completed) &&
    step.filledBy === 'admin' &&
    step.stepName !== 'Quotation'
  )) ?? null;
  const stepKey = currentStep && selectedDraft ? `${selectedDraft.id}::${currentStep.stepName}` : null;
  const stepIsOpen = Boolean(stepKey && openStep === stepKey);

  const tabCounts = { aktif: drafts.length, dibatalkan: cancelledQuotes.length };
  const pageTitle = selectedDraft ? 'Detail penawaran' : 'Penawaran';

  if (!websiteId) {
    return (
      <>
        <PageHeader title="Penawaran" description="Kelola permintaan harga sebelum checkout." />
        <EmptyState title="Pilih website terlebih dahulu" description="Pilih website aktif untuk melihat penawaran." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={selectedDraft ? `${selectedDraft.product?.name ?? 'Produk'} · ${formatDate(selectedDraft.created_at)}` : 'Kelola permintaan penawaran sebelum pembeli checkout.'}
        count={selectedDraft ? undefined : tabCounts[tab]}
        back={selectedDraft ? { href: tabHref('aktif'), label: 'Penawaran' } : undefined}
      />
      {selectedDraft || orderId ? (
        detailLoading ? (
          <div className="rounded-2xl border border-default-200 bg-white p-8 text-center text-sm text-default-500">Memuat detail penawaran…</div>
        ) : selectedDraft ? (
          <QuoteDetail
            draft={selectedDraft}
            websiteId={websiteId}
            canEdit={canEdit}
            price={quotePrice}
            setPrice={setQuotePrice}
            terminEnabled={terminEnabled}
            setTerminEnabled={setTerminEnabled}
            terminRows={terminRows}
            setTerminRows={setTerminRows}
            updateTerminRow={updateTerminRow}
            quoteSaving={quoteSaving}
            onSaveQuote={() => void saveQuotation()}
            chatBusy={chatBusy}
            onChat={() => void startBuyerChat()}
            onCancel={() => {
              setCancelError('');
              setCancelOpen(true);
            }}
            stepFormData={stepFormData}
            setStepFormData={setStepFormData}
            openStep={openStep}
            setOpenStep={setOpenStep}
            stepBusy={stepBusy}
            stepError={stepError}
            onSaveStep={saveStep}
            detailError={detailError}
          />
        ) : (
          <ErrorState message={detailError || 'Penawaran tidak ditemukan.'} onRetry={() => void load()} onBack={closeDetail} />
        )
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-default-200">
            {(['aktif', 'dibatalkan'] as const).map((key) => (
              <Link
                key={key}
                href={tabHref(key)}
                aria-current={tab === key ? 'page' : undefined}
                className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold no-underline ${
                  tab === key ? 'border-primary text-primary' : 'border-transparent text-default-500 hover:text-foreground'
                }`}
              >
                {key === 'aktif' ? 'Aktif' : 'Dibatalkan'}
                <span className="ml-2 rounded-full bg-default-100 px-2 py-0.5 text-xs text-default-600">{tabCounts[key]}</span>
              </Link>
            ))}
          </div>
          {tab === 'aktif' ? (
            <ActiveQuotes
              drafts={filteredDrafts}
              loading={loading}
              error={activeError}
              search={search}
              onSearch={setSearch}
              onOpen={openDraft}
              onRetry={() => void load()}
            />
          ) : (
            <CancelledQuotesList
              quotes={cancelledQuotes}
              loading={loading}
              error={cancelledError}
              onRetry={() => void load()}
            />
          )}
        </div>
      )}
      <Modal
        isOpen={cancelOpen}
        onOpenChange={(open) => {
          if (!cancelBusy) setCancelOpen(open);
        }}
        isDismissable={!cancelBusy}
        placement="center"
        size="md"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Batalkan penawaran</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  Penawaran ini tidak dapat dilanjutkan oleh pembeli setelah dibatalkan.
                </p>
                <Textarea
                  label="Alasan pembatalan"
                  placeholder="Opsional, misalnya pembeli tidak merespons quotation"
                  value={cancelReason}
                  onValueChange={setCancelReason}
                  isDisabled={cancelBusy}
                />
                {cancelError && <p role="alert" className="text-sm text-danger">{cancelError}</p>}
              </ModalBody>
              <ModalFooter>
                <Button variant="bordered" onPress={onClose} isDisabled={cancelBusy}>Kembali</Button>
                <Button color="danger" onPress={() => void submitCancellation()} isLoading={cancelBusy}>Batalkan penawaran</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {selectedDraft && orderId && !detailLoading && (
        <MobileQuoteActions
          canEdit={canEdit}
          chatBusy={chatBusy}
          stepBusy={stepBusy}
          currentStep={currentStep}
          stepIsOpen={stepIsOpen}
          mobileActionsOpen={mobileActionsOpen}
          setMobileActionsOpen={setMobileActionsOpen}
          onChat={() => void startBuyerChat()}
          onOpenQuoteSettings={() => setQuoteSettingsOpen(true)}
          onCancel={() => {
            setCancelError('');
            setCancelOpen(true);
          }}
          onOpenStep={() => {
            if (!currentStep) return;
            setStepFormData(currentStep.formData ?? {});
            setOpenStep(`${selectedDraft.id}::${currentStep.stepName}`);
          }}
          onCloseStep={() => setOpenStep(null)}
          onSaveStep={(complete) => currentStep && void saveStep(currentStep, complete)}
        />
      )}
      {selectedDraft && orderId && !detailLoading && (
        <Modal
          isOpen={quoteSettingsOpen}
          onOpenChange={setQuoteSettingsOpen}
          placement="bottom"
          size="full"
          classNames={{
            wrapper: 'items-end',
            base: `m-0 w-full max-w-none rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)] ${
              quoteSheetDragY !== 0 ? 'transition-none' : 'transition-[height,transform] duration-200'
            } ${
              quoteSheetExpanded ? 'h-[100vh] max-h-[100dvh]' : 'h-[90vh] max-h-[90dvh]'
            }`,
          }}
        >
          <ModalContent
            className="flex h-full flex-col"
            style={{ transform: `translateY(${quoteSheetDragY}px)` }}
          >
            {(onClose) => (
              <>
                <ModalHeader
                  className="flex shrink-0 touch-none select-none flex-col gap-3 border-b border-default-100 px-5 pb-4 pt-3"
                  onPointerDown={(event) => {
                    if (event.pointerType === 'mouse') return;
                    quoteSheetDragStartY.current = event.clientY;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const startY = quoteSheetDragStartY.current;
                    if (startY === null) return;
                    setQuoteSheetDragY(event.clientY - startY);
                  }}
                  onPointerUp={(event) => {
                    const startY = quoteSheetDragStartY.current;
                    quoteSheetDragStartY.current = null;
                    if (startY === null) return;
                    const deltaY = event.clientY - startY;
                    setQuoteSheetDragY(0);
                    if (quoteSaving) return;
                    if (deltaY < -60) {
                      setQuoteSheetExpanded(true);
                    } else if (deltaY > 100) {
                      if (quoteSheetExpanded) setQuoteSheetExpanded(false);
                      else setQuoteSettingsOpen(false);
                    }
                  }}
                  onPointerCancel={() => {
                    quoteSheetDragStartY.current = null;
                    setQuoteSheetDragY(0);
                  }}
                >
                  <span className="mx-auto h-1 w-10 rounded-full bg-default-300" aria-hidden="true" />
                  <span>Atur quotation &amp; termin</span>
                </ModalHeader>
                <ModalBody className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <QuotePricingPanel
                    canEdit={canEdit}
                    price={quotePrice}
                    setPrice={setQuotePrice}
                    terminEnabled={terminEnabled}
                    setTerminEnabled={setTerminEnabled}
                    terminRows={terminRows}
                    setTerminRows={setTerminRows}
                    updateTerminRow={updateTerminRow}
                    quoteSaving={quoteSaving}
                    onSaveQuote={() => void saveQuotation()}
                    className="border-0 p-0 shadow-none"
                  />
                  {detailError && <p role="alert" className="mt-4 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{detailError}</p>}
                </ModalBody>
                <ModalFooter className="shrink-0 border-t border-default-100 px-4 py-3">
                  <Button variant="bordered" onPress={onClose} isDisabled={quoteSaving}>Tutup</Button>
                  {canEdit && (
                    <Button
                      color="primary"
                      className="flex-1 font-semibold"
                      onPress={async () => {
                        if (await saveQuotation()) onClose();
                      }}
                      isLoading={quoteSaving}
                    >
                      Simpan quotation
                    </Button>
                  )}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </>
  );
}

function ActiveQuotes({
  drafts,
  loading,
  error,
  search,
  onSearch,
  onOpen,
  onRetry,
}: {
  drafts: DraftQuote[];
  loading: boolean;
  error: string;
  search: string;
  onSearch: (value: string) => void;
  onOpen: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Permintaan aktif</h2>
          <p className="mt-1 text-sm text-default-500">Tinjau detail, lengkapi survei, dan kirim harga final.</p>
        </div>
        <Input
          aria-label="Cari penawaran"
          placeholder="Cari pembeli, produk, lokasi…"
          value={search}
          onValueChange={onSearch}
          className="w-full sm:max-w-xs"
          isClearable
          onClear={() => onSearch('')}
        />
      </div>
      {error ? <ErrorState message={error} onRetry={onRetry} /> : loading ? (
        <LoadingState />
      ) : drafts.length === 0 ? (
        <EmptyState
          title={search ? 'Penawaran tidak ditemukan' : 'Belum ada permintaan penawaran'}
          description={search ? 'Coba kata kunci lain.' : 'Permintaan praorder dari pembeli akan muncul di sini.'}
          icon="quotes"
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-default-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-default-50 text-xs font-semibold uppercase tracking-wide text-default-500">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Pembeli</th>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3">Lokasi</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Harga</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"><span className="sr-only">Buka</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default-100">
                  {drafts.map((draft) => (
                    <tr
                      key={draft.id}
                      tabIndex={0}
                      role="link"
                      onClick={() => onOpen(draft.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen(draft.id);
                        }
                      }}
                      className="cursor-pointer outline-none hover:bg-default-50 focus-visible:bg-primary-50"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-default-600">{formatDate(draft.created_at)}</td>
                      <td className="max-w-[180px] truncate px-4 py-4 font-medium">{draft.buyer_identifier || 'Pembeli'}</td>
                      <td className="max-w-[220px] px-4 py-4">
                        <span className="block truncate font-semibold">{draft.product?.name || 'Produk'}</span>
                        <span className="mt-0.5 block text-xs text-default-500">Qty {draft.quantity}</span>
                      </td>
                      <td className="px-4 py-4 text-default-600">{draft.location?.name || 'Belum dipilih'}</td>
                      <td className="px-4 py-4 text-default-600">{draft.vendor?.name || 'Belum ditugaskan'}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold">{formatCurrency(draft.total_amount)}</td>
                      <td className="px-4 py-4"><QuoteStatus ready={readyForCheckout(draft)} /></td>
                      <td className="px-4 py-4 text-right"><span aria-hidden="true" className="text-lg text-default-400">›</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid gap-3 md:hidden">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => onOpen(draft.id)}
                className="flex w-full flex-col gap-3 rounded-2xl border border-default-200 bg-white p-4 text-left shadow-sm hover:border-primary-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{draft.product?.name || 'Produk'}</p>
                    <p className="mt-1 text-xs text-default-500">{formatDate(draft.created_at)}</p>
                  </div>
                  <QuoteStatus ready={readyForCheckout(draft)} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="min-w-0"><span className="text-default-500">Pembeli</span><p className="mt-1 truncate font-semibold">{draft.buyer_identifier || 'Pembeli'}</p></div>
                  <div><span className="text-default-500">Jumlah</span><p className="mt-1 font-semibold">Qty {draft.quantity}</p></div>
                  <div className="min-w-0"><span className="text-default-500">Lokasi</span><p className="mt-1 truncate font-semibold">{draft.location?.name || 'Belum dipilih'}</p></div>
                  <div className="min-w-0"><span className="text-default-500">Vendor</span><p className="mt-1 truncate font-semibold">{draft.vendor?.name || 'Belum ditugaskan'}</p></div>
                  <div><span className="text-default-500">Harga</span><p className="mt-1 font-semibold">{formatCurrency(draft.total_amount)}</p></div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function QuoteDetail({
  draft,
  websiteId,
  canEdit,
  price,
  setPrice,
  terminEnabled,
  setTerminEnabled,
  terminRows,
  setTerminRows,
  updateTerminRow,
  quoteSaving,
  onSaveQuote,
  chatBusy,
  onChat,
  onCancel,
  stepFormData,
  setStepFormData,
  openStep,
  setOpenStep,
  stepBusy,
  stepError,
  onSaveStep,
  detailError,
}: {
  draft: DraftQuote;
  websiteId: string;
  canEdit: boolean;
  price: string;
  setPrice: (value: string) => void;
  terminEnabled: boolean;
  setTerminEnabled: (enabled: boolean) => void;
  terminRows: TerminRow[];
  setTerminRows: (rows: TerminRow[]) => void;
  updateTerminRow: (index: number, patch: Partial<TerminRow>) => void;
  quoteSaving: boolean;
  onSaveQuote: () => void;
  chatBusy: boolean;
  onChat: () => void;
  onCancel: () => void;
  stepFormData: Record<string, unknown>;
  setStepFormData: (data: Record<string, unknown>) => void;
  openStep: string | null;
  setOpenStep: (key: string | null) => void;
  stepBusy: string | null;
  stepError: string;
  onSaveStep: (step: StepProgress, complete: boolean) => void;
  detailError: string;
}) {
  const finalPrice = Number(digitsOnly(price));
  const progressSteps = draft.praorderProgress?.steps ?? [];

  return (
    <div className="flex flex-col gap-4 pb-28 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-default-500">Tinjau detail dan lengkapi penawaran untuk pembeli.</p>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="bordered" startContent={<Icon name="chat" size={16} />} isLoading={chatBusy} onPress={onChat}>Chat pembeli</Button>
          {canEdit && <Button variant="bordered" color="danger" onPress={onCancel}>Batalkan penawaran</Button>}
        </div>
      </div>
      {detailError && <p role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{detailError}</p>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-2xl border border-default-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-default-100 p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-bold">{draft.product?.name || 'Produk'}</h2>
                <p className="mt-1 text-sm text-default-500">{formatDate(draft.created_at)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.vendor ? 'bg-success-50 text-success-700' : 'bg-default-100 text-default-600'}`}>
                {draft.vendor ? `Vendor · ${draft.vendor.name || 'Ditugaskan'}` : 'Belum ada vendor'}
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-5">
              <div className="h-36 overflow-hidden rounded-xl bg-default-100">
                {draft.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.product.images[0]} alt={draft.product.name || 'Produk'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-default-500">Tidak ada foto produk</div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <p className="line-clamp-3 text-sm leading-6 text-default-600">{draft.product?.description?.trim() || 'Belum ada deskripsi produk.'}</p>
                <dl className="grid grid-cols-2 gap-3 border-t border-default-100 pt-3 text-sm">
                  <div><dt className="text-xs text-default-500">Pembeli</dt><dd className="mt-1 break-words font-semibold">{draft.buyer_identifier || '—'}</dd></div>
                  <div><dt className="text-xs text-default-500">Jumlah</dt><dd className="mt-1 font-semibold">Qty {draft.quantity}</dd></div>
                  <div><dt className="text-xs text-default-500">Lokasi</dt><dd className="mt-1 font-semibold">{draft.location?.name || 'Belum dipilih'}</dd></div>
                  <div><dt className="text-xs text-default-500">{totalLabel(draft)}</dt><dd className="mt-1 font-semibold">{formatCurrency(draft.total_amount)}</dd></div>
                </dl>
              </div>
            </div>
          </section>

          {progressSteps.length > 0 && (
            <section className="rounded-2xl border border-default-200 bg-white p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="text-base font-bold">Proses praorder</h2>
                <p className="mt-1 text-sm text-default-500">{draft.praorderProgress?.flowName}</p>
              </div>
              <ol className="flex flex-col gap-3">
                {progressSteps.map((step, index) => {
                  const key = `${draft.id}::${step.stepName}`;
                  const priorCompleted = progressSteps.slice(0, index).every((item) => item.completed);
                  const current = !step.completed && priorCompleted;
                  const canComplete = current && step.filledBy === 'admin' && step.stepName !== 'Quotation' && canEdit;
                  return (
                    <li key={step.stepName} className="rounded-xl border border-default-200 p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{index + 1}. {step.stepName}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          step.completed ? 'bg-success-50 text-success-700' : current && step.filledBy === 'admin' ? 'bg-primary-50 text-primary-700' : 'bg-default-100 text-default-600'
                        }`}>
                          {step.completed ? 'Selesai' : !priorCompleted ? 'Menunggu langkah sebelumnya' : step.filledBy === 'buyer' ? 'Menunggu pembeli' : 'Giliran Anda'}
                        </span>
                      </div>
                      {step.description && <p className="mt-2 text-sm text-default-600">{step.description}</p>}
                      {canComplete && (
                        <div className="mt-3">
                          {openStep === key ? (
                            <div className="flex flex-col gap-3 rounded-xl bg-default-50 p-3">
                              {(step.formSchema ?? []).map((field) => (
                                <StepFieldInput
                                  key={field.key}
                                  field={field}
                                  websiteId={websiteId}
                                  value={stepFormData[field.key] ?? step.formData?.[field.key] ?? ''}
                                  onChange={(value) => setStepFormData({ ...stepFormData, [field.key]: value })}
                                />
                              ))}
                              {stepError && <p role="alert" className="text-sm text-danger">{stepError}</p>}
                              <div className="hidden flex-wrap justify-end gap-2 md:flex">
                                <Button size="sm" variant="light" onPress={() => setOpenStep(null)} isDisabled={stepBusy === key}>Tutup</Button>
                                <Button size="sm" variant="bordered" onPress={() => onSaveStep(step, false)} isLoading={stepBusy === key}>Simpan draft</Button>
                                <Button size="sm" color="primary" onPress={() => onSaveStep(step, true)} isLoading={stepBusy === key}>Kirim langkah</Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              className="hidden md:inline-flex"
                              onPress={() => {
                                setStepFormData(step.formData ?? {});
                                setOpenStep(key);
                              }}
                            >
                              Lengkapi {step.stepName}
                            </Button>
                          )}
                        </div>
                      )}
                      {step.completed && <div className="mt-3"><StepFieldValues schema={step.formSchema} data={step.formData} /></div>}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        <aside className="hidden flex-col gap-4 md:flex xl:sticky xl:top-4">
          <QuotePricingPanel
            canEdit={canEdit}
            price={price}
            setPrice={setPrice}
            terminEnabled={terminEnabled}
            setTerminEnabled={setTerminEnabled}
            terminRows={terminRows}
            setTerminRows={setTerminRows}
            updateTerminRow={updateTerminRow}
            quoteSaving={quoteSaving}
            onSaveQuote={() => void onSaveQuote()}
          />
        </aside>
      </div>
    </div>
  );
}

function QuotePricingPanel({
  canEdit,
  price,
  setPrice,
  terminEnabled,
  setTerminEnabled,
  terminRows,
  setTerminRows,
  updateTerminRow,
  quoteSaving,
  onSaveQuote,
  className = '',
}: {
  canEdit: boolean;
  price: string;
  setPrice: (value: string) => void;
  terminEnabled: boolean;
  setTerminEnabled: (enabled: boolean) => void;
  terminRows: TerminRow[];
  setTerminRows: (rows: TerminRow[]) => void;
  updateTerminRow: (index: number, patch: Partial<TerminRow>) => void;
  quoteSaving: boolean;
  onSaveQuote: () => void;
  className?: string;
}) {
  const finalPrice = Number(digitsOnly(price));
  const allocated = terminRows.reduce((total, row) => total + (Number(digitsOnly(row.amount)) || 0), 0);
  const difference = finalPrice - allocated;
  const progress = finalPrice > 0 ? Math.min(100, (allocated / finalPrice) * 100) : 0;

  return (
    <section className={`rounded-2xl border border-default-200 bg-white p-4 sm:p-5 ${className}`}>
      <div className="mb-4">
        <h2 className="text-base font-bold">Harga penawaran</h2>
        <p className="mt-1 text-sm text-default-500">Tetapkan harga final sebelum pembeli dapat checkout.</p>
      </div>
      <label htmlFor="quote-final-price" className="mb-1.5 block text-[13px] font-semibold">Harga final</label>
      <Input
        id="quote-final-price"
        aria-label="Harga final"
        value={maskInteger(price)}
        onValueChange={(value) => setPrice(digitsOnly(value))}
        isDisabled={!canEdit || quoteSaving}
        inputMode="numeric"
        startContent={<span className="text-sm text-default-500">Rp</span>}
        placeholder="Masukkan harga"
      />
      {canEdit ? (
        <p className="mt-2 text-xs leading-5 text-default-500">Harga ini akan menjadi total yang ditawarkan kepada pembeli.</p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-warning-700">Perlu role editor ke atas untuk mengubah harga penawaran.</p>
      )}
      {canEdit && (
        <div className="mt-4 border-t border-default-100 pt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={terminEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setTerminEnabled(enabled);
                if (enabled && terminRows.length < 2) setTerminRows(INITIAL_TERMIN_ROWS.map((row) => ({ ...row })));
              }}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span><span className="block text-sm font-semibold">Atur termin pembayaran</span><span className="mt-0.5 block text-xs text-default-500">Bagi harga final menjadi DP dan pembayaran lanjutan.</span></span>
          </label>
          {terminEnabled && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="rounded-xl bg-default-50 p-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-default-600">Alokasi pembayaran</span>
                  <span className="font-semibold">{formatCurrency(allocated)} / {formatCurrency(finalPrice || 0)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-default-200">
                  <div className={`h-full rounded-full ${difference < -1 ? 'bg-danger' : Math.abs(difference) <= 1 && finalPrice > 0 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                </div>
                <p className={`mt-2 text-xs font-semibold ${difference < -1 ? 'text-danger' : Math.abs(difference) <= 1 && finalPrice > 0 ? 'text-success-700' : 'text-warning-700'}`}>
                  {Math.abs(difference) <= 1 && finalPrice > 0 ? 'Total termin sesuai' : difference < -1 ? `Kelebihan ${formatCurrency(Math.abs(difference))}` : `Sisa ${formatCurrency(Math.max(0, difference))}`}
                </p>
              </div>
              {terminRows.map((row, index) => {
                const amount = Number(digitsOnly(row.amount)) || 0;
                const percentage = finalPrice > 0 ? Math.round((amount / finalPrice) * 100) : 0;
                const remaining = Math.max(0, difference + amount);
                const isLast = index === terminRows.length - 1;
                return (
                  <div key={index} className="rounded-xl border border-default-200 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">Termin {index + 1}{index === 0 && <span className="ml-1 font-normal text-default-500">· dibayar saat checkout</span>}</span>
                      <span className="text-xs font-semibold text-primary">{percentage}%</span>
                    </div>
                    <Input
                      label="Label"
                      value={row.label}
                      onValueChange={(value) => updateTerminRow(index, { label: value })}
                      isDisabled={quoteSaving}
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Input
                        label="Persentase"
                        type="number"
                        min={0}
                        max={100}
                        value={percentage ? String(percentage) : ''}
                        onValueChange={(value) => {
                          const nextPercent = Number(value);
                          updateTerminRow(index, {
                            amount: Number.isFinite(nextPercent) && finalPrice > 0
                              ? String(Math.round((finalPrice * nextPercent) / 100))
                              : '',
                          });
                        }}
                        isDisabled={quoteSaving}
                      />
                      <Input
                        label="Jumlah"
                        inputMode="numeric"
                        value={maskInteger(row.amount)}
                        onValueChange={(value) => updateTerminRow(index, { amount: digitsOnly(value) })}
                        isDisabled={quoteSaving}
                        startContent={<span className="text-xs text-default-500">Rp</span>}
                      />
                    </div>
                    {index > 0 && (
                      <Input
                        className="mt-3"
                        label="Muncul setelah langkah (opsional)"
                        value={row.anchor_step_name}
                        onValueChange={(value) => updateTerminRow(index, { anchor_step_name: value })}
                        isDisabled={quoteSaving}
                      />
                    )}
                    <div className="mt-3 flex justify-between">
                      {isLast && difference > 1 ? (
                        <Button size="sm" variant="flat" onPress={() => updateTerminRow(index, { amount: String(remaining) })}>Isi sisa</Button>
                      ) : <span />}
                      {index > 1 && <Button size="sm" variant="light" color="danger" onPress={() => setTerminRows(terminRows.filter((_, rowIndex) => rowIndex !== index))}>Hapus</Button>}
                    </div>
                  </div>
                );
              })}
              <Button
                size="sm"
                variant="bordered"
                onPress={() => setTerminRows([...terminRows, { label: `Termin ${terminRows.length + 1}`, amount: '', anchor_step_name: '' }])}
              >
                + Tambah termin
              </Button>
              <p className="text-xs leading-5 text-default-500">Total seluruh termin harus sama dengan harga final. Termin pertama menjadi jumlah saat checkout.</p>
            </div>
          )}
        </div>
      )}
      {canEdit && (
        <Button color="primary" fullWidth className="mt-5 hidden font-semibold md:flex" onPress={onSaveQuote} isLoading={quoteSaving}>
          Simpan quotation
        </Button>
      )}
      <p className="mt-3 rounded-xl bg-default-50 p-3 text-xs leading-5 text-default-500">Draft ini belum menjadi transaksi. Pembeli menyelesaikan checkout setelah harga final ditetapkan.</p>
    </section>
  );
}

function CancelledQuotesList({
  quotes,
  loading,
  error,
  onRetry,
}: {
  quotes: CancelledQuote[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <LoadingState />;
  if (quotes.length === 0) {
    return <EmptyState title="Belum ada penawaran dibatalkan" description="Penawaran yang dibatalkan akan tercatat di sini." icon="quotes" />;
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-default-200 bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-default-50 text-xs font-semibold uppercase tracking-wide text-default-500">
            <tr>
              <th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Pembeli</th><th className="px-4 py-3">Produk</th><th className="px-4 py-3">Harga quotation</th><th className="px-4 py-3">Alasan</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-default-100">
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="whitespace-nowrap px-4 py-4 text-xs">{formatDate(quote.created_at)}</td>
                <td className="px-4 py-4">{quote.buyer_identifier || 'Pembeli'}</td>
                <td className="px-4 py-4 font-semibold">{quote.product?.name || 'Produk'} · Qty {quote.quantity}</td>
                <td className="whitespace-nowrap px-4 py-4 font-semibold">{formatCurrency(quote.quoted_total_amount ?? quote.total_amount)}</td>
                <td className="max-w-[240px] truncate px-4 py-4 text-default-500">{cancellationReason(quote)}</td>
                <td className="px-4 py-4 text-right">
                  <Button as={Link} href={`/studio/orders/${encodeURIComponent(quote.id)}`} size="sm" variant="bordered">Detail</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {quotes.map((quote) => (
          <article key={quote.id} className="rounded-xl border border-default-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="text-sm font-bold">{quote.product?.name || 'Produk'}</p><p className="mt-1 text-xs text-default-500">{formatDate(quote.created_at)}</p></div>
              <span className="rounded-full bg-default-100 px-2.5 py-1 text-xs font-semibold">Dibatalkan</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-default-500">Pembeli</dt><dd className="mt-1 font-semibold">{quote.buyer_identifier || 'Pembeli'}</dd></div>
              <div><dt className="text-default-500">Harga</dt><dd className="mt-1 font-semibold">{formatCurrency(quote.quoted_total_amount ?? quote.total_amount)}</dd></div>
              <div className="col-span-2"><dt className="text-default-500">Alasan</dt><dd className="mt-1">{cancellationReason(quote)}</dd></div>
            </dl>
            <Button as={Link} href={`/studio/orders/${encodeURIComponent(quote.id)}`} size="sm" variant="bordered" className="mt-3">Lihat detail</Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function cancellationReason(quote: CancelledQuote): string {
  return typeof quote.metadata?.cancellation_reason === 'string'
    ? quote.metadata.cancellation_reason
    : 'Dibatalkan oleh penjual';
}

function QuoteStatus({ ready }: { ready: boolean }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${ready ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
      {ready ? 'Siap checkout' : 'Menunggu quotation'}
    </span>
  );
}

function LoadingState() {
  return (
    <div role="status" className="flex min-h-48 items-center justify-center rounded-2xl border border-default-200 bg-white text-sm text-default-500">
      Memuat penawaran…
    </div>
  );
}

function ErrorState({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger-200 bg-danger-50/40 px-5 py-10 text-center">
      <p className="text-sm text-danger-700">{message}</p>
      <div className="flex gap-2">
        {onBack && <Button variant="bordered" onPress={onBack}>Kembali ke daftar</Button>}
        <Button color="primary" variant="flat" onPress={onRetry}>Coba lagi</Button>
      </div>
    </div>
  );
}

function MobileQuoteActions({
  canEdit,
  chatBusy,
  stepBusy,
  currentStep,
  stepIsOpen,
  mobileActionsOpen,
  setMobileActionsOpen,
  onChat,
  onOpenQuoteSettings,
  onCancel,
  onOpenStep,
  onCloseStep,
  onSaveStep,
}: {
  canEdit: boolean;
  chatBusy: boolean;
  stepBusy: string | null;
  currentStep: StepProgress | null;
  stepIsOpen: boolean;
  mobileActionsOpen: boolean;
  setMobileActionsOpen: (open: boolean) => void;
  onChat: () => void;
  onOpenQuoteSettings: () => void;
  onCancel: () => void;
  onOpenStep: () => void;
  onCloseStep: () => void;
  onSaveStep: (complete: boolean) => void;
}) {
  const currentStepKey = currentStep ? `${currentStep.stepName}` : null;
  const busyForCurrentStep = Boolean(stepBusy && currentStepKey && stepBusy.endsWith(`::${currentStepKey}`));

  const run = (onAction: () => void, close: () => void) => {
    close();
    onAction();
  };

  return (
    <nav
      aria-label="Aksi penawaran"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-default-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <Button
        variant="bordered"
        className="min-h-12 flex-1 rounded-[12px] font-bold"
        startContent={<Icon name="chat" size={17} />}
        isLoading={chatBusy}
        onPress={onChat}
      >
        Chat pembeli
      </Button>
      {canEdit && (
        <Button
          color="primary"
          className="min-h-12 flex-1 rounded-[12px] font-bold"
          aria-haspopup="dialog"
          aria-expanded={mobileActionsOpen}
          onPress={() => setMobileActionsOpen(true)}
        >
          Aksi
        </Button>
      )}
      <Modal
        isOpen={mobileActionsOpen}
        onOpenChange={setMobileActionsOpen}
        placement="bottom"
        classNames={{
          wrapper: 'items-end',
          base: 'm-0 h-auto w-full max-w-none rounded-t-2xl rounded-b-none pb-[env(safe-area-inset-bottom)]',
        }}
      >
        <ModalContent>
          {(onClose) => {
            const actions: Array<{
              key: string;
              label: string;
              run: () => void;
              primary?: boolean;
              danger?: boolean;
              disabled?: boolean;
            }> = [
              ...(canEdit && currentStep && !stepIsOpen
                ? [{ key: 'open-step', label: `Lengkapi ${currentStep.stepName}`, run: onOpenStep }]
                : []),
              ...(canEdit && currentStep && stepIsOpen
                ? [
                    { key: 'close-step', label: 'Tutup pengisian langkah', run: onCloseStep },
                    { key: 'save-step-draft', label: 'Simpan draft langkah', run: () => onSaveStep(false), disabled: busyForCurrentStep },
                    { key: 'complete-step', label: `Kirim ${currentStep.stepName}`, run: () => onSaveStep(true), primary: true, disabled: busyForCurrentStep },
                  ]
                : []),
              ...(canEdit ? [{ key: 'quote-settings', label: 'Atur quotation & termin', run: onOpenQuoteSettings, primary: !stepIsOpen }] : []),
              ...(canEdit ? [{ key: 'cancel-quote', label: 'Batalkan penawaran', run: onCancel, danger: true }] : []),
            ];
            return (
              <>
                <ModalHeader className="flex flex-col gap-3 border-b border-default-100 px-5 pb-4 pt-3">
                  <span className="mx-auto h-1 w-10 rounded-full bg-default-300" aria-hidden="true" />
                  <span>Aksi penawaran</span>
                </ModalHeader>
                <ModalBody className="gap-1 px-3 py-3">
                  {actions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      disabled={action.disabled}
                      onClick={() => run(action.run, onClose)}
                      className={`min-h-12 rounded-xl px-3 text-left text-sm font-semibold hover:bg-default-100 disabled:opacity-60 ${
                        action.danger ? 'text-danger-700' : action.primary ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </ModalBody>
              </>
            );
          }}
        </ModalContent>
      </Modal>
    </nav>
  );
}
