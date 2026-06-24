import { CookieService } from './cookie.service';

describe('CookieService', () => {
  let service: CookieService;

  beforeEach(() => {
    service = new CookieService();
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('set/get', () => {
    it('should set and get a cookie', () => {
      service.set('test_key', 'test_value', 1);
      expect(service.get('test_key')).toBe('test_value');
    });

    it('should encode special characters', () => {
      service.set('encoded', 'hello world&foo=bar', 1);
      expect(service.get('encoded')).toBe('hello world&foo=bar');
    });

    it('should return null for non-existent cookie', () => {
      expect(service.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing cookie', () => {
      service.set('key', 'value1', 1);
      service.set('key', 'value2', 1);
      expect(service.get('key')).toBe('value2');
    });
  });

  describe('remove', () => {
    it('should remove a cookie', () => {
      service.set('to_remove', 'value', 1);
      expect(service.get('to_remove')).toBe('value');
      service.remove('to_remove');
      expect(service.get('to_remove')).toBeNull();
    });
  });

  describe('exists', () => {
    it('should return true for existing cookie', () => {
      service.set('exists_key', 'val', 1);
      expect(service.exists('exists_key')).toBeTrue();
    });

    it('should return false for non-existent cookie', () => {
      expect(service.exists('no_such_key')).toBeFalse();
    });
  });

  describe('clear', () => {
    it('should remove all cookies', () => {
      service.set('c1', 'v1', 1);
      service.set('c2', 'v2', 1);
      service.clear();
      expect(service.get('c1')).toBeNull();
      expect(service.get('c2')).toBeNull();
    });
  });
});
