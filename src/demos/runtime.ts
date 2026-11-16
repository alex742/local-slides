import type { DemoElement } from '../document/model';

function dataUrl(type: string, source: string) {
  const bytes = new TextEncoder().encode(source);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return `data:${type};base64,${btoa(binary)}`;
}
export function demoDocument(
  demo: Pick<DemoElement, 'html' | 'css' | 'js'>,
  token: string,
): string {
  const document = new DOMParser().parseFromString(demo.html, 'text/html');
  const bridge = document.createElement('script');
  bridge.src = dataUrl(
    'text/javascript',
    `(()=>{const token=${JSON.stringify(token)};const send=(kind,message)=>parent.postMessage({namespace:'local-slides-demo',token,kind,message:String(message).slice(0,800)},'*');addEventListener('error',event=>send('error',event.message+(event.lineno?' (line '+event.lineno+')':'')));addEventListener('unhandledrejection',event=>send('error',event.reason?.message||event.reason));addEventListener('DOMContentLoaded',()=>send('ready','Demo ready'),{once:true});})();`,
  );
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = dataUrl('text/css', demo.css);
  document.head.prepend(bridge, style);
  const script = document.createElement('script');
  script.src = dataUrl('text/javascript', demo.js);
  document.body.append(script);
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width,initial-scale=1';
  document.head.prepend(meta);
  return '<!doctype html>' + document.documentElement.outerHTML;
}
export function websiteUrl(value: string, appOrigin = location.origin): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a complete website URL, such as https://demo.example.com.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Use an HTTP or HTTPS website URL without embedded credentials.');
  if (url.origin === appOrigin)
    throw new Error('Run the website demo on a different address or port from Local Slides.');
  return url.href;
}
