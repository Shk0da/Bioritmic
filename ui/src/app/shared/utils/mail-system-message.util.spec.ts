import { isSystemMailMessage, isSystemMailVisibleToViewer, MEETING_SYSTEM_MAIL_MESSAGES } from './mail-system-message.util';

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

  it('shows system messages only to recipient', () => {
    const systemMessage = {
      to: 'recipient-id',
      from: 'sender-id',
      isSystem: true,
      message: MEETING_SYSTEM_MAIL_MESSAGES[0],
    };
    expect(isSystemMailVisibleToViewer(systemMessage, 'recipient-id')).toBeTrue();
    expect(isSystemMailVisibleToViewer(systemMessage, 'sender-id')).toBeFalse();
    expect(isSystemMailVisibleToViewer(systemMessage, null)).toBeFalse();
  });

  it('shows regular messages to both participants', () => {
    const regularMessage = { to: 'user-b', from: 'user-a', message: 'Привет!' };
    expect(isSystemMailVisibleToViewer(regularMessage, 'user-a')).toBeTrue();
    expect(isSystemMailVisibleToViewer(regularMessage, 'user-b')).toBeTrue();
  });
});
