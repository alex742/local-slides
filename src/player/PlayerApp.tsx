import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Monitor,
  MonitorUp,
  PanelsTopLeft,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Square,
  Timer,
  X,
} from 'lucide-react';
import type { Deck, DemoElement } from '../document/model';
import { SlideViewport } from '../renderer/SlideRenderer';
import { HelpDialog } from '../help/HelpDialog';
import { DemoFrame } from '../demos/DemoFrame';
import { websiteUrl } from '../demos/runtime';
import { CropCapture, initialCapture } from '../presentation/capture';
import { AudienceView, openAudience, type AudienceHandle } from '../presentation/AudienceWindow';
import { visibleDemoBounds } from '../presentation/geometry';
import { DemoConsole } from '../presentation/DemoConsole';
import './player.css';
import './demo-console.css';

export function PlayerApp({
  deck,
  initialIndex = 0,
  initialMode = 'slides',
  onExit,
  onPoster,
}: {
  deck: Deck;
  initialIndex?: number;
  initialMode?: 'slides' | 'speaker';
  onExit?: () => void;
  onPoster?: (demoId: string, data: string) => void;
}) {
  const [index, setIndex] = useState(initialIndex),
    [mode, setMode] = useState(initialMode),
    [help, setHelp] = useState(false);
  const slide = deck.slides[Math.min(index, deck.slides.length - 1)],
    demo = slide.elements.find((node) => node.kind === 'demo') as DemoElement | undefined;
  const [running, setRunning] = useState(!!demo),
    [runKey, setRunKey] = useState(0),
    [error, setError] = useState('');
  const [audience, setAudience] = useState<AudienceHandle | null>(null),
    [capture, setCapture] = useState(initialCapture);
  const [controller] = useState(() => new CropCapture(setCapture));
  const cropTarget = useRef<HTMLDivElement>(null),
    audienceRef = useRef<AudienceHandle | null>(null);
  const [started, setStarted] = useState(() => Date.now()),
    [seconds, setSeconds] = useState(0);
  const rect = visibleDemoBounds(demo, deck),
    speaker = mode === 'speaker';
  const demoId = demo?.id;
  const hasAudience = !!audience && !audience.window.closed;
  useEffect(() => {
    controller.listen(setCapture);
    return () => {
      controller.listen(() => {});
      controller.stop();
    };
  }, [controller]);
  useEffect(() => {
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [started]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (audienceRef.current?.window.closed) {
        audienceRef.current = null;
        setAudience(null);
        controller.pause('Audience window closed. Reopen it to continue.');
      }
    }, 500);
    return () => clearInterval(timer);
  }, [controller]);
  useEffect(
    () => () => {
      audienceRef.current?.window.close();
    },
    [],
  );
  useEffect(() => {
    if (!controller.active) return;
    controller.pause();
    if (!speaker || !running || !demoId || !rect.visible || help || !hasAudience) return;
    let second = 0;
    const request = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (cropTarget.current) void controller.resume(cropTarget.current);
      });
    });
    return () => {
      cancelAnimationFrame(request);
      cancelAnimationFrame(second);
    };
  }, [index, running, runKey, speaker, help, hasAudience, demoId, rect.visible, controller]);
  const goTo = useCallback(
    (next: number) => {
      const value = Math.max(0, Math.min(deck.slides.length - 1, next));
      if (value === index) return;
      controller.pause();
      setError('');
      setRunKey(0);
      setRunning(deck.slides[value].elements.some((n) => n.kind === 'demo'));
      setIndex(value);
    },
    [controller, deck.slides, index],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        help ||
        (event.target as HTMLElement).closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"]',
        )
      )
        return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        goTo(index + 1);
      }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        goTo(index - 1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        goTo(deck.slides.length - 1);
      }
      if (event.key === 'Escape' && running && demo) {
        controller.pause();
        setRunning(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [help, goTo, index, deck.slides.length, running, demo, controller]);
  const handleReady = useCallback(() => {}, []);
  const handleError = useCallback((message: string) => setError(message), []);
  function audienceOpen() {
    if (audience && !audience.window.closed) {
      audience.window.focus();
      return;
    }
    const handle = openAudience();
    if (!handle) {
      setError('Allow pop-ups to open the audience window.');
      return;
    }
    audienceRef.current = handle;
    setAudience(handle);
  }
  function toggleMode() {
    controller.stop();
    setMode((value) => (value === 'speaker' ? 'slides' : 'speaker'));
  }
  function resetDemo() {
    controller.pause();
    setError('');
    setRunning(true);
    setRunKey((key) => key + 1);
  }
  async function capturePoster() {
    try {
      const video = audience?.window.document.querySelector('video');
      if (!video || !video.videoWidth || !demo)
        throw new Error('Wait for the audience demo to appear, then capture its poster.');
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth, 2560);
      canvas.height = Math.round((video.videoHeight * canvas.width) / video.videoWidth);
      canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
      onPoster?.(demo.id, canvas.toDataURL('image/png'));
      setError('Poster captured. It will appear in your PDF and saved deck.');
    } catch (error) {
      setError((error as Error).message);
    }
  }
  const stage = (
    <SlideViewport deck={deck} slide={slide}>
      <div className="public-overlay-layer">
        <div
          className="public-demo-overlay"
          style={
            {
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              visibility: demo && running && !speaker && rect.visible ? 'visible' : 'hidden',
            } as CSSProperties
          }
        >
          {demo && running && !speaker && (
            <div
              className="demo-logical-size"
              style={{
                width: demo.width,
                height: demo.height,
                left: demo.x - rect.x,
                top: demo.y - rect.y,
              }}
            >
              <DemoFrame
                key={`${demo.id}:${runKey}`}
                demo={demo}
                runKey={runKey}
                onReady={handleReady}
                onError={handleError}
              />
            </div>
          )}
        </div>
      </div>
    </SlideViewport>
  );
  const next = deck.slides[index + 1];
  let website = '';
  if (demo?.mode === 'website')
    try {
      website = websiteUrl(demo.url);
    } catch {
      /* The saved poster remains available for unsupported URLs. */
    }
  return (
    <div className={`player-shell ${speaker ? 'speaker-shell' : ''}`}>
      <header className="player-header">
        <div className="player-brand-group">
          {onExit && (
            <button className="player-back" aria-label="Back to editor" onClick={onExit}>
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="brand">
            <PanelsTopLeft size={20} /> Local Slides
          </span>
        </div>
        <span className="presentation-title">{deck.title}</span>
        <div className="player-header-actions">
          <button className="player-button" onClick={toggleMode}>
            {speaker ? <Presentation size={15} /> : <MonitorUp size={15} />}{' '}
            {speaker ? 'Slide view' : 'Speaker view'}
          </button>
          {speaker && (
            <button className="player-button audience-open-button" onClick={audienceOpen}>
              <Monitor size={15} />
              {hasAudience ? 'Focus audience' : 'Open audience'}
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Open help"
            onClick={() => {
              controller.pause();
              setHelp(true);
            }}
          >
            <BookOpen size={17} />
          </button>
          {onExit && (
            <button className="icon-button" aria-label="Exit presentation" onClick={onExit}>
              <X size={17} />
            </button>
          )}
        </div>
      </header>
      {speaker && (
        <div className="speaker-status">
          <span className={`capture-status-dot ${capture.status === 'ready' ? 'ready' : ''}`} />
          <span role="status">
            {capture.status === 'error' ? capture.message : error || capture.message}
          </span>
          <span className="private-label">
            SPEAKER VIEW <span>·</span> NOTES ARE PRIVATE
          </span>
        </div>
      )}
      <div className="presentation-body">
        <main className="player-stage">
          <div
            className="native-slide-preview"
            style={{ visibility: speaker && demo && running ? 'hidden' : 'visible' }}
          >
            {stage}
          </div>
          <DemoConsole
            demo={demo}
            active={!!(speaker && demo && running)}
            runKey={runKey}
            target={cropTarget}
            onReady={handleReady}
            onError={handleError}
          />
        </main>
        {speaker && (
          <aside className="speaker-sidebar">
            <div className="speaker-timer">
              <span>
                <Timer size={14} /> ELAPSED
              </span>
              <strong>
                {String(Math.floor(seconds / 60)).padStart(2, '0')}
                <span>:</span>
                {String(seconds % 60).padStart(2, '0')}
              </strong>
              <button
                className="icon-button"
                aria-label="Reset timer"
                title="Reset timer"
                onClick={() => {
                  setStarted(Date.now());
                  setSeconds(0);
                }}
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <div className="presenter-notes">
              <span className="speaker-section-label">YOUR NOTES</span>
              <h2>{slide.name}</h2>
              <p>{slide.notes || 'Take a breath. You know this story.'}</p>
            </div>
            <div className="next-slide">
              <span className="speaker-section-label">
                {next ? 'COMING UP NEXT' : 'THE END OF YOUR STORY'}
              </span>
              {next ? (
                <div className="next-slide-preview">
                  <SlideViewport deck={deck} slide={next} />
                </div>
              ) : (
                <div className="end-slide-note">
                  Leave them with something
                  <br />
                  worth remembering. <span>✦</span>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      <footer className="player-footer">
        <div className="presentation-progress">
          <span>SLIDE {String(index + 1).padStart(2, '0')}</span>
          <span>{slide.name}</span>
        </div>
        <div className="player-navigation">
          <button
            className="icon-button"
            aria-label="Previous slide"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft size={21} />
          </button>
          <span>
            {index + 1} / {deck.slides.length}
          </span>
          <button
            className="icon-button"
            aria-label="Next slide"
            disabled={index === deck.slides.length - 1}
            onClick={() => goTo(index + 1)}
          >
            <ChevronRight size={21} />
          </button>
        </div>
        <div className="demo-presentation-controls">
          {demo && (
            <>
              <button
                className="player-button"
                aria-label={running ? 'Pause demo' : 'Run demo'}
                onClick={() => {
                  controller.pause();
                  setRunning(!running);
                  setError('');
                }}
              >
                {running ? <Pause size={13} /> : <Play size={13} />}{' '}
                {running ? 'Pause' : 'Run demo'}
              </button>
              <button
                className="icon-button"
                aria-label="Reset demo"
                title="Reset demo"
                onClick={resetDemo}
              >
                <RotateCcw size={15} />
              </button>
              {website && (
                <a
                  className="icon-button"
                  aria-label="Open demo website"
                  title="Open demo website"
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ArrowUpRight size={16} />
                </a>
              )}
              {speaker && (
                <>
                  <button
                    className={`player-button share-demo-button ${capture.status === 'ready' ? 'sharing' : ''}`}
                    disabled={
                      !hasAudience || !running || !rect.visible || capture.status === 'starting'
                    }
                    onClick={() => {
                      setError('');
                      if (cropTarget.current) void controller.start(cropTarget.current);
                    }}
                  >
                    <MonitorUp size={14} />
                    {capture.status === 'starting'
                      ? 'Preparing…'
                      : capture.status === 'ready'
                        ? 'Live to audience'
                        : 'Share demo'}
                  </button>
                  {(controller.active || capture.status === 'starting') && (
                    <button
                      className="icon-button"
                      aria-label="Stop sharing"
                      title="Stop sharing"
                      onClick={() => controller.stop()}
                    >
                      <Square size={14} />
                    </button>
                  )}
                  {onPoster && (
                    <button
                      className="icon-button"
                      aria-label="Capture demo poster"
                      title="Capture a poster from the shared demo"
                      disabled={!capture.stream}
                      onClick={() => void capturePoster()}
                    >
                      <Camera size={16} />
                    </button>
                  )}
                </>
              )}
            </>
          )}
          {!speaker && (
            <button
              className="icon-button"
              aria-label="Fullscreen"
              title="Fullscreen"
              onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
            >
              <Maximize size={17} />
            </button>
          )}
        </div>
      </footer>
      {!speaker && error && (
        <div className="single-player-message" role="status">
          {error}
        </div>
      )}
      <HelpDialog open={help} onClose={() => setHelp(false)} />
      {hasAudience &&
        createPortal(
          <AudienceView
            deck={deck}
            slide={slide}
            stream={speaker && !help && running ? capture.stream : null}
            owner={audience!.window}
          />,
          audience!.root,
        )}
    </div>
  );
}
