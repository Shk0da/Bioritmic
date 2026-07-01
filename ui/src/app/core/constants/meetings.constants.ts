export const MEETING_TOTAL_LIMIT = 20;
export const MEETING_DAILY_LIMIT = 5;

export const MEETING_TOTAL_LIMIT_MESSAGE =
  'Можно назначить не более 20 встреч. Отзовите одну из существующих, чтобы предложить новую.';

export const MEETING_DAILY_LIMIT_MESSAGE =
  'Сегодня можно назначить не более 5 встреч. Попробуйте завтра или измените существующее предложение.';

export function isMeetingTotalLimitReached(totalCount: number, limit = MEETING_TOTAL_LIMIT): boolean {
  return totalCount >= limit;
}

export function isMeetingDailyLimitReached(dailyCount: number, limit = MEETING_DAILY_LIMIT): boolean {
  return dailyCount >= limit;
}

export function resolveMeetingLimitMessage(
  totalCount: number,
  dailyCount: number,
  totalLimit = MEETING_TOTAL_LIMIT,
  dailyLimit = MEETING_DAILY_LIMIT,
): string | null {
  if (isMeetingTotalLimitReached(totalCount, totalLimit)) {
    return MEETING_TOTAL_LIMIT_MESSAGE;
  }
  if (isMeetingDailyLimitReached(dailyCount, dailyLimit)) {
    return MEETING_DAILY_LIMIT_MESSAGE;
  }
  return null;
}
