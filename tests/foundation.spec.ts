import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

test('loads the shared renderer and navigates without running demo code', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByLabel('Presentation title')).toHaveValue('A little more live');
  await expect(page.locator('.slide-rail .thumbnail-button')).toHaveCount(3);
  await page.getByRole('button', { name: 'Slide 3: Try it right here', exact: true }).click();
  await expect(page.locator('.canvas-area .demo-poster')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('opens Help and follows repository guide links while preserving the presentation', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User guide', exact: true })).toBeVisible();
  await page.locator('.help-nav').getByRole('button', { name: 'Run locally', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Local development', exact: true })).toBeVisible();
  await page.locator('.help-nav').getByRole('button', { name: 'Contribute', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Contributing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close help' }).click();
  await expect(page.getByLabel('Presentation title')).toHaveValue('A little more live');
});

test('exports a portable deck, a raster PDF, and a single-file HTML player', async ({
  page,
  browser,
}, testInfo) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('./');
  for (const [label, extension] of [
    ['Editable deck', '.slides'],
    ['PDF document', '.pdf'],
    ['Interactive player', '.html'],
  ]) {
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: new RegExp(label) }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\${extension}$`));
    const path = testInfo.outputPath(`export${extension}`);
    await download.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.length).toBeGreaterThan(1000);
    if (extension === '.pdf') {
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(3);
      for (const page of pdf.getPages())
        expect(page.getWidth() / page.getHeight()).toBeCloseTo(16 / 9, 5);
    }
    if (extension === '.slides') {
      await page.getByLabel('Presentation title').fill('Changed title');
      await page
        .getByLabel('Open presentation file')
        .setInputFiles({ name: 'roundtrip.slides', mimeType: 'application/zip', buffer: bytes });
      await expect(page.getByLabel('Presentation title')).toHaveValue('A little more live');
    }
    if (extension === '.html') {
      const context = await browser.newContext();
      const player = await context.newPage();
      const errors: string[] = [];
      player.on('pageerror', (error) => errors.push(error.message));
      const requests: string[] = [];
      player.on('request', (request) => {
        if (request.url().startsWith('http')) requests.push(request.url());
      });
      await player.goto(`file://${path}`);
      await expect(player.locator('.player-header')).toContainText('A little more live');
      await player.getByRole('button', { name: 'Next slide' }).click();
      await expect(player.locator('.player-navigation')).toContainText('2 / 3');
      expect(requests).toEqual([]);
      expect(errors).toEqual([]);
      await context.close();
    }
  }
});
