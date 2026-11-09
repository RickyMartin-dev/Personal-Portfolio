# Product context

## Product

Ricky Martin's personal portfolio presents AI/ML engineering experience, selected work, technical interests, and contact options. A small public chatbot lets visitors ask questions about the portfolio. It is an informational assistant, not a general-purpose agent and it does not take actions on behalf of visitors.

## Audience and primary task

The primary audience is a recruiter, hiring manager, engineering peer, or collaborator evaluating Ricky's experience. They should be able to scan the portfolio, inspect relevant work, and ask a short follow-up question without losing their place.

## Main paths

- `frontend/pages/index.html`: portfolio introduction, impact, selected work, focus areas, contact, and chatbot.
- `frontend/pages/about.html`: experience, background, skills, contact, and chatbot.
- `frontend/pages/elements.html`: optional browser-playable games.
- Chatbot: opens as a floating panel, sends bounded text and recent conversation context to the backend, and displays an answer or a recoverable error.

## Product constraints

- Keep the site fast and static; only the chatbot needs a backend.
- The browser must never receive an AI provider credential. The backend calls the same Bedrock model locally and in Lambda.
- Keep chat history in page memory only. Do not persist visitor prompts or replies in browser storage or server logs.
- Preserve keyboard access, visible focus, clear status/error text, mobile layout, and the site's existing light/dark theme behavior.
- Deploy application changes from `develop`; infrastructure and CI configuration live in this repository.

## Design intent

The portfolio should feel personal, calm, technically credible, and easy to scan. Use concrete project evidence and a clear hierarchy. The chatbot is a supporting interaction; it should not obscure the person's work or compete with the main navigation.
