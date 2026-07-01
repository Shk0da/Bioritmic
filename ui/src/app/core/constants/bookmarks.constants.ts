export const BOOKMARK_LIMIT = 100;

export const BOOKMARK_LIMIT_MESSAGE =
  'В избранном может быть не более 100 человек. Удалите кого-то из списка, чтобы добавить нового.';

export function isBookmarkLimitReached(count: number, limit = BOOKMARK_LIMIT): boolean {
  return count >= limit;
}
