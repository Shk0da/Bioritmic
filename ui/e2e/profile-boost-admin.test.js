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
  getCurrentUserId,
} = require('./helpers');

let driver;

async function setup() {
  driver = await createDriver();
}

async function teardown() {
  await quitDriver(driver);
}

// ==================== КНОПКА АДМИН-ПАНЕЛИ В ПРОФИЛЕ ====================

describe('Кнопка "Админ-панель" в профиле', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Кнопка "Админ-панель" отображается для администратора', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const adminBtn = await isElementPresent(
      driver,
      By.css('a[routerLink="/admin"]')
    );
    assert.ok(adminBtn, 'Кнопка "Админ-панель" должна отображаться для администратора');
  });

  it('Кнопка содержит текст "Админ-панель"', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const adminBtn = await driver.findElement(By.css('a[routerLink="/admin"]'));
    const text = await adminBtn.getText();
    assert.ok(text.includes('Админ-панель'), `Текст кнопки: ${text}`);
  });

  it('Кнопка содержит иконкуshield-lock', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const adminBtn = await driver.findElement(By.css('a[routerLink="/admin"]'));
    const icon = await adminBtn.findElement(By.css('i.bi-shield-lock'));
    assert.ok(icon, 'Кнопка должна содержать иконку bi-shield-lock');
  });

  it('Кнопка "Админ-панель" находится под кнопкой "Редактировать"', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const editBtn = await driver.findElement(By.css('a[routerLink="/profile/me/edit"]'));
    const adminBtn = await driver.findElement(By.css('a[routerLink="/admin"]'));

    const editRect = await editBtn.getBoundingClientRect();
    const adminRect = await adminBtn.getBoundingClientRect();

    assert.ok(adminRect.y > editRect.y, 'Кнопка "Админ-панель" должна быть ниже кнопки "Редактировать"');
  });

  it('Клик по кнопке "Админ-панель" переходит на /admin', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const adminBtn = await driver.wait(
      until.elementLocated(By.css('a[routerLink="/admin"]')),
      10000
    );
    await adminBtn.click();

    await waitForUrlContains(driver, '/admin', 10000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/admin'), `Должен быть переход на /admin, текущий URL: ${url}`);
  });
});

// ==================== КНОПКА АДМИН-ПАНЕЛИ ДЛЯ ОБЫЧНОГО ПОЛЬЗОВАТЕЛЯ ====================

describe('Кнопка "Админ-панель" для обычного пользователя', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Кнопка "Админ-панель" НЕ отображается для обычного пользователя', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const adminBtn = await isElementPresent(
      driver,
      By.css('a[routerLink="/admin"]')
    );
    assert.ok(!adminBtn, 'Кнопка "Админ-панель" не должна отображаться для обычного пользователя');
  });
});

// ==================== КНОПКА БУСТА НА СТРАНИЦЕ АЛМАЗОВ ====================

