import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.SHOT_BASE ?? 'http://127.0.0.1:5220';
const OUT = process.env.SHOT_OUT ?? 'qa-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function openPage(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(window.__understory?.getWorld()), null, {
    timeout: 15000,
  });
  return { context, page };
}

async function grow(page) {
  await page.evaluate(() => {
    const api = window.__understory;
    api.plant('maidenhair-fern', 0.63);
    api.plant('cushion-moss', 0.31);
    api.plant('ghost-fungus', 0.84);
    for (let i = 0; i < 4; i += 1) {
      api.advance(14 * 60000);
      api.mist();
    }
    api.advance(10 * 60000);
  });
  await page.waitForTimeout(1200);
}

const desktop = await openPage({ width: 1440, height: 900 });
await desktop.page.waitForTimeout(700);
await desktop.page.screenshot({ path: `${OUT}/desktop-empty.png` });
await grow(desktop.page);
await desktop.page.screenshot({ path: `${OUT}/desktop-grown.png` });
await desktop.page.locator('.glass').screenshot({ path: `${OUT}/vitrine-detail.png` });
const box = await desktop.page.locator('.glass').boundingBox();
if (box) {
  await desktop.page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.58);
  await desktop.page.waitForTimeout(500);
  await desktop.page.screenshot({ path: `${OUT}/desktop-loupe.png` });
}
await desktop.page.locator('.specimen-row').first().click();
await desktop.page.waitForTimeout(500);
await desktop.page.screenshot({ path: `${OUT}/desktop-card.png` });
await desktop.page.keyboard.press('Escape');

const world = await desktop.page.evaluate(() => {
  const state = window.__understory.getWorld();
  return {
    entities: state.entities.map((entity) => ({
      id: entity.id,
      species: entity.speciesId,
      growth: Number(entity.growth.toFixed(3)),
      health: Number(entity.health.toFixed(2)),
      dormant: entity.dormant,
    })),
    journal: state.journal.length,
    moisture: Math.round(state.moisture),
    pressed: state.pressed.length,
  };
});

await desktop.page.locator('.masthead').getByRole('button', { name: 'Help' }).click();
await desktop.page.waitForTimeout(400);
await desktop.page.screenshot({ path: `${OUT}/desktop-help.png` });
await desktop.page.keyboard.press('Escape');
await desktop.page.locator('.masthead').getByRole('button', { name: 'Herbarium' }).click();
await desktop.page.waitForTimeout(400);
await desktop.page.screenshot({ path: `${OUT}/desktop-herbarium.png` });
await desktop.page.keyboard.press('Escape');
await desktop.context.close();

const mobile = await openPage({ width: 390, height: 844 });
await mobile.page.waitForTimeout(600);
await mobile.page.screenshot({ path: `${OUT}/mobile-empty.png`, fullPage: false });
await grow(mobile.page);
await mobile.page.screenshot({ path: `${OUT}/mobile-grown.png`, fullPage: false });
const mobileOverflow = await mobile.page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);
await mobile.page.locator('.mobile-bar').getByRole('button', { name: 'Plant' }).click();
await mobile.page.waitForTimeout(400);
await mobile.page.screenshot({ path: `${OUT}/mobile-plant-sheet.png` });
await mobile.page.keyboard.press('Escape');
await mobile.context.close();

const daylight = await openPage({ width: 1440, height: 900 });
await grow(daylight.page);
await daylight.page.locator('.masthead').getByRole('button', { name: 'Change the room light' }).click();
await daylight.page.waitForTimeout(500);
await daylight.page.screenshot({ path: `${OUT}/desktop-daylight.png` });
await daylight.context.close();

console.log(JSON.stringify({ world, mobileOverflow, errors }, null, 2));
await browser.close();
