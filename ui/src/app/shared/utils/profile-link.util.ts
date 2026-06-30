import { UserInfo } from '../../core/models/user.model';

export const NICK_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const NICK_MAX_LENGTH = 32;
const RESERVED_NICKS = new Set(['me', 'blocked', 'settings']);

export function resolveProfileLinkId(user: Pick<UserInfo, 'id' | 'nick'>): string {
  const nick = user.nick?.trim();
  if (nick) {
    return nick;
  }
  return user.id ?? '';
}

export function isValidNick(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (RESERVED_NICKS.has(trimmed.toLowerCase())) {
    return false;
  }
  return trimmed.length <= NICK_MAX_LENGTH && NICK_PATTERN.test(trimmed);
}

export function nickValidationMessage(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > NICK_MAX_LENGTH) {
    return `Ник не может быть длиннее ${NICK_MAX_LENGTH} символов`;
  }
  if (RESERVED_NICKS.has(trimmed.toLowerCase())) {
    return 'Этот ник зарезервирован';
  }
  if (!NICK_PATTERN.test(trimmed)) {
    return 'Ник может содержать только латинские буквы, цифры, _ и -';
  }
  return null;
}
