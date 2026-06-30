import {
  formatDateForInput,
  maxBirthdayForMinAge,
  meetsMinimumAge,
  birthdayValidationMessage,
  MIN_REGISTRATION_AGE,
  MIN_AGE_PROFILE_MESSAGE,
} from './age-validation.util';

describe('age-validation.util', () => {
  const referenceDate = new Date(2026, 5, 27);

  it('should format date as yyyy-MM-dd', () => {
    expect(formatDateForInput(new Date(2000, 0, 5))).toBe('2000-01-05');
  });

  it('should return max birthday for minimum age', () => {
    expect(maxBirthdayForMinAge(MIN_REGISTRATION_AGE, referenceDate)).toBe('2012-06-27');
  });

  it('should accept user who is exactly minimum age', () => {
    expect(meetsMinimumAge('2012-06-27', MIN_REGISTRATION_AGE, referenceDate)).toBeTrue();
  });

  it('should reject user younger than minimum age', () => {
    expect(meetsMinimumAge('2013-06-28', MIN_REGISTRATION_AGE, referenceDate)).toBeFalse();
  });

  it('should reject empty birthday', () => {
    expect(meetsMinimumAge('', MIN_REGISTRATION_AGE, referenceDate)).toBeFalse();
  });

  it('should reject invalid birthday format', () => {
    expect(meetsMinimumAge('2020-13-40', MIN_REGISTRATION_AGE, referenceDate)).toBeFalse();
  });

  it('should validate birthday format and age in birthdayValidationMessage', () => {
    expect(birthdayValidationMessage('')).toBeNull();
    expect(birthdayValidationMessage('30.06.2026')).toContain('корректную');
    expect(birthdayValidationMessage('2026-06-30')).toBe(MIN_AGE_PROFILE_MESSAGE);
    expect(birthdayValidationMessage('2012-06-27')).toBeNull();
  });
});
