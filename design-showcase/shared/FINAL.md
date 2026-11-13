# Final round: Aurora Lines (final) + Studio

The owner picked **r0 Aurora Lines · Original**, and this round finalises it. Two deliverables:

1. **`aurora-final/`**: the finished site (index, about, games). It is seeded from `r0-aurora-lines/` with every bell and whistle working. It adds the **kinetic sliding band** from `r4-kinetic/`: the big serif statement line that scrolls sideways, the mono skills ticker underneath, and the pause button.
2. **`studio/`**: a review room for editing the site live. It covers colours (separately for light and dark), fonts, text sizes, placement, section order and visibility, motion, cursor and logo, plus any single element via click-to-pick. Settings can be saved, compared and exported so the owner can send them back to Claude.

Both are plain static HTML/CSS/vanilla JS served from `design-showcase/` at http://127.0.0.1:4810. The server is already running, so **do not start another one**. Nothing touches `frontend/`, and nothing is committed.

The rules from `shared/ROUND3.md` and `ROUND4.md` still apply:
- Smoothness is mandatory. Do not write `:root` variables during scroll, and do not put filters or blends on moving layers.
- Bake static art into offscreen canvases, and cap DPR at 1.5.
- Loops pause when off-screen, and cursors sleep when idle.
- `prefers-reduced-motion` is respected.
- The perf gate is `node tools/perf.mjs aurora-final --theme dark|light`, which must report p95 ≤ 34ms and ≤ 3% janky frames.
- Content comes from `shared/CONTENT.md`. Never invent employers, metrics or awards.
- The chat launcher stays an under-construction notice that sends no requests.

---

## 1. The config object (single source of truth)

One JSON object describes every editable choice. `aurora-final/assets/js/config.js` defines `window.RM_DEFAULTS`, the default config, and its values must reproduce today's r0 look exactly. The studio edits a copy of it and stores only the **delta from the defaults** when saving.

```js
{
  v: 1,
  theme: 'dark',                       // preview mode: 'dark' | 'light'
  colors: {
    dark:  { bg, surface, surface2, text, muted, faint, accent, accentInk, accentText,
             aurora: [crest, rose, sky, indigo, depth],   // FIVE scene seeds
             lineAlpha /* 0.06–0.3, border strength */, skyGlow /* 0–1.5 */, lineGlow /* 0–1.5 */ },
    light: { ...same keys, light values... }
  },
  type: {
    display: 'Instrument Serif', body: 'Hanken Grotesk', mono: 'Geist Mono',   // Google family names
    displayWeight: 400, bodyWeight: 400, displayItalicAccent: true,
    size: { hero, h2, h3, lead, body, small, mono, nav, kinetic, ticker },   // multipliers 0.6–1.8, default 1
    lineHeight: { display, body },     // unitless
    tracking: { display, body, mono }, // em
    eyebrowCase: 'upper' | 'none'
  },
  layout: {
    maxWidth /*px 960–1680*/, pad /*multiplier*/, sectionGap /*multiplier*/, radius /*px 0–28*/,
    heroAlign: 'left'|'center'|'right', heroV: 'top'|'center'|'bottom', heroHeight /*vh 60–110*/, heroTextWidth /*ch 14–40*/,
    nav: 'bar'|'floating'|'minimal', navAlign: 'right'|'center', sticky: true,
    work: 'grid2'|'grid3'|'list'|'feature',
    order:  { index: ['work','kinetic','focus','contact'], about: [...], games: [...] },   // section keys per page
    hidden: { index: [], about: [], games: [] },
    launcher: 'br'|'bl'|'hidden'
  },
  motion: {
    level: 'full'|'calm'|'off',
    heroDrawIn: true, heroDensity: 1, heroReveal: 1, heroDrift /*0–2 ambient line speed*/,
    cursor: 'comet'|'spotlight'|'ring'|'dots'|'sparks'|'none', cursorColor: 0..4 /* aurora index */,
    reveal: 'rise'|'fade'|'scale'|'none', revealDistance /*px 0–60*/,
    kinetic: { on: true, speed /*0.2–3*/, direction: 'left'|'right', pauseOnHover: true, separator: '▲'|'●'|'✦'|'/'|'—', ticker: true },
    transition: 'aurora-wipe'|'fade'|'none'
  },
  logo: { mark: 'peak'|'ribbon'|'serif'|'monogram'|'wordmark'|'ridge', size /*multiplier*/, showName: true },
  elements: { "<data-edit id>": { size /*multiplier*/, color /*'aurora:N'|'text'|'muted'|'accent'|hex*/, weight, align, mt, mb /*px*/, hidden, italic, upper } },
  copy: { "<data-edit id>": "replacement text" }
}
```

