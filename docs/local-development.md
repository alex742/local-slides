# Local development

Local Slides is a React and TypeScript application built with Vite. The editor, file operations, presentation, and demo mirroring run in the browser. The production output is static.

## Prerequisites

- Node.js 24 LTS and npm. `.nvmrc` records the development baseline.
- Desktop Chrome or Edge for presenting and browser tests.
- Git for source contributions.
- OpenSSL only for the optional local HTTPS validation command.

No application account, database, environment file, or API key is required. External demos can have their own dependencies and access requirements.

## Start the app

From the repository root:

```sh
npm ci
npm run dev
```

If you use nvm, run `nvm use` before installing. Open the URL printed by Vite, normally `http://127.0.0.1:5173`. Keep the terminal running while developing. The `predev` script generates the standalone player runtime before starting Vite.

Use localhost rather than opening development source files directly. Standalone HTML exports are separate files designed for direct opening. Presentation data stays in memory, including during development: export a deck before a refresh or source reload if you need to retain it.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and generate the player runtime first |
| `npm run build:player` | Rebuild the runtime packaged into HTML exports |
| `npm run build` | Type-check, build the player and app, preserve notices, and generate documentation |
| `npm run preview` | Serve the production build locally, normally on port 4173 |
| `npm run typecheck` | Check TypeScript without emitting application output |
| `npm run lint` | Check source and browser tests with ESLint |
| `npm test` | Run the document, history, URL, geometry, and capture-controller unit tests |
| `npm run test:e2e` | Run browser UI, export, presentation, and real capture tests in Chrome |
| `npm run test:capture` | Run the separate capture feasibility prototype in Chrome and Edge, plus failure cases |
| `npm run test:static` | Check a built HTTPS subdirectory deployment and real capture from it |
| `npm run check:docs` | Check canonical guide links and anchors |
| `npm run format` | Format source, tests, scripts, and configuration |
| `npm run format:check` | Check formatting without editing files |

After changing shared player code during development, run `npm run build:player` before testing a new HTML export. A production build always regenerates it. Avoid editing source or rebuilding the player while a browser acceptance run is in progress, because Vite reloads can invalidate the test session.

Chrome must be installed for the default browser suite. Set `BROWSER_CHANNEL=msedge` to test installed Edge. On macOS or Linux:

```sh
BROWSER_CHANNEL=msedge npm run test:e2e
```

The capture cases use isolated visible browser windows and the browser's test-only automatic tab selection. They capture the fixture application rather than the desktop. Human picker operation, operating system permissions, and two physical screens remain separate manual checks. Headless capture is not the baseline because its frame production was inconsistent during validation.

## Build and preview

```sh
npm run build
npm run preview
```

The build writes `dist/`, including application assets, a `player/` runtime with bundled fonts and notices, and readable guides in `docs/`. Follow the preview URL printed by Vite. Preview is for local verification rather than a production server.

## Static deployment

Publish the contents of `dist/` to an HTTPS static web host. No application server or rewrite-based router is required. Serve directory URLs with their trailing slash when using a subdirectory deployment. Keep the `assets/`, `player/`, and `docs/` directories together with `index.html`.

Verify the deployed editor, Help, exports, and capture setup in desktop Chrome and Edge. `npm run test:static` creates a temporary local TLS certificate and checks these paths under `/preview/slides/`; it removes the temporary certificate afterward.

Deploying the editor does not host a demo's backend. A localhost demo URL still refers to the machine running the presentation. External demo sites must permit embedding, and browser local network permissions can apply to localhost or private network demos.

## GitHub Pages deployment

The public repository is [alex742/local-slides](https://github.com/alex742/local-slides), and its application URL is [alex742.github.io/local-slides](https://alex742.github.io/local-slides/).

The repository's `.github/workflows/deploy.yml` runs on pushes to `main` and can also be started manually from GitHub's Actions tab. It installs the locked dependencies with Node 24, checks formatting, lint, unit tests, and documentation links, then builds the player and app. Only the generated `dist/` site is uploaded as the Pages artifact. A separate deployment job publishes that artifact to the `github-pages` environment. Action versions are pinned to official release commit hashes.

In repository **Settings → Pages**, the publishing source must be **GitHub Actions**. No custom domain, secret, or repository-specific Vite base path is required for this deployment: the app uses relative asset paths and has been checked under an HTTPS subdirectory. Keep the trailing slash on the application URL.

After pushing a change, follow the **Deploy to GitHub Pages** run in the Actions tab and wait for both jobs to complete. A failed validation or build prevents that revision from being published. The existing site continues serving its last successful deployment.

This deployment publishes the application and its source code. Each visitor's deck still stays in their own browser memory until they export it; publishing the editor does not publish a visitor's presentation.

## Source layout

| Directory | Responsibility |
| --- | --- |
| `src/document` | Schema, state, history, sample content, and document operations |
| `src/editor` | Canvas controls, rich text, toolbar, inspector, and slide rail |
| `src/demos` | Code editor, preview dialog, sandboxed frames, and URL handling |
| `src/renderer` | Shared slide rendering and rich-text sanitization |
| `src/presentation` | Capture controller, audience window, and demo console |
| `src/player` | Speaker and single-window presentation UI |
| `src/files` | Native deck, image, PDF, and HTML operations |
| `src/help` | Help dialog and canonical guide imports |
| `scripts` | Build, notices, documentation, and integration checks |
| `tests` | Browser acceptance workflows |

See [Contributing](../CONTRIBUTING.md) for the workflow and [Validation](validation.md) for checked results and manual follow-up.
