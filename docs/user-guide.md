# User guide

Create a presentation, add live demos, and present with notes on your screen and slides on an audience display. Local Slides works without an account. Use desktop Chrome or Edge for the full presentation and demo-sharing workflow.

The app opens an example deck so you can explore immediately. Your work stays in this browser session. Choose **Export → Editable deck** to save it before refreshing or closing.

## Create and arrange slides

Open the purple **File menu** at the top left and choose **New presentation**. Click the presentation title to rename it.

Use **New slide** below the slide list to add a title slide. Its arrow offers blank, title, and split layouts. Select a slide in the list, drag it to change its order, or use its three-dot menu to duplicate or delete it. At least one slide stays in a presentation.

With nothing selected on the canvas, the **Design** panel controls the slide name, background, theme, and starter layouts. Choosing a starter layout in that panel adds a slide. Themes update the deck's standard colors while preserving custom colors.

## Edit slide content

- **Text:** inserts a text box. Double-click existing text to edit it. The toolbar changes font, size, bold, italic, underline, alignment, and color.
- **Image:** imports a local PNG, JPEG, WebP, or GIF. Use the inspector to fit or fill its frame and set a description. The image limit is 20 MB per file.
- **Shape:** adds a rectangle, ellipse, or line. Change fill, stroke, corners, and dimensions in Design.
- **Live demo:** adds a demo or opens the existing demo on the current slide.

Select an object to drag it. Use its handles to resize and its rotation handle to rotate ordinary objects. Guides and snapping help with alignment. The inspector also accepts exact positions and dimensions.

Shift-click objects or layers to select more than one. Drag a selection rectangle over the canvas to select several objects. **Arrange** and the inspector provide alignment and grouping. **Layers** lets you select overlapping objects, move them forward or backward, and lock or unlock them. Alt-click selects an individual object inside a group.

Undo and redo work on editing actions. A continuous drag is one undo step. The canvas zoom control changes your view while preserving document coordinates.

Each slide supports one live demo. To reuse a demo, duplicate its slide. Live demo frames stay axis-aligned in this version.

## Add speaker notes

Type notes below the editing canvas. They appear in speaker view, outside the captured demo area. Notes are stored in your editable deck and HTML export; they are not shown on the audience slide or included in the PDF.

## Author an interactive demo

1. Choose **Live demo** and give it a name.
2. Select **Write code** and edit the HTML, CSS, and JavaScript tabs.
3. Choose **Preview** to run it. Nothing executes merely because you open the editable deck or demo editor.
4. Choose **Click to interact** to operate the app inside the preview.
5. Use the controls above the preview to reset, stop, or return to preview mode.
6. Review runtime errors below the preview if something fails.
7. Choose **Apply to slide** to save the edited source, or **Cancel** to discard the draft changes.

After preview starts, source edits update it after a short delay and restart that preview. Use browser-ready JavaScript. The editor does not install npm packages, compile TypeScript, or run a backend. Authored demos run in a sandbox; direct access to the editor, storage, and pop-ups is restricted. External APIs must support browser access from the demo's origin.

Select a demo on the canvas and choose **Upload poster** in Design to set its static image. Posters appear in thumbnails and PDF exports, and in the audience view whenever live sharing is inactive.

## Embed a website

In the demo editor, choose **Website**, enter the complete HTTP or HTTPS address, and preview it. The website must run at a different origin from the editor; a separate localhost port works for local PoC apps.

Some websites block embedding or require capabilities unavailable in an iframe. **Open website in a new tab** remains available in the studio, and the presentation controls include an external-link button. A separate tab is outside the captured demo area, so presenting that tab requires switching your audience or meeting sharing separately.

Localhost refers to the machine playing the deck. Recipients need their own local demo running at that address, or a reachable hosted URL. External sites and scripts can require an internet connection.

## Present with notes and a mirrored demo

