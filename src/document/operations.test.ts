import { describe, expect, it } from 'vitest';
import { createSampleDeck } from './sample';
import {
  alignElements,
  bounds,
  changeTheme,
  distributeElements,
  duplicateSlide,
  expandedSelection,
} from './operations';
import { themes } from './model';

describe('editor operations', () => {
  it('duplicates slides with new IDs while preserving group relationships', () => {
    const slide = createSampleDeck().slides[0];
    slide.elements[0].groupId = 'original';
    slide.elements[1].groupId = 'original';
    const copy = duplicateSlide(slide);
    expect(copy.id).not.toBe(slide.id);
    expect(copy.elements[0].id).not.toBe(slide.elements[0].id);
    expect(copy.elements[0].groupId).toBe(copy.elements[1].groupId);
    expect(copy.elements[0].groupId).not.toBe('original');
    expect(expandedSelection(copy, [copy.elements[0].id])).toHaveLength(2);
  });
  it('aligns a rotated element using its visible bounding box', () => {
    const deck = createSampleDeck();
    const slide = deck.slides[0];
    const node = slide.elements.at(-2)!;
    const aligned = alignElements(slide, [node.id], 'right', deck).elements.find(
      (n) => n.id === node.id,
    )!;
    expect(bounds(aligned).x + bounds(aligned).width).toBeCloseTo(deck.width);
  });
  it('distributes objects with equal gaps and leaves locked objects untouched', () => {
    const slide = createSampleDeck().slides[0];
    slide.elements = slide.elements
      .slice(0, 3)
      .map((n, i) => ({ ...n, x: i * 300, width: 100, rotation: 0 }));
    slide.elements[1].x = 110;
    const ids = slide.elements.map((n) => n.id);
    const result = distributeElements(slide, ids, 'x');
    expect(result.elements.map((n) => n.x)).toEqual([0, 300, 600]);
    slide.elements[1].locked = true;
    expect(distributeElements(slide, ids, 'x')).toBe(slide);
  });
  it('updates theme colors while preserving a custom background', () => {
    const deck = createSampleDeck();
    deck.slides[0].background = '#123456';
    const next = changeTheme(deck, themes[1]);
    expect(next.slides[0].background).toBe('#123456');
    expect(next.slides[1].background).toBe(themes[1].background);
    expect(next.theme).toBe(themes[1]);
  });
});
