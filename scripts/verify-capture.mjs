import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const probe = resolve(root, 'experiments/capture-probe.html');
const output = resolve(root, 'test-results/capture');
await mkdir(output, { recursive: true });
let actions = 0;
const external = `<!doctype html><html><style>body{margin:0;padding:30px;background:#0d7e64;color:white;font:20px system-ui}button{padding:15px;font:inherit}</style><h1>External demo instance</h1><button id="action">Send action</button><p id="result">No actions</p><script>document.querySelector('#action').onclick=async()=>{const r=await fetch('/action',{method:'POST'});document.querySelector('#result').textContent='Actions: '+await r.text();};</script></html>`;
async function server(handler) {
  const s = createServer(handler);
  await new Promise((res, reject) => {
    s.once('error', reject);
    s.listen(0, '127.0.0.1', res);
  });
  return s;
}
const demoServer = await server((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/action') {
    actions++;
    res.end(String(actions));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end(external);
  }
});
const appServer = await server(async (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(await readFile(probe));
});
const origin = `http://127.0.0.1:${appServer.address().port}`;
const demoOrigin = `http://127.0.0.1:${demoServer.address().port}`;
const results = [];

async function videoPixels(popup) {
  return popup.evaluate(() => {
    const v = document.querySelector('video');
    if (!v || v.hidden || !v.videoWidth || v.readyState < 2) return null;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const cx = c.getContext('2d');
    cx.drawImage(v, 0, 0);
    const pixels = cx.getImageData(0, 0, c.width, c.height).data;
    let pink = 0,
      green = 0,
      hash = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
      if (r > 230 && g < 90 && b > 135 && b < 195) pink++;
      if (r < 30 && g > 95 && g < 155 && b > 70 && b < 130) green++;
      hash = ((hash << 5) - hash + r * 3 + g * 5 + b * 7) | 0;
    }
    return { width: c.width, height: c.height, pink, green, hash };
  });
}
async function eventually(fn, label, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await fn();
    if (result) return result;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out: ${label}`);
}

try {
  for (const channel of (process.env.CAPTURE_CHANNELS || 'chrome,msedge').split(',')) {
    const browser = await chromium.launch({
      channel,
      headless: process.env.CAPTURE_HEADLESS === '1',
      args: [
        '--auto-accept-this-tab-capture',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    });
    try {
      for (const [scheme, url] of [
        ['localhost', origin],
        ['file', pathToFileURL(probe).href],
      ].filter(
        ([scheme]) => !process.env.CAPTURE_SCHEME || scheme === process.env.CAPTURE_SCHEME,
      )) {
        const context = await browser.newContext({
          viewport: { width: 1200, height: 900 },
          deviceScaleFactor: 1,
          permissions: ['local-network-access'],
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on('pageerror', (error) =>
          console.error(`${channel}/${scheme} page error:`, error.message),
        );
        page.on('console', (message) => {
          if (message.type() === 'error')
            console.error(`${channel}/${scheme} console:`, message.text());
        });
        page.on('crash', () => console.error(`${channel}/${scheme}: source crashed`));
        page.on('requestfailed', (r) =>
          console.error(
            `${channel}/${scheme} request failed: ${r.url()} ${r.failure()?.errorText}`,
          ),
        );
        console.log(`Checking ${channel} ${browser.version()} ${scheme}`);
        const row = { channel, version: browser.version(), scheme, assertions: [] };
        await page.goto(url);
        const capabilities = await page.evaluate(() => ({
          secure: isSecureContext,
          capture: !!navigator.mediaDevices?.getDisplayMedia,
          crop: !!window.CropTarget,
        }));
        assert.ok(
          capabilities.secure && capabilities.capture && capabilities.crop,
          JSON.stringify(capabilities),
        );
        row.assertions.push('Capture and crop APIs available');
        const popupPromise = page.waitForEvent('popup');
        await page.locator('#audience').click();
        const popup = await popupPromise;
        await popup.waitForLoadState();
        assert.equal(await popup.locator('iframe').count(), 0);
        row.assertions.push('Audience contains no second app instance');
        await page.bringToFront();
        await page.locator('#share').click();
        await eventually(async () => {
          const status = await page.locator('#status').textContent();
          if (
            /unavailable|cancelled|denied|Select the current|not supported|Could not|not allowed/i.test(
              status,
            )
          )
            throw new Error(status);
          return status.includes('Mirroring ready');
        }, 'capture starts');
        const first = await eventually(() => videoPixels(popup), 'video frame').catch(
          async (error) => {
            console.error(
              'Source track',
              await page.evaluate(() =>
                window.probe.stream
                  ?.getVideoTracks()
                  .map((t) => ({ state: t.readyState, muted: t.muted, settings: t.getSettings() })),
              ),
            );
            console.error(
              'Audience video',
              await popup.locator('video').evaluate((v) => ({
                width: v.videoWidth,
                height: v.videoHeight,
                paused: v.paused,
                ready: v.readyState,
                error: v.error?.message,
                stream: !!v.srcObject,
              })),
            );
            throw error;
          },
        );
        assert.equal(first.pink, 0, 'Private pink area leaked into capture');
        assert.ok(first.green > first.width * first.height * 0.5, 'Demo should fill the capture');
        assert.ok(
          Math.abs(first.width / first.height - 640 / 360) < 0.05,
          'Crop matches demo proportions',
        );
        row.assertions.push('Actual cropped video excludes private notes');
        const frame = page.frameLocator('#demo');
        await frame.locator('#count').click();
        await frame.locator('#count').click();
        assert.equal(await frame.locator('#count').textContent(), 'Count: 2');
        await frame.locator('input').fill('A live demo');
        await frame.locator('#later').click();
        await eventually(
          async () => (await frame.locator('#async').textContent()) === 'Async complete',
          'async demo action',
        );
        const changed = await eventually(async () => {
          const p = await videoPixels(popup);
          return p && p.hash !== first.hash ? p : null;
        }, 'video changes');
        assert.equal(changed.pink, 0);
        row.assertions.push('Click, input, and async changes reach live output');
        await frame.locator('footer').scrollIntoViewIfNeeded();
        await eventually(async () => {
          const p = await videoPixels(popup);
          return p && p.hash !== changed.hash;
        }, 'scroll reaches video');
        row.assertions.push('Scrolling updates video');
        const beforeResize = await videoPixels(popup);
        await page.evaluate(() => {
          const stage = document.querySelector('#stage');
          stage.style.width = '520px';
          stage.style.height = '292px';
        });
        await eventually(async () => {
          const p = await videoPixels(popup);
          return p && p.hash !== beforeResize.hash && p.pink === 0;
        }, 'resize stays cropped');
        row.assertions.push('Resize retains the crop');
        await page.locator('#stop').click();
        assert.equal(await popup.locator('video').evaluate((v) => v.srcObject), null);
        assert.equal(await popup.locator('p').textContent(), 'Demo paused');
        row.assertions.push('Stop clears media and restores poster');
        console.log(
          `${channel}/${scheme}: crop, interaction, resize, and stop passed; loading external demo`,
        );
        await page.locator('#url').fill(demoOrigin);
        await page.locator('#external').click();
        await page.screenshot({
          path: resolve(output, `${channel}-${scheme}-external-loading.png`),
        });
        await page.frameLocator('#demo').locator('#action').waitFor({ state: 'visible' });
        await page.locator('#share').click();
        await eventually(
          async () => (await page.locator('#status').textContent()).includes('Mirroring ready'),
          'restart capture',
        );
        const before = actions;
        await page.frameLocator('#demo').locator('#action').click();
        await eventually(
          async () =>
            (await page.frameLocator('#demo').locator('#result').textContent()).includes(
              `Actions: ${before + 1}`,
            ),
          'external request',
        );
        assert.equal(actions, before + 1);
        assert.equal(await popup.locator('iframe').count(), 0);
        row.assertions.push('Cross-origin demo sends one network action');
        await page.screenshot({ path: resolve(output, `${channel}-${scheme}-speaker.png`) });
        await popup.screenshot({ path: resolve(output, `${channel}-${scheme}-audience.png`) });
        await popup.close();
        const nextPopupPromise = page.waitForEvent('popup');
        await page.locator('#audience').click();
        const nextPopup = await nextPopupPromise;
        await eventually(
          () => videoPixels(nextPopup),
          'reconnected audience receives cropped stream',
        );
        row.assertions.push('Audience window can reconnect');
        await page.locator('#stop').click();
        results.push(row);
        console.log(JSON.stringify(row));
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
} finally {
  appServer.close();
  demoServer.close();
  await writeFile(
    resolve(output, 'results.json'),
    JSON.stringify({ platform: process.platform, results }, null, 2),
  );
}
