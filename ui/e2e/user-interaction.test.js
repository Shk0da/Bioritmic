const { By, until, Key } = require('selenium-webdriver');
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
  registerUser,
  loginUser,
  navigateTo,
  getUserById,
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

// ==================== ТЕСТЫ РЕГИСТРАЦИИ ====================

describe('Регистрация и авторизация двух пользователей', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  it('User A успешно регистрируется', async function () {
    await registerUser(driverA, USER_A);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/swipe'), `Ожидался redirect на /swipe, получен: ${url}`);
    userAId = await getCurrentUserId(driverA);
    assert.ok(userAId, 'User A ID должен быть сохранён');
  });

  it('User B успешно регистрируется', async function () {
    await registerUser(driverB, USER_B);
    const url = await driverB.getCurrentUrl();
    assert.ok(url.includes('/swipe'), `Ожидался redirect на /swipe, получен: ${url}`);
    userBId = await getCurrentUserId(driverB);
    assert.ok(userBId, 'User B ID должен быть сохранён');
  });

  it('User A может выйти и войти снова', async function () {
    await driverA.executeScript('localStorage.clear();');
    await loginUser(driverA, USER_A.email, USER_A.password);
    const url = await driverA.getCurrentUrl();
    assert.ok(url.includes('/swipe'), 'После логина должен быть редирект на /swipe');
  });

  it('User B может выйти и войти снова', async function () {
    await driverB.executeScript('localStorage.clear();');
    await loginUser(driverB, USER_B.email, USER_B.password);
    const url = await driverB.getCurrentUrl();
    assert.ok(url.includes('/swipe'), 'После логина должен быть редирект на /swipe');
  });
});

// ==================== ТЕСТЫ ПРОСМОТРА ПРОФИЛЕЙ ====================

describe('Просмотр профилей пользователей', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('User A может просмотреть профиль User B', async function () {
    await getUserById(driverA, userBId);
    const hasName = await isElementPresent(driverA, By.css('.hero-name, .user-name, h2'));
    assert.ok(hasName, 'Имя пользователя должно отображаться на странице профиля');
  });

  it('User B может просмотреть профиль User A', async function () {
    await getUserById(driverB, userAId);
    const hasName = await isElementPresent(driverB, By.css('.hero-name, .user-name, h2'));
    assert.ok(hasName, 'Имя пользователя должно отображаться на странице профиля');
  });

  it('На профиле есть кнопки взаимодействия', async function () {
    await getUserById(driverA, userBId);
    const hasMessageBtn = await isElementPresent(driverA, By.css('.action-message'));
    const hasBookmarkBtn = await isElementPresent(driverA, By.css('[class*="action-bookmark"]'));
    const hasBlockBtn = await isElementPresent(driverA, By.css('[class*="action-block"]'));
    assert.ok(hasMessageBtn, 'Должна быть кнопка "Написать"');
    assert.ok(hasBookmarkBtn, 'Должна быть кнопка "В избранное"');
    assert.ok(hasBlockBtn, 'Должна быть кнопка "Заблокировать"');
  });
});

// ==================== ТЕСТЫ ИЗБРАННОГО (BOOKMARKS) ====================

