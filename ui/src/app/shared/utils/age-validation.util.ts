export const MIN_REGISTRATION_AGE = 14;

const BIRTHDAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseBirthdayParts(birthday: string): [number, number, number] | null {
  const match = BIRTHDAY_PATTERN.exec(birthday);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) {
    return null;
  }

  return [year, month, day];
}

function calendarAge(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  referenceYear: number,
  referenceMonth: number,
  referenceDay: number
): number {
  let age = referenceYear - birthYear;
  if (referenceMonth < birthMonth || (referenceMonth === birthMonth && referenceDay < birthDay)) {
    age--;
  }
  return age;
}

/** Latest birthday that still satisfies the minimum age on the given date. */
export function maxBirthdayForMinAge(minAge = MIN_REGISTRATION_AGE, referenceDate = new Date()): string {
  const max = new Date(
    referenceDate.getFullYear() - minAge,
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  return formatDateForInput(max);
}

export function meetsMinimumAge(
  birthday: string,
  minAge = MIN_REGISTRATION_AGE,
  referenceDate = new Date()
): boolean {
  const parts = parseBirthdayParts(birthday);
  if (!parts) {
    return false;
  }

  const [year, month, day] = parts;
  return calendarAge(
    year,
    month,
    day,
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    referenceDate.getDate()
  ) >= minAge;
}

export const MIN_AGE_REGISTRATION_MESSAGE = `Регистрация доступна с ${MIN_REGISTRATION_AGE} лет`;
export const MIN_AGE_PROFILE_MESSAGE = `Укажите дату рождения: вам должно быть не менее ${MIN_REGISTRATION_AGE} лет`;
/** @deprecated Use MIN_AGE_REGISTRATION_MESSAGE */
export const MIN_AGE_ERROR_MESSAGE = MIN_AGE_REGISTRATION_MESSAGE;
