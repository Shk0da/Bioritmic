import { isSystemMailMessage, MEETING_SYSTEM_MAIL_MESSAGES } from './mail-system-message.util';

describe('mail-system-message.util', () => {
  it('detects system flag from API', () => {
    expect(isSystemMailMessage({ isSystem: true, message: 'test' })).toBeTrue();
  });

  it('detects SYSTEM media type', () => {
    expect(isSystemMailMessage({ mediaType: 'SYSTEM', message: 'test' })).toBeTrue();
  });

  it('detects legacy meeting notification texts', () => {
    for (const message of MEETING_SYSTEM_MAIL_MESSAGES) {
      expect(isSystemMailMessage({ message })).toBeTrue();
    }
  });

  it('returns false for regular messages', () => {
    expect(isSystemMailMessage({ message: 'Привет!' })).toBeFalse();
  });
});
