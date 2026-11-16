import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { AppWindow, ArrowUpRight } from 'lucide-react';
import type { Deck, Slide, SlideElement } from '../document/model';
import { cleanRichText } from './rich-text';

export interface RendererProps {
  deck: Deck;
  slide: Slide;
  selectedIds?: string[];
  onElementPointerDown?: (node: SlideElement, event: PointerEvent<HTMLDivElement>) => void;
  onElementDoubleClick?: (node: SlideElement) => void;
  renderElement?: (node: SlideElement, content: ReactNode) => ReactNode;
}
export function SlideRenderer({
  deck,
  slide,
  selectedIds = [],
  onElementPointerDown,
  onElementDoubleClick,
  renderElement,
}: RendererProps) {
  return (
    <div
      className="slide-artboard"
      data-slide-id={slide.id}
      style={{
        width: deck.width,
        height: deck.height,
        background: slide.background,
        color: deck.theme.foreground,
      }}
      role="group"
      aria-label={slide.name}
    >
      {slide.elements.map((node) => {
        let content: ReactNode;
        if (node.kind === 'text')
          content = (
            <div
              className="slide-text"
              dangerouslySetInnerHTML={{ __html: cleanRichText(node.html) }}
            />
          );
        else if (node.kind === 'shape')
          content =
            node.shape === 'line' ? (
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${node.width} ${node.height}`}
                preserveAspectRatio="none"
              >
                <line
                  x1="0"
                  y1={node.height / 2}
                  x2={node.width}
                  y2={node.height / 2}
                  stroke={node.fill}
                  strokeWidth={Math.max(2, node.strokeWidth)}
                />
              </svg>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: node.fill,
                  border: `${node.strokeWidth}px solid ${node.stroke}`,
                  borderRadius: node.shape === 'ellipse' ? '50%' : node.radius,
                }}
              />
            );
        else if (node.kind === 'image')
          content = (
            <img
              src={deck.assets[node.assetId]?.data}
              alt={node.alt}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: node.fit }}
            />
          );
        else
          content =
            node.posterAssetId && deck.assets[node.posterAssetId] ? (
              <img
                className="demo-poster-image"
                src={deck.assets[node.posterAssetId].data}
                alt={node.title}
              />
            ) : (
              <div
                className="demo-poster"
                style={{ '--demo-accent': deck.theme.accent } as CSSProperties}
              >
                <div className="demo-poster-top">
                  <span className="demo-poster-dot" />
                  <span>{node.mode === 'authored' ? 'INTERACTIVE DEMO' : 'LIVE WEBSITE'}</span>
                  <ArrowUpRight size={20} />
                </div>
                <div className="demo-poster-middle">
                  <AppWindow size={52} strokeWidth={1.25} />
                  <strong>{node.title}</strong>
                  <span>There’s more to this slide.</span>
                  <span className="demo-poster-pill">
                    {node.mode === 'authored' ? 'Preview to explore' : 'Open website demo'}{' '}
                    <ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="demo-poster-bottom">A live moment, built into your story.</div>
              </div>
            );
        const style: CSSProperties = {
          position: 'absolute',
          left: 0,
          top: 0,
          width: node.width,
          height: node.height,
          transform: `translate(${node.x}px, ${node.y}px) rotate(${node.rotation}deg)`,
          opacity: node.opacity,
          transformOrigin: 'center center',
        };
        if (node.kind === 'text')
          Object.assign(style, {
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            lineHeight: node.lineHeight,
            textAlign: node.align,
            color: node.color || deck.theme.foreground,
          });
        return (
          <div
            key={node.id}
            data-element-id={node.id}
            data-kind={node.kind}
            className={`slide-element ${selectedIds.includes(node.id) ? 'is-selected' : ''} ${node.locked ? 'is-locked' : ''}`}
            style={style}
            onPointerDown={(event) => onElementPointerDown?.(node, event)}
            onDoubleClick={() => onElementDoubleClick?.(node)}
          >
            {renderElement ? renderElement(node, content) : content}
          </div>
        );
      })}
    </div>
  );
}

export function SlideViewport({
  deck,
  slide,
  className = '',
  children,
  onScale,
  scaleOverride = 0,
  ...props
}: RendererProps & {
  className?: string;
  children?: ReactNode;
  onScale?: (scale: number) => void;
  scaleOverride?: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    if (!holder.current) return;
    const measure = () => {
      const box = holder.current!.getBoundingClientRect();
      const next =
        scaleOverride || Math.max(0.05, Math.min(box.width / deck.width, box.height / deck.height));
      setScale(next);
      onScale?.(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(holder.current);
    measure();
    return () => observer.disconnect();
  }, [deck.width, deck.height, onScale, scaleOverride]);
  return (
    <div className={`slide-viewport ${className}`} ref={holder}>
      <div
        className="slide-scaled-frame"
        style={{ width: deck.width * scale, height: deck.height * scale }}
      >
        <div
          className="slide-scaled-inner"
          style={{ width: deck.width, height: deck.height, transform: `scale(${scale})` }}
        >
          <SlideRenderer deck={deck} slide={slide} {...props} />
          {children}
        </div>
      </div>
    </div>
  );
}
