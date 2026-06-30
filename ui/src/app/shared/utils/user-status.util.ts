export type UserStatusPosition =
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT'
  | 'BOTTOM_CENTER'
  | `CUSTOM:${number}:${number}`;

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

const CUSTOM_STATUS_POSITION_REGEX = /^CUSTOM:(\d{1,3}):(\d{1,3})$/i;

function parseCustomStatusPosition(value: string): UserStatusPosition | null {
  const customMatch = CUSTOM_STATUS_POSITION_REGEX.exec(value.trim());
  if (!customMatch) {
    return null;
  }
  const x = clampPercent(Number(customMatch[1]));
  const y = clampPercent(Number(customMatch[2]));
  return `CUSTOM:${x}:${y}`;
}

export function isUserStatusPosition(value: string | null | undefined): value is UserStatusPosition {
  if (!value) {
    return false;
  }
  if (USER_STATUS_POSITIONS.some((item) => item.value === value)) {
    return true;
  }
  return parseCustomStatusPosition(value) !== null;
}

export function normalizeUserStatusPosition(
  value: string | null | undefined,
  fallback: UserStatusPosition = DEFAULT_USER_STATUS_POSITION
): UserStatusPosition {
  if (!value) {
    return fallback;
  }
  if (USER_STATUS_POSITIONS.some((item) => item.value === value)) {
    return value as UserStatusPosition;
  }
  const customPosition = parseCustomStatusPosition(value);
  return customPosition ?? fallback;
}

export function statusPositionStyles(position: UserStatusPosition | null | undefined): Record<string, string> {
  const normalized = normalizeUserStatusPosition(position);
  const customPosition = parseCustomStatusPosition(normalized);
  if (customPosition) {
    const [, x, y] = CUSTOM_STATUS_POSITION_REGEX.exec(customPosition)!;
    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
    };
  }
  switch (normalized) {
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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}
