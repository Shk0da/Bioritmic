const { By, until } = require('selenium-webdriver');
const assert = require('assert');
const {
  USER_A,
  BASE_URL,
  createDriver,
  quitDriver,
  waitAndClick,
  waitAndType,
  waitForUrlContains,
  isElementPresent,
  navigateTo,
  registerUser,
  loginUser,
  getCurrentUserId,
} = require('./helpers');

let driver;

async function setup() {
  driver = await createDriver();
}

async function teardown() {
  await quitDriver(driver);
}

async function getCookies(driver) {
  return driver.manage().getCookies();
}

async function getCookieByName(driver, name) {
  const cookies = await driver.manage().getCookies();
  return cookies.find(c => c.name === name);
}

async function isLoggedIn(driver) {
  const cookie = await getCookieByName(driver, 'access_token');
  return !!cookie;
}

// ==================== КНОПКА ЛОГАУТА ====================

describe('Кнопка логаута в хедере', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Кнопка "Выйти" отображается в хедере', async function () {
    const logoutBtn = await isElementPresent(
      driver,
      By.css('a[title="Выйти"]')
    );
    assert.ok(logoutBtn, 'Кнопка "Выйти" должна отображаться в хедере');
  });

  it('Кнопка содержит иконку выхода', async function () {
    const logoutBtn = await driver.findElement(By.css('a[title="Выйти"]'));
    const icon = await logoutBtn.findElement(By.css('i.bi-box-arrow-right'));
    assert.ok(icon, 'Кнопка должна содержать иконку bi-box-arrow-right');
  });

  it('Кнопка находится в секции user-menu', async function () {
    const userMenu = await isElementPresent(
      driver,
      By.css('.user-menu a[title="Выйти"]')
    );
    assert.ok(userMenu, 'Кнопка "Выйти" должна быть в секции user-menu');
  });
});

// ==================== ПРОЦЕСС ЛОГАУТА ====================

describe('Процесс логаута', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
    await navigateTo(driver, '/swipe');
  });

  it('Пользователь авторизован перед логаутом', async function () {
    const loggedIn = await isLoggedIn(driver);
    assert.ok(loggedIn, 'Пользователь должен быть авторизован');
  });

  it('Клик по "Выйти" перенаправляет на /auth/login', async function () {
    const logoutBtn = await driver.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();

    await waitForUrlContains(driver, '/auth/login', 10000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `Должен быть редирект на /auth/login, текущий URL: ${url}`);
  });

  it('Cookie access_token удаляется после логаута', async function () {
    const tokenCookie = await getCookieByName(driver, 'access_token');
    assert.ok(!tokenCookie, 'Cookie access_token должен быть удалён');
  });

  it('Cookie refresh_token удаляется после логаута', async function () {
    const refreshCookie = await getCookieByName(driver, 'refresh_token');
    assert.ok(!refreshCookie, 'Cookie refresh_token должен быть удалён');
  });

  it('Cookie current_user удаляется после логаута', async function () {
    const userCookie = await getCookieByName(driver, 'current_user');
    assert.ok(!userCookie, 'Cookie current_user должен быть удалён');
  });

  it('Пользователь не авторизован после логаута', async function () {
    const loggedIn = await isLoggedIn(driver);
    assert.ok(!loggedIn, 'Пользователь не должен быть авторизован после логаута');
  });
});

// ==================== ЗАЩИЩЕННЫЕ МАРШРУТЫ ПОСЛЕ ЛОГАУТА ====================

describe('Защищённые маршруты после логаута', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Редирект на /auth/login при переходе на /swipe после логаута', async function () {
    const logoutBtn = await driver.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();
    await waitForUrlContains(driver, '/auth/login', 10000);

    await navigateTo(driver, '/swipe');
    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `/swipe должен редиректить на /auth/login, текущий URL: ${url}`);
  });

  it('Редирект на /auth/login при переходе на /mailbox после логаута', async function () {
    await navigateTo(driver, '/mailbox');
    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `/mailbox должен редиректить на /auth/login, текущий URL: ${url}`);
  });

  it('Редирект на /auth/login при переходе на /profile после логаута', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `/profile должен редиректить на /auth/login, текущий URL: ${url}`);
  });

  it('Редирект на /auth/login при переходе на /meetings после логаута', async function () {
    await navigateTo(driver, '/meetings');
    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `/meetings должен редиректить на /auth/login, текущий URL: ${url}`);
  });

  it('Редирект на /auth/login при переходе на /bookmarks после логаута', async function () {
    await navigateTo(driver, '/bookmarks');
    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `/bookmarks должен редиректить на /auth/login, текущий URL: ${url}`);
  });

  it('Редирект на /auth/login при переходе на /admin после логаута', async function () {
    await navigateTo(driver, '/admin');
    await driver.sleep(2000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `/admin должен редиректить на /auth/login, текущий URL: ${url}`);
  });
});

