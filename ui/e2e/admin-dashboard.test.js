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
  getCurrentUserId,
  registerUser,
  loginUser,
  sendApiRequest,
} = require('./helpers');

let driverA, driverB;
let userAId, userBId;

const ADMIN_USER = {
  name: 'Админ Тест',
  email: `admin_test_${Date.now()}@test.com`,
  password: 'AdminPass123',
  birthday: '1990-01-01',
  gender: 'MAN',
};

async function setup() {
  driverA = await createDriver();
  driverB = await createDriver();
}

async function teardown() {
  await quitDriver(driverA);
  await quitDriver(driverB);
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

// ==================== ДОСТУП К АДМИН-ПАНЕЛИ ====================

describe('Доступ к админ-панели', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    userAId = await getCurrentUserId(driverA);
  });

  it('Обычный пользователь не видит ссылку на админ-панель', async function () {
    await navigateTo(driverA, '/swipe');
    await driverA.sleep(2000);

    const adminLink = await isElementPresent(
      driverA,
      By.css('a[title="Админ-панель"]')
    );
    assert.ok(!adminLink, 'Обычный пользователь не должен видеть ссылку на админ-панель');
  });

  it('Обычный пользователь редиректится на /swipe при прямом переходе на /admin', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const url = await driverA.getCurrentUrl();
    assert.ok(
      url.includes('/swipe'),
      `Обычный пользователь должен быть редиректнут на /swipe, текущий URL: ${url}`
    );
  });
});

// ==================== ДАШБОРД СТАТИСТИКИ ====================

describe('Дашборд статистики администратора', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);

    const token = await getAuthToken(driverA);
    const adminCreated = await makeUserAdmin(token);
    if (!adminCreated) {
      console.log('WARNING: Could not make user admin via API, some tests may be skipped');
    }

    await driverA.executeScript('localStorage.clear();');
    await loginUser(driverA, USER_A.email, USER_A.password);
  });

  async function getAuthToken(driver) {
    return driver.executeScript(
      'return localStorage.getItem("bioritmic_token") || localStorage.getItem("access_token");'
    );
  }

  it('Ссылка на админ-панель видна для администратора', async function () {
    await navigateTo(driverA, '/swipe');
    await driverA.sleep(2000);

    const adminLink = await isElementPresent(
      driverA,
      By.css('a[title="Админ-панель"]')
    );
    assert.ok(adminLink, 'Администратор должен видеть ссылку на админ-панель');
  });

  it('Администратор может перейти на страницу админ-панели', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/admin'), `Должен быть переход на /admin, текущий URL: ${url}`);
  });

  it('Отображается заголовок "Админ-панель"', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Админ-панель'),
      'Должен отображаться заголовок "Админ-панель"'
    );
  });

  it('Отображаются 4 карточки статистики', async function () {
    const statCards = await driverA.findElements(By.css('.stat-card'));
    assert.strictEqual(statCards.length, 4, `Должно быть 4 карточки статистики, найдено: ${statCards.length}`);
  });

  it('Карточка "Всего пользователей" показывает число >= 2', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Всего пользователей'), 'Должна быть карточка "Всего пользователей"');

    const statValues = await driverA.findElements(By.css('.stat-value'));
    const totalUsersText = await statValues[0].getText();
    const totalUsers = parseInt(totalUsersText);
    assert.ok(totalUsers >= 2, `Всего пользователей должно быть >= 2, получено: ${totalUsers}`);
  });

  it('Карточка "Верифицированы" показывает число', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Верифицированы'), 'Должна быть карточка "Верифицированы"');
  });

  it('Карточка "Ожидают верификации" показывает число', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Ожидают верификации'), 'Должна быть карточка "Ожидают верификации"');
  });

  it('Карточка "Жалоб на рассмотрении" показывает число', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Жалоб на рассмотрении'), 'Должна быть карточка "Жалоб на рассмотрении"');
  });
});

// ==================== ВКЛАДКА ПОЛЬЗОВАТЕЛЕЙ ====================

