import type { DataRow } from '@/studio/ui/data-list/types';

export interface SampleFaq extends DataRow {
  question: string;
  answer: string;
  category: 'umum' | 'pembayaran' | 'pengiriman';
  is_active: boolean;
  updated_at: string;
  price: string;
  image_url: string | null;
}

const QUESTIONS = [
  'Bagaimana cara memesan?',
  'Metode pembayaran apa saja yang tersedia?',
  'Berapa lama pengiriman ke luar kota?',
  'Apakah bisa refund?',
  'Bagaimana cara melacak pesanan?',
  'Apakah ada garansi layanan?',
  'Bisakah saya mengubah alamat setelah memesan?',
  'Apakah tersedia pembayaran bertahap?',
  'Kapan jam operasional toko?',
  'Bagaimana jika barang rusak saat diterima?',
  'Apakah bisa pesan dalam jumlah besar?',
  'Apakah harga sudah termasuk pajak?',
  'Bagaimana menghubungi admin?',
  'Apakah bisa ambil sendiri di toko?',
  'Berapa minimal pemesanan?',
  'Apakah ada diskon member?',
  'Bagaimana cara membatalkan pesanan?',
  'Apakah pengiriman diasuransikan?',
  'Bisakah saya meminta faktur pajak?',
  'Apakah layanan tersedia di akhir pekan?',
  'Bagaimana cara mengganti metode pembayaran?',
  'Apakah ongkir gratis untuk wilayah tertentu?',
];

const CATEGORIES: SampleFaq['category'][] = ['umum', 'pembayaran', 'pengiriman'];

export function makeSampleFaqs(): SampleFaq[] {
  return QUESTIONS.map((question, i) => ({
    id: `faq-${i + 1}`,
    question,
    answer: 'Contoh jawaban singkat untuk menguji tampilan cuplikan jawaban di daftar dan kartu.',
    category: CATEGORIES[i % CATEGORIES.length],
    is_active: i % 4 !== 0,
    updated_at: new Date(Date.UTC(2026, 9, 1 + i, 3, 0)).toISOString(),
    price: `${(i + 1) * 25000}.00`,
    image_url: null,
  }));
}

/** Simulasi jaringan untuk showcase; `fail` memaksa galat (uji rollback). */
export function fakeRequest(fail: boolean, ms = 600): Promise<void> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => (fail ? reject(new Error('Simulasi galat server (mode gagal aktif).')) : resolve()), ms);
  });
}
