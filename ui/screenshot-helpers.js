const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:2399';
const API_URL = process.env.API_URL || 'http://localhost:6045';

const ADMIN_EMAIL = process.env.SCREENSHOT_ADMIN_EMAIL || 'screenshot-admin@test.com';
const USER_EMAIL = process.env.SCREENSHOT_USER_EMAIL || 'screenshot-user@test.com';
const PASSWORD = process.env.SCREENSHOT_PASSWORD || 'Test123456';

/** Координаты рядом (Санкт-Петербург) — все пользователи в одном радиусе поиска */
const BASE_LAT = 59.983184;
const BASE_LON = 30.218012;

/** Кандидаты для свайпа/поиска (верифицированные, пол MAN — для WOMAN-пользователя screenshot-user) */
const SEED_PROFILES = [
  { name: 'Алексей', email: 'screenshot-match-1@test.com', birthday: '1992-05-10', gender: 'MAN' },
  { name: 'Дмитрий', email: 'screenshot-match-2@test.com', birthday: '1994-08-22', gender: 'MAN' },
  { name: 'Мария', email: 'screenshot-match-3@test.com', birthday: '1996-11-03', gender: 'WOMAN' }
];

const SCREENSHOT_EMAILS = [
  ADMIN_EMAIL,
  USER_EMAIL,
  ...SEED_PROFILES.map((p) => p.email)
];

async function apiRequest(method, apiPath, body, token) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { ok: response.ok, status: response.status, data };
}

async function apiRegister(name, email, birthday = '1995-06-15', gender = 'WOMAN') {
  return apiRequest('POST', '/api/v1/registration', {
    name,
    email,
    password: PASSWORD,
    birthday,
    gender
  });
}

async function apiLogin(email) {
  return apiRequest('POST', '/api/v1/authorization', { email, password: PASSWORD });
}

async function apiVerifyUser(adminToken, userId) {
  return apiRequest('POST', `/api/v1/admin/users/${userId}/verify`, {}, adminToken);
}

async function apiMe(token) {
  return apiRequest('GET', '/api/v1/user/me', null, token);
}

async function apiSaveGis(token, lat, lon) {
  return apiRequest('POST', '/api/v1/user/me/gis', { lat, lon }, token);
}

async function apiSaveSettings(token, settings) {
  return apiRequest('POST', '/api/v1/user/settings', settings, token);
}

async function resolveUserId(email) {
  const login = await apiLogin(email);
  if (!login.ok) {
    throw new Error(`Login failed for ${email}: ${login.status}`);
  }
  const me = await apiMe(login.data.accessToken);
  if (!me.ok || !me.data?.id) {
    throw new Error(`Cannot resolve id for ${email}`);
  }
  return { id: me.data.id, token: login.data.accessToken };
}

function deleteScreenshotUsers() {
  for (const email of SCREENSHOT_EMAILS) {
    try {
      execSync(
        `docker compose exec -T postgres psql -U postgres -d bioritmic -c "DELETE FROM users WHERE email = '${email}';"`,
        { cwd: ROOT_DIR, stdio: 'pipe' }
      );
    } catch {
      // user may not exist
    }
  }
}

function insertPlaceholderPhoto(userId) {
  try {
    execSync(
      `docker compose exec -T postgres psql -U postgres -d bioritmic -c "DELETE FROM user_photos WHERE user_id = '${userId}'; INSERT INTO user_photos (user_id, photo_order, photo_bytes, created_at) VALUES ('${userId}', 0, '\\\\xFFD8FFE0', NOW());"`,
      { cwd: ROOT_DIR, stdio: 'pipe' }
    );
  } catch (err) {
    throw new Error(`Failed to insert placeholder photo for ${userId}: ${err.message}`);
  }
}
  const created = [];

  for (let i = 0; i < SEED_PROFILES.length; i++) {
    const profile = SEED_PROFILES[i];
    const reg = await apiRegister(profile.name, profile.email, profile.birthday, profile.gender);
    if (!reg.ok && reg.status !== 409) {
      throw new Error(`Seed registration failed for ${profile.email}: ${reg.status}`);
    }

    const { id, token } = await resolveUserId(profile.email);
    await apiVerifyUser(adminToken, id);

    const lat = BASE_LAT + (i + 1) * 0.002;
    const lon = BASE_LON + (i + 1) * 0.002;
    const gis = await apiSaveGis(token, lat, lon);
    if (!gis.ok) {
      throw new Error(`GIS save failed for ${profile.email}: ${gis.status}`);
    }

    insertPlaceholderPhoto(id);

    created.push({ id, name: profile.name, email: profile.email });
  }

  return created;
}

