# Changelog

All notable changes in this fork are summarized here. Detailed implementation notes are in [FORK_NOTES.md](FORK_NOTES.md).

## 2.9.0 - 2026-06-18

### Added

- Toolbar-style ComfyUI Gallery entry point.
- Compact header with search scopes, sort controls, filters, date controls, subfolder toggle, preview size, batch size, compact mode, and autoplay.
- Folder row and folder actions for create, rename, move, and delete.
- Multi-select bulk move/delete.
- Compact output grouping for related image/video/audio-variant outputs.
- Bulk action prompt for compacted related files.
- Preview overlay actions for delete, move, rename, metadata, and raw metadata.
- Preview and multi-select download actions, including zip downloads for multiple selected files.
- Persistent video volume, mute, and loop controls.
- Lazy cached video thumbnails.
- Persistent server-side media index for faster refreshes and repeat browsing from other clients.
- Compressed gallery JSON responses and avoided duplicate startup image fetches.
- Lazy-loaded full raw metadata from the preview panel instead of sending every workflow in the gallery list.
- Stored lightweight metadata in the persistent index to reduce repeat-load disk reads.
- Video duration metadata when `ffprobe` is available.
- Include Subfolders toggle.
- Output/Imports root switch for generated output and imported input media.
- Date section navigation.
- Public documentation, security notes, contributing guide, and release checklist.

### Changed

- Autoplay defaults to off.
- Gallery button remains clickable during initial media scanning.
- Settings modal only contains advanced options.
- Image cards fit full images instead of cropping.
- Modal layout is constrained to the viewport to avoid a page-level scrollbar.
- Full raw metadata loads on demand from the preview panel instead of being sent with every gallery list item.
- Repeat gallery refreshes use a lightweight persistent index and compressed responses.

### Security

- Gallery paths are constrained to ComfyUI's `output` and `input` media directories.
- Absolute paths and path traversal outside the allowed media directories are rejected.
- Static gallery serving does not follow symlinks.
- File and folder operations reuse backend boundary checks.

## Upstream History

This fork is based on [PanicTitan/ComfyUI-Gallery](https://github.com/PanicTitan/ComfyUI-Gallery). See upstream release history for changes before this fork.
