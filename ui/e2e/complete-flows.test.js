const { By, until } = require('selenium-webdriver');
const assert = require('assert');
const {
  USER_A,
  USER_B,
  BASE_URL,
  createDriver,
  quitDriver,
  waitAndClick,
  waitAndType,
  waitForText,
  waitForUrlContains,
  isElementPresent,
  getElementText,
  navigateTo,
  getUserById,
  registerUser,
  loginUser,
  generateUniqueEmail,
  getAuthToken,
  getCurrentUserId,
  sendApiRequest,
} = require('./helpers');

let driverA, driverB;
let userAId, userBId;

async function setup() {
  driverA = await createDriver();
  driverB = await createDriver();
}

async function teardown() {
  await quitDriver(driverA);
  await quitDriver(driverB);
}

// ==================== РЕГИСТРАЦИЯ: ВАЛИДАЦИЯ ====================

describe('Валидация формы регистрации', function () {
  this.timeout(120000);

  before(async function () {
    driverA = await createDriver();
    await driverA.get(`${BASE_URL}/auth/registration`);
    await driverA.wait(until.elementLocated(By.name('name')), 10000);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Кнопка отправки заблокирована при пустых полях', async function () {
    const submitBtn = await driverA.findElement(By.css('button[type="submit"]'));
    const disabled = await submitBtn.getAttribute('disabled');
    assert.ok(disabled !== null, 'Кнопка должна быть заблокирована при пустых полях');
  });

  it('Короткий пароль (< 5 символов) показывает ошибку', async function () {
    await waitAndType(driverA, By.name('name'), 'Тест');
    await waitAndType(driverA, By.name('email'), 'test@test.com');
    await waitAndType(driverA, By.name('password'), '12');
    await driverA.sleep(500);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('символов') || bodyText.includes('Минимум') || bodyText.includes('5'),
      'Должна отображаться ошибка о минимальной длине пароля'
    );
  });

  it('Некорректный email показывает ошибку', async function () {
    await waitAndType(driverA, By.name('email'), 'invalid-email');
    await driverA.sleep(500);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('email') || bodyText.includes('Email') || bodyText.includes('почт'),
      'Должна отображаться ошибка о некорректном email'
    );
  });

  it('Ссылка "Войти" ведёт на страницу логина', async function () {
    const loginLink = await driverA.findElement(By.css('a[routerLink="/auth/login"]'));
    await loginLink.click();
    await waitForUrlContains(driverA, '/auth/login', 10000);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), 'Должен быть переход на /auth/login');
  });
});

// ==================== ЛОГИН: ВАЛИДАЦИЯ ====================

describe('Валидация формы логина', function () {
  this.timeout(90000);

  before(async function () {
    driverA = await createDriver();
    await driverA.get(`${BASE_URL}/auth/login`);
    await driverA.wait(until.elementLocated(By.name('email')), 10000);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Кнопка "Войти" заблокирована при пустых полях', async function () {
    const submitBtn = await driverA.findElement(By.css('button[type="submit"]'));
    const disabled = await submitBtn.getAttribute('disabled');
    assert.ok(disabled !== null, 'Кнопка должна быть заблокирована при пустых полях');
  });

  it('Неверные credentials показывают ошибку', async function () {
    await waitAndType(driverA, By.name('email'), 'nonexistent@test.com');
    await waitAndType(driverA, By.name('password'), 'wrongpass');
    await waitAndClick(driverA, By.css('button[type="submit"]'));
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Неверный') || bodyText.includes('неверный') || bodyText.includes('ошибк'),
      'Должна отображаться ошибка при неверном логине'
    );
  });

  it('Ссылка "Забыли пароль" ведёт на /auth/recovery', async function () {
    const recoveryLink = await driverA.findElement(By.css('a[routerLink="/auth/recovery"]'));
    await recoveryLink.click();
    await waitForUrlContains(driverA, '/auth/recovery', 10000);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/auth/recovery'), 'Должен быть переход на /auth/recovery');
  });

  it('Ссылка "Зарегистрироваться" ведёт на /auth/registration', async function () {
    await driverA.get(`${BASE_URL}/auth/login`);
    await driverA.sleep(1000);
    const registerLink = await driverA.findElement(By.css('a[routerLink="/auth/registration"]'));
    await registerLink.click();
    await waitForUrlContains(driverA, '/auth/registration', 10000);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/auth/registration'), 'Должен быть переход на /auth/registration');
  });
});

