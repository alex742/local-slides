import { build } from 'vite';
import { buildPlayer } from './build-player.mjs';
import { buildDocumentation } from './documentation.mjs';

await buildPlayer();
await build();
await buildDocumentation();
