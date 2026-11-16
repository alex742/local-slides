import { presentationForExport, type Deck } from '../document/model';

export async function standaloneHtml(deck: Deck): Promise<string> {
  const base = import.meta.env.BASE_URL;
  const [scriptResponse, styleResponse, noticesResponse] = await Promise.all([
    fetch(`${base}player/player.js`),
    fetch(`${base}player/player.css`),
    fetch(`${base}player/THIRD_PARTY_NOTICES.txt`),
  ]);
  if (!scriptResponse.ok || !styleResponse.ok || !noticesResponse.ok)
    throw new Error('The player runtime is unavailable. Run npm run build:player, then try again.');
  const [script, style] = await Promise.all([scriptResponse.text(), styleResponse.text()]);
  const bytes = new TextEncoder().encode(JSON.stringify(presentationForExport(deck)));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const payload = btoa(binary);
  const notices = (await noticesResponse.text()).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const title = deck.title.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Local Slides</title><style>${style.replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div><template id="third-party-notices"><pre>${notices}</pre></template><script>${script.replace(/<\/script/gi, '<\\/script')}</script><script>LocalSlidesPlayer.mount(document.getElementById('root'),JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('${payload}'),c=>c.charCodeAt(0)))));</script></body></html>`;
}
