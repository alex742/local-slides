import type { Deck, DemoElement } from '../document/model';

export function visibleDemoBounds(
  demo: DemoElement | undefined,
  deck: Pick<Deck, 'width' | 'height'>,
) {
  if (!demo) return { x: 0, y: 0, width: 1, height: 1, visible: false };
  const x = Math.max(0, Math.min(deck.width, demo.x)),
    y = Math.max(0, Math.min(deck.height, demo.y));
  const width = Math.max(0, Math.min(deck.width, demo.x + demo.width) - x),
    height = Math.max(0, Math.min(deck.height, demo.y + demo.height) - y);
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    visible: width > 1 && height > 1,
  };
}
