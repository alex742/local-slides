# Architecture and decisions

Agreed on 16 November 2026 and updated during implementation. The editor, player, exports, Help, and cropped demo mirroring are implemented. See the [validation log](validation.md) for completed checks and the remaining manual display and permission checks.

## Agreed requirements

| Area | Decision |
| --- | --- |
| Authoring | A polished visual editor with drag and resize controls, alignment guides, layers, themes, and speaker notes |
| Presentation | Desktop Chrome and Edge, with a speaker window and separate audience display |
| Interactive content | Both embedded websites and demos authored as HTML, CSS, and JavaScript with live preview |
| Demo control | Control the demo from the speaker window and mirror its live output to the audience |
| Capture workflow | A browser Share this tab prompt is acceptable when starting capture |
| Editable files | Our own portable presentation format, reopened locally in the app |
| Other exports | A standalone interactive HTML player and high-resolution raster PDF |
| Connectivity | An internet connection during use is acceptable |
| Persistence | Presentation state stays in memory; saving requires an explicit file export |
| Accounts | No application accounts or login |
| Documentation | Architecture, implementation plan, user guide, local setup, contribution guide, and in-app Help included in the build |

PowerPoint import and export, real-time collaboration, cloud storage, a no-code application builder, and an in-browser React or npm development environment are outside the first release. The standalone player presents decks; editing happens in the main application.

## Static frontend architecture

