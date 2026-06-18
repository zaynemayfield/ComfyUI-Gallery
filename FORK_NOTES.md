# Fork Notes

This fork tracks user-facing and security-focused changes made on top of the upstream ComfyUI Gallery project. Keep this file updated when behavior changes in this fork.

## 2026-06-18

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
