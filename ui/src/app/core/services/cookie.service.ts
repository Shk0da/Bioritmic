import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CookieService {

  /**
   * Установить cookie
   * @param name Имя cookie
   * @param value Значение cookie
   * @param days Срок хранения в днях (по умолчанию 7 дней)
   */
  set(name: string, value: string, days: number = 7): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const expiresString = `expires=${expires.toUTCString()}`;
    const secureFlag = location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)};${expiresString};path=/;SameSite=Strict${secureFlag}`;
  }

  /**
   * Получить значение cookie
   * @param name Имя cookie
   * @returns Значение cookie или null
   */
  get(name: string): string | null {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    return null;
  }

  /**
   * Удалить cookie
   * @param name Имя cookie
   */
  remove(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }

  /**
   * Проверить существование cookie
   * @param name Имя cookie
   * @returns true если cookie существует
   */
  exists(name: string): boolean {
    return this.get(name) !== null;
  }

  /**
   * Очистить все cookie приложения
   */
  clear(): void {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      const name = cookie.split('=')[0];
      this.remove(name);
    }
  }
}
