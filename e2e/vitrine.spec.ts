import { Buffer } from 'node:buffer';
import { expect, test, type Page } from '@playwright/test';

async function waitReady(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__understory?.getWorld()), null, {
    timeout: 15_000,
  });
  await page.waitForTimeout(200);
}

async function growFern(page: Page) {
  await page.evaluate(() => {
    const api = window.__understory!;
    api.plant('maidenhair-fern', 0.48);
    for (let i = 0; i < 6; i += 1) {
      api.advance(12 * 60_000);
      api.mist();
    }
  });
  await page.waitForTimeout(500);
}

test('first visit is plantable and a sprout appears', async ({ page }) => {
  await waitReady(page);
  await expect(page.getByTestId('vitrine-canvas')).toBeVisible();
  await expect(page.getByText('Bare soil, ready.')).toBeVisible();
  await expect(page.locator('.rail .packet')).toHaveCount(3);

  await page.locator('.rail .packet').first().click();
  await page.locator('.rail').getByRole('button', { name: 'Plant in the soil' }).click();

  await expect(page.locator('.rail .specimen-row')).toHaveCount(1);
  await expect(page.getByText('Bare soil, ready.')).toHaveCount(0);

  await page.evaluate(() => window.__understory!.advance(30_000));
  await expect
    .poll(() => page.evaluate(() => window.__understory!.getWorld()!.entities[0]?.growth ?? 0))
    .toBeGreaterThan(0);
  await expect(page.locator('.journal-entry').first()).toContainText(/shoots/i);
  await expect(page.getByTestId('vitrine-canvas')).toHaveAttribute('aria-label', /Cushion Moss/);
});

test('climate controls work, including a stable pause', async ({ page }) => {
  await waitReady(page);
  await page.evaluate(() => window.__understory!.plant('maidenhair-fern', 0.5));

  const before = await page.evaluate(() => window.__understory!.getWorld()!.moisture);
  await page.locator('.climate').getByRole('button', { name: 'Mist the soil' }).click();
  await expect(page.locator('.toast')).toContainText(/Misted/);
  await expect
    .poll(() => page.evaluate(() => window.__understory!.getWorld()!.moisture))
    .toBeGreaterThan(before);

  await page.locator('.season-dial').getByRole('button', { name: 'Winter' }).click();
  await expect(
    page.locator('.season-dial').getByRole('button', { name: 'Winter' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.climate')).toContainText('Winter');

  await page.locator('#light-preview').focus();
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('ArrowRight');
  await expect(page.locator('.preview-value')).toHaveText('+3.0 h');

  await page.locator('.climate').getByRole('button', { name: 'Pause' }).click();
  await page.waitForTimeout(200);
  const firstElapsed = await page.evaluate(() => window.__understory!.getWorld()!.elapsedMs);
  await page.waitForTimeout(2400);
  const secondElapsed = await page.evaluate(() => window.__understory!.getWorld()!.elapsedMs);
  expect(secondElapsed).toBe(firstElapsed);
  await expect(page.locator('.climate').getByRole('button', { name: 'Resume' })).toBeVisible();
});

test('pruning leaves a cutting that can be planted', async ({ page }) => {
  await waitReady(page);
  await growFern(page);

  await page.locator('.rail .specimen-row').first().click();
  await expect(page.locator('.specimen-card')).toBeVisible();
  const snip = page.getByRole('button', { name: 'Snip a frond' });
  await expect(snip).toBeEnabled();
  await snip.click();

  await expect(page.locator('.toast')).toContainText(/division/i);
  await expect(page.locator('.rail .vial')).toHaveCount(1);
  await page.locator('.rail').getByRole('button', { name: 'Plant cutting' }).click();
  await expect(page.locator('.rail .specimen-row')).toHaveCount(2);
  await expect(page.locator('.toast')).toContainText(/settling/i);
});

test('the world survives a reload', async ({ page }) => {
  await waitReady(page);
  await page.evaluate(() => window.__understory!.plant('ghost-fungus', 0.4));
  await page.waitForTimeout(2200);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__understory?.getWorld()));
  await expect(page.locator('.rail .specimen-row')).toHaveCount(1);
  await expect(page.locator('.journal-entry').first()).toContainText(/pinhead|packet/i);
});

test('a seed packet exports and imports', async ({ page }) => {
  await waitReady(page);
  await page.evaluate(() => {
    const api = window.__understory!;
    api.plant('cushion-moss', 0.4);
    api.advance(30_000);
  });
  await page.waitForTimeout(1200);
  const json = await page.evaluate(() => window.__understory!.exportJSON()!);
  expect(json).toContain('"app": "understory"');

  await page.locator('.masthead').getByRole('button', { name: 'Herbarium' }).click();
  const dialog = page.locator('.herbarium-dialog');
  await expect(dialog).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export seed packet' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('understory-seed-packet.json');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);

  await page.locator('.masthead').getByRole('button', { name: 'Herbarium' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'understory-seed-packet.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText(/restored/i);

  await page.locator('.masthead').getByRole('button', { name: 'Herbarium' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not json'),
  });
  await expect(page.locator('.herbarium-dialog')).toBeVisible();
  await expect(page.locator('.form-status')).toContainText(/could not be read/i);
});

test('keyboard shortcuts and immersion work', async ({ page }) => {
  await waitReady(page);
  await page.keyboard.press('Shift+/');
  await expect(page.locator('.help-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.help-dialog')).toHaveCount(0);

  await page.keyboard.press('i');
  await expect(page.locator('.app')).toHaveClass(/is-immersed/);
  await expect(page.locator('.immersion-return')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app')).not.toHaveClass(/is-immersed/);

  await page.keyboard.press('2');
  await expect(page.locator('.tool-panel .tool').nth(1)).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('vitrine-canvas').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.climate').getByRole('button', { name: 'Resume' })).toBeVisible();
});

test('mobile plants from the sheet with no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitReady(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('.mobile-bar')).toBeVisible();
  await page.locator('.mobile-bar').getByRole('button', { name: 'Plant' }).click();
  await expect(page.locator('.plant-sheet')).toBeVisible();
  await page.locator('.plant-sheet-card').first().click();
  await expect
    .poll(() => page.evaluate(() => window.__understory!.getWorld()!.entities.length))
    .toBe(1);
  await expect(page.getByText('Bare soil, ready.')).toHaveCount(0);
});

test('soil inspection and the loupe are available', async ({ page }) => {
  await waitReady(page);
  const canvas = page.getByTestId('vitrine-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.86);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('.soil-card')).toBeVisible();
  await expect(page.locator('.soil-card')).toContainText(/Moisture/i);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('still mode is on by default', async ({ page }) => {
    await waitReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-still', 'true');
    await expect(page.locator('.chrome-btn').filter({ hasText: 'Still' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test('no console errors and no network calls after load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await waitReady(page);
  await page.waitForTimeout(800);

  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(url.hostname)) {
      external.push(request.url());
    }
  });

  await page.evaluate(() => {
    const api = window.__understory!;
    api.plant('cushion-moss', 0.4);
    api.advance(30_000);
  });
  await page.locator('.climate').getByRole('button', { name: 'Mist the soil' }).click();
  await page.waitForTimeout(600);

  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
