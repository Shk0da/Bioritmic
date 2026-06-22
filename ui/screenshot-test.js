const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Desktop light mode
  const ctxDesktopLight = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageDL = await ctxDesktopLight.newPage();

  // 1. Login page
  await pageDL.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  await pageDL.waitForTimeout(1000);
  await pageDL.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-light-desktop.png'), fullPage: true });
  console.log('✓ 01-login-light-desktop');

  // 2. Registration page
  await pageDL.goto('http://localhost:4200/auth/registration', { waitUntil: 'networkidle', timeout: 15000 });
  await pageDL.waitForTimeout(1000);
  await pageDL.screenshot({ path: path.join(SCREENSHOT_DIR, '02-registration-light-desktop.png'), fullPage: true });
  console.log('✓ 02-registration-light-desktop');

  // 3. Login page — dark mode
  const ctxDesktopDark = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark'
  });
  const pageDD = await ctxDesktopDark.newPage();
  // Set dark theme via localStorage before navigating
  await pageDD.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  await pageDD.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await pageDD.waitForTimeout(1000);
  await pageDD.screenshot({ path: path.join(SCREENSHOT_DIR, '03-login-dark-desktop.png'), fullPage: true });
  console.log('✓ 03-login-dark-desktop');

  // 4. Registration dark
  await pageDD.goto('http://localhost:4200/auth/registration', { waitUntil: 'networkidle', timeout: 15000 });
  await pageDD.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await pageDD.waitForTimeout(1000);
  await pageDD.screenshot({ path: path.join(SCREENSHOT_DIR, '04-registration-dark-desktop.png'), fullPage: true });
  console.log('✓ 04-registration-dark-desktop');

  await ctxDesktopLight.close();
  await ctxDesktopDark.close();

  // Mobile light mode (iPhone 14)
  const ctxMobileLight = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true
  });
  const pageML = await ctxMobileLight.newPage();

  await pageML.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  await pageML.waitForTimeout(1000);
  await pageML.screenshot({ path: path.join(SCREENSHOT_DIR, '05-login-light-mobile.png'), fullPage: true });
  console.log('✓ 05-login-light-mobile');

  // Mobile dark mode
  const ctxMobileDark = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    colorScheme: 'dark'
  });
  const pageMD = await ctxMobileDark.newPage();
  await pageMD.goto('http://localhost:4200/auth/login', { waitUntil: 'networkidle', timeout: 15000 });
  await pageMD.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('bioritmic_theme', 'dark');
  });
  await pageMD.waitForTimeout(1000);
  await pageMD.screenshot({ path: path.join(SCREENSHOT_DIR, '06-login-dark-mobile.png'), fullPage: true });
  console.log('✓ 06-login-dark-mobile');

  await ctxMobileLight.close();
  await ctxMobileDark.close();
  await browser.close();
  console.log('\nAll screenshots saved to', SCREENSHOT_DIR);
}

run().catch(err => { console.error(err); process.exit(1); });
