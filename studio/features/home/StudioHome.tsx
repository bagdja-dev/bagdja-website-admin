'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { buildTenantWebUrl, displayHost } from '@/studio/lib/template-preview';
import { useActiveWebsite } from '@/studio/stores/website-store';
import { PageHeader } from '@/studio/ui/primitives/PageHeader';
import { siteTileColor } from '@/studio/ui/shell/site-identity';

/**
 * Beranda placeholder S2, tata letak mengikuti artboard "5 · Beranda": kolom kiri
 * (checklist §3.6 menyusul di S3), kolom kanan kartu website + "Butuh fitur lain?".
 */
export function StudioHome() {
  const active = useActiveWebsite();
  const [welcome, setWelcome] = useState(false);

  // `?welcome=1` dari layar "Website jadi" (dibaca setelah mount → aman hidrasi, tanpa Suspense).
  useEffect(() => {
    setWelcome(new URLSearchParams(window.location.search).get('welcome') === '1');
  }, []);

  if (!active) return null;
  const { website } = active;
  const tile = siteTileColor(website.id);
  const url = buildTenantWebUrl(website.slug);

  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <PageHeader title="Beranda" />
      <section className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-default-200 bg-white p-6 lg:flex-[999_1_460px]">
        <h2 className="text-xl font-extrabold tracking-[-0.01em] text-foreground">
          {welcome ? `Selamat datang di ${website.name}!` : 'Siapkan website kamu'}
        </h2>
        <p className="text-sm text-default-600">
          Panduan langkah demi langkah (logo, halaman depan, produk pertama, tim) akan tampil di sini.
        </p>
      </section>

      <aside className="flex w-full min-w-0 flex-col gap-4 lg:flex-[1_1_300px]">
        <section className="overflow-hidden rounded-2xl border border-default-200 bg-white">
          <div aria-hidden="true" className="flex h-[120px] flex-col justify-end gap-2 p-4" style={{ background: '#1C1917' }}>
            <span className="h-2 w-2/5 rounded" style={{ background: tile.bg }} />
            <span className="h-3.5 w-3/4 rounded bg-[#FAFAF9] opacity-90" />
            <span className="h-3.5 w-[55%] rounded bg-[#FAFAF9] opacity-50" />
          </div>
          <div className="flex flex-col gap-2.5 p-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              {website.is_active ? 'Online' : 'Nonaktif'}
            </span>
            <span className="truncate text-sm font-semibold">{displayHost(website.slug)}</span>
            <div className="flex gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[10px] border border-default-300 text-[13px] font-semibold text-foreground no-underline hover:bg-default-50"
              >
                Lihat website
              </a>
              <Link
                href="/studio/appearance"
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[10px] bg-foreground text-[13px] font-semibold text-white no-underline"
              >
                Edit tampilan
              </Link>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border border-primary-200 bg-primary-50 p-4">
          <span className="text-sm font-bold text-primary-700">Butuh fitur lain?</span>
          <span className="text-[13px] leading-normal text-primary-700">
            Penawaran harga, Vendor, Kalender Acara, dan lainnya bisa diaktifkan kapan saja.
          </span>
          <Link href="/studio/features" className="text-[13px] font-bold text-primary">
            Lihat semua fitur →
          </Link>
        </section>
      </aside>
    </div>
  );
}
