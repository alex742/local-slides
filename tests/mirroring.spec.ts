import { test, expect } from '@playwright/test';

test.use({
  headless: false,
  viewport: null,
  launchOptions: {
    args: [
      '--auto-accept-this-tab-capture',
      '--start-maximized',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  },
});
for (const standalone of [false, true])
  test(`mirrors the production demo crop${standalone ? ' from a standalone HTML file' : ''}, protects notes, and resumes`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    await page.addInitScript(() => {
      const capture = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      Object.assign(window, { captureCalls: 0 });
      navigator.mediaDevices.getDisplayMedia = (options) => {
        (window as unknown as { captureCalls: number }).captureCalls++;
        return capture(options);
      };
    });
    await page.goto('./');
    if (standalone) {
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const pending = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: /Interactive player/ }).click();
      const download = await pending;
      const path = info.outputPath('mirrored-player.html');
      await download.saveAs(path);
      await page.goto(`file://${path}`);
      await page.getByRole('button', { name: 'Next slide', exact: true }).click();
      await page.getByRole('button', { name: 'Next slide', exact: true }).click();
      await page.getByRole('button', { name: 'Speaker view', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Slide 3: Try it right here', exact: true }).click();
      await page.getByRole('button', { name: 'Present', exact: true }).click();
    }
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Open audience', exact: true }).click();
    const audience = await popupPromise;
    await page.bringToFront();
    await page
      .locator('.speaker-sidebar')
      .evaluate((element) => ((element as HTMLElement).style.backgroundColor = '#fc37a2'));
    await page.getByRole('button', { name: 'Share demo', exact: true }).click();
    const video = audience.locator('video');
    await expect(video).toBeVisible();
    await expect
      .poll(() => video.evaluate((v) => (v as HTMLVideoElement).videoWidth))
      .toBeGreaterThan(0);
    const pixels = await video.evaluate((element) => {
      const v = element as HTMLVideoElement;
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let pink = 0;
      for (let i = 0; i < data.length; i += 4)
        if (data[i] > 230 && data[i + 1] < 90 && data[i + 2] > 135 && data[i + 2] < 195) pink++;
      return { pink, ratio: c.width / c.height };
    });
    expect(pixels.pink).toBe(0);
    expect(pixels.ratio).toBeCloseTo(572 / 590, 1);
    await expect(audience.locator('body')).not.toContainText('Start demo sharing');
    await expect(audience.locator('iframe')).toHaveCount(0);
    const frame = page.frameLocator('.live-demo-frame');
    await frame.getByRole('textbox', { name: 'New task' }).fill('One live app instance');
    await expect(frame.getByRole('textbox', { name: 'New task' })).toHaveValue(
      'One live app instance',
    );
    await frame.getByRole('button', { name: /Add task/ }).click();
    await expect(frame.locator('#tasks label')).toHaveCount(4);
    if (!standalone) {
      await page.getByRole('button', { name: 'Capture demo poster', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Poster captured');
      await expect(frame.locator('#tasks label')).toHaveCount(4);
    }
    await page.getByRole('button', { name: 'Open help', exact: true }).click();
    await expect(audience.locator('video')).toHaveCount(0);
    await page.getByRole('button', { name: 'Close help' }).click();
    await expect(audience.locator('video')).toBeVisible();
    await expect(frame.locator('#tasks label')).toHaveCount(4);
    await page.getByRole('button', { name: 'Previous slide', exact: true }).click();
    await expect(audience.locator('video')).toHaveCount(0);
    await page.getByRole('button', { name: 'Next slide', exact: true }).click();
    await expect(audience.locator('video')).toBeVisible();
    await expect
      .poll(() => audience.locator('video').evaluate((v) => (v as HTMLVideoElement).videoWidth))
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(() => (window as unknown as { captureCalls: number }).captureCalls),
    ).toBe(1);
    await page.screenshot({ path: info.outputPath('speaker.png') });
    await audience.screenshot({ path: info.outputPath('audience.png') });
    await page.getByRole('button', { name: 'Stop sharing', exact: true }).click();
    await expect(audience.locator('video')).toHaveCount(0);
    await expect(
      audience.locator(standalone ? '.demo-poster' : '.demo-poster-image'),
    ).toBeVisible();
    if (!standalone) {
      await page.getByRole('button', { name: 'Back to editor', exact: true }).click();
      await expect(page.locator('.editor-canvas .demo-poster-image')).toBeVisible();
    }
  });
