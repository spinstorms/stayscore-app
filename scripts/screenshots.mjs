import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:8081';
const screens = [
  ['01-explore', '/'],
  ['02-award-lists-top100', '/awards'],
  ['03-award-lists-3keys', '/awards?list=michelin3'],
  ['04-map-3keys', '/map?scope=michelin3'],
  ['05-map-world', '/map'],
  ['06-hotel-rosewood-hong-kong', '/hotel/rosewood-hong-kong'],
  ['07-hotel-forestis', '/hotel/forestis-dolomites'],
  ['08-compare', '/compare'],
  ['09-watch', '/watch'],
  ['10-deals', '/deals'],
];
const targets = [
  ['iphone-15-pro', devices['iPhone 15 Pro']],
  ['pixel-7', devices['Pixel 7']],
  ['ipad', devices['iPad Pro 11']],
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
