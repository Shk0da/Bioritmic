import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  errors?: Array<{ message?: string; errorCode?: string }>;
  message?: string;
}

const ERROR_CODE_MESSAGES_RU: Record<string, string> = {
  'API-412': 'К сожалению, пользователь ограничил с вами общение.',
  'API-409': 'Пользователь с таким email уже зарегистрирован.',
  'API-409.1': 'Этот ник уже занят.',
  'API-400.7': 'Неверный код восстановления.',
  'API-400.9': 'Фото должно быть в формате JPG или PNG.',
  'API-400.10': 'Недостаточно алмазов на балансе',
  'API-400.11': 'Перевод алмазов доступен только после первого пополнения. Нажмите «Пополнить».',
  'API-403.1': 'Подтвердите аккаунт для этой операции.',
  'API-429': 'Слишком много запросов. Подождите немного.',
  'API-503': 'Сервис временно недоступен. Попробуйте позже.',
  'API-500': 'Ошибка сервера. Попробуйте позже.',
};

const BUSINESS_ERROR_MESSAGES_RU: Record<string, string> = {
  'Top up your balance before transferring diamonds': 'Перевод алмазов доступен только после первого пополнения. Нажмите «Пополнить».',
  'Diamond transfers are available after your first balance top-up': 'Перевод алмазов доступен только после первого пополнения. Нажмите «Пополнить».',
  'Insufficient diamond balance': 'Недостаточно алмазов',
  'Cannot transfer to yourself': 'Нельзя перевести алмазы самому себе',
  'Recipient must be in bookmarks': 'Получатель должен быть в избранном',
  'Amount must be positive': 'Укажите положительную сумму',
  'Amount must be between 1 and 1000000': 'Сумма должна быть от 1 до 1 000 000',
  'Сумма должна быть от 1 до 1 000 000': 'Сумма должна быть от 1 до 1 000 000',
  'Balance cannot be negative': 'Баланс не может быть отрицательным',
  'Необходимо принять пользовательское соглашение и дать согласие на обработку персональных данных':
    'Необходимо принять пользовательское соглашение и дать согласие на обработку персональных данных',
};

function isBrokenApiTemplateMessage(message: string): boolean {
  return /\$\{[^}]+\}/.test(message) ||
    /parameter \[(parametername|\$\{parametername\})\] value is invalid/i.test(message);
}

function isCoordinatesNotFoundMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('coordinates for user') || lower.includes('update gis data');
}

function resolveApiErrorItem(item: { message?: string; errorCode?: string }): string | null {
  const code = item.errorCode?.trim();
  if (code && ERROR_CODE_MESSAGES_RU[code]) {
    return ERROR_CODE_MESSAGES_RU[code];
  }
  const message = item.message?.trim();
  if (message && BUSINESS_ERROR_MESSAGES_RU[message]) {
    return BUSINESS_ERROR_MESSAGES_RU[message];
  }
  if (message) {
    const lower = message.toLowerCase();
    if (lower.includes('top up your balance') || lower.includes('first balance top-up') || lower.includes('first top-up')) {
      return 'Перевод алмазов доступен только после первого пополнения. Нажмите «Пополнить».';
    }
    if (lower.includes('insufficient diamond balance')) {
      return 'Недостаточно алмазов на балансе';
    }
    if (lower.includes('amount must be between') || lower.includes('сумма должна быть от')) {
      return 'Сумма должна быть от 1 до 1 000 000';
    }
  }
  if (message && isBrokenApiTemplateMessage(message)) {
    return null;
  }
  if (message && /parameter \[birthday\]/i.test(message)) {
    return 'Вам должно быть не менее 14 лет';
  }
  if (message && /user with email:/i.test(message)) {
    return 'Неверный email или пароль';
  }
  if (message && isCoordinatesNotFoundMessage(message)) {
    return 'Укажите местоположение в настройках, чтобы видеть людей рядом.';
  }
  return message || null;
}

export function isNickHttpError(error: HttpErrorResponse): boolean {
  const body = error.error as ApiErrorBody | null;
  if (body && typeof body === 'object' && Array.isArray(body.errors)) {
    return body.errors.some((item) => {
      const code = item.errorCode?.trim();
      if (code === 'API-409.1') {
        return true;
      }
      const message = item.message?.toLowerCase() ?? '';
      return message.includes('parameter [nick]') || message.includes('[nick]');
    });
  }
  return /ник/i.test(resolveHttpErrorMessage(error));
}

export function resolveHttpErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Нет соединения с сервером. Проверьте интернет и попробуйте снова.';
  }

  if (error.status === 413) {
    return 'Файл или данные слишком большие. Уменьшите размер и попробуйте снова.';
  }

  if (error.status === 429) {
    return 'Слишком много запросов. Подождите немного и повторите.';
  }

  const body = error.error as ApiErrorBody | string | null;
  if (body && typeof body === 'object' && Array.isArray(body.errors) && body.errors.length > 0) {
    const messages = body.errors
      .map((item) => resolveApiErrorItem(item))
      .filter((message): message is string => !!message);
    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  if (body && typeof body === 'object' && typeof body.message === 'string' && body.message.trim()) {
    return body.message.trim();
  }

  if (typeof body === 'string' && body.trim() && !body.trim().startsWith('<')) {
    return body.trim();
  }

  switch (error.status) {
    case 400:
      return 'Некорректный запрос. Проверьте введённые данные.';
    case 404:
      return 'Запрашиваемые данные не найдены.';
    case 408:
      return 'Превышено время ожидания ответа сервера.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Ошибка сервера. Попробуйте позже.';
    default:
      return `Ошибка запроса (${error.status}). Попробуйте позже.`;
  }
}

export function resolveDiamondTransferErrorMessage(error: unknown): string {
  const httpError = asHttpErrorResponse(error);
  const body = httpError?.error as ApiErrorBody | null;
  const item = body?.errors?.[0];
  const code = item?.errorCode?.trim();
  const message = item?.message?.trim().toLowerCase() ?? '';

  if (code === 'API-400.10' || message.includes('insufficient diamond balance')) {
    return ERROR_CODE_MESSAGES_RU['API-400.10'];
  }
  if (code === 'API-400.11' || message.includes('top up your balance') || message.includes('first balance top-up')) {
    return ERROR_CODE_MESSAGES_RU['API-400.11'];
  }
  if (message.includes('amount must be between') || message.includes('сумма должна быть от')) {
    return 'Сумма должна быть от 1 до 1 000 000';
  }

  if (httpError) {
    const resolved = resolveHttpErrorMessage(httpError);
    if (resolved === 'Некорректный запрос. Проверьте введённые данные.') {
      return 'Не удалось отправить алмазы';
    }
    return resolved;
  }

  return 'Не удалось отправить алмазы';
}

function asHttpErrorResponse(error: unknown): HttpErrorResponse | null {
  if (error instanceof HttpErrorResponse) {
    return error;
  }
  if (error && typeof error === 'object' && 'status' in error) {
    return error as HttpErrorResponse;
  }
  return null;
}

export function isMutationMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}
