# Round 4: Aurora Lines ×6, each fully tunable (resumable brief)

Orchestrator: Opus (reviewer/approver). Builders: Sonnet agents, one per folder, plus one agent for the shared tuning panel. If the session dies, a fresh orchestrator reads THIS file, checks the Status table and re-launches any row not `approved` with the same brief. Agents must be idempotent: inspect the folder first and continue; never wipe finished work. Each builder keeps temp scripts in its own `design-showcase/_scratch/<folder>/`.

## User feedback that drives round 4 (2026-11-10)
- The round-3 winner is **c1 · Afterglow × Contour · Aurora Lines** (`c1-aurora-contour/`). It is the **baseline**, and it is also kept as an option (r0).
- The user wants new variations of it with "lots of variations and changes and differences".
- **Every version must be highly customizable** through an on-page options panel covering colours, fonts, text sizes and more, so the user can edit live and compare.
- Play with different features: **different mouse-following animations, different website animations in general, logos**, etc. "Get very creative."
- State-of-the-art design and UX. Extremely polished, professional and clean.
- Total: 6 versions, r0 (the original c1 plus the panel) and r1–r5.

## Folders
| id | folder | name | signature |
|---|---|---|---|
| r0 | r0-aurora-lines | Aurora Lines · Original | c1 unchanged in look, plus the tuning panel |
| r1 | r1-lantern | Aurora Lines · Lantern | the cursor is a lantern that lights the engraved range |
| r2 | r2-borealis | Aurora Lines · Borealis | living aurora curtains above the line range; silk-ribbon cursor |
| r3 | r3-constellation | Aurora Lines · Constellation | the night sky is the hero; stars link to the cursor and the summits |
| r4 | r4-kinetic | Aurora Lines · Kinetic | typography-led; the range runs through a giant headline; magnetic UI |
| r5 | r5-panorama | Aurora Lines · Panorama | a pinned scroll pans the camera across a wide range of career summits |

## Shared contract (every version)
- Start from c1: your folder has already been seeded with a copy of `c1-aurora-contour/`; evolve it (edit the meta rm-version to your id). Read c1's `index.html`, `assets/css/afterglow.css` and `assets/js/{hero,comet,app}.js` first.
- c1's DNA stays recognisable: engraved contour panorama in aurora light, Afterglow shell, Instrument Serif + Hanken Grotesk + Geist Mono defaults, ink `#12131f` / pale-dawn light, scroll reveal of the distant summits, headline underline meteor.
- Each r1–r5 must be **clearly different** from c1 and from each other in layout, hero composition, motion and interaction, not a recolour.
- Content: `shared/CONTENT.md` is the single source of truth, all of it, with facts unchanged. Do not invent employers, metrics or awards. Photo `../shared/img/ricky.jpg` / `ricky-720.jpg` on About.
- Three pages, `index.html`, `about.html` and `games.html`, with folder-local `assets/`. Static HTML/CSS/vanilla JS, no build step, Google Fonts allowed, canvas 2D or SVG, no three.js.
- `<script src="../shared/bridge.js"></script>` in `<head>` before CSS. Add `<meta name="rm-version" content="<id>">` and `<meta name="rm-page">`. Light and dark themes via `html[data-theme]`; canvases recolour on `rm:themechange` **and** `rm:tune`. Light mode must be designed as fully as dark.
- Must keep:
  - Mock contact form (validate, inline errors, success state, no network).
  - Under-construction "Ask about Ricky" launcher (bottom-right, no requests).
  - Résumé toast.
  - Games mockups with authored previews (no real game code).
  - Accessible nav and focus styles.
  - `prefers-reduced-motion` support.
  - No horizontal overflow at 390px; the launcher and the tune button never cover CTAs on mobile.
- Craft floor: none of the following.
  - Eyebrow kickers above every heading.
  - Gradient text, emoji icons, side-stripe borders.
  - A generic big-number stat row.
  - Glassmorphism soup.
  - Concentric circles, targets, reticles or radar rings (a cursor must not be a dot-in-a-ring).
  - Visible grid lines everywhere.
- Hero → page transition: the scene feathers into the exact `--ground` with no seam at any scroll position, in either theme, at 1440 or 390 width.