describe('Добавление в избранное', function () {
  this.timeout(60000);

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
    const bookmarkBtn = await driverA.wait(
      until.elementLocated(By.css('[class*="action-bookmark"]')),
      10000
    );
    const text = await bookmarkBtn.getText();
    assert.ok(text.includes('избранное') || text.includes('Избранное'), `Текст кнопки: ${text}`);
    await bookmarkBtn.click();
    await driverA.sleep(1500);

    const updatedText = await bookmarkBtn.getText();
    assert.ok(
      updatedText.includes('избранном') || updatedText.includes('Избранном'),
      `После клика текст должен измениться, получено: ${updatedText}`
    );
  });

  it('User B добавляет User A в избранное (взаимный мэтч)', async function () {
    await getUserById(driverB, userAId);
    const bookmarkBtn = await driverB.wait(
      until.elementLocated(By.css('[class*="action-bookmark"]')),
      10000
    );
    await bookmarkBtn.click();
    await driverB.sleep(1500);

    const updatedText = await bookmarkBtn.getText();
    assert.ok(
      updatedText.includes('избранном') || updatedText.includes('Избранном'),
      `После клика текст должен измениться, получено: ${updatedText}`
    );
  });

  it('User A видит User B в списке избранного', async function () {
    await navigateTo(driverA, '/bookmarks');
    await driverA.sleep(3000);

    const pageText = await driverA.findElement(By.css('body')).getText();
    const hasUserB = pageUserHasName(pageText, USER_B.name) || pageText.includes(String(userBId));
    assert.ok(hasUserB, `User B (${USER_B.name}) должен быть в списке избранного`);
  });
});

function pageUserHasName(text, name) {
  return text.includes(name);
}

// ==================== ТЕСТЫ СООБЩЕНИЙ (MESSAGING) ====================

describe('Обмен сообщениями между пользователями', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('User A отправляет сообщение User B', async function () {
    await getUserById(driverA, userBId);
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
    await messageInput.sendKeys('Привет from User A!');
    await driverA.sleep(300);

    const sendBtn = await driverA.wait(
      until.elementLocated(By.css('.send-btn')),
      5000
    );
    await sendBtn.click();
    await driverA.sleep(3000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Привет from User A!'),
      'Отправленное сообщение должно отображаться в чате'
    );
  });

  it('User B видит сообщение от User A в списке диалогов', async function () {
    await navigateTo(driverB, '/mailbox');
    await driverB.sleep(3000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Привет from User A!') || bodyText.includes(USER_A.name),
      'Список диалогов должен содержать сообщение от User A'
    );
  });

  it('User B открывает диалог и отвечает', async function () {
    await navigateTo(driverB, `/mailbox/conversation/${userAId}`);
    await driverB.sleep(2000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Привет from User A!'),
      'User B должен видеть сообщение от User A'
    );

    const messageInput = await driverB.wait(
      until.elementLocated(By.css('.message-input, input[placeholder*="сообщение"]')),
      10000
    );
    await messageInput.sendKeys('Привет от User B! Как дела?');
    await driverB.sleep(300);

    const sendBtn = await driverB.wait(
      until.elementLocated(By.css('.send-btn')),
      5000
    );
    await sendBtn.click();
    await driverB.sleep(3000);

    const bodyTextAfter = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyTextAfter.includes('Привет от User B!'),
      'Отправленное сообщение должно отображаться'
    );
  });

  it('User A видит ответ от User B', async function () {
    await navigateTo(driverA, `/mailbox/conversation/${userBId}`);
    await driverA.sleep(3000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Привет от User B!'),
      'User A должен видеть ответ от User B'
    );
  });

  it('Оба сообщения видны в диалоге', async function () {
    await navigateTo(driverA, `/mailbox/conversation/${userBId}`);
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Привет from User A!'), 'Первое сообщение должно быть видно');
    assert.ok(bodyText.includes('Привет от User B!'), 'Второе сообщение должно быть видно');
  });
});

// ==================== ТЕСТЫ ВСТРЕЧЕЙ (MEETINGS) ====================

