import { expect, it } from 'vitest';
import { visibleDemoBounds } from './geometry';
import { createSampleDeck } from '../document/sample';
import type { DemoElement } from '../document/model';

it('keeps the capture rectangle inside the public slide even for out-of-bounds imported elements', () => {
  const deck = createSampleDeck();
  const node = deck.slides[2].elements.find((n) => n.kind === 'demo') as DemoElement;
  for (const x of [-10000, -50, 0, 1200, 10000])
    for (const y of [-10000, -50, 0, 680, 10000]) {
      const rect = visibleDemoBounds({ ...node, x, y }, deck);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      if (rect.visible) {
        expect(rect.x + rect.width).toBeLessThanOrEqual(deck.width);
        expect(rect.y + rect.height).toBeLessThanOrEqual(deck.height);
      }
    }
});
