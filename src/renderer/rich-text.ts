import DOMPurify from 'dompurify';

const allowedStyles = new Set([
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-align',
  'text-decoration',
  'line-height',
  'letter-spacing',
]);
const cache = new Map<string, string>();
export function cleanRichText(html: string): string {
  const cached = cache.get(html);
  if (cached !== undefined) return cached;
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'span',
      'ul',
      'ol',
      'li',
      'a',
      'h1',
      'h2',
      'h3',
      'code',
    ],
    ALLOWED_ATTR: ['style', 'href', 'target', 'rel'],
  });
  const template = document.createElement('template');
  template.innerHTML = safe;
  template.content.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    for (const property of Array.from(el.style))
      if (
        !allowedStyles.has(property) ||
        /url\s*\(|expression|var\s*\(/i.test(el.style.getPropertyValue(property))
      )
        el.style.removeProperty(property);
  });
  template.content.querySelectorAll('a').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
  const result = template.innerHTML;
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(html, result);
  return result;
}
