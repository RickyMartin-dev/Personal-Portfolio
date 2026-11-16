# Project Brief

## Identity

- Project: Ricky Martin's personal portfolio and chatbot.
- Outcome: publish a fast, accessible portfolio and a low-cost AI assistant in one repository.
- Users: recruiters, collaborators, and visitors asking about Ricky's portfolio and current work.
- Current phase: maintain the portfolio and deploy the assistant through reviewed changes.

## Scope

### In scope

- Preserve the v0 Aurora Lines static portfolio and its contact flow.
- Keep the static frontend, chatbot backend, infrastructure definitions, and project tools in one reviewable repository.
- Use a stateless backend agent with bounded temporary browser history.
- Ground common answers in curated profile facts and retrieve approved documents when details are needed.
- Monitor a dedicated S3 `documents/` prefix and sync additions, updates, and removals into the search index.
- Keep conversation history in page memory and do not persist visitor transcripts.
- Run backend, browser, security, artifact, and infrastructure checks before changes can be merged.
- Track operational usage without storing message or document contents in logs.

### Deferred

- Read-only GitHub activity tools.
- Model-initiated external actions or write access.

### Out of scope

- Rebuilding the portfolio in a UI framework.
- Persistent visitor transcripts or server-side conversation memory.
- Always-on compute in the first release.

## Success signals

- A clean checkout can run the static site and execute mocked backend tests.
- CI checks the chat flow, frontend artifact, browser behavior, and infrastructure configuration.
- Reviewed changes deploy through the production workflow.
- No AI provider credential appears in published frontend files; application logs contain usage metadata only.
- The owner can upload approved documents and have changes indexed automatically.

## Constraints and risks

- Model inference, safety checks, retrieval, and document indexing have usage-based charges. Budget alerts notify but do not stop spending.
- Production credentials are provided to the backend through its runtime role; the website receives no provider credential.
- The assistant is publicly accessible. Browser origin checks alone are not authentication, so requests and retrieval are bounded and a usage guard is enforced server-side.