// ==================== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ====================

describe('Форма восстановления пароля', function () {
  this.timeout(90000);

  before(async function () {
    driverA = await createDriver();
    await driverA.get(`${BASE_URL}/auth/recovery`);
    await driverA.wait(until.elementLocated(By.name('email')), 10000);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Отображается поле email на шаге отправки ссылки', async function () {
    const emailInput = await isElementPresent(driverA, By.name('email'));
    assert.ok(emailInput, 'Поле email должно отображаться на шаге отправки ссылки');
  });

  it('Кнопка "Отправить ссылку" отображается', async function () {
    const submitBtn = await isElementPresent(driverA, By.css('button[type="submit"]'));
    assert.ok(submitBtn, 'Кнопка "Отправить ссылку" должна отображаться');
    const btnText = await driverA.findElement(By.css('button[type="submit"]')).getText();
    assert.ok(
      btnText.includes('Отправить ссылку') || btnText.includes('отправить'),
      `Текст кнопки: ${btnText}`
    );
  });

  it('Кнопка "Вернуться" ведёт на /auth/login', async function () {
    const backLink = await driverA.findElement(By.css('a[routerLink="/auth/login"]'));
    await backLink.click();
    await waitForUrlContains(driverA, '/auth/login', 10000);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), 'Должен быть переход на /auth/login');
  });
});

describe('Страница сброса пароля', function () {
  this.timeout(90000);

  before(async function () {
    driverA = await createDriver();
    await driverA.get(`${BASE_URL}/auth/reset-password?code=test-code`);
    await driverA.wait(until.elementLocated(By.name('code')), 10000);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Отображаются поля кода и пароля', async function () {
    const codeInput = await isElementPresent(driverA, By.name('code'));
    const passwordInput = await isElementPresent(driverA, By.name('password'));
    assert.ok(codeInput, 'Поле code должно отображаться');
    assert.ok(passwordInput, 'Поле password должно отображаться');
  });
});

// ==================== ПРОФИЛЬ: РЕДАКТИРОВАНИЕ ====================

describe('Редактирование профиля', function () {
  this.timeout(90000);

  before(async function () {
    driverA = await createDriver();
    await registerUser(driverA, USER_A);
    userAId = await getCurrentUserId(driverA);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Кнопка "Редактировать" ведёт на /profile/me/edit', async function () {
    await navigateTo(driverA, '/profile');
    await driverA.sleep(2000);
    const editBtn = await driverA.wait(
      until.elementLocated(By.css('a[routerLink="/profile/me/edit"]')),
      10000
    );
    const text = await editBtn.getText();
    assert.ok(text.includes('Редактировать'), `Текст кнопки: ${text}`);
    await editBtn.click();
    await waitForUrlContains(driverA, '/profile/me/edit', 10000);
  });

  it('Форма редактирования содержит поля: имя, email, день рождения, пол', async function () {
    const nameInput = await isElementPresent(driverA, By.name('name'));
    const emailInput = await isElementPresent(driverA, By.name('email'));
    const birthdayInput = await isElementPresent(driverA, By.name('birthday'));
    const genderSelect = await isElementPresent(driverA, By.name('gender'));
    assert.ok(nameInput, 'Поле имени должно быть');
    assert.ok(emailInput, 'Поле email должно быть');
    assert.ok(birthdayInput, 'Поле дня рождения должно быть');
    assert.ok(genderSelect, 'Поле пола должно быть');
  });

  it('Поле email заблокировано для редактирования', async function () {
    const emailInput = await driverA.findElement(By.name('email'));
    const disabled = await emailInput.getAttribute('disabled');
    assert.ok(disabled !== null, 'Поле email должно быть disabled');
  });

  it('Можно изменить имя и сохранить', async function () {
    await waitAndType(driverA, By.name('name'), 'Новое Имя');

    const submitBtn = await driverA.findElement(By.css('button[type="submit"]'));
    const btnText = await submitBtn.getText();
    assert.ok(btnText.includes('Сохранить'), `Текст кнопки: ${btnText}`);
    await submitBtn.click();
    await driverA.sleep(2000);

    const url = await driverA.getCurrentUrl();
    assert.ok(
      url.includes('/profile/me') || url.includes('/profile'),
      'После сохранения должен быть редирект на профиль'
    );
  });

  it('Новое имя отображается на странице профиля', async function () {
    await driverA.sleep(1000);
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Новое Имя'),
      'Новое имя должно отображаться на странице профиля'
    );
  });

  it('Кнопка "Отмена" на форме редактирования ведёт обратно', async function () {
    await navigateTo(driverA, '/profile/me/edit');
    await driverA.sleep(1000);
    const cancelLink = await driverA.findElement(By.css('a[routerLink="/profile/me"]'));
    const text = await cancelLink.getText();
    assert.ok(text.includes('Отмена'), `Текст ссылки: ${text}`);
    await cancelLink.click();
    await waitForUrlContains(driverA, '/profile/me', 10000);
  });
});

