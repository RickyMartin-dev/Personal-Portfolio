# Portfolio frontend

This folder owns the static GitHub Pages site, its browser behavior, the Playwright suite, and the builder that creates `frontend/dist/`. The chatbot currently displays an under-construction notice and makes no API calls.

## Local use

From the repository root, run `./scripts/dev.sh` to serve the static site at `http://127.0.0.1:8000`. It does not start FastAPI and needs no AWS credentials. See [`../docs/project-commands.md`](../docs/project-commands.md) for full test setup.

Run the browser suite from this folder after installing dependencies. The command builds `dist/` first and tests the same artifact shape that Pages publishes:

```bash
npm run test:e2e
```

The site builder copies the static redirect, pages, runtime assets, and images into `frontend/dist/`. It omits the legacy chat API client and config, backend, Terraform, docs, tests, Project Starter tools, Sass source, and legacy template assets. `WEB3FORMS_KEY` is optional: with the key, the build configures Web3Forms; without it, the form is replaced by a direct email link.
