import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, posix } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const sources = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/architecture.md',
  'docs/implementation-plan.md',
  'docs/user-guide.md',
  'docs/local-development.md',
  'docs/validation.md',
];
const destinations = new Map(
  sources.map((source) => [source, source === 'README.md' ? 'index.md' : posix.basename(source)]),
);
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
const links = /\[[^\]]+\]\(([^)]+)\)/g;
export async function buildDocumentation(checkOnly = false) {
  const docs = new Map(
    await Promise.all(
      sources.map(async (source) => [source, await readFile(resolve(root, source), 'utf8')]),
    ),
  );
  let count = 0;
  for (const [source, content] of docs) {
    const result = content.replace(links, (full, target) => {
      if (/^(https?:|mailto:)/.test(target)) return full;
      const [path, anchor] = target.split('#');
      const key = path ? posix.normalize(posix.join(posix.dirname(source), path)) : source;
      const body = docs.get(key);
      if (!body) throw new Error(`Broken documentation link in ${source}: ${target}`);
      if (
        anchor &&
        !Array.from(body.matchAll(/^#{1,6}\s+(.+)$/gm), (m) => slug(m[1])).includes(anchor)
      )
        throw new Error(`Broken documentation anchor in ${source}: ${target}`);
      count++;
      return full.replace(`(${target})`, `(${destinations.get(key)}${anchor ? '#' + anchor : ''})`);
    });
    if (!checkOnly) {
      await mkdir(resolve(root, 'dist/docs'), { recursive: true });
      await writeFile(resolve(root, 'dist/docs', destinations.get(source)), result);
    }
  }
  console.log(
    `Documentation: ${docs.size} sources, ${count} local links verified${checkOnly ? '' : '; built into dist/docs/'}.`,
  );
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await buildDocumentation(process.argv.includes('--check'));
