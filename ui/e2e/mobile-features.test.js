const { By, until } = require('selenium-webdriver');
const assert = require('assert');
const {
  createMobileDriver,
  quitDriver,
  waitAndClick,
  waitForText,
  waitForUrlContains,
  isElementVisible,
  navigateTo,
  registerAndVerifyUser,
  registerUserViaApi,
  verifyUserViaApi,
  loginViaApi,
  loginUser,
  resolveSeedAdminCredentials,
  getSeedAdminToken,
  bookmarkUserViaApi,
  sendMailViaApi,
  waitForMessagesNearBottom,
  getMessagesScrollState,
  makeUser,
  clearSession,
} = require('./helpers');

const MOBILE_MEETINGS_USER_A = makeUser({
  name: 'E2E Mobile Meetings A',
  password: 'TestPass123',
  birthday: '1995-06-15',
  gender: 'MAN',
});

const MOBILE_MEETINGS_USER_B = makeUser({
  name: 'E2E Mobile Meetings B',
  password: 'TestPass456',
  birthday: '1998-03-22',
  gender: 'WOMAN',
});

let driver;
let meetingsUserAId;
let meetingsUserBId;
let meetingsTokenA;

async function setupMeetingsUsers() {
  await resolveSeedAdminCredentials();
  meetingsUserAId = await registerAndVerifyUser(driver, MOBILE_MEETINGS_USER_A);
  meetingsTokenA = await loginViaApi(MOBILE_MEETINGS_USER_A.email, MOBILE_MEETINGS_USER_A.password, false);
  meetingsUserBId = await registerUserViaApi(MOBILE_MEETINGS_USER_B);
  await verifyUserViaApi(await getSeedAdminToken(), meetingsUserBId);
}

async function openMobileChatFromList(otherUserName) {
  await navigateTo(driver, '/mailbox');
  const conversation = await driver.wait(
    until.elementLocated(By.xpath(`//div[contains(@class,'conversation-item')][.//h6[contains(normalize-space(.), "${otherUserName}")]]`)),
    20000
  );
  await conversation.click();
  await waitForUrlContains(driver, '/mailbox/', 10000);
  await driver.wait(until.elementLocated(By.css('[data-testid="message-input"]')), 20000);
}

describe('Мобильная версия: встречи', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createMobileDriver();
    await setupMeetingsUsers();
    await bookmarkUserViaApi(meetingsTokenA, meetingsUserBId);
  });

  after(async function () {
    await quitDriver(driver);
  });

  it('кнопка "Предложить встречу" видна на странице /meetings', async function () {
    await navigateTo(driver, '/meetings');
    const button = await driver.wait(
      until.elementLocated(By.css('[data-testid="meetings-suggest-button"]')),
      15000
    );
    assert.ok(await button.isDisplayed(), 'Кнопка "Предложить встречу" должна быть видна на мобильной версии');
    const text = await button.getText();
    assert.ok(text.includes('Предложить встречу'), `Ожидался полный текст кнопки, получено: "${text}"`);
  });

  it('кнопка открывает список избранных для новой встречи', async function () {
    await navigateTo(driver, '/meetings');
    await waitAndClick(driver, By.css('[data-testid="meetings-suggest-button"]'));
    await driver.wait(
      until.elementLocated(By.css('[data-testid="meetings-bookmark-dropdown"]')),
      10000
    );
    await waitForText(
      driver,
      By.css('[data-testid="meetings-bookmark-dropdown"]'),
      MOBILE_MEETINGS_USER_B.name,
      10000
    );
  });
});

describe('Мобильная версия: чат', function () {
  this.timeout(120000);

  const lastMessageText = 'E2E mobile latest message';
  const chatUserA = makeUser({
    name: 'E2E Mobile Chat A',
    password: 'TestPass123',
    birthday: '1995-06-15',
    gender: 'MAN',
  });
  const chatUserB = makeUser({
    name: 'E2E Mobile Chat B',
    password: 'TestPass456',
    birthday: '1998-03-22',
    gender: 'WOMAN',
  });

  let chatUserAId;
  let chatTokenA;

  before(async function () {
    driver = await createMobileDriver();
    await resolveSeedAdminCredentials();
    chatUserAId = await registerAndVerifyUser(driver, chatUserA);
    chatTokenA = await loginViaApi(chatUserA.email, chatUserA.password, false);
    const chatUserBId = await registerUserViaApi(chatUserB);
    await verifyUserViaApi(await getSeedAdminToken(), chatUserBId);

    for (let index = 0; index < 12; index += 1) {
      await sendMailViaApi(chatTokenA, chatUserBId, `E2E mobile history ${index + 1}`);
    }
    await sendMailViaApi(chatTokenA, chatUserBId, lastMessageText);
  });

  after(async function () {
    await quitDriver(driver);
  });

  beforeEach(async function () {
    await clearSession(driver);
    await loginUser(driver, chatUserB.email, chatUserB.password);
  });

  it('при открытии диалога показывает последние сообщения внизу списка', async function () {
    await openMobileChatFromList(chatUserA.name);
    await waitForText(driver, By.css('.messages-container'), lastMessageText, 20000);
    await waitForMessagesNearBottom(driver, 120, 20000);

    const scrollState = await getMessagesScrollState(driver);
    assert.ok(scrollState, 'Контейнер сообщений должен существовать');
    assert.ok(
      scrollState.distanceFromBottom <= 120,
      `Ожидался скролл внизу, distanceFromBottom=${scrollState.distanceFromBottom}`
    );
  });

  it('после перехода на другую вкладку и возврата чат снова открывается внизу', async function () {
    await openMobileChatFromList(chatUserA.name);
    await waitForMessagesNearBottom(driver, 120, 20000);

    await navigateTo(driver, '/swipe');
    await waitForUrlContains(driver, '/swipe', 10000);

    await navigateTo(driver, `/mailbox/${chatUserAId}`);
    await driver.wait(until.elementLocated(By.css('[data-testid="message-input"]')), 20000);
    await waitForText(driver, By.css('.messages-container'), lastMessageText, 20000);
    await waitForMessagesNearBottom(driver, 120, 20000);
  });

  it('поле ввода доступно после открытия диалога', async function () {
    await openMobileChatFromList(chatUserA.name);
    const inputVisible = await isElementVisible(driver, By.css('[data-testid="message-input"]'));
    assert.ok(inputVisible, 'Поле ввода сообщения должно быть видно в мобильном чате');
  });
});
