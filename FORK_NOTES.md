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
- Added explicit multi-select mode with per-card checkboxes and header-level bulk Delete and Move actions.
- Refined multi-select so image clicks do not open previews, empty selection exits the mode, and Select All is available in the bulk action row.
- Added a date range filter and hardened preview overlay action buttons so Move and Rename remain clickable above the preview layer.
- Fixed bulk Move folder selection so interacting with the destination picker does not clear the selected media.
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
- Kept the existing floating button mode available through settings for users who prefer the previous behavior.
- Updated the default server settings in `user_settings.json` so new installs use the toolbar-style button by default.
- Rebuilt `web/dist/assets/comfy-ui-gallery.js` so ComfyUI serves the updated frontend without requiring users to build from source.

### Gallery path hardening

- Restricted gallery scanning and monitoring paths to stay inside ComfyUI's output directory.
- Rejected absolute gallery paths from `/Gallery/images` and `/Gallery/monitor/start`.
- Disabled symlink following for the `/static_gallery` static route.
- Disabled symlink following in the file monitor.
- Centralized path boundary checks and reused them for delete and move operations.

### Compatibility notes

- Users can still scan subfolders under the ComfyUI output directory with relative paths such as `video` or `./video`.
- Paths outside the ComfyUI output directory are now rejected. This is intentional for public distribution because the gallery serves files through ComfyUI's web server.
- Existing users with saved local browser settings may need to switch off "Floating Button" in the gallery settings if their browser local storage still has the previous value.
