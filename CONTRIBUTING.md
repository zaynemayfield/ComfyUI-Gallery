# Contributing

Thanks for helping improve ComfyUI Gallery.

## Development Setup

Clone into a ComfyUI `custom_nodes` directory or develop in a separate working copy and copy/deploy into ComfyUI for testing.

Install Python requirements:

```bash
pip install -r requirements.txt
```

Build the frontend:

```bash
cd web
npm install --no-package-lock
npm run build
```

The built bundle is committed at `web/dist/assets/comfy-ui-gallery.js` so users can install without building from source.

## Validation

Before opening a pull request, run:

```bash
python -m py_compile server.py folder_monitor.py folder_scanner.py gallery_config.py gallery_node.py metadata_extractor.py __init__.py
```

For frontend changes:

```bash
cd web
npm run build
```

## Pull Request Guidelines

- Keep changes scoped.
- Update [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), or [FORK_NOTES.md](FORK_NOTES.md) when behavior changes.
- Do not commit local server notes, generated caches, `web/node_modules`, or `__pycache__`.
- Include screenshots or a short recording for UI changes when possible.
- Call out any file-management or path-handling changes clearly.

## Security-Sensitive Areas

Be careful with changes to:

- Path resolution and validation.
- Static file serving.
- Delete, rename, and move operations.
- Folder operations.
- Metadata parsing of untrusted files.
- Thumbnail generation commands.

The gallery should remain scoped to ComfyUI's output directory.
