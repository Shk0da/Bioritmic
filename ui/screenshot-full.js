const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const EMAIL = `user${Date.now()}@test.com`;
const PASSWORD = 'Test123456';

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  console.log(`Registration: ${EMAIL}`);

  // ========== РЕГИСТРАЦИЯ ==========
  await page.goto('http://localhost:4200/auth/registration', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Светлая тема — страница регистрации
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'reg-01-form-light.png'), fullPage: true });
  console.log('✓ reg-01-form-light');

  await page.fill('input[name="name"]', 'Тестовый Пользователь');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.waitForTimeout(300);

  // Скриншот заполненной формы
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'reg-02-filled-light.png'), fullPage: true });
  console.log('✓ reg-02-filled-light');

  // Тёмная тема — страница регистрации
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'reg-03-form-dark.png'), fullPage: true });
  console.log('✓ reg-03-form-dark');

  // Вернуть светлую и отправить форму
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('bioritmic_theme', 'light');
  });
  await page.waitForTimeout(300);

  const registerBtn = page.locator('button[type="submit"]');
  await registerBtn.click();
  await page.waitForTimeout(3000);

  const afterRegUrl = page.url();
  console.log('After registration URL:', afterRegUrl);

  // ========== ВХОД ==========
  await page.goto('http://localhost:4200/auth/login', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-01-empty-light.png'), fullPage: true });
  console.log('✓ login-01-empty-light');

  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-02-filled-light.png'), fullPage: true });
  console.log('✓ login-02-filled-light');

  // Тёмная тема — логин
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-03-dark.png'), fullPage: true });
  console.log('✓ login-03-dark');

  // Вернуть светлую и войти
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('bioritmic_theme', 'light');
  });
  await page.waitForTimeout(300);

  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

  const afterLoginUrl = page.url();
  console.log('After login URL:', afterLoginUrl);

  // ========== ВНУТРЕННИЕ СТРАНИЦЫ — СВЕТЛАЯ ТЕМА ==========
  const pages = ['swipe', 'bookmarks', 'mailbox', 'meetings', 'profile', 'settings', 'admin'];

  for (const pageName of pages) {
    await page.goto(`http://localhost:4200/${pageName}`, { waitUntil: 'load', timeout: 15000 });
    await page.waitForTimeout(2000);
    const url = page.url();

    // Если редиректнуло на логин — значит страница не доступна
    if (url.includes('auth/login')) {
      console.log(`⚠ ${pageName} — redirected to login, skipping`);
      continue;
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${pageName}-01-light.png`), fullPage: true });
    console.log(`✓ ${pageName}-01-light`);
  }

  // ========== ВНУТРЕННИЕ СТРАНИЦЫ — ТЁМНАЯ ТЕМА ==========
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });

  for (const pageName of pages) {
    await page.goto(`http://localhost:4200/${pageName}`, { waitUntil: 'load', timeout: 15000 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(2000);
    const url = page.url();

    if (url.includes('auth/login')) {
      console.log(`⚠ ${pageName} dark — redirected to login, skipping`);
      continue;
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${pageName}-02-dark.png`), fullPage: true });
    console.log(`✓ ${pageName}-02-dark`);
  }

  // ========== ШАПКА ОТДЕЛЬНО ==========
  await page.goto('http://localhost:4200/profile', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(1500);
  await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 70 }, path: path.join(SCREENSHOT_DIR, 'header-light.png') });
  console.log('✓ header-light');

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(500);
  await page.goto('http://localhost:4200/profile', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1500);
  await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 70 }, path: path.join(SCREENSHOT_DIR, 'header-dark.png') });
  console.log('✓ header-dark');

  // ========== МОБИЛЬНАЯ ВЕРСИЯ ==========
  await ctx.close();
  const ctxM = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const pM = await ctxM.newPage();

  // Войти на мобильном
  await pM.goto('http://localhost:4200/auth/login', { waitUntil: 'load', timeout: 15000 });
  await pM.waitForTimeout(1000);
  await pM.fill('input[name="email"]', EMAIL);
  await pM.fill('input[name="password"]', PASSWORD);
  await pM.locator('button[type="submit"]').click();
  await pM.waitForTimeout(4000);

  // Мобильная светлая
  for (const pageName of ['swipe', 'profile', 'mailbox']) {
    await pM.goto(`http://localhost:4200/${pageName}`, { waitUntil: 'load', timeout: 15000 });
    await pM.waitForTimeout(2000);
    if (!pM.url().includes('auth/login')) {
      await pM.screenshot({ path: path.join(SCREENSHOT_DIR, `mobile-${pageName}-light.png`), fullPage: true });
      console.log(`✓ mobile-${pageName}-light`);
    }
  }

  // Мобильная тёмная
  await pM.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });

  for (const pageName of ['swipe', 'profile', 'mailbox']) {
    await pM.goto(`http://localhost:4200/${pageName}`, { waitUntil: 'load', timeout: 15000 });
    await pM.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await pM.waitForTimeout(2000);
    if (!pM.url().includes('auth/login')) {
      await pM.screenshot({ path: path.join(SCREENSHOT_DIR, `mobile-${pageName}-dark.png`), fullPage: true });
      console.log(`✓ mobile-${pageName}-dark`);
    }
  }

  await ctxM.close();
  await browser.close();
  console.log(`\nDone! Email: ${EMAIL}, Password: ${PASSWORD}`);
  console.log('Screenshots in', SCREENSHOT_DIR);
}

run().catch(err => { console.error(err); process.exit(1); });
