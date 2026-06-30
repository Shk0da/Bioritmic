const assert = require('assert');
const { execFileSync } = require('child_process');
const { Builder, By, until, Key } = require('selenium-webdriver');

const BASE_URL = process.env.BASE_URL || 'http://localhost:2399';
const API_URL = process.env.API_URL || 'http://localhost:6045';

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

async function createMobileDriver() {
  const driver = await new Builder()
    .forBrowser('MicrosoftEdge')
    .setEdgeOptions({
      args: ['--headless', '--disable-gpu', '--no-sandbox', '--window-size=390,844'],
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

async function isElementVisible(driver, locator) {
  try {
    const el = await driver.findElement(locator);
    return await el.isDisplayed();
  } catch (e) {
    return false;
  }
}

async function getMessagesScrollState(driver) {
  return driver.executeScript(`
    const el = document.querySelector('[data-testid="messages-container"]');
    if (!el) return null;
    return {
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight,
    };
  `);
}

async function waitForMessagesNearBottom(driver, tolerance = 96, timeout = 20000) {
  await driver.wait(async () => {
    const state = await getMessagesScrollState(driver);
    return Boolean(state && state.distanceFromBottom <= tolerance);
  }, timeout);
}

async function sendMailViaApi(token, toUserId, message) {
  const resp = await fetch(`${API_URL}/api/v1/mailbox`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: toUserId, message }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`sendMailViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
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
  return driver.executeScript(`
    try {
      const raw = localStorage.getItem('current_user');
      if (!raw) return null;
      const user = JSON.parse(raw);
      return user.id || null;
    } catch (e) {
      return null;
    }
  `);
}

async function getBodyText(driver) {
  return driver.findElement(By.css('body')).getText();
}

async function assertNoRawJsonError(driver) {
  const bodyText = await getBodyText(driver);
  assert.ok(
    !bodyText.includes('{"errors"'),
    'Страница не должна показывать сырой JSON с ошибками'
  );
  assert.ok(
    !bodyText.includes('"errorCode"'),
    'Страница не должна показывать errorCode в JSON'
  );
}

/**
 * Opens a route and checks URL + optional visible text. Fails if raw API JSON is shown.
 */
async function assertRouteAccessible(driver, path, options = {}) {
  const {
    expectedUrlIncludes = path,
    expectedText,
    forbiddenUrlIncludes = [],
  } = options;

  await navigateTo(driver, path);
  const url = await driver.getCurrentUrl();
  assert.ok(
    url.includes(expectedUrlIncludes),
    `Ожидался URL с "${expectedUrlIncludes}", получен: ${url}`
  );
  for (const forbidden of forbiddenUrlIncludes) {
    assert.ok(!url.includes(forbidden), `URL не должен содержать "${forbidden}", получен: ${url}`);
  }
  await assertNoRawJsonError(driver);
  if (expectedText) {
    const bodyText = await getBodyText(driver);
    assert.ok(
      bodyText.includes(expectedText),
      `На странице "${path}" ожидался текст "${expectedText}"`
    );
  }
}

const SEED_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bioritmic.test',
  password: process.env.E2E_ADMIN_PASSWORD || 'Test123456',
  id: 'a0000000-0000-0000-0000-00000000e2e0',
};

const SEED_PASSWORDS = [
  process.env.E2E_ADMIN_PASSWORD,
  'Test123456',
  'Test12345',
].filter(Boolean);

let cachedSeedAdminToken = null;
let cachedSeedAdminCredentials = null;

const SEED_PASSWORD_HASH = '$2a$10$u8FDeghIngUoihQVztHuh.3LMxESSdbrsTBGrJniDHuDrZwerkSaK';

function ensureE2eAdminInDatabase() {
  const email = SEED_ADMIN.email.replace(/'/g, "''");
  const hash = SEED_PASSWORD_HASH.replace(/'/g, "''");
  const adminId = SEED_ADMIN.id.replace(/'/g, "''");
  const sql = `
INSERT INTO users (id, name, email, password, birthday, gender, register_date, is_verified, failed_login_attempts)
VALUES ('${adminId}', 'E2E Admin', '${email}', '${hash}', '1990-01-01 00:00:00', 0, NOW(), true, 0)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  locked_until = NULL,
  failed_login_attempts = 0,
  is_verified = true;
INSERT INTO user_roles (user_id, role)
SELECT u.id, 'ROLE_ADMIN'
FROM users u
WHERE u.email = '${email}'
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role = 'ROLE_ADMIN'
  );
`;
  const attempts = [
    {
      command: 'docker',
      args: ['exec', 'bioritmic-postgres', 'psql', '-U', 'postgres', '-d', 'bioritmic', '-c', sql],
    },
    {
      command: 'psql',
      args: [
        '-h', 'localhost',
        '-p', String(process.env.POSTGRES_PORT || 5433),
        '-U', 'postgres',
        '-d', 'bioritmic',
        '-c', sql,
      ],
      env: { ...process.env, PGPASSWORD: 'postgres' },
    },
  ];

  for (const attempt of attempts) {
    try {
      execFileSync(attempt.command, attempt.args, {
        stdio: 'pipe',
        timeout: 10000,
        env: attempt.env || process.env,
      });
      return true;
    } catch (_) {
      // try next method
    }
  }
  return false;
}

function resetSeedAdminLockout() {
  ensureE2eAdminInDatabase();
  const email = SEED_ADMIN.email.replace(/'/g, "''");
  const hash = SEED_PASSWORD_HASH.replace(/'/g, "''");
  const sql = `UPDATE users SET password = '${hash}', locked_until = NULL, failed_login_attempts = 0, is_verified = true WHERE email = '${email}';`;
  const attempts = [
    {
      command: 'docker',
      args: ['exec', 'bioritmic-postgres', 'psql', '-U', 'postgres', '-d', 'bioritmic', '-c', sql],
    },
    {
      command: 'psql',
      args: [
        '-h', 'localhost',
        '-p', String(process.env.POSTGRES_PORT || 5433),
        '-U', 'postgres',
        '-d', 'bioritmic',
        '-c', sql,
      ],
      env: { ...process.env, PGPASSWORD: 'postgres' },
    },
  ];

  for (const attempt of attempts) {
    try {
      execFileSync(attempt.command, attempt.args, {
        stdio: 'pipe',
        timeout: 10000,
        env: attempt.env || process.env,
      });
      return true;
    } catch (_) {
      // try next method
    }
  }
  return false;
}

async function loginViaApi(email, password, retryOnLockout = true, rateLimitRetries = 0) {
  const resp = await fetch(`${API_URL}/api/v1/authorization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (resp.status === 429 && rateLimitRetries < 5) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return loginViaApi(email, password, retryOnLockout, rateLimitRetries + 1);
  }
  if (resp.status === 423 && retryOnLockout && email === SEED_ADMIN.email) {
    resetSeedAdminLockout();
    return loginViaApi(email, password, false);
  }
  if (!resp.ok) {
    throw new Error(`API login failed: ${resp.status}`);
  }
  const data = await resp.json();
  return data.accessToken;
}

async function verifyUserViaApi(adminToken, userId) {
  const resp = await fetch(`${API_URL}/api/v1/admin/users/${userId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: '{}',
  });
  if (!resp.ok) {
    throw new Error(`Verify user failed: ${resp.status} for user ${userId}`);
  }
}

async function dismissOpenModals(driver) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const overlays = await driver.findElements(By.css('.modal-overlay'));
    if (overlays.length === 0) {
      return;
    }
    const buttons = await driver.findElements(
      By.css('.modal-overlay button.btn-primary, .modal-overlay button.btn-secondary, .modal-overlay button.btn-close')
    );
    if (buttons.length > 0) {
      try {
        await buttons[0].click();
      } catch (_) {
        await driver.actions().sendKeys(Key.ESCAPE).perform();
      }
    } else {
      await driver.actions().sendKeys(Key.ESCAPE).perform();
    }
    await driver.sleep(300);
  }
}

async function clickHeaderNav(driver, title) {
  await waitAndClick(driver, By.css(`a.nav-btn[title="${title}"]`));
  await driver.sleep(1000);
}

async function resolveSeedAdminCredentials() {
  if (cachedSeedAdminCredentials) {
    return cachedSeedAdminCredentials;
  }

  resetSeedAdminLockout();

  const email = process.env.E2E_ADMIN_EMAIL || SEED_ADMIN.email;
  for (const password of SEED_PASSWORDS) {
    try {
      const token = await loginViaApi(email, password);
      cachedSeedAdminCredentials = { email, password, token };
      cachedSeedAdminToken = token;
      return cachedSeedAdminCredentials;
    } catch (_) {
      // try next credential
    }
  }

  throw new Error(
    'Seed admin login failed. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD or ensure develop seed users exist.'
  );
}

async function loginSeedAdmin(driver) {
  const credentials = await resolveSeedAdminCredentials();
  resetSeedAdminLockout();
  await clearSession(driver);
  try {
    await loginUser(driver, credentials.email, credentials.password);
  } catch (error) {
    resetSeedAdminLockout();
    await loginUser(driver, credentials.email, credentials.password);
  }
}

async function getAccessTokenFromCookies(driver) {
  const cookies = await driver.manage().getCookies();
  const access = cookies.find((cookie) => cookie.name === 'access_token');
  return access?.value || null;
}

async function getSeedAdminToken(driver = null) {
  if (cachedSeedAdminToken) {
    return cachedSeedAdminToken;
  }
  if (driver) {
    const cookieToken = await getAccessTokenFromCookies(driver);
    if (cookieToken) {
      cachedSeedAdminToken = cookieToken;
      return cachedSeedAdminToken;
    }
  }
  const credentials = await resolveSeedAdminCredentials();
  return credentials.token;
}

async function grantAdminRole(adminToken, userId) {
  const resp = await fetch(`${API_URL}/api/v1/admin/users/${userId}/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ role: 'ADMIN' }),
  });
  if (!resp.ok) {
    throw new Error(`Grant admin role failed: ${resp.status}`);
  }
}

