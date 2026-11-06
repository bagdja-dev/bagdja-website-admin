'use client';

import { useMemo, useState } from 'react';

import { Button, Input, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';

const ICONS = [
  { icon: '⭐', label: 'Bintang', keywords: 'unggulan favorit terbaik' },
  { icon: '🚚', label: 'Pengiriman', keywords: 'kurir ongkir delivery' },
  { icon: '🛡️', label: 'Perlindungan', keywords: 'garansi aman proteksi' },
  { icon: '💬', label: 'Komunikasi', keywords: 'chat konsultasi bantuan' },
  { icon: '❤️', label: 'Favorit', keywords: 'hati suka cinta' },
  { icon: '✨', label: 'Kualitas', keywords: 'premium bagus istimewa' },
  { icon: '💎', label: 'Premium', keywords: 'berlian eksklusif' },
  { icon: '🏆', label: 'Penghargaan', keywords: 'juara award terbaik' },
  { icon: '✅', label: 'Terpercaya', keywords: 'centang valid sukses' },
  { icon: '⚡', label: 'Cepat', keywords: 'kilat daya energi' },
  { icon: '🔧', label: 'Perbaikan', keywords: 'servis teknis alat' },
  { icon: '🧰', label: 'Jasa', keywords: 'toolbox service perlengkapan' },
  { icon: '🎁', label: 'Hadiah', keywords: 'bonus gratis promo' },
  { icon: '💰', label: 'Harga', keywords: 'uang hemat murah' },
  { icon: '📦', label: 'Paket', keywords: 'produk kemasan' },
  { icon: '🌱', label: 'Ramah lingkungan', keywords: 'organik hijau alam' },
  { icon: '☕', label: 'Kopi', keywords: 'minuman cafe' },
  { icon: '🍽️', label: 'Makanan', keywords: 'restoran kuliner' },
  { icon: '🏠', label: 'Rumah', keywords: 'properti hunian' },
  { icon: '📍', label: 'Lokasi', keywords: 'alamat tempat' },
  { icon: '🕒', label: 'Waktu', keywords: 'jam buka cepat' },
  { icon: '🔒', label: 'Keamanan', keywords: 'privasi aman terkunci' },
  { icon: '📱', label: 'Digital', keywords: 'ponsel aplikasi' },
  { icon: '👥', label: 'Tim', keywords: 'orang komunitas' },
  { icon: '🎨', label: 'Kreatif', keywords: 'desain seni' },
  { icon: '🔋', label: 'Daya tahan', keywords: 'baterai tahan lama' },
  { icon: '🌟', label: 'Berkualitas', keywords: 'kilau unggulan' },
  { icon: '🤝', label: 'Kemitraan', keywords: 'kerja sama' },
];

export function IconPickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredIcons = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id');
    if (!normalizedQuery) return ICONS;
    return ICONS.filter(({ label, keywords }) =>
      `${label} ${keywords}`.toLocaleLowerCase('id').includes(normalizedQuery),
    );
  }, [query]);

  return (
    <>
      <Button
        type="button"
        variant="bordered"
        className="h-10 w-full justify-start gap-2"
        onPress={() => setIsOpen(true)}
      >
        <span className="text-xl" aria-hidden="true">{value || '⭐'}</span>
        <span className="text-xs text-default-600">Pilih ikon</span>
      </Button>
      <Modal
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) setIsOpen(false);
        }}
        placement="center"
        size="lg"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="text-base font-semibold">Pilih ikon keunggulan</ModalHeader>
          <ModalBody className="gap-3 pb-5">
            <Input
              aria-label="Cari ikon"
              placeholder="Cari ikon..."
              value={query}
              onValueChange={setQuery}
              autoFocus
            />
            {filteredIcons.length === 0 ? (
              <p className="py-8 text-center text-sm text-default-500">Ikon tidak ditemukan.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {filteredIcons.map(({ icon, label }) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onChange(icon);
                      setIsOpen(false);
                    }}
                    className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors hover:border-primary-300 hover:bg-primary-50 ${
                      value === icon ? 'border-primary-400 bg-primary-50' : 'border-default-200'
                    }`}
                    aria-label={label}
                    title={label}
                  >
                    <span className="text-2xl" aria-hidden="true">{icon}</span>
                    <span className="line-clamp-1 text-[10px] text-default-600">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