async function setupMainUserForSearch(userToken) {
  const gis = await apiSaveGis(userToken, BASE_LAT, BASE_LON);
  if (!gis.ok) {
    throw new Error(`Main user GIS failed: ${gis.status}`);
  }

  const settings = await apiSaveSettings(userToken, {
    gender: 'MAN',
    ageMin: 18,
    ageMax: 45,
    distance: 50
  });
  if (!settings.ok) {
    throw new Error(`Main user settings failed: ${settings.status}`);
  }
}

async function ensureUsersExist() {
  deleteScreenshotUsers();

  const adminReg = await apiRegister('Screenshot Admin', ADMIN_EMAIL, '1990-01-01', 'MAN');
  if (!adminReg.ok && adminReg.status !== 409) {
    throw new Error(`Admin registration failed: ${adminReg.status} ${JSON.stringify(adminReg.data)}`);
  }

  const userReg = await apiRegister('Screenshot User', USER_EMAIL, '1998-03-20', 'WOMAN');
  if (!userReg.ok && userReg.status !== 409) {
    throw new Error(`User registration failed: ${userReg.status} ${JSON.stringify(userReg.data)}`);
  }

  const adminLogin = await apiLogin(ADMIN_EMAIL);
  if (!adminLogin.ok) {
    throw new Error(`Admin login failed: ${adminLogin.status}`);
  }

  const adminToken = adminLogin.data.accessToken;
  const adminMe = await apiMe(adminToken);
  const isAdmin = adminMe.data?.role?.includes('ADMIN');
  if (!isAdmin) {
    throw new Error(
      `Аккаунт ${ADMIN_EMAIL} не является админом. ` +
      `Установите ADMIN_EMAIL=${ADMIN_EMAIL} в .env и перезапустите бэкенд.`
    );
  }

  const { id: userId, token: userToken } = await resolveUserId(USER_EMAIL);
  const seedUsers = await ensureSeedUsers(adminToken);
  await setupMainUserForSearch(userToken);

  return {
    adminToken,
    userId,
    userToken,
    seedUsers
  };
}

async function loginViaUi(page, email) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(800);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(swipe|profile)/, { timeout: 20000 });
  await page.waitForTimeout(1500);
}

async function confirmModal(page) {
  const confirmBtn = page.locator('.modal-footer .btn-confirm, .modal-footer .btn-primary').first();
  await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
  await confirmBtn.click();
  await page.waitForTimeout(800);
}

async function dismissModal(page) {
  const btn = page.locator('.modal-footer button').filter({ hasText: /OK|Готово/ }).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(600);
  }
}

async function verifyUserInAdminUi(page, userEmail) {
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);

  if (page.url().includes('/swipe') && !page.url().includes('/admin')) {
    throw new Error('Нет доступа к админ-панели');
  }

  await page.fill('input[placeholder*="Имя или email"]', userEmail);
  await page.waitForTimeout(1500);

  const row = page.locator('tr', { hasText: userEmail });
  await row.waitFor({ state: 'visible', timeout: 10000 });

  const verifyBtn = row.locator('button[title="Верифицировать"]');
  if (await verifyBtn.count() > 0) {
    await verifyBtn.click();
    await confirmModal(page);
    await page.waitForTimeout(1000);
  }
}

async function waitForSwipeCards(page, timeout = 20000) {
  await page.goto(`${BASE_URL}/swipe`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);
  const viewport = page.viewportSize();
  const isMobile = viewport && viewport.width < 768;
  const selector = isMobile ? '.swipe-card.top-card' : '.profile-card';
  await page.locator(selector).first().waitFor({ state: 'visible', timeout });
}

