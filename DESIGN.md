# Design system

Use this as the product UI reference. The portfolio's implementation is the source of truth in `frontend/assets/css/design.css`, `frontend/assets/css/main.css`, and the page markup. The separate `.lavish/theme.css` is for repository review artifacts; do not apply its theme to the deployed website.

## Visual direction

- Portfolio: editorial typography, deep indigo surfaces, soft atmospheric gradients, warm highlights, and practical project cards.
- The dark theme is the default. The light theme uses the same structure with pale lavender surfaces and dark readable text.
- Keep sections spacious and content scannable. Use the existing component vocabulary rather than introducing a second design framework.

## Tokens in `frontend/assets/css/design.css`

| Purpose | Existing token | Dark value |
| --- | --- | --- |
| Main background | `--c-bg` | `#12131f` |
| Raised surface | `--c-bg-2` | `#191b2a` |
| Further raised surface | `--c-bg-3` | `#222437` |
| Main text | `--c-text` | `#f4f4f9` |
| Secondary text | `--c-text-2` | `#b8bdd3` |
| Warm accent | `--c-accent` | `#ffb562` |
| Violet accent | `--c-accent-2` | `#9f7bff` |
| Blue accent | `--c-accent-3` | `#5dc7ff` |
| Content width | `--max-w` | `1200px` |
| Navigation height | `--nav-h` | `68px` |

The light palette is declared under `html[data-theme="light"]`. Keep custom styles on these tokens so both themes remain coherent. The loaded display and body fonts are Instrument Serif and Inter; `--f-mono` is a fallback stack and does not imply that a separate mono font is loaded.

## Existing components

- Header and navigation: `#nav`, `.nav__inner`, `.nav__links`, `.nav__logo`, `.theme-toggle`.
- Intro: `.hero`, `.hero__text`, `.hero__photo`, `.hero__cta`.
- Content: `.section`, `.section__label`, `.section__title`, `.kpi-grid`, `.project-card`, `.traits`, `.trait`.
- Chatbot: styles and state live in `frontend/assets/css/design.css` and `frontend/assets/js/chatbot.js`; follow `docs/chatbot-experience.md` for behavior and accessibility requirements.

## Interaction and accessibility

- Reuse the existing theme toggle, navigation, focus, and motion patterns. Respect reduced-motion preferences.
- Keep controls semantic, labelled, keyboard operable, and visibly focused. Preserve status announcements and retryable chatbot errors.
- Maintain readable contrast in both themes; do not use color alone to communicate state.
- Check mobile layouts at narrow widths and prevent horizontal scrolling.

## Design workflow

Load the `impeccable` skill for visual changes. Consult `PRODUCT.md` and this file before editing, keep the CSS tokens as the source of truth, and review detector findings. Run the detector manually with `sh .agents/skills/impeccable/scripts/impeccable detect --json frontend/assets/css frontend/assets/js frontend/pages` when the provider hook did not run. Keep Lavish report styling separate from product styling.
