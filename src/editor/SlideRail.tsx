import { useState } from 'react';
import { ChevronDown, Copy, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { useEditor } from '../document/store';
import { SlideViewport } from '../renderer/SlideRenderer';
import { commands } from './commands';

export function SlideRail() {
  const state = useEditor(),
    deck = state.history.present;
  const [dragging, setDragging] = useState<string | null>(null);
  return (
    <aside className="slide-rail">
      <div className="rail-heading">
        <span>YOUR STORY</span>
        <span>{deck.slides.length} slides</span>
      </div>
      <div className="slide-list">
        {deck.slides.map((slide, i) => (
          <div
            className={`thumbnail-wrap ${dragging === slide.id ? 'dragging' : ''}`}
            key={slide.id}
            draggable
            onDragStart={(event) => {
              setDragging(slide.id);
              event.dataTransfer.setData('text/plain', slide.id);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              commands.moveSlide(event.dataTransfer.getData('text/plain'), slide.id);
              setDragging(null);
            }}
          >
            <button
              className={`thumbnail-button ${slide.id === state.slideId ? 'active' : ''}`}
              onClick={() => state.goToSlide(slide.id)}
              aria-label={`Slide ${i + 1}: ${slide.name}`}
              aria-current={slide.id === state.slideId ? 'true' : undefined}
            >
              <span className="thumbnail-number">{String(i + 1).padStart(2, '0')}</span>
              <div className="thumbnail-preview">
                <SlideViewport deck={deck} slide={slide} />
              </div>
              <span className="thumbnail-title">{slide.name}</span>
            </button>
            <Dropdown.Root>
              <Dropdown.Trigger
                className="thumbnail-more icon-button"
                aria-label={`Options for slide ${i + 1}`}
              >
                <MoreHorizontal size={15} />
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content className="dropdown-menu" sideOffset={5}>
                  <Dropdown.Item
                    className="dropdown-item"
                    onSelect={() => commands.duplicateSlide(slide.id)}
                  >
                    <Copy size={14} /> Duplicate slide
                  </Dropdown.Item>
                  <Dropdown.Item
                    className="dropdown-item danger"
                    disabled={deck.slides.length === 1}
                    onSelect={() => commands.deleteSlide(slide.id)}
                  >
                    <Trash2 size={14} /> Delete slide
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </div>
        ))}
      </div>
      <div className="new-slide-group">
        <button className="button new-slide" onClick={() => commands.addSlide('title')}>
          <Plus size={16} /> New slide
        </button>
        <Dropdown.Root>
          <Dropdown.Trigger className="new-slide-options" aria-label="Choose a slide layout">
            <ChevronDown size={14} />
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content className="dropdown-menu" sideOffset={7}>
              {[
                ['blank', 'Blank canvas'],
                ['title', 'Title and subtitle'],
                ['split', 'Split layout'],
              ].map(([id, label]) => (
                <Dropdown.Item
                  key={id}
                  className="dropdown-item"
                  onSelect={() => commands.addSlide(id)}
                >
                  {label}
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </div>
      <div className="rail-footer">
        <span className="tiny-star">✦</span> Every slide starts something.
      </div>
    </aside>
  );
}
