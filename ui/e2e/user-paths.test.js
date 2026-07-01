/**
 * Smoke-тесты всех пользовательских маршрутов приложения.
 * Проверяет доступность страниц, редиректы и отсутствие сырого JSON на экране.
 */
const { By } = require('selenium-webdriver');
const assert = require('assert');
const {
  clearSession,
  createDriver,
  quitDriver,
  registerUser,
  loginUser,
  loginAsAdmin,
  loginSeedAdmin,
  navigateTo,
  waitForUrlContains,
  waitAndClick,
  assertRouteAccessible,
  assertNoRawJsonError,
  clickHeaderNav,
  dismissOpenModals,
  makeUser,
} = require('./helpers');

// ==================== ГОСТЬ (без авторизации) ====================

describe('Публичные маршруты — гость', function () {
  this.timeout(60000);

  let driver;

  before(async function () {
    driver = await createDriver();
    await clearSession(driver);
  });

  after(async function () {
    await quitDriver(driver);
  });

  const publicRoutes = [
    { path: '/auth/login', text: 'Bioritmic' },
    { path: '/auth/registration', text: 'Создать аккаунт' },
    { path: '/auth/recovery', text: 'Восстановление пароля' },
    { path: '/auth/reset-password?code=test-code', text: 'Новый пароль' },
  ];

  for (const route of publicRoutes) {
    it(`GET ${route.path} открывается без авторизации`, async function () {
      await assertRouteAccessible(driver, route.path, {
        expectedUrlIncludes: route.path.split('?')[0],
        expectedText: route.text,
      });
    });
  }

  it('GET /auth редиректит на /auth/login', async function () {
    await navigateTo(driver, '/auth');
    await waitForUrlContains(driver, '/auth/login', 10000);
    await assertNoRawJsonError(driver);
  });
});

// ==================== ЗАЩИЩЁННЫЕ МАРШРУТЫ БЕЗ АВТОРИЗАЦИИ ====================

describe('Защищённые маршруты — редирект на логин', function () {
  this.timeout(90000);

  let driver;

  before(async function () {
    driver = await createDriver();
    await clearSession(driver);
  });

  after(async function () {
    await quitDriver(driver);
  });

  const protectedRoutes = [
    '/swipe',
    '/search',
    '/profile',
    '/profile/me',
    '/profile/me/edit',
    '/bookmarks',
    '/mailbox',
    '/meetings',
    '/settings',
    '/settings/search',
    '/settings/notifications',
    '/settings/location',
    '/settings/feedback',
    '/settings/danger',
    '/settings/blocked',
    '/payments',
    '/admin',
    '/user/00000000-0000-0000-0000-000000000099',
  ];

  for (const path of protectedRoutes) {
    it(`GET ${path} редиректит на /auth/login`, async function () {
      await navigateTo(driver, path);
      await waitForUrlContains(driver, '/auth/login', 15000);
      await assertNoRawJsonError(driver);
    });
  }
});

// ==================== ВЕРИФИЦИРОВАННЫЙ ПОЛЬЗОВАТЕЛЬ ====================

