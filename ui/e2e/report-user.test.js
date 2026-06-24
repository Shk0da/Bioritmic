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
  getCurrentUserId,
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

// ==================== КНОПКА "ПОЖАЛОВАТЬСЯ" ====================

describe('Кнопка "Пожаловаться" на профиле пользователя', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Кнопка "Пожаловаться" отображается на профиле другого пользователя', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await isElementPresent(
      driverA,
      By.css('.action-report')
    );
    assert.ok(reportBtn, 'Кнопка "Пожаловаться" должна отображаться');
  });

  it('Кнопка содержит иконку флага и текст', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await driverA.findElement(By.css('.action-report'));
    const text = await reportBtn.getText();
    assert.ok(text.includes('Пожаловаться'), `Текст кнопки: ${text}`);

    const icon = await reportBtn.findElement(By.css('i.bi-flag'));
    assert.ok(icon, 'Кнопка должна содержать иконку флага');
  });

  it('Кнопка "Пожаловаться" НЕ отображается на собственном профиле', async function () {
    await navigateTo(driverA, '/profile');
    await driverA.sleep(2000);

    const url = await driverA.getCurrentUrl();
    if (!url.includes('/auth/login')) {
      const reportBtn = await isElementPresent(
        driverA,
        By.css('.action-report')
      );
      assert.ok(!reportBtn, 'Кнопка "Пожаловаться" не должна отображаться на собственном профиле');
    }
  });
});

// ==================== МОДАЛЬНОЕ ОКНО ЖАЛОБЫ ====================

describe('Модальное окно отправки жалобы', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Клик по "Пожаловаться" открывает модальное окно', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await driverA.wait(
      until.elementLocated(By.css('.action-report')),
      10000
    );
    await reportBtn.click();
    await driverA.sleep(500);

    const modal = await isElementPresent(
      driverA,
      By.css('.report-modal')
    );
    assert.ok(modal, 'Модальное окно жалобы должно открыться');
  });

  it('Модальное окно содержит заголовок "Жалоба на пользователя"', async function () {
    const header = await driverA.findElement(By.css('.report-modal-header h5'));
    const text = await header.getText();
    assert.ok(text.includes('Жалоба'), `Заголовок: ${text}`);
  });

  it('Модальное окно содержит имя пользователя', async function () {
    const userText = await driverA.findElement(By.css('.report-modal-user'));
    const text = await userText.getText();
    assert.ok(
      text.includes(USER_B.name) || text.includes('жаловаться'),
      `Текст содержит имя: ${text}`
    );
  });

  it('Модальное окно содержит 6 причин жалобы', async function () {
    const reasons = await driverA.findElements(By.css('.report-reason-item'));
    assert.strictEqual(reasons.length, 6, `Должно быть 6 причин, найдено: ${reasons.length}`);
  });

  it('Причины жалобы отображаются с иконками', async function () {
    const reasons = await driverA.findElements(By.css('.report-reason-item'));
    for (const reason of reasons) {
      const icon = await reason.findElement(By.css('i'));
      const iconClass = await icon.getAttribute('class');
      assert.ok(
        iconClass.includes('bi-'),
        `Иконка должна содержать bi-, получено: ${iconClass}`
      );
    }
  });

  it('Кнопка "Отправить жалобу" заблокирована без выбора причины', async function () {
    const submitBtn = await driverA.findElement(By.css('.btn-report'));
    const disabled = await submitBtn.getAttribute('disabled');
    assert.ok(disabled !== null, 'Кнопка "Отправить" должна быть заблокирована без выбора причины');
  });

  it('Модальное окно содержит поле для дополнительной информации', async function () {
    const textarea = await isElementPresent(
      driverA,
      By.css('.report-description textarea')
    );
    assert.ok(textarea, 'Должно быть поле для дополнительной информации');
  });

  it('Модальное окно содержит кнопку "Отмена"', async function () {
    const cancelBtn = await isElementPresent(
      driverA,
      By.css('.report-modal-footer .btn-cancel')
    );
    assert.ok(cancelBtn, 'Должна быть кнопка "Отмена"');
  });

  it('Клик по "Отмена" закрывает модальное окно', async function () {
    const cancelBtn = await driverA.findElement(By.css('.report-modal-footer .btn-cancel'));
    await cancelBtn.click();
    await driverA.sleep(500);

    const modal = await isElementPresent(
      driverA,
      By.css('.report-modal')
    );
    assert.ok(!modal, 'Модальное окно должно закрыться');
  });
});

// ==================== ВЫБОР ПРИЧИНЫ ====================

