import { create } from 'zustand';
import { begin, commit, createHistory, finish, redo, undo, type History } from './history';
import { createSampleDeck } from './sample';
import { parseDeck, type Deck, type Slide, type SlideElement } from './model';

const initial = createSampleDeck();
interface EditorStore {
  history: History;
  savedDeck: Deck;
  slideId: string;
  selectedIds: string[];
  editingText: string | null;
  zoom: number;
  change: (fn: (deck: Deck) => Deck) => void;
  changeSlide: (fn: (slide: Slide) => Slide) => void;
  updateElements: (ids: string[], patch: Partial<SlideElement>) => void;
  select: (ids: string[]) => void;
  goToSlide: (id: string) => void;
  editText: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  begin: () => void;
  finish: () => void;
  undo: () => void;
  redo: () => void;
  load: (deck: unknown) => void;
  saved: (deck: Deck) => void;
}
export const useEditor = create<EditorStore>((set, get) => ({
  history: createHistory(initial),
  savedDeck: initial,
  slideId: initial.slides[0].id,
  selectedIds: [],
  editingText: null,
  zoom: 0,
  change: (fn) => set((state) => ({ history: commit(state.history, fn(state.history.present)) })),
  changeSlide: (fn) => {
    const { slideId } = get();
    get().change((deck) => {
      const source = deck.slides.find((slide) => slide.id === slideId) || deck.slides[0];
      const next = fn(source);
      return next === source
        ? deck
        : { ...deck, slides: deck.slides.map((slide) => (slide === source ? next : slide)) };
    });
  },
  updateElements: (ids, patch) =>
    get().changeSlide((slide) => {
      let changed = false;
      const elements = slide.elements.map((node) => {
        if (!ids.includes(node.id) || (node.locked && !Object.hasOwn(patch, 'locked'))) return node;
        const record = node as unknown as Record<string, unknown>;
        if (Object.entries(patch).every(([key, value]) => record[key] === value)) return node;
        changed = true;
        return { ...node, ...patch } as SlideElement;
      });
      return changed ? { ...slide, elements } : slide;
    }),
  select: (ids) =>
    set((state) => ({ history: finish(state.history), selectedIds: ids, editingText: null })),
  goToSlide: (id) => {
    get().finish();
    set({ slideId: id, selectedIds: [], editingText: null });
  },
  editText: (id) => set({ editingText: id }),
  setZoom: (zoom) => set({ zoom }),
  begin: () => set((s) => ({ history: begin(s.history) })),
  finish: () => set((s) => ({ history: finish(s.history) })),
  undo: () => set((s) => ({ history: undo(s.history), selectedIds: [], editingText: null })),
  redo: () => set((s) => ({ history: redo(s.history), selectedIds: [], editingText: null })),
  load: (input) => {
    const deck = parseDeck(input);
    set({
      history: createHistory(deck),
      savedDeck: deck,
      slideId: deck.slides[0].id,
      selectedIds: [],
      editingText: null,
    });
  },
  saved: (deck) => set({ savedDeck: deck }),
}));
