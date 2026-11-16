# Contributing

Start with the [architecture](docs/architecture.md), [implementation plan](docs/implementation-plan.md), and [validation log](docs/validation.md). Setup and executable commands are in [Local development](docs/local-development.md).

## Workflow

1. Choose a focused change tied to a concrete behavior or defect.
2. Work on a separate branch and keep unrelated changes out of the contribution.
3. Implement the change and verify its effect on the document, editor, presentation, and exports where relevant.
4. Update the guides when user behavior, setup, formats, or architecture change.
5. Describe the resulting behavior, checks performed, and any limitations in the review description.

For browser defects, include the browser version, operating system, reproduction steps, and whether the app was running on localhost, HTTPS, or as an exported HTML file. Include a small reproducible deck or demo when possible.

## Development checks

```sh
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Run `npm run format` to format source and test files. Run `npm run test:static` after building when changing deployment, exports, Help, or asset paths. This check needs OpenSSL and Chrome, serves the built app over temporary local HTTPS under a subdirectory, and exercises actual tab capture against that build. It does not publish a site.

`npm run test:e2e` includes visible capture tests as well as headless UI tests. The visible tests automatically select only their own test tab. To run the UI suite without the capture cases, use `npm run test:e2e -- --grep-invert 'production demo crop'`. For Edge, prefix a command with `BROWSER_CHANNEL=msedge` on macOS or Linux, or set that environment variable in your shell on Windows.

Use meaningful automated checks for document invariants, file round trips, grouped undo, browser navigation, demo lifecycle, and capture safety. Use manual verification for permission pickers, operating system permissions, physical displays, and final presentation quality. Do not replace a required check with a weaker assertion merely to make it pass.

## Architectural expectations

- Preserve static deployment and operation without accounts or a database.
- Keep document data independent of UI selection and presentation runtime state.
- Treat a user gesture as one undo transaction.
- Use the shared renderer for editing, thumbnails, audience playback, and export preparation.
- Keep one live demo instance in the speaker console; the audience receives video, not another running app.
- Keep the capture target stable and outside private notes and controls. Unpublish and disable frames while sharing is paused.
- Run authored code in the sandbox. Opening an editable file must not execute its demo code.
- Validate imported schemas and assets before replacing the current deck.
- Keep saving explicit. Do not introduce silent browser presentation persistence.

Native files have a versioned schema. Update validation and migration expectations when changing it. Record material architecture changes and their rationale rather than leaving the plan inconsistent with the implementation.

## Documentation

| Source | Keep aligned with |
| --- | --- |
| `README.md` | Starting the application and the project overview |
| `docs/architecture.md` | Decisions, module boundaries, formats, and browser constraints |
| `docs/implementation-plan.md` | Milestones and acceptance criteria |
| `docs/validation.md` | Commands actually run, results, and outstanding checks |
| `docs/user-guide.md` | Features, interface labels, presentation, and exports |
| `docs/local-development.md` | Runtime prerequisites, scripts, build, and deployment |
| `CONTRIBUTING.md` | Contribution workflow and validation |

Help and `dist/docs/` are built from these sources. Update the relevant guide with feature changes; do not edit generated copies. Keep internal links relative so the build can map them to their generated destinations.

Runtime dependency and font notices are generated from the lockfile and included in the build and HTML exports. Keep those notices intact when distributing either output.
