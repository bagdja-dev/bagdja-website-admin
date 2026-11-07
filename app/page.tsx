import Link from 'next/link';

import { LandingNavbar } from './components/landing-navbar';
import { PublicPricingSection } from './components/public-pricing-section';

type IconName =
  | 'layout'
  | 'catalog'
  | 'cart'
  | 'orders'
  | 'chat'
  | 'team'
  | 'domain'
  | 'android'
  | 'calendar'
  | 'rental'
  | 'ticket'
  | 'arrow';

const activeFeatures = [
  {
    icon: 'layout',
    eyebrow: 'Website & konten',
    title: 'Bangun tampilan yang terasa seperti brand-mu',
    description:
      'Atur halaman, section, warna, dan konten lewat editor visual. Lengkapi website dengan FAQ, blog, dan informasi lokasi.',
  },
  {
    icon: 'catalog',
    eyebrow: 'Katalog',
    title: 'Produk, jasa, dan paket dalam satu katalog',
    description:
      'Tampilkan foto, deskripsi, kategori, harga, dan varian supaya pelanggan lebih mudah memahami yang kamu tawarkan.',
  },
  {
    icon: 'cart',
    eyebrow: 'Transaksi',
    title: 'Pilih alur pemesanan yang sesuai',
    description:
      'Arahkan pelanggan ke tautan eksternal atau gunakan cart, checkout, dan pilihan pembayaran yang dikonfigurasi untuk produk.',
  },
  {
    icon: 'orders',
    eyebrow: 'Pesanan',
    title: 'Lihat progres pesanan dengan lebih teratur',
    description:
      'Pantau transaksi dan atur langkah fulfillment untuk produk yang menggunakannya, dari mulai diproses sampai selesai.',
  },
  {
    icon: 'chat',
    eyebrow: 'Inbox',
    title: 'Percakapan pelanggan dalam satu ruang kerja',
    description:
      'Tanggapi percakapan pelanggan dari Inbox Bagdja Studio dan hubungkan pekerjaan tim dengan konteks bisnis.',
  },
  {
    icon: 'team',
    eyebrow: 'Kolaborasi',
    title: 'Kelola website bersama tim',
    description:
      'Undang anggota tim dan atur peran owner, admin, editor, atau viewer sesuai tanggung jawabnya.',
  },
  {
    icon: 'domain',
    eyebrow: 'Alamat website',
    title: 'Gunakan domain yang mewakili brand',
    description:
      'Atur domain website dari pengaturan. Ketersediaan alamat mengikuti konfigurasi DNS dan domain yang digunakan.',
  },
] satisfies Array<{ icon: IconName; eyebrow: string; title: string; description: string }>;

const businessTypes = [
  'Toko online',
  'Jasa & layanan',
  'Proyek & pesanan custom',
  'Gathering & komunitas',
  'Produk digital',
  'Profil usaha',
];

const roadmapFeatures = [
  {
    icon: 'calendar',
    title: 'Jadwal & booking',
    description: 'Pelanggan memilih jadwal sesuai jam kerja, staf, atau ruang yang tersedia.',
  },
  {
    icon: 'rental',
    title: 'Aset & penyewaan',
    description: 'Kelola masa sewa, ketersediaan unit, dan pelacakan aset dalam satu alur.',
  },
  {
    icon: 'ticket',
    title: 'Tiket & venue',
    description: 'Dukung penjualan tiket berdasarkan jenis, kuota, lokasi, dan check-in.',
  },
] satisfies Array<{ icon: IconName; title: string; description: string }>;

