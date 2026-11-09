# Chatbot experience (v1)

## Intended experience

The portfolio chatbot provides text-only question and answer about Ricky's work. The local and deployed versions use the same model and prompt behavior, so a user can exercise the same conversation flow in either environment. Provider credentials stay in the backend environment; the browser never receives an AI token.

Conversation history exists in JavaScript memory only. The frontend sends at most the latest two complete exchanges (four messages, 2,000 characters total) with each request so follow-up questions have context without sending an unbounded transcript. The backend uses it for that inference and does not persist it. It is not stored in browser storage, shared across tabs, or associated with an account. It clears whenever the page reloads or closes.

## Interaction states

- **Ready:** The user can open the chat, enter text, and send with the button or Enter. Empty or whitespace-only messages are not submitted.
- **Loading:** Show the pending user message and an announced progress indicator. Prevent duplicate submissions while the request is in flight.
- **Success:** Replace the progress indicator with the assistant's plain-text response, keep messages in chronological order, and keep the newest exchange in view.
- **Rate limited:** Explain that the request was throttled and can be retried later. Preserve the message in the input; do not expose provider or infrastructure details.
- **Error:** Keep the user's message visible in the input and give a clear, non-technical failure message with a way to retry. Do not expose credentials, stack traces, or raw provider errors.

## Accessibility and responsive behavior

- Use semantic buttons with accessible names for the chat launcher, close action, and send action; expose the launcher's expanded state and relationship to the chat panel.
- Give the text input a persistent accessible label. Announce new messages and loading/error status to assistive technology without repeatedly reading the full conversation.
- Opening the chat moves focus to the input; closing it returns focus to the launcher. The complete flow works with keyboard only, including Enter to send and Escape to close.
- At narrow mobile widths, the panel stays within the visible viewport, the message area can scroll independently, and the input and controls remain reachable without horizontal page scrolling.

## Acceptance criteria

1. A visitor can ask and receive a text-only answer in local development and on the deployed site, with the same model/prompt behavior and no AI token exposed to the browser.
2. Messages appear in order; progress, success, rate-limit, and error states are understandable and accessible. A failed or rate-limited request can be retried without retyping the original question, and a successful retry clears the input.
3. Conversation history exists only in the current page's JavaScript memory, sends no more than two complete exchanges and 2,000 characters with each request, and is not persisted by the server or stored in local/session storage. It is not shared across tabs and clears on page reload or close.
4. The launcher, input, send, close, status announcements, keyboard flow, and narrow-screen layout meet the accessibility and responsive expectations above.
5. Tests cover successful inference, rate limiting with a retry, backend and network failure with input preservation, duplicate-submit prevention, bounded memory-only history, keyboard-only use, and a narrow viewport.

## Deferred: phase 2 context

Read-only retrieval from an allowlisted S3 corpus and/or GitHub repository content is a phase-2 enhancement, not part of v1. If added, it must remain read-only: the assistant may retrieve and cite approved context but must not write to S3, edit repository files, open pull requests, or otherwise mutate GitHub. Retrieval sources and citation behavior will be specified before that phase begins.
