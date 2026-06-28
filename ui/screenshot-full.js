const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const {
  ADMIN_EMAIL,
  USER_EMAIL,
  PASSWORD,
  ensureUsersExist,
  loginViaUi,
  verifyUserInAdminUi,
  captureMatchFlows,
  captureMobileMatchFlows,
  screenshotPage
} = require('./screenshot-helpers');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function captureInternalPages(page, prefix, pages) {
  for (const pageName of pages) {
    await page.goto(`http://localhost:2399/${pageName}`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(2000);
    const url = page.url();

    if (url.includes('auth/login')) {
      console.log(`⚠ ${prefix}${pageName} — redirected to login, skipping`);
      continue;
    }
    if (!url.includes(`/${pageName}`)) {
      console.log(`⚠ ${prefix}${pageName} — redirected to ${url}, skipping`);
      continue;
    }

    await screenshotPage(page, path.join(SCREENSHOT_DIR, `${prefix}${pageName}.png`));
    console.log(`✓ ${prefix}${pageName}`);
  }
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('Подготовка тестовых пользователей...');
  const { seedUsers } = await ensureUsersExist();
  console.log(`Создано кандидатов для поиска: ${seedUsers.map((u) => u.name).join(', ')}`);

  const browser = await chromium.launch({ headless: true });

  // ========== АДМИН: ВЕРИФИКАЦИЯ ЧЕРЕЗ UI ==========
  console.log(`\nВход админа (${ADMIN_EMAIL})...`);
  const ctxAdmin = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await ctxAdmin.newPage();
  await loginViaUi(adminPage, ADMIN_EMAIL);
  await screenshotPage(adminPage, path.join(SCREENSHOT_DIR, 'admin-before-verify.png'));
  console.log('✓ admin-before-verify');

  console.log(`Верификация пользователя ${USER_EMAIL} через админ-панель...`);
  await verifyUserInAdminUi(adminPage, USER_EMAIL);
  await screenshotPage(adminPage, path.join(SCREENSHOT_DIR, 'admin-after-verify.png'));
  console.log('✓ admin-after-verify');
  await ctxAdmin.close();

  // ========== ВЕРИФИЦИРОВАННЫЙ ПОЛЬЗОВАТЕЛЬ: DESKTOP ==========
  console.log(`\nВход верифицированного пользователя (${USER_EMAIL})...`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await loginViaUi(page, USER_EMAIL);

  console.log('\n--- Взаимодействие с кандидатами (desktop) ---');
  await captureMatchFlows(page, seedUsers, SCREENSHOT_DIR);

  const pages = ['swipe', 'bookmarks', 'mailbox', 'meetings', 'profile', 'settings'];

  console.log('\n--- Desktop light (verified) ---');
  await captureInternalPages(page, 'verified-', pages);

  console.log('\n--- Desktop dark (verified) ---');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  for (const pageName of pages) {
    await page.goto(`http://localhost:2399/${pageName}`, { waitUntil: 'load', timeout: 20000 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(2000);
    if (!page.url().includes(`/${pageName}`)) {
      console.log(`⚠ verified-dark-${pageName} — redirected to ${page.url()}`);
      continue;
    }
    await screenshotPage(page, path.join(SCREENSHOT_DIR, `verified-dark-${pageName}.png`));
    console.log(`✓ verified-dark-${pageName}`);
  }

  await page.goto('http://localhost:2399/profile', { waitUntil: 'load', timeout: 20000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(1500);
  await page.screenshot({
    clip: { x: 0, y: 0, width: 1440, height: 80 },
    path: path.join(SCREENSHOT_DIR, 'verified-header-light.png')
  });
  console.log('✓ verified-header-light');

  // ========== МОБИЛЬНАЯ ВЕРСИЯ (VERIFIED) ==========
  await ctx.close();
  const ctxM = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const pM = await ctxM.newPage();
  await loginViaUi(pM, USER_EMAIL);

  console.log('\n--- Взаимодействие с кандидатами (mobile) ---');
  await captureMobileMatchFlows(pM, seedUsers, SCREENSHOT_DIR);

  console.log('\n--- Mobile light (verified) ---');
  for (const pageName of ['swipe', 'bookmarks', 'mailbox', 'meetings', 'profile', 'settings']) {
    await pM.goto(`http://localhost:2399/${pageName}`, { waitUntil: 'load', timeout: 20000 });
    await pM.waitForTimeout(2000);
    if (!pM.url().includes('auth/login')) {
      await screenshotPage(pM, path.join(SCREENSHOT_DIR, `verified-mobile-${pageName}-light.png`));
      console.log(`✓ verified-mobile-${pageName}-light`);
    } else {
      console.log(`⚠ verified-mobile-${pageName}-light — login redirect`);
    }
  }

  console.log('\n--- Mobile dark (verified) ---');
  await pM.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  for (const pageName of ['swipe', 'mailbox', 'profile']) {
    await pM.goto(`http://localhost:2399/${pageName}`, { waitUntil: 'load', timeout: 20000 });
    await pM.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await pM.waitForTimeout(2000);
    if (!pM.url().includes('auth/login')) {
      await screenshotPage(pM, path.join(SCREENSHOT_DIR, `verified-mobile-${pageName}-dark.png`));
      console.log(`✓ verified-mobile-${pageName}-dark`);
    }
  }

  await ctxM.close();
  await browser.close();

  console.log(`\nГотово!`);
  console.log(`  Админ:    ${ADMIN_EMAIL}`);
  console.log(`  Пользователь: ${USER_EMAIL}`);
  console.log(`  Пароль:   ${PASSWORD}`);
  console.log(`  Скриншоты: ${SCREENSHOT_DIR}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
