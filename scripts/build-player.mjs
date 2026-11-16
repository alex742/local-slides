import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeNotices } from './notices.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function buildPlayer() {
  await build({
    root,
    configFile: false,
    plugins: [react()],
    publicDir: false,
    logLevel: 'warn',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      lib: {
        entry: resolve(root, 'src/player-entry.tsx'),
        name: 'LocalSlidesPlayer',
        formats: ['iife'],
        fileName: () => 'player.js',
        cssFileName: 'player',
      },
      outDir: resolve(root, 'public/player'),
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsInlineLimit: () => true,
      chunkSizeWarningLimit: 3000,
    },
  });
  await writeNotices(resolve(root, 'public/player/THIRD_PARTY_NOTICES.txt'));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildPlayer();
