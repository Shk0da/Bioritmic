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
  navigateTo,
  loginViaApi,
  setUserGisViaApi,
  resolveSeedAdminCredentials,
  verifyUserViaApi,
  getSeedAdminToken,
  makeUser,
  isElementPresent,
} = require('./helpers');

let driver;

function testUser(template) {
  return makeUser({
    name: template.name,
    password: template.password,
    birthday: template.birthday,
    gender: template.gender,
  });
}

async function getTopCardName() {
  const nameEl = await driver.wait(
    until.elementLocated(By.css('.swipe-card.top-card .user-name')),
    15000
  );
  return (await nameEl.getText()).trim();
}

async function dragCardHorizontally(pixels) {
  const card = await driver.findElement(By.css('.swipe-card.top-card'));
  const actions = driver.actions({ async: true, bridge: true });
  await actions
    .move({ origin: card })
    .press()
    .move({ origin: card, x: pixels, y: 0 })
    .release()
    .perform();
  await driver.sleep(400);
}

describe('Swipe page — только кнопки', function () {
  this.timeout(120000);

  before(async function () {
    driver = await createDriver();
    const userA = testUser(USER_A);
    const userB = testUser(USER_B);
    await registerAndVerifyUser(driver, userA);
    const userBId = await registerUserViaApi(userB);
    await resolveSeedAdminCredentials();
    await verifyUserViaApi(await getSeedAdminToken(), userBId);

    const tokenA = await loginViaApi(userA.email, userA.password, false);
    await setUserGisViaApi(tokenA, 55.7558, 37.6173);
    await setUserGisViaApi(await loginViaApi(userB.email, userB.password, false), 55.7560, 37.6175);

    await navigateTo(driver, '/swipe');
    await driver.navigate().refresh();
    await driver.sleep(3000);
    this.hasCards = await isElementPresent(driver, By.css('.swipe-card.top-card'));
  });

  after(async function () {
    await quitDriver(driver);
  });

  it('Смахивание карточки не меняет текущий профиль', async function () {
    if (!this.hasCards) {
      this.skip();
    }
    const nameBefore = await getTopCardName();
    await dragCardHorizontally(180);
    const nameAfterDrag = await getTopCardName();
    assert.strictEqual(
      nameAfterDrag,
      nameBefore,
      'После перетаскивания должна остаться та же карточка'
    );
  });

  it('Кнопка дизлайка переключает карточку', async function () {
    if (!this.hasCards) {
      this.skip();
    }
    const nameBefore = await getTopCardName();
    await waitAndClick(driver, By.css('[data-testid="swipe-dislike"]'));
    await driver.sleep(800);

    const hasNoCards = await driver
      .findElements(By.css('.no-cards'))
      .then((els) => els.length > 0);
    if (hasNoCards) {
      return;
    }

    const nameAfter = await getTopCardName();
    assert.notStrictEqual(
      nameAfter,
      nameBefore,
      'После дизлайка должна показаться другая карточка или список закончиться'
    );
  });

  it('Кнопки управления видны на странице swipe', async function () {
    await navigateTo(driver, '/swipe');
    const dislike = await driver.wait(
      until.elementLocated(By.css('[data-testid="swipe-dislike"]')),
      10000
    );
    assert.ok(await dislike.isDisplayed(), 'Кнопка дизлайка должна быть видна');
    const like = await driver.findElement(By.css('.btn-like'));
    assert.ok(await like.isDisplayed(), 'Кнопка лайка должна быть видна');
  });
});
