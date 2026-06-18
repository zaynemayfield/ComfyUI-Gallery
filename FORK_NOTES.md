# Fork Notes

This fork tracks user-facing and security-focused changes made on top of the upstream ComfyUI Gallery project. Keep this file updated when behavior changes in this fork.

## 2026-06-18

### Gallery modal header and folder navigation

- Added a compact title/logo area to the gallery modal header.
- Moved Settings to the far right of the header.
- Moved sorting controls next to a narrower search input.
- Replaced separate Newest/Oldest and Name up/down controls with compact toggle buttons.
- Added an All/Images/Videos media filter.
- Replaced the default modal close icon with a red Close button in the header row.
- Replaced the left header toggle with a compact icon that shows or hides the horizontal folder navigation.
- Restyled horizontal folder navigation into one icon-led row using separators instead of section labels.
- Updated folder selection so parent folders show media from their descendant folders.
- Added a folder actions row for the current folder with create, rename, move, and delete controls guarded by backend path checks.
- Added clear separators between folder action groups so create, rename, move, and delete controls are easier to scan.
- Replaced the folder move text input with a tree picker that previews the selected destination before moving.
- Updated the move picker so selecting a destination automatically expands the tree branch that shows the preview placement.
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
