/** Urutan kelompok pilihan gathering di Studio (tanpa import — diuji langsung oleh node --test). */

/**
 * Opsi dikelompokkan berdasarkan nama kelompok, urutan kelompok = kemunculan pertama, urutan opsi
 * di dalam kelompok tetap. Website menampilkan kelompok & opsi sesuai urutan ini (sort_order).
 */
export function groupOptionDrafts<T extends { group: string }>(options: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const option of options) groups.set(option.group, [...(groups.get(option.group) ?? []), option]);
  return [...groups.values()].flat();
}

/** Pindahkan satu kelompok ke posisi sebelumnya (-1) atau berikutnya (+1). */
export function moveOptionGroup<T extends { group: string }>(options: T[], group: string, delta: -1 | 1): T[] {
  const order = [...new Set(options.map((option) => option.group))];
  const from = order.indexOf(group);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return options;
  [order[from], order[to]] = [order[to], order[from]];
  return order.flatMap((name) => options.filter((option) => option.group === name));
}
