import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:8081';
const screens = [
  ['00-home', '/'],
  ['01-explore', '/explore'],
  ['01b-home-search', '/?q=maldives'],
  ['02-award-lists-top100', '/awards'],
  ['03-award-lists-3keys', '/awards?list=michelin3'],
  ['04-map-3keys', '/map?scope=michelin3'],
  ['05-map-world', '/map'],
  ['06-hotel-rosewood-hong-kong', '/hotel/rosewood-hong-kong'],
  ['07-hotel-forestis', '/hotel/forestis-dolomites'],
  ['08-compare', '/compare'],
  ['09-watch', '/watch'],
  ['10-deals', '/deals'],
  ['11-holidays', '/holidays?when=christmas'],
  ['12-insights', '/insights'],
  ['13-hotel-christmas', '/hotel/rosewood-hong-kong?when=christmas'],
  ['14-map-awards', '/map?awards=keys,stars&match=any'],
];
const targets = [
  ['iphone-15-pro', devices['iPhone 15 Pro']],
  ['pixel-7', devices['Pixel 7']],
  ['ipad', devices['iPad Pro 11']],
  // iPhone Duo (points): outer display, inner display open, inner display in portrait
  ['iphone-duo-outer', { viewport: { width: 466, height: 678 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['iphone-duo-open', { viewport: { width: 951, height: 669 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  ['iphone-duo-open-portrait', { viewport: { width: 669, height: 951 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  // Android book-style foldable, unfolded
  ['android-fold-open', { viewport: { width: 673, height: 841 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true }],
];
fs.mkdirSync('mockups', { recursive: true });
const browser = await chromium.launch();
const errors = [];
for (const [label, device] of targets) {
  const ctx = await browser.newContext({ ...device });
  for (const [name, path] of screens) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${label} ${path}: ${e.message}`));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`${label} ${path} console.${m.type()}: ${m.text().slice(0, 300)}`); });
    page.on('requestfailed', (r) => errors.push(`${label} ${path} request failed: ${r.url().slice(0, 160)} ${r.failure()?.errorText}`));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`${label} ${path} HTTP ${r.status()}: ${r.url().slice(0, 160)}`); });
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(6000); // live data loads from the StayOdds database
    await page.screenshot({ path: `mockups/${label}__${name}.png` });
    if (label === 'iphone-15-pro' && name === '01-explore') fs.writeFileSync('mockups/explore.html', await page.content());
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync('mockups/errors.txt', errors.join('\n') || 'No JavaScript errors.');
console.log(errors.length ? errors.join('\n') : 'No JavaScript errors.');
