# Implementation validation

This log records checks actually run. Pending checks are not counted as completed.

## Milestone 0 Capture feasibility

Validated on macOS on 16 November 2026 with Node 24.22.1, Chrome 157.0.8103.51, and Edge 157.0.4341.60.

`scripts/verify-capture.mjs` passed nine assertions for each of four cases: Chrome and Edge, both on localhost and from a directly opened HTML file. These checks use real tab capture with the test browser automatically accepting its own fixture tab; they do not substitute a synthetic camera for screen capture.

Verified capture and crop API availability, absence of a second audience app instance, actual video pixels excluding the private notes color, interaction and asynchronous updates, scrolling, resized crop boundaries, stopped capture clearing the video, one network action from a cross-origin demo, and reconnecting an audience window. The local cross-origin fixture is granted loopback-network permission in the isolated browser context.

`scripts/verify-capture-failures.mjs` also passed five controlled failure cases: permission denial, wrong surface, crop failure, stopping while the picker is pending, and a crop that has not completed. No case delivered an uncropped stream to the audience, and rejected tracks were stopped.

### Reviewed changes to the implementation approach

- Real capture verification runs in visible isolated browser windows. Headless capture intermittently produced no frames and is not the acceptance baseline.
- Changing demo sources creates a fresh sandboxed iframe. Reusing a frame across authored and external sources caused unreliable frame tracking during automation; replacement passed the cross-origin checks in both browsers.
- Video dimensions need not change when the crop is resized. The assertion checks updated video pixels and exclusion of the surrounding notes, rather than assuming an output-resolution change.
- The automated feasibility gate is complete. At this milestone, human picker operation, physical two-display image quality and latency, and a served HTTPS build were reserved for final checks. Milestone 5 completed the HTTPS checks; the hardware and human permission checks remain outstanding.

The next milestone can use the single-instance cropped-stream design. Production capture will receive its own regression coverage when integrated into the player.

### Dependency baseline

Dependencies are locked. An npm audit after installation reported no vulnerabilities after pinning the linter's glob matcher to the patched minimatch 11.0.1 through a scoped override. The override must remain covered by the lint and build checks.

## Milestone 1 Document foundation

Passed `npm run typecheck`, `npm test` (7 assertions across native-file and history tests), `npm run lint`, `npm run build`, `npm run check:docs`, and all 3 foundation browser tests.

Verified archive round trips preserving binary asset data, demo source, notes, theme, and geometry; rejection of unsupported versions, unsafe paths, duplicate element IDs, and missing images; and grouped undo with redo-branch invalidation.

Browser checks verified navigation without executing demo source, Help sections without losing the deck, a downloaded native file reopening correctly, raster PDF download, and a directly opened single-file HTML player navigating without HTTP requests or browser errors. The build also generated the documentation files and verified their source links.

Reviewed implementation fixes: the standalone library bundle explicitly substitutes the production environment instead of expecting Node globals. Download tests save exported files with their actual extension before opening them, matching the end-user workflow.

Milestone 1 automated gate is complete. Milestone 2 can build on the validated model, history, renderer, file operations, and Help.

## Milestone 2 Visual editor

Passed all 11 unit tests, all 7 editor/foundation browser tests, lint, type checking, and the production build. Browser coverage includes rich text and grouped text edits, exact logical drag distance, a multi-frame drag undone in one step, resize handles, rotation, grouping, duplication, locking, slide duplication and deletion, themes, image insertion, and unchanged document geometry across zoom.

Reviewed implementation changes: selection updates synchronously on pointer-down before Moveable handles mouse-down. Transform state also reaches the DOM synchronously, and measured bounds are not reset during a live gesture. These changes fixed a repeatable resize correction loop. Screenshots of the starting deck and transform controls were inspected.

The editor gate is complete. Demo authoring can now build on the validated editor controls.

## Milestone 3 Interactive authoring

Passed all 14 unit tests, all 10 combined browser tests, lint, type checking, and the production build. The demo-specific workflows verify HTML/CSS/JavaScript editing, explicit activation, live preview updates, input and clicks, reset, runtime error reporting, apply and cancel, website interaction with one request per action, an external-link fallback, and rejection of invalid website URLs.

