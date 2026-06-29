const path = require('path');
const { By, until } = require('selenium-webdriver');
const assert = require('assert');
const {
  USER_A,
  USER_B,
  createDriver,
  quitDriver,
  waitAndClick,
  registerAndVerifyUser,
  registerUserViaApi,
  resolveSeedAdminCredentials,
  verifyUserViaApi,
  loginUser,
  loginViaApi,
  sendMediaMailViaApi,
  waitForText,
  navigateTo,
  getSeedAdminToken,
  makeUser,
} = require('./helpers');

const TEST_PHOTO = path.resolve(__dirname, 'fixtures', 'test-photo.png');
const TEST_PHOTO_BASE64 = require('fs').readFileSync(TEST_PHOTO).toString('base64');

function testUser(template) {
  return makeUser({
    name: template.name,
    password: template.password,
    birthday: template.birthday,
    gender: template.gender,
  });
}

let driverA;
let driverB;
let userAId;
let userBId;

async function setup() {
  driverA = await createDriver();
  driverB = await createDriver();
}

async function teardown() {
  await quitDriver(driverA);
  await quitDriver(driverB);
}

async function openConversation(driver, otherUserId) {
  await navigateTo(driver, `/mailbox/${otherUserId}`);
  await driver.wait(
    until.elementLocated(By.css('.message-input')),
    20000
  );
}

async function uploadPhotoViaBrowser(driver, toUserId, caption) {
  const result = await driver.executeAsyncScript(
    async function (recipientId, base64, captionText, callback) {
      try {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'image/png' });
        const form = new FormData();
        form.append('to', recipientId);
        form.append('mediaType', 'PHOTO');
        form.append('file', blob, 'test-photo.png');
        if (captionText) {
          form.append('message', captionText);
        }
        const resp = await fetch('/api/v1/mailbox/media', {
          method: 'POST',
          body: form,
          credentials: 'include',
        });
        const text = await resp.text();
        callback({ status: resp.status, text });
      } catch (error) {
        callback({ status: 0, text: String(error) });
      }
    },
    toUserId,
    TEST_PHOTO_BASE64,
    caption || ''
  );
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`Browser media upload failed: ${JSON.stringify(result)}`);
  }
}

async function uploadPhotoViaPicker(driver) {
  await waitAndClick(driver, By.css('[data-testid="attach-menu-button"], .attach-btn'));
  await waitAndClick(driver, By.css('[data-testid="attach-photo"]'));
  const fileInput = await driver.wait(
    until.elementLocated(By.css('input[type="file"]')),
    10000
  );
  await driver.executeScript(`
    const input = arguments[0];
    input.style.display = 'block';
    input.style.visibility = 'visible';
    input.style.opacity = '1';
    input.style.position = 'relative';
  `, fileInput);
  await fileInput.sendKeys(TEST_PHOTO);
}

describe('Mailbox media messages', function () {
  this.timeout(120000);

  before(setup);
  after(teardown);

  before(async function () {
    const userA = testUser(USER_A);
    const userB = testUser(USER_B);
    userAId = await registerAndVerifyUser(driverA, userA);
    userBId = await registerUserViaApi(userB);
    await resolveSeedAdminCredentials();
    const adminToken = await getSeedAdminToken();
    await verifyUserViaApi(adminToken, userBId);
    await loginUser(driverB, userB.email, userB.password);
    this.userA = userA;
    this.userB = userB;
  });

  it('User A отправляет фото через вложение', async function () {
    await openConversation(driverA, userBId);
    await uploadPhotoViaBrowser(driverA, userBId, 'E2E фото');
    await driverA.sleep(1500);
    await driverA.wait(
      until.elementLocated(By.css('[data-testid="message-photo"], .message-photo')),
      20000
    );
  });

  it('Меню вложений открывается и принимает файл', async function () {
    await openConversation(driverA, userBId);
    await uploadPhotoViaPicker(driverA);
    await driverA.sleep(3000);
    const photos = await driverA.findElements(By.css('[data-testid="message-photo"], .message-photo'));
    assert.ok(photos.length >= 1, 'После выбора файла фото должно появиться в чате');
  });

  it('User B видит превью фото в списке диалогов', async function () {
    await navigateTo(driverB, '/mailbox');
    await driverB.wait(async () => {
      const body = await driverB.findElement(By.css('body')).getText();
      return body.includes('Фото') || body.includes('E2E фото');
    }, 20000);
  });

  it('User B видит фото в чате', async function () {
    await openConversation(driverB, userAId);
    await driverB.wait(
      until.elementLocated(By.css('[data-testid="message-photo"], .message-photo')),
      20000
    );
  });

  it('API отправка фото с подписью отображается в чате', async function () {
    const tokenB = await loginViaApi(this.userB.email, this.userB.password, false);
    await sendMediaMailViaApi(tokenB, userAId, 'PHOTO', TEST_PHOTO, 'Фото с подписью');

    await openConversation(driverA, userBId);
    await driverA.sleep(2000);
    await driverA.navigate().refresh();
    await driverA.wait(until.elementLocated(By.css('.message-input')), 20000);
    await driverA.wait(async () => {
      const body = await driverA.findElement(By.css('body')).getText();
      return body.includes('Фото с подписью');
    }, 20000);
  });
});
