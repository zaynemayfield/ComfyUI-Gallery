# Release Checklist

Use this checklist before making the repository public, publishing to Comfy Registry, or announcing a release.

## Repository

- [ ] README describes the current UI and install path.
- [ ] Demo video or GIF is current.
- [ ] `FORK_NOTES.md` has all fork-specific behavior changes.
- [ ] `CHANGELOG.md` has the release summary.
- [ ] `LICENSE` is present and keeps the upstream MIT copyright notice.
- [ ] `SECURITY.md` explains file-management risks.
- [ ] `CONTRIBUTING.md` explains local build and validation.
- [ ] No local infrastructure notes are tracked.

## Metadata

- [ ] `pyproject.toml` repository URL points to this fork.
- [ ] `pyproject.toml` version is updated for the release.
- [ ] `pyproject.toml` publisher ID is correct for Comfy Registry.
- [ ] `web/package.json` version is either intentionally separate or aligned.
- [ ] Registry token is configured as `REGISTRY_ACCESS_TOKEN` before running publish workflow.

## Build

- [ ] Frontend build passes:

```bash
cd web
npm install --no-package-lock
npm run build
```

- [ ] Python compile passes:

```bash
python -m py_compile server.py folder_monitor.py folder_scanner.py gallery_config.py gallery_node.py metadata_extractor.py __init__.py
```

- [ ] Generated folders are not committed:
  - `web/node_modules`
  - `__pycache__`
  - `.thumbnail_cache`
  - `.gallery_index_cache`

## Manual Test

- [ ] Fresh page load shows toolbar button.
- [ ] Button can open while media scan is still loading.
- [ ] Gallery modal has no outer page scrollbar.
- [ ] Image card opens preview and scales to screen.
- [ ] Video card opens preview and click-to-pause works.
- [ ] Metadata panel shows parsed and raw metadata.
- [ ] Positive prompt extraction works for a known ComfyUI image.
- [ ] Compact mode groups related files.
- [ ] Compact multi-select prompts to include related files.
- [ ] Include Subfolders Off only shows direct folder media.
- [ ] Folder create, rename, move, delete work.
- [ ] Bulk move and bulk delete work.
- [ ] Path traversal and absolute path attempts are rejected.

## Announcement

- [ ] Include the demo video.
- [ ] Mention this is a fork of PanicTitan/ComfyUI-Gallery.
- [ ] Highlight the safety boundary: ComfyUI output directory only.
- [ ] Mention `ffmpeg` and `ffprobe` are recommended for video thumbnails.
- [ ] Ask users to file issues with ComfyUI version, browser, OS, and logs.