Imported demo source remained inactive, rich-text scripts and event handlers were removed from rendering, and an authored preview could not access the parent editor document. Demo source and bridge scripts use encoded script URLs so code strings cannot prematurely close the surrounding document's script element.

Reviewed implementation choice: authored frames have an opaque sandbox origin. External website frames retain their own origin for normal application functionality and must use a different origin from the editor. The one-live-demo-per-slide constraint is enforced during file validation as well as authoring; reuse a demo by duplicating its slide.

The authoring gate is complete. Speaker-mode and standalone-player integration follow next.

## Milestone 4 Presentation and portable exports

Passed all 21 unit tests, all 15 combined browser workflows, lint, type checking, and the production build. Both the hosted editor and a directly opened HTML export passed actual tab-capture checks with no private notes pixels in the audience video. Checks also covered a single active app instance, typing and pointer actions, preserved demo state during Help, resumed sharing across slides within one capture session, captured poster images, and stopped sharing restoring the poster.

Speaker notes, the timer, current and next slide information, audience navigation, popup closure, and standalone authored-demo playback were verified. The HTML player operated without HTTP requests for its packaged resources. Invalid imports preserved the open deck.

Reviewed plan changes:

- The speaker now operates a dedicated demo console. Captured scaled iframes showed unreliable pointer hit testing during Chrome integration checks; the unscaled console passed real interactions and keeps the original audience slide intact.
- A persistent crop target follows the console's bounds. Help and navigation unpublish and disable frames; resuming the same target does not perform another crop operation or request another picker. A changed target still requires validation before publication.
- The inherited-origin audience popup is rendered with a React portal and shares a cropped stream by reference, rather than receiving a duplicated application or a serialized media stream.

The presentation gate is complete. The final pass covers a clean setup, Edge, built HTTPS subdirectory hosting, generated guides, dependency notices, and PDF appearance.

## Milestone 5 Final verification

Completed on 16 November 2026 with the Node 24.22.1 baseline and the Chrome and Edge versions recorded above.

| Check | Result |
| --- | --- |
| Clean `npm ci` | 458 packages installed successfully; npm audit reported 0 vulnerabilities |
| `npm run format:check` | Passed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 23 tests passed across 6 files |
| `npm run check:docs` | 7 canonical sources and 18 local links verified |
| `npm run build` | Player, app, runtime notices, and `dist/docs/` generated successfully |
| `npm run test:e2e` | All 15 workflows passed in Chrome |
| `BROWSER_CHANNEL=msedge npm run test:e2e` | All 15 workflows passed in Edge |
| `npm run test:static` | Chrome passed the production build at an HTTPS subdirectory, documentation, standalone export, and 2 real capture cases |
| `BROWSER_CHANNEL=msedge npm run test:static` | Edge passed the same production checks and 2 real capture cases |

Both production checks served only built files under `/preview/slides/`, verified a secure context, followed all 18 built documentation links, checked runtime and font notices, and opened an exported HTML player without HTTP requests for packaged resources. No browser page errors were recorded. Real video pixels excluded the private notes color, and typing, clicks, pause/resume, navigation, and stopped sharing passed in both browsers.

The final exported PDF was parsed to verify three proportionally correct pages, rendered with Poppler, and visually inspected page by page. No clipping, overlap, missing text, or missing demo poster was found. Editor, Help, and speaker screenshots were also inspected.

Final hardening prunes unused image assets from native and HTML exports, rejects rotated demo viewports during import, and checks native archive limits during export as well as import. Focused tests cover the added document invariants. Generated HTML exports retain dependency and font notices.

The automated final gate is complete. The following checks depend on the user's permission restart and physical display arrangement and are not represented as completed by browser automation.

## Remaining manual checks

- Human operation of the browser capture picker and any operating system permission prompts.
- Verification after the application restart needed for the user's newly granted capture permissions.
- Image quality, interaction delay, window placement, and fullscreen behavior on the user's two physical displays.

Automated tab selection in isolated test browsers does not count as completing those hardware and permission checks.
