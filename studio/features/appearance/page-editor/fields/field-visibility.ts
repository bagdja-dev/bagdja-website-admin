import type { TemplateManifestField } from '@/studio/api/templates';

/**
 * `showWhen`: field disembunyikan bila field pengontrolnya tidak bernilai `equals`.
 * Nilai pengontrol memakai `default`-nya bila belum ada di content. Nilai field
 * yang disembunyikan TIDAK dihapus dari content.
 */
export function isFieldVisible(
  field: TemplateManifestField,
  siblings: readonly TemplateManifestField[],
  values: Record<string, unknown>,
): boolean {
  const rule = field.showWhen;
  if (!rule) return true;
  const controller = siblings.find((item) => item.key === rule.field);
  const raw = values[rule.field] ?? controller?.default;
  const current = typeof raw === 'string' ? raw : '';
  return Array.isArray(rule.equals) ? rule.equals.includes(current) : rule.equals === current;
}