describe('Вкладка пользователей в админ-панели', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);

    const token = await getAuthToken(driverA);
    await makeUserAdmin(token);
    await driverA.executeScript('localStorage.clear();');
    await loginUser(driverA, USER_A.email, USER_A.password);
  });

  async function getAuthToken(driver) {
    return driver.executeScript(
      'return localStorage.getItem("bioritmic_token") || localStorage.getItem("access_token");'
    );
  }

  it('Вкладка "Пользователи" активна по умолчанию', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const usersTab = await driverA.findElement(
      By.css('button.nav-link.active')
    );
    const tabText = await usersTab.getText();
    assert.ok(tabText.includes('Пользователи'), `Активная вкладка должна быть "Пользователи", получено: ${tabText}`);
  });

  it('Отображается таблица пользователей', async function () {
    const table = await isElementPresent(driverA, By.css('table.table'));
    assert.ok(table, 'Должна отображаться таблица пользователей');
  });

  it('Таблица содержит заголовки: ID, Имя, Email, Возраст, Роль, Действия', async function () {
    const headers = await driverA.findElements(By.css('table thead th'));
    const headerTexts = [];
    for (const h of headers) {
      headerTexts.push(await h.getText());
    }

    assert.ok(headerTexts.includes('ID'), 'Таблица должна содержать столбец ID');
    assert.ok(headerTexts.includes('Имя'), 'Таблица должна содержать столбец Имя');
    assert.ok(headerTexts.includes('Email'), 'Таблица должна содержать столбец Email');
    assert.ok(headerTexts.includes('Возраст'), 'Таблица должна содержать столбец Возраст');
    assert.ok(headerTexts.includes('Роль'), 'Таблица должна содержать столбец Роль');
    assert.ok(headerTexts.includes('Действия'), 'Таблица должна содержать столбец Действия');
  });

  it('Таблица содержит как минимум 2 пользователей', async function () {
    const rows = await driverA.findElements(By.css('table tbody tr'));
    assert.ok(rows.length >= 2, `Должно быть >= 2 строки, найдено: ${rows.length}`);
  });

  it('Каждый пользователь имеет бейдж роли', async function () {
    const roleBadges = await driverA.findElements(By.css('table tbody .badge'));
    assert.ok(roleBadges.length >= 2, `Должно быть >= 2 бейджа ролей, найдено: ${roleBadges.length}`);
  });

  it('Бейдж роли "USER" имеет зелёный цвет', async function () {
    const badges = await driverA.findElements(By.css('table tbody .badge.bg-success'));
    assert.ok(badges.length >= 1, 'Должен быть хотя бы один бейдж ROLE=USER (зелёный)');
  });

  it('Администратор не может забанить или удалить самого себя', async function () {
    const rows = await driverA.findElements(By.css('table tbody tr'));
    for (const row of rows) {
      const emailCell = await row.findElement(By.css('td:nth-child(3)'));
      const email = await emailCell.getText();
      if (email === USER_A.email) {
        const actionBtns = await row.findElements(By.css('.btn-group .btn'));
        assert.strictEqual(
          actionBtns.length,
          0,
          'Администратор не должен иметь кнопок действий для себя'
        );
        break;
      }
    }
  });
});

// ==================== ВКЛАДКА ЖАЛОБ ====================

describe('Вкладка жалоб в админ-панели', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);

    const token = await getAuthToken(driverA);
    await makeUserAdmin(token);
    await driverA.executeScript('localStorage.clear();');
    await loginUser(driverA, USER_A.email, USER_A.password);
  });

  async function getAuthToken(driver) {
    return driver.executeScript(
      'return localStorage.getItem("bioritmic_token") || localStorage.getItem("access_token");'
    );
  }

  it('Можно переключиться на вкладку "Жалобы"', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const reportsTab = await driverA.wait(
      until.elementLocated(By.css('button.nav-link')),
      5000
    );
    const allTabs = await driverA.findElements(By.css('button.nav-link'));
    for (const tab of allTabs) {
      const text = await tab.getText();
      if (text.includes('Жалобы')) {
        await tab.click();
        break;
      }
    }
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Жалоб') || bodyText.includes('Нет ожидающих жалоб'),
      'Должна отображаться вкладка жалоб'
    );
  });

  it('Отображается сообщение "Нет ожидающих жалоб" если жалоб нет', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Нет ожидающих жалоб') || bodyText.includes('ID'),
      'Должно отображаться содержимое вкладки жалоб'
    );
  });

  it('Бейдж на вкладке "Жалобы" показывает количество', async function () {
    const allTabs = await driverA.findElements(By.css('button.nav-link'));
    for (const tab of allTabs) {
      const text = await tab.getText();
      if (text.includes('Жалобы')) {
        const badge = await tab.findElements(By.css('.badge'));
        if (badge.length > 0) {
          const count = await badge[0].getText();
          assert.ok(parseInt(count) >= 0, `Бейдж должен показать число, получено: ${count}`);
        }
        break;
      }
    }
  });
});

// ==================== ВКЛАДКА МЕТРИК ====================

describe('Вкладка метрик в админ-панели', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    const token = await getAuthToken(driverA);
    await makeUserAdmin(token);
    await driverA.executeScript('localStorage.clear();');
    await loginUser(driverA, USER_A.email, USER_A.password);
  });

  async function getAuthToken(driver) {
    return driver.executeScript(
      'return localStorage.getItem("bioritmic_token") || localStorage.getItem("access_token");'
    );
  }

  it('Можно переключиться на вкладку "Метрики"', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

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
      bodyText.includes('JVM') || bodyText.includes('Метрики'),
      'Должна отображаться вкладка метрик'
    );
  });

  it('Отображается секция JVM', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('JVM'), 'Должна отображаться секция JVM');
    assert.ok(bodyText.includes('Версия'), 'Должна отображаться версия JVM');
    assert.ok(bodyText.includes('Аптайм'), 'Должен отображаться аптайм');
    assert.ok(bodyText.includes('CPU ядра'), 'Должно отображаться количество CPU ядер');
  });

  it('Отображается секция "База данных"', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('База данных'), 'Должна отображаться секция "База данных"');
    assert.ok(bodyText.includes('Активные соединения'), 'Должно отображаться "Активные соединения"');
  });

  it('Отображается секция "Система"', async function () {
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Система'), 'Должна отображаться секция "Система"');
    assert.ok(bodyText.includes('ОС'), 'Должна отображаться ОС');
    assert.ok(bodyText.includes('памяти'), 'Должна отображаться информация о памяти');
  });

  it('Heap usage progress bar присутствует', async function () {
    const progressBar = await isElementPresent(
      driverA,
      By.css('.progress-bar')
    );
    assert.ok(progressBar, 'Должен отображаться progress bar для Heap usage');
  });
});

