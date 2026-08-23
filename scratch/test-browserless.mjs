import { chromium } from 'playwright-core';

const url = process.env.BROWSERLESS_URL;
if (!url) { console.error('BROWSERLESS_URL not set'); process.exit(1); }

try {
  const browser = await chromium.connectOverCDP(url);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('about:blank');
  console.log('Connected OK. Browser version:', browser.version());
  await context.close();
  await browser.close();
  console.log('SUCCESS');
} catch (e) {
  console.error('FAILED:', e.message);
  process.exit(1);
}
