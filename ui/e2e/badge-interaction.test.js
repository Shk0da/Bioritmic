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
  getAuthToken,
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

async function waitForBadge(driver, navTitle, timeout = 20000) {
  await driver.wait(async () => {
    try {
      const navLink = await driver.findElement(
        By.css(`a[title="${navTitle}"]`)
      );
      const badge = await navLink.findElement(By.css('.notification-badge'));
      const text = await badge.getText();
      return parseInt(text) > 0;
    } catch (e) {
      return false;
    }
  }, timeout);
}

async function getBadgeCount(driver, navTitle) {
  try {
    const navLink = await driver.findElement(
      By.css(`a[title="${navTitle}"]`)
    );
    const badge = await navLink.findElement(By.css('.notification-badge'));
    const text = await badge.getText();
    return parseInt(text);
  } catch (e) {
    return 0;
  }
}

async function waitForBadgeGone(driver, navTitle, timeout = 10000) {
  await driver.wait(async () => {
    try {
      const navLink = await driver.findElement(
        By.css(`a[title="${navTitle}"]`)
      );
      const badges = await navLink.findElements(By.css('.notification-badge'));
      return badges.length === 0;
    } catch (e) {
      return true;
    }
  }, timeout);
}

// ==================== БЕЙДЖИ СООБЩЕНИЙ ====================

describe('Бейджи непрочитанных сообщений', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Бейдж не показывается когда нет сообщений', async function () {
    const count = await getBadgeCount(driverA, 'Сообщения');
    assert.strictEqual(count, 0, 'Бейдж не должен отображаться без сообщений');
  });

  it('Бейдж появляется когда User B отправляет сообщение User A', async function () {
    await getUserById(driverB, userAId);
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
    await messageInput.sendKeys('Тестовое сообщение для бейджа');
    await driverB.sleep(300);

    const sendBtn = await driverB.wait(until.elementLocated(By.css('.send-btn')), 5000);
    await sendBtn.click();
    await driverB.sleep(2000);

    await navigateTo(driverA, '/swipe');
    await driverA.sleep(3000);

    await waitForBadge(driverA, 'Сообщения', 20000);

    const count = await getBadgeCount(driverA, 'Сообщения');
    assert.ok(count > 0, `Бейдж должен показать > 0, получено: ${count}`);
  });

  it('Бейдж показывает корректное количество отправителей', async function () {
    await getUserById(driverB, userAId);
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
    await messageInput.sendKeys('Второе сообщение');
    await driverB.sleep(300);

    const sendBtn = await driverB.wait(until.elementLocated(By.css('.send-btn')), 5000);
    await sendBtn.click();
    await driverB.sleep(2000);

    await navigateTo(driverA, '/swipe');
    await driverA.sleep(3000);

    const count = await getBadgeCount(driverA, 'Сообщения');
    assert.strictEqual(count, 1, `Бейдж должен показать 1 (один отправитель), получено: ${count}`);
  });

  it('Бейдж исчезает при переходе на страницу сообщений', async function () {
    const countBefore = await getBadgeCount(driverA, 'Сообщения');
    assert.ok(countBefore > 0, 'Бейдж должен быть виден перед переходом');

    await navigateTo(driverA, '/mailbox');
    await driverA.sleep(2000);

    await waitForBadgeGone(driverA, 'Сообщения', 10000);

    const countAfter = await getBadgeCount(driverA, 'Сообщения');
    assert.strictEqual(countAfter, 0, `Бейдж должен исчезнуть, получено: ${countAfter}`);
  });

  it('Бейдж не появляется снова сразу после прочтения', async function () {
    await driverA.sleep(3000);
    const count = await getBadgeCount(driverA, 'Сообщения');
    assert.strictEqual(count, 0, 'Бейдж не должен появляться без новых сообщений');
  });
});

// ==================== БЕЙДЖИ ВСТРЕЧЕЙ ====================

describe('Бейджи новых встреч', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Бейдж не показывается когда нет встреч', async function () {
    const count = await getBadgeCount(driverA, 'Встречи');
    assert.strictEqual(count, 0, 'Бейдж не должен отображаться без встреч');
  });

  it('Бейдж появляется когда User B предлагает встречу User A', async function () {
    await getUserById(driverB, userAId);
    const meetingBtn = await driverB.wait(
      until.elementLocated(By.css('.action-meeting')),
      10000
    );
    await meetingBtn.click();
    await driverB.sleep(2000);

    await navigateTo(driverA, '/swipe');
    await driverA.sleep(3000);

    await waitForBadge(driverA, 'Встречи', 20000);

    const count = await getBadgeCount(driverA, 'Встречи');
    assert.ok(count > 0, `Бейдж встреч должен показать > 0, получено: ${count}`);
  });

  it('Бейдж исчезает при переходе на страницу встреч', async function () {
    const countBefore = await getBadgeCount(driverA, 'Встречи');
    assert.ok(countBefore > 0, 'Бейдж должен быть виден перед переходом');

    await navigateTo(driverA, '/meetings');
    await driverA.sleep(2000);

    await waitForBadgeGone(driverA, 'Встречи', 10000);

    const countAfter = await getBadgeCount(driverA, 'Встречи');
    assert.strictEqual(countAfter, 0, `Бейдж должен исчезнуть, получено: ${countAfter}`);
  });

  it('Бейдж не появляется снова сразу после прочтения', async function () {
    await driverA.sleep(3000);
    const count = await getBadgeCount(driverA, 'Встречи');
    assert.strictEqual(count, 0, 'Бейдж не должен появляться без новых встреч');
  });
});

