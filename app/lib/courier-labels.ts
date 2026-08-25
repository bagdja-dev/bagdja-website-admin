/** Label tampilan untuk kode kurir (dari bagdja-shipping-service) — sama daftar dengan `COURIER_OPTIONS` di dashboard/locations/page.tsx. */
const COURIER_LABELS: Record<string, string> = {
  jne: 'JNE',
  jnt: 'J&T Express',
  sicepat: 'SiCepat',
  pos: 'Pos Indonesia',
  tiki: 'TIKI',
  anteraja: 'AnterAja',
  wahana: 'Wahana',
  ninja: 'Ninja Xpress',
  lion: 'Lion Parcel',
  sap: 'SAP Express',
};

/** Kode kurir (mis. 'jne') → label tampilan (mis. 'JNE'). Fallback: uppercase kode aslinya kalau tidak dikenali. */
export function formatCourierCode(code: string): string {
  return COURIER_LABELS[code.toLowerCase()] ?? code.toUpperCase();
}
