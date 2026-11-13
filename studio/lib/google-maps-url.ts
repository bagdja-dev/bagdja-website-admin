/**
 * Tautan Google Maps lokasi pilihan gathering (plan/website-builder/gathering-option-location-plan.md L1).
 * Pola sama dengan validasi API (`GOOGLE_MAPS_URL_PATTERN`).
 */
const GOOGLE_MAPS_URL = /^https:\/\/(?:maps\.app\.goo\.gl\/|goo\.gl\/maps\/|maps\.google\.[a-z]{2,3}(?:\.[a-z]{2})?\/|(?:www\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?\/maps(?:\/|\?|$))[^\s<>"']*$/i;

export function isGoogleMapsUrl(value: string): boolean {
  const url = value.trim();
  return url.length <= 1000 && GOOGLE_MAPS_URL.test(url);
}