const faqs = [
  {
    question: 'Apakah saya perlu bisa coding?',
    answer:
      'Tidak. Kamu dapat mengatur halaman dan konten melalui editor visual, lalu mengelola katalog dari Bagdja Studio.',
  },
  {
    question: 'Apakah website hanya untuk menjual produk fisik?',
    answer:
      'Tidak. Bagdja mendukung katalog produk dan jasa, pesanan custom, gathering, produk digital, serta profil usaha.',
  },
  {
    question: 'Apakah semua produk harus memakai checkout Bagdja?',
    answer:
      'Tidak. Cara transaksi dapat berbeda per produk: menggunakan tautan eksternal atau checkout di website, sesuai konfigurasi produk.',
  },
  {
    question: 'Fitur apa yang sedang dikembangkan?',
    answer:
      'Jadwal dan booking, pengelolaan aset sewaan, serta tiket dan venue sedang direncanakan. Fitur-fitur ini belum tersedia untuk digunakan.',
  },
  {
    question: 'Bisakah saya menggunakan domain sendiri?',
    answer:
      'Pengaturan domain kustom tersedia. Penyambungan domain bergantung pada konfigurasi DNS dan domain yang kamu gunakan.',
  },
];

const iconPaths: Record<IconName, string[]> = {
  layout: ['M3.75 4.5h16.5v15h-16.5z', 'M3.75 9h16.5', 'M9 9v10.5'],
  catalog: ['M4.5 6.75h15l1.5 13.5h-18l1.5-13.5Z', 'M8.25 8.25v-2.5a3.75 3.75 0 0 1 7.5 0v2.5'],
  cart: ['M2.25 3h1.5l2.25 11.25h12.75l2.25-8.25H5.25', 'M8.25 18.75h.008', 'M16.5 18.75h.008'],
  orders: ['M8.25 6.75h12', 'M8.25 12h12', 'M8.25 17.25h12', 'M3.75 6.75h.008', 'M3.75 12h.008', 'M3.75 17.25h.008'],
  chat: ['M20.25 11.25a7.5 7.5 0 0 1-7.5 7.5H6l-3.75 2.25V11.25a7.5 7.5 0 0 1 7.5-7.5h3a7.5 7.5 0 0 1 7.5 7.5Z', 'M8.25 11.25h.008', 'M12 11.25h.008', 'M15.75 11.25h.008'],
  team: ['M16.5 20.25h5.25v-1.5a4.5 4.5 0 0 0-7.5-3.354', 'M16.5 20.25H7.5m9 0v-1.5c0-1.19-.464-2.271-1.22-3.079M7.5 20.25H2.25v-1.5a4.5 4.5 0 0 1 7.5-3.354', 'M7.5 20.25v-1.5c0-1.19.464-2.271 1.22-3.079m5.78-3.421a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z'],
  domain: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3.6 9h16.8', 'M3.6 15h16.8', 'M12 3a15 15 0 0 1 0 18', 'M12 3a15 15 0 0 0 0 18'],
  android: ['M7.5 3.75h9a2.25 2.25 0 0 1 2.25 2.25v12a2.25 2.25 0 0 1-2.25 2.25h-9A2.25 2.25 0 0 1 5.25 18V6A2.25 2.25 0 0 1 7.5 3.75Z', 'M9.75 16.5h4.5', 'M10.5 6.75h3'],
  calendar: ['M6.75 3v3.75', 'M17.25 3v3.75', 'M3.75 8.25h16.5', 'M4.5 5.25h15a.75.75 0 0 1 .75.75v13.5H3.75V6a.75.75 0 0 1 .75-.75Z', 'm8.25 14.25 2.25 2.25 5.25-5.25'],
  rental: ['M3.75 20.25h16.5', 'M6 20.25V9l6-5.25L18 9v11.25', 'M9.75 20.25v-6h4.5v6', 'M8.25 10.5h.008', 'M15.75 10.5h.008'],
  ticket: ['M3 8.25a2.25 2.25 0 0 0 0 4.5v4.5h18v-4.5a2.25 2.25 0 0 1 0-4.5v-4.5H3v4.5Z', 'M12 6.75v1.5', 'M12 10.5V12', 'M12 14.25v1.5'],
  arrow: ['M4.5 12h15', 'm13.5 6 6 6-6 6'],
};

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function ProductPreview() {
  return (
    <div
      id="contoh"
      className="relative mx-auto w-full max-w-[650px]"
      aria-label="Ilustrasi website toko dan Bagdja Studio"
    >
      <div className="absolute -left-5 top-20 hidden h-36 w-36 rounded-full bg-[#eeddd9] blur-3xl sm:block" />
      <div className="absolute -right-4 bottom-12 hidden h-40 w-40 rounded-full bg-[#e6e5d7] blur-3xl sm:block" />

      <div className="relative rounded-[26px] border border-[#e7ded5] bg-white p-2.5 shadow-[0_30px_90px_-40px_rgba(74,38,47,0.38)] sm:rounded-[32px] sm:p-3">
        <div className="flex h-9 items-center gap-1.5 border-b border-[#f1ece7] px-2">
          <span className="h-2 w-2 rounded-full bg-[#e9aaa0]" />
          <span className="h-2 w-2 rounded-full bg-[#e8d1a2]" />
          <span className="h-2 w-2 rounded-full bg-[#b7c8a9]" />
          <div className="mx-auto flex h-6 min-w-0 items-center gap-2 rounded-md bg-[#f7f4f0] px-3 text-[10px] text-[#7d706a]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d8b63]" />
            <span className="truncate">Contoh tampilan · tokokamu.example</span>
          </div>
        </div>

        <div className="grid gap-3 p-2 sm:grid-cols-[1.4fr_0.85fr] sm:gap-4 sm:p-4">
          <div className="overflow-hidden rounded-2xl border border-[#eee7df] bg-[#fbf8f4]">
            <div className="flex items-center justify-between border-b border-[#eee7df] bg-white px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#681c3c] text-xs font-semibold text-white">
                  D
                </span>
                <span className="text-xs font-semibold text-[#30252a]">Daily Goods</span>
              </div>
              <div className="flex gap-2 text-[9px] text-[#81766f] sm:gap-3">
                <span>Katalog</span>
                <span>Tentang</span>
                <span>Kontak</span>
              </div>
            </div>
            <div className="m-2 flex min-h-24 items-end justify-between overflow-hidden rounded-xl bg-[#e5ded2] p-3 sm:m-3 sm:min-h-32 sm:p-4">
              <div>
                <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-[#7b564c]">
                  Pilihan untuk harimu
                </p>
                <p className="mt-1 max-w-36 text-lg font-semibold leading-tight tracking-tight text-[#3d2c2d] sm:text-2xl">
                  Cerita baik dimulai di sini.
                </p>
              </div>
              <div className="mb-1 mr-1 flex h-14 w-14 rotate-[-8deg] items-center justify-center rounded-2xl bg-[#b7a283] text-3xl shadow-md sm:h-20 sm:w-20 sm:text-4xl">
                <span aria-hidden="true">✦</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 px-2 pb-2 sm:gap-3 sm:px-3 sm:pb-3">
              {[
                ['Minyak Aromatik', 'Rp 89.000', 'bg-[#d9c8b3]', '✿'],
                ['Lilin Senja', 'Rp 125.000', 'bg-[#c7d0bc]', '◉'],
                ['Paket Hadiah', 'Rp 179.000', 'bg-[#ddc0b7]', '◇'],
              ].map(([name, price, color, symbol]) => (
                <div key={name} className="min-w-0 rounded-xl bg-white p-1.5 sm:p-2">
                  <div className={`flex h-12 items-center justify-center rounded-lg ${color} text-xl text-[#5b4038] sm:h-16 sm:text-2xl`}>
                    {symbol}
                  </div>
                  <p className="mt-1.5 truncate text-[9px] font-medium text-[#493a37] sm:text-[10px]">{name}</p>
                  <p className="mt-0.5 text-[8px] text-[#8d7e76] sm:text-[9px]">{price}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-[#eee7df] bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#433337] sm:text-xs">Bagdja Studio</p>
                <span className="rounded-full bg-[#f5e7e8] px-2 py-1 text-[8px] font-medium text-[#8b3d55]">Preview</span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f8f5f1] p-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#681c3c] shadow-sm">
                  <Icon name="layout" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[9px] font-medium text-[#504341]">Editor website</p>
                  <p className="mt-0.5 text-[8px] text-[#9a8b82]">Halaman & tampilan</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#f8f5f1] p-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#681c3c] shadow-sm">
                  <Icon name="catalog" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[9px] font-medium text-[#504341]">Katalog produk</p>
                  <p className="mt-0.5 text-[8px] text-[#9a8b82]">Varian & harga</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#eee7df] bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-[#433337] sm:text-xs">Pesanan terbaru</p>
                <span className="rounded-full bg-[#f5e7e8] px-2 py-1 text-[8px] font-medium text-[#8b3d55]">2 baru</span>
              </div>
              <div className="mt-3 space-y-2.5">
                {[
                  ['#ORD-1042', '2 produk', 'Baru'],
                  ['#ORD-1041', 'Paket hadiah', 'Diproses'],
                ].map(([order, detail, status]) => (
                  <div key={order} className="flex items-center justify-between border-b border-[#f3efeb] pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-[9px] font-medium text-[#504341]">{order}</p>
                      <p className="mt-0.5 text-[8px] text-[#9a8b82]">{detail}</p>
                    </div>
                    <span className="text-[8px] text-[#7b665e]">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 left-5 hidden items-center gap-2 rounded-xl border border-[#eee7df] bg-white px-3 py-2.5 shadow-lg sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3e8] text-[#59704c]">
          <span aria-hidden="true">✓</span>
        </span>
        <div>
          <p className="text-[9px] font-semibold text-[#443638]">Katalog dan pesanan</p>
          <p className="text-[8px] text-[#93857d]">Dikelola dari satu tempat</p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#fbf9f6] text-[#2c2425]">
      <LandingNavbar />

      <main>
        <section className="relative px-5 pb-20 pt-28 sm:px-8 sm:pb-28 sm:pt-36 lg:px-12 lg:pb-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_35%,rgba(226,211,198,0.35),transparent_38%),linear-gradient(180deg,#fbf9f6_0%,#f8f4ef_100%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#e8ded6] bg-white/80 px-3.5 py-2 text-xs font-medium text-[#695c57] shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6d8b63]" />
                Website bisnis untuk toko, jasa, dan tim kecil
              </div>

              <h1 className="mt-7 text-[clamp(2.65rem,6.1vw,5.25rem)] font-semibold leading-[0.99] tracking-[-0.065em] text-[#2b2425]">
                Bukan cuma jualan di platform lain.
                <span className="mt-1 block font-normal italic text-[#681c3c]">
                  Bangun website untuk bisnismu sendiri.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-[#716864] sm:text-lg sm:leading-8">
                Buat website tanpa coding, tampilkan katalog produk atau jasa, lalu kelola pesanan dan percakapan pelanggan melalui Bagdja Studio.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#681c3c] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(104,28,60,0.7)] transition hover:bg-[#53142f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#681c3c] focus-visible:ring-offset-2"
                >
                  Mulai buat website
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <a
                  href="#fitur"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#cfc5bd] bg-white/70 px-6 py-3.5 text-sm font-medium text-[#473c39] transition hover:border-[#8e7c72] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#681c3c] focus-visible:ring-offset-2"
                >
                  Jelajahi fitur
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-2 text-xs text-[#796e67]">
                <span className="rounded-full border border-[#e8ded6] bg-white/70 px-3 py-2">Editor visual</span>
                <span className="rounded-full border border-[#e8ded6] bg-white/70 px-3 py-2">Katalog & checkout</span>
                <span className="rounded-full border border-[#e8ded6] bg-white/70 px-3 py-2">Tim & Inbox</span>
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section className="border-y border-[#ece5de] bg-white/70 px-5 py-7 sm:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-xs font-medium text-[#776b65] sm:justify-between sm:text-sm">
            <span>Website & halaman bisnis</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#c4b8af] sm:block" />
            <span>Katalog produk dan jasa</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#c4b8af] sm:block" />
            <span>Pesanan & fulfillment</span>
            <span className="hidden h-1 w-1 rounded-full bg-[#c4b8af] sm:block" />
            <span>Kelola bersama tim</span>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b4b5e]">Kanal milik brand</p>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#33292a] sm:text-5xl">
                Beri bisnismu tempat sendiri di internet.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-[#746963] sm:text-lg sm:leading-8">
              Media sosial dan marketplace tetap bisa menjadi tempat pelanggan menemukanmu. Website bisnis memberi mereka satu tempat untuk mengenal brand, melihat penawaran, dan memilih cara bertransaksi.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-3">
            {[
              ['Info bisnis lebih tertata', 'Satukan halaman, katalog, FAQ, artikel, dan lokasi dalam website yang bisa kamu kelola.'],
              ['Pilihan transaksi yang sesuai', 'Arahkan pelanggan ke checkout website atau tautan eksternal sesuai kebutuhan produk.'],
              ['Pekerjaan lebih terorganisir', 'Pantau pesanan, percakapan, dan pekerjaan tim lewat Bagdja Studio.'],
            ].map(([title, description], index) => (
              <article key={title} className="rounded-2xl border border-[#ece4dc] bg-white p-6 sm:p-7">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5e9e9] text-sm font-semibold text-[#7d3551]">
                  0{index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-[#352a2b]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#796e68]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="fitur" className="scroll-mt-24 bg-[#f4efe9] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b4b5e]">Yang tersedia sekarang</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#33292a] sm:text-5xl">
                Mulai dari website. Lanjutkan dengan cara bisnismu bekerja.
              </h2>
              <p className="mt-4 text-base leading-7 text-[#746963]">
                Fitur-fitur Bagdja dirancang untuk membantu mengelola konten, katalog, transaksi, dan kolaborasi dari satu tempat.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeFeatures.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-[#e8dfd7] bg-[#fbf9f6] p-6 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-32px_rgba(61,42,44,0.55)] sm:p-7">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f3e5e5] text-[#752d4a]">
                    <Icon name={feature.icon} className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#936e67]">{feature.eyebrow}</p>
                  <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-[#352a2b]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#796e68]">{feature.description}</p>
                </article>
              ))}
            </div>

            <article className="relative mt-5 overflow-hidden rounded-[24px] bg-[#681c3c] p-6 text-white sm:p-9 lg:p-10">
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#a95c76]/30 blur-3xl" />
              <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f3dfe4]">
                    <Icon name="android" className="h-4 w-4" />
                    Aplikasi Android
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-3xl">
                    Bawa websitemu ke Play Store.
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#f0dfe1]">
                    Atur identitas aplikasi, signing, lalu buat APK untuk pengujian atau AAB release yang bisa kamu unggah ke Google Play melalui Play Console.
                  </p>
                  <p className="mt-3 text-xs leading-5 text-[#e2c6cd]">
                    Bagdja menyiapkan file AAB; pengunggahan dan publikasi di Play Console dilakukan oleh pemilik aplikasi.
                  </p>
                </div>

                <div className="w-full rounded-2xl border border-white/15 bg-white/[0.08] p-4 md:w-64">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbf7f2] text-[#681c3c]">
                        <Icon name="android" className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold">Build aplikasi</p>
                        <p className="mt-0.5 text-[10px] text-[#e5cbd2]">Website ke Android</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#dbe8d5] px-2 py-1 text-[9px] font-semibold text-[#3d5a39]">AAB</span>
                  </div>
                  <div className="mt-4 rounded-xl bg-[#fbf7f2] p-3 text-[#4c3940]">
                    <p className="text-[10px] font-medium">AAB Release · Play Store</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eadfe2]">
                      <div className="h-full w-full rounded-full bg-[#8b526a]" />
                    </div>
                    <p className="mt-2 text-[9px] text-[#88777a]">Unduh hasil build, lalu kirim ke Play Console</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="cara-kerja" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 sm:grid-cols-[0.8fr_1.2fr] sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b4b5e]">Cara kerja</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#33292a] sm:text-5xl">
                  Dari ide bisnis ke website yang siap dibagikan.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-[#746963] sm:justify-self-end">
                Mulai dengan kebutuhan bisnismu, atur konten dan katalog, lalu kelola aktivitas berikutnya melalui Studio.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ['01', 'Pilih kebutuhan bisnis', 'Mulai dari toko online, jasa, pesanan custom, atau tipe usaha lain yang tersedia.'],
                ['02', 'Atur website & katalog', 'Sesuaikan tampilan, isi informasi bisnis, lalu tambahkan produk atau layanan.'],
                ['03', 'Bagikan dan kelola', 'Bagikan website ke pelanggan, pantau pesanan, dan ajak tim ikut mengelola.'],
              ].map(([step, title, description]) => (
                <li key={step} className="relative rounded-2xl border border-[#ece4dc] bg-white p-6 sm:p-7">
                  <span className="text-sm font-semibold tracking-[0.12em] text-[#8b4b5e]">{step}</span>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-[#352a2b]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#796e68]">{description}</p>
                  {step !== '03' && <Icon name="arrow" className="absolute right-6 top-6 hidden h-4 w-4 text-[#bba9a0] md:block" />}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="bisnis" className="scroll-mt-24 bg-[#332328] px-5 py-20 text-[#fbf7f2] sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e2b9bc]">Untuk beragam kebutuhan</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
                Satu fondasi website. Banyak cara menjalankan bisnis.
              </h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {businessTypes.map((type) => (
                <span key={type} className="rounded-full border border-white/20 bg-white/[0.06] px-4 py-2.5 text-sm text-[#f3e9e4]">
                  {type}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="roadmap" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b4b5e]">Dalam pengembangan</p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#33292a] sm:text-5xl">
                  Fitur berikutnya dibangun dari kebutuhan nyata bisnis.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-[#796e68]">
                Ini adalah roadmap, bukan fitur yang sudah bisa digunakan. Status dapat berubah seiring pengembangan.
              </p>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {roadmapFeatures.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-dashed border-[#d9cbc3] bg-[#fbf9f6] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0e9e2] text-[#806e65]">
                      <Icon name={feature.icon} />
                    </span>
                    <span className="rounded-full bg-[#f2e7dc] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#876546]">Roadmap</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#443638]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#796e68]">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <PublicPricingSection />

        <section id="faq" className="scroll-mt-24 bg-[#f4efe9] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b4b5e]">Pertanyaan umum</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#33292a] sm:text-4xl">
                Kenali dulu cara Bagdja bekerja.
              </h2>
            </div>
            <div className="divide-y divide-[#e2d9d1] border-y border-[#e2d9d1]">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-[#433638] marker:hidden">
                    {faq.question}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d8cbc2] text-[#785268] transition group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pr-10 pt-3 text-sm leading-6 text-[#756a64]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-[#681c3c] px-6 py-12 text-center text-white sm:px-14 sm:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e8c9cd]">Mulai dari yang kamu butuhkan</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
              Buat ruang digital yang bisa tumbuh bersama bisnismu.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#f0dfe1] sm:text-base">
              Susun website, tampilkan penawaran, dan kelola aktivitas bisnis dari Bagdja Studio.
            </p>
            <Link
              href="/auth/login"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#fbf7f2] px-6 py-3 text-sm font-semibold text-[#5b1935] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#681c3c]"
            >
              Mulai buat website
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer id="kontak" className="scroll-mt-24 border-t border-[#e9e1d9] bg-[#fbf9f6] px-5 py-9 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 text-sm text-[#796e68] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-semibold text-[#403336]">Bagdja Website</p>
            <p className="mt-2 text-xs">Website bisnis dan pengelolaan dalam satu tempat.</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#58494a]">Kontak</h2>
            <div className="mt-2 flex flex-col gap-1.5 sm:items-end">
              <a className="transition hover:text-[#681c3c]" href="mailto:contact@bagdja.com">
                contact@bagdja.com
              </a>
              <a className="transition hover:text-[#681c3c]" href="https://wa.me/6285188448383">
                WhatsApp: 0851 8844 8383
              </a>
            </div>
          </div>
          <p className="text-xs sm:text-right">&copy; {new Date().getFullYear()} Bagdja.</p>
        </div>
      </footer>
    </div>
  );
}
