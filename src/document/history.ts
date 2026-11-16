import type { Deck } from './model';

export interface History {
  present: Deck;
  past: Deck[];
  future: Deck[];
  transaction: Deck | null;
}
export const createHistory = (present: Deck): History => ({
  present,
  past: [],
  future: [],
  transaction: null,
});
export function commit(history: History, next: Deck): History {
  if (next === history.present) return history;
  if (history.transaction) return { ...history, present: next };
  return {
    present: next,
    past: [...history.past, history.present].slice(-100),
    future: [],
    transaction: null,
  };
}
export function begin(history: History): History {
  return history.transaction ? history : { ...history, transaction: history.present };
}
export function finish(history: History): History {
  if (!history.transaction) return history;
  if (history.present === history.transaction) return { ...history, transaction: null };
  return {
    ...history,
    past: [...history.past, history.transaction].slice(-100),
    future: [],
    transaction: null,
  };
}
export function undo(history: History): History {
  const h = finish(history);
  const previous = h.past.at(-1);
  return previous
    ? {
        present: previous,
        past: h.past.slice(0, -1),
        future: [h.present, ...h.future],
        transaction: null,
      }
    : h;
}
export function redo(history: History): History {
  const h = finish(history);
  const next = h.future[0];
  return next
    ? { present: next, past: [...h.past, h.present], future: h.future.slice(1), transaction: null }
    : h;
}