Any key may be missing from a partial config; deep-merge it over `RM_DEFAULTS`.

### Colour roles

The five aurora seeds replace r0's three (violet, cyan, amber):

| Seed | Role |
|---|---|
| **crest** | Top ridge lines, lit faces and glow. Today's amber, `#ffb562`. |
| **rose** | Transition hue between crest and sky. Today `--av5` `#ff96aa`. |
| **sky** | Mid lines and links. Today's cyan, `#5dc7ff`. |
| **indigo** | Blend band. Today `--av2` `#7896ff`. |
| **depth** | Low lines and far summits. Today's violet, `#9f7bff`. |

Light mode uses its own hand-tuned defaults from `afterglow.css`.

**Derivation.** When a theme's colours equal its defaults, write **no** scene variables, so the hand-tuned CSS shows. Otherwise derive every scene token from the five seeds plus `bg`. The tokens are `--sky-*`, `--l1c…--l4b`, `--ln-*`, `--lit`, `--rim`, `--mist`, `--glow`, `--av1-6`, `--fx*` and `--cm*`. Base this on `derive()` in `r0-aurora-lines/assets/js/tune-r0.js`, extended to five seeds. `lineAlpha` sets `--line` and `--line-strong` from `text`, while `skyGlow` and `lineGlow` scale glow opacities.

---

## 2. Site side (`aurora-final/`)

- `assets/js/config.js` defines `RM_DEFAULTS`, plus `RM_SECTIONS`, which lists each page's section keys with human labels.
- `assets/js/apply.js` exposes `window.RMConfig = { get(), set(partial|full), defaults }` and does the following:
  - Applies a config by writing CSS variables on `:root`, `data-*` attributes on `<html>` (e.g. `data-nav`, `data-work`, `data-hero-align`, `data-cursor`, `data-reveal`, `data-logo`, `data-motion`), and one generated `<style id="rm-el">` for `elements`. It also writes `copy` text into `[data-edit]` nodes.
  - Dispatches `rm:config` with `{ config, changed: [top-level keys] }`. JS modules listen for it:
    - The hero re-bakes when colours or density change, debounced by about 120ms.
    - The cursor module swaps effect.
    - The kinetic band changes speed and direction.
  - Loads Google fonts on demand by injecting a `<link>` when a family changes.
  - At boot, it applies `RM_DEFAULTS` deep-merged with `?config=<base64url JSON delta>` if present, before first paint where possible, to avoid a flash.
- Ordering and visibility:
  - Every reorderable section gets `data-section="<key>"`.
  - `main` is `display:flex; flex-direction:column`, and the order is applied with CSS `order`. This is fine for the studio; production will reorder the DOM.
  - Hidden sections get `hidden`.
- Every meaningful element gets `data-edit="<stable-id>"`, with a readable `data-edit-label`. That covers headings, eyebrows, lead paragraphs, buttons, cards, nav, logo, footer lines, kinetic line, ticker, contact block and photo. Aim for 40 or more ids per page.
- **Studio bridge.** When the page is loaded with `?studio=1` inside a same-origin parent, it must do the following:
  - Listen for `message` events from `location.origin` only:
    - `{type:'rm-studio', action:'apply', config}` sets the full config.
    - `{type:'rm-studio', action:'pick', on:bool}` turns pick mode on or off. In pick mode, hovering `[data-edit]` draws an outline overlay with its label, and clicking prevents navigation and selects the element.
    - `{type:'rm-studio', action:'edit-text', on:bool}` turns on contenteditable for `[data-edit]` text leaves. On blur it posts `copy`.
    - `{type:'rm-studio', action:'scrollTo', id}` scrolls to an element.
    - `{type:'rm-studio', action:'highlight', id}` highlights an element.
  - Post to the parent:
    - `{type:'rm-site', action:'ready', page:'index'|'about'|'games', sections: RM_SECTIONS[page], edits:[{id,label}]}`
    - `{type:'rm-site', action:'picked', id, label, computed:{fontSize,color,fontWeight,textAlign,marginTop,marginBottom,text}}`
    - `{type:'rm-site', action:'copy', id, text}`
  - Internal links keep `?studio=1`, so navigating inside the iframe stays in studio mode, and the page asks for the config again through `ready`.
