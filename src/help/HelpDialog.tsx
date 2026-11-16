import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, ChevronRight, ExternalLink, X } from 'lucide-react';
import { helpSources, slug } from './sources';

const textOf = (children: ReactNode): string =>
  Array.isArray(children)
    ? children.map(textOf).join('')
    : typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : '';
export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [active, setActive] = useState('guide');
  const source = helpSources.find((item) => item.id === active)!;
  const heading = (children: ReactNode) => `help-${slug(textOf(children))}`;
  const go = (id: string, anchor = '') => {
    setActive(id);
    requestAnimationFrame(() => {
      const scroller = document.querySelector('.help-article');
      if (anchor) document.getElementById(`help-${anchor}`)?.scrollIntoView({ block: 'start' });
      else scroller?.scrollTo(0, 0);
    });
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="help-dialog" aria-describedby="help-description">
          <header className="dialog-header">
            <div className="dialog-icon">
              <BookOpen size={21} />
            </div>
            <div>
              <Dialog.Title>Make yourself at home.</Dialog.Title>
              <Dialog.Description id="help-description">
                A guide to creating, presenting, and making Local Slides your own.
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close help">
              <X size={19} />
            </Dialog.Close>
          </header>
          <div className="help-layout">
            <nav className="help-nav" aria-label="Help topics">
              {helpSources.map((item) => (
                <button
                  key={item.id}
                  className={active === item.id ? 'active' : ''}
                  onClick={() => go(item.id)}
                >
                  {item.title}
                  <ChevronRight size={14} />
                </button>
              ))}
              <p>
                Made for stories.
                <br />
                Built to be explored.
              </p>
            </nav>
            <article className="help-article markdown" key={active}>
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 id={heading(children)}>{children}</h1>,
                  h2: ({ children }) => <h2 id={heading(children)}>{children}</h2>,
                  h3: ({ children }) => <h3 id={heading(children)}>{children}</h3>,
                  a: ({ href, children }) => {
                    const [path, anchor = ''] = (href || '').split('#');
                    const file = path.split('/').at(-1);
                    const target = helpSources.find((item) => item.file === file);
                    if (target || href?.startsWith('#'))
                      return (
                        <a
                          href={href}
                          onClick={(event) => {
                            event.preventDefault();
                            go(target?.id || active, anchor);
                          }}
                        >
                          {children}
                        </a>
                      );
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                        <ExternalLink size={11} className="inline-icon" />
                      </a>
                    );
                  },
                }}
              >
                {source.content}
              </Markdown>
            </article>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