1. Select the slide to start from and choose **Present**.
2. Choose **Open audience**. Move that window to the audience display and use its fullscreen button.
3. Keep the speaker view on your laptop. It shows notes, elapsed time, and the next slide.
4. Navigate with the footer buttons, arrow keys, Page Up/Down, Home, or End. Keyboard navigation stays available outside a focused demo.
5. On a demo slide, speaker view shows a larger demo console beside your notes. This is the one running app instance.
6. Choose **Share demo** and select the current speaker tab in the browser's picker.
7. Wait for **Live to audience**, then interact with the console. The audience sees its cropped output inside the original slide, with the surrounding slide content intact.
8. Use **Pause**, **Run demo**, and **Reset demo** outside the console when needed. Leaving and re-entering a demo slide resets its runtime state.
9. Use **Stop sharing** to restore the audience poster. **Back to editor** returns to editing.

The browser asks for permission when a capture session starts. Keep the intended speaker tab selected. Sharing can continue across slides and pauses without another picker while that session stays active. Help temporarily pauses audience video; closing Help resumes the validated crop. Switching between Speaker view and Slide view stops the capture session.

If sharing stops or fails, the audience sees the poster. Open or focus the audience window and start sharing again. Capture permissions may also require operating system permission or an application restart on your machine.

While sharing an authored or embedded demo from the editor's speaker view, **Capture demo poster** saves a still from the audience video into the deck. HTML players are read-only, so that editing control is available in the main app.

## Save and reopen

Choose **Export → Editable deck** to download a `.slides` file. It includes slide content, notes, themes, packaged images, demo source, and website references.

Choose **Open** and select that file to continue editing or present it. Opening a new deck asks before replacing unsaved work. An invalid file leaves the current deck intact. Imports support up to 50 MB compressed and 128 MB expanded.

There is no automatic deck library, cloud copy, or synchronization between exported copies. Save a new file when you want to retain changes.

## Export a PDF or HTML player

| Export | Use | Behavior |
| --- | --- | --- |
| Editable deck | Continue editing in Local Slides | Preserves editable slides, notes, assets, and demo source |
| PDF document | Share a fixed visual copy | High-resolution slide images with posters for demos |
| Interactive player | Present without running the editor | A single HTML file with the player, packaged assets, fonts, and guides |

PDF text is rendered into images and is not selectable. PDF demos are static. Use HTML for interactivity.

Open an HTML export directly in Chrome or Edge. Use its navigation controls and **Speaker view** for notes and an audience window. Packaged resources do not need a server; external websites, scripts, and services still need their normal connection. The file contains speaker notes and source code, so share it with that in mind.

## Keyboard shortcuts

| Action | Shortcut outside a text field or demo |
| --- | --- |
| Export an editable deck | Command/Ctrl + S |
| Undo | Command/Ctrl + Z |
| Redo | Command/Ctrl + Shift + Z |
| Duplicate selected ordinary objects | Command/Ctrl + D |
| Select slide objects | Command/Ctrl + A |
| Move selected objects | Arrow keys; hold Shift for larger steps |
| Delete selected unlocked objects | Delete or Backspace |
| Clear selection | Escape |
| Next or previous presentation slide | Arrow keys or Page Down/Up |
| First or last presentation slide | Home or End |

## Troubleshooting

| Problem | Check |
| --- | --- |
| A website will not load | Its URL, internet access, embedding policy, and local network permission |
| A local demo is unavailable | Start its server on the machine playing the deck and verify its address and port |
| The audience sees a poster | Open the audience window, make sure the demo is running, and check sharing status |
| Capture reports the wrong surface | Choose the current speaker tab rather than a desktop or window |
| Keyboard arrows operate the demo | Use the navigation controls outside it, or focus the speaker controls first |
| The PDF has a static demo | Expected; use the HTML player for an interactive copy |
| A refreshed session lost work | Reopen the last exported editable deck |
| An exported website behaves differently | Check its embedding rules and external dependencies for the file's origin |

## Run locally and contribute

See [Local development](local-development.md) for setup, executable commands, and deployment. See [Contributing](../CONTRIBUTING.md) for development workflow and validation, and [Architecture](architecture.md) for the implementation decisions. All are also available as Help topics.
