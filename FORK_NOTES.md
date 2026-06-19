# Fork Notes

This fork tracks user-facing and security-focused changes made on top of the upstream ComfyUI Gallery project. Keep this file updated when behavior changes in this fork.

## 2026-06-18

### Gallery modal header and folder navigation

- Added a compact title/logo area to the gallery modal header.
- Moved Settings to the far right of the header.
- Moved sorting controls next to a narrower search input.
- Replaced separate Newest/Oldest and Name up/down controls with compact toggle buttons.
- Added an All/Images/Videos media filter.
- Added a Small/Medium/Large preview size control for responsive media thumbnails.
- Added a 20/40/60 media batch control that reveals more thumbnails as the user scrolls.
- Added a top-row video autoplay toggle and changed the default autoplay setting to off.
- Added a Compact display mode that groups related outputs with matching stems, preferring `-audio` variants as the visible card.
- Added a Compact tooltip, media-type badges, and in-card chevrons for cycling through grouped outputs.
- Added fixed-footprint preview-card metadata lines for file size and video duration.
- Formatted video card metadata as `size - duration` when both values are available.
- Replaced the default modal close icon with a red Close button in the header row.
- Replaced the left header toggle with a compact icon that shows or hides the horizontal folder navigation.
- Restyled horizontal folder navigation into one icon-led row using separators instead of section labels.
- Updated folder selection so parent folders show media from their descendant folders.
- Added a folder actions row for the current folder with create, rename, move, and delete controls guarded by backend path checks.
- Added clear separators between folder action groups so create, rename, move, and delete controls are easier to scan.
- Replaced the folder move text input with a tree picker that previews the selected destination before moving.
- Updated the move picker so selecting a destination automatically expands the tree branch that shows the preview placement.
- Updated the media grid sizing so cards fit the available width without needing a bottom horizontal scrollbar.
- Added subtle media-type borders to preview cards so image and video thumbnails are easier to distinguish.
- Added a non-blocking compact-count badge to grouped preview cards.
- Updated media preview overlays so videos scale within the viewport instead of overflowing the screen.
- Added persistent preview video volume, click-to-pause behavior, and a loop toggle in the preview overlay.
- Persisted preview video mute state so the next preview starts muted when the user muted the previous one.
- Replaced native preview video controls with a custom row for reliable click-to-pause, mute, volume, loop, and fullscreen controls.
- Added preview overlay actions for Delete, Move, and Rename, including confirmed batch handling for compacted cards.
- Added single and bulk media download actions. Multiple downloads are bundled into a zip, and compacted selections ask whether to include related hidden files.
- Stabilized the multi-select action row so entering or exiting selection mode does not shift the grid scroll position without reserving inactive header space, stacked Date Sections with Subfolders, and added concise header tooltips plus chevrons on folder toggles.
- Kept the virtual media grid mounted during header height changes so entering or exiting multi-select mode does not jump back to the top of the gallery.
- Changed preview selection tracking from filename to media URL so moved files, duplicate names, and compacted cards open the intended preview instead of falling back to the first item.
- Updated media Delete, Move, and Rename actions to patch gallery state immediately after successful backend operations instead of forcing a full metadata rescan.
- Added explicit multi-select mode with per-card checkboxes and header-level bulk Delete and Move actions.
- Added a Compact-mode bulk action prompt so multi-select Delete and Move can include related compacted files.
- Refined multi-select so image clicks do not open previews, empty selection exits the mode, and Select All is available in the bulk action row.
- Added a date range filter and hardened preview overlay action buttons so Move and Rename remain clickable above the preview layer.
- Fixed bulk Move folder selection so interacting with the destination picker does not clear the selected media.
- Reworked preview Rename into a controlled modal and tightened preview action button cursor behavior.
- Moved metadata and raw metadata viewing into the normal media preview overlay and removed the separate card info button.
- Improved positive prompt extraction for common ComfyUI prompt-node formats and widened the preview metadata panel.
- Added video file size and duration text to the full preview controls using the `size - duration` format.
- Added file size metadata for non-image media and compacted header controls for autoplay, date range, preview size, and batch size.
- Added scoped search across filename, metadata, positive prompt, negative prompt, model, and seed, and reorganized header sort/media/autoplay controls.
- Added compact Off/On toggles for Compact and date dividers, matching the Autoplay control layout.
- Added a Subfolders Off/On header toggle so selected folders can show only direct media or include descendant folder media.
- Added an Output/Imports root switch and allowed the gallery to safely browse ComfyUI's `input` media directory as well as `output`.
- Synchronized gallery root switching so `/static_gallery` is updated before fetching media from the selected root.
- Suppressed date section rows during active search and reset the virtual grid when date section layout changes.
- Moved preview position count to the upper right, separated Date Sections into its own control group, and changed image cards to contain full thumbnails.
- Restyled sort controls to match the neutral header controls instead of using the primary blue button state.
- Removed duplicated/obsolete Settings controls and added lazy cached video thumbnail generation for faster default browsing.
- Added a persistent server-side gallery index so refreshes and other clients can reuse metadata for unchanged files instead of rescanning every image and video.
- Compressed gallery JSON responses and removed duplicate startup fetches so refreshes do less network and scan work.
- Removed full raw workflow metadata from the main gallery list payload and load full metadata only when the preview metadata panel opens.
- Shrank the persistent gallery index so it stores lightweight list metadata instead of every raw workflow blob.
- Removed obsolete metadata overlay code, stale comments, unused frontend state/props, and normal-operation debug logging.
- Hardened media move handling to use shared gallery-root path resolution, reject invalid paths consistently, require existing destination folders, and avoid overwriting existing files.
- Constrained the gallery modal to the viewport so the page does not show a second far-right vertical scrollbar.
- Reworked the README for public fork distribution, including current usage, security notes, installation, development notes, and upstream credits.
- Updated project metadata to point at this fork while preserving an upstream project link.
- Added public-facing feature docs, demo script, release checklist, changelog, contribution guide, security policy, issue templates, and pull request template.
- Prepared the fork for a `2.9.0` public release with aligned package metadata, copy-ready release notes, refreshed README positioning, a validation workflow, and updated release checklist guidance.
- Limited thumbnail video autoplay to visible cards and pause videos without resetting playback position when autoplay is off or cards leave view.
- Reduced date divider rows to a compact left-aligned label with a thin line and minimal vertical space.
- Added Previous Day and Next Day controls to date dividers for jumping between creation-date sections.
- Fixed day navigation so it expands the visible media batch before jumping to unloaded date sections.
- Added a loading indicator and delayed scroll handoff for date jumps that need additional media rows to render first.
- Changed date jumps to use explicit row offsets and avoid remounting the grid when additional batches load.
- Removed an obsolete grid child positioning override that caused preview cards to overlap in the virtualized media grid.
- Synchronized AutoSizer measurements with media grid/card sizing before rendering to prevent first-load overlap at Medium and Large preview sizes.
- Fixed folder scanning so empty folders are returned and visible after creation.

