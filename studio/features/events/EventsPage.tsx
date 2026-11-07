'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchGatheringCalendar, type GatheringCalendarItem, type GatheringOccurrenceStatus } from '@/studio/api/gatherings';
import { errorMessage } from '@/studio/api/client';
import { useActiveWebsiteId } from '@/studio/stores/website-store';
import { EmptyState } from '@/studio/ui/primitives/EmptyState';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { Icon } from '@/studio/ui/icons';

type EventStatus = GatheringOccurrenceStatus;

const LABEL: Record<EventStatus, string> = {
  DRAFT: 'Rencana',
  PREORDER: 'Rencana',
  RSVP_OPEN: 'Rencana',
  PAYMENT_OPEN: 'Pembayaran peserta',
  CONFIRMED: 'Terkonfirmasi',
  IN_PROGRESS: 'Berlangsung',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

function localDateKey(value: string | Date | null): string {
  if (!value) return 'unscheduled';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'unscheduled';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatSchedule(value: string | null): string {
  if (!value) return 'Jadwal belum ditentukan';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function isPlan(status: EventStatus): boolean {
  return status === 'DRAFT' || status === 'PREORDER' || status === 'RSVP_OPEN' || status === 'PAYMENT_OPEN';
}

function isAgendaItem(row: GatheringCalendarItem, includePlans: boolean, includePast: boolean, today: string): boolean {
  const status = row.occurrence.status;
  const date = localDateKey(row.occurrence.final_schedule);
  const active = status === 'CONFIRMED' || status === 'IN_PROGRESS';
  const pastEvent = includePast && date !== 'unscheduled' && date < today &&
    (status === 'CONFIRMED' || status === 'IN_PROGRESS' || status === 'COMPLETED');
  return pastEvent ||
    (active && (status === 'IN_PROGRESS' || date === 'unscheduled' || date >= today)) ||
    (includePlans && isPlan(status));
}

function statusTone(status: EventStatus): string {
  if (status === 'CONFIRMED') return 'bg-green-50 text-green-700';
  if (status === 'PAYMENT_OPEN') return 'bg-amber-50 text-amber-800';
  if (status === 'IN_PROGRESS') return 'bg-[#FBF2F6] text-[#7A1E48]';
  return 'bg-default-100 text-default-700';
}

function groupByDate(rows: GatheringCalendarItem[]): Array<[string, GatheringCalendarItem[]]> {
  const groups = new Map<string, GatheringCalendarItem[]>();
  for (const row of rows) {
    const key = localDateKey(row.occurrence.final_schedule);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === 'unscheduled') return 1;
    if (b === 'unscheduled') return -1;
    return a.localeCompare(b);
  });
}

function groupTitle(key: string): string {
  if (key === 'unscheduled') return 'Jadwal belum ditentukan';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (key === localDateKey(new Date())) return 'Hari ini';
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function calendarDates(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const cellCount = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2024, index, 1)),
);

