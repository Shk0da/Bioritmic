import { isFutureDatetimeLocalValue, parseDatetimeLocalValue, toDatetimeLocalValue } from './datetime-local.util';

describe('datetime-local.util', () => {
  it('toDatetimeLocalValue should format local datetime for input', () => {
    const date = new Date(2026, 5, 30, 18, 30, 0);
    expect(toDatetimeLocalValue(date)).toBe('2026-06-30T18:30');
  });

  it('isFutureDatetimeLocalValue should reject past values', () => {
    const past = new Date(Date.now() - 60_000);
    expect(isFutureDatetimeLocalValue(toDatetimeLocalValue(past))).toBeFalse();
  });

  it('parseDatetimeLocalValue should return finite timestamp', () => {
    expect(Number.isFinite(parseDatetimeLocalValue('2026-12-31T12:00'))).toBeTrue();
  });
});
