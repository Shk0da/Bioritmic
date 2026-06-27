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
  waitForUrlContains,
  isElementPresent,
  navigateTo,
  getUserById,
  registerUser,
  loginUser,
  getAuthToken,
  getCurrentUserId,
  generateUniqueEmail,
  sendApiRequest,
} = require('./helpers');

let driver, driverB;
let userAId, userBId;
let adminToken;

async function setup() {
  driver = await createDriver();
}

async function teardown() {
  await quitDriver(driver);
  await quitDriver(driverB);
}

async function measurePageLoad(driver, path, timeoutMs = 15000) {
  const start = Date.now();
  await driver.get(`${BASE_URL}${path}`);
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return !url.includes('/auth/login');
  }, timeoutMs);
  await driver.sleep(1000);
  return Date.now() - start;
}

async function makeUserAdmin(token) {
  const resp = await fetch(
    `${process.env.API_URL || 'http://localhost:8080'}/api/v1/admin/users`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!resp.ok) return false;
  const users = await resp.json();
  const targetUser = users.find((u) => u.email === USER_A.email);
  if (!targetUser || !targetUser.id) return false;
  const roleResp = await fetch(
    `${process.env.API_URL || 'http://localhost:8080'}/api/v1/admin/users/${targetUser.id}/role`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: 'ADMIN' }),
    }
  );
  return roleResp.ok;
}

// ==================== 1. АДМИН-ПАНЕЛЬ НЕ ЗАВИСАЕТ ПРИ ЗАГРУЗКЕ ====================

describe('Админ-панель: загрузка не вызывает зависание', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createDriver();
    await registerUser(driver, USER_A);
    userAId = await getCurrentUserId(driver);
    adminToken = await getAuthToken(driver);
    if (adminToken) await makeUserAdmin(adminToken);
  });

  after(teardown);

  it('Страница /admin загружается быстрее 10 секунд', async function () {
    const loadTime = await measurePageLoad(driver, '/admin', 10000);
    assert.ok(loadTime < 10000, `Страница админ-панели загружалась ${loadTime}мс (лимит 10000мс)`);
  });

  it('После загрузки таблица пользователей видна', async function () {
    const table = await isElementPresent(driver, By.css('table.table'));
    assert.ok(table, 'Таблица пользователей должна отображаться');
  });

  it('Все 3 вкладки (Пользователи, Жалобы, Метрики) отображаются', async function () {
    const tabs = await driver.findElements(By.css('button.nav-link'));
    assert.strictEqual(tabs.length, 3, `Должно быть 3 вкладки, найдено: ${tabs.length}`);
    const texts = await Promise.all(tabs.map((t) => t.getText()));
    assert.ok(texts.some((t) => t.includes('Пользователи')), 'Нет вкладки Пользователи');
    assert.ok(texts.some((t) => t.includes('Жалобы')), 'Нет вкладки Жалобы');
    assert.ok(texts.some((t) => t.includes('Метрики')), 'Нет вкладки Метрики');
  });

  it('Страница не зависает при повторной загрузке', async function () {
    for (let i = 0; i < 3; i++) {
      const loadTime = await measurePageLoad(driver, '/admin', 10000);
      assert.ok(loadTime < 10000, `Повторная загрузка #${i + 1}: ${loadTime}мс (лимит 10000мс)`);
    }
  });
});

// ==================== 2. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК НЕ ВЫЗЫВАЕТ ЗАВИСАНИЕ ====================