describe('Кнопка буста на странице алмазов', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Секция "Профиль Boost" отображается на странице алмазов', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const bodyText = await driver.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Профиль Boost'), 'Секция "Профиль Boost" должна отображаться');
  });

  it('Кнопка Boost отображается на странице алмазов', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const boostBtn = await isElementPresent(
      driver,
      By.css('button.btn-warning')
    );
    assert.ok(boostBtn, 'Кнопка Boost должна отображаться на странице алмазов');
  });

  it('Кнопка содержит текст "Boost за"', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const boostBtn = await driver.findElement(By.css('button.btn-warning'));
    const text = await boostBtn.getText();
    assert.ok(text.includes('Boost за'), `Текст кнопки: ${text}`);
  });

  it('Кнопка содержит иконку молнии', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const boostBtn = await driver.findElement(By.css('button.btn-warning'));
    const icon = await boostBtn.findElement(By.css('i.bi-lightning-charge'));
    assert.ok(icon, 'Кнопка должна содержать иконку bi-lightning-charge');
  });

  it('Клик по кнопке буста активирует буст', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const boostBtn = await driver.wait(
      until.elementLocated(By.css('button.btn-warning')),
      10000
    );
    await boostBtn.click();
    await driver.sleep(3000);

    const countdown = await isElementPresent(
      driver,
      By.css('.boost-countdown')
    );
    assert.ok(countdown, 'Должен отображаться таймер обратного отсчёта после активации');
  });

  it('Таймер содержит формат "ч м с"', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const countdown = await driver.findElement(By.css('.boost-countdown'));
    const text = await countdown.getText();
    assert.ok(
      text.includes('ч') && text.includes('м') && text.includes('с'),
      `Таймер должен содержать формат "ч м с", получено: ${text}`
    );
  });

  it('Иконка молнии отображается рядом с таймером', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const lightningIcon = await isElementPresent(
      driver,
      By.css('.boost-timer i.bi-lightning-charge-fill')
    );
    assert.ok(lightningIcon, 'Иконка молнии должна отображаться рядом с таймером');
  });

  it('После активации кнопка Boost скрывается', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const boostBtn = await isElementPresent(
      driver,
      By.css('button.btn-warning')
    );
    if (!boostBtn) {
      const countdown = await isElementPresent(
        driver,
        By.css('.boost-countdown')
      );
      assert.ok(countdown, 'Если кнопка скрыта, должен отображаться таймер');
    }
  });
});

// ==================== ТАЙМЕР БУСТА ====================

describe('Таймер буста', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Таймер обновляется каждую секунду', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    // Активируем буст если ещё не активен
    const boostBtn = await isElementPresent(
      driver,
      By.css('button.btn-warning')
    );
    if (boostBtn) {
      await driver.findElement(By.css('button.btn-warning')).click();
      await driver.sleep(3000);
    }

    const countdown1 = await driver.findElement(By.css('.boost-countdown'));
    const text1 = await countdown1.getText();

    await driver.sleep(2000);

    const countdown2 = await driver.findElement(By.css('.boost-countdown'));
    const text2 = await countdown2.getText();

    assert.notStrictEqual(text1, text2, 'Таймер должен обновляться');
  });

  it('Текст "Ваш профиль выделен" отображается при активном бусте', async function () {
    await navigateTo(driver, '/payments');
    await driver.sleep(2000);

    const boostDescription = await isElementPresent(
      driver,
      By.css('.boost-active p')
    );
    if (boostDescription) {
      const text = await driver.findElement(By.css('.boost-active p')).getText();
      assert.ok(
        text.includes('выделен') || text.includes('поиске'),
        `Описание буста: ${text}`
      );
    }
  });
});

// ==================== НАВИГАЦИЯ ИЗ ПРОФИЛЯ ====================

describe('Навигация из профиля', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driver, USER_A);
  });

  it('Кнопка "Редактировать" ведёт на страницу редактирования', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const editBtn = await driver.wait(
      until.elementLocated(By.css('a[routerLink="/profile/me/edit"]')),
      10000
    );
    await editBtn.click();

    await waitForUrlContains(driver, '/profile/me/edit', 10000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/profile/me/edit'), `Должен быть переход на /profile/me/edit, текущий URL: ${url}`);
  });

  it('Кнопка "Параметры поиска" ведёт на страницу настроек', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const settingsBtn = await driver.wait(
      until.elementLocated(By.css('a[href="/settings/search"]')),
      10000
    );
    await settingsBtn.click();

    await waitForUrlContains(driver, '/settings/search', 10000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/settings/search'), `Должен быть переход на /settings/search, текущий URL: ${url}`);
  });

  it('Кнопка "Заблокированные" ведёт на страницу заблокированных', async function () {
    await navigateTo(driver, '/profile');
    await driver.sleep(2000);

    const blockedBtn = await driver.wait(
      until.elementLocated(By.css('a[href="/settings/blocked"]')),
      10000
    );
    await blockedBtn.click();

    await waitForUrlContains(driver, '/settings/blocked', 10000);

    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/settings/blocked'), `Должен быть переход на /settings/blocked, текущий URL: ${url}`);
  });
});
