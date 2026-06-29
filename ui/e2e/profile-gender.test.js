const assert = require('assert');
const { By } = require('selenium-webdriver');
const {
  createDriver,
  quitDriver,
  registerUserViaApi,
  loginUser,
  navigateTo,
  waitForUrlContains,
  waitForText,
  fetchUserMe,
  patchUserProfileViaApi,
  selectProfileGender,
  loginViaApi,
  generateUniqueEmail,
} = require('./helpers');

describe('Смена пола в профиле', function () {
  this.timeout(120000);

  const user = {
    name: 'Gender E2E User',
    email: generateUniqueEmail(),
    password: 'TestPass123',
    birthday: '1995-06-15',
    gender: 'MAN',
  };

  let driver;
  let token;

  before(async function () {
    driver = await createDriver();
    await registerUserViaApi(user);
    token = await loginViaApi(user.email, user.password, false);
    const me = await fetchUserMe(token);
    assert.strictEqual(me.gender, 'MAN', `После регистрации ожидался MAN, получено: ${me.gender}`);
    await loginUser(driver, user.email, user.password);
  });

  after(async function () {
    await quitDriver(driver);
  });

  it('API: PATCH /user/me сохраняет gender', async function () {
    const updated = await patchUserProfileViaApi(token, { gender: 'WOMAN' });
    assert.strictEqual(updated.gender, 'WOMAN', `PATCH response gender: ${updated.gender}`);

    const me = await fetchUserMe(token);
    assert.strictEqual(me.gender, 'WOMAN', `GET /user/me gender после PATCH: ${me.gender}`);

    await patchUserProfileViaApi(token, { gender: 'MAN' });
    const restored = await fetchUserMe(token);
    assert.strictEqual(restored.gender, 'MAN');
  });

  it('UI: смена пола на /profile/me/edit отображается на /profile/me', async function () {
    await navigateTo(driver, '/profile/me/edit');

    await selectProfileGender(driver, 'WOMAN');

    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await driver.executeScript('arguments[0].scrollIntoView({block: "center"});', submitBtn);
    await driver.sleep(300);
    await driver.executeScript('arguments[0].click();', submitBtn);

    await waitForUrlContains(driver, '/profile/me', 15000);
    await waitForText(driver, By.css('body'), 'Женский', 15000);

    const apiToken = await loginViaApi(user.email, user.password, false);
    const me = await fetchUserMe(apiToken);
    assert.strictEqual(
      me.gender,
      'WOMAN',
      `После сохранения в UI API должен вернуть WOMAN, получено: ${me.gender}`
    );
  });
});
