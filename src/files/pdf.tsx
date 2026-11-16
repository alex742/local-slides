import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { SlideRenderer } from '../renderer/SlideRenderer';
import type { Deck } from '../document/model';

export async function exportPdf(
  deck: Deck,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const [{ toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')]);
  const host = document.createElement('div');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-20000px',
    top: '0',
    width: `${deck.width}px`,
    height: `${deck.height}px`,
  });
  document.body.append(host);
  const root = createRoot(host);
  const pdf = new jsPDF({
    orientation: deck.width >= deck.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [deck.width, deck.height],
    hotfixes: ['px_scaling'],
    compress: true,
  });
  pdf.setProperties({ title: deck.title, creator: 'Local Slides' });
  try {
    for (let i = 0; i < deck.slides.length; i++) {
      onProgress?.(i + 1, deck.slides.length);
      flushSync(() => root.render(<SlideRenderer deck={deck} slide={deck.slides[i]} />));
      await document.fonts.ready;
      await Promise.all(
        Array.from(host.querySelectorAll('img')).map((image) => image.decode().catch(() => {})),
      );
      const png = await toPng(host.firstElementChild as HTMLElement, {
        pixelRatio: 2,
        width: deck.width,
        height: deck.height,
        backgroundColor: deck.slides[i].background,
        preferredFontFormat: 'woff2',
      });
      if (i)
        pdf.addPage(
          [deck.width, deck.height],
          deck.width >= deck.height ? 'landscape' : 'portrait',
        );
      pdf.addImage(png, 'PNG', 0, 0, deck.width, deck.height, undefined, 'FAST');
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return pdf.output('blob');
  } finally {
    root.unmount();
    host.remove();
  }
}