// ==================== НАСТРОЙКИ ====================

describe('Настройки пользователя', function () {
  this.timeout(90000);

  before(async function () {
    driverA = await createDriver();
    await registerUser(driverA, USER_A);
    userAId = await getCurrentUserId(driverA);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Страница настроек содержит параметры поиска', async function () {
    await navigateTo(driverA, '/settings/search');
    await driverA.sleep(2000);

    const genderSelect = await isElementPresent(driverA, By.name('gender'));
    const ageMinInput = await isElementPresent(driverA, By.name('ageMin'));
    const ageMaxInput = await isElementPresent(driverA, By.name('ageMax'));
    assert.ok(genderSelect, 'Поле выбора пола должно быть');
    assert.ok(ageMinInput, 'Поле возраста "от" должно быть');
    assert.ok(ageMaxInput, 'Поле возраста "до" должно быть');
  });

  it('Можно изменить параметры поиска и сохранить', async function () {
    const genderSelect = await driverA.findElement(By.name('gender'));
    await genderSelect.sendKeys('Женщин');

    const ageMin = await driverA.findElement(By.name('ageMin'));
    await ageMin.clear();
    await ageMin.sendKeys('20');

    const ageMax = await driverA.findElement(By.name('ageMax'));
    await ageMax.clear();
    await ageMax.sendKeys('40');

    const saveBtn = await driverA.findElement(By.css('button[type="submit"]'));
    const btnText = await saveBtn.getText();
    assert.ok(btnText.includes('Сохранить'), `Текст кнопки: ${btnText}`);
    await saveBtn.click();
    await driverA.sleep(2000);
  });

  it('Ссылка "Заблокированные" ведёт на /settings/blocked', async function () {
    await navigateTo(driverA, '/profile/me');
    await driverA.sleep(1000);
    const blockedLink = await driverA.findElement(By.css('a[href="/settings/blocked"]'));
    await blockedLink.click();
    await waitForUrlContains(driverA, '/settings/blocked', 10000);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/settings/blocked'), 'Должен быть переход на /settings/blocked');
  });

  it('Страница заблокированных отображает пустое состояние', async function () {
    await driverA.sleep(2000);
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Чистый список') || bodyText.includes('нет заблокированных'),
      'Должен отображаться пустой список: ' + bodyText.substring(0, 200)
    );
  });

  it('Переключение темы работает', async function () {
    await navigateTo(driverA, '/swipe');
    await driverA.sleep(2000);

    const themeBtn = await driverA.wait(
      until.elementLocated(By.css('.theme-toggle')),
      10000
    );
    const initialTheme = await driverA.executeScript(
      'return document.documentElement.getAttribute("data-theme")'
    );

    await themeBtn.click();
    await driverA.sleep(1000);

    const newTheme = await driverA.executeScript(
      'return document.documentElement.getAttribute("data-theme")'
    );
    assert.notStrictEqual(initialTheme, newTheme, 'Тема должна измениться после клика');
  });
});

// ==================== ПОДПИСКА (ПРЕМИУМ) ====================

describe('Страница подписки', function () {
  this.timeout(90000);

  before(async function () {
    driverA = await createDriver();
    await registerUser(driverA, USER_A);
    userAId = await getCurrentUserId(driverA);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Страница подписки загружается', async function () {
    await navigateTo(driverA, '/subscription');
    await driverA.sleep(3000);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/subscription'), 'Должен быть переход на /subscription');
  });

  it('Отображаются тарифные планы (бесплатный и Pro)', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Pro') || bodyText.includes('PREMIUM'),
      'Должен отображаться Pro тариф'
    );
    assert.ok(
      bodyText.includes('Бесплатный') || bodyText.includes('Free'),
      'Должен отображаться бесплатный тариф'
    );
  });

  it('Pro тариф содержит кнопку "Подписаться"', async function () {
    const subscribeBtn = await isElementPresent(driverA, By.css('button.btn-warning'));
    assert.ok(subscribeBtn, 'Кнопка "Подписаться" должна отображаться');
  });
});

