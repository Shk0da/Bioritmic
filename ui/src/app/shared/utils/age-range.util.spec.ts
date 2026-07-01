import { normalizeAgeRange } from './age-range.util';

describe('age-range.util', () => {
  it('normalizeAgeRange should keep valid range unchanged', () => {
    expect(normalizeAgeRange(18, 45)).toEqual({ ageMin: 18, ageMax: 45 });
  });

  it('normalizeAgeRange should bump max when min catches up', () => {
    expect(normalizeAgeRange(50, 50)).toEqual({ ageMin: 50, ageMax: 51 });
  });

  it('normalizeAgeRange should pull min back when both sliders are at max', () => {
    expect(normalizeAgeRange(100, 100)).toEqual({ ageMin: 99, ageMax: 100 });
  });

  it('normalizeAgeRange should lower min when max drops below it', () => {
    expect(normalizeAgeRange(50, 30)).toEqual({ ageMin: 49, ageMax: 50 });
  });

  it('normalizeAgeRange should clamp values to allowed bounds', () => {
    expect(normalizeAgeRange(5, 120)).toEqual({ ageMin: 14, ageMax: 100 });
  });
});