- Polish to finish:
  - Every page, link, theme toggle, page transition, contact fallback (no Web3Forms key), games mockups and the About photo must work in both themes and at 390, 820, 1280 and 1440 px.
  - There must be no console errors, no layout shift on load, and visible focus states.
  - Remove the old Tune panel (`shared/tune.js`) from this folder; the studio replaces it.

## 3. Studio side (`studio/`)

`studio/index.html`, `studio/studio.css` and `studio/studio.js`, plus `studio/presets.js` from the presets agent. The studio is an Operate surface: quiet and precise, with a dark UI chrome that does not compete with the preview. It needs no build step.

- **Shell.**
  - **Top bar:**
    - Page switcher: Home, About, Games.
    - Device widths: 1440, 1280, 820, 390, and Fit.
    - Theme: Dark, Light, and Split (both themes side by side).
    - Compare A/B: two saved looks side by side, or a "flip" key, F.
    - Undo/redo (⌘Z / ⇧⌘Z), with history of 100 or more steps.
    - Reset.
  - **Centre:** the iframe(s), `../aurora-final/<page>.html?studio=1`, scaled to fit.
  - **Right:** the inspector, with tabs Colours, Type, Layout, Sections, Motion, Logo, Elements and Saves.
  - **Search:** a search box filters controls across tabs.
- **Colours.**
  - An "Editing: Dark / Light / Both" switch.
  - Five aurora seed swatches with a picker, hex input, drag-to-reorder and lock.
  - Base colours (bg, surface, surface2, text, muted, faint, accent, accentInk, accentText) and sliders for lineAlpha, skyGlow and lineGlow.
  - A WCAG contrast badge on text/bg, muted/bg, accentText/bg and accentInk/accent, which warns below 4.5.
  - A preset gallery of 16 or more palettes, each with matched dark and light. The owner can apply a preset to one theme or both.
  - Generators: harmony from a seed (analogous, triadic, complementary, split, monochrome), shuffle seeds, randomise unlocked, derive light from dark and vice versa, and nudge hue, saturation and lightness for all seeds.
- **Type.**
  - Font pickers with live previews of each family. The curated list in `presets.js` covers 12 or more display fonts, 10 or more body fonts and 6 or more mono fonts. Each family's font file loads only when it is previewed or chosen.
  - Pairing presets.
  - Per-role size sliders, weights, line heights, tracking and eyebrow case.
- **Layout.** Every key under `config.layout`, shown as segmented controls and sliders.
- **Sections.** A drag-to-reorder list for each page, built from the `ready` message, with eye toggles and click-to-scroll.
- **Motion and Logo.** All keys, with a live preview. Logo marks show as visual tiles.
- **Elements.**
  - A "Pick" button (shortcut P) turns on pick mode in the iframe. Clicking an element opens its controls: size, colour (token chips plus custom), weight, align, mt/mb, italic, uppercase, hide and edit text.
  - A list of every overridden element, with per-item reset.
  - An "Edit text" toggle for inline copy edits.
- **Saves.**
  - Named snapshots, kept in localStorage `rm-studio-saves`, with thumbnails as palette chips. Each one has load, rename, duplicate and delete.
  - Autosave of the working config to `rm-studio-current`.
  - **Export JSON** (download `aurora-studio-<name>.json`), **Import JSON** (file or paste), and **Copy link**, which opens the standalone site with `?config=`.
  - **Copy for Claude**: a Markdown summary listing every change from the defaults in plain words, grouped by area, followed by the JSON delta in a code block. This is how the owner communicates the final look back.
- **Behaviour.**
  - Apply changes live; while dragging, throttle posting to about 30fps.
  - Keyboard accessible, with labels on every control.
  - The studio itself works at 1280px or wider. Below that, show a "use a wider window" note while keeping the preview usable.

## 4. Verification

- `node tools/shoot.mjs aurora-final`, finishing with a plain run, and `node tools/perf.mjs aurora-final --theme dark` and `--theme light`.
- For the studio, a Playwright script (scratch) does the following:
  - Loads `studio/`.
  - Changes a seed colour, a font, a section order and an element override.
  - Checks that the iframe's computed styles changed.
  - Exports a delta, reloads, imports it, and confirms the result matches.
  - Screenshots both themes and Split mode.
  - Asserts there are no page errors.
