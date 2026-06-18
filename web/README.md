# ComfyUI Gallery Frontend

This folder contains the React frontend for ComfyUI Gallery.

Most users should read the root [README.md](../README.md). The built bundle is committed at `web/dist/assets/comfy-ui-gallery.js`, so normal ComfyUI users do not need to run a frontend build.

## Development

Install dependencies:

```bash
npm install --no-package-lock
```

Run a production build:

```bash
npm run build
```

The build output must be committed when frontend behavior changes.

Do not commit `node_modules`, Vite cache files, or generated source maps.