Use React, TypeScript, and Vite. The production application consists of static files served over HTTPS; development runs through localhost. The application needs no backend for editing, file processing, presentation, or local demo mirroring. Vite supports this [static deployment model](https://vite.dev/guide/static-deploy.html).

Opening a deck reads a user-selected file into browser memory; it does not upload that file to application storage. Sharing is file-based: a link to the editor does not transfer the current deck. Frontend code cannot keep private service credentials secret, so demos that need confidential credentials must use a separate service. The first release coordinates windows on the presenter's machine rather than broadcasting to remote viewers.

The main application owns the in-memory deck and changes into a speaker view when presenting. It opens a separate audience window, which the user moves to the audience display. Browser window placement remains manual in the first release.

The same slide renderer serves the editor, audience view, thumbnails, PDF preparation, and standalone player. Editing handles and controls are separate overlays. Native text and graphics render directly in the audience window; only the active demo viewport uses a video mirror.

The module boundaries are:

| Module | Responsibility |
| --- | --- |
| Document | Versioned deck schema, document operations, themes, and migrations |
| Assets | In-memory images, fonts, demo resources, posters, and object URL lifetimes |
| Renderer | Deterministic slide layout with HTML, CSS, and SVG |
| Editor | Selection, transforms, rich text, slide ordering, layers, guides, and undo |
| Presentation | Speaker controls, audience rendering, navigation, and window lifecycle |
| Demos | Authored code, iframe execution, preview, capture, reset, and fallback |
| File operations | Native archive validation, import, export, PDF, and HTML packaging |
| Help | Guides rendered from the canonical documentation sources |

## Stack

| Concern | Selected approach |
| --- | --- |
| Application | React, TypeScript in strict mode, Vite, and npm |
| Slide surface | HTML and CSS positioning, with SVG for shapes |
| Object transforms | [Moveable](https://daybrush.com/moveable/release/latest/doc/) for dragging, resizing, rotation, and snapping |
| Rich text | Open-source [Tiptap](https://tiptap.dev/docs/editor/getting-started/overview) extensions |
| UI controls | [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) with application styles |
| State | [Zustand](https://github.com/pmndrs/zustand), with document history managed as user transactions |
| Demo code editor | [CodeMirror](https://codemirror.net/) |
| Schema validation | [Zod](https://zod.dev/) |
| Native archive | [fflate](https://github.com/101arrowz/fflate) |
| PDF | [html-to-image](https://github.com/bubkoo/html-to-image) followed by [jsPDF](https://github.com/parallax/jsPDF) |
| Demo mirroring | Screen Capture API and Region Capture with a persistent demo console |
| Verification | Vitest for document logic and Playwright for browser workflows, with manual capture checks |
| Documentation display | Markdown rendered at build time or bundled into Help; no runtime documentation service |

Package versions are pinned in the manifest and lockfile. The build preserves runtime package and font notices in `dist/player/THIRD_PARTY_NOTICES.txt` and embeds them in HTML exports. The product does not require Tiptap cloud services or paid editor extensions.

## Document and state model

Use a versioned document model rather than serializing the editor DOM. A deck contains slide dimensions, theme tokens, ordered slides, notes, and asset references. Each slide contains a background and ordered elements with stable IDs. Initial element types are rich text, image, shape, website embed, and authored demo.

Elements use slide coordinates independent of the browser viewport. Themes supply defaults; explicit element styles override them. Rendering at a different screen size scales the same logical slide.

Maintain three separate forms of state:

- Document state: editable slide content, assets, themes, notes, and demo source.
- Editor state: selection, active tool, zoom, panels, and undo history.
- Presentation state: current slide, connected audience window, active demo, and capture status.

Undo follows user actions. One drag is one undo step, and related text changes are grouped. Import, export, and presentation must not depend on editor selection or zoom. Do not persist decks to localStorage or IndexedDB. Show unsaved changes and explain that exporting saves the presentation.

Implementation defaults are a 16:9 slide, a small set of bundled fonts and themes, and one active live demo per slide. Ordinary objects support rotation; live demo viewports remain axis-aligned initially. These are implementation defaults, not additional confirmed user requirements.

## Demo authoring and execution

An authored demo stores HTML, CSS, and JavaScript as source. Preview assembles them into a sandboxed iframe. Use browser-ready JavaScript; package installation, TypeScript compilation, Node.js processes, and arbitrary multi-file application builds are outside the first release.

External websites load by URL in an iframe. Existing applications may refuse embedding through [frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) or X-Frame-Options. The app cannot override those headers. Provide a poster and an external link when a site cannot be embedded. Localhost demo URLs refer to the machine running the presentation and remain subject to browser local network rules.

Use explicit Edit, Preview, and Interact states so selection gestures do not accidentally activate a demo. Imported code does not run merely because a deck is opened. Scripts run on an explicit preview or presentation action. Keep authored code outside the editor document through [iframe sandboxing](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe).

Provide reset and return-to-slides controls outside the iframe. A demo can consume keyboard input while focused; navigation remains available in the speaker controls. Reset demo state on entering a slide by default. Session runtime state is not serialized into exported source.

## Mirroring from the speaker window

Run one live demo in a dedicated console beside the speaker notes. The console fits the demo's aspect ratio to the available space without a CSS transform on the iframe. The audience receives a cropped video of that instance inside its original slide, with native text and shapes around it. It does not run a second copy of the demo.

This layout adapts the original idea of placing the live iframe inside the speaker's scaled slide preview. Chrome integration checks found unreliable pointer hit testing after capture in that arrangement. The console uses the unscaled arrangement validated in the initial prototype and makes the app controls easier to operate. Single-window playback still places the interactive demo directly inside its slide.

The intended flow is:

1. A user action starts tab capture and opens the browser's capture picker.
2. The speaker selects the current speaker tab.
3. The application validates the selected surface and crops the track to the live demo viewport.
4. Only after cropping succeeds does the audience receive the video.
5. Native slide elements continue rendering normally around the mirrored viewport.
6. If capture ends or becomes invalid, the audience returns to the demo poster.

The capture permission cannot be silently reused across capture sessions. Browser documentation describes [capture prompts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) and [Region Capture cropping](https://developer.chrome.com/docs/web-platform/region-capture).

Keep notes, controls, and overlays outside the captured rectangle. Region Capture includes pixels that overlap that rectangle, so correct layout is part of notes isolation. Never send an uncropped feed as a fallback.

The audience is an explicitly opened `about:blank` window that inherits the opener's origin. A React portal renders the passive audience view there; the deck and already cropped MediaStream are shared by local object reference. This replaces the initially proposed audience message channel and works for the standalone file as well as the hosted app. No remote relay or browser storage is required. Closing the source presentation closes its audience window.

The crop target is one persistent console element. Region Capture follows its bounds as the console resizes. Pausing unpublishes the stream and disables its video track. Resuming that same validated target re-enables the track after the UI has painted, avoiding an unnecessary crop operation on a stream already attached in another window. A different target must pass cropping again before publication. Help pauses the stream while its dialog is open, and audience video is removed on ordinary slides and failed sharing.

[postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) is used only for authored-demo readiness and error reporting, with checks for the source iframe, namespace, and per-instance token. Authored frames keep an opaque sandbox origin. Website demos retain their own origin for normal website functionality and must use an HTTP or HTTPS origin different from the editor.

This mechanism mirrors content that is visible and capturable in the speaker tab. It does not make blocked embeds work. Protected media, browser policies, performance, and capture resolution can limit the result. Demo audio is not an acceptance requirement for the first prototype; ordinary speaker-machine playback can be evaluated separately.

## File formats and exports

### Editable deck

Use a ZIP-based `.slides` file containing `manifest.json`, `deck.json`, and referenced images under `assets/`. Demo source and notes are part of the deck data. Export only referenced assets so deleted or replaced images are not carried into the shared file. Validate the archive, resource limits, schema, IDs, image references, one-demo-per-slide rule, and axis-aligned demo geometry before replacing the current deck. Unsupported versions produce a clear error. Import limits are 50 MB compressed, 128 MB expanded, and 512 archive entries. A later import migration must be explicit and testable.

Embedded assets are portable. Website URLs and external dependencies remain references and can require internet access. Archive round trips must preserve slide order, geometry, themes, notes, source code, and asset references.

### PDF

Render each slide in an export surface with bundled fonts loaded and demo viewports replaced by their posters. Rasterize slides sequentially and insert the resulting images into a PDF with matching slide proportions. Start with a 2560 by 1440 raster for the default 16:9 slide; adapt proportionally for other dimensions.

PDF text is not selectable, and demos are not interactive. Visual consistency is the chosen priority. HTML/CSS rasterization is covered by browser export checks and visual inspection of rendered PDF pages. Posters may be uploaded or captured from the active permitted demo stream in the editor's speaker view; captured posters become ordinary deck assets.

### Standalone HTML

Export a single HTML file containing the player runtime, styles, deck content, and packaged assets. It plays without the editor being installed or served. An exported player uses the same presentation components as the main app, with editing controls excluded.

Bundle first-party runtime resources instead of loading them from a CDN. External demo URLs, fonts explicitly referenced by demo code, and external scripts may still require internet access. Safely encode document data and demo source so user text cannot break the exported page structure.

Basic playback, authored demos, speaker view, and cropped audience mirroring have passed direct-file browser checks. The inherited-origin popup avoids depending on BroadcastChannel for [restricted file origins](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy). External sites may still treat the exported player's origin differently from the hosted application.

## Help and documentation in the build

Canonical sources are the user guide, local development guide, contribution guide, this architecture file, and the implementation plan. The in-app Help page has sections for using the application, running locally, contributing, and troubleshooting. Include the feature guide in the standalone player as well.

The production build bundles those sources for a Help dialog and writes readable Markdown into `dist/docs/`. The dialog preserves the in-memory deck instead of navigating away to a separate route. The standalone player includes the guides too. Both outputs are generated from canonical sources. Relative asset paths support static subdirectory hosting without server rewrites.

Publish a documentation index and the guides together under that directory. Rewrite repository-relative links to the generated destinations during the build, including links to the root contribution guide. Help must resolve those same links to its own sections. Check both the source links and the generated links so moving a guide into build output does not break navigation.

## Deferred capabilities

PowerPoint compatibility would require a separate fidelity investigation. Cloud sharing and collaboration would introduce storage and coordination services. Prompt-free synchronization could later use an explicit integration supplied by demo authors; it is not a substitute for generic capture in the agreed first release.
