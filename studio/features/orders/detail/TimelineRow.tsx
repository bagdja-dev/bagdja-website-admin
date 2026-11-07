'use client';

import { Button } from '@heroui/react';
import type { ReactNode } from 'react';

import type { OrderTermin, TerminStatus } from '@/studio/api/order-detail';

import { formatMoney, PILL_CLASS, type PillTone } from './order-model';

export type RowState = 'done' | 'current' | 'waiting' | 'todo';
export type RowActor = 'seller' | 'buyer' | 'auto';

const DOT: Record<RowState, string> = {
  done: 'bg-success text-white',
  current: 'bg-primary text-white shadow-[0_0_0_4px_#F5DDE7]',
  waiting: 'border-2 border-warning-400 bg-warning-50 text-warning-800',
  todo: 'border-2 border-default-200 bg-white text-default-400',
};

const TITLE: Record<RowState, string> = {
  done: 'font-bold text-foreground',
  current: 'font-extrabold text-primary',
  waiting: 'font-bold text-foreground',
  todo: 'font-semibold text-default-500',
};

const ACTOR: Record<RowActor, { label: string; cls: string }> = {
  seller: { label: 'Oleh kamu', cls: 'bg-primary-50 text-primary' },
  buyer: { label: 'Oleh pembeli', cls: 'bg-[#EEF2FF] text-[#3730A3]' },
  auto: { label: 'Otomatis', cls: 'bg-default-100 text-default-600' },
};

export const CHIP = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold';

interface TimelineRowProps {
  mark: string;
  title: string;
  state: RowState;
  actor: RowActor;
  when?: string;
  last?: boolean;
  release?: { label: string; done: boolean } | null;
  children?: ReactNode;
}

/** Satu baris timeline vertikal (artboard 19): titik status, judul, pelaku, chip pencairan, isi. */
export function TimelineRow({ mark, title, state, actor, when, last, release, children }: TimelineRowProps) {
  return (
    <li className="flex gap-3.5">
      <span className="flex w-7 flex-none flex-col items-center">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${DOT[state]}`}>
          {state === 'done' ? '✓' : mark}
        </span>
        {!last && <span className={`min-h-[18px] w-0.5 flex-1 ${state === 'done' ? 'bg-success-200' : 'bg-default-200'}`} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1">
          <span className={`text-[15px] ${TITLE[state]}`}>{title}</span>
          {when && <span className="text-xs text-default-500">{when}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${CHIP} ${ACTOR[actor].cls}`}>{ACTOR[actor].label}</span>
          {release && (
            <span className={`${CHIP} ${release.done ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-800'}`}>
              {release.done ? `✓ ${release.label}` : release.label}
            </span>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

const TERMIN_STATUS: Record<TerminStatus, { label: string; tone: PillTone }> = {
  SCHEDULED: { label: 'Belum diterbitkan', tone: 'neutral' },
  ISSUED: { label: 'Menunggu dibayar', tone: 'warning' },
  PAID: { label: 'Lunas', tone: 'success' },
  CANCELLED: { label: 'Dibatalkan', tone: 'neutral' },
};

interface TerminRowProps {
  termin: OrderTermin;
  productName?: string;
  currency: string;
  canManage: boolean;
  busy: boolean;
  onIssue: () => void;
  last?: boolean;
}

/** Termin/tagihan tambahan disisipkan setelah langkah jangkarnya. */
export function TerminRow({ termin, productName, currency, canManage, busy, onIssue, last }: TerminRowProps) {
  const status = TERMIN_STATUS[termin.status];
  const state: RowState = termin.status === 'PAID' ? 'done' : termin.status === 'ISSUED' ? 'waiting' : 'todo';
  return (
    <TimelineRow mark="Rp" title={`Tagihan: ${termin.label}`} state={state} actor="buyer" last={last}>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-default-600">
        <span className="font-semibold text-foreground">{formatMoney(termin.amount, currency)}</span>
        {productName && <span>· {productName}</span>}
        <span className={`${CHIP} ${PILL_CLASS[status.tone]}`}>{status.label}</span>
        {termin.status === 'SCHEDULED' && canManage && (
          <Button size="sm" variant="bordered" className="ml-auto font-semibold" isLoading={busy} onPress={onIssue}>
            Terbitkan tagihan
          </Button>
        )}
      </div>
      {termin.anchorStepName && termin.status !== 'PAID' && termin.status !== 'CANCELLED' && (
        <p className="text-xs text-default-500">Langkah setelah &ldquo;{termin.anchorStepName}&rdquo; terkunci sampai tagihan ini lunas.</p>
      )}
    </TimelineRow>
  );
}
