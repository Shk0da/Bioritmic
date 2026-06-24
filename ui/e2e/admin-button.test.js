const { By, until } = require('selenium-webdriver');
const assert = require('assert');
const {
  BASE_URL,
  createDriver,
  quitDriver,
  waitAndClick,
  waitForUrlContains,
  isElementPresent,
  navigateTo,
  registerUser,
  generateUniqueEmail,
} = require('./helpers');

// ==================== КНОПКА АДМИН-ПАНЕЛИ (СВОДНЫЕ ТЕСТЫ) ====================

describe('Кнопка "Админ-панель" в профиле — полный набор', function () {
  this.timeout(90000);

  let driver;
  let adminUser;
  let regularUser;

  before(async function () {
    driver = await createDriver();

    // Первый зарегистрированный пользователь автоматически становится админом
    adminUser = {
      name: 'Admin Test',
      email: generateUniqueEmail(),
      password: 'AdminPass123',
      birthday: '1990-01-15',
      gender: 'MAN',
    };
    await registerUser(driver, adminUser);

    // Второй пользователь — обычный (не админ)
    regularUser = {
      name: 'Regular Test',
      email: generateUniqueEmail(),
      password: 'RegularPass456',
      birthday: '1995-06-20',
      gender: 'WOMAN',
    };
    await registerUser(driver, regularUser);
  });

  after(async function () {
    await quitDriver(driver);
  });

  // ---------- Видимость кнопки для админа ----------

  describe('Админ видит кнопку', function () {
    before(async function () {
      const { loginUser } = require('./helpers');
      await loginUser(driver, adminUser.email, adminUser.password);
    });

    it('Кнопка "Админ-панель" отображается', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const present = await isElementPresent(driver, By.css('a[routerLink="/admin"]'));
      assert.ok(present, 'Кнопка должна отображаться для админа');
    });

    it('Кнопка содержит текст "Админ-панель"', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const btn = await driver.findElement(By.css('a[routerLink="/admin"]'));
      const text = await btn.getText();
      assert.ok(text.includes('Админ-панель'), `Текст кнопки: "${text}"`);
    });

    it('Кнопка содержит иконку bi-shield-lock', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const icon = await driver.findElement(By.css('a[routerLink="/admin"] i.bi-shield-lock'));
      assert.ok(icon, 'Иконка bi-shield-lock должна присутствовать');
    });

    it('Кнопка стилизована как btn-outline-danger', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const btn = await driver.findElement(By.css('a[routerLink="/admin"]'));
      const classes = await btn.getAttribute('class');
      assert.ok(classes.includes('btn-outline-danger'), `Классы кнопки: "${classes}"`);
    });

    it('Кнопка "Админ-панель" расположена ниже кнопки "Редактировать"', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const editBtn = await driver.findElement(By.css('a[routerLink="/profile/me/edit"]'));
      const adminBtn = await driver.findElement(By.css('a[routerLink="/admin"]'));

      const editY = (await editBtn.getBoundingClientRect()).y;
      const adminY = (await adminBtn.getBoundingClientRect()).y;
      assert.ok(adminY > editY, `adminY (${adminY}) должен быть больше editY (${editY})`);
    });

    it('Клик по кнопке "Админ-панель" открывает страницу /admin', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const adminBtn = await driver.wait(
        until.elementLocated(By.css('a[routerLink="/admin"]')),
        10000
      );
      await adminBtn.click();
      await waitForUrlContains(driver, '/admin', 10000);

      const url = await driver.getCurrentUrl();
      assert.ok(url.includes('/admin'), `Ожидался /admin, текущий URL: ${url}`);
    });

    it('На странице /admin отображается заголовок админ-панели', async function () {
      await driver.sleep(2000);
      const hasHeader = await isElementPresent(driver, By.css('.page-title, h1, h2'));
      assert.ok(hasHeader, 'На странице /admin должен быть заголовок');
    });
  });

  // ---------- Невидимость кнопки для обычного пользователя ----------

  describe('Обычный пользователь не видит кнопку', function () {
    before(async function () {
      const { loginUser } = require('./helpers');
      await loginUser(driver, regularUser.email, regularUser.password);
    });

    it('Кнопка "Админ-панель" НЕ отображается', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const present = await isElementPresent(driver, By.css('a[routerLink="/admin"]'));
      assert.ok(!present, 'Кнопка НЕ должна отображаться для обычного пользователя');
    });

    it('Кнопка "Редактировать" по-прежнему видна', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const editBtn = await isElementPresent(driver, By.css('a[routerLink="/profile/me/edit"]'));
      assert.ok(editBtn, 'Кнопка "Редактировать" должна быть видна');
    });

    it('Прямой переход на /admin перенаправляет обычного пользователя', async function () {
      await navigateTo(driver, '/admin');
      await driver.sleep(3000);

      const url = await driver.getCurrentUrl();
      const blocked = !url.includes('/admin') || await isElementPresent(
        driver,
        By.css('.alert-danger, .access-denied, .forbidden')
      );
      assert.ok(blocked, 'Обычный пользователь не должен иметь доступ к /admin');
    });
  });

  // ---------- Возврат админа на профиль ----------

  describe('Возврат админа на профиль', function () {
    before(async function () {
      const { loginUser } = require('./helpers');
      await loginUser(driver, adminUser.email, adminUser.password);
    });

    it('После возврата на профиль кнопка снова отображается', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const present = await isElementPresent(driver, By.css('a[routerLink="/admin"]'));
      assert.ok(present, 'Кнопка должна отображаться после повторного входа');
    });

    it('Кнопка "Редактировать" и "Админ-панель" отображаются вместе', async function () {
      await navigateTo(driver, '/profile');
      await driver.sleep(2000);

      const editBtn = await isElementPresent(driver, By.css('a[routerLink="/profile/me/edit"]'));
      const adminBtn = await isElementPresent(driver, By.css('a[routerLink="/admin"]'));
      assert.ok(editBtn, 'Кнопка "Редактировать" должна отображаться');
      assert.ok(adminBtn, 'Кнопка "Админ-панель" должна отображаться');
    });
  });
});