// ==================== ХЕДЕР ПОСЛЕ ЛОГАУТА ====================

describe('Хедер после логаута', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Навигация скрыта после логаута', async function () {
    const logoutBtn = await driver.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();
    await waitForUrlContains(driver, '/auth/login', 10000);

    const headerNav = await isElementPresent(
      driver,
      By.css('header.site-header nav.header-nav')
    );
    assert.ok(!headerNav, 'Навигация в хедере не должна отображаться на странице логина');
  });

  it('Кнопка "Выйти" не отображается на странице логина', async function () {
    const logoutBtn = await isElementPresent(
      driver,
      By.css('a[title="Выйти"]')
    );
    assert.ok(!logoutBtn, 'Кнопка "Выйти" не должна отображаться на странице логина');
  });

  it('Кнопка "Профиль" не отображается на странице логина', async function () {
    const profileBtn = await isElementPresent(
      driver,
      By.css('a[title="Профиль"]')
    );
    assert.ok(!profileBtn, 'Кнопка "Профиль" не должна отображаться на странице логина');
  });
});

// ==================== ПОВТОРНЫЙ ВХОД ПОСЛЕ ЛОГАУТА ====================

describe('Повторный вход после логаута', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Можно войти заново после логаута', async function () {
    const logoutBtn = await driver.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();
    await waitForUrlContains(driver, '/auth/login', 10000);

    await loginUser(driver, USER_A.email, USER_A.password);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/swipe'), `После повторного входа должен быть редирект на /swipe, текущий URL: ${url}`);
  });

  it('Cookie access_token восстанавливается после повторного входа', async function () {
    const tokenCookie = await getCookieByName(driver, 'access_token');
    assert.ok(tokenCookie, 'Cookie access_token должен существовать после повторного входа');
  });

  it('Хедер с навигацией отображается после повторного входа', async function () {
    const headerNav = await isElementPresent(
      driver,
      By.css('header.site-header nav.header-nav')
    );
    assert.ok(headerNav, 'Навигация в хедере должна отображаться после повторного входа');
  });

  it('Кнопка "Выйти" снова отображается', async function () {
    const logoutBtn = await isElementPresent(
      driver,
      By.css('a[title="Выйти"]')
    );
    assert.ok(logoutBtn, 'Кнопка "Выйти" должна отображаться после повторного входа');
  });
});

// ==================== ЛОГАУТ ИЗ МОБИЛЬНОЙ ВЕРСИИ ====================

describe('Логаут из мобильной версии', function () {
  this.timeout(60000);

  before(async function () {
    driver = await new (require('selenium-webdriver').Builder)()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions({
        args: ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=390,844'],
      })
      .build();
    await driver.manage().setTimeouts({ implicit: 10000, page: 30000 });
  });

  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Кнопка "Выйти" отображается в мобильной версии', async function () {
    const logoutBtn = await isElementPresent(
      driver,
      By.css('a[title="Выйти"]')
    );
    assert.ok(logoutBtn, 'Кнопка "Выйти" должна отображаться в мобильной версии');
  });

  it('Логаут работает в мобильной версии', async function () {
    const logoutBtn = await driver.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();
    await waitForUrlContains(driver, '/auth/login', 10000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), `Должен быть редирект на /auth/login, текущий URL: ${url}`);

    const loggedIn = await isLoggedIn(driver);
    assert.ok(!loggedIn, 'Пользователь не должен быть авторизован после логаута');
  });
});

// ==================== ЛОГАУТ НЕ СБРАСЫВАЕТ ТЕМУ ====================

describe('Логаут не сбрасывает тему', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Тёмная тема сохраняется после логаута', async function () {
    await driver.executeScript(`
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('bioritmic_theme', 'dark');
    `);

    const themeBefore = await driver.executeScript(
      'return document.documentElement.getAttribute("data-theme")'
    );
    assert.strictEqual(themeBefore, 'dark', 'Тема должна быть тёмной перед логаутом');

    const logoutBtn = await driver.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();
    await waitForUrlContains(driver, '/auth/login', 10000);

    const themeAfter = await driver.executeScript(
      'return document.documentElement.getAttribute("data-theme")'
    );
    assert.strictEqual(themeAfter, 'dark', 'Тёмная тема должна сохраниться после логаута');
  });

  it('Светлая тема сохраняется после логаута', async function () {
    await driver.executeScript(`
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('bioritmic_theme', 'light');
    `);

    const logoutBtn = await driver.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();
    await waitForUrlContains(driver, '/auth/login', 10000);

    const themeAfter = await driver.executeScript(
      'return document.documentElement.getAttribute("data-theme")'
    );
    assert.strictEqual(themeAfter, 'light', 'Светлая тема должна сохраниться после логаута');
  });
});
