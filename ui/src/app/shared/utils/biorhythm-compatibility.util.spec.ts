import {
  hasSameBirthday,
  shouldShowUnpredictableCompatibility,
  UNPREDICTABLE_COMPATIBILITY_MESSAGE,
} from './biorhythm-compatibility.util';

describe('biorhythm-compatibility.util', () => {
  it('should detect same birthday', () => {
    expect(hasSameBirthday('1990-07-15', '1990-07-15')).toBeTrue();
    expect(hasSameBirthday('1990-07-15T00:00:00.000Z', '1990-07-15')).toBeTrue();
  });

  it('should ignore different birthdays', () => {
    expect(hasSameBirthday('1990-07-15', '1991-07-15')).toBeFalse();
    expect(hasSameBirthday(undefined, '1990-07-15')).toBeFalse();
  });

  it('should expose unpredictable compatibility message', () => {
    expect(UNPREDICTABLE_COMPATIBILITY_MESSAGE).toBe('Совместимость непредсказуема');
    expect(shouldShowUnpredictableCompatibility('1990-01-01', '1990-01-01')).toBeTrue();
  });
});