describe('Переключение вкладок админ-панели: устойчивость к зависанию', function () {
  this.timeout(180000);

  before(async function () {
    driver = await createDriver();
    await registerUser(driver, USER_A);
    userAId = await getCurrentUserId(driver);
    adminToken = await getAuthToken(driver);
    if (adminToken) await makeUserAdmin(adminToken);
    await navigateTo(driver, '/admin');
    await driver.sleep(3000);
  });

  after(teardown);

  it('Быстрое переключение Пользователи → Жалобы → Метрики (10 циклов)', async function () {
    this.timeout(120000);
    const tabs = await driver.findElements(By.css('button.nav-link'));
    const tabNames = ['Пользователи', 'Жалобы', 'Метрики'];

    for (let cycle = 0; cycle < 10; cycle++) {
      const tabIndex = cycle % 3;
      const targetTab = tabs[tabIndex];
      const start = Date.now();

      await targetTab.click();
      await driver.sleep(500);

      const elapsed = Date.now() - start;
      assert.ok(elapsed < 10000, `Цикл ${cycle + 1}, вкладка "${tabNames[tabIndex]}": зависание ${elapsed}мс`);

      await driver.wait(async () => {
        const active = await driver.findElements(By.css('button.nav-link.active'));
        if (active.length === 0) return false;
        const text = await active[0].getText();
        return text.includes(tabNames[tabIndex]);
      }, 5000);
    }
  });

  it('Каждая вкладка отображает контент после переключения', async function () {
    const tabs = await driver.findElements(By.css('button.nav-link'));

    const tabToContent = [
      { name: 'Пользователи', check: () => isElementPresent(driver, By.css('table.table')) },
      { name: 'Метрики', check: async () => {
        const body = await driver.findElement(By.css('body')).getText();
        return body.includes('JVM') || body.includes('Аптайм');
      }},
    ];

    for (const { name, check } of tabToContent) {
      for (const tab of tabs) {
        const text = await tab.getText();
        if (text.includes(name)) {
          await tab.click();
          await driver.sleep(2000);
          const ok = await check();
          assert.ok(ok, `Вкладка "${name}" должна отображать контент после переключения`);
          break;
        }
      }
    }
  });
});

// ==================== 3. БЫСТРАЯ НАВИГАЦИЯ МЕЖДУ СТРАНИЦАМИ ====================

describe('Быстрая навигация между страницами: отсутствие зависания', function () {
  this.timeout(180000);

  before(async function () {
    driver = await createDriver();
    await registerUser(driver, USER_A);
    userAId = await getCurrentUserId(driver);
    adminToken = await getAuthToken(driver);
    if (adminToken) await makeUserAdmin(adminToken);
  });

  after(teardown);

  it('Навигация: swipe → profile → mailbox → meetings → admin (3 цикла)', async function () {
    const pages = [
      { path: '/swipe', name: 'swipe' },
      { path: '/profile', name: 'profile' },
      { path: '/mailbox', name: 'mailbox' },
      { path: '/meetings', name: 'meetings' },
      { path: '/admin', name: 'admin' },
    ];

    for (let cycle = 0; cycle < 3; cycle++) {
      for (const page of pages) {
        const start = Date.now();
        await navigateTo(driver, page.path);
        await driver.sleep(1000);
        const elapsed = Date.now() - start;

        assert.ok(
          elapsed < 12000,
          `Цикл ${cycle + 1}, страница "${page.name}": зависание ${elapsed}мс`
        );
      }
    }
  });

  it('После быстрой навигации кнопка логаута отображается', async function () {
    const logoutBtn = await isElementPresent(driver, By.css('a[title="Выйти"]'));
    assert.ok(logoutBtn, 'После навигации кнопка логаута должна отображаться');
  });

  it('После навигации можно открыть профиль другого пользователя', async function () {
    await getUserById(driver, userAId);
    await driver.sleep(2000);
    const url = await driver.getCurrentUrl();
    assert.ok(url.includes(`/user/${userAId}`), 'Профиль должен открыться');
  });
});

// ==================== 4. ОПЕРАЦИИ В АДМИН-ПАНЕЛИ НЕ ЗАВИСАЮТ ====================

