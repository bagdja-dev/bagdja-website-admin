'use client';

import {
  Button,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from '@heroui/react';
import Link from 'next/link';
import { useState } from 'react';

const features = [
  {
    title: 'Website Instan UMKM',
    desc: 'Buat website profesional dalam hitungan menit. Pilih template, isi konten, langsung online.',
    gradient: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    title: 'Multi-Tenant & Multi-Staff',
    desc: 'Kelola banyak website dari satu akun. Undang tim dengan role berbeda: owner, admin, editor.',
    gradient: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    title: 'Katalog Produk & Layanan',
    desc: 'Tampilkan produk, harga, dan gambar. Cocok untuk toko, barbershop, salon, restoran.',
    gradient: 'from-amber-500 to-orange-400',
    bg: 'bg-amber-50',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
  {
    title: 'Desain Responsif',
    desc: 'Semua template dioptimalkan untuk mobile, tablet, dan desktop. Akses dari mana saja.',
    gradient: 'from-emerald-500 to-teal-400',
    bg: 'bg-emerald-50',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: 'Page Builder Visual',
    desc: 'Susun halaman dengan section: hero, gallery, pricing, testimonial. Tanpa coding.',
    gradient: 'from-rose-500 to-pink-400',
    bg: 'bg-rose-50',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
      </svg>
    ),
  },
  {
    title: 'Ekosistem Bagdja',
    desc: 'Login via SSO, pembayaran via Bagdja Wallet, analitik, semuanya satu platform.',
    gradient: 'from-indigo-500 to-blue-400',
    bg: 'bg-indigo-50',
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
];

const stats = [
  { value: '10+', label: 'Template Siap Pakai' },
  { value: '5 menit', label: 'Setup Website' },
  { value: '100%', label: 'Mobile Friendly' },
  { value: '24/7', label: 'Online Tanpa Henti' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navbar ─────────────────────────────────────── */}
      <Navbar
        maxWidth="xl"
        isMenuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        className="glass fixed top-0 z-50 border-b border-white/20"
        height="4rem"
      >
        <NavbarContent>
          <NavbarMenuToggle className="sm:hidden" />
          <NavbarBrand>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
                <span className="text-sm font-bold text-white">B</span>
              </div>
              <p className="text-lg font-bold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Bagdja</span>
                <span className="text-gray-800"> Website</span>
              </p>
            </div>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="hidden gap-8 sm:flex" justify="center">
          <NavbarItem>
            <Link href="#features" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
              Fitur
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link href="#how-it-works" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
              Cara Kerja
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link href="#stats" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
              Keunggulan
            </Link>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent justify="end">
          <NavbarItem className="hidden sm:flex">
            <Link href="/auth/login" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
              Masuk
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Button
              as={Link}
              href="/auth/login"
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-cyan-500 font-semibold text-white shadow-lg shadow-blue-500/25"
            >
              Mulai Gratis
            </Button>
          </NavbarItem>
        </NavbarContent>

        <NavbarMenu className="pt-6">
          <NavbarMenuItem>
            <Link href="#features" className="w-full text-lg" onClick={() => setMenuOpen(false)}>
              Fitur
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link href="#how-it-works" className="w-full text-lg" onClick={() => setMenuOpen(false)}>
              Cara Kerja
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link href="/auth/login" className="w-full text-lg font-semibold text-blue-600">
              Masuk
            </Link>
          </NavbarMenuItem>
        </NavbarMenu>
      </Navbar>

      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:pb-32 sm:pt-40">
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50" />
          <div className="animate-pulse-glow absolute -left-32 top-20 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-300/20 blur-3xl" />
          <div className="animate-pulse-glow absolute -right-32 bottom-20 h-96 w-96 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-300/20 blur-3xl" style={{ animationDelay: '2s' }} />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200/10 to-orange-200/10 blur-3xl" />
        </div>

        {/* Floating shapes */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="animate-float absolute left-[10%] top-[20%] h-16 w-16 rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-100/40 to-blue-50/40 backdrop-blur-sm" />
          <div className="animate-float-slow absolute right-[15%] top-[30%] h-12 w-12 rounded-full border border-violet-200/50 bg-gradient-to-br from-violet-100/40 to-violet-50/40 backdrop-blur-sm" style={{ animationDelay: '1s' }} />
          <div className="animate-float absolute bottom-[25%] left-[20%] h-10 w-10 rounded-xl border border-cyan-200/50 bg-gradient-to-br from-cyan-100/40 to-cyan-50/40 backdrop-blur-sm" style={{ animationDelay: '3s' }} />
          <div className="animate-float-slow absolute bottom-[30%] right-[10%] h-14 w-14 rounded-2xl border border-amber-200/50 bg-gradient-to-br from-amber-100/40 to-amber-50/40 backdrop-blur-sm" style={{ animationDelay: '2s' }} />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            <span className="text-sm font-medium text-blue-700">Platform #1 untuk UMKM Indonesia</span>
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            Buat Website
            <br />
            <span className="animate-gradient bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-600 bg-clip-text text-transparent">
              Profesional
            </span>
            <br />
            dalam Hitungan Menit
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl">
            Tanpa coding, tanpa ribet. Pilih template, isi konten, website Anda langsung online.
            Fokus pada bisnis — biar kami urus teknologinya.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              as={Link}
              href="/auth/login"
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 px-8 text-base font-semibold text-white shadow-xl shadow-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/40 sm:w-auto"
            >
              Mulai Gratis — Tanpa Kartu Kredit
            </Button>
            <Button
              as={Link}
              href="#how-it-works"
              variant="bordered"
              size="lg"
              className="w-full border-gray-300 text-base font-medium text-gray-700 sm:w-auto"
            >
              <svg className="mr-1.5 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.555 7.168A1 1 0 0 0 8 8v4a1 1 0 0 0 1.555.832l3-2a1 1 0 0 0 0-1.664l-3-2Z" clipRule="evenodd" />
              </svg>
              Lihat Demo
            </Button>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            Dipercaya 50+ UMKM di seluruh Indonesia
          </p>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────── */}
      <section id="stats" className="relative border-y border-gray-100 bg-gray-50/50 px-4 py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
              Fitur Lengkap
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Semua yang Bisnis Anda
              <br />
              <span className="text-gray-400">Butuhkan</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              Platform lengkap untuk membangun kehadiran digital bisnis Anda di era modern.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="feature-card group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className={`mb-4 inline-flex rounded-xl ${f.bg} p-3`}>
                  <div className={`bg-gradient-to-br ${f.gradient} bg-clip-text text-transparent`}>
                    {f.icon}
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ───────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-gradient-to-b from-gray-50 to-white px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Mudah Sekali
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              3 Langkah Mudah
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Pilih Template',
                desc: 'Pilih dari koleksi template yang dirancang untuk berbagai jenis bisnis.',
                color: 'from-blue-600 to-cyan-500',
                bg: 'bg-blue-50',
              },
              {
                step: '02',
                title: 'Isi Konten',
                desc: 'Tambahkan nama bisnis, produk, galeri foto, dan informasi kontak Anda.',
                color: 'from-violet-600 to-purple-500',
                bg: 'bg-violet-50',
              },
              {
                step: '03',
                title: 'Publikasikan',
                desc: 'Website Anda langsung online! Bagikan ke pelanggan atau gunakan domain sendiri.',
                color: 'from-emerald-600 to-teal-500',
                bg: 'bg-emerald-50',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {/* Connector line */}
                {i < 2 && (
                  <div className="absolute left-[calc(50%+40px)] top-10 hidden h-0.5 w-[calc(100%-80px)] bg-gradient-to-r from-gray-200 to-gray-100 sm:block" />
                )}
                <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${item.bg}`}>
                  <span className={`bg-gradient-to-br ${item.color} bg-clip-text text-3xl font-extrabold text-transparent`}>
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:py-28">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 px-6 py-16 text-center sm:px-16 sm:py-20">
          {/* Decorative shapes */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-cyan-300/20 blur-2xl" />
            <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-blue-400/20 blur-xl" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              Siap Membawa Bisnis Anda
              <br />
              ke Dunia Digital?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-blue-100">
              Ribuan UMKM sudah mempercayakan website mereka kepada Bagdja. Giliran Anda sekarang.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                as={Link}
                href="/auth/login"
                size="lg"
                className="w-full bg-white px-8 text-base font-bold text-blue-600 shadow-xl transition-all hover:bg-gray-50 sm:w-auto"
              >
                Daftar Sekarang — Gratis
              </Button>
              <Button
                as={Link}
                href="#features"
                variant="bordered"
                size="lg"
                className="w-full border-white/30 text-base font-medium text-white hover:bg-white/10 sm:w-auto"
              >
                Pelajari Lebih Lanjut
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500">
                <span className="text-sm font-bold text-white">B</span>
              </div>
              <span className="text-lg font-bold text-gray-900">Bagdja Website</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-500">
              <Link href="#" className="transition-colors hover:text-gray-900">Kebijakan Privasi</Link>
              <Link href="#" className="transition-colors hover:text-gray-900">Syarat & Ketentuan</Link>
              <Link href="#" className="transition-colors hover:text-gray-900">Kontak</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Bagdja Platform. Hak cipta dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
