import { Gender } from '../../core/models/user.model';

const ZODIAC_EMOJIS = ['♑', '♒', '♓', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐'];
const ZODIAC_NAMES = [
  'Козерог',
  'Водолей',
  'Рыбы',
  'Овен',
  'Телец',
  'Близнецы',
  'Рак',
  'Лев',
  'Дева',
  'Весы',
  'Скорпион',
  'Стрелец',
];

const ZODIAC_BY_DATE: Array<{ sign: string; startDay: number; endDay: number; month: number }> = [
  { sign: '♑', startDay: 22, endDay: 31, month: 12 },
  { sign: '♑', startDay: 1, endDay: 19, month: 1 },
  { sign: '♒', startDay: 20, endDay: 31, month: 1 },
  { sign: '♒', startDay: 1, endDay: 18, month: 2 },
  { sign: '♓', startDay: 19, endDay: 29, month: 2 },
  { sign: '♓', startDay: 1, endDay: 20, month: 3 },
  { sign: '♈', startDay: 21, endDay: 31, month: 3 },
  { sign: '♈', startDay: 1, endDay: 19, month: 4 },
  { sign: '♉', startDay: 20, endDay: 30, month: 4 },
  { sign: '♉', startDay: 1, endDay: 20, month: 5 },
  { sign: '♊', startDay: 21, endDay: 31, month: 5 },
  { sign: '♊', startDay: 1, endDay: 20, month: 6 },
  { sign: '♋', startDay: 21, endDay: 30, month: 6 },
  { sign: '♋', startDay: 1, endDay: 22, month: 7 },
  { sign: '♌', startDay: 23, endDay: 31, month: 7 },
  { sign: '♌', startDay: 1, endDay: 22, month: 8 },
  { sign: '♍', startDay: 23, endDay: 31, month: 8 },
  { sign: '♍', startDay: 1, endDay: 22, month: 9 },
  { sign: '♎', startDay: 23, endDay: 30, month: 9 },
  { sign: '♎', startDay: 1, endDay: 22, month: 10 },
  { sign: '♏', startDay: 23, endDay: 31, month: 10 },
  { sign: '♏', startDay: 1, endDay: 21, month: 11 },
  { sign: '♐', startDay: 22, endDay: 30, month: 11 },
  { sign: '♐', startDay: 1, endDay: 21, month: 12 },
  { sign: '♑', startDay: 22, endDay: 31, month: 12 },
];

export function isMaleGender(gender?: Gender | string): boolean {
  return gender === Gender.MAN || gender === 'MAN';
}

export function getGenderSymbol(gender?: Gender | string): string {
  return isMaleGender(gender) ? '👨' : '👩';
}

export function getGenderLabel(gender?: Gender | string): string {
  return isMaleGender(gender) ? 'Муж' : 'Жен';
}

export function getZodiacEmoji(horo?: number, birthday?: string): string {
  if (horo && horo >= 1 && horo <= 12) {
    return ZODIAC_EMOJIS[horo - 1];
  }

  if (!birthday) {
    return '';
  }

  const date = new Date(birthday);
  const day = date.getDate();
  const month = date.getMonth() + 1;

  for (const zodiac of ZODIAC_BY_DATE) {
    if (month === zodiac.month && day >= zodiac.startDay && day <= zodiac.endDay) {
      return zodiac.sign;
    }
  }

  return '';
}

export function getZodiacSignName(horo?: number, birthday?: string): string {
  if (horo && horo >= 1 && horo <= 12) {
    return ZODIAC_NAMES[horo - 1];
  }

  const emoji = getZodiacEmoji(undefined, birthday);
  if (!emoji) {
    return '';
  }

  const index = ZODIAC_EMOJIS.indexOf(emoji);
  return index >= 0 ? ZODIAC_NAMES[index] : '';
}
