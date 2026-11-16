import { test, expect } from '@playwright/test';

test('presents with private notes, an audience window, keyboard navigation, and Help', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.locator('.speaker-sidebar')).toBeVisible();
  await expect(page.locator('.presenter-notes')).toContainText('Welcome everyone.');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open audience', exact: true }).click();
  const audience = await popupPromise;
  await expect(audience.locator('.slide-artboard')).toBeVisible();
  await expect(audience.locator('body')).not.toContainText('Welcome everyone.');
  await expect(audience.locator('iframe')).toHaveCount(0);
  await page.bringToFront();
  await page.getByRole('button', { name: 'Next slide', exact: true }).click();
  await expect(audience.locator('.slide-artboard')).toContainText('From story to');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.player-navigation')).toContainText('3 / 3');
  await expect(page.locator('.live-demo-frame')).toHaveCount(1);
  await expect(audience.locator('.demo-poster')).toBeVisible();
  await expect(audience.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause demo', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run demo', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open help', exact: true }).click();
  await expect(page.locator('.help-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close help' }).click();
  await expect(page.locator('.player-navigation')).toContainText('3 / 3');
  await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
  await expect(page.getByLabel('Presentation title')).toHaveValue('A little more live');
  await expect.poll(() => audience.isClosed()).toBe(true);
});

test('standalone HTML runs an authored demo and opens its own speaker view without a server', async ({
  page,
  browser,
}, info) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Interactive player/ }).click();
  const download = await downloadPromise;
  const path = info.outputPath('interactive.html');
  await download.saveAs(path);
  const context = await browser.newContext();
  const player = await context.newPage();
  const requests: string[] = [];
  const errors: string[] = [];
  player.on('request', (request) => {
    if (request.url().startsWith('http')) requests.push(request.url());
  });
  player.on('pageerror', (error) => errors.push(error.message));
  await player.goto(`file://${path}`);
  await player.getByRole('button', { name: 'Next slide', exact: true }).click();
  await player.getByRole('button', { name: 'Next slide', exact: true }).click();
  const frame = player.frameLocator('.live-demo-frame');
  await frame.getByRole('textbox', { name: 'New task' }).fill('Show a working product');
  await frame.getByRole('button', { name: /Add task/ }).click();
  await expect(frame.locator('#tasks label')).toHaveCount(4);
  await player.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(frame.locator('#tasks label')).toHaveCount(3);
  await player.getByRole('button', { name: 'Speaker view', exact: true }).click();
  await expect(player.locator('.presenter-notes')).toContainText('Start demo sharing');
  const popupPromise = player.waitForEvent('popup');
  await player.getByRole('button', { name: 'Open audience', exact: true }).click();
  const audience = await popupPromise;
  await expect(audience.locator('.slide-artboard')).toBeVisible();
  await expect(audience.locator('iframe')).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  await context.close();
});

test('a rejected import leaves the existing deck intact', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Open presentation file').setInputFiles({
    name: 'invalid.slides',
    mimeType: 'application/zip',
    buffer: Buffer.from('not a presentation'),
  });
  await expect(page.getByLabel('Presentation title')).toHaveValue('A little more live');
  await expect(page.locator('.thumbnail-button')).toHaveCount(3);
  await expect(page.getByRole('status')).toContainText(/manifest|valid/);
});
