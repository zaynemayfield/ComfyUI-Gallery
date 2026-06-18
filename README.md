# ComfyUI Gallery

A fast, practical media gallery for ComfyUI outputs. Browse images, videos, audio, and 3D files directly inside ComfyUI, inspect metadata, organize folders, and manage bulk cleanup without leaving the workflow UI.

This repository is a public-ready fork of [PanicTitan/ComfyUI-Gallery](https://github.com/PanicTitan/ComfyUI-Gallery). The original project is MIT licensed; the original copyright notice remains in [LICENSE](LICENSE). Fork-specific changes are tracked in [FORK_NOTES.md](FORK_NOTES.md).

![ComfyUI Gallery preview](showcase.gif)

## Why Use It

- Opens from the ComfyUI toolbar instead of a floating overlay button.
- Handles image and video-heavy output folders without forcing everything to load at once.
- Groups related LTX-style outputs such as `file.mp4`, `file-audio.mp4`, and `file.png`.
- Searches filenames and metadata, including positive prompt, negative prompt, model, and seed.
- Shows image metadata and raw metadata in the main preview overlay.
- Lets you create, rename, move, and delete folders from the gallery.
- Supports multi-select bulk move/delete with compact-group confirmation.
- Uses cached video thumbnails and a server-side media index for faster browsing.
- Keeps gallery access scoped to ComfyUI's output directory for safer public distribution.

## Feature Highlights

| Area | What It Does |
| --- | --- |
| Browsing | Responsive grid, preview sizes, lazy batches, date sections, next/previous day jumps |
| Filtering | All/Images/Videos, date range, include/exclude subfolders, metadata search scopes |
| Compact mode | Groups related media outputs and lets users cycle through grouped files |
| Preview | Fit-to-screen media, video controls, persistent mute/volume, loop, metadata panel, raw metadata |
| File actions | Delete, move, rename, folder create/rename/move/delete, bulk delete/move |
| Performance | Virtualized grid, 20/40/60 loading batches, cached video thumbnails, persistent metadata index |
| Safety | Output-directory path boundary checks, no symlink following for static gallery route |

See [docs/FEATURES.md](docs/FEATURES.md) for a fuller walkthrough.

## Requirements

- ComfyUI.
- Python dependencies from [requirements.txt](requirements.txt).
- `ffmpeg` and `ffprobe` are recommended for video thumbnails and duration metadata. Videos still open if these tools are unavailable, but thumbnail generation and duration extraction may be limited.

## Installation

From your `ComfyUI/custom_nodes` directory:

```bash
git clone https://github.com/zaynemayfield/ComfyUI-Gallery.git
cd ComfyUI-Gallery
pip install -r requirements.txt
```

Restart ComfyUI after installation or updates.

## Quick Start

1. Click the ComfyUI Gallery toolbar button.
2. Pick a root folder or subfolder from the folder row.
3. Search by filename or metadata using the dropdown next to Search.
4. Use All/Images/Videos, date range, Subfolders, Compact, and preview size controls to shape the view.
5. Click a card to preview media, inspect metadata, rename, move, or delete.
6. Use checkboxes for multi-select bulk move/delete.

## Important Safety Notes

The gallery can delete, rename, and move files inside the configured ComfyUI output path. Treat those actions as destructive.

This fork rejects absolute paths and paths that escape the ComfyUI output directory. The static gallery route does not follow symlinks. These restrictions are intentional for safer public distribution.

Do not expose a ComfyUI instance with file-management extensions to untrusted networks without access controls.

See [SECURITY.md](SECURITY.md) for reporting and deployment guidance.

## Settings

The Settings modal is intentionally limited to advanced options:

- Relative output subpath.
- Dark mode.
- Ctrl+G gallery shortcut.
- Expand all folders.
- Backend log suppression.
- Native vs. polling file observer.
- Scan file extensions.

Day-to-day browsing controls live in the header: search, sorting, media filters, date sections, subfolders, preview size, batch size, compact mode, and autoplay.

## Demo Video

A concise feature video helps adoption. Use [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) as a recording checklist.

Recommended video flow:

1. Open from ComfyUI toolbar.
2. Show fast image/video browsing.
3. Toggle Compact mode on related video/image outputs.
4. Search metadata and show positive prompt.
5. Open preview, show video controls and raw metadata.
6. Show folder actions and multi-select bulk move/delete.
7. Close by mentioning safety scoping to ComfyUI output.

## Development

The served frontend bundle is committed at `web/dist/assets/comfy-ui-gallery.js` so users do not need to build from source.

Rebuild frontend assets:

```bash
cd web
npm install --no-package-lock
npm run build
```

Validate Python files:

```bash
python -m py_compile server.py folder_monitor.py folder_scanner.py gallery_config.py gallery_node.py metadata_extractor.py __init__.py
```

Do not commit generated folders such as `web/node_modules`, `__pycache__`, `.thumbnail_cache`, or `.gallery_index_cache`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution and release guidance.

## Public Release Checklist

- Record and upload a short feature video or GIF.
- Confirm README screenshots/media are current.
- Confirm `pyproject.toml` points to this repository.
- Add `REGISTRY_ACCESS_TOKEN` before using the Comfy Registry publish workflow.
- Run the build and Python compile checks.
- Test install from a fresh `custom_nodes` clone.

See [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for the full checklist.

For launch prep, see [docs/PUBLICATION_PLAN.md](docs/PUBLICATION_PLAN.md).

## Credits

- Original project: [PanicTitan/ComfyUI-Gallery](https://github.com/PanicTitan/ComfyUI-Gallery)
- ComfyUI: [comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- ComfyUI Manager: [ltdrdata/ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager)
- ComfyUI-Crystools metadata extraction inspiration: [crystian/ComfyUI-Crystools](https://github.com/crystian/ComfyUI-Crystools)
- Ant Design: [ant-design/ant-design](https://github.com/ant-design/ant-design)
- React: [facebook/react](https://github.com/facebook/react)
- React Window: [bvaughn/react-window](https://github.com/bvaughn/react-window)
- React Virtualized: [bvaughn/react-virtualized](https://github.com/bvaughn/react-virtualized)
- Three.js: [mrdoob/three.js](https://github.com/mrdoob/three.js)
- React Three Fiber: [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)
- aiohttp: [aio-libs/aiohttp](https://github.com/aio-libs/aiohttp)
- Pillow: [python-pillow/Pillow](https://github.com/python-pillow/Pillow)
- ahooks: [alibaba/hooks](https://github.com/alibaba/hooks)
- JSZip: [Stuk/jszip](https://github.com/Stuk/jszip)
- FileSaver.js: [eligrey/FileSaver.js](https://github.com/eligrey/FileSaver.js)
- react-json-view: [microlinkhq/react-json-view](https://github.com/microlinkhq/react-json-view)

## License

MIT. See [LICENSE](LICENSE).