### ComfyUI toolbar entry point

- Changed the default gallery entry point from a draggable floating "Open Gallery" button to a compact icon button intended to sit with other ComfyUI toolbar buttons.
- Added a hover tooltip and accessible label: "Launch ComfyUI Gallery".
- Kept the gallery toolbar button clickable during initial media scanning so users can open the modal and see loading progress immediately.
- Kept the existing floating button mode available through settings for users who prefer the previous behavior.
- Updated the default server settings in `user_settings.json` so new installs use the toolbar-style button by default.
- Rebuilt `web/dist/assets/comfy-ui-gallery.js` so ComfyUI serves the updated frontend without requiring users to build from source.

### Gallery path hardening

- Restricted gallery scanning and monitoring paths to stay inside allowed ComfyUI media directories.
- Rejected absolute gallery paths from `/Gallery/images` and `/Gallery/monitor/start`.
- Disabled symlink following for the `/static_gallery` static route.
- Disabled symlink following in the file monitor.
- Centralized path boundary checks and reused them for delete and move operations.

### Compatibility notes

- Users can still scan subfolders under allowed ComfyUI media roots with relative paths such as `video`, `./video`, or `input`.
- Paths outside allowed ComfyUI media roots are rejected. This is intentional for public distribution because the gallery serves files through ComfyUI's web server.
- Existing users with saved local browser settings may need to switch off "Floating Button" in the gallery settings if their browser local storage still has the previous value.