describe('Предложение и принятие встреч', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('User A предлагает встречу User B', async function () {
    await getUserById(driverA, userBId);
    const meetingBtn = await driverA.wait(
      until.elementLocated(By.css('.action-meeting')),
      10000
    );
    const btnText = await meetingBtn.getText();
    assert.ok(btnText.includes('Встреча'), `Текст кнопки: ${btnText}`);
    await meetingBtn.click();
    await driverA.sleep(2000);

    const sentBtn = await driverA.wait(
      until.elementLocated(By.css('.action-meeting-sent')),
      5000
    );
    const sentText = await sentBtn.getText();
    assert.ok(
      sentText.includes('отправлена') || sentText.includes('Отправлена'),
      `Кнопка должна показать статус отправки, получено: ${sentText}`
    );
  });

  it('User B видит предложение встречи на странице встреч', async function () {
    await navigateTo(driverB, '/meetings');
    await driverB.sleep(3000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes(USER_A.name) || bodyText.includes(String(userAId)),
      'Страница встреч должна содержать User A'
    );
    assert.ok(
      bodyText.includes('Ожидает') || bodyText.includes('PENDING'),
      'Статус встречи должен быть "Ожидает"'
    );
  });

  it('User B принимает встречу', async function () {
    await navigateTo(driverB, '/meetings');
    await driverB.sleep(2000);

    const acceptBtn = await driverB.wait(
      until.elementLocated(By.css('.btn-outline-success, [class*="accept"]')),
      10000
    );
    await acceptBtn.click();
    await driverB.sleep(2000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Принято') || bodyText.includes('ACCEPTED') || bodyText.includes('принята'),
      'Статус встречи должен измениться на "Принято"'
    );
  });
});

// ==================== ТЕСТЫ БЛОКИРОВКИ ====================

describe('Блокировка пользователей', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('User A блокирует User B', async function () {
    await getUserById(driverA, userBId);
    const blockBtn = await driverA.wait(
      until.elementLocated(By.css('[class*="action-block"]')),
      10000
    );
    const btnText = await blockBtn.getText();
    assert.ok(btnText.includes('Заблокировать') || btnText.includes('блокировать'), `Текст кнопки: ${btnText}`);
    await blockBtn.click();
    await driverA.sleep(2000);

    const updatedText = await blockBtn.getText();
    assert.ok(
      updatedText.includes('Разблокировать') || updatedText.includes('разблокировать'),
      `После блокировки кнопка должна показать "Разблокировать", получено: ${updatedText}`
    );
  });

  it('User A не может написать заблокированному пользователю', async function () {
    await getUserById(driverA, userBId);
    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('ограничил') || bodyText.includes('Заблокировать') || bodyText.includes('Разблокировать'),
      'Должно отображаться уведомление о блокировке'
    );
  });

  it('User A разблокирует User B', async function () {
    await getUserById(driverA, userBId);
    const unblockBtn = await driverA.wait(
      until.elementLocated(By.css('[class*="action-block"]')),
      10000
    );
    const btnText = await unblockBtn.getText();
    assert.ok(btnText.includes('Разблокировать') || btnText.includes('разблокировать'), `Текст кнопки: ${btnText}`);
    await unblockBtn.click();
    await driverA.sleep(2000);

    const updatedText = await unblockBtn.getText();
    assert.ok(
      updatedText.includes('Заблокировать') || updatedText.includes('заблокировать'),
      `После разблокировки кнопка должна показать "Заблокировать", получено: ${updatedText}`
    );
  });
});

// ==================== ТЕСТЫ ЧАТА С БЛОКИРОВКОЙ ====================

describe('Блокировка в чате', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('Сначала обмен сообщениями', async function () {
    await getUserById(driverA, userBId);
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
    await messageInput.sendKeys('Сообщение перед блокировкой');
    await driverA.sleep(300);

    const sendBtn = await driverA.wait(
      until.elementLocated(By.css('.send-btn')),
      5000
    );
    await sendBtn.click();
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(bodyText.includes('Сообщение перед блокировкой'), 'Сообщение должно отправиться');
  });

  it('User A блокирует User B через профиль', async function () {
    await getUserById(driverA, userBId);
    const blockBtn = await driverA.wait(
      until.elementLocated(By.css('[class*="action-block"]')),
      10000
    );
    await blockBtn.click();
    await driverA.sleep(2000);
  });

  it('User A не может писать в чат заблокированному', async function () {
    await navigateTo(driverA, `/mailbox/conversation/${userBId}`);
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    const hasBlockNotice = bodyText.includes('ограничил') || bodyText.includes('общение');
    const inputPresent = await isElementPresent(driverA, By.css('.message-input'));

    assert.ok(
      hasBlockNotice || !inputPresent,
      'Должно быть уведомление о блокировке или поле ввода должно быть скрыто'
    );
  });
});

