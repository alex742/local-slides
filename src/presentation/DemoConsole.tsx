import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { AppWindow } from 'lucide-react';
import type { DemoElement } from '../document/model';
import { DemoFrame } from '../demos/DemoFrame';

export function DemoConsole({
  demo,
  active,
  runKey,
  target,
  onError,
  onReady,
}: {
  demo?: DemoElement;
  active: boolean;
  runKey: number;
  target: RefObject<HTMLDivElement | null>;
  onError: (message: string) => void;
  onReady: () => void;
}) {
  const space = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 500, height: 500 });
  const logicalWidth = demo?.width || 620,
    logicalHeight = demo?.height || 530;
  useLayoutEffect(() => {
    const element = space.current!;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const ratio = logicalWidth / logicalHeight;
      const width = Math.max(1, Math.min(logicalWidth, bounds.width, bounds.height * ratio));
      const height = width / ratio;
      setSize((old) =>
        Math.abs(old.width - width) < 0.1 && Math.abs(old.height - height) < 0.1
          ? old
          : { width, height },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [logicalWidth, logicalHeight]);
  return (
    <div className={`speaker-demo-console ${active ? 'active' : ''}`} aria-hidden={!active}>
      <div className="demo-console-caption">
        <AppWindow size={13} />
        <span>{demo?.title || 'Live demo'}</span>
        <span>DIRECT CONTROL · AUDIENCE SEES THE SLIDE</span>
      </div>
      <div className="demo-console-space" ref={space}>
        <div
          ref={target}
          className="demo-console-crop"
          data-capture-target="demo"
          style={{ width: size.width, height: size.height }}
        >
          {active && demo && (
            <DemoFrame
              key={`${demo.id}:${runKey}`}
              demo={demo}
              runKey={runKey}
              onError={onError}
              onReady={onReady}
            />
          )}
        </div>
      </div>
    </div>
  );
}