function makeUser(overrides = {}) {
  return {
    name: 'Тест User',
    email: generateUniqueEmail(),
    password: 'TestPass123',
    birthday: '1995-06-15',
    gender: 'MAN',
    ...overrides,
  };
}

async function loginAsAdmin(driver) {
  await loginSeedAdmin(driver);
}

async function clearSession(driver) {
  await driver.get(BASE_URL);
  await driver.manage().deleteAllCookies();
  await driver.executeScript('try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}');
}

async function registerUserViaApi(user) {
  const resp = await fetch(`${API_URL}/api/v1/registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: user.name,
      email: user.email,
      password: user.password,
      birthday: user.birthday,
      gender: user.gender,
    }),
  });
  if (!resp.ok) {
    throw new Error(`API registration failed: ${resp.status}`);
  }
  const data = await resp.json();
  if (!data.id) {
    throw new Error('API registration response missing user id');
  }
  return data.id;
}

async function waitForCurrentUserId(driver, timeout = 15000) {
  await driver.wait(async () => {
    const id = await getCurrentUserId(driver);
    return Boolean(id);
  }, timeout);
  return getCurrentUserId(driver);
}

async function fetchUserMe(token) {
  const resp = await fetch(`${API_URL}/api/v1/user/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) {
    throw new Error(`Fetch /user/me failed: ${resp.status}`);
  }
  return resp.json();
}

