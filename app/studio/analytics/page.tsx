'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchWebsiteAnalytics, type WebsiteAnalyticsOverview } from '@/studio/api/analytics';
import { errorMessage } from '@/studio/api/client';
import { useActiveWebsiteId } from '@/studio/stores/website-store';

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const NUMBER_FORMAT = new Intl.NumberFormat('id-ID');
const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <article className="rounded-2xl border border-default-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-default-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{NUMBER_FORMAT.format(value)}</p>
      <p className="mt-1 text-xs text-default-400">{note}</p>
    </article>
  );
}

function RankingList({ title, empty, rows }: { title: string; empty: string; rows: Array<{ label: string; count: number }> }) {
  return (
    <section className="rounded-2xl border border-default-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {rows.length ? (
        <ol className="mt-4 divide-y divide-default-100">
          {rows.map((row, index) => (
            <li key={`${row.label}-${index}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 break-all text-sm text-default-700">{row.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{NUMBER_FORMAT.format(row.count)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-default-500">{empty}</p>
      )}
    </section>
  );
}

export default function AnalyticsPage() {
  const websiteId = useActiveWebsiteId();
  const [period, setPeriod] = useState<Period>(7);
  const [data, setData] = useState<WebsiteAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!websiteId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchWebsiteAnalytics(websiteId, period);
      if (sequence === requestSequence.current) setData(overview);
    } catch (loadError) {
      if (sequence === requestSequence.current) {
        setError(errorMessage(loadError, 'Gagal memuat statistik website.'));
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [period, websiteId]);

  useEffect(() => {
    void load();
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  const maxPageViews = Math.max(1, ...(data?.daily.map((day) => day.pageViews) ?? []));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Statistik Website</h1>
          <p className="mt-1 max-w-2xl text-sm text-default-500">
            Pantau kunjungan, halaman populer, sumber trafik, dan klik tombol penting.
          </p>
        </div>
        <div className="flex self-start rounded-xl border border-default-200 bg-white p-1" aria-label="Rentang statistik">
          {PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriod(days)}
              aria-pressed={period === days}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${period === days ? 'bg-primary text-white' : 'text-default-600 hover:bg-default-100'}`}
            >
              {days} hari
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <section role="alert" className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-3 font-semibold underline">Coba lagi</button>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Kunjungan halaman" value={data?.summary.pageViews ?? 0} note={`Total ${period} hari terakhir`} />
            <SummaryCard label="Pengunjung unik (perkiraan)" value={data?.summary.uniqueVisitors ?? 0} note="Dihitung dari ID sesi sementara" />
            <SummaryCard label="Klik tombol penting" value={data?.summary.ctaClicks ?? 0} note="Pesan, WhatsApp, booking, dan CTA lain" />
          </section>

          <section className="rounded-2xl border border-default-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">Tren kunjungan</h2>
              <p className="text-xs text-default-400">Tanggal menggunakan zona waktu UTC</p>
            </div>
            {loading ? (
              <p className="py-12 text-center text-sm text-default-500">Memuat statistik…</p>
            ) : data?.daily.some((day) => day.pageViews > 0) ? (
              <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2">
                {data.daily.map((day) => (
                  <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] tabular-nums text-default-500">
                      {day.pageViews ? NUMBER_FORMAT.format(day.pageViews) : ''}
                    </span>
                    <div className="flex h-32 w-full items-end rounded-t-md bg-primary-50">
                      <div
                        className="w-full rounded-t-md bg-primary transition-[height]"
                        style={{ height: `${Math.max(day.pageViews > 0 ? 5 : 0, (day.pageViews / maxPageViews) * 100)}%` }}
                        title={`${day.date}: ${day.pageViews} kunjungan`}
                      />
                    </div>
                    <time dateTime={day.date} className="text-[10px] text-default-500 sm:text-xs">
                      {DATE_FORMAT.format(new Date(`${day.date}T00:00:00Z`))}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-default-500">
                Belum ada data kunjungan untuk rentang ini. Statistik akan muncul setelah website menerima kunjungan.
              </p>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <RankingList title="Halaman populer" empty="Belum ada halaman yang tercatat." rows={data?.topPages ?? []} />
            <RankingList title="Sumber kunjungan" empty="Belum ada sumber kunjungan yang tercatat." rows={data?.topSources ?? []} />
            <RankingList title="Klik CTA terbanyak" empty="Belum ada klik CTA yang tercatat." rows={data?.topCtas ?? []} />
          </section>

          <p className="text-xs leading-relaxed text-default-400">
            Statistik memakai ID sesi acak sementara. Kami tidak menyimpan alamat IP atau user-agent. Pengunjung yang memblokir penyimpanan browser mungkin dihitung sebagai beberapa sesi.
          </p>
        </>
      )}
    </main>
  );
}
