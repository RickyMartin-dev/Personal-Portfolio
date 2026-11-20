# Portfolio frontend

This folder owns the static GitHub Pages site, its browser behavior, the Playwright suite, and the builder that creates `frontend/dist/`. See [project commands](../docs/project-commands.md#view-the-site-locally) for local chatbot configuration and [delivery architecture](../docs/architecture.md#delivery-and-monitoring) for production publishing checks.

## Local use

From the repository root, run `./scripts/dev.sh` to serve the static site at `http://127.0.0.1:8000`. It does not start FastAPI and needs no AWS credentials. See [`../docs/project-commands.md`](../docs/project-commands.md) for full test setup.

Run the browser suite from this folder after installing dependencies. The command builds `dist/` first and tests the same artifact shape that Pages publishes:

```bash
npm run test:e2e
```

## The site: Aurora Lines (v0)

The production site source of truth is in this folder: `index.html` (home), `pages/about.html`, `pages/games.html`, `assets/css/afterglow.css`, and the scripts under `assets/js/`. The runtime scripts provide the site's theme preference, navigation, animated mountain and sky, logo treatment, scrolling ticker, playable games, and chatbot interaction. Make future visual changes directly in these production files.

Google Fonts (`fonts.googleapis.com` stylesheets, `fonts.gstatic.com` font files) and the chatbot API are allowed by each page's CSP; Web3Forms (`api.web3forms.com`) receives contact-form posts. No third-party scripts.

The site builder copies the home page, pages, runtime assets, and images into `frontend/dist/`. It omits the backend, Terraform, docs, tests, and Project Starter tools. Without `CHATBOT_API_ENDPOINT`, it omits the chat client/config and keeps the under-construction notice. `WEB3FORMS_KEY` is optional: with the key, the build fills the form's `access_key`; without it, the form is replaced by a direct email link.
