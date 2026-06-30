import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  errors?: Array<{ message?: string; errorCode?: string }>;
  message?: string;
}

const ERROR_CODE_MESSAGES_RU: Record<string, string> = {
  'API-412': 'К сожалению, пользователь ограничил с вами общение.',
  'API-409': 'Пользователь с таким email уже зарегистрирован.',
  'API-400.7': 'Неверный код восстановления.',
  'API-400.9': 'Фото должно быть в формате JPG или PNG.',
  'API-403.1': 'Подтвердите аккаунт для этой операции.',
  'API-429': 'Слишком много запросов. Подождите немного.',
  'API-503': 'Сервис временно недоступен. Попробуйте позже.',
  'API-500': 'Ошибка сервера. Попробуйте позже.',
};

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

export function isMutationMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}
