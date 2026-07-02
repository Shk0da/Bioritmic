export const UNPREDICTABLE_COMPATIBILITY_MESSAGE = 'Совместимость непредсказуема';

export function normalizeBirthday(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.slice(0, 10);
}

export function hasSameBirthday(
  birthday1?: string | null,
  birthday2?: string | null,
): boolean {
  const left = normalizeBirthday(birthday1);
  const right = normalizeBirthday(birthday2);
  return !!left && !!right && left === right;
}

export function shouldShowUnpredictableCompatibility(
  viewerBirthday?: string | null,
  otherBirthday?: string | null,
): boolean {
  return hasSameBirthday(viewerBirthday, otherBirthday);
}