async function patchUserProfileViaApi(token, body) {
  const resp = await fetch(`${API_URL}/api/v1/user/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PATCH /user/me failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

/** Profile edit form: MAN = Мужской, WOMAN = Женский */
async function selectProfileGender(driver, gender) {
  const select = await driver.wait(until.elementLocated(By.name('gender')), 10000);
  const label = gender === 'WOMAN' ? 'Женский' : 'Мужской';
  await driver.executeScript(
    `
      const select = arguments[0];
      const label = arguments[1];
      const option = Array.from(select.options).find((item) => item.text.trim() === label);
      if (!option) {
        throw new Error('Gender option not found: ' + label);
      }
      select.value = option.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    `,
    select,
    label
  );
}

async function setUserGisViaApi(token, lat = 55.7558, lon = 37.6173) {
  const resp = await fetch(`${API_URL}/api/v1/user/me/gis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lat, lon }),
  });
  if (!resp.ok) {
    throw new Error(`setUserGisViaApi failed: ${resp.status}`);
  }
  return resp.json();
}

async function sendMediaMailViaApi(token, toUserId, mediaType, filePath, caption) {
  const fs = require('fs');
  const path = require('path');
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append('to', toUserId);
  form.append('mediaType', mediaType);
  form.append('file', new Blob([buffer], { type: mime }), path.basename(filePath));
  if (caption) {
    form.append('message', caption);
  }

  const resp = await fetch(`${API_URL}/api/v1/mailbox/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`sendMediaMailViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

const E2E_TEST_PHOTO = require('path').resolve(__dirname, 'fixtures', 'test-photo.png');
const E2E_TEST_PHOTO_JPEG = require('path').resolve(__dirname, 'fixtures', 'test-photo.jpg');

function buildImageFormData(filePath, fieldName = 'file') {
  const fs = require('fs');
  const path = require('path');
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append(fieldName, new Blob([buffer], { type: mime }), path.basename(filePath));
  return form;
}

function isLikelyImageBuffer(buffer) {
  const arr = new Uint8Array(buffer);
  if (arr.length < 4) {
    return false;
  }
  const isJpeg = arr[0] === 0xff && arr[1] === 0xd8;
  const isPng = arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47;
  return isJpeg || isPng;
}

function extractS3KeyFromMediaUrl(mediaUrl) {
  if (!mediaUrl) {
    return null;
  }
  const prefix = '/api/v1/photos/s3/';
  const idx = mediaUrl.indexOf(prefix);
  if (idx === -1) {
    return null;
  }
  return mediaUrl.substring(idx + prefix.length);
}

async function uploadProfilePhotoViaApi(token, filePath = E2E_TEST_PHOTO) {
  const resp = await fetch(`${API_URL}/api/v1/user/me/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: buildImageFormData(filePath),
  });
  if (resp.status !== 202 && resp.status !== 200) {
    const text = await resp.text();
    throw new Error(`uploadProfilePhotoViaApi failed: ${resp.status} ${text}`);
  }
}

async function deleteProfilePhotoViaApi(token) {
  const resp = await fetch(`${API_URL}/api/v1/user/me/photo`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status !== 204 && resp.status !== 200) {
    const text = await resp.text();
    throw new Error(`deleteProfilePhotoViaApi failed: ${resp.status} ${text}`);
  }
}

async function fetchProfilePhoto(userId, token = null) {
  const url = userId
    ? `${API_URL}/api/v1/user/${userId}/photo`
    : `${API_URL}/api/v1/user/me/photo`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const resp = await fetch(url, { headers });
  const buffer = await resp.arrayBuffer();
  return {
    status: resp.status,
    buffer,
    contentType: resp.headers.get('content-type'),
  };
}

async function getUserPhotosViaApi(token, userId) {
  const resp = await fetch(`${API_URL}/api/v1/user/${userId}/photos`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`getUserPhotosViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function fetchS3Media(token, s3Key) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const resp = await fetch(`${API_URL}/api/v1/photos/s3/${s3Key}`, { headers });
  const buffer = await resp.arrayBuffer();
  return { status: resp.status, buffer };
}

async function createStoryViaApi(token, filePath = E2E_TEST_PHOTO, caption = null) {
  const form = buildImageFormData(filePath);
  if (caption) {
    form.append('caption', caption);
  }
  const resp = await fetch(`${API_URL}/api/v1/stories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`createStoryViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function deleteStoryViaApi(token, storyId) {
  const resp = await fetch(`${API_URL}/api/v1/stories/${storyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`deleteStoryViaApi failed: ${resp.status} ${text}`);
  }
}

async function bookmarkUserViaApi(token, otherUserId) {
  const resp = await fetch(`${API_URL}/api/v1/bookmarks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify([{ userId: otherUserId }]),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`bookmarkUserViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function getMailboxConversationViaApi(token, otherUserId) {
  const resp = await fetch(`${API_URL}/api/v1/mailbox/conversation/${otherUserId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`getMailboxConversationViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function uploadProfilePhotoViaBrowser(driver, filePath = E2E_TEST_PHOTO) {
  const fs = require('fs');
  const base64 = fs.readFileSync(filePath).toString('base64');
  const ext = require('path').extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  const filename = require('path').basename(filePath);

  const result = await driver.executeAsyncScript(
    async function (payload, callback) {
      try {
        const bytes = Uint8Array.from(atob(payload.base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: payload.mime });
        const form = new FormData();
        form.append('file', blob, payload.filename);
        const resp = await fetch('/api/v1/user/me/photo', {
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
    { base64, mime, filename }
  );

  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`uploadProfilePhotoViaBrowser failed: ${JSON.stringify(result)}`);
  }
}

async function openProfilePhotoCropModal(driver, filePath = E2E_TEST_PHOTO_JPEG) {
  await navigateTo(driver, '/profile/me/edit');
  const fileInput = await driver.wait(until.elementLocated(By.css('#photoUpload')), 10000);
  await driver.executeScript(`
    const input = arguments[0];
    input.style.display = 'block';
    input.style.visibility = 'visible';
    input.style.opacity = '1';
    input.style.position = 'relative';
  `, fileInput);
  await fileInput.sendKeys(filePath);
  await driver.wait(until.elementLocated(By.css('.crop-overlay')), 10000);
}

async function uploadProfilePhotoViaUi(driver, filePath = E2E_TEST_PHOTO_JPEG) {
  await openProfilePhotoCropModal(driver, filePath);
  await waitAndClick(driver, By.xpath("//button[contains(normalize-space(.), 'Применить')]"));
  await driver.sleep(500);
  const submitBtn = await driver.wait(until.elementLocated(By.css('button[type="submit"]')), 10000);
  await driver.executeScript('arguments[0].scrollIntoView({block: "center"});', submitBtn);
  await driver.sleep(200);
  await driver.executeScript('arguments[0].click();', submitBtn);
  await waitForUrlContains(driver, '/profile/me', 20000);
}

async function deleteProfilePhotoViaUi(driver) {
  await navigateTo(driver, '/profile/me/edit');
  await driver.executeScript('window.confirm = () => true;');
  const deleteBtn = await driver.wait(
    until.elementLocated(By.xpath("//button[contains(normalize-space(.), 'Удалить фото')]")),
    10000
  );
  await driver.executeScript('arguments[0].click();', deleteBtn);
  await driver.sleep(1500);
}

async function waitForProfileImageLoaded(driver, selector = '.profile-avatar') {
  await driver.wait(async () => {
    try {
      const img = await driver.findElement(By.css(selector));
      const src = await img.getAttribute('src');
      if (!src || src.startsWith('data:')) {
        return true;
      }
      const complete = await driver.executeScript('return arguments[0].complete && arguments[0].naturalWidth > 0;', img);
      return Boolean(complete);
    } catch (_) {
      return false;
    }
  }, 20000);
}

async function waitForHeroPhotoBackground(driver) {
  await driver.wait(async () => {
    try {
      const hero = await driver.findElement(By.css('.hero-photo'));
      const bg = await hero.getCssValue('background-image');
      return Boolean(bg && bg !== 'none' && bg.includes('url'));
    } catch (_) {
      return false;
    }
  }, 20000);
}

async function confirmAppModal(driver, timeout = 5000) {
  const confirmBtn = await driver.wait(
    until.elementLocated(By.css('.modal-overlay .btn-confirm, .modal-overlay .btn-primary')),
    timeout
  );
  await confirmBtn.click();
  await driver.sleep(300);
}

async function registerAndVerifyUser(driver, user) {
  await resolveSeedAdminCredentials();
  await clearSession(driver);
  await registerUserViaApi(user);
  const userToken = await loginViaApi(user.email, user.password, false);
  const me = await fetchUserMe(userToken);
  if (!me.id) {
    throw new Error('Registered user id is missing in /user/me response');
  }
  await verifyUserViaApi(cachedSeedAdminToken, me.id);
  await loginUser(driver, user.email, user.password);
  return me.id;
}

function toDatetimeLocalValue(date) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

function buildMeetingPayload(toUserId, overrides = {}) {
  const scheduledAt = new Date(Date.now() + 86_400_000).toISOString();
  return {
    userId: toUserId,
    lat: 55.75,
    lon: 37.61,
    distance: 10,
    description: 'E2E test meeting',
    scheduledAt,
    ...overrides,
  };
}

async function createMeetingViaApi(token, toUserId, overrides = {}) {
  const resp = await fetch(`${API_URL}/api/v1/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify([buildMeetingPayload(toUserId, overrides)]),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`createMeetingViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function getMeetingsViaApi(token, page = 0, size = 10) {
  const resp = await fetch(`${API_URL}/api/v1/meetings?page=${page}&size=${size}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`getMeetingsViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function acceptMeetingViaApi(token, senderUserId) {
  const resp = await fetch(`${API_URL}/api/v1/meetings/${senderUserId}/accept`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`acceptMeetingViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function declineMeetingViaApi(token, senderUserId) {
  const resp = await fetch(`${API_URL}/api/v1/meetings/${senderUserId}/decline`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`declineMeetingViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function deleteMeetingViaApi(token, otherUserId) {
  const resp = await fetch(`${API_URL}/api/v1/meetings/${otherUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`deleteMeetingViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function hasSentMeetingViaApi(token, otherUserId) {
  const resp = await fetch(`${API_URL}/api/v1/meetings/${otherUserId}/sent`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`hasSentMeetingViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function getMeetingsBadgeViaApi(token, sinceMs = 0) {
  const resp = await fetch(`${API_URL}/api/v1/meetings/badge?since=${sinceMs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`getMeetingsBadgeViaApi failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

module.exports = {
  BASE_URL,
  API_URL,
  USER_A,
  USER_B,
  SEED_ADMIN,
  createDriver,
  createMobileDriver,
  quitDriver,
  waitAndClick,
  waitAndType,
  waitForText,
  waitForUrlContains,
  isElementPresent,
  isElementVisible,
  getMessagesScrollState,
  waitForMessagesNearBottom,
  getElementText,
  getBodyText,
  assertNoRawJsonError,
  assertRouteAccessible,
  generateUniqueEmail,
  registerUser,
  registerUserViaApi,
  registerAndVerifyUser,
  dismissOpenModals,
  confirmAppModal,
  clearSession,
  loginUser,
  loginViaApi,
  resolveSeedAdminCredentials,
  getSeedAdminToken,
  verifyUserViaApi,
  grantAdminRole,
  loginAsAdmin,
  loginSeedAdmin,
  getAccessTokenFromCookies,
  makeUser,
  fetchUserMe,
  patchUserProfileViaApi,
  selectProfileGender,
  setUserGisViaApi,
  sendMediaMailViaApi,
  sendMailViaApi,
  E2E_TEST_PHOTO,
  E2E_TEST_PHOTO_JPEG,
  buildImageFormData,
  isLikelyImageBuffer,
  extractS3KeyFromMediaUrl,
  uploadProfilePhotoViaApi,
  deleteProfilePhotoViaApi,
  fetchProfilePhoto,
  getUserPhotosViaApi,
  fetchS3Media,
  createStoryViaApi,
  deleteStoryViaApi,
  bookmarkUserViaApi,
  getMailboxConversationViaApi,
  uploadProfilePhotoViaBrowser,
  openProfilePhotoCropModal,
  uploadProfilePhotoViaUi,
  deleteProfilePhotoViaUi,
  waitForProfileImageLoaded,
  waitForHeroPhotoBackground,
  navigateTo,
  getUserById,
  getAuthToken,
  getCurrentUserId,
  sendApiRequest,
  clickHeaderNav,
  toDatetimeLocalValue,
  buildMeetingPayload,
  createMeetingViaApi,
  getMeetingsViaApi,
  acceptMeetingViaApi,
  declineMeetingViaApi,
  deleteMeetingViaApi,
  hasSentMeetingViaApi,
  getMeetingsBadgeViaApi,
};
