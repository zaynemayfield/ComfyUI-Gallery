# Publication Plan

This is the practical launch list for making the fork appealing and easy to adopt.

## Must Have Before Public Announcement

- Record a short feature video using [DEMO_SCRIPT.md](DEMO_SCRIPT.md).
- Replace or supplement `showcase.gif` if the current GIF does not show the new UI.
- Confirm README links and install commands are correct.
- Confirm a fresh clone works in `ComfyUI/custom_nodes`.
- Confirm `ffmpeg`/`ffprobe` guidance is clear for video thumbnails.
- Confirm no local files or private paths are tracked.

## Recommended GitHub Setup

- Add repository description:
  - `Fast ComfyUI output gallery with metadata search, video thumbnails, folder actions, and bulk media management.`
- Add topics:
  - `comfyui`
  - `comfyui-custom-node`
  - `gallery`
  - `metadata`
  - `image-browser`
  - `video-thumbnail`
- Add the demo video to the README or release notes.
- Enable GitHub private vulnerability reporting if available.
- Add `REGISTRY_ACCESS_TOKEN` if publishing to Comfy Registry.

## Release Steps

1. Run build and Python validation.
2. Test a fresh install.
3. Update `CHANGELOG.md`.
4. Tag the release, for example:

```bash
git tag v2.8.0
git push origin v2.8.0
```

5. Create a GitHub Release with:
   - Short feature summary.
   - Demo video.
   - Safety notes.
   - Install command.
   - Known limitations.

## Nice To Have

- A clean screenshot of the header and grid.
- A screenshot of compact mode.
- A screenshot of the metadata panel.
- A short "before/after" note explaining the toolbar entry point and compact media workflow.
- A small section comparing this fork to upstream without criticizing upstream.
