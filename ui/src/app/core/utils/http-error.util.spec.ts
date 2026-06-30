import { HttpErrorResponse } from '@angular/common/http';
import { resolveHttpErrorMessage } from './http-error.util';

describe('resolveHttpErrorMessage', () => {
  it('should return network message for status 0', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
    expect(resolveHttpErrorMessage(error)).toContain('соединения');
  });

  it('should return friendly message for 413', () => {
    const error = new HttpErrorResponse({ status: 413, statusText: 'Payload Too Large' });
    expect(resolveHttpErrorMessage(error)).toContain('большие');
  });

  it('should use API errors array message', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { errors: [{ message: 'Неверный параметр file' }] },
    });
    expect(resolveHttpErrorMessage(error)).toBe('Неверный параметр file');
  });

  it('should use Russian message for API-412', () => {
    const error = new HttpErrorResponse({
      status: 412,
      error: { errors: [{ errorCode: 'API-412', message: 'The user blocked you.' }] },
    });
    expect(resolveHttpErrorMessage(error)).toContain('ограничил');
  });

  it('should hide email in user-not-found API message', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: {
        errors: [{ errorCode: 'API-404', message: 'User with email: [test@example.com] not found.' }],
      },
    });
    expect(resolveHttpErrorMessage(error)).toBe('Неверный email или пароль');
  });

  it('should map coordinates-not-found API message to friendly text', () => {
    const error = new HttpErrorResponse({
      status: 404,
      error: {
        errors: [{ errorCode: 'API-404', message: 'Coordinates for User not found. Please update GIS data.' }],
      },
    });
    expect(resolveHttpErrorMessage(error)).toContain('местоположение');
  });

  it('should map birthday age validation message to friendly text', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        errors: [{
          errorCode: 'API-400.6',
          message: 'Parameter [birthday] value is invalid. Valid range of values: [14-100].',
        }],
      },
    });
    expect(resolveHttpErrorMessage(error)).toBe('Вам должно быть не менее 14 лет');
  });

  it('should fall back to generic server error', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
    expect(resolveHttpErrorMessage(error)).toContain('Ошибка сервера');
  });
});
