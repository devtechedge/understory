import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SHOT_BASE ?? 'https://understory-vert.vercel.app/';
const OUT = process.env.SHOT_OUT ?? 'qa-shots/production';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function openPage(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__understory?.getWorld()), null, {
    timeout: 20_000,
  });
  await page.waitForTimeout(800);
  return { context, page };
}

async function grow(page) {
  await page.evaluate(() => {
    const api = window.__understory;
    api.plant('maidenhair-fern', 0.63);
    api.plant('cushion-moss', 0.31);
    api.plant('ghost-fungus', 0.84);
    for (let i = 0; i < 4; i += 1) {
      api.advance(14 * 60_000);
      api.mist();
    }
    api.advance(10 * 60_000);
  });
  await page.waitForTimeout(1_400);
}

const desktop = await openPage({ width: 1440, height: 900 });
await desktop.page.screenshot({ path: `${OUT}/01-vitrine-empty.png` });
await grow(desktop.page);
await desktop.page.screenshot({ path: `${OUT}/02-vitrine-grown.png` });
await desktop.page.locator('.specimen-row').first().click();
await desktop.page.waitForTimeout(500);
await desktop.page.screenshot({ path: `${OUT}/03-specimen-card.png` });
await desktop.page.keyboard.press('Escape');
await desktop.page.evaluate(() => window.scrollTo(0, 0));
await desktop.page.locator('.masthead').getByRole('button', { name: 'Herbarium' }).click();
const herbarium = desktop.page.locator('.herbarium-dialog');
await herbarium.waitFor({ state: 'visible' });
await desktop.page.waitForTimeout(500);
await desktop.page.screenshot({ path: `${OUT}/05-herbarium.png` });
await herbarium.evaluate((element) => {
  element.scrollTop = element.scrollHeight;
});
await desktop.page.waitForTimeout(500);
await desktop.page.screenshot({ path: `${OUT}/05b-pressed.png` });
await desktop.page.keyboard.press('Escape');
await desktop.page.locator('.masthead').getByRole('button', { name: /Change the room light/ }).click();
await desktop.page.waitForTimeout(700);
await desktop.page.screenshot({ path: `${OUT}/06-daylight.png` });
await desktop.page.evaluate(() => window.__understory?.setSeason('winter'));
await desktop.page.waitForTimeout(900);
await desktop.page.screenshot({ path: `${OUT}/07-winter.png` });
await desktop.context.close();

const mobile = await openPage({ width: 390, height: 844 });
await grow(mobile.page);
await mobile.page.screenshot({ path: `${OUT}/08-mobile-vitrine.png` });
await mobile.page.locator('.mobile-bar').getByRole('button', { name: 'Plant' }).click();
await mobile.page.locator('.plant-sheet').waitFor({ state: 'visible' });
await mobile.page.waitForTimeout(500);
await mobile.page.screenshot({ path: `${OUT}/09-mobile-plant-sheet.png` });
await mobile.page.keyboard.press('Escape');
await mobile.page.evaluate(() => {
  const journal = document.getElementById('journal');
  if (!journal) return;
  const top = journal.getBoundingClientRect().top + window.scrollY - 56;
  window.scrollTo(0, Math.max(0, top));
});
await mobile.page.waitForTimeout(500);
await mobile.page.screenshot({ path: `${OUT}/04-journal.png` });
await mobile.context.close();

console.log(JSON.stringify({ base: BASE, errors }, null, 2));
await browser.close();
