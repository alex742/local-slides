import { describe, expect, it } from 'vitest';
import { begin, commit, createHistory, finish, redo, undo } from './history';
import { createSampleDeck } from './sample';

describe('document history', () => {
  it('groups a continuous gesture into one undo step and preserves the original geometry', () => {
    const original = createSampleDeck();
    let h = begin(createHistory(original));
    for (const x of [100, 110, 120])
      h = commit(h, {
        ...h.present,
        slides: h.present.slides.map((s, i) =>
          i ? s : { ...s, elements: s.elements.map((n, j) => (j ? n : { ...n, x })) },
        ),
      });
    h = finish(h);
    expect(h.past).toHaveLength(1);
    expect(undo(h).present).toBe(original);
    expect(redo(undo(h)).present).toBe(h.present);
  });
  it('discards the redo branch when a new edit follows undo', () => {
    const original = createSampleDeck();
    let h = commit(createHistory(original), { ...original, title: 'Changed' });
    h = commit(undo(h), { ...original, title: 'A new direction' });
    expect(h.future).toHaveLength(0);
    expect(redo(h).present.title).toBe('A new direction');
  });
  it('does not add an empty transaction to undo', () => {
    const h = finish(begin(createHistory(createSampleDeck())));
    expect(h.past).toHaveLength(0);
  });
});
