import { uid, type Deck, type Slide, type SlideElement, type Theme } from './model';

export function duplicateElements(elements: SlideElement[], offset = 24): SlideElement[] {
  const groups = new Map<string, string>();
  return structuredClone(elements).map((node) => {
    if (node.groupId && !groups.has(node.groupId)) groups.set(node.groupId, uid());
    return {
      ...node,
      id: uid(),
      x: node.x + offset,
      y: node.y + offset,
      locked: false,
      groupId: node.groupId ? groups.get(node.groupId) : undefined,
    };
  });
}
export function duplicateSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: uid(),
    name: `${slide.name} copy`,
    elements: duplicateElements(slide.elements, 0),
  };
}
export function expandedSelection(slide: Slide, ids: string[]): string[] {
  const groups = new Set(
    slide.elements
      .filter((node) => ids.includes(node.id) && node.groupId)
      .map((node) => node.groupId),
  );
  return slide.elements
    .filter((node) => ids.includes(node.id) || (node.groupId && groups.has(node.groupId)))
    .map((node) => node.id);
}
export function bounds(node: SlideElement) {
  const angle = (node.rotation * Math.PI) / 180;
  const width = Math.abs(node.width * Math.cos(angle)) + Math.abs(node.height * Math.sin(angle));
  const height = Math.abs(node.width * Math.sin(angle)) + Math.abs(node.height * Math.cos(angle));
  return {
    x: node.x + node.width / 2 - width / 2,
    y: node.y + node.height / 2 - height / 2,
    width,
    height,
  };
}
export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export function alignElements(
  slide: Slide,
  ids: string[],
  alignment: Alignment,
  deck: Pick<Deck, 'width' | 'height'>,
): Slide {
  const selected = slide.elements.filter((node) => ids.includes(node.id) && !node.locked);
  if (!selected.length) return slide;
  const boxes = selected.map(bounds);
  const region =
    selected.length === 1
      ? { x: 0, y: 0, width: deck.width, height: deck.height }
      : {
          x: Math.min(...boxes.map((b) => b.x)),
          y: Math.min(...boxes.map((b) => b.y)),
          width: Math.max(...boxes.map((b) => b.x + b.width)) - Math.min(...boxes.map((b) => b.x)),
          height:
            Math.max(...boxes.map((b) => b.y + b.height)) - Math.min(...boxes.map((b) => b.y)),
        };
  return {
    ...slide,
    elements: slide.elements.map((node) => {
      if (!selected.includes(node)) return node;
      const box = bounds(node);
      let x = node.x,
        y = node.y;
      if (alignment === 'left') x += region.x - box.x;
      if (alignment === 'center') x += region.x + region.width / 2 - box.x - box.width / 2;
      if (alignment === 'right') x += region.x + region.width - box.x - box.width;
      if (alignment === 'top') y += region.y - box.y;
      if (alignment === 'middle') y += region.y + region.height / 2 - box.y - box.height / 2;
      if (alignment === 'bottom') y += region.y + region.height - box.y - box.height;
      return { ...node, x, y };
    }),
  };
}
export function distributeElements(slide: Slide, ids: string[], axis: 'x' | 'y'): Slide {
  const selected = slide.elements
    .filter((node) => ids.includes(node.id) && !node.locked)
    .sort((a, b) => bounds(a)[axis] - bounds(b)[axis]);
  if (selected.length < 3) return slide;
  const dim = axis === 'x' ? 'width' : 'height';
  const first = bounds(selected[0]);
  const last = bounds(selected.at(-1)!);
  const gap =
    (last[axis] +
      last[dim] -
      first[axis] -
      selected.reduce((sum, node) => sum + bounds(node)[dim], 0)) /
    (selected.length - 1);
  let cursor = first[axis];
  const positions = new Map<string, number>();
  for (const node of selected) {
    const box = bounds(node);
    positions.set(node.id, node[axis] + cursor - box[axis]);
    cursor += box[dim] + gap;
  }
  return {
    ...slide,
    elements: slide.elements.map((node) =>
      positions.has(node.id) ? { ...node, [axis]: positions.get(node.id)! } : node,
    ),
  };
}
export function changeTheme(deck: Deck, theme: Theme): Deck {
  const old = deck.theme;
  const palette = new Map([
    [old.background, theme.background],
    [old.foreground, theme.foreground],
    [old.accent, theme.accent],
    [old.soft, theme.soft],
    [old.muted, theme.muted],
  ]);
  return {
    ...deck,
    theme,
    slides: deck.slides.map((slide) => ({
      ...slide,
      background: palette.get(slide.background) || slide.background,
      elements: slide.elements.map((node) =>
        node.kind === 'shape'
          ? {
              ...node,
              fill: palette.get(node.fill) || node.fill,
              stroke: palette.get(node.stroke) || node.stroke,
            }
          : node.kind === 'text' && node.color
            ? { ...node, color: palette.get(node.color) || node.color }
            : node,
      ),
    })),
  };
}
