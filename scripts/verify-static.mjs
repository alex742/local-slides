import { createServer } from 'node:https';
import { readFile, writeFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { resolve, join, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist'),
  output = resolve(root, 'test-results/static');
await stat(resolve(dist, 'index.html')).catch(() => {
  throw new Error('Run npm run build before npm run test:static.');
});
await mkdir(output, { recursive: true });
const tls = await mkdtemp(join(tmpdir(), 'local-slides-tls-'));
let server, browser;
const channel = process.env.BROWSER_CHANNEL || 'chrome';
try {
  await run('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    join(tls, 'key.pem'),
    '-out',
    join(tls, 'cert.pem'),
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ]);
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.md': 'text/plain',
    '.txt': 'text/plain',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
  };
  server = createServer(
    { key: await readFile(join(tls, 'key.pem')), cert: await readFile(join(tls, 'cert.pem')) },
    async (req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url, 'https://localhost').pathname);
        if (!path.startsWith('/preview/slides/')) {
          res.writeHead(404);
          res.end();
          return;
        }
        const file = resolve(dist, path.slice('/preview/slides/'.length) || 'index.html');
        if (!file.startsWith(dist + sep)) {
          res.writeHead(403);
          res.end();
          return;
        }
        const bytes = await readFile(file);
        res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(bytes);
      } catch {
        res.writeHead(404);
        res.end();
      }
    },
  );
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const base = `https://127.0.0.1:${server.address().port}/preview/slides/`;
  browser = await chromium.launch({ channel });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage(),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  assert.equal(await page.evaluate(() => isSecureContext), true);
  await page.getByLabel('Presentation title').waitFor();
  await page.screenshot({ path: resolve(output, 'editor.png') });
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('heading', { name: 'User guide', exact: true }).waitFor();
  await page.screenshot({ path: resolve(output, 'help.png') });
  for (const [topic, heading] of [
    ['Run locally', 'Local development'],
    ['Contribute', 'Contributing'],
    ['Architecture', 'Architecture and decisions'],
  ]) {
    await page.locator('.help-nav').getByRole('button', { name: topic, exact: true }).click();
    await page.getByRole('heading', { name: heading, exact: true }).waitFor();
  }
  await page.getByRole('button', { name: 'Close help' }).click();
  const docs = [
    'index.md',
    'CONTRIBUTING.md',
    'architecture.md',
    'implementation-plan.md',
    'user-guide.md',
    'local-development.md',
    'validation.md',
  ];
  let linkCount = 0;
  for (const file of docs) {
    const url = new URL(`docs/${file}`, base);
    const response = await context.request.get(url.href);
    assert.equal(response.ok(), true, `Documentation missing: ${file}`);
    const content = await response.text();
    for (const [, target] of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const link = new URL(target, url),
        check = await context.request.get(link.href);
      assert.equal(check.ok(), true, `Broken built documentation link: ${file} -> ${target}`);
      linkCount++;
    }
  }
  const notices = await context.request.get(new URL('player/THIRD_PARTY_NOTICES.txt', base).href);
  assert.equal(notices.ok(), true);
  assert.match(await notices.text(), /Inter|Manrope/);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: /Interactive player/ }).click();
  const download = await pending;
  const htmlFile = resolve(output, 'presentation.html');
  await download.saveAs(htmlFile);
  const html = await readFile(htmlFile, 'utf8');
  assert.match(html, /third-party-notices/);
  assert.match(html, /SIL OPEN FONT|SIL Open Font|OFL-1.1/);
  const player = await context.newPage(),
    requests = [];
  player.on('request', (request) => {
    if (request.url().startsWith('http')) requests.push(request.url());
  });
  await player.goto(pathToFileURL(htmlFile).href);
  await player.locator('.player-header').waitFor();
  assert.deepEqual(requests, []);
  await page.getByRole('button', { name: 'Slide 3: Try it right here', exact: true }).click();
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await page
    .frameLocator('.demo-console-crop .live-demo-frame')
    .getByRole('textbox', { name: 'New task' })
    .waitFor();
  await page.screenshot({ path: resolve(output, 'speaker.png') });
  assert.deepEqual(errors, []);
  await browser.close();
  browser = null;
  const result = await run(
    process.execPath,
    [
      resolve(root, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--grep',
      'production demo crop',
      '--output',
      resolve(root, 'test-results/static-browser'),
    ],
    {
      cwd: root,
      env: { ...process.env, SLIDES_TEST_BASE_URL: base, SLIDES_TEST_IGNORE_TLS: '1' },
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  console.log(result.stdout);
  const summary = {
    channel,
    https: true,
    subdirectory: '/preview/slides/',
    documentationFiles: docs.length,
    builtLinks: linkCount,
    standaloneWithoutHttp: true,
    realCaptureCases: 2,
    consoleErrors: errors,
  };
  await writeFile(resolve(output, 'results.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} finally {
  await browser?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
  await rm(tls, { recursive: true, force: true });
}
