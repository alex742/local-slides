import { useEffect, useRef } from 'react';
import { Maximize } from 'lucide-react';
import type { Deck, DemoElement, Slide } from '../document/model';
import { SlideViewport } from '../renderer/SlideRenderer';
import { visibleDemoBounds } from './geometry';

export interface AudienceHandle {
  window: Window;
  root: HTMLElement;
}
export function openAudience(): AudienceHandle | null {
  const popup = window.open('', '_blank', 'popup,width=1280,height=800');
  if (!popup) return null;
  popup.document.open();
  popup.document.write(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Slides — Audience</title></head><body><div id="audience-root"></div></body></html>',
  );
  popup.document.close();
  document.querySelectorAll('style,link[rel="stylesheet"]').forEach((source) => {
    const copy = source.cloneNode(true) as HTMLElement;
    if (copy instanceof HTMLLinkElement) copy.href = (source as HTMLLinkElement).href;
    popup.document.head.appendChild(popup.document.importNode(copy, true));
  });
  return { window: popup, root: popup.document.getElementById('audience-root')! };
}
function VideoMirror({ stream }: { stream: MediaStream }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current!;
    element.srcObject = stream;
    element.play().catch(() => {});
    return () => {
      element.srcObject = null;
    };
  }, [stream]);
  return (
    <video
      className="audience-video"
      ref={video}
      autoPlay
      muted
      playsInline
      aria-label="Mirrored live demo"
    />
  );
}
export function AudienceView({
  deck,
  slide,
  stream,
  owner,
}: {
  deck: Deck;
  slide: Slide;
  stream: MediaStream | null;
  owner: Window;
}) {
  const demo = slide.elements.find((n) => n.kind === 'demo') as DemoElement | undefined;
  const rect = visibleDemoBounds(demo, deck);
  return (
    <div className="audience-window">
      <SlideViewport deck={deck} slide={slide}>
        {demo && stream && rect.visible && (
          <div className="public-overlay-layer">
            <div
              className="public-demo-overlay audience-demo-overlay"
              style={{ left: demo.x, top: demo.y, width: demo.width, height: demo.height }}
            >
              <VideoMirror stream={stream} />
            </div>
          </div>
        )}
      </SlideViewport>
      <button
        className="audience-fullscreen"
        aria-label="Fullscreen audience"
        title="Fullscreen"
        onClick={() => owner.document.documentElement.requestFullscreen().catch(() => {})}
      >
        <Maximize size={18} />
      </button>
    </div>
  );
}
