import {
  baseElement,
  newSlide,
  newText,
  uid,
  type Asset,
  type SlideElement,
  type Theme,
} from '../document/model';
import {
  alignElements,
  changeTheme,
  distributeElements,
  duplicateElements,
  duplicateSlide,
} from '../document/operations';
import { useEditor } from '../document/store';
import { defaultDemo } from '../document/sample';

export function currentEditor() {
  const state = useEditor.getState(),
    deck = state.history.present;
  const slide = deck.slides.find((s) => s.id === state.slideId) || deck.slides[0];
  return {
    state,
    deck,
    slide,
    selected: slide.elements.filter((n) => state.selectedIds.includes(n.id)),
  };
}
function insert(node: SlideElement, asset?: Asset) {
  const { state, slide } = currentEditor();
  state.change((deck) => ({
    ...deck,
    assets: asset ? { ...deck.assets, [asset.id]: asset } : deck.assets,
    slides: deck.slides.map((s) =>
      s.id === slide.id ? { ...s, elements: [...s.elements, node] } : s,
    ),
  }));
  state.select([node.id]);
  return node;
}
export const commands = {
  addText: () => {
    const node = insert(newText('A fresh idea', 150, 190, 780, 135));
    useEditor.getState().editText(node.id);
  },
  addShape: (shape: 'rectangle' | 'ellipse' | 'line') => {
    const { deck } = currentEditor();
    insert({
      ...baseElement(440, 250, shape === 'line' ? 400 : 340, shape === 'line' ? 10 : 220),
      kind: 'shape',
      shape,
      fill: deck.theme.accent,
      stroke: deck.theme.accent,
      strokeWidth: shape === 'line' ? 4 : 0,
      radius: shape === 'rectangle' ? 16 : 0,
    });
  },
  addDemo: () => {
    const { slide } = currentEditor();
    if (slide.elements.some((n) => n.kind === 'demo'))
      throw new Error('Each slide supports one live demo. Add another slide for a second demo.');
    return insert({
      ...baseElement(570, 95, 620, 530),
      kind: 'demo',
      mode: 'authored',
      title: 'A live moment',
      ...defaultDemo,
      url: '',
      rotation: 0,
    });
  },
  addImage: (asset: Asset) =>
    insert(
      {
        ...baseElement(350, 170, 580, 380),
        kind: 'image',
        assetId: asset.id,
        fit: 'contain',
        alt: asset.name,
      },
      asset,
    ),
  addSlide: (layout = 'title') => {
    const { deck, slide, state } = currentEditor();
    const next = newSlide(deck.theme, layout);
    const index = deck.slides.indexOf(slide);
    state.change((d) => ({
      ...d,
      slides: [...d.slides.slice(0, index + 1), next, ...d.slides.slice(index + 1)],
    }));
    state.goToSlide(next.id);
  },
  duplicateSlide: (id?: string) => {
    const { deck, slide, state } = currentEditor();
    const source = deck.slides.find((s) => s.id === (id || slide.id))!;
    const next = duplicateSlide(source);
    const index = deck.slides.indexOf(source);
    state.change((d) => ({
      ...d,
      slides: [...d.slides.slice(0, index + 1), next, ...d.slides.slice(index + 1)],
    }));
    state.goToSlide(next.id);
  },
  deleteSlide: (id?: string) => {
    const { deck, slide, state } = currentEditor();
    if (deck.slides.length === 1) return;
    const target = id || slide.id;
    const index = deck.slides.findIndex((s) => s.id === target);
    state.change((d) => ({ ...d, slides: d.slides.filter((s) => s.id !== target) }));
    if (slide.id === target) state.goToSlide(deck.slides[Math.max(0, index - 1)].id);
  },
  moveSlide: (id: string, target: string) => {
    const { state, deck } = currentEditor();
    if (id === target) return;
    const item = deck.slides.find((s) => s.id === id);
    if (!item) return;
    const next = deck.slides.filter((s) => s.id !== id);
    next.splice(
      deck.slides.findIndex((s) => s.id === target),
      0,
      item,
    );
    state.change((d) => ({ ...d, slides: next }));
  },
  duplicate: () => {
    const { selected, state } = currentEditor();
    if (!selected.length || selected.some((n) => n.kind === 'demo')) return;
    const clones = duplicateElements(selected);
    state.changeSlide((s) => ({ ...s, elements: [...s.elements, ...clones] }));
    state.select(clones.map((n) => n.id));
  },
  delete: () => {
    const { selected, state } = currentEditor();
    const ids = selected.filter((n) => !n.locked).map((n) => n.id);
    if (!ids.length) return;
    state.changeSlide((s) => ({ ...s, elements: s.elements.filter((n) => !ids.includes(n.id)) }));
    state.select(selected.filter((n) => n.locked).map((n) => n.id));
  },
  group: () => {
    const { selected, state } = currentEditor();
    if (selected.length < 2 || selected.some((n) => n.locked)) return;
    state.updateElements(
      selected.map((n) => n.id),
      { groupId: uid() },
    );
  },
  ungroup: () => {
    const { selected, state } = currentEditor();
    state.updateElements(
      selected.filter((n) => !n.locked).map((n) => n.id),
      { groupId: undefined },
    );
  },
  lock: () => {
    const { selected, state } = currentEditor();
    state.updateElements(
      selected.map((n) => n.id),
      { locked: !selected.some((n) => n.locked) },
    );
  },
  layer: (direction: 'front' | 'back' | 'forward' | 'backward') => {
    const { state, selected } = currentEditor();
    const ids = new Set(selected.filter((n) => !n.locked).map((n) => n.id));
    state.changeSlide((slide) => {
      let elements = [...slide.elements];
      if (direction === 'front')
        elements = [
          ...elements.filter((n) => !ids.has(n.id)),
          ...elements.filter((n) => ids.has(n.id)),
        ];
      if (direction === 'back')
        elements = [
          ...elements.filter((n) => ids.has(n.id)),
          ...elements.filter((n) => !ids.has(n.id)),
        ];
      if (direction === 'forward')
        for (let i = elements.length - 2; i >= 0; i--)
          if (ids.has(elements[i].id) && !ids.has(elements[i + 1].id))
            [elements[i], elements[i + 1]] = [elements[i + 1], elements[i]];
      if (direction === 'backward')
        for (let i = 1; i < elements.length; i++)
          if (ids.has(elements[i].id) && !ids.has(elements[i - 1].id))
            [elements[i], elements[i - 1]] = [elements[i - 1], elements[i]];
      return { ...slide, elements };
    });
  },
  align: (alignment: Parameters<typeof alignElements>[2]) => {
    const { state, deck } = currentEditor();
    state.changeSlide((s) => alignElements(s, state.selectedIds, alignment, deck));
  },
  distribute: (axis: 'x' | 'y') => {
    const { state } = currentEditor();
    state.changeSlide((s) => distributeElements(s, state.selectedIds, axis));
  },
  theme: (theme: Theme) => useEditor.getState().change((d) => changeTheme(d, theme)),
  nudge: (x: number, y: number) => {
    const { state } = currentEditor();
    state.changeSlide((s) => ({
      ...s,
      elements: s.elements.map((n) =>
        state.selectedIds.includes(n.id) && !n.locked ? { ...n, x: n.x + x, y: n.y + y } : n,
      ),
    }));
  },
};
