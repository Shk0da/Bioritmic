const { By, until } = require('selenium-webdriver');
const assert = require('assert');
const {
  createDriver,
  quitDriver,
  waitAndClick,
  waitForText,
  navigateTo,
  confirmAppModal,
  registerAndVerifyUser,
  registerUserViaApi,
  verifyUserViaApi,
  loginViaApi,
  loginUser,
  clearSession,
  resolveSeedAdminCredentials,
  getSeedAdminToken,
  bookmarkUserViaApi,
  createMeetingViaApi,
  getMeetingsViaApi,
  acceptMeetingViaApi,
  declineMeetingViaApi,
  deleteMeetingViaApi,
  hasSentMeetingViaApi,
  getMeetingsBadgeViaApi,
  makeUser,
} = require('./helpers');

const SENDER = makeUser({
  name: 'E2E Meetings Sender',
  password: 'TestPass123',
  birthday: '1995-06-15',
  gender: 'MAN',
});

const RECIPIENT = makeUser({
  name: 'E2E Meetings Recipient',
  password: 'TestPass456',
  birthday: '1998-03-22',
  gender: 'WOMAN',
});

describe('Встречи: API пути', function () {
  this.timeout(120000);

  let senderId;
  let recipientId;
  let senderToken;
  let recipientToken;

  before(async function () {
    await resolveSeedAdminCredentials();
    senderId = await registerUserViaApi(SENDER);
    await verifyUserViaApi(await getSeedAdminToken(), senderId);
    senderToken = await loginViaApi(SENDER.email, SENDER.password, false);

    recipientId = await registerUserViaApi(RECIPIENT);
    await verifyUserViaApi(await getSeedAdminToken(), recipientId);
    recipientToken = await loginViaApi(RECIPIENT.email, RECIPIENT.password, false);
  });

  it('GET /meetings — пустой список у нового пользователя', async function () {
    const meetings = await getMeetingsViaApi(senderToken);
    assert.deepStrictEqual(meetings, []);
  });

  it('GET /meetings/{userId}/sent — false до отправки, true после', async function () {
    const before = await hasSentMeetingViaApi(senderToken, recipientId);
    assert.strictEqual(before.sent, false);

    await createMeetingViaApi(senderToken, recipientId);

    const after = await hasSentMeetingViaApi(senderToken, recipientId);
    assert.strictEqual(after.sent, true);
  });

  it('GET /meetings/badge — считает входящие встречи', async function () {
    const sinceBefore = Date.now() - 1_000;
    await createMeetingViaApi(senderToken, recipientId);
    const badge = await getMeetingsBadgeViaApi(recipientToken, sinceBefore);
    assert.ok(badge.count >= 1, 'После отправки badge должен быть >= 1');
  });

  it('PUT /meetings/{userId}/accept — принятие встречи', async function () {
    await createMeetingViaApi(senderToken, recipientId);
    const result = await acceptMeetingViaApi(recipientToken, senderId);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'ACCEPTED');

    const meetings = await getMeetingsViaApi(recipientToken);
    const accepted = meetings.find((meeting) => meeting.userId === senderId);
    assert.ok(accepted, 'Принятая встреча должна быть в списке получателя');
    assert.strictEqual(accepted.status, 'ACCEPTED');
    assert.strictEqual(accepted.outgoing, false);
  });

  it('PUT /meetings/{userId}/decline — отмена принятой встречи получателем', async function () {
    await createMeetingViaApi(senderToken, recipientId);
    await acceptMeetingViaApi(recipientToken, senderId);

    const result = await declineMeetingViaApi(recipientToken, senderId);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'DECLINED');

    const meetings = await getMeetingsViaApi(recipientToken);
    const declined = meetings.find((meeting) => meeting.userId === senderId);
    assert.strictEqual(declined, undefined, 'Отклонённая встреча не должна отображаться');
  });

  it('POST + DELETE /meetings/{userId} — отправка и отзыв отправителем', async function () {
    await createMeetingViaApi(senderToken, recipientId);

    const sentCheck = await hasSentMeetingViaApi(senderToken, recipientId);
    assert.strictEqual(sentCheck.sent, true);

    await deleteMeetingViaApi(senderToken, recipientId);

    const afterRevoke = await hasSentMeetingViaApi(senderToken, recipientId);
    assert.strictEqual(afterRevoke.sent, false);

    const recipientMeetings = await getMeetingsViaApi(recipientToken);
    assert.strictEqual(
      recipientMeetings.find((meeting) => meeting.userId === senderId),
      undefined
    );
  });
});

