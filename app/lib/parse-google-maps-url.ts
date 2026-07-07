export type MapsCoordSource = 'place_pin' | 'map_center' | 'query';

export interface ParsedMapsCoords {
  latitude: number;
  longitude: number;
  source: MapsCoordSource;
}

const SOURCE_LABEL: Record<MapsCoordSource, string> = {
  place_pin: 'titik lokasi (paling akurat)',
  map_center: 'pusat peta',
  query: 'parameter URL',
};

export function getMapsCoordSourceLabel(source: MapsCoordSource): string {
  return SOURCE_LABEL[source];
}

export function isShortGoogleMapsUrl(url: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url.trim());
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Ekstrak latitude/longitude dari URL Google Maps (client-side, tanpa API). */
export function parseGoogleMapsUrl(url: string): ParsedMapsCoords | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (isShortGoogleMapsUrl(trimmed)) {
    return null;
  }

  // !3dLAT!4dLNG — pin lokasi (paling akurat), contoh: !3d-7.0412246!4d107.9676589
  const placeMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i);
  if (placeMatch) {
    const latitude = parseFloat(placeMatch[1]);
    const longitude = parseFloat(placeMatch[2]);
    if (isValidCoord(latitude, longitude)) {
      return { latitude, longitude, source: 'place_pin' };
    }
  }

  // @LAT,LNG — pusat tampilan peta
  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const latitude = parseFloat(atMatch[1]);
    const longitude = parseFloat(atMatch[2]);
    if (isValidCoord(latitude, longitude)) {
      return { latitude, longitude, source: 'map_center' };
    }
  }

  // ?q=LAT,LNG atau ll= / center=
  const queryMatch = trimmed.match(/[?&](?:q|ll|center)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (queryMatch) {
    const latitude = parseFloat(queryMatch[1]);
    const longitude = parseFloat(queryMatch[2]);
    if (isValidCoord(latitude, longitude)) {
      return { latitude, longitude, source: 'query' };
    }
  }

  return null;
}

/** Normalisasi koordinat dari API (number/string) atau input form. */
export function toCoordNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const n = parseFloat(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function formatCoord(value: unknown, decimals = 6): string {
  const n = toCoordNumber(value);
  if (n == null) return '';
  return n.toFixed(decimals);
}

export function hasValidCoords(lat: unknown, lng: unknown): boolean {
  const latitude = toCoordNumber(lat);
  const longitude = toCoordNumber(lng);
  return latitude != null && longitude != null && isValidCoord(latitude, longitude);
}