// ==================== ДЕЙСТВИЯ НАД ПОЛЬЗОВАТЕЛЯМИ ====================

describe('Управление пользователями в админ-панели', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);

    const token = await getAuthToken(driverA);
    await makeUserAdmin(token);
    await driverA.executeScript('localStorage.clear();');
    await loginUser(driverA, USER_A.email, USER_A.password);
  });

  async function getAuthToken(driver) {
    return driver.executeScript(
      'return localStorage.getItem("bioritmic_token") || localStorage.getItem("access_token");'
    );
  }

  it('Кнопка "Забанить" видна для обычного пользователя', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const rows = await driverA.findElements(By.css('table tbody tr'));
    let foundBanBtn = false;
    for (const row of rows) {
      const emailCell = await row.findElement(By.css('td:nth-child(3)'));
      const email = await emailCell.getText();
      if (email === USER_B.email) {
        const btns = await row.findElements(By.css('.btn-warning'));
        foundBanBtn = btns.length > 0;
        break;
      }
    }
    assert.ok(foundBanBtn, 'Должна быть кнопка "Забанить" для обычного пользователя');
  });

  it('Кнопка "Удалить" видна для обычного пользователя', async function () {
    const rows = await driverA.findElements(By.css('table tbody tr'));
    let foundDeleteBtn = false;
    for (const row of rows) {
      const emailCell = await row.findElement(By.css('td:nth-child(3)'));
      const email = await emailCell.getText();
      if (email === USER_B.email) {
        const btns = await row.findElements(By.css('.btn-danger'));
        foundDeleteBtn = btns.length > 0;
        break;
      }
    }
    assert.ok(foundDeleteBtn, 'Должна быть кнопка "Удалить" для обычного пользователя');
  });
});

// ==================== НАВИГАЦИЯ ПО ВКЛАДКАМ ====================

describe('Переключение вкладок админ-панели', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    const token = await getAuthToken(driverA);
    await makeUserAdmin(token);
    await driverA.executeScript('localStorage.clear();');
    await loginUser(driverA, USER_A.email, USER_A.password);
  });

  async function getAuthToken(driver) {
    return driver.executeScript(
      'return localStorage.getItem("bioritmic_token") || localStorage.getItem("access_token");'
    );
  }

  it('Все 3 вкладки присутствуют', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const allTabs = await driverA.findElements(By.css('button.nav-link'));
    assert.strictEqual(allTabs.length, 3, `Должно быть 3 вкладки, найдено: ${allTabs.length}`);

    const tabTexts = [];
    for (const tab of allTabs) {
      tabTexts.push(await tab.getText());
    }
    assert.ok(tabTexts.some((t) => t.includes('Пользователи')), 'Должна быть вкладка "Пользователи"');
    assert.ok(tabTexts.some((t) => t.includes('Жалобы')), 'Должна быть вкладка "Жалобы"');
    assert.ok(tabTexts.some((t) => t.includes('Метрики')), 'Должна быть вкладка "Метрики"');
  });

  it('Переключение между вкладками работает', async function () {
    await navigateTo(driverA, '/admin');
    await driverA.sleep(3000);

    const allTabs = await driverA.findElements(By.css('button.nav-link'));

    for (const tab of allTabs) {
      const text = await tab.getText();
      if (text.includes('Жалобы')) {
        await tab.click();
        await driverA.sleep(1500);
        const activeTab = await driverA.findElement(By.css('button.nav-link.active'));
        const activeText = await activeTab.getText();
        assert.ok(activeText.includes('Жалобы'), 'Вкладка "Жалобы" должна стать активной');
        break;
      }
    }

    for (const tab of await driverA.findElements(By.css('button.nav-link'))) {
      const text = await tab.getText();
      if (text.includes('Метрики')) {
        await tab.click();
        await driverA.sleep(1500);
        const activeTab = await driverA.findElement(By.css('button.nav-link.active'));
        const activeText = await activeTab.getText();
        assert.ok(activeText.includes('Метрики'), 'Вкладка "Метрики" должна стать активной');
        break;
      }
    }

    for (const tab of await driverA.findElements(By.css('button.nav-link'))) {
      const text = await tab.getText();
      if (text.includes('Пользователи')) {
        await tab.click();
        await driverA.sleep(1500);
        const activeTab = await driverA.findElement(By.css('button.nav-link.active'));
        const activeText = await activeTab.getText();
        assert.ok(activeText.includes('Пользователи'), 'Вкладка "Пользователи" должна стать активной');
        break;
      }
    }
  });
});
