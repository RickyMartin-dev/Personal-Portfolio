/* Aurora Lines: logo registry + renderer.
   window.RM_LOGOS = [{ id, name, family, svg, vb?, box?, wide?, text?, draw? }]
   - svg: inner SVG markup in a 0 0 32 32 viewBox (vb overrides). Colours: currentColor, var(--crest), var(--accent), var(--av1..6).
   - wide: the mark carries the name itself (the separate name span is hidden).
   - draw: contains .dr paths that animate stroke-dashoffset when logo.anim = 'draw'.
   window.RMLogos = { list, get, markup, render }. Inline per-page SVG is only the no-JS fallback. */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  var C = 'currentColor', CR = 'var(--crest)', ACC = 'var(--accent)', GR = 'var(--ground)';
  var DISPLAY = 'font-family:var(--font-display),Georgia,serif';
  var MONO = 'font-family:var(--font-mono),ui-monospace,Menlo,monospace';
  var BODY = 'font-family:var(--font-body),Helvetica,Arial,sans-serif';
  function r(n) { return Math.round(n * 100) / 100; }
  function G(sw, inner, extra) { return '<g fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + inner + '</g>'; }
  function lineP(a, b, n) { var o = [], i, t; for (i = 0; i <= n; i++) { t = i / n; o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } return o; }
  function arcP(c, rad, a0, a1, n) { var o = [], i, a; for (i = 0; i <= n; i++) { a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([c[0] + rad * Math.cos(a), c[1] + rad * Math.sin(a)]); } return o; }
  /* filled, variable-width "ink" outline following a polyline */
  function ink(pts, wfn, seed) {
    var L = [], R = [], n = pts.length, i, p, q, p0, dx, dy, l, nx, ny, t, half, dr, cx, cy;
    for (i = 0; i < n; i++) {
      p = pts[i]; q = pts[Math.min(i + 1, n - 1)]; p0 = pts[Math.max(i - 1, 0)];
      dx = q[0] - p0[0]; dy = q[1] - p0[1]; l = Math.sqrt(dx * dx + dy * dy) || 1; nx = -dy / l; ny = dx / l; t = i / (n - 1);
      half = wfn(t) * (1 + 0.07 * Math.sin(t * 9 + seed) + 0.035 * Math.sin(t * 19 + seed * 2)) / 2;
      dr = 0.12 * Math.sin(t * 4.5 + seed); cx = p[0] + nx * dr; cy = p[1] + ny * dr;
      L.push([cx + nx * half, cy + ny * half, half]); R.push([cx - nx * half, cy - ny * half, half]);
    }
    var d = 'M' + r(L[0][0]) + ' ' + r(L[0][1]), k;
    for (k = 1; k < n; k++) d += 'L' + r(L[k][0]) + ' ' + r(L[k][1]);
    d += 'A' + r(L[n - 1][2]) + ' ' + r(L[n - 1][2]) + ' 0 0 0 ' + r(R[n - 1][0]) + ' ' + r(R[n - 1][1]);
    for (k = n - 2; k >= 0; k--) d += 'L' + r(R[k][0]) + ' ' + r(R[k][1]);
    d += 'A' + r(L[0][2]) + ' ' + r(L[0][2]) + ' 0 0 0 ' + r(L[0][0]) + ' ' + r(L[0][1]) + 'Z';
    return d;
  }

  /* ---------- Signature geometry (owner's sketch): one circle broken into two arcs, two parallel
     lines passing through the breaks; nothing touches. 180 degree symmetric about 16,16.
     Lines run at -37deg (rising left to right), offset +-2.4 from centre; circle r=10 with
     30deg clearance either side of where each line crosses it (157deg and 337deg). */
  var S1 = [[2.96, 22.8], [17.36, 11.98]], S2 = [[14.64, 20.02], [29.04, 9.2]];
  var A1 = { c: [16, 16], r: 10, a0: 187, a1: 307 }, A2 = { c: [16, 16], r: 10, a0: 7, a1: 127 };
  function pt(a) { var f = function (x) { return a.c[0] + a.r * Math.cos(x * Math.PI / 180); }, g = function (x) { return a.c[1] + a.r * Math.sin(x * Math.PI / 180); }; return [f(a.a0), g(a.a0), f(a.a1), g(a.a1)]; }
  function arcD(a, rad) { var p = pt(a), q = rad || a.r; return 'M' + r(p[0]) + ' ' + r(p[1]) + 'A' + q + ' ' + q + ' 0 0 1 ' + r(p[2]) + ' ' + r(p[3]); }
  function slD(s) { return 'M' + s[0][0] + ' ' + s[0][1] + 'L' + s[1][0] + ' ' + s[1][1]; }
  function sigStroke(sw, o) {
    o = o || {};
    var sl = o.slash || C, ar = o.arc || C, ex = o.extra || '';
    return '<g fill="none" stroke-width="' + sw + '" stroke-linecap="' + (o.cap || 'round') + '" stroke-linejoin="round">' +
      '<path ' + (o.dr ? 'class="dr" pathLength="1" style="--i:0" ' : '') + 'stroke="' + ar + '" d="' + arcD(A1) + '"' + ex + '/>' +
      '<path ' + (o.dr ? 'class="dr" pathLength="1" style="--i:2" ' : '') + 'stroke="' + sl + '" d="' + slD(S1) + '"' + ex + '/>' +
      '<path ' + (o.dr ? 'class="dr" pathLength="1" style="--i:3" ' : '') + 'stroke="' + sl + '" d="' + slD(S2) + '"' + ex + '/>' +
      '<path ' + (o.dr ? 'class="dr" pathLength="1" style="--i:1" ' : '') + 'stroke="' + ar + '" d="' + arcD(A2) + '"' + ex + '/></g>';
  }
  function sigInk(fill) {
    var f = fill || C;
    var sw = function (t) { return 2.9 * (0.66 + 0.34 * Math.sin(Math.PI * (0.12 + 0.82 * t))); };
    var aw = function (t) { return 2.5 * (0.5 + 0.5 * Math.sin(Math.PI * Math.pow(t, 0.8))) + 0.4; };
    return '<g fill="' + f + '">' +
      '<path d="' + ink(arcP(A1.c, A1.r, A1.a0, A1.a1, 30), aw, 1.3) + '"/>' +
      '<path d="' + ink(lineP(S1[0], S1[1], 26), sw, 2.1) + '"/>' +
      '<path d="' + ink(lineP(S2[0], S2[1], 26), sw, 3.7) + '"/>' +
      '<path d="' + ink(arcP(A2.c, A2.r, A2.a0, A2.a1, 30), aw, 4.4) + '"/></g>';
  }
  function sigGeo() {
    /* same geometry, square caps and a precise even stroke */
    return '<g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="butt" stroke-linejoin="miter">' +
      '<path d="' + arcD(A1) + '"/><path d="' + slD(S1) + '"/><path d="' + slD(S2) + '"/><path d="' + arcD(A2) + '"/></g>';
  }
  function scaled(inner, k) { return '<g transform="translate(16 16) scale(' + k + ') translate(-16 -16)">' + inner + '</g>'; }

  /* ---------- registry ---------- */
  var L = [];
  function add(family, id, name, svg, o) { var e = { id: id, name: name, family: family, svg: svg }; if (o) for (var k in o) e[k] = o[k]; L.push(e); }
  var F = 'Signature';

  add(F, 'sig-faithful', 'Faithful', sigStroke(2.3));
  add(F, 'sig-ink', 'Hand-drawn ink', sigInk());
  add(F, 'sig-geo', 'Geometric', sigGeo());
  add(F, 'sig-bold', 'Bold', sigStroke(3.6));
  add(F, 'sig-hair', 'Hairline', sigStroke(1.05));
  add(F, 'sig-split', 'Accent split', sigStroke(2.3, { slash: CR }));
  add(F, 'sig-badge', 'Circle badge', '<circle cx="16" cy="16" r="14.6" fill="none" stroke="currentColor" stroke-width="1.2"/>' + scaled(sigStroke(2.9, { slash: C }), 0.6));
  add(F, 'sig-tile', 'Rounded tile', '<rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="currentColor"/>' + scaled(sigStroke(2.6, { slash: GR, arc: GR }), 0.76));
  add(F, 'sig-draw', 'Draw-on', sigStroke(2.3, { dr: true }), { draw: true });
  add(F, 'sig-aurora', 'Aurora gradient', sigStroke(2.4, { slash: 'url(#ga-{u})', arc: 'url(#ga-{u})' }) +
    '<defs><linearGradient id="ga-{u}" gradientUnits="userSpaceOnUse" x1="3" y1="29" x2="29" y2="3"><stop offset="0" style="stop-color:color-mix(in srgb,var(--av2) 62%,var(--text))"/><stop offset=".5" style="stop-color:color-mix(in srgb,var(--av5) 70%,var(--text))"/><stop offset="1" style="stop-color:var(--crest)"/></linearGradient></defs>');
  add(F, 'sig-ink-split', 'Ink, accent slashes', (function () {
    var sw = function (t) { return 2.9 * (0.66 + 0.34 * Math.sin(Math.PI * (0.12 + 0.82 * t))); };
    var aw = function (t) { return 2.5 * (0.5 + 0.5 * Math.sin(Math.PI * Math.pow(t, 0.8))) + 0.4; };
    return '<path fill="currentColor" d="' + ink(arcP(A1.c, A1.r, A1.a0, A1.a1, 30), aw, 1.3) + '"/><path fill="var(--crest)" d="' + ink(lineP(S1[0], S1[1], 26), sw, 2.1) + '"/><path fill="var(--crest)" d="' + ink(lineP(S2[0], S2[1], 26), sw, 3.7) + '"/><path fill="currentColor" d="' + ink(arcP(A2.c, A2.r, A2.a0, A2.a1, 30), aw, 4.4) + '"/>';
  })());

  /* Mountains */
  F = 'Mountains';
  add(F, 'peak', 'Peak', '<path d="M1.5 21.5 11 8l4.5 6.2L20 6l10.5 15.5z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M26 3v5M23.5 5.5h5" stroke="var(--accent)" stroke-width="1.3" stroke-linecap="round"/>', { vb: [32, 24], box: [32, 24] });
  add(F, 'ridge', 'Ridge lines', '<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="hv" d="M1.5 12 7 7.2l3.4 3.1L16 2.6l5.4 6.8 3-2.5 5.1 5" stroke="var(--accent)" stroke-width="1.6"/><path d="M1.5 16.2 7 11.6l3.4 2.9L16 8l5.4 6.2 3-2.1 5.1 4" stroke="currentColor" stroke-width="1.15" opacity=".85"/><path d="M1.5 20.4 7 16.2l3.4 2.6L16 13.4l5.4 5.4 3-1.8 5.1 3.4" stroke="currentColor" stroke-width="1" opacity=".5"/></g>', { vb: [32, 24], box: [32, 24] });
  add(F, 'mt-contour', 'Contour peaks', G(1.5, '<path d="M3 26 16 5.5 29 26"/><path d="M8 26 16 13.5 24 26" opacity=".7"/><path d="M12.8 26 16 21 19.2 26" opacity=".45"/>'));
  add(F, 'mt-summit', 'Summit line', G(1.7, '<path class="dr" pathLength="1" d="M2.5 25 12 12.5l5 6.5 5.5-11L29.5 25"/>') + '<circle cx="22.5" cy="3.6" r="1.7" fill="var(--crest)"/>', { draw: true });
  add(F, 'mt-triple', 'Triple ridge', G(1.5, '<path d="M2 12.5 8 7.5l4 3.5 6-7.5 5.5 7 2.5-2.2 4 4.7" stroke="var(--crest)"/><path d="M2 18.5 8 13.5l4 3.5 6-7.5 5.5 7 2.5-2.2 4 4.7" opacity=".85"/><path d="M2 24.5 8 19.5l4 3.5 6-7.5 5.5 7 2.5-2.2 4 4.7" opacity=".5"/>'));
  add(F, 'mt-sunrise', 'Sunrise over peak', G(1.6, '<path d="M2.5 26 12.5 11.5l6 8.5 3-4 7.5 10z"/>') + '<circle cx="24.5" cy="8" r="3.3" fill="var(--crest)"/>');
  add(F, 'mt-twin', 'Twin summits', '<path d="M2.5 26 12 8l8 14 4-7 5.5 11z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>');
  add(F, 'mt-aurora', 'Peak under aurora', G(1.6, '<path d="M4 27 16 13l12 14"/>') + G(1.4, '<path d="M6 10Q16 1.5 26 10" stroke="var(--crest)"/><path d="M10 13.5Q16 8.5 22 13.5" opacity=".7"/>'));
  add(F, 'mt-facet', 'Faceted peak', '<path d="M16 5 29 26H18l-5-9z" fill="currentColor" fill-opacity=".22"/><path d="M3 26 16 5l13 21zM16 5l-3 12 5 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>');

  /* Monograms */
  F = 'Monograms';
  add(F, 'serif', 'Serif R', '<text x="14" y="21" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:27px">R</text><circle cx="26" cy="19.6" r="1.5" fill="var(--accent)"/>', { vb: [32, 24], box: [32, 24] });
  add(F, 'monogram', 'RM frame', '<rect x="1.5" y="1.5" width="29" height="21" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.2"/><text x="16" y="17.2" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:15.5px;letter-spacing:-0.02em">RM</text><path class="hv" d="M21 1.5h6" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>', { vb: [32, 24], box: [32, 24] });
  add(F, 'mono-serif', 'RM serif', '<text x="16" y="23" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:21px;letter-spacing:-0.03em">RM</text><path d="M7 27.5h18" stroke="var(--crest)" stroke-width="1.3" stroke-linecap="round"/>');
  add(F, 'mono-geo', 'RM geometric', G(2.1, '<path d="M4.5 25.5V7h6.3a4.7 4.7 0 0 1 0 9.4H4.5M10.5 16.4l5.2 9.1"/><path d="M18.5 25.5V7l4.8 9.2L28 7v18.5"/>', ' stroke-linejoin="miter" stroke-linecap="butt"'));
  add(F, 'mono-stencil', 'RM stencil', G(2.5, '<path d="M5 25.5V7.5M8.5 7h3a4.6 4.6 0 0 1 0 9.2h-3M12 18.8l3.6 6.7"/><path d="M19.5 25.5V7.5M21.3 8.7l2.7 7M25.7 16.4 28.5 8.7M28.3 11v14.5"/>', ' stroke-linecap="butt"'));
  add(F, 'mono-script', 'RM italic', '<text x="16" y="23" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-style:italic;font-size:23px;letter-spacing:-0.04em">Rm</text><path d="M4.5 27c7-3 16-3 23-.5" fill="none" stroke="var(--crest)" stroke-width="1.3" stroke-linecap="round"/>');
  add(F, 'mono-slash', 'R / M', '<text x="8.2" y="22" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:21px">R</text><text x="24" y="22" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:21px">M</text><path d="M16.8 27 15.2 5" stroke="var(--crest)" stroke-width="1.5" stroke-linecap="round" transform="rotate(18 16 16)"/>');
  add(F, 'mono-stacked', 'R over M', '<text x="16" y="14.6" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:15px">R</text><text x="16" y="28.5" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:15px">M</text><path d="M9 17.2h14" stroke="var(--crest)" stroke-width="1.2" stroke-linecap="round"/>');
  add(F, 'mono-ligature', 'RM one stroke', G(2, '<path class="dr" pathLength="1" d="M5 26V7h6a4.6 4.6 0 0 1 0 9.2H5M10.6 16.2 16 26V7l6 10.5L28 7v19"/>'), { draw: true });

  /* Lines */
  F = 'Lines';
  add(F, 'ribbon', 'Ribbon RM', '<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 21V3.5h6a4.6 4.6 0 0 1 0 9.2h-6M9 12.7l5.2 8.3M18 21V3.5l6 10 6-10V21" stroke="var(--accent)" stroke-width="4.6" opacity=".2"/><path d="M3.5 21V3.5h6a4.6 4.6 0 0 1 0 9.2h-6M9 12.7l5.2 8.3M18 21V3.5l6 10 6-10V21" stroke="currentColor" stroke-width="1.6"/></g>', { vb: [32, 24], box: [32, 24] });
  add(F, 'ln-waves', 'Aurora waves', G(1.6, '<path class="dr" pathLength="1" style="--i:0" d="M2 10C8 3.5 12.5 3.5 16 10s8 6.5 14 0" stroke="var(--crest)"/><path class="dr" pathLength="1" style="--i:1" d="M2 17C8 10.5 12.5 10.5 16 17s8 6.5 14 0"/><path class="dr" pathLength="1" style="--i:2" d="M2 24C8 17.5 12.5 17.5 16 24s8 6.5 14 0" opacity=".55"/>'), { draw: true });
  add(F, 'ln-arcs', 'Aurora fan', G(1.6, '<path d="M4 27C6 15 15 7 28 5" stroke="var(--crest)"/><path d="M4 27C8 19 15 14 28 13"/><path d="M4 27C9 23 16 21 28 21" opacity=".55"/>') + '<circle cx="4" cy="27" r="1.8" fill="var(--crest)"/>');
  add(F, 'ln-spark', 'Sparkline', G(1.7, '<path class="dr" pathLength="1" d="M2.5 23 8 17.5l5 3.5 6-11 5 4 5.5-8"/>') + '<circle cx="29.5" cy="6.5" r="2" fill="var(--crest)"/><path d="M2.5 28.5h27" stroke="currentColor" stroke-width="1" opacity=".3"/>', { draw: true });
  add(F, 'ln-graph', 'Node graph', G(1.4, '<path d="M7 22 14 9.5 25 19.5M14 9.5 26 7M7 22 25 19.5"/>') + '<circle cx="7" cy="22" r="2.6" fill="currentColor"/><circle cx="14" cy="9.5" r="2.6" fill="var(--crest)"/><circle cx="25" cy="19.5" r="2.6" fill="currentColor"/><circle cx="26" cy="7" r="1.8" fill="currentColor" fill-opacity=".6"/>');
  add(F, 'ln-prompt', 'Prompt >_', G(2.2, '<path class="dr" pathLength="1" d="M5.5 8.5 14.5 16l-9 7.5"/>') + '<path d="M17 25h10" stroke="var(--crest)" stroke-width="2.4" stroke-linecap="round"/>', { draw: true });
  add(F, 'ln-prompt-rm', 'Prompt rm_', G(1.9, '<path d="M4 9.5 11 16l-7 6.5"/>') + '<text x="14" y="22" fill="currentColor" style="' + MONO + ';font-size:15px;font-weight:500;letter-spacing:-0.05em">rm</text><path d="M34 24.5h7" stroke="var(--crest)" stroke-width="2.2" stroke-linecap="round"/>', { wide: true, vb: [44, 32], box: [41, 30] });
  add(F, 'ln-pulse', 'Signal pulse', G(1.7, '<path class="dr" pathLength="1" d="M2 17h7l3-8 5 16 4-12 2 4h9"/>') + '<circle cx="30" cy="17" r="1.8" fill="var(--crest)"/>', { draw: true });
  add(F, 'ln-braid', 'Rising lines', G(1.6, '<path d="M3 18C12 18 14 4 29 4" stroke="var(--crest)"/><path d="M3 23C12 23 14 9 29 9" opacity=".8"/><path d="M3 28C12 28 14 14 29 14" opacity=".5"/>'));

  /* Badges */
  F = 'Badges';
  add(F, 'bd-seal', 'Circle seal', '<circle cx="16" cy="16" r="14.6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="16" cy="16" r="11.4" fill="none" stroke="currentColor" stroke-width=".8" opacity=".35"/><text x="16" y="20.4" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:13px;letter-spacing:-0.02em">RM</text><circle cx="16" cy="1.9" r="1.5" fill="var(--crest)"/>');
  add(F, 'bd-hex', 'Hexagon', '<path d="M16 2.5 27.7 9.2v13.6L16 29.5 4.3 22.8V9.2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><text x="16" y="20.5" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:13px;letter-spacing:-0.02em">RM</text><path d="M11 25.5h10" stroke="var(--crest)" stroke-width="1.3" stroke-linecap="round"/>');
  add(F, 'bd-square', 'Square tile', '<rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="currentColor"/><text x="16" y="21" text-anchor="middle" style="' + DISPLAY + ';font-size:16px;letter-spacing:-0.03em;fill:var(--ground)">RM</text>');
  add(F, 'bd-pill', 'Pill', '<rect x="1.5" y="5.5" width="45" height="21" rx="10.5" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12.5" cy="16" r="2.4" fill="var(--crest)"/><text x="31" y="20.6" text-anchor="middle" fill="currentColor" style="' + DISPLAY + ';font-size:14px;letter-spacing:-0.01em">RM</text>', { wide: true, vb: [48, 32], box: [45, 30] });
  add(F, 'bd-peak', 'Peak medallion', '<circle cx="16" cy="16" r="14.6" fill="none" stroke="currentColor" stroke-width="1.3"/>' + G(1.5, '<path d="M7 23 13 14l3.5 4.5 3-4.5L25 23"/>') + '<circle cx="21.5" cy="9.5" r="2.1" fill="var(--crest)"/>');

  /* Wordmarks (wide: text carries the name) */
  F = 'Wordmarks';
  add(F, 'wordmark', 'Italic name + slash', '', { text: true });
  add(F, 'wm-serif-slash', 'Serif, slash accent', '<text x="1" y="22" fill="currentColor" style="' + DISPLAY + ';font-style:italic;font-size:21px;letter-spacing:-0.02em">Ricky<tspan fill="var(--crest)" style="font-style:normal">/</tspan>Martin</text>', { wide: true, vb: [102, 32], box: [95, 30] });
  add(F, 'wm-mono', 'ricky.martin', '<text x="1" y="21" fill="currentColor" style="' + MONO + ';font-size:15px;letter-spacing:-0.04em">ricky<tspan fill="var(--crest)">.</tspan>martin</text>', { wide: true, vb: [106, 32], box: [99, 30] });
  add(F, 'wm-caps', 'Spaced small caps', '<text x="1" y="20.5" fill="currentColor" style="' + BODY + ';font-size:11.5px;font-weight:600;letter-spacing:.3em">RICKY MARTIN</text><path d="M1 25.5h14" stroke="var(--crest)" stroke-width="1.4" stroke-linecap="round"/>', { wide: true, vb: [124, 32], box: [116, 30] });
  add(F, 'wm-underline', 'Name + aurora rule', '<text x="1" y="21" fill="currentColor" style="' + DISPLAY + ';font-size:23px;letter-spacing:-0.02em">Ricky Martin</text><rect x="1" y="25.5" width="106" height="2" rx="1" fill="url(#gw-{u})"/><defs><linearGradient id="gw-{u}" gradientUnits="userSpaceOnUse" x1="1" y1="0" x2="107" y2="0"><stop offset="0" style="stop-color:color-mix(in srgb,var(--av2) 62%,var(--text))"/><stop offset=".55" style="stop-color:color-mix(in srgb,var(--av5) 70%,var(--text))"/><stop offset="1" style="stop-color:var(--crest)"/></linearGradient></defs>', { wide: true, vb: [112, 32], box: [105, 30] });
  add(F, 'wm-stack', 'Stacked name', '<text x="1" y="16" fill="currentColor" style="' + DISPLAY + ';font-size:19px;letter-spacing:-0.02em">Ricky</text><text x="1.5" y="27.5" fill="currentColor" style="' + BODY + ';font-size:8.5px;font-weight:600;letter-spacing:.34em">MARTIN</text><path d="M44 12.5 52 4" stroke="var(--crest)" stroke-width="1.5" stroke-linecap="round"/>', { wide: true, vb: [56, 32], box: [52, 30] });

  window.RM_LOGOS = L;

  /* ---------- renderer ---------- */
  var byId = {}; L.forEach(function (e) { byId[e.id] = e; });
  var uidN = 0;
  function get(id) { return byId[id] || byId.peak; }
  function dims(e) {
    var vb = e.vb || [32, 32], box = e.box || [vb[0] * 30 / 32, vb[1] * 30 / 32];
    return { vb: vb, box: box };
  }
  /* markup(entry, {uid, color:'text'|'crest'|'accent'|'aurora', cls, size}) -> full <svg> string */
  function markup(e, o) {
    o = o || {}; var d = dims(e), u = o.uid || ('m' + (++uidN)), inner = e.svg.replace(/\{u\}/g, u), col = o.color || 'text', st = '';
    var ga = '<defs><linearGradient id="lg-aur-' + u + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + d.vb[1] + '" x2="' + d.vb[0] + '" y2="0"><stop offset="0" style="stop-color:color-mix(in srgb,var(--av2) 62%,var(--text))"/><stop offset=".5" style="stop-color:color-mix(in srgb,var(--av5) 70%,var(--text))"/><stop offset="1" style="stop-color:var(--crest)"/></linearGradient></defs>';
    if (col === 'aurora') inner = inner.replace(/(stroke|fill)="currentColor"/g, '$1="url(#lg-aur-' + u + ')"') + ga;
    else if (col === 'crest') st = 'color:var(--crest);';
    else if (col === 'accent') st = 'color:var(--accent-text);';
    if (o.size) st += 'width:' + r(d.box[0] * o.size) + 'px;height:' + r(d.box[1] * o.size) + 'px;';
    else st += '--lw:' + r(d.box[0]) + ';--lh:' + r(d.box[1]) + ';';
    return '<svg class="lg-mark' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + d.vb[0] + ' ' + d.vb[1] + '" aria-hidden="true" focusable="false" style="' + st + '">' + inner + '</svg>';
  }

  var cur = null, sig = '';
  function render(logo) {
    if (logo) cur = logo;
    var brand = document.querySelector('.brand');
    if (!brand || !cur) return;
    var e = get(cur.mark), col = cur.color || 'text', s = e.id + '|' + col;
    if (s === sig && (e.text || brand.querySelector('.lg-mark'))) return;
    sig = s;
    var old = brand.querySelector('.lg-mark'); if (old) old.remove();
    brand.classList.toggle('lg-wide', !!e.wide);
    brand.classList.toggle('lg-text', !!e.text);
    if (!e.text) { var t = document.createElement('div'); t.innerHTML = markup(e, { uid: 'brand', color: col }); brand.insertBefore(t.firstChild, brand.firstChild); }
  }
  if (!window.__rmLogoHover) {
    window.__rmLogoHover = 1;
    document.addEventListener('mouseover', function (ev) {
      var b = ev.target.closest && ev.target.closest('.brand');
      if (!b || b.contains(ev.relatedTarget) || document.documentElement.getAttribute('data-logo-anim') !== 'draw') return;
      b.querySelectorAll('.dr').forEach(function (p) { p.style.animation = 'none'; void p.getBoundingClientRect(); p.style.animation = ''; });
    });
  }
  document.addEventListener('DOMContentLoaded', function () { render(); });

  window.RMLogos = { list: L, get: get, markup: markup, render: render, dims: dims };
})();
