import { Unzip, UnzipInflate, zip, strFromU8, strToU8, type Zippable } from 'fflate';
import { parseDeck, presentationForExport, type Asset, type Deck } from '../document/model';

const MAX_COMPRESSED = 50 * 1024 * 1024;
const MAX_EXPANDED = 128 * 1024 * 1024;
const MAX_ENTRIES = 512;

export async function encodeDeck(deck: Deck): Promise<Uint8Array> {
  const validated = presentationForExport(deck);
  const entries: Zippable = {
    'manifest.json': strToU8(JSON.stringify({ format: 'local-slides', schemaVersion: 1 })),
  };
  const assets: Record<string, Omit<Asset, 'data'> & { path: string }> = {};
  for (const asset of Object.values(validated.assets)) {
    const path = `assets/${asset.id}`;
    entries[path] = Uint8Array.from(atob(asset.data.split(',')[1]), (char) => char.charCodeAt(0));
    assets[asset.id] = { id: asset.id, name: asset.name, mime: asset.mime, path };
  }
  entries['deck.json'] = strToU8(JSON.stringify({ ...validated, assets }));
  if (Object.keys(entries).length > MAX_ENTRIES)
    throw new Error(
      'This presentation exceeds the 510 packaged image limit. Reuse existing images or remove some before saving.',
    );
  const expanded = Object.values(entries).reduce(
    (total, data) => total + (data as Uint8Array).length,
    0,
  );
  if (expanded > MAX_EXPANDED)
    throw new Error(
      'This presentation exceeds the 128 MB content limit. Reduce image sizes or split the deck before saving.',
    );
  const archive = await new Promise<Uint8Array>((resolve, reject) =>
    zip(entries, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data))),
  );
  if (archive.length > MAX_COMPRESSED)
    throw new Error(
      'This presentation exceeds the 50 MB file limit. Reduce image sizes or split the deck before saving.',
    );
  return archive;
}

function unpack(bytes: Uint8Array): Record<string, Uint8Array> {
  if (bytes.length > MAX_COMPRESSED)
    throw new Error('This file is larger than the 50 MB import limit.');
  const files: Record<string, Uint8Array> = Object.create(null);
  const names = new Set<string>();
  let expanded = 0;
  let failure: Error | null = null;
  const unzip = new Unzip((file) => {
    if (failure) return;
    if (
      names.has(file.name) ||
      names.size >= MAX_ENTRIES ||
      !/^(manifest\.json|deck\.json|assets\/[a-zA-Z0-9_-]{1,80})$/.test(file.name)
    ) {
      failure = new Error('This archive contains duplicate or unsupported files.');
      return;
    }
    names.add(file.name);
    const chunks: Uint8Array[] = [];
    let size = 0;
    file.ondata = (error, chunk, final) => {
      if (failure) return;
      if (error) {
        failure = new Error('The presentation archive is damaged.');
        return;
      }
      expanded += chunk.length;
      size += chunk.length;
      if (expanded > MAX_EXPANDED) {
        failure = new Error('The expanded presentation exceeds the 128 MB limit.');
        file.terminate();
        return;
      }
      chunks.push(chunk);
      if (final) {
        const data = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          data.set(c, offset);
          offset += c.length;
        }
        files[file.name] = data;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < bytes.length && !failure; offset += 8192)
      unzip.push(bytes.subarray(offset, offset + 8192), offset + 8192 >= bytes.length);
  } catch {
    throw new Error('This is not a valid .slides presentation.');
  }
  if (failure) throw failure;
  if (!files['manifest.json'] || !files['deck.json'])
    throw new Error('This file is missing its presentation manifest or content.');
  return files;
}

export function decodeDeck(bytes: Uint8Array): Deck {
  const files = unpack(bytes);
  let manifest: Record<string, unknown>;
  let raw: Record<string, unknown>;
  try {
    manifest = JSON.parse(strFromU8(files['manifest.json']));
    raw = JSON.parse(strFromU8(files['deck.json']));
  } catch {
    throw new Error('This presentation contains invalid document data.');
  }
  if (!manifest || manifest.format !== 'local-slides' || manifest.schemaVersion !== 1)
    throw new Error('This presentation format or version is not supported.');
  if (!raw || !raw.assets || typeof raw.assets !== 'object' || Array.isArray(raw.assets))
    throw new Error('This presentation has an invalid asset directory.');
  const assets: Record<string, Asset> = Object.create(null);
  for (const [key, value] of Object.entries(raw.assets)) {
    if (!value || typeof value !== 'object') throw new Error('An image entry is invalid.');
    const asset = value as Record<string, unknown>;
    if (
      asset.id !== key ||
      asset.path !== `assets/${key}` ||
      typeof asset.mime !== 'string' ||
      !files[String(asset.path)]
    )
      throw new Error('A packaged image is missing or invalid.');
    const data = files[String(asset.path)];
    let binary = '';
    for (let offset = 0; offset < data.length; offset += 8192)
      binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
    assets[key] = {
      id: key,
      name: String(asset.name),
      mime: asset.mime as Asset['mime'],
      data: `data:${asset.mime};base64,${btoa(binary)}`,
    };
  }
  try {
    return parseDeck({ ...raw, assets });
  } catch (error) {
    if (error instanceof Error && error.name !== 'ZodError') throw error;
    throw new Error('This presentation has unsupported or invalid slide content.', {
      cause: error,
    });
  }
}

export async function readDeck(file: File): Promise<Deck> {
  if (file.size > MAX_COMPRESSED)
    throw new Error('This file is larger than the 50 MB import limit.');
  return decodeDeck(new Uint8Array(await file.arrayBuffer()));
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export const safeFilename = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .slice(0, 100) || 'Presentation';
export async function readImage(file: File): Promise<Asset> {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type))
    throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('The image could not be read.'));
    r.readAsDataURL(file);
  });
  const image = new Image();
  image.src = data;
  await image.decode().catch(() => {
    throw new Error('This image file could not be decoded.');
  });
  return { id: crypto.randomUUID(), name: file.name, mime: file.type as Asset['mime'], data };
}
