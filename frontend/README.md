# Portfolio frontend

This folder owns the static GitHub Pages site, browser chatbot widget, Playwright suite, and the build script that creates the publishable artifact.

## Local use

From the repository root, `./scripts/setup-local.sh` installs frontend and backend dependencies. Run `./scripts/dev.sh` to serve this site on port 8000 and the FastAPI backend on port 8001.

Run the browser suite from this folder:

```bash
npm run test:e2e
```

The site builder copies only `index.html`, `pages/`, `assets/`, and `images/` into `frontend/dist/`. It generates `assets/js/chatbot.config.js` from `CHATBOT_API_ENDPOINT`; no AI provider key is included in the browser bundle.