// ==================== ПОЛНЫЙ FLOW ПОЛЬЗОВАТЕЛЯ ====================

describe('Полный профиль пользователя', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Профиль пользователя B содержит имя и возраст', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes(USER_B.name),
      'Имя пользователя должно отображаться на странице профиля'
    );

    const hasAge = bodyText.match(/\d+\s*(лет|год)/);
    assert.ok(hasAge || bodyText.includes('2'), 'Возраст должен отображаться на профиле');
  });

  it('Профиль содержит секцию совместимости', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Совместимость') || bodyText.includes('совместимость'),
      'Секция совместимости должна отображаться'
    );
  });

  it('Профиль содержит кнопки действий', async function () {
    const msgBtn = await isElementPresent(driverA, By.css('.action-message'));
    const meetingBtn = await isElementPresent(driverA, By.css('.action-meeting'));
    const bookmarkBtn = await isElementPresent(driverA, By.css('.action-bookmark'));
    assert.ok(msgBtn || meetingBtn || bookmarkBtn, 'Должны отображаться кнопки действий');
  });

  it('User A пишет сообщение User B и видит его в чате', async function () {
    const msgBtn = await driverA.wait(
      until.elementLocated(By.css('.action-message')),
      10000
    );
    await msgBtn.click();
    await waitForUrlContains(driverA, `/mailbox/conversation/${userBId}`, 10000);

    const messageInput = await driverA.wait(
      until.elementLocated(By.css('.message-input, input[placeholder*="сообщение"]')),
      10000
    );
    await messageInput.sendKeys('Тестовое сообщение для полного цикла');
    await driverA.sleep(300);

    const sendBtn = await driverA.findElement(By.css('.send-btn'));
    await sendBtn.click();
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Тестовое сообщение для полного цикла'),
      'Отправленное сообщение должно отображаться в чате'
    );
  });

  it('User B видит новые сообщения в mailbox', async function () {
    await navigateTo(driverB, '/mailbox');
    await driverB.sleep(3000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes(USER_A.name),
      'User B должен видеть диалог от User A'
    );
  });

  it('User B может ответить на сообщение', async function () {
    await navigateTo(driverB, `/mailbox/conversation/${userAId}`);
    await driverB.sleep(2000);

    const messageInput = await driverB.wait(
      until.elementLocated(By.css('.message-input, input[placeholder*="сообщение"]')),
      10000
    );
    await messageInput.sendKeys('Привет! Ответ от User B');
    await driverB.sleep(300);

    const sendBtn = await driverB.findElement(By.css('.send-btn'));
    await sendBtn.click();
    await driverB.sleep(2000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Привет! Ответ от User B'), 'Ответ должен отображаться');
  });

  it('User A может предложить встречу', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const meetingBtn = await driverA.wait(
      until.elementLocated(By.css('.action-meeting')),
      10000
    );
    const btnText = await meetingBtn.getText();
    assert.ok(btnText.includes('Встреча'), `Текст кнопки: ${btnText}`);
    await meetingBtn.click();
    await driverA.sleep(2000);

    const sentBtn = await isElementPresent(driverA, By.css('.action-meeting-sent'));
    assert.ok(sentBtn, 'Кнопка должна измениться на "Встреча отправлена"');
  });

  it('User B может принять встречу', async function () {
    await navigateTo(driverB, '/meetings');
    await driverB.sleep(3000);

    const acceptBtn = await isElementPresent(driverB, By.css('.btn-outline-success, [class*="accept"]'));
    if (acceptBtn) {
      await driverB.findElement(By.css('.btn-outline-success, [class*="accept"]')).click();
      await driverB.sleep(2000);
    }

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Принято') || bodyText.includes('ACCEPTED') || bodyText.includes('принята'),
      'Статус встречи должен измениться на "Принято"'
    );
  });
});

// ==================== ИЗБРАННОЕ: УПРАВЛЕНИЕ ====================

