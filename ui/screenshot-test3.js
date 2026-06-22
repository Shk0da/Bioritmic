const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Desktop - login page (no header shown)
  // We need to see the header on internal pages
  // Since we can't login via API, let's inject auth state directly

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Navigate to login and inject fake auth state
  await page.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(500);

  // Inject cookies to simulate logged-in state
  await page.evaluate(() => {
    document.cookie = 'access_token=fake-token; path=/';
    document.cookie = 'refresh_token=fake-refresh; path=/';
    document.cookie = 'current_user=' + encodeURIComponent(JSON.stringify({
      name: 'Test User',
      email: 'test@test.com',
      id: 1,
      role: 'ADMIN'
    })) + '; path=/';
    localStorage.setItem('access_token', 'fake-token');
    localStorage.setItem('refresh_token', 'fake-refresh');
    localStorage.setItem('current_user', JSON.stringify({
      name: 'Test User',
      email: 'test@test.com',
      id: 1,
      role: 'ADMIN'
    }));
  });

  // Try to go to profile
  await page.goto('http://localhost:4200/swipe', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '20-header-check.png'), fullPage: true });
  console.log('✓ 20-header-check');

  // Check current URL
  console.log('Current URL:', page.url());

  // Take a clipped screenshot of just the header area
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '21-header-only-light.png'),
    clip: { x: 0, y: 0, width: 1440, height: 70 }
  });
  console.log('✓ 21-header-only-light');

  // Switch to dark mode
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await page.waitForTimeout(500);
  await page.goto('http://localhost:4200/swipe', { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '22-swipe-dark-with-header.png'), fullPage: true });
  console.log('✓ 22-swipe-dark-with-header');

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '23-header-only-dark.png'),
    clip: { x: 0, y: 0, width: 1440, height: 70 }
  });
  console.log('✓ 23-header-only-dark');

  // Also check profile dark
  await page.goto('http://localhost:4200/profile', { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '24-profile-dark-full.png'), fullPage: true });
  console.log('✓ 24-profile-dark-full');

  // Settings dark
  await page.goto('http://localhost:4200/settings', { waitUntil: 'networkidle', timeout: 15000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '25-settings-dark-full.png'), fullPage: true });
  console.log('✓ 25-settings-dark-full');

  await ctx.close();
  await browser.close();
  console.log('\nAll screenshots saved to', SCREENSHOT_DIR);
}

run().catch(err => { console.error(err); process.exit(1); });
