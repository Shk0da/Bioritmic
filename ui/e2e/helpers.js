const { Builder, By, until, Key } = require('selenium-webdriver');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';
const API_URL = process.env.API_URL || 'http://localhost:8080';

async function createDriver() {
  const driver = await new Builder()
    .forBrowser('MicrosoftEdge')
    .setEdgeOptions({
      args: ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=1440,900'],
    })
    .build();
  await driver.manage().setTimeouts({ implicit: 10000, page: 30000 });
  return driver;
}

async function quitDriver(driver) {
  try {
    await driver.quit();
  } catch (e) {}
}

async function waitAndClick(driver, locator, timeout = 10000) {
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  await el.click();
  return el;
}

async function waitAndType(driver, locator, text, timeout = 10000) {
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  await el.clear();
  await el.sendKeys(text);
  return el;
}

async function waitForText(driver, locator, text, timeout = 15000) {
  await driver.wait(async () => {
    try {
      const el = await driver.findElement(locator);
      const t = await el.getText();
      return t.includes(text);
    } catch (e) {
      return false;
    }
  }, timeout);
}

async function waitForUrlContains(driver, fragment, timeout = 15000) {
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return url.includes(fragment);
  }, timeout);
}

async function isElementPresent(driver, locator) {
  try {
    await driver.findElement(locator);
    return true;
  } catch (e) {
    return false;
  }
}

async function getElementText(driver, locator) {
  const el = await driver.findElement(locator);
  return el.getText();
}

function generateUniqueEmail() {
  return `test_user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`;
}

const USER_A = {
  name: 'Тест User A',
  email: generateUniqueEmail(),
  password: 'TestPass123',
  birthday: '1995-06-15',
  gender: 'MAN',
};

const USER_B = {
  name: 'Тест User B',
  email: generateUniqueEmail(),
  password: 'TestPass456',
  birthday: '1998-03-22',
  gender: 'WOMAN',
};

async function registerUser(driver, user) {
  await driver.get(`${BASE_URL}/auth/registration`);
  await driver.wait(until.elementLocated(By.name('name')), 10000);

  await waitAndType(driver, By.name('name'), user.name);
  await waitAndType(driver, By.name('email'), user.email);
  await waitAndType(driver, By.name('password'), user.password);

  const birthdayInput = await driver.findElement(By.name('birthday'));
  await driver.executeScript(
    'arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event("input", {bubbles: true})); arguments[0].dispatchEvent(new Event("change", {bubbles: true}));',
    birthdayInput,
    user.birthday
  );

  const genderSelect = await driver.findElement(By.name('gender'));
  await genderSelect.sendKeys(user.gender === 'MAN' ? 'Мужской' : 'Женский');

  await waitAndClick(driver, By.css('button[type="submit"]'));
  await waitForUrlContains(driver, '/swipe', 15000);
}

async function loginUser(driver, email, password) {
  await driver.get(`${BASE_URL}/auth/login`);
  await driver.wait(until.elementLocated(By.name('email')), 10000);

  await waitAndType(driver, By.name('email'), email);
  await waitAndType(driver, By.name('password'), password);
  await waitAndClick(driver, By.css('button[type="submit"]'));
  await waitForUrlContains(driver, '/swipe', 15000);
}

async function navigateTo(driver, path) {
  await driver.get(`${BASE_URL}${path}`);
  await driver.sleep(1500);
}

async function getUserById(driver, userId) {
  await navigateTo(driver, `/user/${userId}`);
  await driver.wait(async () => {
    const url = await driver.getCurrentUrl();
    return url.includes(`/user/${userId}`);
  }, 10000);
}

async function sendApiRequest(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return resp.json();
}

async function getAuthToken(driver) {
  return driver.executeScript(
    'return localStorage.getItem("bioritmic_token") || localStorage.getItem("access_token");'
  );
}

async function getCurrentUserId(driver) {
  return driver.executeScript(
    'return parseInt(localStorage.getItem("bioritmic_user_id"));'
  );
}

module.exports = {
  BASE_URL,
  API_URL,
  USER_A,
  USER_B,
  createDriver,
  quitDriver,
  waitAndClick,
  waitAndType,
  waitForText,
  waitForUrlContains,
  isElementPresent,
  getElementText,
  generateUniqueEmail,
  registerUser,
  loginUser,
  navigateTo,
  getUserById,
  getAuthToken,
  getCurrentUserId,
  sendApiRequest,
};
