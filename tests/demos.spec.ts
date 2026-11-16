import { test, expect } from '@playwright/test';
import { createSampleDeck } from '../src/document/sample';
import { encodeDeck } from '../src/files/native';

test('authors, previews, interacts, resets, and applies an isolated HTML/CSS/JS demo', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Slide 3: Try it right here', exact: true }).click();
  await page.getByRole('button', { name: 'Live demo', exact: false }).click();
  const dialog = page.locator('.demo-editor-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await page.getByLabel('Demo name', { exact: true }).fill('A working counter');
  await page
    .getByLabel('HTML source')
    .fill('<button id="count">Count: 0</button><p id="isolation"></p>');
  await page.getByRole('button', { name: 'CSS', exact: true }).click();
  await page
    .getByLabel('CSS source')
    .fill(
      'body { background: #e9e3fc; padding: 30px; font: 22px system-ui } button { padding: 15px }',
    );
  await page.getByRole('button', { name: 'JavaScript', exact: true }).click();
  await page
    .getByLabel('JS source')
    .fill(
      "let n=0;document.querySelector('#count').onclick=()=>document.querySelector('#count').textContent='Count: '+(++n);try{parent.document.body.dataset.injection='bad'}catch{document.querySelector('#isolation').textContent='Isolated from the editor'}",
    );
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Interact with demo', exact: true }).click();
  const frame = page.frameLocator('.demo-editor-dialog .live-demo-frame');
  await expect(frame.locator('#isolation')).toHaveText('Isolated from the editor');
  await frame.locator('#count').click();
  await frame.locator('#count').click();
  await expect(frame.locator('#count')).toHaveText('Count: 2');
  expect(await page.evaluate(() => document.body.dataset.injection)).toBeUndefined();
  await page.getByRole('button', { name: 'Reset preview', exact: true }).click();
  await expect(frame.locator('#count')).toHaveText('Count: 0');
  await page.getByLabel('JS source').fill("throw new Error('A useful demo error')");
  await expect(page.getByRole('alert')).toContainText('A useful demo error');
  await page
    .getByLabel('JS source')
    .fill("document.querySelector('#count').textContent='Ready to present';");
  await expect(frame.locator('#count')).toHaveText('Ready to present');
  await page.getByRole('button', { name: 'Apply to slide', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.editor-canvas .demo-poster')).toContainText('A working counter');
  await page.getByRole('button', { name: 'Edit & preview demo', exact: true }).click();
  await expect(page.getByLabel('Demo name', { exact: true })).toHaveValue('A working counter');
  await page.getByLabel('Demo name', { exact: true }).fill('Discard this edit');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.editor-canvas .demo-poster')).toContainText('A working counter');
});

test('previews an external website and keeps an external-link fallback', async ({ page }) => {
  let actions = 0;
  await page.route('https://demo.local-slides.test/**', async (route) => {
    if (route.request().url().endsWith('/action')) {
      actions++;
      await route.fulfill({
        body: String(actions),
        headers: { 'access-control-allow-origin': '*' },
      });
    } else
      await route.fulfill({
        contentType: 'text/html',
        body: '<button id="action">Try the app</button><p id="result"></p><script>document.querySelector("#action").onclick=async()=>document.querySelector("#result").textContent=await(await fetch("/action")).text();</script>',
      });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Live demo', exact: false }).click();
  await page.getByRole('button', { name: 'Website', exact: true }).click();
  await page.getByLabel('Website address').fill('https://demo.local-slides.test');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Interact with demo', exact: true }).click();
  await page.frameLocator('.live-demo-frame').locator('#action').click();
  await expect(page.frameLocator('.live-demo-frame').locator('#result')).toHaveText('1');
  expect(actions).toBe(1);
  await expect(page.getByRole('link', { name: 'Open website in a new tab' })).toHaveAttribute(
    'href',
    'https://demo.local-slides.test/',
  );
  await page.getByRole('button', { name: 'Stop preview' }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByLabel('Website address').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('HTTP or HTTPS');
});

test('imported rich text and demo source do not execute in the editor', async ({ page }) => {
  const deck = createSampleDeck();
  const text = deck.slides[0].elements.find((n) => n.kind === 'text')!;
  if (text.kind === 'text')
    text.html =
      '<p style="position:fixed;top:0">A safe title</p><img src=x onerror="document.body.dataset.injection=\'bad\'"><script>document.body.dataset.injection="bad"</script>';
  const demo = deck.slides[2].elements.find((n) => n.kind === 'demo')!;
  if (demo.kind === 'demo') demo.js = 'parent.document.body.dataset.injection="bad"';
  await page.goto('./');
  await page.getByLabel('Open presentation file').setInputFiles({
    name: 'source.slides',
    mimeType: 'application/zip',
    buffer: Buffer.from(await encodeDeck(deck)),
  });
  await expect(page.locator('.editor-canvas')).toContainText('A safe title');
  await expect(page.locator('.editor-canvas img')).toHaveCount(0);
  await expect(page.locator('.editor-canvas script')).toHaveCount(0);
  await expect(page.locator('.editor-canvas .slide-text p').first()).not.toHaveAttribute(
    'style',
    /position/,
  );
  await page.getByRole('button', { name: 'Slide 3: Try it right here', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.dataset.injection)).toBeUndefined();
});
