import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function waitReady(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__understory?.getWorld()), null, {
    timeout: 15_000,
  });
  await page.waitForTimeout(250);
}

function seriousFindings(violations: { impact?: string | null; id: string; help: string }[]) {
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('the vitrine has no serious accessibility findings', async ({ page }) => {
  await waitReady(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(seriousFindings(results.violations)).toEqual([]);
});

test('the help dialog has no serious accessibility findings', async ({ page }) => {
  await waitReady(page);
  await page.locator('.masthead').getByRole('button', { name: 'Help' }).click();
  await expect(page.locator('.help-dialog')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(seriousFindings(results.violations)).toEqual([]);
});

test('the herbarium has no serious accessibility findings', async ({ page }) => {
  await waitReady(page);
  await page.locator('.masthead').getByRole('button', { name: 'Herbarium' }).click();
  await expect(page.locator('.herbarium-dialog')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(seriousFindings(results.violations)).toEqual([]);
});

test('the mobile plant sheet has no serious accessibility findings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitReady(page);
  await page.locator('.mobile-bar').getByRole('button', { name: 'Plant' }).click();
  await expect(page.locator('.plant-sheet')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(seriousFindings(results.violations)).toEqual([]);
});
