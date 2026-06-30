import { Timestamp } from '../../core/models/user.model';

const MS_THRESHOLD = 1_000_000_000_000;

function normalizeToMs(value: number): number {
  return value < MS_THRESHOLD ? value * 1000 : value;
}

export function parseTimestampMs(timestamp: unknown): number | null {
  if (timestamp == null) {
    return null;
  }

  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return normalizeToMs(timestamp);
  }

  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof timestamp === 'object') {
    const ts = timestamp as Timestamp;
    if (typeof ts.time === 'number' && Number.isFinite(ts.time)) {
      return normalizeToMs(ts.time);
    }
    if (typeof ts.seconds === 'number' && Number.isFinite(ts.seconds)) {
      return normalizeToMs(ts.seconds);
    }
    if (typeof ts.date === 'number' && Number.isFinite(ts.date)) {
      return normalizeToMs(ts.date);
    }
  }

  return null;
}

export function formatMessageTime(timestamp: unknown, now = new Date()): string {
  const ms = parseTimestampMs(timestamp);
  if (ms == null) {
    return '';
  }

  const date = new Date(ms);
  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfMessageDay.getTime()) / 86_400_000);

  if (dayDiff === 0) {
    return time;
  }
  if (dayDiff === 1) {
    return `вчера, ${time}`;
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${time}`;
  }
  return `${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}, ${time}`;
}

export function formatMessageDateTime(timestamp: unknown): string {
  const ms = parseTimestampMs(timestamp);
  if (ms == null) {
    return '';
  }

  return new Date(ms).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
