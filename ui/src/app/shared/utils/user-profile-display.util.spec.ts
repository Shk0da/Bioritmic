import { Gender } from '../../core/models/user.model';
import {
  getGenderLabel,
  getGenderSymbol,
  getZodiacEmoji,
  getZodiacSignName,
} from './user-profile-display.util';

describe('user-profile-display.util', () => {
  it('getGenderSymbol should return gender symbols', () => {
    expect(getGenderSymbol(Gender.MAN)).toBe('♂');
    expect(getGenderSymbol(Gender.WOMAN)).toBe('♀');
  });

  it('getGenderLabel should return readable gender', () => {
    expect(getGenderLabel(Gender.MAN)).toBe('Мужской');
    expect(getGenderLabel(Gender.WOMAN)).toBe('Женский');
  });

  it('getZodiacEmoji should use horo when available', () => {
    expect(getZodiacEmoji(4)).toBe('♈');
    expect(getZodiacSignName(4)).toBe('Овен');
  });

  it('getZodiacEmoji should fallback to birthday', () => {
    expect(getZodiacEmoji(undefined, '1990-04-10')).toBe('♈');
  });
});
