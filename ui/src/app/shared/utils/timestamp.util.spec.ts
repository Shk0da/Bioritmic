import {
  formatMessageDateTime,
  formatMessageTime,
  parseTimestampMs,
} from './timestamp.util';

describe('timestamp.util', () => {
  const now = new Date('2026-06-30T15:00:00');

  it('parseTimestampMs should read epoch millis', () => {
    expect(parseTimestampMs(1_719_763_200_000)).toBe(1_719_763_200_000);
  });

  it('parseTimestampMs should read epoch seconds', () => {
    expect(parseTimestampMs(1_719_763_200)).toBe(1_719_763_200_000);
  });

  it('parseTimestampMs should read timestamp object', () => {
    expect(parseTimestampMs({ time: 1_719_763_200_000 })).toBe(1_719_763_200_000);
    expect(parseTimestampMs({ seconds: 1_719_763_200 })).toBe(1_719_763_200_000);
  });

  it('parseTimestampMs should read ISO string', () => {
    expect(parseTimestampMs('2026-06-30T12:30:00.000Z')).toBe(Date.parse('2026-06-30T12:30:00.000Z'));
  });

  it('formatMessageTime should show time for today', () => {
    const today = new Date('2026-06-30T14:35:00');
    expect(formatMessageTime(today.getTime(), now)).toBe('14:35');
  });

  it('formatMessageTime should show yesterday label', () => {
    const yesterday = new Date('2026-06-29T09:10:00');
    expect(formatMessageTime(yesterday.getTime(), now)).toBe('вчера, 09:10');
  });

  it('formatMessageDateTime should return full datetime', () => {
    const value = formatMessageDateTime(new Date('2026-06-30T14:35:00').getTime());
    expect(value).toContain('2026');
    expect(value).toContain('14:35');
  });
});