describe('Встречи: UI пути', function () {
  this.timeout(120000);

  const uiSender = makeUser({
    name: 'E2E Meetings UI Sender',
    password: 'TestPass123',
    birthday: '1995-06-15',
    gender: 'MAN',
  });

  const uiRecipient = makeUser({
    name: 'E2E Meetings UI Recipient',
    password: 'TestPass456',
    birthday: '1998-03-22',
    gender: 'WOMAN',
  });

  let driver;
  let uiSenderId;
  let uiRecipientId;
  let uiSenderToken;

  before(async function () {
    driver = await createDriver();
    await resolveSeedAdminCredentials();
    uiSenderId = await registerAndVerifyUser(driver, uiSender);
    uiSenderToken = await loginViaApi(uiSender.email, uiSender.password, false);
    uiRecipientId = await registerUserViaApi(uiRecipient);
    await verifyUserViaApi(await getSeedAdminToken(), uiRecipientId);
    await bookmarkUserViaApi(uiSenderToken, uiRecipientId);
  });

  after(async function () {
    await quitDriver(driver);
  });

  beforeEach(async function () {
    await clearSession(driver);
    await loginUser(driver, uiRecipient.email, uiRecipient.password);
  });

  async function senderCreatesMeeting() {
    await createMeetingViaApi(uiSenderToken, uiRecipientId);
  }

  it('страница /meetings показывает входящее предложение', async function () {
    await senderCreatesMeeting();
    await navigateTo(driver, '/meetings');
    await waitForText(driver, By.css('body'), uiSender.name, 15000);
    await waitForText(driver, By.css('body'), 'Ожидает ответа', 10000);
  });

  it('кнопка «Принять» принимает встречу', async function () {
    await senderCreatesMeeting();
    await navigateTo(driver, '/meetings');
    await waitAndClick(driver, By.css('[data-testid="meetings-accept-button"]'));
    await waitForText(driver, By.css('body'), 'Встреча подтверждена', 15000);
  });

  it('кнопка «Отказаться» отклоняет встречу', async function () {
    await senderCreatesMeeting();
    await navigateTo(driver, '/meetings');
    await waitAndClick(driver, By.css('[data-testid="meetings-decline-button"]'));
    await confirmAppModal(driver);
    await driver.sleep(1000);
    const bodyText = await driver.findElement(By.css('body')).getText();
    assert.ok(
      !bodyText.includes('Ожидает ответа') || bodyText.includes('Новых предложений'),
      'После отказа не должно остаться ожидающих предложений'
    );
  });
});

describe('Встречи: UI отправитель', function () {
  this.timeout(120000);

  const sender = makeUser({
    name: 'E2E Meetings UI Revoke Sender',
    password: 'TestPass123',
    birthday: '1995-06-15',
    gender: 'MAN',
  });

  const recipient = makeUser({
    name: 'E2E Meetings UI Revoke Recipient',
    password: 'TestPass456',
    birthday: '1998-03-22',
    gender: 'WOMAN',
  });

  let driver;
  let senderToken;
  let recipientId;

  before(async function () {
    driver = await createDriver();
    await resolveSeedAdminCredentials();
    const senderId = await registerAndVerifyUser(driver, sender);
    senderToken = await loginViaApi(sender.email, sender.password, false);
    recipientId = await registerUserViaApi(recipient);
    await verifyUserViaApi(await getSeedAdminToken(), recipientId);
    await createMeetingViaApi(senderToken, recipientId);
  });

  after(async function () {
    await quitDriver(driver);
  });

  it('отправитель видит исходящую встречу и может отозвать', async function () {
    await clearSession(driver);
    await loginUser(driver, sender.email, sender.password);
    await navigateTo(driver, '/meetings');
    await waitForText(driver, By.css('body'), recipient.name, 15000);
    await waitForText(driver, By.css('body'), 'Ожидаем ответа', 10000);
    await waitAndClick(driver, By.css('[data-testid="meetings-revoke-button"]'));
    await confirmAppModal(driver);
    await driver.sleep(1500);
    const bodyText = await driver.findElement(By.css('body')).getText();
    assert.ok(
      bodyText.includes('Новых предложений') || !bodyText.includes(recipient.name),
      'После отзыва встреча не должна отображаться у отправителя'
    );
  });
});
