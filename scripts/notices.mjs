import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function writeNotices(output) {
  const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'));
  const sections = [
    'Local Slides third party notices\n\nThese notices accompany the locked runtime dependencies and bundled fonts.',
  ];
  let count = 0;
  for (const [path, metadata] of Object.entries(lock.packages)) {
    if (!path || metadata.dev || metadata.devOptional) continue;
    const directory = resolve(root, path);
    let pkg;
    try {
      pkg = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    const names = (await readdir(directory)).filter((name) =>
      /^(licen[sc]e|copying|ofl)(\.|$)/i.test(name),
    );
    const texts = [];
    for (const name of names)
      try {
        texts.push(await readFile(resolve(directory, name), 'utf8'));
      } catch {
        /* Directories named license are not text files. */
      }
    sections.push(
      `${'='.repeat(72)}\n${pkg.name} ${pkg.version}\nLicense: ${typeof pkg.license === 'string' ? pkg.license : metadata.license || 'See package license'}\n\n${texts.join('\n\n') || `Package license: ${pkg.repository?.url || pkg.homepage || pkg.name}`}`,
    );
    count++;
  }
  await writeFile(output, sections.join('\n\n'));
  console.log(`Preserved third party notices for ${count} runtime packages.`);
}