function MonthYearPicker({
  value,
  onChange,
  className,
  popupClassName,
}: {
  value: Date;
  onChange: (date: Date) => void;
  className: string;
  popupClassName: string;
}) {
  const [openDropdown, setOpenDropdown] = useState<'month' | 'year' | null>(null);
  const [yearOffset, setYearOffset] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDropdown) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpenDropdown(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openDropdown]);

  const toggleDropdown = (dropdown: 'month' | 'year') => {
    setOpenDropdown((current) => current === dropdown ? null : dropdown);
    if (dropdown === 'year') setYearOffset(0);
  };
  const yearOptions = Array.from({ length: 12 }, (_, index) => value.getFullYear() + yearOffset - 5 + index);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex w-full min-w-0 items-center justify-center gap-1">
        <button
          type="button"
          aria-expanded={openDropdown === 'month'}
          aria-haspopup="listbox"
          onClick={() => toggleDropdown('month')}
          className="inline-flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-semibold capitalize text-foreground hover:bg-default-100 md:text-base"
        >
          <span className="truncate">{MONTH_NAMES[value.getMonth()]}</span>
          <Icon name="chevronDown" size={14} className={`shrink-0 transition-transform ${openDropdown === 'month' ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          aria-expanded={openDropdown === 'year'}
          aria-haspopup="listbox"
          onClick={() => toggleDropdown('year')}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-semibold text-foreground hover:bg-default-100 md:text-base"
        >
          {value.getFullYear()}
          <Icon name="chevronDown" size={14} className={`shrink-0 transition-transform ${openDropdown === 'year' ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {openDropdown && (
        <div className={`absolute z-40 w-40 overflow-hidden rounded-xl border border-default-200 bg-white py-1 shadow-xl ${popupClassName}`}>
          {openDropdown === 'month' ? (
            <div role="listbox" aria-label="Pilih bulan" className="max-h-[min(60vh,20rem)] overflow-y-auto">
              {MONTH_NAMES.map((name, index) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={value.getMonth() === index}
                  onClick={() => {
                    onChange(new Date(value.getFullYear(), index, 1));
                    setOpenDropdown(null);
                  }}
                  className={`flex min-h-9 w-full items-center px-3 text-left text-sm capitalize ${value.getMonth() === index ? 'bg-[#FBF2F6] font-semibold text-[#7A1E48]' : 'text-default-700 hover:bg-default-50'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-default-100 px-2 py-1">
                <button
                  type="button"
                  aria-label="Tahun sebelumnya"
                  onClick={() => setYearOffset((offset) => offset - 12)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-default-600 hover:bg-default-100"
                >
                  ‹
                </button>
                <span className="text-xs font-semibold text-default-500">{yearOptions[0]}–{yearOptions[yearOptions.length - 1]}</span>
                <button
                  type="button"
                  aria-label="Tahun berikutnya"
                  onClick={() => setYearOffset((offset) => offset + 12)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-default-600 hover:bg-default-100"
                >
                  ›
                </button>
              </div>
              <div role="listbox" aria-label="Pilih tahun" className="max-h-[min(60vh,20rem)] overflow-y-auto">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    type="button"
                    role="option"
                    aria-selected={value.getFullYear() === year}
                    onClick={() => {
                      onChange(new Date(year, value.getMonth(), 1));
                      setOpenDropdown(null);
                    }}
                    className={`flex min-h-9 w-full items-center px-3 text-left text-sm ${value.getFullYear() === year ? 'bg-[#FBF2F6] font-semibold text-[#7A1E48]' : 'text-default-700 hover:bg-default-50'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' }).format(date);
}

function AgendaCard({ row }: { row: GatheringCalendarItem }) {
  const status = row.occurrence.status;
  const detailHref = `/studio/orders/gathering/${encodeURIComponent(row.id)}`;
  const checkInHref = `${detailHref}?checkin=1`;
  return (
    <article className="rounded-2xl border border-default-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[15px] font-bold text-foreground">{row.title}</h3>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}>{LABEL[status]}</span>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-default-600">
          <Icon name="calendar" size={15} /> {formatSchedule(row.occurrence.final_schedule)}
        </p>
        <p className="mt-1 text-xs text-default-500">
          {row.occurrence.final_location || 'Lokasi belum ditentukan'} · {row.paid_seat_count}/{row.occurrence.max_attendees} peserta lunas
        </p>
      </div>
      <div className="mt-4 flex gap-2 sm:mt-0">
        <Link href={checkInHref} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-[#7A1E48] px-3 text-center text-sm font-semibold text-[#7A1E48] hover:bg-[#FBF2F6] sm:flex-none">
          Check-in
        </Link>
        <Link href={detailHref} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-[#7A1E48] px-3 text-center text-sm font-bold text-white hover:bg-[#641838] sm:flex-none">
          Buka detail
        </Link>
      </div>
    </article>
  );
}

function CalendarView({ rows, month, onMonthChange }: {
  rows: GatheringCalendarItem[];
  month: Date;
  onMonthChange: (month: Date) => void;
}) {
  const dates = calendarDates(month);
  const eventsByDate = useMemo(() => {
    const groups = new Map<string, GatheringCalendarItem[]>();
    rows.forEach((row) => {
      const key = localDateKey(row.occurrence.final_schedule);
      if (key !== 'unscheduled') groups.set(key, [...(groups.get(key) ?? []), row]);
    });
    return groups;
  }, [rows]);
  const unscheduled = rows.filter((row) => !row.occurrence.final_schedule);
  const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="rounded-2xl border border-default-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default-200 px-4 py-3">
        <p className="text-sm font-bold capitalize text-foreground md:hidden">
          {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month)}
        </p>
        <MonthYearPicker
          value={month}
          onChange={onMonthChange}
          className="hidden min-h-10 items-center gap-2 rounded-xl px-2 text-base font-bold capitalize text-foreground hover:bg-default-50 md:flex"
          popupClassName="left-0 top-full mt-2"
        />
        <div className="hidden items-center gap-2 md:flex">
          <button type="button" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Bulan sebelumnya" className="flex h-10 w-10 items-center justify-center rounded-xl border border-default-300 text-lg text-foreground hover:bg-default-50">‹</button>
          <button type="button" onClick={() => onMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="h-10 rounded-xl border border-default-300 px-3 text-sm font-semibold text-foreground hover:bg-default-50">Hari ini</button>
          <button type="button" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Bulan berikutnya" className="flex h-10 w-10 items-center justify-center rounded-xl border border-default-300 text-lg text-foreground hover:bg-default-50">›</button>
        </div>
      </div>
      {rows.length === 0 && (
        <EmptyState compact icon="calendar" title="Belum ada acara mendatang" description="Acara terkonfirmasi yang akan datang akan muncul di kalender." />
      )}
      <div className="grid grid-cols-7 border-b border-default-200 bg-default-50">
        {weekdays.map((day) => <div key={day} className="px-1 py-2 text-center text-[11px] font-bold text-default-600 sm:px-2 sm:text-xs">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const dateKey = localDateKey(date);
          const dayRows = eventsByDate.get(dateKey) ?? [];
          const inMonth = date.getMonth() === month.getMonth();
          const isToday = dateKey === localDateKey(new Date());
          return (
            <div key={dateKey} className={`min-h-[86px] border-b border-r border-default-200 p-1 sm:min-h-[120px] sm:p-2 ${inMonth ? 'bg-white' : 'bg-default-50/70'}`}>
              <span className={`mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${isToday ? 'bg-[#7A1E48] font-bold text-white' : inMonth ? 'text-default-700' : 'text-default-400'}`}>
                {date.getDate()}
              </span>
              <div className="flex flex-col gap-1">
                {dayRows.slice(0, 3).map((row) => (
                  <Link key={row.id} href={`/studio/orders/gathering/${encodeURIComponent(row.id)}`} title={`${row.title} · ${LABEL[row.occurrence.status]}`} className="rounded-md bg-[#FBF2F6] px-1.5 py-1 text-[10px] leading-tight text-[#7A1E48] hover:bg-[#F4E3EB] sm:text-xs">
                    <span className="block truncate font-semibold">{row.title}</span>
                    <span className="hidden truncate sm:block">{formatTime(row.occurrence.final_schedule)} · {LABEL[row.occurrence.status]}</span>
                  </Link>
                ))}
                {dayRows.length > 3 && <span className="px-1 text-[10px] text-default-600">+{dayRows.length - 3} acara</span>}
              </div>
            </div>
          );
        })}
      </div>
      {unscheduled.length > 0 && (
        <section className="border-t border-default-200 p-4">
          <h3 className="mb-2 text-sm font-bold text-default-700">Jadwal belum ditentukan</h3>
          <div className="flex flex-col gap-2">{unscheduled.map((row) => <AgendaCard key={row.id} row={row} />)}</div>
        </section>
      )}
    </div>
  );
}

function MobileCalendarNav({
  viewMode,
  onViewModeChange,
  showPlans,
  onShowPlansChange,
  showPast,
  onShowPastChange,
  loading,
  onReload,
  month,
  onMonthChange,
}: {
  viewMode: 'calendar' | 'list';
  onViewModeChange: (mode: 'calendar' | 'list') => void;
  showPlans: boolean;
  onShowPlansChange: (show: boolean) => void;
  showPast: boolean;
  onShowPastChange: (show: boolean) => void;
  loading: boolean;
  onReload: () => void;
  month: Date;
  onMonthChange: (month: Date) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center md:hidden">
      <div className="pointer-events-auto mb-2 flex min-h-11 items-center gap-4 rounded-full border border-default-200 bg-white px-4 shadow-lg">
        <button
          type="button"
          role="switch"
          aria-checked={showPlans}
          aria-label="Tampilkan rencana"
          onClick={() => onShowPlansChange(!showPlans)}
          className="inline-flex items-center gap-2"
        >
          <span className="text-sm font-semibold text-default-700">Rencana</span>
          <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition-colors ${showPlans ? 'bg-[#7A1E48]' : 'bg-default-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${showPlans ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </span>
        </button>
        <span aria-hidden="true" className="h-6 w-px bg-default-200" />
        <button
          type="button"
          role="switch"
          aria-checked={showPast}
          aria-label="Tampilkan acara sebelumnya"
          onClick={() => onShowPastChange(!showPast)}
          className="inline-flex items-center gap-2"
        >
          <span className="text-sm font-semibold text-default-700">Sebelumnya</span>
          <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition-colors ${showPast ? 'bg-[#7A1E48]' : 'bg-default-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${showPast ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </span>
        </button>
      </div>
      <nav
        aria-label="Navigasi kalender"
        className="pointer-events-auto flex w-full flex-col gap-2 border-t border-default-200 bg-white/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 rounded-xl bg-default-100 p-1" role="group" aria-label="Mode tampilan kalender">
            {([
              ['calendar', 'Kalender'],
              ['list', 'Daftar'],
            ] as const).map(([mode, label]) => (
              <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => onViewModeChange(mode)} className={`min-h-9 flex-1 rounded-lg px-2 text-sm font-semibold ${viewMode === mode ? 'bg-white text-[#7A1E48] shadow-sm' : 'text-default-600'}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onReload} disabled={loading} aria-label="Muat ulang kalender" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-default-300 text-foreground disabled:opacity-50">
            <span aria-hidden="true" className={loading ? 'animate-spin' : ''}>↻</span>
          </button>
        </div>
        {viewMode === 'calendar' && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Bulan sebelumnya" className="flex h-10 w-10 items-center justify-center rounded-xl border border-default-300 text-lg text-foreground">‹</button>
            <MonthYearPicker
              value={month}
              onChange={onMonthChange}
              className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-default-300 px-3 text-sm font-bold capitalize text-foreground"
              popupClassName="bottom-full right-0 mb-3"
            />
            <button type="button" onClick={() => onMonthChange(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="h-10 shrink-0 rounded-xl border border-default-300 px-3 text-sm font-semibold text-foreground">Hari ini</button>
            <button type="button" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Bulan berikutnya" className="flex h-10 w-10 items-center justify-center rounded-xl border border-default-300 text-lg text-foreground">›</button>
          </div>
        )}
      </nav>
    </div>
  );
}

export function EventsPage() {
  const websiteId = useActiveWebsiteId();
  const [rows, setRows] = useState<GatheringCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPlans, setShowPlans] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const load = useCallback(async () => {
    if (!websiteId) return;
    setLoading(true);
    setError('');
    try {
      setRows(await fetchGatheringCalendar(websiteId));
    } catch (reason) {
      setError(errorMessage(reason, 'Gagal memuat jadwal acara.'));
    } finally {
      setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = localDateKey(new Date());
  const filteredRows = useMemo(() => rows
    .filter((row) => isAgendaItem(row, showPlans, showPast, today))
    .sort((a, b) => {
      const aDate = a.occurrence.final_schedule ? new Date(a.occurrence.final_schedule).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.occurrence.final_schedule ? new Date(b.occurrence.final_schedule).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    }), [rows, showPlans, showPast, today]);
  const agenda = useMemo(() => {
    return groupByDate(filteredRows);
  }, [filteredRows]);

  return (
    <>
      <PageHeader title="Kalender" description="Lihat agenda acara dan buka pintasan check-in." />
      <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-3 pb-36 md:px-0 md:pb-20">
        <div className="hidden flex-wrap items-center justify-between gap-3 rounded-2xl border border-default-200 bg-white p-4 md:flex">
          <div className="flex rounded-xl bg-default-100 p-1" role="group" aria-label="Mode tampilan kalender">
            {([
              ['calendar', 'Kalender'],
              ['list', 'Daftar'],
            ] as const).map(([mode, label]) => (
              <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)} className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors ${viewMode === mode ? 'bg-white text-[#7A1E48] shadow-sm' : 'text-default-600 hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              checked={showPlans}
              onChange={(event) => setShowPlans(event.currentTarget.checked)}
              className="h-4 w-4 accent-[#7A1E48]"
            />
            Tampilkan rencana
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(event) => setShowPast(event.currentTarget.checked)}
              className="h-4 w-4 accent-[#7A1E48]"
            />
            Tampilkan acara sebelumnya
          </label>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 rounded-xl border border-default-300 px-3 text-sm font-semibold text-foreground hover:bg-default-50 disabled:opacity-50">
            {loading ? 'Memuat…' : 'Muat ulang'}
          </button>
        </div>
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>Kalender gagal dimuat: {error}</span>
            <button type="button" onClick={() => void load()} className="font-semibold underline">Coba lagi</button>
          </div>
        )}
        {loading && rows.length === 0 ? (
          <div className="flex flex-col gap-3" aria-busy="true">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-default-100" />)}</div>
        ) : viewMode === 'calendar' ? (
          <CalendarView rows={filteredRows} month={displayMonth} onMonthChange={setDisplayMonth} />
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-default-200 bg-white">
            <EmptyState compact icon="calendar" title="Belum ada acara mendatang" description={showPlans ? 'Rencana dan acara yang akan datang akan muncul di sini.' : 'Acara terkonfirmasi yang akan datang akan muncul di sini.'} />
          </div>
        ) : agenda.map(([date, items]) => (
          <section key={date} aria-label={groupTitle(date)}>
            <h2 className="mb-2 text-sm font-bold capitalize text-default-700">{groupTitle(date)}</h2>
            <div className="flex flex-col gap-2.5">{items.map((row) => <AgendaCard key={row.id} row={row} />)}</div>
          </section>
        ))}
      </main>
      <MobileCalendarNav
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showPlans={showPlans}
        onShowPlansChange={setShowPlans}
        showPast={showPast}
        onShowPastChange={setShowPast}
        loading={loading}
        onReload={() => void load()}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
      />
    </>
  );
}