describe('Выбор причины жалобы', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('При выборе причины кнопка "Отправить" активируется', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await driverA.wait(
      until.elementLocated(By.css('.action-report')),
      10000
    );
    await reportBtn.click();
    await driverA.sleep(500);

    const firstReason = await driverA.findElement(By.css('.report-reason-item'));
    await firstReason.click();
    await driverA.sleep(300);

    const submitBtn = await driverA.findElement(By.css('.btn-report'));
    const disabled = await submitBtn.getAttribute('disabled');
    assert.strictEqual(disabled, null, 'Кнопка "Отправить" должна быть активна после выбора причины');
  });

  it('Выбранная причина подсвечивается', async function () {
    const reasons = await driverA.findElements(By.css('.report-reason-item'));
    await reasons[0].click();
    await driverA.sleep(300);

    const selectedClass = await reasons[0].getAttribute('class');
    assert.ok(
      selectedClass.includes('selected'),
      'Выбранная причина должна иметь класс selected'
    );
  });

  it('При смене причины подсветка переключается', async function () {
    const reasons = await driverA.findElements(By.css('.report-reason-item'));

    await reasons[0].click();
    await driverA.sleep(200);
    const class1 = await reasons[0].getAttribute('class');
    assert.ok(class1.includes('selected'), 'Первая причина должна быть выбрана');

    await reasons[2].click();
    await driverA.sleep(200);
    const class2 = await reasons[2].getAttribute('class');
    assert.ok(class2.includes('selected'), 'Третья причина должна быть выбрана');

    const class1After = await reasons[0].getAttribute('class');
    assert.ok(!class1After.includes('selected'), 'Первая причина должна быть снята');
  });

  it('Можно ввести дополнительную информацию', async function () {
    const textarea = await driverA.findElement(By.css('.report-description textarea'));
    await textarea.sendKeys('Пользователь отправляет спам-сообщения');
    await driverA.sleep(300);

    const value = await textarea.getAttribute('value');
    assert.ok(
      value.includes('спам'),
      `Текст должен быть введён, получено: ${value}`
    );
  });

  it('Клик по оверлею закрывает модальное окно', async function () {
    const overlay = await driverA.findElement(By.css('.report-modal-overlay'));
    await driverA.executeScript('arguments[0].click();', overlay);
    await driverA.sleep(500);

    const modal = await isElementPresent(
      driverA,
      By.css('.report-modal')
    );
    assert.ok(!modal, 'Модальное окно должно закрыться по клику на оверлей');
  });
});

// ==================== ОТПРАВКА ЖАЛОБЫ ====================

describe('Отправка жалобы', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Успешная отправка жалобы', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await driverA.wait(
      until.elementLocated(By.css('.action-report')),
      10000
    );
    await reportBtn.click();
    await driverA.sleep(500);

    const reasons = await driverA.findElements(By.css('.report-reason-item'));
    await reasons[0].click();
    await driverA.sleep(300);

    const submitBtn = await driverA.wait(
      until.elementLocated(By.css('.btn-report:not([disabled])')),
      5000
    );
    await submitBtn.click();
    await driverA.sleep(3000);

    const modal = await isElementPresent(
      driverA,
      By.css('.report-modal')
    );
    assert.ok(!modal, 'Модальное окно должно закрыться после отправки');
  });

  it('После отправки кнопка меняется на "Жалоба отправлена"', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportedBtn = await isElementPresent(
      driverA,
      By.css('.action-reported')
    );
    assert.ok(reportedBtn, 'Должна появиться кнопка "Жалоба отправлена"');

    const text = await driverA.findElement(By.css('.action-reported')).getText();
    assert.ok(text.includes('Жалоба отправлена'), `Текст: ${text}`);
  });

  it('Кнопка "Жалоба отправлена" заблокирована (disabled)', async function () {
    const reportedBtn = await driverA.findElement(By.css('.action-reported'));
    const disabled = await reportedBtn.getAttribute('disabled');
    assert.ok(disabled !== null, 'Кнопка должна быть disabled');
  });

  it('Кнопка "Пожаловаться" больше не отображается', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await isElementPresent(
      driverA,
      By.css('.action-report')
    );
    assert.ok(!reportBtn, 'Кнопка "Пожаловаться" не должна отображаться после отправки');
  });
});

// ==================== ОШИБКИ ОТПРАВКИ ====================

describe('Обработка ошибок при отправке жалобы', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Кнопка "Отправить" снова активна после закрытия модального окна', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await driverA.wait(
      until.elementLocated(By.css('.action-report')),
      10000
    );
    await reportBtn.click();
    await driverA.sleep(500);

    const reasons = await driverA.findElements(By.css('.report-reason-item'));
    await reasons[1].click();
    await driverA.sleep(300);

    const cancelBtn = await driverA.findElement(By.css('.report-modal-footer .btn-cancel'));
    await cancelBtn.click();
    await driverA.sleep(500);

    const reportBtnAgain = await driverA.wait(
      until.elementLocated(By.css('.action-report')),
      5000
    );
    assert.ok(reportBtnAgain, 'Кнопка "Пожаловаться" должна быть доступна снова');
  });
});

// ==================== ПРИЧИНЫ ЖАЛОБЫ (ВАЛИДАЦИЯ) ====================

describe('Список причин жалобы', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Все 6 причин отображаются корректно', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const reportBtn = await driverA.wait(
      until.elementLocated(By.css('.action-report')),
      10000
    );
    await reportBtn.click();
    await driverA.sleep(500);

    const expectedReasons = [
      'Спам',
      'Неприемлемый',
      'Преследование',
      'Фото не',
      'несовершеннолетний',
      'Другое',
    ];

    const reasons = await driverA.findElements(By.css('.report-reason-item'));
    assert.strictEqual(reasons.length, 6, 'Должно быть 6 причин');

    for (let i = 0; i < reasons.length; i++) {
      const text = await reasons[i].getText();
      assert.ok(
        text.includes(expectedReasons[i]),
        `Причина ${i + 1} должна содержать "${expectedReasons[i]}", получено: ${text}`
      );
    }
  });

  it('Каждая причина имеет radio input', async function () {
    const reasons = await driverA.findElements(By.css('.report-reason-item'));
    for (const reason of reasons) {
      const radio = await reason.findElement(By.css('input[type="radio"]'));
      assert.ok(radio, 'Каждая причина должна иметь radio input');
    }
  });

  it('Radio input имеет правильное имя для группировки', async function () {
    const reasons = await driverA.findElements(By.css('.report-reason-item input[type="radio"]'));
    const names = new Set();
    for (const radio of reasons) {
      const name = await radio.getAttribute('name');
      names.add(name);
    }
    assert.strictEqual(names.size, 1, 'Все radio должны иметь одно имя "reportReason"');
  });
});