async function captureMatchFlows(page, seedUsers, screenshotDir) {
  const target = seedUsers[0];
  if (!target) {
    throw new Error('No seed users for match flow');
  }

  await waitForSwipeCards(page);
  await screenshotPage(page, path.join(screenshotDir, 'verified-swipe-with-matches.png'));
  console.log('✓ verified-swipe-with-matches');

  await page.goto(`${BASE_URL}/search`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);
  const searchCard = page.locator('.card .card-title, .profiles-grid .profile-card').first();
  if (await searchCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await screenshotPage(page, path.join(screenshotDir, 'verified-search-results.png'));
    console.log('✓ verified-search-results');
  } else {
    console.log('⚠ verified-search-results — no cards visible');
  }

  await page.goto(`${BASE_URL}/user/${target.id}`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await screenshotPage(page, path.join(screenshotDir, 'verified-user-detail.png'));
  console.log('✓ verified-user-detail');

  const bookmarkBtn = page.locator('.action-bookmark').first();
  if (await bookmarkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bookmarkBtn.click();
    await page.waitForTimeout(1000);
    await screenshotPage(page, path.join(screenshotDir, 'verified-user-detail-bookmarked.png'));
    console.log('✓ verified-user-detail-bookmarked');
  }

  const meetingBtn = page.locator('.action-meeting').first();
  if (await meetingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await meetingBtn.click();
    await page.waitForTimeout(1500);
    await screenshotPage(page, path.join(screenshotDir, 'verified-user-meeting-sent.png'));
    console.log('✓ verified-user-meeting-sent');
    await dismissModal(page);
  }

  const messageBtn = page.locator('.action-message').first();
  if (await messageBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await messageBtn.click();
    await page.waitForURL(/\/mailbox\/conversation\//, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await screenshotPage(page, path.join(screenshotDir, 'verified-user-conversation.png'));
    console.log('✓ verified-user-conversation');
  }

  await page.goto(`${BASE_URL}/bookmarks`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await screenshotPage(page, path.join(screenshotDir, 'verified-bookmarks-with-match.png'));
  console.log('✓ verified-bookmarks-with-match');
}

async function captureMobileMatchFlows(pM, seedUsers, screenshotDir) {
  const target = seedUsers[0];
  await waitForSwipeCards(pM);
  await screenshotPage(pM, path.join(screenshotDir, 'verified-mobile-swipe-matches.png'));
  console.log('✓ verified-mobile-swipe-matches');

  await pM.goto(`${BASE_URL}/user/${target.id}`, { waitUntil: 'load', timeout: 20000 });
  await pM.waitForTimeout(2000);
  await screenshotPage(pM, path.join(screenshotDir, 'verified-mobile-user-detail.png'));
  console.log('✓ verified-mobile-user-detail');

  const bookmarkBtn = pM.locator('.action-bookmark').first();
  if (await bookmarkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await bookmarkBtn.click();
    await pM.waitForTimeout(800);
  }

  const meetingBtn = pM.locator('.action-meeting').first();
  if (await meetingBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await meetingBtn.click();
    await pM.waitForTimeout(1200);
    await dismissModal(pM);
  }

  await pM.locator('.action-message').first().click();
  await pM.waitForURL(/\/mailbox\/conversation\//, { timeout: 15000 }).catch(() => {});
  await pM.waitForTimeout(1200);
  await screenshotPage(pM, path.join(screenshotDir, 'verified-mobile-conversation.png'));
  console.log('✓ verified-mobile-conversation');
}

async function screenshotPage(page, filePath, fullPage = true) {
  await page.screenshot({ path: filePath, fullPage });
}

module.exports = {
  ROOT_DIR,
  BASE_URL,
  API_URL,
  ADMIN_EMAIL,
  USER_EMAIL,
  PASSWORD,
  SEED_PROFILES,
  deleteScreenshotUsers,
  ensureUsersExist,
  ensureSeedUsers,
  setupMainUserForSearch,
  apiVerifyUser,
  loginViaUi,
  verifyUserInAdminUi,
  captureMatchFlows,
  captureMobileMatchFlows,
  confirmModal,
  dismissModal,
  screenshotPage
};
