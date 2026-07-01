export const MIN_SEARCH_AGE = 14;
export const MAX_SEARCH_AGE = 100;

export function normalizeAgeRange(
  ageMin: number,
  ageMax: number,
): { ageMin: number; ageMax: number } {
  let min = clamp(ageMin, MIN_SEARCH_AGE, MAX_SEARCH_AGE);
  let max = clamp(ageMax, MIN_SEARCH_AGE, MAX_SEARCH_AGE);

  if (min >= max) {
    if (min < MAX_SEARCH_AGE) {
      max = Math.min(MAX_SEARCH_AGE, min + 1);
    } else {
      min = MAX_SEARCH_AGE - 1;
      max = MAX_SEARCH_AGE;
    }
  }

  return { ageMin: min, ageMax: max };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
