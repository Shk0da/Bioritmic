/** Порядок и подписи совпадают с BiorhythmService на бэкенде. */
export const BIORHYTHM_SUMMARY_ORDER = ['Heartfelt', 'Physical', 'Intellectual'] as const;

export const BIORHYTHM_LABELS: Record<string, string> = {
  Physical: 'Физическая',
  Emotional: 'Эмоциональная',
  Intellectual: 'Интеллектуальная',
  Heartfelt: 'Сердечная',
  Creative: 'Творческая',
  Intuitive: 'Интуитивная',
  HighestChakra: 'Высшая',
  Spiritual: 'Духовная',
};

/** Описание чакры без номера: «Муладхара — …». */
export const BIORHYTHM_DESCRIPTIONS: Record<string, string> = {
  Physical: 'физическое влечение, совпадение желаний',
  Emotional: 'эмоции, удовольствия, радость, грусть',
  Intellectual: 'мышление, логический диалог, понимание',
  Heartfelt: 'принятие, преданность, бескорыстное добро',
  Creative: 'вдохновение, генерация идей, самовыражение',
  Intuitive: 'предугадывание, одинаковые мысли, сознание',
  HighestChakra: 'общий духовный путь, разделение вечных ценностей',
  Spiritual: 'общая духовная гармония и жизненные ориентиры',
};

export function getBiorhythmDescription(name: string): string {
  return BIORHYTHM_DESCRIPTIONS[name] ?? '';
}

export function formatCompatibilityPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function getCompatibilityLevelLabel(percent: number): string {
  const value = formatCompatibilityPercent(percent);
  if (value >= 70) {
    return 'Высокая';
  }
  if (value >= 40) {
    return 'Средняя';
  }
  return 'Низкая';
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
