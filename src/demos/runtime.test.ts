import { describe, expect, it } from 'vitest';
import { websiteUrl } from './runtime';

describe('website demo URLs', () => {
  it('allows a separate HTTP or HTTPS origin', () => {
    expect(websiteUrl('http://localhost:4000', 'http://localhost:5173')).toBe(
      'http://localhost:4000/',
    );
  });
  it('rejects executable, credential-bearing, and same-origin URLs', () => {
    for (const input of [
      'javascript:alert(1)',
      'data:text/html,test',
      'https://user:password@example.com',
      'https://slides.example/demo',
    ])
      expect(() => websiteUrl(input, 'https://slides.example')).toThrow();
  });
});