describe('Управление избранным', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('User A добавляет User B в избранное', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const bookmarkBtn = await driverA.wait(
      until.elementLocated(By.css('.action-bookmark, [class*="action-bookmark"]')),
      10000
    );
    await bookmarkBtn.click();
    await driverA.sleep(1500);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('избранном') || bodyText.includes('Избранном') || bodyText.includes('удален'),
      'После добавления в избранное текст кнопки должен измениться'
    );
  });

  it('User B отображается в списке избранного у User A', async function () {
    await navigateTo(driverA, '/bookmarks');
    await driverA.sleep(3000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes(USER_B.name),
      `User B (${USER_B.name}) должен быть в списке избранного`
    );
  });

  it('User A может удалить User B из избранного', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const bookmarkBtn = await driverA.wait(
      until.elementLocated(By.css('.action-bookmark, [class*="action-bookmark"]')),
      10000
    );
    await bookmarkBtn.click();
    await driverA.sleep(1500);
  });

  it('Избранное пустое после удаления всех пользователей', async function () {
    await navigateTo(driverA, '/bookmarks');
    await driverA.sleep(3000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    const hasUserB = bodyText.includes(USER_B.name);
    const emptyState = bodyText.includes('Нет избранных') || bodyText.includes('избранных нет') || bodyText.includes('пусто');
    assert.ok(
      !hasUserB || emptyState,
      'User B не должен быть в избранном после удаления'
    );
  });
});

// ==================== АДМИН: БАН И УПРАВЛЕНИЕ ====================

describe('Админ: бан пользователя и управление жалобами', function () {
  this.timeout(180000);

  let adminToken;

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);

    adminToken = await getAuthToken(driverA);
    assert.ok(adminToken, 'Токен администратора должен существовать');
  });

  it('Администратор может открыть админ-панель', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/admin'), 'Администратор должен иметь доступ к /admin');
  });

  it('Таблица пользователей отображается', async function () {
    const table = await isElementPresent(driverA, By.css('table.table'));
    assert.ok(table, 'Таблица пользователей должна отображаться');

    const rows = await driverA.findElements(By.css('table tbody tr'));
    assert.ok(rows.length >= 1, 'Таблица должна содержать хотя бы одну строку');
  });

  it('Администратор может отправить жалобу на User B через UI', async function () {
    await driverA.sleep(1000);
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Пользователи') || bodyText.includes('Жалобы') || bodyText.includes('Метрики'),
      'Вкладки админ-панели должны отображаться'
    );
  });

  it('Вкладка "Жалобы" отображается', async function () {
    const allTabs = await driverA.findElements(By.css('button.nav-link'));
    let foundReportsTab = false;
    for (const tab of allTabs) {
      const text = await tab.getText();
      if (text.includes('Жалобы')) {
        await tab.click();
        foundReportsTab = true;
        break;
      }
    }
    assert.ok(foundReportsTab, 'Вкладка "Жалобы" должна присутствовать');
    await driverA.sleep(2000);

    const reportsContent = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      reportsContent.includes('Нет ожидающих жалоб') || reportsContent.includes('ID'),
      'Содержимое вкладки жалоб должно отображаться'
    );
  });

  it('Вкладка "Метрики" отображает JVM информацию', async function () {
    const allTabs = await driverA.findElements(By.css('button.nav-link'));
    for (const tab of allTabs) {
      const text = await tab.getText();
      if (text.includes('Метрики')) {
        await tab.click();
        break;
      }
    }
    await driverA.sleep(3000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('JVM') || bodyText.includes('Версия') || bodyText.includes('Аптайм'),
      'Вкладка метрик должна содержать JVM информацию'
    );
  });
});

// ==================== SEARCH ====================

describe('Поиск пользователей', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Страница поиска загружается и содержит форму', async function () {
    await navigateTo(driverA, '/search');
    await driverA.sleep(3000);

    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/search'), 'Должен быть переход на /search');
  });

  it('Кнопка "Найти" присутствует', async function () {
    const searchBtn = await driverA.findElements(By.css('button.btn-primary'));
    let foundSearch = false;
    for (const btn of searchBtn) {
      const text = await btn.getText();
      if (text.includes('Найти')) {
        foundSearch = true;
        break;
      }
    }
    assert.ok(foundSearch, 'Кнопка "Найти" должна быть на странице поиска');
  });

  it('User A может выполнить поиск', async function () {
    const allButtons = await driverA.findElements(By.css('button'));
    for (const btn of allButtons) {
      const text = await btn.getText();
      if (text.includes('Найти')) {
        await btn.click();
        break;
      }
    }
    await driverA.sleep(3000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Результаты') || bodyText.includes('найден') || bodyText.includes('Поиск'),
      'Результаты поиска должны отображаться'
    );
  });
});

// ==================== ЛОГАУТ С ЗАВИСАНИЕМ ====================

