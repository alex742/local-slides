import guide from '../../docs/user-guide.md?raw';
import local from '../../docs/local-development.md?raw';
import contributing from '../../CONTRIBUTING.md?raw';
import architecture from '../../docs/architecture.md?raw';
import plan from '../../docs/implementation-plan.md?raw';
import validation from '../../docs/validation.md?raw';

export const helpSources = [
  { id: 'guide', title: 'Using Local Slides', file: 'user-guide.md', content: guide },
  { id: 'local', title: 'Run locally', file: 'local-development.md', content: local },
  { id: 'contributing', title: 'Contribute', file: 'CONTRIBUTING.md', content: contributing },
  { id: 'architecture', title: 'Architecture', file: 'architecture.md', content: architecture },
  { id: 'plan', title: 'Build plan', file: 'implementation-plan.md', content: plan },
  { id: 'validation', title: 'Validation', file: 'validation.md', content: validation },
];
export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
