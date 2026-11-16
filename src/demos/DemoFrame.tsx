import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { DemoElement } from '../document/model';
import { demoDocument, websiteUrl } from './runtime';
import './demos.css';

export const DemoFrame = memo(function DemoFrame({
  demo,
  runKey = 0,
  interactive = true,
  onError,
  onReady,
}: {
  demo: DemoElement;
  runKey?: number;
  interactive?: boolean;
  onError?: (error: string) => void;
  onReady?: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [token] = useState(() => crypto.randomUUID());
  const document = useMemo(
    () => (demo.mode === 'authored' ? demoDocument(demo, token) : undefined),
    [demo, token],
  );
  const source = useMemo(() => {
    if (demo.mode !== 'website') return '';
    try {
      return websiteUrl(demo.url);
    } catch {
      return '';
    }
  }, [demo.mode, demo.url]);
  useEffect(() => {
    const message = (event: MessageEvent) => {
      if (
        demo.mode !== 'authored' ||
        event.source !== frame.current?.contentWindow ||
        !event.data ||
        event.data.namespace !== 'local-slides-demo' ||
        event.data.token !== token
      )
        return;
      if (event.data.kind === 'error') onError?.(String(event.data.message).slice(0, 800));
      if (event.data.kind === 'ready') onReady?.();
    };
    window.addEventListener('message', message);
    return () => window.removeEventListener('message', message);
  }, [token, onError, onReady, demo.mode]);
  if (demo.mode === 'website' && !source)
    return <div className="demo-frame-empty">Enter a valid website URL to preview.</div>;
  return (
    <iframe
      key={`${demo.id}:${demo.mode}:${runKey}`}
      ref={frame}
      className="live-demo-frame"
      title={demo.title || 'Interactive demo'}
      srcDoc={document}
      src={demo.mode === 'website' ? source : undefined}
      sandbox={
        demo.mode === 'authored'
          ? 'allow-scripts allow-forms'
          : 'allow-scripts allow-forms allow-same-origin'
      }
      referrerPolicy="no-referrer"
      allow="fullscreen"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      onLoad={() => onReady?.()}
    />
  );
});
