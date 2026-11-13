'use client';

/**
 * Pemilih versi template package di detail template Studio
 * (plan/website-builder/template-candidate-trial-plan.md §7, revisi 12 Nov 2026).
 *
 * - Versi terbit: bebas dipilih (naik/turun), dipasang untuk semua pengunjung.
 * - Versi uji (kandidat): hanya terlihat oleh designer/reviewer yang berhak saat login.
 */
import { useEffect, useState } from 'react';

import { Spinner } from '@heroui/react';

import type { TemplateVersionOptionsDto } from '@/studio/api/template-trials';
import { buildPreviewDocument } from '@/studio/lib/template-preview-document';
import { fetchTemplateCandidatePreview } from '@/studio/api/template-trials';

export type TemplateVersionChoice =
  | { kind: 'published'; versionId: string; version: string }
  | { kind: 'candidate'; submissionId: string; version: string };

export function sameChoice(a: TemplateVersionChoice | null, b: TemplateVersionChoice | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === 'published'
    ? a.versionId === (b as Extract<TemplateVersionChoice, { kind: 'published' }>).versionId
    : a.submissionId === (b as Extract<TemplateVersionChoice, { kind: 'candidate' }>).submissionId;
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

export function TemplateVersionPicker({
  options,
  value,
  onChange,
  installedVersionId,
  trialSubmissionId,
  disabled,
}: {
  options: TemplateVersionOptionsDto;
  value: TemplateVersionChoice | null;
  onChange: (choice: TemplateVersionChoice) => void;
  /** Versi terbit yang terpasang di website (bila template yang sama). */
  installedVersionId: string | null;
  /** Kandidat yang sedang diuji di website ini. */
  trialSubmissionId: string | null;
  disabled?: boolean;
}) {
  const selected = value ? (value.kind === 'published' ? value.versionId : value.submissionId) : null;
  const row = (id: string, choice: TemplateVersionChoice, title: string, meta: string, badges: Array<[string, string]>) => (
    <label
      key={id}
      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
        selected === id ? 'border-primary-400 bg-primary-50' : 'border-default-200 bg-white hover:border-default-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input
        type="radio"
        name="template-version"
        className="mt-1 accent-[var(--heroui-primary)]"
        checked={selected === id}
        disabled={disabled}
        onChange={() => onChange(choice)}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badges.map(([label, tone]) => (
            <span key={label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
          ))}
        </span>
        {meta ? <span className="text-xs text-default-500">{meta}</span> : null}
      </span>
    </label>
  );

  return (
    <fieldset className="flex flex-col gap-2" aria-label="Pilih versi template">
      <legend className="mb-1 text-sm font-semibold text-foreground">Versi</legend>
      {options.published.map((version) => row(
        version.versionId,
        { kind: 'published', versionId: version.versionId, version: version.version },
        version.version,
        [formatDate(version.publishedAt), version.changelog].filter(Boolean).join(' · '),
        [
          ...(version.latest ? [['Terbaru', 'bg-default-100 text-default-700'] as [string, string]] : []),
          ...(version.versionId === installedVersionId ? [['Terpasang', 'bg-success-50 text-success-700'] as [string, string]] : []),
        ],
      ))}
      {options.candidates.map((candidate) => row(
        candidate.submissionId,
        { kind: 'candidate', submissionId: candidate.submissionId, version: candidate.version },
        candidate.version,
        `Versi uji · ${candidate.statusLabel} · hanya terlihat oleh Anda${candidate.viewerRole === 'reviewer' ? ' (reviewer)' : ''}`,
        [
          ['Belum terbit', 'bg-warning-50 text-warning-700'],
          ...(candidate.submissionId === trialSubmissionId ? [['Sedang diuji', 'bg-success-50 text-success-700'] as [string, string]] : []),
        ],
      ))}
      {options.published.length === 0 && options.candidates.length === 0 ? (
        <p className="text-xs text-default-500">Belum ada versi yang bisa dipilih.</p>
      ) : null}
    </fieldset>
  );
}

/** Pratinjau versi uji (fixture standar Bagdja + JS template) di panggung detail. */
export function CandidateVersionPreview({ submissionId, height = 600 }: { submissionId: string; height?: number }) {
  const [document, setDocument] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDocument(null);
    setFailed(false);
    fetchTemplateCandidatePreview(submissionId)
      .then((preview) => {
        if (!cancelled) setDocument(buildPreviewDocument(preview.html, preview.clientScript, true));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-default-300 bg-white" style={{ height }}>
      {document ? (
        <iframe title="Pratinjau versi uji" sandbox="allow-scripts" srcDoc={document} className="h-full w-full border-0" />
      ) : failed ? (
        <p className="flex h-full items-center justify-center p-6 text-center text-sm text-default-600">Pratinjau versi uji belum tersedia.</p>
      ) : (
        <div className="flex h-full items-center justify-center"><Spinner label="Memuat pratinjau versi uji..." /></div>
      )}
    </div>
  );
}