## Performance contract (unchanged from ROUND3.md; read its full "Performance contract" section)
- Scroll handlers: passive and rAF-coalesced. Writes are transform/opacity only. Never write CSS variables on `html`/`:root` during scroll or animation.
- No filter, backdrop-filter or blend modes on moving layers or over animating canvases.
- Bake static art into offscreen canvases. Cap DPR at 1.5.
- Pause loops when off-screen or the tab is hidden. Cursor effects sleep after about 120ms idle once empty.
- Gate before reporting done: `node design-showcase/tools/perf.mjs <folder>` prints `"verdict":"PASS"` for home in both `--theme dark` and `--theme light`. **Also run it once with the most expensive cursor/effect options turned on** via `?tune=` (see below) using `--page 'index.html?tune=...'` (perf.mjs joins `&theme=` correctly). `shoot.mjs` takes `--query 'tune=open'` too, but it overwrites the same PNGs, so **finish with a plain `shoot.mjs <folder>` run**: the hub thumbnails come from those files. Report the numbers.

## The tuning panel (shared): `shared/tune.js` + `shared/tune.css`
Built once by the tune agent; every version uses it. Versions never fork it. **API (fixed; code against it even before the file exists):**

```html
<!-- in <head>, right after bridge.js -->
<script src="../shared/tune.js"></script>   <!-- loads ../shared/tune.css itself; applies saved state synchronously before paint -->
<!-- at the end of <body>, after the version's own scripts -->
<script>RMTune.register({ id: 'r1', name: 'Lantern', palettes: [...], groups: [...], apply: function (s) {} });</script>
```

- `RMTune.register(schema)`:
  - `id`: localStorage namespace `rm-tune-<id>`.
  - `palettes`: optional list of `{ id, name, swatch: ['#..','#..','#..'], dark: { '--violet': '#..', ... }, light: { ... } }`. The first is the default. The core adds a final **Custom** palette with colour pickers for `--violet`, `--cyan`, `--amber` (accent = amber), seeded from the active theme's current values.
  - `groups`: version-specific controls, `[{ id: 'cursor', label: 'Cursor', controls: [{ id, label, type: 'select'|'segmented'|'range'|'toggle'|'color', options: [{ value, label }], min, max, step, unit, default, hint }] }]`.
  - `apply(state)`: optional; called after the core applies its own values.
- Core controls are always present, in this group order:
  1. **Look**: theme (light/dark via `RMTheme`), palette swatches, custom colours.
  2. **Type**:
     - Display font: Instrument Serif, Fraunces, Cormorant Garamond, DM Serif Display, Bodoni Moda, Playfair Display, Syne, Space Grotesk, Unbounded, Hanken Grotesk.
     - Body font: Hanken Grotesk, Geist, Inter Tight, Manrope, IBM Plex Sans, Work Sans, Figtree, Instrument Sans, Newsreader.
     - Mono: Geist Mono, JetBrains Mono, IBM Plex Mono, Space Mono, DM Mono.
     - Heading scale 0.75–1.35.
     - Body size 15–20px.
     - Line height 1.4–1.9.
     - Heading tracking −0.04–0.04em.
     - Heading weight / italic accent toggle where the font supports it.
  3. **Layout**: spacing density 0.7–1.4, corner radius 0–24px, content width 1040–1440px.
  4. **Motion**: full / calm / off.
  5. Then the version's groups.
  - Fonts load lazily, one Google Fonts css2 `<link>` per font on first pick.
