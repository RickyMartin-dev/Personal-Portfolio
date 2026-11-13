# Round 2 — Meridian ×3, Nocturne ×3 (resumable brief)

Orchestrator: Opus (approver). Builders: Sonnet agents, one per folder. If the session dies, a fresh orchestrator reads THIS file, checks the Status table, and re-launches any row not `approved` with the same brief (agents must be idempotent: inspect the folder first and continue, never wipe finished work).

## User feedback that drives round 2 (2026-11-09)
- Liked: **Meridian** — how it looks and how it feels when scrolling; its presentation. **Nocturne** — the city windows lighting up as you scroll.
- Wants: 3 creative variations of each. Professional, pristine, polished, mature, luxury. Take MORE inspiration from the currently deployed site (`frontend/`).
- Meridian variants MUST bring back the **mouse cursor as a shooting star** (comet cursor) from the live site: `frontend/assets/js/site.js` ~lines 265–560 (trail of timestamped points, comet head, sparkle particles, aurora colors `159,123,255` / `93,199,255` / `255,181,98`, hides the system cursor while active). Re-implement cleanly in the variant's own palette; keep it smooth (rAF, DPR-aware canvas, pointer-events:none overlay), page-wide or hero-wide as the brief says, disabled for `prefers-reduced-motion` and coarse pointers (touch), and restore the normal cursor over inputs/text fields/buttons-with-text where precision matters so forms stay usable.
- Nocturne variants: same lights-on-scroll skyline idea, but **more polished and mature** (less playful: no awnings/arcade-cabinet kitsch, no cartoon lamps).
- **Remove the "circle target thing"** — the concentric-ring `.orrery` SVG in v1-meridian (and anything like it: concentric rings, reticles, crosshair dials, radar circles). Do not use any concentric-circle/target motif anywhere.
- Inspiration image: `design-showcase/shared/ref/inspiration-alpine-ledger.png` (open it with Read). What to take from it: a desaturated monochrome mountain above a sea of cloud with **rose alpenglow only on the peaks**; huge calm geometric-grotesk headline; a small letter-spaced **monospace metadata column** at left (plate number, coordinates, "surveyed" date in the rose accent); a hairline-outlined rectangular uppercase-tracked CTA plus a quiet text link with ↓ arrow; scene fades into the page background at the bottom; lots of air. Feels like a premium product site, not a toy.

## Shared contract (every variant)
- Content: `design-showcase/shared/CONTENT.md` is the single source of truth — all of it, facts unchanged. Photo `../shared/img/ricky.jpg` / `ricky-720.jpg` on About.
- Three pages: `index.html`, `about.html`, `games.html` in the variant folder, with folder-local `assets/`. Static HTML/CSS/vanilla JS, no build step. Google Fonts allowed; three.js only via jsdelivr importmap if truly needed (prefer canvas 2D/SVG — it renders fast and reliably).
- Include `<script src="../shared/bridge.js"></script>` in `<head>` before CSS; `<meta name="rm-version" content="<id>">` and `<meta name="rm-page" content="home|about|games">`. Light + dark themes via `html[data-theme]`; canvases recolor on `rm:themechange`. Light mode must be as designed as dark (the inspiration image is a light-mode reference).
- Must keep: mock contact form (validate, inline errors, success state, no network), under-construction "Ask about Ricky" launcher (no requests), résumé toast, Games mockups with authored previews (no real game code), accessible nav, focus styles, `prefers-reduced-motion`, no horizontal overflow at 390px, launcher never covers CTAs on mobile.
- Craft floor: no eyebrow-kicker labels above every section heading, no gradient text, no emoji icons, no side-stripe borders, no generic big-number stat row, no glassmorphism soup, no concentric circles/targets. Proof numbers presented in-world. Real hierarchy, generous whitespace, impeccable type.
- Verify yourself before finishing: server is already running at http://127.0.0.1:4810 (do NOT start another). Run `node design-showcase/tools/shoot.mjs <folder>` from repo root; then Read the PNGs in `design-showcase/_review/<folder>/` and fix what you see. If a render looks broken, re-run once (the dev server occasionally resets connections under parallel load). Also check `--full` for home at least once. Zero page errors, zero horizontal overflow.
- Don't touch other folders, `frontend/`, the hub, or shared files (except reading). No trailing whitespace in files you write.
- Final reply (short): folder, what you built, fonts, how the signature interactions work, known weaknesses.

## Variants

### m1-summit — Meridian · Summit  (closest to the inspiration image)
Meridian's scroll feel and layout DNA, re-dressed as the inspiration image. Hero: monochrome procedural alpine massif rising from a sea of cloud (canvas 2D: fractal ridgelines with rock-face shading via noise + hatching, snow streaks, multi-layer drifting fog bands that parallax on scroll; rose alpenglow tint on the upper peak faces only). Light mode = bright misty white/grey like the image; dark mode = the same massif at night above the cloud sea, cold moonlight on snow, faint stars, occasional shooting star, alpenglow becomes a faint cool rim. Left mono metadata column (e.g. "PLATE I — RICKY MARTIN", "40.7128° N 74.0060° W", "SURVEYED 2026" in rose). Large geometric grotesk headline (e.g. Hanken Grotesk or Schibsted Grotesk; mono e.g. "IBM Plex Mono" or "JetBrains Mono" letter-spaced). Outlined rectangular CTAs. Comet cursor page-wide, tinted rose/silver. Sections below are calm editorial on a near-white / near-black field with hairline rules; projects as plates ("PLATE II", "PLATE III"...) with small authored line diagrams.

