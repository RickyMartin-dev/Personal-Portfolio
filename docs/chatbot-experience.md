# Chatbot experience

## Current state

The chatbot is under construction while the GitHub Pages deployment is being made independent from AWS. The floating launcher shows a warning sign. Activating it opens a short accessible notice; closing the notice or pressing Escape restores focus to the launcher. There is no chat input, provider credential, API endpoint, or network request in the site.

## Future interaction requirements

When the assistant is ready to be re-enabled, retain these product and privacy requirements:

- Keep conversation history in page memory only and bound the context sent with each request.
- Send text to the backend for inference; never expose an AI provider credential in browser code.
- Make loading, success, throttling, and failure states clear, preserve a draft on failure, and prevent duplicate submissions.
- Support keyboard-only operation and narrow mobile screens, with a persistent input label and sensible focus behavior.
- Do not persist conversation text in browser storage, an application database, or logs.
- Add mocked UI/API tests before enabling the production endpoint. Any live inference check and its cost must be deliberately reintroduced as part of a separate deployment change.

## Re-enable acceptance criteria

1. A visitor can send a question and receive an answer from the chosen model through the secured backend.
2. Local and deployed configurations use the same model and prompt settings, while credentials remain private to each backend environment.
3. Rate-limit, network, and server failures are understandable and allow retry without retyping.
4. The exchange is accessible by keyboard and screen reader and works at mobile widths.
5. Automated browser and backend tests cover the contract without making paid inference calls.