describe('Маршруты верифицированного пользователя', function () {
  this.timeout(180000);

  let driver;

  before(async function () {
    driver = await createDriver();
    await loginSeedAdmin(driver);
  });

  after(async function () {
    await quitDriver(driver);
  });

  const verifiedRoutes = [
    { path: '/swipe', url: '/swipe' },
    { path: '/search', url: '/search', text: 'Фильтры' },
    { path: '/profile', url: '/profile' },
    { path: '/profile/me', url: '/profile/me' },
    { path: '/profile/me/edit', url: '/profile/me/edit', text: 'Редактирование профиля' },
    { path: '/bookmarks', url: '/bookmarks', text: 'Избранное' },
    { path: '/mailbox', url: '/mailbox', text: 'Сообщения' },
    { path: '/meetings', url: '/meetings', text: 'Встречи' },
    { path: '/settings', url: '/settings', text: 'Настройки' },
    { path: '/settings/search', url: '/settings/search', text: 'Параметры поиска' },
    { path: '/settings/notifications', url: '/settings/notifications', text: 'Уведомления и приложение' },
    { path: '/settings/location', url: '/settings/location', text: 'Моё местоположение' },
    { path: '/settings/feedback', url: '/settings/feedback', text: 'Обратная связь' },
    { path: '/settings/danger', url: '/settings/danger', text: 'Опасная зона' },
    { path: '/settings/blocked', url: '/settings/blocked', text: 'Заблокированные пользователи' },
    { path: '/payments', url: '/payments', text: 'Алмазы' },
  ];

  for (const route of verifiedRoutes) {
    it(`GET ${route.path} доступен верифицированному пользователю`, async function () {
      await assertRouteAccessible(driver, route.path, {
        expectedUrlIncludes: route.url,
        expectedText: route.text,
      });
    });
  }

  it('GET /user/:id открывает профиль другого пользователя', async function () {
    const otherUserId = 'a0000000-0000-0000-0000-000000000002';
    await assertRouteAccessible(driver, `/user/${otherUserId}`, {
      expectedUrlIncludes: `/user/${otherUserId}`,
    });
  });

  it('GET /mailbox/:userId открывает новый чат без истории', async function () {
    const otherUserId = 'a0000000-0000-0000-0000-000000000002';
    await assertRouteAccessible(driver, `/mailbox/${otherUserId}`, {
      expectedUrlIncludes: `/mailbox/${otherUserId}`,
      expectedText: 'Напишите первое сообщение',
    });
  });

  it('GET /mailbox/conversation/:userId редиректит на /mailbox/:userId', async function () {
    const otherUserId = 'a0000000-0000-0000-0000-000000000002';
    await navigateTo(driver, `/mailbox/conversation/${otherUserId}`);
    await waitForUrlContains(driver, `/mailbox/${otherUserId}`, 10000);
    await assertNoRawJsonError(driver);
    const bodyText = await driver.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Написать сообщение') || bodyText.includes('Сообщения'),
      'Должна открыться панель чата'
    );
  });

  it('GET /admin недоступен обычному пользователю (редирект на /swipe)', async function () {
    const regularUser = makeUser({ name: 'Regular User Paths', gender: 'WOMAN' });
    await clearSession(driver);
    await registerUser(driver, regularUser);
    await navigateTo(driver, '/admin');
    await driver.sleep(1500);
    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/swipe'), `Обычный пользователь должен быть на /swipe, получен: ${url}`);
    await assertNoRawJsonError(driver);
    await loginSeedAdmin(driver);
  });
});

// ==================== НАВИГАЦИЯ ЧЕРЕЗ ХЕДЕР ====================

describe('Навигация через хедер — верифицированный пользователь', function () {
  this.timeout(120000);

  let driver;

  before(async function () {
    driver = await createDriver();
    await loginSeedAdmin(driver);
  });

  after(async function () {
    await quitDriver(driver);
  });

  const headerNav = [
    { title: 'Поиск', url: '/swipe' },
    { title: 'Избранное', url: '/bookmarks' },
    { title: 'Сообщения', url: '/mailbox' },
    { title: 'Встречи', url: '/meetings' },
    { title: 'Профиль', url: '/profile' },
  ];

  for (const item of headerNav) {
    it(`Клик "${item.title}" в хедере ведёт на ${item.url}`, async function () {
      await navigateTo(driver, '/swipe');
      await clickHeaderNav(driver, item.title);
      const url = await driver.getCurrentUrl();
      assert.ok(url.includes(item.url), `Ожидался ${item.url}, получен: ${url}`);
      await assertNoRawJsonError(driver);
    });
  }

  it('Клик по логотипу ведёт на /swipe', async function () {
    await navigateTo(driver, '/settings/search');
    await waitAndClick(driver, By.css('a.header-logo'));
    await waitForUrlContains(driver, '/swipe', 10000);
    await assertNoRawJsonError(driver);
  });
});

// ==================== НЕВЕРИФИЦИРОВАННЫЙ ПОЛЬЗОВАТЕЛЬ ====================

