# Chatbot experience

## V0 interaction

The floating launcher opens a compact desktop conversation panel and a bottom sheet on phones. It has an explicit label, a polite live region, bounded input, waiting/error states, Enter-to-send and Shift+Enter for a newline. Escape and Close return focus to the launcher. The source build remains under construction until a public HTTPS `/chat` endpoint is supplied; offline builds load no chat client and send no requests.

## Future interaction requirements

V0 and future iterations retain these product and privacy requirements:

- Keep conversation history in page memory only and bound the context sent with each request.
- Send text to the backend for inference; never expose an AI provider credential in browser code.
- Make loading, success, throttling, and failure states clear, preserve a draft on failure, and prevent duplicate submissions.
- Support keyboard-only operation and narrow mobile screens, with a persistent input label and sensible focus behavior.
- Do not persist conversation text in browser storage, an application database, or logs. V0 persists only the aggregate monthly request count.
- Mocked UI/API tests run before deployment and do not make paid inference calls. A deliberate live smoke request is a separate, chargeable operation.

## V0 acceptance criteria

1. A visitor can send a question and receive an answer from Bedrock through API Gateway and Lambda.
2. Local and deployed configurations use the same model and prompt settings, while credentials remain private to each backend environment.
3. The API enforces a 1,000-request UTC-month quota and network/server failures preserve the draft for retry.
4. The exchange is accessible by keyboard and screen reader and works at mobile widths.
5. Browser and backend tests cover disabled mode, enabled mode, request history, errors, and mobile layout without paid inference calls.
