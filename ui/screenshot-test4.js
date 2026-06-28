const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Set localStorage before navigating
  await page.goto('http://localhost:2399/', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('refresh_token', 'fake-refresh');
    localStorage.setItem('current_user', JSON.stringify({
      name: 'Тестовый Пользователь',
      email: 'test@test.com',
      id: 1,
      role: 'ADMIN'
    }));
  });

  // LIGHT MODE
  // Go to profile
  await page.goto('http://localhost:2399/profile', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('URL:', page.url());
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '30-profile-light.png'), fullPage: true });
  console.log('✓ 30-profile-light');

  // Header only
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '31-header-light.png'),
    clip: { x: 0, y: 0, width: 1440, height: 70 }
  });
  console.log('✓ 31-header-light');

  // Swipe
  await page.goto('http://localhost:2399/swipe', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '32-swipe-light.png'), fullPage: true });
  console.log('✓ 32-swipe-light');

  // Settings
  await page.goto('http://localhost:2399/settings', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '33-settings-light.png'), fullPage: true });
  console.log('✓ 33-settings-light');

  // Bookmarks
  await page.goto('http://localhost:2399/bookmarks', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '34-bookmarks-light.png'), fullPage: true });
  console.log('✓ 34-bookmarks-light');

  // MAILBOX
  await page.goto('http://localhost:2399/mailbox', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '35-mailbox-light.png'), fullPage: true });
  console.log('✓ 35-mailbox-light');

  // ADMIN
  await page.goto('http://localhost:2399/admin', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '36-admin-light.png'), fullPage: true });
  console.log('✓ 36-admin-light');

  // DARK MODE
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });

  // Profile dark
  await page.goto('http://localhost:2399/profile', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '37-profile-dark.png'), fullPage: true });
  console.log('✓ 37-profile-dark');

  // Header only dark
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '38-header-dark.png'),
    clip: { x: 0, y: 0, width: 1440, height: 70 }
  });
  console.log('✓ 38-header-dark');

  // Swipe dark
  await page.goto('http://localhost:2399/swipe', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '39-swipe-dark.png'), fullPage: true });
  console.log('✓ 39-swipe-dark');

  // Settings dark
  await page.goto('http://localhost:2399/settings', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '40-settings-dark.png'), fullPage: true });
  console.log('✓ 40-settings-dark');

  // Bookmarks dark
  await page.goto('http://localhost:2399/bookmarks', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '41-bookmarks-dark.png'), fullPage: true });
  console.log('✓ 41-bookmarks-dark');

  // Mailbox dark
  await page.goto('http://localhost:2399/mailbox', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '42-mailbox-dark.png'), fullPage: true });
  console.log('✓ 42-mailbox-dark');

  // Admin dark
  await page.goto('http://localhost:2399/admin', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '43-admin-dark.png'), fullPage: true });
  console.log('✓ 43-admin-dark');

  // Mobile light + dark
  await ctx.close();
  const ctxM = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const pM = await ctxM.newPage();

  await pM.goto('http://localhost:2399/', { waitUntil: 'load', timeout: 15000 });
  await pM.evaluate(() => {
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('current_user', JSON.stringify({
      name: 'Тест', email: 'test@test.com', id: 1, role: 'ADMIN'
    }));
  });

  await pM.goto('http://localhost:2399/swipe', { waitUntil: 'load', timeout: 15000 });
  await pM.waitForTimeout(2000);
  await pM.screenshot({ path: path.join(SCREENSHOT_DIR, '44-swipe-mobile-light.png'), fullPage: true });
  console.log('✓ 44-swipe-mobile-light');

  await pM.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await pM.goto('http://localhost:2399/swipe', { waitUntil: 'load', timeout: 15000 });
  await pM.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await pM.waitForTimeout(2000);
  await pM.screenshot({ path: path.join(SCREENSHOT_DIR, '45-swipe-mobile-dark.png'), fullPage: true });
  console.log('✓ 45-swipe-mobile-dark');

  await ctxM.close();
  await browser.close();
  console.log('\nAll done!');
}

run().catch(err => { console.error(err); process.exit(1); });
