import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../experiments/capture-probe.html', import.meta.url));
const server = createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(html);
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const scenario of [
    'denial',
    'wrong-surface',
    'crop-failure',
    'stop-pending',
    'crop-pending',
  ]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#audience').click();
    const popup = await popupPromise;
    await page.evaluate((scenario) => {
      window.stopped = 0;
      const track = {
        getSettings: () => ({
          displaySurface: scenario === 'wrong-surface' ? 'monitor' : 'browser',
        }),
        stop: () => window.stopped++,
        cropTo: async () => {
          if (scenario === 'crop-pending')
            return new Promise((_resolve, reject) => (window.rejectCrop = reject));
          throw new Error('Cropping failed');
        },
      };
      const stream = { getVideoTracks: () => [track], getTracks: () => [track] };
      window.resolveCapture = null;
      Object.defineProperty(window, 'CropTarget', {
        configurable: true,
        value: { fromElement: async () => ({}) },
      });
      navigator.mediaDevices.getDisplayMedia = async () => {
        if (scenario === 'denial') throw new DOMException('Denied', 'NotAllowedError');
        if (scenario === 'stop-pending')
          return new Promise((resolve) => (window.resolveCapture = () => resolve(stream)));
        return stream;
      };
    }, scenario);
    await page.locator('#share').click();
    if (scenario === 'stop-pending') {
      await page.waitForFunction(() => !!window.resolveCapture);
      await page.locator('#stop').click();
      await page.evaluate(() => window.resolveCapture());
      await page.waitForFunction(() => window.stopped > 0);
    } else if (scenario === 'crop-pending') {
      await page.waitForFunction(() => !!window.rejectCrop);
      assert.equal(
        await popup.locator('video').evaluate((v) => v.srcObject),
        null,
        'Pending crop must never reach audience',
      );
      await page.evaluate(() => window.rejectCrop(new Error('Crop cancelled')));
      await page.waitForFunction(() => window.stopped > 0);
    } else {
      await page.waitForFunction(() =>
        /denied|Select the current|Cropping failed/.test(
          document.querySelector('#status').textContent,
        ),
      );
    }
    assert.equal(await popup.locator('video').evaluate((v) => v.srcObject), null);
    assert.ok(await popup.locator('p').isVisible());
    assert.equal(await page.evaluate(() => !!window.probe.stream), false);
    if (scenario !== 'denial')
      assert.ok((await page.evaluate(() => window.stopped)) > 0, 'Rejected tracks must be stopped');
    results.push({ scenario, passed: true });
    await context.close();
  }
  await mkdir(new URL('../test-results/capture/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../test-results/capture/failures.json', import.meta.url),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  server.close();
}
