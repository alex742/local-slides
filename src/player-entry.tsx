import { createRoot } from 'react-dom/client';
import { PlayerApp } from './player/PlayerApp';
import { parseDeck } from './document/model';
import './styles.css';

export function mount(element: HTMLElement, deck: unknown) {
  createRoot(element).render(<PlayerApp deck={parseDeck(deck)} />);
}
