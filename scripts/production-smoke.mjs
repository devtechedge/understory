import { chromium } from '@playwright/test';
import process from 'node:process';

const LIVE = process.env.SMOKE_URL ?? 'https://understory-vert.vercel.app/';
const HOST = new URL(LIVE).hostname;
const REQUIRED_HEADERS = [
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'content-security-policy',
  'x-frame-options',
];

function fail(message) {
  console.error(`Production smoke failed: ${message}`);
  process.exitCode = 1;
}

const response = await fetch(LIVE);
if (!response.ok) fail(`document returned ${response.status}`);
for (const header of REQUIRED_HEADERS) {
  if (!response.headers.get(header)) fail(`missing ${header}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
const external = [];

page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.protocol.startsWith('http') && url.hostname !== HOST) external.push(request.url());
});

try {
  await page.goto(LIVE, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForFunction(() => Boolean(window.__understory?.getWorld()), null, {
    timeout: 20_000,
  });

  const title = await page.title();
  if (!/Understory/i.test(title)) fail(`unexpected title "${title}"`);

  const canvas = page.getByTestId('vitrine-canvas');
  if (!(await canvas.isVisible())) fail('vitrine canvas is not visible');
  const box = await canvas.boundingBox();
  if (!box || box.width < 200 || box.height < 200) fail('vitrine canvas has no usable size');

  const world = await page.evaluate(() => {
    const state = window.__understory?.getWorld();
    return state ? { species: state.entities.length, journal: state.journal.length } : null;
  });
  if (!world) fail('the simulation did not boot');

  if (errors.length) fail(`console errors: ${errors.join(' | ')}`);
  if (external.length) fail(`external requests: ${external.join(' | ')}`);

  console.log(
    JSON.stringify(
      {
        ok: process.exitCode !== 1,
        url: LIVE,
        title,
        headers: REQUIRED_HEADERS.length,
        canvas: box,
        world,
        errors,
        external,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