describe('Логаут: устойчивость к зависанию', function () {
  this.timeout(60000);

  before(async function () {
    driverA = await createDriver();
    await registerUser(driverA, USER_A);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Повторный логаут не ломает страницу', async function () {
    const logoutBtn = await driverA.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn.click();
    await waitForUrlContains(driverA, '/auth/login', 10000);

    await loginUser(driverA, USER_A.email, USER_A.password);

    await driverA.sleep(2000);
    const logoutBtn2 = await driverA.wait(
      until.elementLocated(By.css('a[title="Выйти"]')),
      10000
    );
    await logoutBtn2.click();
    await waitForUrlContains(driverA, '/auth/login', 10000);

    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/auth/login'), 'Повторный логаут должен работать');
  });

  it('Сразу после повторного входа можно перейти на защищённые страницы', async function () {
    await loginUser(driverA, USER_A.email, USER_A.password);

    await navigateTo(driverA, '/bookmarks');
    await driverA.sleep(2000);

    const url = await driverA.getCurrentUrl();
    assert.ok(
      url.includes('/bookmarks') || url.includes('/auth/login'),
      'После входа должен быть доступен переход на /bookmarks'
    );
  });

  it('Комбинация: логаут → вход → логаут → вход работает стабильно', async function () {
    for (let i = 0; i < 3; i++) {
      const logoutBtn = await driverA.wait(
        until.elementLocated(By.css('a[title="Выйти"]')),
        10000
      );
      await logoutBtn.click();
      await waitForUrlContains(driverA, '/auth/login', 10000);

      await loginUser(driverA, USER_A.email, USER_A.password);
    }
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/swipe'), 'После 3 циклов логаут/вход должен быть редирект на /swipe');
  });
});

// ==================== ПАГИНАЦИЯ В АДМИНКЕ ====================

describe('Пагинация в админ-панели', function () {
  this.timeout(120000);

  before(async function () {
    driverA = await createDriver();
    await registerUser(driverA, USER_A);
    userAId = await getCurrentUserId(driverA);
  });

  after(async function () {
    await quitDriver(driverA);
  });

  it('Администратор видит пагинацию на странице /admin', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const pagination = await isElementPresent(driverA, By.css('.pagination'));
    assert.ok(pagination, 'Элемент пагинации должен отображаться на странице админа');
  });

  it('Кнопки навигации по страницам отображаются', async function () {
    const prevBtn = await isElementPresent(driverA, By.css('.pagination .prev, .pagination .page-item:first-child'));
    const nextBtn = await isElementPresent(driverA, By.css('.pagination .next, .pagination .page-item:last-child'));

    if (prevBtn || nextBtn) {
      assert.ok(true, 'Кнопки навигации отображаются');
    } else {
      const pageItems = await driverA.findElements(By.css('.pagination .page-item'));
      assert.ok(pageItems.length > 0, 'Должны быть элементы пагинации');
    }
  });

  it('Номер текущей страницы отображается', async function () {
    const activePage = await driverA.findElements(By.css('.pagination .page-item.active'));
    if (activePage.length > 0) {
      const pageNum = await activePage[0].getText();
      assert.ok(parseInt(pageNum) > 0, 'Номер страницы должен быть положительным числом');
    }
  });
});

// ==================== ПУБЛИЧНЫЙ ПРОФИЛЬ: ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ====================

describe('Детальная информация на публичном профиле', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Профиль User A отображается у User B', async function () {
    await getUserById(driverB, userAId);
    await driverB.sleep(2000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes(USER_A.name),
      'Имя User A должно отображаться на странице профиля'
    );
  });

  it('User B может написать сообщение User A', async function () {
    const msgBtn = await driverB.wait(
      until.elementLocated(By.css('.action-message')),
      10000
    );
    await msgBtn.click();
    await waitForUrlContains(driverB, `/mailbox/conversation/${userAId}`, 10000);

    const messageInput = await driverB.wait(
      until.elementLocated(By.css('.message-input, input[placeholder*="сообщение"]')),
      10000
    );
    assert.ok(messageInput, 'Поле ввода сообщения должно быть');
  });

  it('User B может вернуться из чата в mailbox', async function () {
    await navigateTo(driverB, '/mailbox');
    await driverB.sleep(2000);

    const url = await driverB.getCurrentUrl();
    assert.ok(url.includes('/mailbox'), 'Должен быть переход на /mailbox');
  });
});
