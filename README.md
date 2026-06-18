# ComfyUI Gallery

A ComfyUI custom node extension for browsing, searching, previewing, and managing media from the ComfyUI output folder.

This repository is a public-ready fork of [PanicTitan/ComfyUI-Gallery](https://github.com/PanicTitan/ComfyUI-Gallery). The original project is MIT licensed; the original copyright notice remains in [LICENSE](LICENSE). Fork-specific changes are tracked in [FORK_NOTES.md](FORK_NOTES.md).

![ComfyUI Gallery preview](showcase.gif)

## What This Fork Adds

- Toolbar-style ComfyUI entry button with tooltip.
- Hardened path handling so gallery access stays inside the ComfyUI output directory.
- Compact gallery header with search, metadata search scopes, sorting, filters, preview sizing, batch size, autoplay, compact mode, and date section controls.
- Horizontal folder navigation and folder actions for create, rename, move, and delete.
- Multi-select with bulk delete and bulk move.
- Compact output grouping for related video, audio-video, and image outputs with matching filenames.
- Preview overlay with metadata, raw metadata, delete, move, rename, video controls, persisted mute/volume, and loop.
- Lazy cached video thumbnail generation for faster default browsing.
- Date navigation and optional date section dividers.

## Security Notes

This fork intentionally restricts gallery paths to the ComfyUI output directory. Absolute paths and paths that escape the output directory are rejected. The static gallery route does not follow symlinks.

File management actions such as delete, rename, move, and folder actions are available from the UI. Do not expose your ComfyUI instance to untrusted networks without appropriate access controls.

## Requirements

- ComfyUI.
- Python dependencies from [requirements.txt](requirements.txt).
- `ffmpeg` and `ffprobe` are recommended for video thumbnails and duration metadata. If they are unavailable, videos still open, but thumbnail generation and duration extraction may be limited.

## Installation

From your `ComfyUI/custom_nodes` directory:

```bash
git clone https://github.com/zaynemayfield/ComfyUI-Gallery.git
cd ComfyUI-Gallery
pip install -r requirements.txt
```

Restart ComfyUI after installation or updates.

## Usage

- Click the ComfyUI Gallery toolbar button to open the gallery.
- Use the folder row to browse root folders and subfolders.
- Use search scopes to search by filename, metadata, positive prompt, negative prompt, model, or seed.
- Use media filters for All, Images, or Videos.
- Use preview size and batch size controls to tune how many cards appear while scrolling.
- Turn Compact on to group related files with the same base name, including `-audio` variants.
- Turn Autoplay on only when you want visible video cards to play in the grid.
- Click a card to open the preview overlay with media actions and metadata.
- Use checkboxes to enter multi-select mode for bulk move or delete.
- Open Settings for advanced options such as relative path, dark mode, shortcut, folder expansion, logging, observer mode, and scanned extensions.

## Settings

The Settings modal is intentionally limited to options that do not belong in the compact header:

- Relative output subpath.
- Dark mode.
- Ctrl+G gallery shortcut.
- Expand all folders.
- Backend log suppression.
- Native vs. polling file observer.
- Scan file extensions.

Header controls handle day-to-day browsing preferences such as search, sorting, filters, date sections, preview size, batch size, compact mode, and autoplay.

## Development

The served frontend bundle is committed at `web/dist/assets/comfy-ui-gallery.js` so users do not need to build from source.

To rebuild after frontend changes:

```bash
cd web
npm install --no-package-lock
npm run build
```

To validate Python files:

```bash
python -m py_compile server.py folder_monitor.py folder_scanner.py gallery_config.py gallery_node.py metadata_extractor.py __init__.py
```

Do not commit generated folders such as `web/node_modules`, `__pycache__`, or `.thumbnail_cache`.

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