- **Core writes only these on `:root` inline style**, and only on user change, never during scroll:
  - `--font-display`, `--font-body`, `--font-mono`
  - `--tune-display` (multiplier, default 1)
  - `--tune-body` (default 17px)
  - `--tune-lh` (default 1.65)
  - `--tune-track` (default -0.01em)
  - `--tune-space` (default 1)
  - `--tune-radius` (default the version's own)
  - `--tune-max` (default 1280px)
  - the palette vars for the active theme
  - `html[data-motion="full|calm|off"]`
  - `html[data-tune-*]` attributes for every select/segmented/toggle control: `data-tune-<controlId>="<value>"`, so CSS can switch logos and styles.
- **Version CSS contract:**
  - Headings use `calc(<your clamp()> * var(--tune-display, 1))` and `letter-spacing: var(--tune-track, …)`.
  - `body` uses `font-size: var(--tune-body, 17px); line-height: var(--tune-lh, 1.65)`.
  - Section paddings and large gaps multiply by `var(--tune-space, 1)`.
  - Radii use `var(--tune-radius, Npx)`.
  - `.wrap` max-width uses `var(--tune-max, 1280px)`.
  - Theme-specific derived colours (sky, ridge tints) should derive from `--violet/--cyan/--amber` with `color-mix()` where sensible, so palettes change the whole look.
- Events: after every change the core fires `document` `rm:tune` with `detail: { state, changed: [ids] }`.
  - `RMTune.get(id)` and `RMTune.state()` read the current values.
  - Canvases rebake (debounced about 120ms) on palette, theme or relevant control changes.
  - JS effects read `RMTune.get('cursor')` etc. and swap live without a reload.
  - `data-motion="off"` stops all ambient animation, like reduced motion; `calm` halves it.
- URL: `?tune=<base64url JSON>` overrides the saved state (for screenshots/perf), and `?tune=open` opens the panel on load.
- Panel UX:
  - A small "Tune" pill with a sliders icon, bottom-left, 44px target.
  - It opens a right-side drawer (380px, opaque surface, no backdrop-filter, own `.rmt-` scoped styles that follow the theme but not the version palette). On ≤640px it becomes a bottom sheet (max 75vh, scrollable).
  - Collapsible groups, live preview, Esc closes, focus trap, labelled controls, visible values on sliders.
  - Footer: **Reset**, **Copy settings** (JSON to clipboard, with a selectable textarea fallback) and **Copy link** (current URL with `?tune=`), so the user can send picks back.
  - It never runs code on scroll and must not affect perf numbers when closed.

## Variant briefs (each: 3+ cursor modes including the original comet and "none", 3+ logo marks, 4–6 palettes, motion/animation options; all switchable live in the panel)

### r0-aurora-lines — Aurora Lines · Original (tune agent)
- c1 copied unchanged in look.
- Integrate the tune panel fully: fonts, sizes, spacing, radius and width work everywhere, and palettes recolour the line art.
- Version groups:
  - Cursor: comet / none.
  - Hero: line density, draw-in on/off, scroll-reveal strength.
  - Logo: c1's mark plus 2 alternates.
  - Palettes: Aurora (c1 default), Glacier, Ember, Rose Quartz, Mono Ink.

### r1-lantern — Aurora Lines · Lantern
- A night-hike mood.
- The engraved range is rendered twice and cached: dim, and fully lit.
- The cursor is a **lantern**: a soft pool of light that reveals the lit layer around the pointer. Composite a small cached radial sprite with `destination-in` on a cursor-sized region only, not a full-canvas redraw per frame. The light eases toward the pointer with lag, and its warm amber cast tints nearby labels.
- On touch or reduced motion, the light rests on the summit.
- Cursor options: lantern / comet / fireflies (a few drifting points that follow loosely) / none.
- Logos: an RM monogram drawn as one continuous contour stroke that redraws on hover; a lantern glyph; a serif wordmark.
- Page animations:
  - Headings reveal through a line mask.
  - Project cards are "trail maps": a dotted route draws across each card on hover.
  - Career is a switchback trail down the page that lights as you pass.
- Options: lantern radius, warmth, lag; reveal style (mask / rise / fade / none).

### r2-borealis — Aurora Lines · Borealis
- The sky is alive: 2–3 aurora curtains above the line range.
  - Pre-render tall curtain strips once into an offscreen canvas.
  - Per frame, draw them in vertical slices with sine-offset y/alpha. That is cheap: dozens of `drawImage` calls, not hundreds.
  - The curtains pause off-screen.
- The engraved range glows faintly where the aurora is brightest.
- Cursor options: silk ribbon (a smooth spline ribbon trail in aurora colours that tapers and fades), comet, aurora dust, none.
- Logos: a north-star glyph plus wordmark; an RM in a ribbon stroke; a minimal serif R.
- Page:
  - Sections carry slow-drifting aurora light (static gradients crossfaded by opacity on scroll).
  - A "now" section shows a live aurora "forecast" that cleverly presents the current role.
- Options: curtain intensity, speed, height, colour mode (classic green-violet / Afterglow / monochrome).

### r3-constellation — Aurora Lines · Constellation
- The night sky becomes the hero and the range sits lower. Named star patterns form an RM constellation and skill constellations.
- Cursor options:
  - Constellation link: stars within a radius draw fine lines to the pointer, and to each other near it.
  - Comet.
  - Star-trail (a long-exposure arc follows the pointer).
  - None.
- Summits connect to stars with faint survey lines.
- **Skills as an interactive star chart**: hover or focus a skill group to light its constellation and list its tools (keyboard accessible).
- Career as a star-chart timeline.
- Logos: RM constellation, a 4-point star, a serif wordmark.
- Options: star density, link radius, twinkle, label style (serif / mono / hidden).

### r4-kinetic — Aurora Lines · Kinetic
- Typography-led.
- The hero headline is enormous, and the engraved range runs *through* it. The canvas sits behind; the summits pass in front of the lower parts of the letters using a second cached foreground ridge layer, so the letters sit inside the landscape.
- Split-letter / word reveals on load.
- On scroll, the headline lines slide apart horizontally at different rates (transform only).
- A slow skills marquee (pausable, pauses on hover and for reduced motion).
- Magnetic buttons and links (they lean toward the pointer within a radius, transform only).
- Cursor options: magnetic ink (a small blended-free dot that stretches with velocity), spark trail, comet, none.
- Logos: a bold geometric monogram in a peak; an outlined RM; a wordmark with a meteor dot.
- Options:
  - Headline style: serif / sans / outline (outline via `-webkit-text-stroke`).
  - Marquee speed.
  - Magnet strength.
  - Reveal style (letters / words / lines / none).

### r5-panorama — Aurora Lines · Panorama
- After a short intro, a **pinned section** (sticky, about 300–400vh tall) turns vertical scroll into a camera pan across a very wide engraved range. The range is cached in 2–3 parallax depth canvases translated with transforms only.
- Each major summit is a career or project milestone with a spot-height label and a short caption card that fades in as it reaches centre.
- An altitude/progress indicator runs along the bottom. It is in-world, not a stat row.
- The pan ends by descending into the page ground, seamlessly.
- Cursor options:
  - Elevation trace: the pointer leaves a fading contour-line trail that hugs its path.
  - Comet.
  - Sparkle.
  - None.
- Logos: an animated peak glyph whose line draws; an RM ligature; a wordmark.
- Mobile: the pan still works, or degrades to a horizontal swipe strip.
- Options: pan length (short / standard / long), parallax strength, label density, caption style.

## Verification (every builder)
- The server is already running at http://127.0.0.1:4810. Do NOT start another.
- From the repo root, run `node design-showcase/tools/shoot.mjs <folder>`, then Read the PNGs in `design-showcase/_review/<folder>/` and fix what you see.
- Run `--full --pages home` at least once.
- Also capture the panel open (`?tune=open`) on desktop and mobile with a scratch script, and check that it looks crafted.
- Switch at least two palettes, two fonts and every cursor mode via `?tune=`, and check that nothing breaks.
- Run perf.mjs dark and light (and the expensive options). Zero page errors, zero horizontal overflow.
- Don't touch other folders, `frontend/`, the hub or `tools/`. Only the tune agent writes `shared/tune.*`. No trailing whitespace.
- Final reply (short): folder, what you built, fonts, signature interactions, the option list, perf numbers, and known weaknesses.

## Status
| id | folder | builder | status |
|---|---|---|---|
| tune | shared/tune.js + r0 | sonnet | approved (panel reviewed desktop+mobile; perf dark 25.2 / light 33.2) |
| r1 | r1-lantern | sonnet | approved (1 fix round; perf 26.0 dark / 26.0 light on a quiet machine) |
| r2 | r2-borealis | sonnet | approved (1 fix round; perf p95 ~33.5, edge under load) |
| r3 | r3-constellation | sonnet | approved (1 fix round; perf 17.0 dark/light) |
| r4 | r4-kinetic | sonnet | approved (perf dark 25.5 / light 25.9) |
| r5 | r5-panorama | sonnet | approved (1 fix round; perf 26.3 dark / 25.2 light; taskMs ~1.8s) |
| hub | ROUND4 registry, default round 4 | orchestrator | done (thumbnails from _review/<folder>/home-<theme>-desktop.png) |
