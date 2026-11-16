import { test, expect, type Page } from '@playwright/test';

async function blank(page: Page) {
  await page.goto('./');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'File menu' }).click();
  await page.getByRole('menuitem', { name: 'New presentation', exact: true }).click();
  await expect(page.getByLabel('Presentation title')).toHaveValue('Untitled presentation');
}

test('creates slides and rich text, groups text edits, and preserves coordinates across zoom', async ({
  page,
}) => {
  await blank(page);
  await page.getByRole('button', { name: 'New slide', exact: true }).click();
  await expect(page.locator('.thumbnail-button')).toHaveCount(2);
  await page.getByRole('button', { name: 'Text', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Edit slide text' });
  await expect(text).toBeVisible();
  await text.fill('A presentation worth sharing');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await page.getByRole('button', { name: 'Select objects', exact: true }).click();
  const selected = page.locator('.editor-canvas [data-element-id].is-selected');
  const position = await selected.getAttribute('style');
  await page.getByLabel('Canvas zoom').selectOption('1');
  expect(await selected.getAttribute('style')).toBe(position);
  await page.getByRole('button', { name: 'Fit slide to canvas' }).click();
  await expect(selected).toContainText('A presentation worth sharing');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.editor-canvas')).not.toContainText('A presentation worth sharing');
});

test('a multi-frame drag is one undo step and resize changes logical dimensions', async ({
  page,
}) => {
  await blank(page);
  await page.getByRole('button', { name: 'Insert shape' }).click();
  await page.getByRole('menuitem', { name: 'Rectangle', exact: true }).click();
  const shape = page.locator('.editor-canvas [data-kind=shape]');
  await expect(shape).toHaveCount(1);
  const original = await shape.getAttribute('style');
  const box = (await shape.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 + 35, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => shape.getAttribute('style')).not.toBe(original);
  expect(
    Math.abs(
      Number(await page.getByLabel('X position').inputValue()) - 440 - 65 / (box.width / 340),
    ),
  ).toBeLessThan(2);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(shape).toHaveAttribute('style', original!);
  await shape.click();
  const width = Number(await page.getByLabel('Width', { exact: true }).inputValue());
  const handle = page.locator('.editor-canvas .moveable-control[data-direction=se]');
  await expect(handle).toBeVisible();
  const corner = (await handle.boundingBox())!;
  await page.mouse.move(corner.x + corner.width / 2, corner.y + corner.height / 2);
  await page.mouse.down();
  await page.mouse.move(corner.x + corner.width / 2 + 45, corner.y + corner.height / 2 + 30, {
    steps: 8,
  });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await page.getByLabel('Width', { exact: true }).inputValue()))
    .toBeGreaterThan(width);
  await page.getByLabel('Rotation', { exact: true }).fill('25');
  await page.getByLabel('Rotation', { exact: true }).blur();
  await expect(shape).toHaveAttribute('style', /rotate\(25deg\)/);
});

test('groups and duplicates layers, locks geometry, and manages slides and themes', async ({
  page,
}) => {
  await blank(page);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const rows = page.locator('.layer-row');
  await rows.nth(0).click();
  await rows.nth(1).click({ modifiers: ['Shift'] });
  await page.getByRole('button', { name: 'Arrange', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Group', exact: true }).click();
  await rows.nth(0).click();
  await expect(page.locator('.toolbar-right')).toContainText('2 objects selected');
  await page.getByRole('button', { name: 'Duplicate selected objects' }).click();
  await expect(rows).toHaveCount(4);
  await page.getByRole('button', { name: 'Lock or unlock selected layers' }).click();
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(
    page
      .locator('.inspector')
      .getByRole('button', { name: 'Delete selected objects', exact: true }),
  ).toBeDisabled();
  await page.locator('.canvas-heading').click();
  await page.locator('.editor-canvas').click({ position: { x: 5, y: 5 } });
  await page.getByRole('button', { name: 'Apply Midnight theme' }).click();
  await expect(page.locator('.editor-canvas .slide-artboard')).toHaveCSS(
    'background-color',
    'rgb(24, 37, 45)',
  );
  await page.getByRole('button', { name: 'Options for slide 1' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate slide', exact: true }).click();
  await expect(page.locator('.thumbnail-button')).toHaveCount(2);
  await page.getByRole('button', { name: 'Options for slide 2' }).click();
  await page.getByRole('menuitem', { name: 'Delete slide', exact: true }).click();
  await expect(page.locator('.thumbnail-button')).toHaveCount(1);
});

test('inserts local image assets and renders a polished starting deck', async ({ page }, info) => {
  await page.goto('./');
  await page.getByLabel('Upload image', { exact: true }).setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1XkAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('.editor-canvas [data-kind=image] img')).toBeVisible();
  await expect(page.getByLabel('Image fit')).toHaveValue('contain');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.locator('.editor-canvas').click({ position: { x: 3, y: 3 } });
  await page.screenshot({ path: info.outputPath('editor.png'), fullPage: true });
});
