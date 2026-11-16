import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const position = z.number().finite().min(-10000).max(20000);
const base = {
  id,
  x: position,
  y: position,
  width: z.number().finite().min(1).max(10000),
  height: z.number().finite().min(1).max(10000),
  rotation: z.number().finite().min(-3600).max(3600),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  groupId: id.optional(),
};
export const textSchema = z.object({
  ...base,
  kind: z.literal('text'),
  html: z.string().max(200000),
  fontSize: z.number().min(8).max(400),
  fontFamily: z.enum(['Inter', 'Manrope']),
  fontWeight: z.number().min(100).max(900),
  color: color.optional(),
  align: z.enum(['left', 'center', 'right']),
  lineHeight: z.number().min(0.7).max(3),
});
export const shapeSchema = z.object({
  ...base,
  kind: z.literal('shape'),
  shape: z.enum(['rectangle', 'ellipse', 'line']),
  fill: color,
  stroke: color,
  strokeWidth: z.number().min(0).max(50),
  radius: z.number().min(0).max(500),
});
export const imageSchema = z.object({
  ...base,
  kind: z.literal('image'),
  assetId: id,
  fit: z.enum(['cover', 'contain']),
  alt: z.string().max(1000),
});
export const demoSchema = z.object({
  ...base,
  kind: z.literal('demo'),
  mode: z.enum(['authored', 'website']),
  title: z.string().max(500),
  html: z.string().max(500000),
  css: z.string().max(500000),
  js: z.string().max(500000),
  url: z.string().max(4000),
  posterAssetId: id.optional(),
});
export const elementSchema = z.discriminatedUnion('kind', [
  textSchema,
  shapeSchema,
  imageSchema,
  demoSchema,
]);
export const slideSchema = z.object({
  id,
  name: z.string().max(500),
  background: color,
  notes: z.string().max(50000),
  elements: z.array(elementSchema).max(500),
});
export const themeSchema = z.object({
  id,
  name: z.string().max(100),
  background: color,
  foreground: color,
  accent: color,
  soft: color,
  muted: color,
});
export const assetSchema = z.object({
  id,
  name: z.string().max(500),
  mime: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  data: z
    .string()
    .max(45000000)
    .regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/),
});
export const deckSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  title: z.string().min(1).max(500),
  width: z.number().min(320).max(3840),
  height: z.number().min(180).max(2160),
  theme: themeSchema,
  slides: z.array(slideSchema).min(1).max(200),
  assets: z.record(id, assetSchema),
});
export type Deck = z.infer<typeof deckSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type SlideElement = z.infer<typeof elementSchema>;
export type TextElement = z.infer<typeof textSchema>;
export type DemoElement = z.infer<typeof demoSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type Theme = z.infer<typeof themeSchema>;
export const uid = () => crypto.randomUUID();

export function parseDeck(input: unknown): Deck {
  const deck = deckSchema.parse(input);
  const ids = new Set<string>();
  const addId = (value: string) => {
    if (ids.has(value)) throw new Error('The presentation contains duplicate object IDs.');
    ids.add(value);
  };
  addId(deck.id);
  for (const [key, asset] of Object.entries(deck.assets)) {
    if (key !== asset.id) throw new Error('An image has an invalid asset reference.');
    addId(asset.id);
    if (!asset.data.startsWith(`data:${asset.mime};base64,`))
      throw new Error('An image has an inconsistent file type.');
  }
  for (const slide of deck.slides) {
    addId(slide.id);
    if (slide.elements.filter((node) => node.kind === 'demo').length > 1)
      throw new Error(
        'Each slide supports one live demo. Put additional demos on their own slides.',
      );
    for (const node of slide.elements) {
      addId(node.id);
      if (node.kind === 'demo' && node.rotation !== 0)
        throw new Error('Rotated demo frames are not supported. Keep live demo rotation at zero.');
      if (node.kind === 'image' && !deck.assets[node.assetId])
        throw new Error('A slide references a missing image.');
      if (node.kind === 'demo' && node.posterAssetId && !deck.assets[node.posterAssetId])
        throw new Error('A demo references a missing poster.');
    }
  }
  return deck;
}

export function presentationForExport(input: Deck): Deck {
  const deck = parseDeck(input),
    used = new Set<string>();
  for (const slide of deck.slides)
    for (const node of slide.elements) {
      if (node.kind === 'image') used.add(node.assetId);
      if (node.kind === 'demo' && node.posterAssetId) used.add(node.posterAssetId);
    }
  return {
    ...deck,
    assets: Object.fromEntries(Object.entries(deck.assets).filter(([id]) => used.has(id))),
  };
}

export const themes: Theme[] = [
  {
    id: 'studio',
    name: 'Studio',
    background: '#F7F5F0',
    foreground: '#222536',
    accent: '#7153E8',
    soft: '#E9E3FC',
    muted: '#777382',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#18252D',
    foreground: '#F4F3ED',
    accent: '#B8DFB2',
    soft: '#31463D',
    muted: '#B1C1BD',
  },
  {
    id: 'coral',
    name: 'Sunroom',
    background: '#FFF5E9',
    foreground: '#3B2E34',
    accent: '#DD7159',
    soft: '#F9DDD1',
    muted: '#977B7D',
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    background: '#F0F5FD',
    foreground: '#173A64',
    accent: '#397AE7',
    soft: '#DCE8FA',
    muted: '#687F9B',
  },
];
export const baseElement = (x = 80, y = 80, width = 400, height = 100) => ({
  id: uid(),
  x,
  y,
  width,
  height,
  rotation: 0,
  opacity: 1,
  locked: false,
});
export function newText(
  text = 'Your next big idea',
  x = 80,
  y = 80,
  width = 700,
  height = 120,
): TextElement {
  return {
    ...baseElement(x, y, width, height),
    kind: 'text',
    html: `<p>${text}</p>`,
    fontSize: 48,
    fontFamily: 'Manrope',
    fontWeight: 600,
    align: 'left',
    lineHeight: 1.15,
  };
}
export function newSlide(theme: Theme, layout = 'blank'): Slide {
  const slide: Slide = {
    id: uid(),
    name: layout === 'blank' ? 'Untitled slide' : 'A fresh perspective',
    background: theme.background,
    notes: '',
    elements: [],
  };
  if (layout !== 'blank') {
    slide.elements.push(
      newText(
        layout === 'title' ? 'Your next big idea' : 'A fresh perspective',
        84,
        142,
        1060,
        190,
      ),
    );
    slide.elements.push({
      ...newText('Add a little context. Make it your own.', 88, 372, 920, 80),
      fontSize: 28,
      fontFamily: 'Inter',
      fontWeight: 400,
      color: theme.muted,
    });
    if (layout === 'split') {
      slide.elements[0].width = 570;
      slide.elements[1].width = 500;
      slide.elements.push({
        ...baseElement(742, 120, 430, 470),
        kind: 'shape',
        shape: 'rectangle',
        fill: theme.soft,
        stroke: theme.soft,
        strokeWidth: 0,
        radius: 24,
      });
    }
  }
  return slide;
}
