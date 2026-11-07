'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '#cara-kerja', label: 'Cara kerja' },
  { href: '#fitur', label: 'Fitur' },
  { href: '#bisnis', label: 'Jenis bisnis' },
  { href: '#pricing', label: 'Harga & Paket' },
  { href: '#roadmap', label: 'Roadmap' },
  { href: '#faq', label: 'FAQ' },
  { href: '#kontak', label: 'Kontak' },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#eee7e0]/90 bg-[#fbf9f6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#55464a] transition-colors hover:bg-[#f0eae4] lg:hidden"
              aria-expanded={open}
              aria-controls="landing-mobile-menu"
              aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
              )}
            </button>

            <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={close}>
              <Image src="/studio-icon.svg" alt="" width={34} height={34} className="h-8 w-8 shrink-0 rounded-[10px]" />
              <p className="truncate text-base font-semibold tracking-tight text-[#302528] sm:text-lg">
                Bagdja <span className="font-normal text-[#776a64]">Website</span>
              </p>
            </Link>
          </div>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Navigasi utama">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-medium text-[#746963] transition-colors hover:text-[#681c3c]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/auth/login"
              className="hidden text-sm font-medium text-[#625653] transition-colors hover:text-[#681c3c] sm:inline"
            >
              Masuk
            </Link>
            <Link
              href="/auth/login"
              className="hidden rounded-full bg-[#681c3c] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#53142f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#681c3c] focus-visible:ring-offset-2 sm:inline-flex"
            >
              Mulai buat website
            </Link>
            {!open && (
              <Link
                href="/auth/login"
                className="rounded-full bg-[#681c3c] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#53142f] sm:hidden"
              >
                Mulai
              </Link>
            )}
          </div>
        </div>
      </header>

      {open && (
        <nav
          id="landing-mobile-menu"
          className="fixed inset-x-0 bottom-0 top-[68px] z-40 flex flex-col bg-[#fbf9f6] lg:hidden"
          aria-label="Menu mobile"
        >
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-xl px-3 py-3 text-lg font-medium text-[#44373a] transition-colors hover:bg-[#f0eae4]"
                    onClick={close}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-[#e9e1d9] pt-4">
              <Link
                href="/auth/login"
                className="block rounded-xl px-3 py-3 text-lg font-medium text-[#681c3c] transition-colors hover:bg-[#f5e9e9]"
                onClick={close}
              >
                Masuk
              </Link>
            </div>
          </div>

          <div className="shrink-0 border-t border-[#e9e1d9] bg-[#fbf9f6] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <Link
              href="/auth/login"
              className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#681c3c] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#53142f]"
              onClick={close}
            >
              Mulai buat website
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