describe('Операции в админ-панели: устойчивость', function () {
  this.timeout(180000);

  before(async function () {
    driver = await createDriver();
    driverB = await createDriver();
    await registerUser(driver, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driver);
    userBId = await getCurrentUserId(driverB);
    adminToken = await getAuthToken(driver);
    if (adminToken) await makeUserAdmin(adminToken);
    await navigateTo(driver, '/admin');
    await driver.sleep(3000);
  });

  after(teardown);

  async function clickActionForUser(email, btnClass) {
    const rows = await driver.findElements(By.css('table tbody tr'));
    for (const row of rows) {
      const emailEl = await row.findElement(By.css('td:nth-child(3)'));
      const text = await emailEl.getText();
      if (text === email) {
        const btns = await row.findElements(By.css(btnClass));
        if (btns.length > 0) {
          await btns[0].click();
          await driver.sleep(1000);
          return true;
        }
      }
    }
    return false;
  }

  it('Бан пользователя не вызывает зависание', async function () {
    const start = Date.now();
    const clicked = await clickActionForUser(USER_B.email, 'button.btn-warning');
    const elapsed = Date.now() - start;
    assert.ok(clicked, 'Кнопка "Забанить" должна быть найдена');
    assert.ok(elapsed < 10000, `Бан: зависание ${elapsed}мс`);
  });

  it('Разбан пользователя не вызывает зависание', async function () {
    await driver.sleep(1000);
    const start = Date.now();
    const clicked = await clickActionForUser(USER_B.email, 'button.btn-success');
    const elapsed = Date.now() - start;
    assert.ok(clicked, 'Кнопка "Разбанить" должна быть найдена');
    assert.ok(elapsed < 10000, `Разбан: зависание ${elapsed}мс`);
  });

  it('Последовательные бан/разбан/бан (5 раз) не вызывают зависание', async function () {
    for (let i = 0; i < 5; i++) {
      const banBtn = 'button.btn-warning';
      const unbanBtn = 'button.btn-success';

      const startBan = Date.now();
      const banned = await clickActionForUser(USER_B.email, banBtn);
      if (banned) {
        const elapsed = Date.now() - startBan;
        assert.ok(elapsed < 10000, `Бан #${i + 1}: зависание ${elapsed}мс`);
      }

      await driver.sleep(800);

      const startUnban = Date.now();
      const unbanned = await clickActionForUser(USER_B.email, unbanBtn);
      if (unbanned) {
        const elapsed = Date.now() - startUnban;
        assert.ok(elapsed < 10000, `Разбан #${i + 1}: зависание ${elapsed}мс`);
      }

      await driver.sleep(800);
    }
  });
});

// ==================== 5. ПОИСК И ФИЛЬТРЫ НЕ ЗАВИСАЮТ ====================

describe('Поиск и фильтры: нет зависания', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createDriver();
    await registerUser(driver, USER_A);
    userAId = await getCurrentUserId(driver);
  });

  after(teardown);

  it('Страница поиска загружается быстрее 10 секунд', async function () {
    const loadTime = await measurePageLoad(driver, '/search', 10000);
    assert.ok(loadTime < 10000, `Страница поиска загружалась ${loadTime}мс`);
  });

  it('Фильтры поиска не вызывают зависание при переключении', async function () {
    await driver.sleep(2000);

    const selects = await driver.findElements(By.css('select'));
    for (let i = 0; i < selects.length && i < 3; i++) {
      const start = Date.now();
      const options = await selects[i].findElements(By.css('option'));
      if (options.length > 1) {
        await selects[i].click();
        await options[options.length - 1].click();
        await driver.sleep(300);
      }
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 5000, `Переключение фильтра #${i + 1}: зависание ${elapsed}мс`);
    }
  });

  it('Кнопка "Найти" реагирует на клик без зависания', async function () {
    const allButtons = await driver.findElements(By.css('button'));
    let found = false;
    for (const btn of allButtons) {
      const text = await btn.getText();
      if (text.includes('Найти')) {
        const start = Date.now();
        await btn.click();
        await driver.sleep(2000);
        const elapsed = Date.now() - start;
        assert.ok(elapsed < 10000, `Поиск: зависание ${elapsed}мс`);
        found = true;
        break;
      }
    }
    assert.ok(found, 'Кнопка "Найти" должна быть на странице');
  });
});

