'use client';

import type { ComponentType } from 'react';

import type { SectionProps } from './editor-context';
import type { SectionId } from './section-registry';
import { AdvancedSection } from './sections/AdvancedSection';
import { BasicSection } from './sections/BasicSection';
import { DigitalSection } from './sections/DigitalSection';
import { EventSection } from './sections/EventSection';
import { FulfilSection } from './sections/FulfilSection';
import { MediaSection } from './sections/MediaSection';
import { PriceSection } from './sections/PriceSection';
import { DurationSection, PackageSection, ShippingAside, ShippingSection } from './sections/SimpleSections';
import { VariantsAside, VariantsSection } from './sections/VariantsSection';

export interface SectionView {
  Body: ComponentType<SectionProps>;
  /** Kontrol di kepala bagian (mis. switch "Punya varian"). */
  Aside?: ComponentType<SectionProps>;
  description?: string;
}

/** Satu komponen per bagian; daftar bagian per tipe ada di section-registry.ts. */
export const SECTION_VIEWS: Readonly<Record<SectionId, SectionView>> = {
  info: { Body: BasicSection },
  media: { Body: MediaSection },
  price: { Body: PriceSection },
  variants: { Body: VariantsSection, Aside: VariantsAside, description: 'Ukuran, warna, atau pilihan lain dengan harga/stok berbeda.' },
  shipping: { Body: ShippingSection, Aside: ShippingAside, description: 'Ongkir dihitung otomatis saat checkout.' },
  duration: { Body: DurationSection },
  package: { Body: PackageSection },
  digital: { Body: DigitalSection, description: 'File dikirim otomatis ke pembeli setelah pembayaran.' },
  event: { Body: EventSection, description: 'Kuota, DP, pilihan, dan aturan pembatalan.' },
  fulfil: { Body: FulfilSection },
  advanced: { Body: AdvancedSection },
};