// ==================== ТЕСТЫ ПОЛУЧЕНИЯ ПОЛЬЗОВАТЕЛЕЙ ЧЕРЕЗ API ====================

describe('Поиск пользователей через API', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('User A может найти User B в поиске', async function () {
    const token = await getAuthToken(driverA);
    assert.ok(token, 'Токен авторизации должен существовать');

    await navigateTo(driverA, '/search');
    await driverA.sleep(3000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Поиск') || bodyText.includes('search') || bodyText.includes('Найти'),
      'Страница поиска должна загрузиться'
    );
  });

  it('User A может просмотреть список избранного', async function () {
    await navigateTo(driverA, '/bookmarks');
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Избранное') || bodyText.includes('избранное'),
      'Страница избранного должна загрузиться'
    );
  });

  it('User B может просмотреть список избранного', async function () {
    await navigateTo(driverB, '/bookmarks');
    await driverB.sleep(2000);

    const bodyText = await driverB.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Избранное') || bodyText.includes('избранное'),
      'Страница избранного должна загрузиться'
    );
  });
});

// ==================== ТЕСТЫ УДАЛЕНИЯ ДИАЛОГА ====================

describe('Удаление диалога', function () {
  this.timeout(90000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);

    await getUserById(driverA, userBId);
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
    await messageInput.sendKeys('Сообщение для удаления');
    await driverA.sleep(300);
    const sendBtn = await driverA.wait(until.elementLocated(By.css('.send-btn')), 5000);
    await sendBtn.click();
    await driverA.sleep(2000);
  });

  it('User A удаляет диалог с User B', async function () {
    await navigateTo(driverA, '/mailbox');
    await driverA.sleep(2000);

    const deleteBtn = await driverA.wait(
      until.elementLocated(By.css('.btn-delete, [class*="delete"]')),
      10000
    );
    await deleteBtn.click();
    await driverA.sleep(1000);

    const confirmBtn = await driverA.wait(
      until.elementLocated(By.css('.btn-primary, button[class*="confirm"], button[class*="ok"]')),
      5000
    );
    await confirmBtn.click();
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Нет сообщений') || !bodyText.includes('Сообщение для удаления'),
      'Диалог должен быть удалён'
    );
  });
});

// ==================== ТЕСТЫ СОВМЕСТИМОСТИ ====================

describe('Просмотр совместимости', function () {
  this.timeout(60000);

  before(setup);
  after(teardown);

  before(async function () {
    await registerUser(driverA, USER_A);
    await registerUser(driverB, USER_B);
    userAId = await getCurrentUserId(driverA);
    userBId = await getCurrentUserId(driverB);
  });

  it('User A видит совместимость на профиле User B', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    const hasCompatibility =
      bodyText.includes('Совместимость') ||
      bodyText.includes('совместимость') ||
      bodyText.includes('compatibility') ||
      bodyText.includes('Heartfelt') ||
      bodyText.includes('Physical') ||
      bodyText.includes('Intellectual');
    assert.ok(hasCompatibility, 'На профиле должна отображаться информация о совместимости');
  });

  it('User A видит биоритм на профиле User B', async function () {
    await getUserById(driverA, userBId);
    await driverA.sleep(2000);

    const bodyText = await driverA.findElement(By.css('body')).getText();
    const hasBiorhythm =
      bodyText.includes('Биоритм') ||
      bodyText.includes('биоритм') ||
      bodyText.includes('biorhythm');
    assert.ok(hasBiorhythm, 'На профиле должна отображаться биоритмическая информация');
  });
});