// ==================== 6. MAILBOX И MEETINGS НЕ ЗАВИСАЮТ ====================

describe('Mailbox и Meetings: загрузка без зависания', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createDriver();
    driverB = await createDriver();
    await registerUser(driver, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driver);
    userBId = await getCurrentUserId(driverB);

    await getUserById(driverB, userAId);
    const msgBtn = await driverB.wait(until.elementLocated(By.css('.action-message')), 10000);
    await msgBtn.click();
    await waitForUrlContains(driverB, `/mailbox/conversation/${userAId}`, 10000);
    const messageInput = await driverB.wait(
      until.elementLocated(By.css('.message-input, input[placeholder*="сообщение"]')),
      10000
    );
    await messageInput.sendKeys('Тест зависания mailbox');
    const sendBtn = await driverB.wait(until.elementLocated(By.css('.send-btn')), 5000);
    await sendBtn.click();
    await driverB.sleep(2000);
  });

  after(teardown);

  it('Mailbox загружается быстрее 10 секунд', async function () {
    const loadTime = await measurePageLoad(driver, '/mailbox', 10000);
    assert.ok(loadTime < 10000, `Mailbox загружался ${loadTime}мс`);
  });

  it('Диалог в mailbox виден', async function () {
    await driver.sleep(2000);
    const bodyText = await driver.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes(USER_B.name) || bodyText.includes('Тест зависания mailbox'),
      'Диалог с User B должен отображаться'
    );
  });

  it('Conversation открывается без зависания', async function () {
    const start = Date.now();
    await navigateTo(driver, `/mailbox/conversation/${userBId}`);
    await driver.sleep(2000);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 10000, `Conversation загружался ${elapsed}мс`);
  });

  it('Страница встреч загружается быстрее 10 секунд', async function () {
    const loadTime = await measurePageLoad(driver, '/meetings', 10000);
    assert.ok(loadTime < 10000, `Страница встреч загружалась ${loadTime}мс`);
  });
});

// ==================== 7. ПРОФИЛЬ НЕ ЗАВИСАЕТ ====================

describe('Профиль: загрузка без зависания', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createDriver();
    driverB = await createDriver();
    await registerUser(driver, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driver);
    userBId = await getCurrentUserId(driverB);
  });

  after(teardown);

  it('Свой профиль загружается быстрее 10 секунд', async function () {
    const loadTime = await measurePageLoad(driver, '/profile', 10000);
    assert.ok(loadTime < 10000, `Свой профиль загружался ${loadTime}мс`);
  });

  it('Публичный профиль другого пользователя загружается быстрее 10 секунд', async function () {
    const loadTime = await measurePageLoad(driver, `/user/${userBId}`, 10000);
    assert.ok(loadTime < 10000, `Публичный профиль загружался ${loadTime}мс`);
  });

  it('Профиль содержит кнопки действий (message, meeting, bookmark, block)', async function () {
    await driver.sleep(2000);
    const msgBtn = await isElementPresent(driver, By.css('.action-message'));
    const meetingBtn = await isElementPresent(driver, By.css('.action-meeting'));
    const bookmarkBtn = await isElementPresent(driver, By.css('.action-bookmark'));
    const blockBtn = await isElementPresent(driver, By.css('.action-block'));
    assert.ok(msgBtn, 'Кнопка "Написать" должна быть');
    assert.ok(meetingBtn, 'Кнопка "Встреча" должна быть');
    assert.ok(bookmarkBtn, 'Кнопка "В избранное" должна быть');
    assert.ok(blockBtn, 'Кнопка "Заблокировать" должна быть');
  });

  it('Профиль не зависает при быстрой смене 3 пользователей', async function () {
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await getUserById(driver, userBId);
      await driver.sleep(500);
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 10000, `Смена пользователя #${i + 1}: зависание ${elapsed}мс`);
    }
  });
});

