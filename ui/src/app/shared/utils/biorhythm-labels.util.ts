/** Порядок и подписи совпадают с BiorhythmService на бэкенде. */
export const BIORHYTHM_SUMMARY_ORDER = ['Heartfelt', 'Physical', 'Intellectual'] as const;

export const BIORHYTHM_LABELS: Record<string, string> = {
  Physical: 'Физическая',
  Emotional: 'Эмоциональная',
  Intellectual: 'Интеллектуальная',
  Heartfelt: 'Сердечная',
  Creative: 'Творческая',
  Intuitive: 'Интуитивная',
  HighestChakra: 'Высшая чакра',
  Spiritual: 'Духовная',
};

export function formatCompatibilityPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function getSummaryCompatibility(
  compare?: Record<string, number> | null
): Array<{ name: string; label: string; value: number }> {
  if (!compare) {
    return [];
  }

  return BIORHYTHM_SUMMARY_ORDER
    .filter(name => compare[name] != null)
    .map(name => ({
      name,
      label: BIORHYTHM_LABELS[name] ?? name,
      value: formatCompatibilityPercent(compare[name]),
    }));
}

export function getSummaryCompatibilityAverage(compare?: Record<string, number> | null): number {
  const items = getSummaryCompatibility(compare);
  if (items.length === 0) {
    return 0;
  }
  const sum = items.reduce((acc, item) => acc + item.value, 0);
  return Math.round(sum / items.length);
}
