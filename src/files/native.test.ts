import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { createSampleDeck } from '../document/sample';
import { decodeDeck, encodeDeck } from './native';
import { parseDeck } from '../document/model';

describe('portable presentation files', () => {
  it('round trips slide geometry, notes, authored code, themes, and binary images', async () => {
    const deck = createSampleDeck();
    deck.assets.logo = {
      id: 'logo',
      name: 'pixel.png',
      mime: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgo=',
    };
    deck.slides[0].elements.push({
      id: 'logo-image',
      kind: 'image',
      assetId: 'logo',
      fit: 'contain',
      alt: 'Logo',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      rotation: 0,
      opacity: 1,
      locked: false,
    });
    deck.slides[2].elements.find((n) => n.kind === 'demo')!.groupId = 'demo-group';
    const encoded = await encodeDeck(deck);
    expect(decodeDeck(encoded)).toEqual(deck);
  });
  it('rejects an unsupported archive version without replacing content', () => {
    const bytes = zipSync({
      'manifest.json': strToU8(JSON.stringify({ format: 'local-slides', schemaVersion: 99 })),
      'deck.json': strToU8('{}'),
    });
    expect(() => decodeDeck(bytes)).toThrow(/version is not supported/);
  });
  it('rejects non-archives and unexpected archive paths', () => {
    expect(() => decodeDeck(strToU8('not a presentation'))).toThrow();
    expect(() => decodeDeck(zipSync({ '../outside.txt': strToU8('x') }))).toThrow(
      /unsupported files/,
    );
  });
  it('rejects duplicate element identities and missing assets', () => {
    const deck = createSampleDeck();
    deck.slides[0].elements[0].id = deck.slides[0].elements[1].id;
    expect(() => parseDeck(deck)).toThrow(/duplicate/);
    const other = createSampleDeck();
    other.slides[0].elements.push({
      id: 'img',
      kind: 'image',
      assetId: 'missing',
      fit: 'cover',
      alt: '',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      locked: false,
    });
    expect(() => parseDeck(other)).toThrow(/missing image/);
  });
  it('rejects more than one live demo on a slide', () => {
    const deck = createSampleDeck();
    const source = deck.slides[2].elements.find((n) => n.kind === 'demo')!;
    deck.slides[2].elements.push({ ...source, id: 'second-demo' });
    expect(() => parseDeck(deck)).toThrow(/one live demo/);
  });
  it('excludes unused image data from exports without changing the session', async () => {
    const deck = createSampleDeck();
    deck.assets.deleted = {
      id: 'deleted',
      name: 'removed.png',
      mime: 'image/png',
      data: 'data:image/png;base64,iVBORw0KGgo=',
    };
    const copy = decodeDeck(await encodeDeck(deck));
    expect(copy.assets).toEqual({});
    expect(deck.assets.deleted).toBeDefined();
  });
  it('rejects a rotated live demo rather than rendering it inconsistently', () => {
    const deck = createSampleDeck();
    const demo = deck.slides[2].elements.find((n) => n.kind === 'demo')!;
    demo.rotation = 15;
    expect(() => parseDeck(deck)).toThrow(/rotation at zero/);
  });
});
