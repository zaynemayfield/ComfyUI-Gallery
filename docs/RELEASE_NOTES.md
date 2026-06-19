# Release Notes: 2.9.0

ComfyUI Gallery 2.9.0 is a public-ready fork focused on fast media browsing, metadata-aware search, compact related outputs, and safer file management inside ComfyUI.

## Highlights

- Opens from the ComfyUI toolbar with a compact icon and tooltip.
- Switches between generated Output media and imported Input media.
- Browses large output folders with responsive preview sizes and 20/40/60 lazy loading.
- Groups related outputs such as `example.mp4`, `example-audio.mp4`, and `example.png` into compact cards.
- Searches filenames and metadata, including positive prompt, negative prompt, model, and seed.
- Shows fit-to-screen previews with video mute, volume, loop, fullscreen, parsed metadata, raw metadata, and downloads.
- Supports folder create, rename, move, delete, plus multi-select bulk download/move/delete.
- Speeds up refreshes with a persistent server-side media index, compressed gallery responses, lazy raw metadata loading, and cached video thumbnails.
- Keeps gallery access scoped to the ComfyUI `output` and `input` media directories with backend path validation.

## Install

Clone into `ComfyUI/custom_nodes`:

```bash
git clone https://github.com/zaynemayfield/ComfyUI-Gallery.git
cd ComfyUI-Gallery
pip install -r requirements.txt
```

Restart ComfyUI after installation.

`ffmpeg` and `ffprobe` are recommended for video thumbnails and duration metadata.

## Demo Video Checklist

Show these workflows in the public demo:

- Toolbar launch.
- Large-folder browsing and preview size controls.
- Compact mode cycling through related outputs.
- Metadata search and positive prompt display.
- Preview overlay with metadata/raw metadata and video controls.
- Folder actions and multi-select bulk actions.
- Safety note: file actions are scoped to ComfyUI media directories.

## Safety Notes

This extension can delete, move, and rename files inside allowed ComfyUI media directories. Do not expose ComfyUI with file-management extensions to untrusted networks without access controls.

Absolute paths and paths outside the allowed ComfyUI media directories are rejected. The static gallery route does not follow symlinks.
