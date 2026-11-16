# Implementation plan

Milestones 0 through 5 have passed their automated gates. The application, documentation, and deployable static build are complete. Human permission-picker operation and verification on two physical displays remain manual acceptance checks. See the [validation log](validation.md) for commands actually run and the outstanding checks. The milestone criteria below remain the reference for changes.

## Milestone 0 Prove demo mirroring

Build a minimal static prototype with a speaker tab, notes, one sandboxed authored demo, an external demo that permits embedding, and an audience window. Use tab capture cropped to the demo viewport. Record the browsers, operating system, results, and any limitations in the architecture document.

Acceptance criteria:

- Typing, clicking, scrolling, and asynchronous changes in the speaker demo appear in the audience view from one live instance.
- The audience receives no notes, controls, or uncropped frames, including during startup, resizing, failure, and capture termination.
- The capture picker, wrong-surface selection, permission denial, window closure, reconnection, and stopped capture have clear behavior.
- Image quality and interaction delay are usable on the intended two-screen setup in desktop Chrome and Edge.
- The external demo's interactions cause one set of network actions rather than duplicate actions in two instances.
- A single-file prototype validates direct local HTML playback, audience-window creation, and capture separately from localhost and HTTPS hosting.

Status: automated gate passed in Chrome and Edge on localhost, direct file playback, and the production build served over HTTPS. Human capture-picker operation and physical two-display quality remain manual release checks. See the validation log for the reviewed distinction between automated feasibility and hardware acceptance.

If a browser constraint prevents the agreed behavior, document the failed condition and a concrete alternative before building the full presenter. Do not replace this requirement with duplicated app instances.

## Milestone 1 Establish the application and document foundation

Status: complete and verified.

- Scaffold React, TypeScript, Vite, npm, and the documented development scripts with locked dependencies.
- Add the versioned schema, asset registry, document operations, and transaction-based history.
- Build a shared renderer for text, shapes, images, and a demo poster using logical slide coordinates.
- Add a thin native file round trip and a sample raster PDF early to expose format and rendering problems.
- Establish the player entry point separately from the editor shell.
- Add Help using the canonical documentation sources, and copy documentation into build output. Implemented as a dialog so reading Help preserves the active deck.
- Verify and update the local setup instructions once the commands actually exist.

Acceptance: a sample deck renders consistently, survives export and import with its assets, and produces a proportionally correct PDF. A fresh checkout starts with the documented commands, and Help opens from the initial application shell.

## Milestone 2 Build the visual editor

Status: complete and verified.

- Add slide creation, deletion, duplication, ordering, and thumbnails.
- Add rich text, image upload, shapes, backgrounds, and basic layouts.
- Add selection, multi-selection, drag, resize, rotate, keyboard movement, and alignment controls.
- Add guides, snapping, layer ordering, grouping, undo and redo, and zoom.
- Add theme controls, bundled fonts, speaker notes, and an explicit unsaved state.

Acceptance: an author can create and revise a small polished deck without editing source files. Text editing and object selection cooperate, undo matches user actions, and zoom does not change saved geometry.

## Milestone 3 Complete interactive authoring

Status: complete and verified.

- Add HTML, CSS, and JavaScript editing with live preview and useful runtime errors.
- Add website embeds, demo posters, explicit Preview and Interact modes, reset, and return-to-slides controls.
- Validate iframe permissions, focus behavior, and importing source without automatically executing it.
- Provide useful fallbacks for unavailable or blocked embeds.

Acceptance: a deck can contain authored and external demos, save their source or URL, and reopen with the intended posters and content. Focusing a demo does not remove access to presentation controls.

## Milestone 4 Complete presentation and portable exports

Status: complete and verified on the editor and exported HTML paths. The speaker uses a dedicated demo console rather than a scaled live iframe inside the slide preview; the audience retains the original slide composition. The architecture and validation log explain that reviewed change.

- Integrate the proven capture flow into the speaker layout and audience renderer.
- Add fullscreen audience mode, navigation, current and next slide information, notes, and timer.
- Complete native archive validation and clear import errors.
- Complete sequential high-resolution PDF export using posters for demos.
- Export the player and assets as one HTML file with single-window playback and the validated speaker-mode capabilities.
- Keep the user guide accurate for the completed controls and export behavior.

Acceptance: a deck created in the editor can be presented across two screens, reopened from its native file, read as a PDF, and played from its exported HTML on another machine. External dependency requirements remain clear.

## Milestone 5 Verify workflows and documentation

Status: automated checks complete and verified in Chrome and Edge, including a clean Node 24 install, static HTTPS subdirectory deployment, exports, generated documentation, and real demo capture. All three exported PDF pages were rendered and visually inspected. The remaining human permission and physical display checks are recorded in the validation log.

Use focused automated checks for document invariants, history, schema validation, archive round trips, and browser workflows. Capture permission dialogs, operating system permissions, two physical displays, and visual quality also need manual verification.

Required workflows include a fresh local setup, production build and static hosting, create and revise a deck, reopen a deck, authored and external demos, speaker navigation, capture failure recovery, PDF appearance, and standalone HTML playback.

Documentation acceptance criteria:

- Help is reachable from both the editor and player without discarding the active deck.
- Help covers creating, editing, presenting, demos, saving, exports, troubleshooting, local setup, and contribution.
- `dist/docs/` includes the architecture, implementation plan, user guide, local development guide, contribution guide, and an index with working links.
- The main app, standalone player guide, and repository read from canonical sources rather than manually maintained duplicate prose.
- Generated documentation links resolve to their built destinations, including links between Help sections and the contribution guide.
- Setup commands and script descriptions match the package manifest and were verified on a clean dependency install.
- Planned features are removed from usage instructions or clearly marked if they have not shipped.

## Scope after the first release

Investigate PowerPoint support, broader browser and tablet support, multiple simultaneous demos, demo audio routing, richer animation, and optional cooperative demo integrations only after the agreed workflows are reliable.
