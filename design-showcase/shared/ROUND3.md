# Round 3: Afterglow ×4, Afterglow × Contour ×3, Fogline ×4 (resumable brief)

Orchestrator: Opus (reviewer/approver). Builders: Sonnet agents, one per folder. If the session dies, a fresh orchestrator reads THIS file, checks the Status table, and re-launches any row not `approved` with the same brief. Agents must be idempotent: inspect the folder first and continue, never wipe finished work. Each builder uses a private scratch folder `design-showcase/_scratch/<folder>/` for temp scripts (never another builder's).

## User feedback that drives round 3 (2026-11-10)
- **Winner so far: m2 Meridian · Afterglow.** The user likes its website look and feel best.
- **Problem:** Afterglow "feels a little jumpy and not smooth, like scrolling the page or just being on it seems low frame rate". This must be fixed, and no round-3 variant may have it. Measured: `tools/perf.mjs m2-afterglow` gives p95 50ms and 5% janky frames (FAIL), while m3-contour passes at p95 25ms.
- **Contour (m3):** the user does NOT like Contour's website shell ("lines everywhere": the visible 12-column grid, hairline rules on everything, Swiss chrome). They DO love its **mountain range** (fine engraved ridge/contour line art) and its **scroll feature**: layered ridge rows translate at different rates (`.art .row { transform: translateY(calc(var(--sy) * var(--p))) }`), so scrolling uncovers more of the distant summits. "Feels very premium."
- **Fogline (n2):** the user likes the ideas but wants it "more ironed out and pristine", with creative variety. They suggest borrowing Afterglow's website and Contour's coolness. The new reference image `shared/ref/inspiration-neon-harbor.png` (open it with Read) shows a city skyline at night across still water. It has slender glass towers with cyan and magenta edge light, a deep-blue star field, warm gold lights at the waterline and long glossy reflections. The user wants that combined with Afterglow's look, a city instead of mountains.
- The user wants state-of-the-art design and UX intuition: extremely polished, professional, clean. **The transition from the hero visual into the rest of the website must be clean, polished and smooth**, with no hard seam, no abrupt colour band and no scene that just stops.

## Folders (11 total)
| id | folder | name | one-line |
|---|---|---|---|
| a0 | a0-afterglow | Afterglow · Original | m2 copied unchanged in look; smoothness fixed only |
| a1 | a1-mirror | Afterglow · Mirror Lake | Afterglow range reflected in a still alpine lake |
| a2 | a2-gallery | Afterglow · Gallery | editorial split layout, the panorama as a framed living artwork |
| a3 | a3-horizon | Afterglow · Horizon | scroll scrubs time of day from dusk to night to dawn across the page |
| c1 | c1-aurora-contour | Afterglow × Contour · Aurora Lines | Contour's engraved panorama drawn in aurora light inside Afterglow's site |
| c2 | c2-ridgeline | Afterglow × Contour · Ridgeline | dozens of receding luminous ridgelines; scroll lifts the camera over the range |
| c3 | c3-engraved | Afterglow × Contour · Engraved Dusk | Afterglow's painted layers with engraved contour hatching and a glowing rim |
| f1 | f1-neon-harbor | Fogline · Neon Harbor | the neon-harbor photo, Afterglow's site, a city across mirror water |
| f2 | f2-monolith | Fogline · Monolith | monochrome luxury; fog sinks as you scroll to reveal the towers |
| f3 | f3-elevation | Fogline · Elevation | the city as an architect's line elevation (Contour for the city) |
| f4 | f4-skyward | Fogline · Skyward | scroll ascends a supertall from street fog to above the clouds |

## Shared contract (every variant)
- Content: `shared/CONTENT.md` is the single source of truth, all of it, with facts unchanged. Photo `../shared/img/ricky.jpg` / `ricky-720.jpg` on About.
- Three pages, `index.html`, `about.html` and `games.html`, in the variant folder with folder-local `assets/`. Static HTML/CSS/vanilla JS, no build step. Google Fonts allowed. Canvas 2D or SVG; no three.js.
- `<script src="../shared/bridge.js"></script>` in `<head>` before CSS; `<meta name="rm-version" content="<id>">` and `<meta name="rm-page" content="home|about|games">`. Light and dark themes via `html[data-theme]`; canvases recolour on `rm:themechange`. Light mode must be designed as fully as dark.
- Must keep: mock contact form (validate, inline errors, success state, no network); under-construction "Ask about Ricky" launcher (no requests); résumé toast; Games mockups with authored previews (no real game code); accessible nav; focus styles; `prefers-reduced-motion`; no horizontal overflow at 390px; launcher never covers CTAs on mobile.
- **Afterglow DNA** (all a*, c*, and f1/f4; f2/f3 may borrow selectively):
  - Instrument Serif display with a refined sans (Geist or Hanken Grotesk, not Inter) and Geist Mono labels.
  - Aurora palette (violet `#9f7bff`, cyan `#5dc7ff`, amber `#ffb562`) on deep ink `#12131f`; light mode is pale dawn.
  - Headline underline drawn by a shooting star.
  - Comet cursor (aurora trail + sparkle), restrained section reveals, calm generous editorial sections.
  - Read `m2-afterglow/` (index.html, assets/css/afterglow.css, assets/js/*.js) first; it is the reference shell. Reuse its structure and components freely (copy into your folder), then make your own variation.
- Comet cursor rules: rAF, DPR-aware, `pointer-events:none` overlay. Disabled for `prefers-reduced-motion` and coarse pointers. Normal cursor over inputs/textareas/links/buttons. **It must go to sleep**, meaning it clears the canvas once and stops the loop, when the trail and particles are empty and the pointer has been still for about 120ms.
- Craft floor: none of the following.
  - Eyebrow-kicker labels above every heading.
  - Gradient text, emoji icons, side-stripe borders.
  - A generic big-number stat row (present proof numbers in-world).
  - Glassmorphism soup.
  - Concentric circles, targets, reticles or radar rings.
  - Visible grid lines everywhere (the thing the user disliked about Contour).

## Performance contract (non-negotiable; this is the user's #1 complaint)
Root causes found in m2-afterglow:
- The scroll handler writes `--dawn` on `<html>` every frame, which restyles the entire page.
- SVG layers with `filter:url(#soft|#glow)` are translated on scroll, so the filters re-rasterise every frame.
- Mist ellipses with CSS `filter: blur(20px)` animate forever.
- A `mix-blend-mode: overlay` noise layer sits over an animating canvas.
- A `backdrop-filter: blur` header passes over the moving hero.
- The aurora veil makes about 860 `drawImage` calls per frame.
- The full-screen comet canvas never sleeps.

Rules:
1. Scroll handlers: passive and rAF-coalesced. Read layout only on resize (cache offsets/heights) and never inside the scroll frame. Write only `transform` / `opacity` on a few promoted elements. **Never set CSS custom properties on `html`/`body`/`:root` during scroll or animation.** Scope any variable to the smallest element, or better, set transforms directly.
2. No CSS or SVG `filter` (blur, drop-shadow, feGaussianBlur), `backdrop-filter` or `mix-blend-mode` on anything that animates, moves on scroll, or sits over an animating canvas. Bake blur/glow into offscreen canvas sprites or static images once (on resize/theme change). Sticky header: an opaque or near-opaque background with no backdrop-filter.
3. Canvas: render static scenery (ridges, skyline, engraved lines, stars) **once** into offscreen canvases on resize/theme. Per frame, only composite those cached layers (drawImage with transforms) and draw a small number of moving things. Cap full-bleed canvas DPR at 1.5. No per-frame `createRadialGradient` / `createLinearGradient` for many objects; pre-render glow sprites. No `getImageData` per frame. Keep per-frame draw calls in the low hundreds at most.
4. Pause every rAF loop when its canvas is off-screen (IntersectionObserver) or the tab is hidden. Idle scenes (no shooting star, no motion) should drop to a low-cost path. Ambient drift can run at reduced cost, but never a full redraw of everything every frame.
5. Prefer CSS transforms (compositor) for parallax over redrawing a canvas on scroll. Use `will-change: transform` only on the few layers that actually move.
6. Gate, **before you report done**: `node design-showcase/tools/perf.mjs <folder>` must print `"verdict":"PASS"` (p95 ≤ 34ms, janky ≤ 3%) for home in both `--theme dark` and `--theme light`. Report the numbers. Also keep `taskMs` within about 2× m3-contour's (~830ms); m2-afterglow was 4451.

## Transition contract (hero → page)
The scene must dissolve into the page:
- Feather the scene into the exact page background colour (a gradient into `var(--ground)` over at least 20% of the hero height, or the scene's own atmosphere/fog/water fading out).
- Make the next section's first element sit on that same colour.
- No visible seam at any scroll position, in either theme, at 1440 or 390 width. Check with `--full` captures.

## Verification (every builder)
- The server is already running at http://127.0.0.1:4810. Do NOT start another.
- From repo root, run `node design-showcase/tools/shoot.mjs <folder>`, then Read the PNGs in `design-showcase/_review/<folder>/` and fix what you see. Run `--full --pages home` at least once to check the transition. If a render looks broken, re-run once (the server occasionally resets under parallel load).
- Run `node design-showcase/tools/perf.mjs <folder>` (dark and light). Zero page errors, zero horizontal overflow.
- Don't touch other folders, `frontend/`, the hub, `tools/` or shared files (except reading). No trailing whitespace.
- Final reply (short): folder, what you built, fonts, signature interactions, perf numbers (dark/light), known weaknesses.

## Variant briefs

### a0-afterglow — Afterglow · Original (smoothed)
Already a byte copy of `m2-afterglow` with rm-version a0. **Do not change the design.** It must look the same in screenshots (compare against `_review/m2-afterglow/`). Fix every root cause listed in the performance contract:
- `--dawn` moves off `<html>`: scope it to the hero, or replace it with opacity crossfades of pre-built elements.
- Bake the SVG soft/glow filters and the blurred mist into canvas or static raster, or stop translating filtered layers.
- Remove the per-frame blend overlay. Bake the grain into a static layer under the canvas, or drop it if invisible.
- No backdrop-filter on the header.
- The aurora veil renders to a small offscreen canvas at a low rate (e.g. every 3rd frame, or with fewer, wider columns) and is scaled up.
- The comet sleeps.

Rename the sessionStorage key to `rm-a0-meteor`. Before and after `perf.mjs` numbers are required.

### a1-mirror — Afterglow · Mirror Lake
- Afterglow's layered aurora ridges, shooting stars and comet cursor. The lower 35–40% of the hero is a perfectly still alpine lake that mirrors the range and the aurora: a cached, vertically flipped and darkened copy of the cached scene layer, with very subtle horizontal shimmer bands (a few translucent stripes that drift, not per-pixel distortion).
- A shooting star crossing the sky also streaks across the reflection.
- On scroll, the camera gently descends toward the shoreline: the ridges parallax up, the lake widens, and the water's dark surface becomes the page background seamlessly. This is the transition.
- Proof numbers as small surveyor's marks reflected at the shore, or as quiet captions. Light mode: misty dawn lake, lavender/peach, pale slate peaks.

### a2-gallery — Afterglow · Gallery
- Editorial luxury. The hero is a split composition: a big Instrument Serif headline, statement and CTAs on the left. On the right is the Afterglow panorama, presented as a tall framed living artwork (a museum-plate proportion with a fine mat, and a caption line in Geist Mono such as "Range at afterglow — live render").
- The scene animates gently inside the frame: aurora, a shooting star, drifting particles.
- As you scroll, the frame expands to full-bleed and then dissolves into the page background. This is the transition (scale/clip via transform, cheap).
- Below: sections as calm exhibition rooms, with projects as captioned plates with small authored diagrams.
- Mobile: the framed artwork sits above the headline, full-width.

### a3-horizon — Afterglow · Horizon
- One continuous landscape lives in a fixed, cached background layer behind the whole page, and scroll scrubs the time of day.
- Top: dusk afterglow (amber/violet). Middle of page: deep night with aurora and stars. Near the contact: blue-hour dawn.
- Implement as 3 pre-rendered sky states crossfaded by opacity (no per-frame repainting of the whole sky; the content sections sit on readable panels or a scrim so text contrast holds at every scroll position).
- The ridge silhouettes stay put while the light changes.
- Light mode starts at morning and runs to golden hour.
- The transition from hero into content is the light itself changing, and content panels must still read cleanly.

### c1-aurora-contour — Afterglow × Contour · Aurora Lines
- Afterglow's site shell (serif headline, aurora palette, ink ground, comet cursor, underline meteor, editorial sections). No visible 12-column grid and no hairlines everywhere.
- The hero art is Contour's engraved mountain panorama: read `m3-contour/assets/js/contour.js` and its CSS and reuse the generation. The fine strokes are coloured by elevation in aurora light: violet lowlands, cyan mid-slopes, amber or rose catching the summits.
- Lines draw themselves in on load.
- Contour's scroll reveal: ridge rows translate at different rates so scrolling uncovers more of the distant summits.
- A soft aurora veil and stars behind the line art, cached.
- Proof numbers as spot-height labels on peaks (with collision avoidance, as in m3).
- Light mode: ink-on-paper with violet/amber lines on pale dawn.

### c2-ridgeline — Afterglow × Contour · Ridgeline
- The hero is 30–60 stacked ridgelines receding in perspective, from near (bottom, larger amplitude, brighter) to far (top, fine, fainter). Each line is filled below with the ground colour so it occludes the ones behind.
- The lines are luminous hairlines in an aurora gradient (far violet to near amber, or by height), with an afterglow sky glow behind the farthest ridge.
- Scroll lifts the camera: as the user scrolls, rows spread and drop at different rates (Contour's reveal), so more summits rise into view and the range opens up. The near ridges sink away and become the page background.
- Pre-render each ridge to an offscreen canvas strip or an SVG path; animate with transforms only.
- Mouse adds a subtle lateral parallax. Comet cursor, shooting stars, Afterglow shell.
- Light mode: graphite lines on warm paper with an amber dawn glow.

### c3-engraved — Afterglow × Contour · Engraved Dusk
- Afterglow's painterly filled ridge layers (atmospheric perspective, alpenglow rim) overlaid with Contour-style engraved contour hatching on the mountain faces: dense fine lines following the slope, denser in shadow, sparser in light, like a banknote or etching.
- Line colours are tinted by the aurora light; the rim glow is baked.
- Contour's scroll reveal (rows translate at different rates).
- Proof numbers as spot heights.
- Light mode reads as a hand-tinted engraving print on warm paper.
- The most "luxury object" of the three. The Afterglow shell is restrained.

### f1-neon-harbor — Fogline · Neon Harbor
- Combine `shared/ref/inspiration-neon-harbor.png` with Afterglow's site.
- Hero: a night city across still harbour water. Slender glass supertalls with crisp vertical edge light, in Afterglow's aurora colours (cyan and violet edges, and the photo's magenta reinterpreted as Afterglow violet-rose), against a deep-blue star field.
- Warm amber lights along the waterline. Long glossy vertical reflections in the water.
- Windows light up as you scroll (Nocturne's signature).
- Shooting stars, comet cursor, underline meteor, Afterglow serif shell.
- Mature and restrained: no cyberpunk kitsch, no saturated glow soup. Cache the skyline and glow sprites.
- The water fades into the page background. This is the transition.
- Light mode: pale blue-hour dawn, silver towers, soft pink-gold reflections.

### f2-monolith — Fogline · Monolith
- Fogline's monochrome luxury, ironed out. A refined geometric grotesk with a mono metadata column, outlined CTAs and lots of air, as in round 2's inspiration image.
- A few architecturally credible towers rise from a dense sea of fog, with rose light only on the spires.
- On scroll, the fog sea sinks and thins (cached fog layers translate down and fade), revealing the full height of the towers. Windows light floor by floor from the fog line upward, then the towers settle as the page continues. Contour's "reveal more as you scroll" applied to fog.
- Pristine type and spacing. The fog itself becomes the page background. This is the transition.
- Light mode: bright white-grey morning, as in the original reference.

### f3-elevation — Fogline · Elevation
- The city drawn as an architect's elevation drawing: fine hairline outlines of towers with floor lines, setbacks, spires and mullion rhythm. It's Contour's line-art coolness for the city.
- The lines are in Afterglow's aurora colours on ink (light mode: graphite and blue-violet on drafting paper).
- Lines draw in on load.
- On scroll, floors "light" as small warm points or filled bays, rising tower by tower.
- Faint horizontal fog bands of fine hatching.
- Contour's row-parallax reveal across 3 depth rows of buildings.
- The Afterglow shell, without the grid-lines-everywhere chrome.
- Proof numbers as elevation callouts (e.g. "+30 SHIPPED" at a tower's crown) with collision avoidance.

### f4-skyward — Fogline · Skyward
- A scroll-driven ascent, using cached layers and transforms only. The hero is pinned for roughly 1.5 viewports.
- It starts at the base of Midtown in the fog line: warm street haze and lit lower floors.
- As the user scrolls, the camera rises: foreground towers slide down past the viewport, fog layers pass, windows light upward. The view ends above a cloud sea where only spires and crowns pierce through under the aurora and stars, the Fogline reference moment.
- Then the cloud sea becomes the page background and content begins. This is the transition.
- Afterglow shell, comet cursor, shooting stars.
- Must remain readable and usable: the headline is visible at the start, scroll hints are clear, and there is no scroll-jacking (native scroll; the ascent is driven by scroll position).
- Reduced motion: show the final above-the-clouds frame statically.

## Status
| id | folder | builder | status |
|---|---|---|---|
| a0 | a0-afterglow | sonnet | approved (perf PASS p95 25ms, taskMs ~710 vs 4907 before) |
| a1 | a1-mirror | sonnet | approved (1 fix round) |
| a2 | a2-gallery | sonnet | approved (2 fix rounds) |
| a3 | a3-horizon | sonnet | approved (2 fix rounds; clock-pill nit pending) |
| c1 | c1-aurora-contour | sonnet | approved (1 nit round; dark p95 marginal 33.6 under load) |
| c2 | c2-ridgeline | sonnet | approved (2 rounds; leader nit pending) |
| c3 | c3-engraved | sonnet | approved (1 fix round; perf PASS p95 25ms) |
| f1 | f1-neon-harbor | sonnet | approved (first pass) |
| f2 | f2-monolith | sonnet | approved (1 fix round; perf PASS p95 9ms) |
| f3 | f3-elevation | sonnet | approved (1 fix round; 8+ label nit pending) |
| f4 | f4-skyward | sonnet | approved (1 fix round; mid-ascent still the soft spot) |
| hub | ROUND3 registry, round 3 default, `?round=2` / `?round=1` | orchestrator | done (thumbnails appear once _review/<folder> exists) |

Resume notes:
- If agent context is lost, launch a fresh Sonnet agent with the per-variant prompt (below) and tell it to continue the existing folder.
- The orchestrator reviews `_review/<folder>/*.png` and the perf JSON, then sends fix rounds via SendMessage.

Per-variant prompt template: "You are building design variant `<folder>` for Ricky Martin's portfolio showcase. Read `design-showcase/shared/ROUND3.md` fully (shared contract, performance contract, transition contract, and your variant brief), `design-showcase/shared/CONTENT.md`, `design-showcase/shared/bridge.js`, the reference folders it names, and `.claude/skills/impeccable/reference/craft-floor.md`. Write only inside `design-showcase/<folder>/` (and `design-showcase/_scratch/<folder>/` for temp files). If the folder already has work, continue it rather than restarting. Verify with shoot.mjs and perf.mjs as described, and iterate until it is genuinely polished and passes. Reply briefly as the brief specifies."
