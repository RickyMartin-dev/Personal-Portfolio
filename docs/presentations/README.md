# Lavish review pages

- `.lavish/repo-walkthrough.html` maps the portfolio UI, chatbot API, Terraform, `develop` deployment flow, local inference, and first-deploy setup.
- `.lavish/project-starter-operating-system.html` explains the reusable Project Starter workflow integrated at the repository root.
- `.lavish/retro-YYYY-MM.html` is generated alongside a monthly report by `./scripts/project retro YYYY-MM --html`.

Open a review surface with:

```bash
npx -y lavish-axi .lavish/repo-walkthrough.html
```

Keep claims grounded in repository files. The HTML is a communication artifact, not a second source of truth; update deployment status only after checking the live workflow and AWS state. Register future review pages here and regenerate monthly retrospectives with the project command.