// ==================== 8. ЛОГАУТ/ВХОД НЕ ЗАВИСАЕТ ====================

describe('Логаут/вход: устойчивость к зависанию при многократном повторении', function () {
  this.timeout(180000);

  before(async function () {
    driver = await createDriver();
    await registerUser(driver, USER_A);
  });

  after(teardown);

  it('10 циклов логаут/вход без зависания', async function () {
    for (let i = 0; i < 10; i++) {
      const start = Date.now();

      await navigateTo(driver, '/swipe');
      await driver.sleep(1000);

      const logoutBtn = await driver.wait(until.elementLocated(By.css('a[title="Выйти"]')), 10000);
      await logoutBtn.click();
      await waitForUrlContains(driver, '/auth/login', 10000);

      const loginTime = Date.now();
      await loginUser(driver, USER_A.email, USER_A.password);

      const totalElapsed = Date.now() - start;
      assert.ok(totalElapsed < 30000, `Цикл ${i + 1}: зависание ${totalElapsed}мс`);
    }
  });
});

// ==================== 9. ПУБЛИЧНЫЙ ПРОФИЛЬ НЕ ЗАВИСАЕТ ПРИ ОПЕРАЦИЯХ ====================

describe('Публичный профиль: операции без зависания', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createDriver();
    driverB = await createDriver();
    await registerUser(driver, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driver);
    userBId = await getCurrentUserId(driverB);
  });

  after(teardown);

  it('Добавление в избранное не зависает (3 раза)', async function () {
    for (let i = 0; i < 3; i++) {
      await getUserById(driver, userBId);
      await driver.sleep(1000);

      const bookmarkBtn = await driver.wait(
        until.elementLocated(By.css('.action-bookmark, .action-bookmark-active')),
        10000
      );
      const start = Date.now();
      await bookmarkBtn.click();
      await driver.sleep(1000);
      const elapsed = Date.now() - start;
      assert.ok(elapsed < 10000, `Избранное операция ${i + 1}: зависание ${elapsed}мс`);
    }
  });

  it('Переход из профиля в чат не зависает', async function () {
    await getUserById(driver, userBId);
    await driver.sleep(1000);

    const msgBtn = await driver.wait(until.elementLocated(By.css('.action-message')), 10000);
    const start = Date.now();
    await msgBtn.click();
    await waitForUrlContains(driver, `/mailbox/conversation/${userBId}`, 10000);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 15000, `Переход в чат: зависание ${elapsed}мс`);
  });

  it('Возврат из чата в профиль не зависает', async function () {
    const start = Date.now();
    await getUserById(driver, userBId);
    await driver.sleep(2000);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 10000, `Возврат в профиль: зависание ${elapsed}мс`);
  });
});

// ==================== 10. ИЗБРАННОЕ НЕ ЗАВИСАЕТ ====================

describe('Избранное: загрузка без зависания', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createDriver();
    await registerUser(driver, USER_A);
    userAId = await getCurrentUserId(driver);
  });

  after(teardown);

  it('Страница избранного загружается быстрее 10 секунд', async function () {
    const loadTime = await measurePageLoad(driver, '/bookmarks', 10000);
    assert.ok(loadTime < 10000, `Избранное загружалось ${loadTime}мс`);
  });

  it('Избранное не зависает при повторной загрузке (3 раза)', async function () {
    for (let i = 0; i < 3; i++) {
      const loadTime = await measurePageLoad(driver, '/bookmarks', 10000);
      assert.ok(loadTime < 10000, `Избранное загрузка #${i + 1}: ${loadTime}мс`);
    }
  });
});
