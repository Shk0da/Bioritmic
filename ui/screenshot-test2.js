const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Register a test user first, then login
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await ctx.newPage();

  // Register
  await page.goto('http://localhost:2399/auth/registration', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  // Fill registration form
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', 'test123');
  await page.waitForTimeout(300);

  // Submit registration
  const registerBtn = page.locator('button[type="submit"]');
  if (await registerBtn.isEnabled()) {
    await registerBtn.click();
    await page.waitForTimeout(2000);
  }

  // Navigate to login
  await page.goto('http://localhost:2399/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  // Fill login form
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', 'test123');
  await page.waitForTimeout(300);

  // Submit login
  const loginBtn = page.locator('button[type="submit"]');
  if (await loginBtn.isEnabled()) {
    await loginBtn.click();
    await page.waitForTimeout(3000);
  }

  // Take screenshot of current page (should be swipe or profile)
  const currentUrl = page.url();
  console.log('After login URL:', currentUrl);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-after-login-light.png'), fullPage: true });
  console.log('✓ 07-after-login-light');

  // Navigate to profile
  await page.goto('http://localhost:2399/profile', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-profile-light.png'), fullPage: true });
  console.log('✓ 08-profile-light');

  // Navigate to bookmarks
  await page.goto('http://localhost:2399/bookmarks', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-bookmarks-light.png'), fullPage: true });
  console.log('✓ 09-bookmarks-light');

  // Navigate to settings
  await page.goto('http://localhost:2399/settings', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-settings-light.png'), fullPage: true });
  console.log('✓ 10-settings-light');

  // Navigate to swipe
  await page.goto('http://localhost:2399/swipe', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-swipe-light.png'), fullPage: true });
  console.log('✓ 11-swipe-light');

  // Switch to dark mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await page.waitForTimeout(500);

  // Take dark mode screenshots
  await page.goto('http://localhost:2399/swipe', { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-swipe-dark.png'), fullPage: true });
  console.log('✓ 12-swipe-dark');

  await page.goto('http://localhost:2399/profile', { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13-profile-dark.png'), fullPage: true });
  console.log('✓ 13-profile-dark');

  await page.goto('http://localhost:2399/settings', { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14-settings-dark.png'), fullPage: true });
  console.log('✓ 14-settings-dark');

  await page.goto('http://localhost:2399/bookmarks', { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15-bookmarks-dark.png'), fullPage: true });
  console.log('✓ 15-bookmarks-dark');

  // Mobile with header
  await ctx.close();

  const ctxMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    storageState: await browser.newContext().then(c => { c.close(); return undefined; })
  });

  // Create fresh context and reuse cookies from first context
  const ctxMobile2 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const pageM = await ctxMobile2.newPage();

  // Login again
  await pageM.goto('http://localhost:2399/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  await pageM.waitForTimeout(500);
  await pageM.fill('input[name="email"]', 'test@test.com');
  await pageM.fill('input[name="password"]', 'test123');
  const loginBtnM = pageM.locator('button[type="submit"]');
  if (await loginBtnM.isEnabled()) {
    await loginBtnM.click();
    await pageM.waitForTimeout(3000);
  }

  await pageM.goto('http://localhost:2399/swipe', { waitUntil: 'networkidle', timeout: 15000 });
  await pageM.waitForTimeout(1000);
  await pageM.screenshot({ path: path.join(SCREENSHOT_DIR, '16-swipe-mobile-light.png'), fullPage: true });
  console.log('✓ 16-swipe-mobile-light');

  await pageM.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await pageM.goto('http://localhost:2399/swipe', { waitUntil: 'networkidle', timeout: 15000 });
  await pageM.waitForTimeout(1000);
  await pageM.screenshot({ path: path.join(SCREENSHOT_DIR, '17-swipe-mobile-dark.png'), fullPage: true });
  console.log('✓ 17-swipe-mobile-dark');

  await ctxMobile2.close();
  await browser.close();
  console.log('\nAll screenshots saved to', SCREENSHOT_DIR);
}

run().catch(err => { console.error(err); process.exit(1); });