describe('Маршруты неверифицированного пользователя', function () {
  this.timeout(120000);

  let driver;

  before(async function () {
    driver = await createDriver();
    await registerUser(driver, makeUser({
      name: 'Тест Unverified',
      password: 'TestPass789',
      birthday: '1992-11-11',
    }));
  });

  after(async function () {
    await quitDriver(driver);
  });

  const allowedRoutes = [
    { path: '/swipe', url: '/swipe' },
    { path: '/profile/me', url: '/profile' },
    { path: '/profile/me/edit', url: '/profile/me/edit' },
    { path: '/settings', url: '/settings' },
    { path: '/settings/search', url: '/settings/search' },
    { path: '/settings/location', url: '/settings/location' },
    { path: '/settings/notifications', url: '/settings/notifications' },
    { path: '/settings/feedback', url: '/settings/feedback' },
    { path: '/settings/danger', url: '/settings/danger' },
    { path: '/settings/blocked', url: '/settings/blocked' },
  ];

  for (const route of allowedRoutes) {
    it(`GET ${route.path} доступен неверифицированному пользователю`, async function () {
      await assertRouteAccessible(driver, route.path, {
        expectedUrlIncludes: route.url,
      });
    });
  }

  const restrictedRoutes = [
    '/search',
    '/bookmarks',
    '/mailbox',
    '/meetings',
  ];

  for (const path of restrictedRoutes) {
    it(`GET ${path} редиректит неверифицированного на /swipe`, async function () {
      await navigateTo(driver, path);
      await waitForUrlContains(driver, '/swipe', 10000);
      await assertNoRawJsonError(driver);
    });
  }
});

// ==================== АДМИНИСТРАТОР ====================

describe('Маршруты администратора', function () {
  this.timeout(120000);

  let driver;

  before(async function () {
    driver = await createDriver();
    await loginAsAdmin(driver);
  });

  after(async function () {
    await quitDriver(driver);
  });

  it('GET /admin доступен администратору', async function () {
    await assertRouteAccessible(driver, '/admin', {
      expectedUrlIncludes: '/admin',
      expectedText: 'Админ-панель',
    });
  });

  const adminTabs = [
    { label: 'Пользователи', text: 'Пользователи' },
    { label: 'Жалобы', text: 'Жалобы' },
    { label: 'Обратная связь', text: 'Обратная связь' },
    { label: 'Метрики', text: 'Метрики' },
  ];

  for (const tab of adminTabs) {
    it(`Вкладка "${tab.label}" открывается в админ-панели`, async function () {
      await navigateTo(driver, '/admin');
      await dismissOpenModals(driver);
      const buttons = await driver.findElements(By.css('.nav-tabs .nav-link'));
      let clicked = false;
      for (const btn of buttons) {
        const text = await btn.getText();
        if (text.includes(tab.label)) {
          await btn.click();
          clicked = true;
          break;
        }
      }
      assert.ok(clicked, `Вкладка "${tab.label}" должна быть на странице`);
      await driver.sleep(800);
      await assertNoRawJsonError(driver);
      const bodyText = await driver.findElement(By.css('body')).getText();
      assert.ok(bodyText.includes(tab.text), `После клика должна отображаться вкладка "${tab.label}"`);
    });
  }

  it('Клик "Админ-панель" в хедере ведёт на /admin', async function () {
    await navigateTo(driver, '/swipe');
    await clickHeaderNav(driver, 'Админ-панель');
    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/admin'), `Ожидался /admin, получен: ${url}`);
    await assertNoRawJsonError(driver);
  });
});

// ==================== СТРАНИЦЫ ОШИБОК ====================

describe('Страницы ошибок', function () {
  this.timeout(60000);

  let driver;

  before(async function () {
    driver = await createDriver();
  });

  after(async function () {
    await quitDriver(driver);
  });

  const errorPages = [
    { path: '/error/404', code: '404', text: 'Страница не найдена' },
    { path: '/error/500', code: '500', text: 'Сервер временно недоступен' },
    { path: '/error/401', code: '401', text: 'Требуется вход' },
    { path: '/error/403', code: '403', text: 'Доступ запрещён' },
  ];

  for (const page of errorPages) {
    it(`GET ${page.path} показывает красивую страницу ${page.code}`, async function () {
      await assertRouteAccessible(driver, page.path, {
        expectedUrlIncludes: `/error/${page.code}`,
        expectedText: page.text,
      });
    });
  }

  it('Неизвестный маршрут редиректит на /error/404', async function () {
    await navigateTo(driver, '/this-route-does-not-exist-xyz');
    await waitForUrlContains(driver, '/error/404', 10000);
    await assertNoRawJsonError(driver);
    const bodyText = await driver.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Страница не найдена'), 'Должна отображаться страница 404');
  });
});
