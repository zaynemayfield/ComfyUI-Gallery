# Security Policy

## Supported Versions

Security fixes are handled on the `main` branch of this fork.

## Reporting A Vulnerability

Please report security issues privately first. Do not open a public issue for vulnerabilities involving path traversal, unauthorized file access, destructive file actions, or command execution.

If GitHub private vulnerability reporting is enabled for this repository, use that. Otherwise, contact the repository owner directly through GitHub.

Include:

- ComfyUI version.
- Operating system.
- Browser.
- Installed ComfyUI Gallery commit or release.
- Steps to reproduce.
- Whether the ComfyUI instance was exposed beyond localhost/LAN.

## Security Model

This fork is designed to browse and manage files under ComfyUI's `output` and `input` media directories.

Intentional restrictions:

- Absolute gallery paths are rejected.
- Paths that escape the allowed ComfyUI media directories are rejected.
- The static gallery route does not follow symlinks.
- File and folder operations validate paths server-side.

## Deployment Guidance

ComfyUI Gallery includes file-management actions such as delete, rename, move, and folder operations. Do not expose ComfyUI to untrusted networks without authentication, firewalling, reverse-proxy access controls, or another appropriate security layer.

Treat all media metadata as untrusted input.

`ffmpeg` and `ffprobe` are used only through fixed command arguments for video thumbnail and duration extraction. Input paths are resolved through gallery path validation before use.
