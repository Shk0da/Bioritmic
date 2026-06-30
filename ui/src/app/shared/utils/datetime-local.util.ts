export function toDatetimeLocalValue(date: Date): string {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

export function parseDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}

export function isFutureDatetimeLocalValue(value: string): boolean {
  const ms = parseDatetimeLocalValue(value);
  return Number.isFinite(ms) && ms >= Date.now();
}
