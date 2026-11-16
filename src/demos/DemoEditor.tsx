import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AppWindow,
  ArrowUpRight,
  Check,
  Code2,
  Globe,
  MousePointer2,
  Play,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import type { DemoElement } from '../document/model';
import { CodeEditor } from './CodeEditor';
import { DemoFrame } from './DemoFrame';
import { websiteUrl } from './runtime';
import './demos.css';

export function DemoEditor({
  node,
  onClose,
  onApply,
}: {
  node: DemoElement;
  onClose: () => void;
  onApply: (demo: DemoElement) => void;
}) {
  const [draft, setDraft] = useState(node),
    [tab, setTab] = useState<'html' | 'css' | 'js'>('html'),
    [running, setRunning] = useState(false),
    [interactive, setInteractive] = useState(false),
    [runKey, setRunKey] = useState(0),
    [preview, setPreview] = useState(node),
    [errors, setErrors] = useState<string[]>([]),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (
      !running ||
      (draft.mode === preview.mode &&
        draft.html === preview.html &&
        draft.css === preview.css &&
        draft.js === preview.js &&
        draft.url === preview.url)
    )
      return;
    const timer = setTimeout(() => {
      setPreview(draft);
      setRunKey((key) => key + 1);
      setReady(false);
      setErrors([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, running, preview]);
  const start = () => {
    try {
      if (draft.mode === 'website') websiteUrl(draft.url);
      setErrors([]);
      setPreview(draft);
      setRunning(true);
      setRunKey((key) => key + 1);
      setReady(false);
    } catch (error) {
      setErrors([(error as Error).message]);
    }
  };
  const apply = () => {
    try {
      if (draft.mode === 'website') websiteUrl(draft.url);
      onApply(draft);
      onClose();
    } catch (error) {
      setErrors([(error as Error).message]);
    }
  };
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="demo-editor-dialog" aria-describedby="demo-description">
          <header className="dialog-header">
            <div className="dialog-icon">
              <AppWindow size={22} />
            </div>
            <div>
              <Dialog.Title>A little less static.</Dialog.Title>
              <Dialog.Description id="demo-description">
                Bring an idea to life, right inside your slide.
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close demo editor">
              <X size={19} />
            </Dialog.Close>
          </header>
          <div className="demo-settings">
            <label className="demo-name-field">
              DEMO NAME
              <input
                aria-label="Demo name"
                value={draft.title}
                maxLength={500}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <div className="demo-mode-tabs" aria-label="Demo type">
              <button
                className={draft.mode === 'authored' ? 'active' : ''}
                onClick={() => {
                  setDraft({ ...draft, mode: 'authored' });
                  setRunning(false);
                  setInteractive(false);
                }}
              >
                <Code2 size={15} /> Write code
              </button>
              <button
                className={draft.mode === 'website' ? 'active' : ''}
                onClick={() => {
                  setDraft({ ...draft, mode: 'website' });
                  setRunning(false);
                  setInteractive(false);
                }}
              >
                <Globe size={15} /> Website
              </button>
            </div>
          </div>
          <div className={`demo-editor-body ${draft.mode === 'website' ? 'website-mode' : ''}`}>
            <section className="demo-source-pane">
              {draft.mode === 'authored' ? (
                <>
                  <div className="code-tabs">
                    {(['html', 'css', 'js'] as const).map((language) => (
                      <button
                        key={language}
                        className={language === tab ? 'active' : ''}
                        onClick={() => setTab(language)}
                      >
                        {language === 'js' ? 'JavaScript' : language.toUpperCase()}
                      </button>
                    ))}
                    <span>Browser-ready. No build step.</span>
                  </div>
                  <CodeEditor
                    key={`${node.id}:${tab}`}
                    language={tab}
                    value={draft[tab]}
                    onChange={(source) => setDraft((d) => ({ ...d, [tab]: source }))}
                  />
                </>
              ) : (
                <div className="website-settings">
                  <Globe size={34} strokeWidth={1.25} />
                  <h3>Your product, in the picture.</h3>
                  <p>
                    Embed an existing website or a local demo app. The website must allow embedding.
                  </p>
                  <label className="stacked-label">
                    Website address
                    <input
                      aria-label="Website address"
                      type="url"
                      placeholder="https://your-demo.example.com"
                      value={draft.url}
                      onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                    />
                  </label>
                  <p className="inspector-tip">
                    For local demos, use their complete localhost address and port. If a site blocks
                    embedding, open it in a separate tab instead.
                  </p>
                </div>
              )}
            </section>
            <section className="demo-preview-pane">
              <header className="preview-toolbar">
                <span>
                  <span className={`preview-dot ${ready && running ? 'ready' : ''}`} />
                  {running ? (ready ? 'LIVE PREVIEW' : 'LOADING…') : 'PREVIEW'}
                </span>
                <div>
                  {running && (
                    <>
                      <button
                        className={`icon-button ${interactive ? 'active' : ''}`}
                        aria-label={
                          interactive ? 'Return to preview mode' : 'Interact with preview'
                        }
                        title={interactive ? 'Return to preview mode' : 'Interact with preview'}
                        onClick={() => setInteractive(!interactive)}
                      >
                        <MousePointer2 size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Reset preview"
                        title="Reset preview"
                        onClick={start}
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Stop preview"
                        title="Stop preview"
                        onClick={() => {
                          setRunning(false);
                          setInteractive(false);
                        }}
                      >
                        <Square size={14} />
                      </button>
                    </>
                  )}
                  <button className="button primary small" onClick={start}>
                    <Play size={12} fill="currentColor" />
                    {running ? 'Run again' : 'Preview'}
                  </button>
                </div>
              </header>
              <div className="demo-preview-stage">
                {running ? (
                  <div className="demo-preview-content">
                    <DemoFrame
                      demo={preview}
                      runKey={runKey}
                      interactive={interactive}
                      onReady={() => setReady(true)}
                      onError={(error) => setErrors((old) => [...old.slice(-7), error])}
                    />
                    {!interactive && (
                      <button
                        className="preview-interaction-cover"
                        aria-label="Interact with demo"
                        onClick={() => setInteractive(true)}
                      >
                        <span>
                          <MousePointer2 size={15} /> Click to interact
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="preview-welcome">
                    <div className="preview-welcome-symbol">
                      <AppWindow size={38} strokeWidth={1.2} />
                    </div>
                    <h3>Give your idea a little room.</h3>
                    <p>
                      Start the preview when you’re ready.
                      <br />
                      Your demo only runs when you ask it to.
                    </p>
                    <button className="button secondary" onClick={start}>
                      <Play size={13} /> Preview demo
                    </button>
                  </div>
                )}
              </div>
              {draft.mode === 'website' && draft.url && (
                <a
                  className="website-fallback-link"
                  href={(() => {
                    try {
                      return websiteUrl(draft.url);
                    } catch {
                      return undefined;
                    }
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open website in a new tab <ArrowUpRight size={13} />
                </a>
              )}
              {errors.length > 0 && (
                <div className="demo-errors" role="alert">
                  <strong>Demo messages</strong>
                  {errors.map((error, index) => (
                    <p key={index}>{error}</p>
                  ))}
                </div>
              )}
            </section>
          </div>
          <footer className="demo-editor-footer">
            <span>
              {running
                ? 'Preview is running in an isolated frame.'
                : 'Preview your code, then apply it to the slide.'}
            </span>
            <button className="button secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" onClick={apply}>
              <Check size={15} /> Apply to slide
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
