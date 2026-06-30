export type UserStatusPosition =
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT'
  | 'BOTTOM_CENTER';

export const DEFAULT_USER_STATUS_POSITION: UserStatusPosition = 'BOTTOM_RIGHT';

export const USER_STATUS_POSITIONS: { value: UserStatusPosition; label: string }[] = [
  { value: 'TOP_LEFT', label: 'Слева сверху' },
  { value: 'TOP_RIGHT', label: 'Справа сверху' },
  { value: 'BOTTOM_LEFT', label: 'Слева снизу' },
  { value: 'BOTTOM_RIGHT', label: 'Справа снизу' },
  { value: 'BOTTOM_CENTER', label: 'По центру снизу' },
];

export const PROFILE_STATUS_EMOJIS = [
  '😀', '😎', '😍', '🥰', '😘', '🤩', '🔥', '💯',
  '❤️', '💕', '✨', '🎉', '😂', '🤣', '😭', '😢',
  '👍', '👋', '✌️', '🤙', '💪', '🌟', '☀️', '🌙',
  '🎵', '☕', '🍕', '🏃', '💤', '🤔', '😴', '🫶',
];

export function isUserStatusPosition(value: string | null | undefined): value is UserStatusPosition {
  return USER_STATUS_POSITIONS.some((item) => item.value === value);
}

export function normalizeUserStatusPosition(
  value: string | null | undefined,
  fallback: UserStatusPosition = DEFAULT_USER_STATUS_POSITION
): UserStatusPosition {
  return isUserStatusPosition(value) ? value : fallback;
}

export function statusPositionStyles(position: UserStatusPosition | null | undefined): Record<string, string> {
  switch (position) {
    case 'TOP_LEFT':
      return { top: '8%', left: '8%' };
    case 'TOP_RIGHT':
      return { top: '8%', right: '8%' };
    case 'BOTTOM_LEFT':
      return { bottom: '8%', left: '8%' };
    case 'BOTTOM_CENTER':
      return { bottom: '6%', left: '50%', transform: 'translateX(-50%)' };
    case 'BOTTOM_RIGHT':
    default:
      return { bottom: '8%', right: '8%' };
  }
}