// ==================== ОДНОВРЕМЕННЫЕ БЕЙДЖИ ====================

describe('Одновременные бейджи сообщений и встреч', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Оба бейджа отображаются одновременно', async function () {
    await getUserById(driverB, userAId);
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
    await messageInput.sendKeys('Сообщение для теста бейджей');
    await driverB.sleep(300);
    const sendBtn = await driverB.wait(until.elementLocated(By.css('.send-btn')), 5000);
    await sendBtn.click();
    await driverB.sleep(2000);

    await getUserById(driverB, userAId);
    const meetingBtn = await driverB.wait(
      until.elementLocated(By.css('.action-meeting')),
      10000
    );
    await meetingBtn.click();
    await driverB.sleep(2000);

    await navigateTo(driverA, '/swipe');
    await driverA.sleep(5000);

    await waitForBadge(driverA, 'Сообщения', 20000);
    await waitForBadge(driverA, 'Встречи', 20000);

    const msgCount = await getBadgeCount(driverA, 'Сообщения');
    const meetCount = await getBadgeCount(driverA, 'Встречи');

    assert.ok(msgCount > 0, `Бейдж сообщений должен быть > 0, получено: ${msgCount}`);
    assert.ok(meetCount > 0, `Бейдж встреч должен быть > 0, получено: ${meetCount}`);
  });

  it('Бейдж сообщений исчезает при переходе в mailbox, бейдж встреч остаётся', async function () {
    await navigateTo(driverA, '/mailbox');
    await driverA.sleep(2000);

    const msgCount = await getBadgeCount(driverA, 'Сообщения');
    assert.strictEqual(msgCount, 0, 'Бейдж сообщений должен исчезнуть');

    const meetCount = await getBadgeCount(driverA, 'Встречи');
    assert.ok(meetCount > 0, `Бейдж встреч должен остаться, получено: ${meetCount}`);
  });

  it('Оба бейджа исчезают после посещения обоих страниц', async function () {
    await navigateTo(driverA, '/meetings');
    await driverA.sleep(2000);

    const meetCount = await getBadgeCount(driverA, 'Встречи');
    assert.strictEqual(meetCount, 0, 'Бейдж встреч должен исчезнуть');

    const msgCount = await getBadgeCount(driverA, 'Сообщения');
    assert.strictEqual(msgCount, 0, 'Бейдж сообщений не должен появляться');
  });
});

// ==================== СТИЛИ БЕЙДЖЕЙ ====================

describe('Визуальное отображение бейджей', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Бейдж сообщений имеет красный цвет', async function () {
    await getUserById(driverB, userAId);
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
    await messageInput.sendKeys('Цветной бейдж');
    await driverB.sleep(300);
    const sendBtn = await driverB.wait(until.elementLocated(By.css('.send-btn')), 5000);
    await sendBtn.click();
    await driverB.sleep(2000);

    await navigateTo(driverA, '/swipe');
    await driverA.sleep(3000);
    await waitForBadge(driverA, 'Сообщения', 20000);

    const badge = await driverA.findElement(
      By.css('a[title="Сообщения"] .notification-badge')
    );
    const bgColor = await badge.getCssValue('background-color');
    assert.ok(
      bgColor.includes('239') || bgColor.includes('ef4444') || bgColor.includes('red'),
      `Бейдж сообщений должен быть красным, получено: ${bgColor}`
    );
  });

  it('Бейдж встреч имеет янтарный цвет', async function () {
    await getUserById(driverB, userAId);
    const meetingBtn = await driverB.wait(
      until.elementLocated(By.css('.action-meeting')),
      10000
    );
    await meetingBtn.click();
    await driverB.sleep(2000);

    await navigateTo(driverA, '/swipe');
    await driverA.sleep(3000);
    await waitForBadge(driverA, 'Встречи', 20000);

    const badge = await driverA.findElement(
      By.css('a[title="Встречи"] .notification-badge')
    );
    const bgColor = await badge.getCssValue('background-color');
    assert.ok(
      bgColor.includes('245') || bgColor.includes('f59e0b') || bgColor.includes('amber'),
      `Бейдж встреч должен быть янтарным, получено: ${bgColor}`
    );
  });

  it('Бейджи корректно позиционированы (абсолютное позиционирование)', async function () {
    const badge = await driverA.findElement(
      By.css('a[title="Встречи"] .notification-badge')
    );
    const position = await badge.getCssValue('position');
    assert.strictEqual(position, 'absolute', `Бейдж должен иметь position: absolute, получено: ${position}`);
  });

  it('Бейджи имеют правильный border-radius (круглые)', async function () {
    const badge = await driverA.findElement(
      By.css('a[title="Встречи"] .notification-badge')
    );
    const borderRadius = await badge.getCssValue('border-radius');
    assert.ok(
      borderRadius.includes('9') || borderRadius.includes('50'),
      `Бейдж должен быть круглым, получено border-radius: ${borderRadius}`
    );
  });
});
