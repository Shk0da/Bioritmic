import {
  isValidNick,
  nickValidationMessage,
  NICK_MAX_LENGTH,
  resolveProfileLinkId,
} from './profile-link.util';

describe('profile-link.util', () => {
  describe('resolveProfileLinkId', () => {
    it('should prefer nick over id', () => {
      expect(resolveProfileLinkId({ id: 'uuid-1', nick: 'alex_42' })).toBe('alex_42');
    });

    it('should trim nick before using it', () => {
      expect(resolveProfileLinkId({ id: 'uuid-1', nick: '  my_nick  ' })).toBe('my_nick');
    });

    it('should fall back to id when nick is empty', () => {
      expect(resolveProfileLinkId({ id: 'uuid-1', nick: '' })).toBe('uuid-1');
      expect(resolveProfileLinkId({ id: 'uuid-1', nick: '   ' })).toBe('uuid-1');
      expect(resolveProfileLinkId({ id: 'uuid-1' })).toBe('uuid-1');
    });

    it('should return empty string when neither nick nor id is set', () => {
      expect(resolveProfileLinkId({})).toBe('');
    });
  });

  describe('isValidNick', () => {
    it('should allow empty nick', () => {
      expect(isValidNick('')).toBeTrue();
      expect(isValidNick('   ')).toBeTrue();
    });

    it('should allow latin letters, digits, underscore and hyphen', () => {
      expect(isValidNick('Alex_42-test')).toBeTrue();
    });

    it('should reject invalid characters', () => {
      expect(isValidNick('bad nick')).toBeFalse();
      expect(isValidNick('кириллица')).toBeFalse();
      expect(isValidNick('nick!')).toBeFalse();
    });

    it('should reject reserved nicks', () => {
      expect(isValidNick('me')).toBeFalse();
      expect(isValidNick('blocked')).toBeFalse();
      expect(isValidNick('settings')).toBeFalse();
    });

    it('should reject nick longer than max length', () => {
      expect(isValidNick('a'.repeat(NICK_MAX_LENGTH + 1))).toBeFalse();
    });
  });

  describe('nickValidationMessage', () => {
    it('should return null for empty nick', () => {
      expect(nickValidationMessage('')).toBeNull();
      expect(nickValidationMessage('   ')).toBeNull();
    });

    it('should return message for invalid characters', () => {
      expect(nickValidationMessage('bad nick')).toContain('латинские');
    });

    it('should return message for too long nick', () => {
      expect(nickValidationMessage('a'.repeat(NICK_MAX_LENGTH + 1))).toContain(`${NICK_MAX_LENGTH}`);
    });

    it('should return message for reserved nick', () => {
      expect(nickValidationMessage('me')).toContain('зарезервирован');
    });
  });
});
