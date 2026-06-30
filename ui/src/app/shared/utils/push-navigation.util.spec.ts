import { resolvePushNotificationUrl, sanitizePushNavigationUrl } from './push-navigation.util';

describe('push-navigation.util', () => {
  it('should allow in-app relative paths', () => {
    expect(sanitizePushNavigationUrl('/mailbox/uuid')).toBe('/mailbox/uuid');
    expect(sanitizePushNavigationUrl('/meetings')).toBe('/meetings');
  });

  it('should reject external and protocol-relative urls', () => {
    expect(sanitizePushNavigationUrl('//evil.com')).toBe('/');
    expect(sanitizePushNavigationUrl('https://evil.com')).toBe('/');
    expect(sanitizePushNavigationUrl('javascript:alert(1)')).toBe('/');
  });

  it('should resolve push data to safe urls', () => {
    expect(resolvePushNotificationUrl({ type: 'meeting', url: '/meetings' })).toBe('/meetings');
    expect(resolvePushNotificationUrl({ type: 'mailbox', userId: 'abc' })).toBe('/mailbox/abc');
    expect(resolvePushNotificationUrl({ url: '//evil.com' })).toBe('/');
  });
});
