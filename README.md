# Local Slides

A browser slide studio for presentations with live product demos. Create and edit a deck, present with private notes, and export an editable file, a PDF, or a standalone interactive HTML player.

Open the [hosted application](https://alex742.github.io/local-slides/) or follow the local setup below.

## Run locally

Use Node.js 24 LTS and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite, normally `http://127.0.0.1:5173`. Use desktop Chrome or Edge for demo sharing. No account, database, environment file, or API key is required.

The example deck is ready to explore. Choose the purple File menu for a new presentation. Presentations stay in memory; choose **Export → Editable deck** to save your work before closing or refreshing.

## Features

- Text, local images, shapes, backgrounds, themes, and starter layouts.
- Drag, resize, rotate, snapping, guides, alignment, grouping, layers, locking, and undo/redo.
- Slide creation, ordering, duplication, speaker notes, and zoom.
- HTML/CSS/JavaScript demo authoring, live preview, runtime errors, and website embeds.
- Speaker view with a timer, next slide, notes, a live demo console, and a passive audience window.
- Cropped tab capture that mirrors one live demo instance into the audience's slide.
- Portable `.slides` files, high-resolution image-based PDFs, and self-contained HTML players.
- Help covering use, local development, architecture, and contributions.

There is no automatic presentation persistence or cloud sharing. External demos can require internet access and must permit embedding. PowerPoint compatibility and collaboration are outside this release.

## Build and validate

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run preview
```

Browser checks require installed Chrome; the capture tests open isolated visible browser windows and automatically select their own fixture tab. Use `BROWSER_CHANNEL=msedge npm run test:e2e` to check Edge. See the [local development guide](docs/local-development.md) for the static HTTPS check and full commands.

`dist/` is the static deployable app. It includes Help, readable guides in `dist/docs/`, and a player runtime with third-party notices. Deploy that directory to an HTTPS static host. A backend is not required.

The included GitHub Pages workflow validates and deploys `main` automatically. See [GitHub Pages deployment](docs/local-development.md#github-pages-deployment) for its configuration.

## Documentation

- [User guide](docs/user-guide.md)
- [Local development and deployment](docs/local-development.md)
- [Contributing](CONTRIBUTING.md)
- [Architecture and decisions](docs/architecture.md)
- [Implementation plan](docs/implementation-plan.md)
- [Validation results and remaining manual checks](docs/validation.md)

The repository guides are the canonical sources for the Help dialog and bundled documentation. The player also includes the guides so exported presentations retain their help content.