### m2-afterglow — Meridian · Afterglow  (closest to the deployed site)
The live site, perfected. Read `frontend/pages/index.html`, `frontend/assets/css/design.css`, `frontend/assets/js/site.js` first and keep its identity: Instrument Serif display (+ a refined sans that is not Inter, e.g. "Geist" or "Hanken Grotesk"; Geist Mono for labels), aurora palette (violet `#9f7bff`, cyan `#5dc7ff`, amber `#ffb562`) on deep ink `#12131f`, mountain-range hero with drifting particles and periodic shooting stars, and the comet cursor exactly in spirit (aurora-colored trail + sparkle). Elevate it to luxury: layered painterly mountain silhouettes with atmospheric perspective, subtle aurora veil, Meridian's scroll choreography (headline underline drawn by a shooting star, sections that reveal with restraint). Light mode: pale dawn — lavender-to-peach sky, slate mountains, amber accents.

### m3-contour — Meridian · Contour  (Swiss editorial, line art)
Meridian distilled to precision line work. White-paper / ink-black fields, a strict 12-column hairline grid that is faintly visible, oversized tight grotesk headline (try "Familjen Grotesk" or "Instrument Sans"), mono metadata. Hero art: a single wide mountain panorama drawn only in fine engraved contour lines / ridge strokes (SVG or canvas) that draw themselves in on load and shift subtly with scroll; a lone rose-accent alpenglow line on the summit; stars as tiny crisp points. Comet cursor as a fine ink/silver hairline streak with tiny sparks (rose accent in light). Projects shown as numbered plates with technical line diagrams. Feels like a premium architecture-firm or Swiss watch site.

### n1-penthouse — Nocturne · Penthouse  (mature luxury)
Nocturne grown up. Read `design-showcase/v7-nocturne/` (especially `assets/js/scene.js`) and keep the scroll-driven window-lighting skyline, rebuilt with far more refinement: a precise, architecturally credible Manhattan skyline (setbacks, spires, water towers as silhouettes only, no cartoon details), windows that warm on in elegant waves as you scroll, faint rain/haze, a reflective wet foreground. Palette: obsidian, smoke, and a single warm brass/champagne accent. Typography: a refined high-contrast serif display (try "Gloock", "Bodoni Moda" at large size only, or restrained "Fraunces") + clean sans + mono for metadata. Light mode: overcast dawn over the city, pale stone tones, windows dim out and the skyline reads as engraving. Career as a refined transit-line timeline (thin lines, small stations). Remove all kitsch (awnings, arcade cabinets → games as framed gallery plates).

### n2-fogline — Nocturne · Fogline  (inspiration image, city edition)
The inspiration image translated to New York: a monochrome skyline whose towers pierce a sea of fog/cloud, rose alpenglow catching only the tops of the tallest spires; fog bands drift and part as you scroll, and windows light up floor by floor (from the fog line upward) as you scroll — dark mode a night fog sea under stars, light mode a bright white-grey morning exactly like the reference. Left mono metadata column ("PLATE IV — MIDTOWN", "40.7549° N 73.9840° W", date in rose), big geometric grotesk headline, outlined rectangular CTAs, text link with ↓. Calm editorial sections below.

### n3-hudson — Nocturne · Hudson  (deployed-site palette, city edition)
The live site's identity applied to the city: Instrument Serif + refined sans + Geist Mono, deep ink `#12131f` with aurora violet/cyan/amber. Hero: Manhattan skyline seen across the Hudson; windows light up on scroll and their light is mirrored as shimmering streaks in the river reflection; faint aurora veil and shooting stars above; the comet cursor (aurora trail) is present here too. Light mode: blue-hour/dusk turning to soft morning, river pale steel. Polished, mature, cinematic but restrained.

## Status
| id | folder | builder | status |
|---|---|---|---|
| m1 | m1-summit | sonnet | approved |
| m2 | m2-afterglow | sonnet | approved |
| m3 | m3-contour | sonnet | approved |
| n1 | n1-penthouse | sonnet | approved |
| n2 | n2-fogline | sonnet | approved |
| n3 | n3-hudson | sonnet | approved |
| hub | hub round switch (round 2 default, `?round=1` for originals) | orchestrator | done (hub.js ROUND1/ROUND2 registry; thumbnails come from `_review/<folder>/home-<theme>-desktop.png`) |

Resume notes: builders were cut by the 5-hour limit once and resumed via SendMessage. If agent context is lost, launch fresh Sonnet agents with the same per-variant prompt (read ROUND2.md, CONTENT.md, bridge.js, v1-meridian or v7-nocturne, live `frontend/`, craft-floor.md; write only in the folder; continue existing work; verify with shoot.mjs). Orchestrator then reviews `_review/<folder>/*.png` and sends fix rounds.
