# Portfolio frontend

This folder owns the static GitHub Pages site, its browser behavior, the Playwright suite, and the builder that creates `frontend/dist/`. The chatbot currently displays an under-construction notice and makes no API calls.

## Local use

From the repository root, run `./scripts/dev.sh` to serve the static site at `http://127.0.0.1:8000`. It does not start FastAPI and needs no AWS credentials. See [`../docs/project-commands.md`](../docs/project-commands.md) for full test setup.

Run the browser suite from this folder after installing dependencies. The command builds `dist/` first and tests the same artifact shape that Pages publishes:

```bash
npm run test:e2e
```

## The site: Aurora Lines (v0)

The site is the finished "Aurora Lines" design: `index.html` (home), `pages/about.html`, `pages/games.html`, one stylesheet (`assets/css/afterglow.css`), and plain scripts in `assets/js/` (`config.js` holds `RM_DEFAULTS`, the saved v0 look; `apply.js`, `logos.js`, `hero.js`, `cursor.js`, `kinetic.js`, `app.js`). `bridge.js` makes the theme follow the visitor's OS colour scheme until they use the toggle (the choice is remembered in the browser). `games.js` powers the playable Tetris and Road Racer modal. There is no jQuery or build-time CSS step.

Design source: `design-showcase/aurora-final/` plus the `studio/` tool; `design-showcase/aurora-final/v0-config.json` is the saved v0 look. The production files are a port of that folder (nav/asset paths adjusted, Studio bridge and `?config=` overrides removed, inline scripts moved to `assets/js/boot.js` for the CSP). Re-sync `config.js` from the design source if the look changes.

The only third-party origin is Google Fonts (`fonts.googleapis.com` stylesheets, `fonts.gstatic.com` font files), allowed by each page's CSP; Web3Forms (`api.web3forms.com`) receives contact-form posts. No third-party scripts.

The site builder copies the home page, pages, runtime assets, and images into `frontend/dist/`. It omits the dormant chat API client and config, backend, Terraform, docs, tests, and Project Starter tools. `WEB3FORMS_KEY` is optional: with the key, the build fills the form's `access_key`; without it, the form is replaced by a direct email link. The chatbot launcher ("Ask about Ricky") opens an under-construction notice handled by `app.js`; it sends no requests.
