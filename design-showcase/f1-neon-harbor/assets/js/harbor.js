/* Neon Harbor: a night city across still water. Everything static is baked once (sky, skyline, windows, reflections);
   scroll only writes transform/opacity on a few layers; the rAF loop runs only while a shooting star is in flight. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var compact = hero.classList.contains('compact');
  var q = function (s) { return hero.querySelector(s); };
  var cSky = q('#sky'), cCity = q('#city'), cA = q('#winA'), cB = q('#winB'), cGl = q('#glint'), cFx = q('#fx');
  var lySky = q('.lyr-sky'), lyCity = q('.lyr-city'), glints = q('.glints'), alts = q('.alts');
  var harbor = q('.harbor'), wref = q('.water-ref'), twBox = q('.tw'), bcBox = q('.beacons');
  var header = document.querySelector('.site-header');
  var fx = cFx.getContext('2d');

  var W = 0, H = 0, dpr = 1, horizon = 0, waterH = 0, lowZone = 0, capL = 0, capMax = 0, sc = 1;
  var dark = true, P = null, ground = '#12131f';
  var heroes = [];
  var scrollMax = 1;

  /* ---------- helpers ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function rgba(rgb, a) { return 'rgba(' + rgb + ',' + a + ')'; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function glow(g, x, y, rx, ry, rgb, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, rgba(rgb, a)); gr.addColorStop(0.45, rgba(rgb, a * 0.38)); gr.addColorStop(1, rgba(rgb, 0));
    g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
  }

  /* ---------- palettes ---------- */
  var PAL = {
    dark: {
      sky: [[0, '#050818'], [0.36, '#0a1238'], [0.7, '#162663'], [1, '#2a3489']],
      glows: [['159,123,255', 0.5, 0.68], ['93,199,255', 0.34, 0.5], ['255,138,190', 0.2, 0.84]],
      aurora: ['93,199,255', '159,123,255'], auroraA: 0.07, stars: true,
      water: [[0, '#1c2c78'], [0.3, '#101a52'], [0.65, '#0c1236']],
      rows: [
        { top: '#1d2f78', bot: '#17275f', ea: 0.34, win: 0.4, wa: 0.5 },
        { top: '#101c58', bot: '#0b1442', ea: 0.72, win: 0.62, wa: 0.78 },
        { top: '#0a1134', bot: '#070b24', ea: 1, win: 0.8, wa: 0.95 }
      ],
      haze: '52,82,190', hazeA: [0.5, 0.26, 0.12],
      edge: ['93,199,255', '170,130,255', '255,140,190', '93,199,255'], shade: '0,0,10', shadeA: 0.4, mull: 'rgba(160,190,255,0.05)',
      win: [['255,213,150', 0.5], ['255,213,150', 0.5], ['196,230,255', 0.2], ['120,220,255', 0.12], ['255,152,206', 0.08]],
      tint: 'rgba(8,14,56,0.34)', refl: 0.82, quay: '255,196,112', crown: '255,150,205', glintCols: ['150,210,255', '190,160,255', '255,205,150']
    },
    light: {
      sky: [[0, '#a6b8e8'], [0.4, '#c9cff1'], [0.76, '#ecd6ee'], [1, '#ffdcc4']],
      glows: [['255,190,150', 0.55, 0.78], ['255,160,200', 0.3, 0.55], ['190,205,255', 0.35, 0.3]],
      aurora: [], auroraA: 0, stars: false,
      water: [[0, '#f3d6d6'], [0.3, '#e2d8ee'], [0.65, '#ece6f4']],
      rows: [
        { top: '#c3cdea', bot: '#e3dff1', ea: 0.45, win: 0.3, wa: 0.45 },
        { top: '#9facd6', bot: '#cdd0e8', ea: 0.8, win: 0.42, wa: 0.65 },
        { top: '#7b8bbd', bot: '#a8aed2', ea: 1, win: 0.55, wa: 0.85 }
      ],
      haze: '255,226,224', hazeA: [0.6, 0.38, 0.18],
      edge: ['255,255,255', '175,150,245', '255,170,190', '120,200,240'], shade: '60,70,130', shadeA: 0.22, mull: 'rgba(255,255,255,0.12)',
      win: [['255,176,110', 0.62], ['255,255,255', 0.7], ['255,255,255', 0.5], ['255,160,175', 0.4], ['255,190,120', 0.5]],
      tint: 'rgba(255,238,244,0.3)', refl: 0.6, quay: '255,176,100', crown: '255,150,160', glintCols: ['255,255,255', '255,222,214', '220,225,255']
    }
  };

  /* ---------- layout / canvases ---------- */
  function cap(x) {
    if (W < 900) return capL;
    var u = x / W;
    return capL + (capMax - capL) * smooth((u - 0.4) / 0.3);
  }
  function setup(c, w, h) {
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
    var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    return g;
  }

  function drawSky(g, rnd) {
    var gr = g.createLinearGradient(0, 0, 0, horizon);
    P.sky.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, W, horizon + 2);
    g.fillStyle = P.sky[P.sky.length - 1][1]; g.fillRect(0, horizon, W, H - horizon);
    if (P.auroraA) {
      for (var j = 0; j < 2; j++) {
        var by = horizon * (0.22 + 0.17 * j), amp = horizon * 0.05;
        for (var i = 0; i <= 26; i++) {
          var u = i / 26, x = u * W * 1.1 - W * 0.05;
          var y = by + Math.sin(u * 5.2 + j * 2.1) * amp + Math.sin(u * 11 + j) * amp * 0.3;
          var env = Math.sin(Math.PI * clamp01(u)) * (0.4 + 0.6 * u);
          glow(g, x, y, W * 0.085, horizon * 0.08, P.aurora[j % P.aurora.length], P.auroraA * env * (j ? 0.8 : 1));
        }
      }
    }
    P.glows.forEach(function (gl) { glow(g, W * gl[2], horizon * 0.98, W * 0.5, horizon * 0.34, gl[0], gl[1]); });
    if (!dark) {
      glow(g, W * 0.3, horizon * 0.46, W * 0.3, horizon * 0.09, '255,255,255', 0.35);
      glow(g, W * 0.75, horizon * 0.3, W * 0.28, horizon * 0.07, '255,236,240', 0.4);
    }
    if (P.stars) {
      var n = Math.min(300, Math.round(W * horizon / 4200));
      for (var k = 0; k < n; k++) {
        var sy = Math.pow(rnd(), 1.5) * horizon * 0.94, sx = rnd() * W;
        var fade = 1 - sy / horizon * 0.55, d = rnd(), s = d < 0.72 ? 0.7 : d < 0.95 ? 1.1 : 1.7;
        g.fillStyle = 'rgba(' + (rnd() < 0.2 ? '190,215,255' : '236,241,255') + ',' + ((d < 0.72 ? 0.4 : 0.75) * fade).toFixed(2) + ')';
        g.fillRect(sx, sy, s, s);
        if (d > 0.97) glow(g, sx + s / 2, sy + s / 2, 9, 9, '170,200,255', 0.22);
      }
    }
  }

  /* ----- buildings ----- */
  function pickKind(rnd, b, hero) {
    var r = rnd();
    if (hero) return hero;
    if (b.h > capMax * 0.62 && b.w < 80 && r < 0.2) return 'spire';
    return r < 0.34 ? 'slab' : r < 0.52 ? 'setback' : r < 0.82 ? 'taper' : r < 0.92 ? 'crown' : 'blade';
  }
  function genRow(rnd, spec) {
    var out = [], x = -spec.w1 * 0.6;
    while (x < W + 10) {
      var w = (spec.w0 + rnd() * (spec.w1 - spec.w0)) * sc;
      var cx = x + w / 2, c = cap(cx);
      var h = Math.max(spec.hMin * sc, c * (spec.h0 + rnd() * (spec.h1 - spec.h0)));
      var b = { x: x, w: w, h: h, cx: cx, edge: Math.floor(rnd() * 4), hero: false };
      b.kind = pickKind(rnd, b);
      out.push(b);
      x += w * (0.7 + rnd() * 0.65);
    }
    return out;
  }
  function heroRows() {
    var m = W < 900;
    function H1(u, w, hf, kind, edge, tag) { return { x: u * W - w * sc / 2, w: w * sc, h: cap(u * W) * hf, cx: u * W, kind: kind, edge: edge, hero: true, tag: tag }; }
    var mid = [], near = [];
    if (m) {
      mid.push(H1(0.2, 52, 0.7, 'taper', 1, 'a'), H1(0.5, 54, 1, 'spire', 0, 'b'), H1(0.82, 60, 0.8, 'crown', 2, 'c'), H1(0.36, 46, 0.52, 'blade', 0), H1(0.66, 48, 0.58, 'setback', 1), H1(0.04, 42, 0.46, 'slab', 0), H1(0.95, 42, 0.5, 'slab', 1));
    } else {
      mid.push(H1(0.585, 70, 0.62, 'taper', 1, 'a'), H1(0.745, 56, 1, 'spire', 0, 'b'), H1(0.885, 84, 0.76, 'crown', 2, 'c'),
        H1(0.705, 40, 0.8, 'blade', 0), H1(0.82, 66, 0.55, 'setback', 1), H1(0.965, 60, 0.5, 'slab', 0), H1(0.52, 54, 0.42, 'slab', 1), H1(0.94, 44, 0.86, 'blade', 3));
      near.push(H1(0.62, 76, 0.34, 'setback', 3), H1(0.79, 70, 0.3, 'crown', 0), H1(0.93, 90, 0.3, 'slab', 1));
    }
    return { mid: mid, near: near };
  }

  function geom(b, base) {
    var x = b.x, w = b.w, top = base - b.h, r = x + w, cx = x + w / 2, k = b.kind, L, R, y1, y2, i1, i2;
    if (k === 'taper') { y1 = top + b.h * 0.2; i1 = w * 0.14; L = [[x, base], [x, y1], [x + i1, top]]; R = [[r, base], [r, y1], [r - i1, top]]; }
    else if (k === 'setback') { y1 = base - b.h * 0.55; y2 = base - b.h * 0.82; i1 = w * 0.12; i2 = w * 0.26; L = [[x, base], [x, y1], [x + i1, y1], [x + i1, y2], [x + i2, y2], [x + i2, top]]; R = [[r, base], [r, y1], [r - i1, y1], [r - i1, y2], [r - i2, y2], [r - i2, top]]; }
    else if (k === 'spire') { y1 = top + b.h * 0.5; y2 = top + b.h * 0.14; L = [[x, base], [x + w * 0.06, y1], [cx - w * 0.11, y2], [cx - w * 0.015, top]]; R = [[r, base], [r - w * 0.06, y1], [cx + w * 0.11, y2], [cx + w * 0.015, top]]; }
    else if (k === 'blade') { L = [[x, base], [x, top]]; R = [[r, base], [r, top + Math.min(b.h * 0.22, w * 0.7)]]; }
    else { L = [[x, base], [x, top]]; R = [[r, base], [r, top]]; }
    return { L: L, R: R, top: top };
  }
  function interp(chain, y) {
    for (var i = 1; i < chain.length; i++) {
      var a = chain[i - 1], c = chain[i];
      if (a[1] === c[1]) continue;
      if ((y <= a[1] && y >= c[1]) || (y >= a[1] && y <= c[1])) return a[0] + (c[0] - a[0]) * (y - a[1]) / (c[1] - a[1]);
    }
    return null;
  }
  function polyPath(G) {
    var p = new Path2D(), i;
    for (i = 0; i < G.L.length; i++) { if (i) p.lineTo(G.L[i][0], G.L[i][1]); else p.moveTo(G.L[i][0], G.L[i][1]); }
    for (i = G.R.length - 1; i >= 0; i--) p.lineTo(G.R[i][0], G.R[i][1]);
    p.closePath(); return p;
  }
  function chainStroke(g, chain, rgb, a, y0, y1, boost) {
    var gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, rgba(rgb, a)); gr.addColorStop(0.55, rgba(rgb, a * 0.5)); gr.addColorStop(1, rgba(rgb, a * 0.1));
    g.strokeStyle = gr; g.lineJoin = 'round'; g.lineCap = 'butt';
    var passes = [[5.5, 0.1], [2.6, 0.26], [1, 1]];
    for (var k = 0; k < passes.length; k++) {
      g.lineWidth = passes[k][0] * (boost || 1); g.globalAlpha = passes[k][1];
      g.beginPath();
      for (var i = 0; i < chain.length; i++) { if (i) g.lineTo(chain[i][0], chain[i][1]); else g.moveTo(chain[i][0], chain[i][1]); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  var beaconPts = [];
  function drawBuilding(g, b, base, row, rnd) {
    var G = geom(b, base); b.G = G; b.path = polyPath(G); b.base = base;
    var gr = g.createLinearGradient(0, G.top, 0, base);
    gr.addColorStop(0, row.top); gr.addColorStop(1, row.bot);
    g.fillStyle = gr; g.fill(b.path);
    g.save(); g.clip(b.path);
    var rgbE = P.edge[b.edge];
    var sh = g.createLinearGradient(b.x, 0, b.x + b.w, 0);
    sh.addColorStop(0, rgba(rgbE, 0.2 * row.ea)); sh.addColorStop(0.3, rgba(rgbE, 0)); sh.addColorStop(0.68, rgba(P.shade, 0)); sh.addColorStop(1, rgba(P.shade, P.shadeA * row.ea));
    g.fillStyle = sh; g.fillRect(b.x - 1, G.top - 2, b.w + 2, base - G.top + 4);
    if (b.kind === 'spire' || b.kind === 'blade' || b.hero) {
      var lf = g.createLinearGradient(b.cx, 0, b.x + b.w, 0);
      lf.addColorStop(0, rgba(rgbE, 0)); lf.addColorStop(1, rgba(rgbE, (dark ? 0.2 : 0.16) * row.ea));
      g.fillStyle = lf; g.fillRect(b.cx, G.top, b.w, base - G.top);
    }
    g.fillStyle = P.mull;
    var step = Math.max(4, Math.round(5 * sc));
    for (var mx = b.x + step; mx < b.x + b.w - 1; mx += step) g.fillRect(mx, G.top, 1, base - G.top);
    g.restore();
    var ea = row.ea, main = rnd() < 0.5;
    chainStroke(g, main ? G.L : G.R, rgbE, 0.95 * ea, G.top, base, b.hero ? 1.15 : 1);
    chainStroke(g, main ? G.R : G.L, rgbE, 0.3 * ea, G.top, base, 0.8);
    var tl = G.L[G.L.length - 1], tr = G.R[G.R.length - 1];
    g.strokeStyle = rgba(rgbE, 0.55 * ea); g.lineWidth = 1; g.beginPath(); g.moveTo(tl[0], tl[1]); g.lineTo(tr[0], tr[1]); g.stroke();
    if (b.kind === 'crown' || (b.hero && b.tag === 'c')) {
      g.fillStyle = rgba(P.crown, 0.95 * ea); g.fillRect(b.x + 2, G.top - 1, b.w - 4, 2);
      glow(g, b.cx, G.top - 2, b.w * 1.2, b.w * 0.55, P.crown, (dark ? 0.34 : 0.3) * ea);
    }
    if (b.kind === 'spire') {
      glow(g, b.cx, G.top + 3, 22 * sc, 40 * sc, rgbE, 0.4 * ea);
      g.fillStyle = rgba('255,255,255', 0.95 * ea); g.fillRect(b.cx - 0.5, G.top - 2, 1, 6);
    }
    if (b.h > 50 * sc && (b.hero || rnd() < 0.3) && b.kind !== 'spire') {
      var al = 7 + rnd() * 16;
      g.strokeStyle = rgba(rgbE, 0.7 * ea); g.lineWidth = 1; g.beginPath(); g.moveTo(b.cx, G.top); g.lineTo(b.cx, G.top - al); g.stroke();
      if (ea > 0.6 && beaconPts.length < 7) beaconPts.push([b.cx, G.top - al]);
    } else if (b.kind === 'spire' && beaconPts.length < 7) beaconPts.push([b.cx, G.top - 2]);
    if (b.hero && b.tag) heroes.push({ tag: b.tag, x: b.cx, y: G.top - (b.kind === 'spire' ? 4 : 0) });
  }

  /* windows: three tiers so they can light up on load and as you scroll */
  var TIER_P = [0.34, 0.64];
  function windows(b, base, row, rnd, buckets) {
    var G = b.G, cw = Math.max(2.4, (row.i === 0 ? 2.7 : row.i === 1 ? 3.5 : 4.4) * sc), ch = cw * 1.7, f = 0;
    var inset = Math.max(2, cw * 0.8);
    for (var cy = G.top + ch * 1.1; cy < base - ch * 1.5; cy += ch, f++) {
      var lo = interp(G.L, cy), hi = interp(G.R, cy);
      if (lo === null || hi === null) continue;
      var fp = Math.pow(rnd(), 1.25) * row.win * 1.7;
      for (var cx = lo + inset; cx + cw < hi - inset + 0.5; cx += cw) {
        if (rnd() > fp) continue;
        var t = rnd(), tier = t < TIER_P[0] ? 0 : t < TIER_P[1] ? 1 : 2;
        var ci = Math.floor(rnd() * P.win.length), hi2 = rnd() < 0.3 ? 1 : 0;
        buckets[tier * 10 + ci * 2 + hi2].push(cx, cy);
      }
    }
    b.cw = cw; b.ch = ch;
  }
  function paintWindows(buckets, rowIdx, ctxs, row) {
    for (var tier = 0; tier < 3; tier++) {
      var g = ctxs[tier];
      for (var ci = 0; ci < P.win.length; ci++) for (var h2 = 0; h2 < 2; h2++) {
        var arr = buckets[tier * 10 + ci * 2 + h2];
        if (!arr.length) continue;
        var cw = row.cw, ch = row.ch;
        g.fillStyle = rgba(P.win[ci][0], Math.min(1, P.win[ci][1] * (h2 ? 1.1 : 0.5) * row.wa * (dark ? 1.25 : 1.1)));
        for (var i = 0; i < arr.length; i += 2) g.fillRect(arr[i], arr[i + 1], cw - 1.1, ch - 3);
      }
    }
  }

  /* reflection: strip-wise flipped copy with a still-water ripple, tinted and faded */
  var STRETCH = 1.45;
  function reflect(src, dst) {
    var wd = src.width, ph = Math.round(waterH * dpr);
    var t = mk(wd, ph), tg = t.getContext('2d');
    var step = 2;
    for (var dy = 0; dy < waterH; dy += step) {
      var sy = (horizon - (dy + step) / STRETCH) * dpr, sh = step / STRETCH * dpr;
      if (sy < 0) break;
      var f = dy / waterH, amp = 0.5 + 3.4 * f;
      var off = (Math.sin(dy * 0.23 + 1.3) * 0.55 + Math.sin(dy * 0.071 + 0.4)) * amp;
      tg.save(); tg.translate(0, (dy + step) * dpr); tg.scale(1, -1);
      tg.globalAlpha = 0.62; tg.drawImage(src, 0, sy, wd, sh, (off - 1.1) * dpr, 0, wd, step * dpr);
      tg.globalAlpha = 0.62; tg.drawImage(src, 0, sy, wd, sh, (off + 1.1) * dpr, 0, wd, step * dpr);
      tg.restore();
    }
    tg.globalAlpha = 1;
    tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = P.tint; tg.fillRect(0, 0, wd, ph);
    tg.globalCompositeOperation = 'destination-in';
    var ga = tg.createLinearGradient(0, 0, 0, ph);
    ga.addColorStop(0, rgba('0,0,0', P.refl)); ga.addColorStop(0.35, rgba('0,0,0', P.refl * 0.55)); ga.addColorStop(0.7, rgba('0,0,0', P.refl * 0.2)); ga.addColorStop(1, 'rgba(0,0,0,0)');
    tg.fillStyle = ga; tg.fillRect(0, 0, wd, ph);
    var dg = dst.getContext('2d');
    dg.save(); dg.setTransform(1, 0, 0, 1, 0, 0); dg.drawImage(t, 0, Math.round(horizon * dpr)); dg.restore();
  }

  function groundRGB() {
    var h = ground.replace('#', '');
    return parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16);
  }

  function drawCity() {
    var rnd = rng(41);
    heroes = []; beaconPts = [];
    var g = setup(cCity, W, H), gA = setup(cA, W, H), gB = setup(cB, W, H);
    var base = horizon + 3;
    /* water */
    var wg = g.createLinearGradient(0, horizon, 0, H);
    P.water.forEach(function (s) { wg.addColorStop(s[0], s[1]); });
    wg.addColorStop(1, ground);
    g.fillStyle = wg; g.fillRect(0, horizon, W, H - horizon + 1);
    P.glows.forEach(function (gl) { glow(g, W * gl[2], horizon + waterH * 0.12, W * 0.42, waterH * 0.34, gl[0], gl[1] * 0.55); });
    /* rows */
    var hr = heroRows();
    var rows = [
      { list: genRow(rnd, { w0: 24, w1: 50, h0: 0.32, h1: 0.7, hMin: 14 }), spec: P.rows[0], i: 0 },
      { list: genRow(rnd, { w0: 38, w1: 84, h0: 0.3, h1: 0.78, hMin: 18 }).concat(hr.mid), spec: P.rows[1], i: 1 },
      { list: genRow(rnd, { w0: 54, w1: 110, h0: 0.16, h1: 0.4, hMin: 12 }).concat(hr.near), spec: P.rows[2], i: 2 }
    ];
    var hazeTop = horizon - capMax * 1.05;
    rows.forEach(function (R, ri) {
      var row = R.spec; row.i = ri;
      R.list.sort(function (a, b) { return a.h - b.h; });
      var buckets = []; for (var k = 0; k < 30; k++) buckets.push([]);
      R.list.forEach(function (b) { drawBuilding(g, b, base, row, rnd); });
      /* hide windows of farther rows that this row now covers */
      [gA, gB].forEach(function (tg) { tg.globalCompositeOperation = 'destination-out'; tg.fillStyle = '#000'; R.list.forEach(function (b) { tg.fill(b.path); }); tg.globalCompositeOperation = 'source-over'; });
      R.list.forEach(function (b) { windows(b, base, Object.assign({ i: ri }, row), rnd, buckets); });
      paintWindows(buckets, ri, [g, gA, gB], { cw: Math.max(2.4, (ri === 0 ? 2.7 : ri === 1 ? 3.5 : 4.4) * sc), ch: Math.max(2.4, (ri === 0 ? 2.7 : ri === 1 ? 3.5 : 4.4) * sc) * 1.7, wa: row.wa });
      if (ri < 2) {
        var hz = g.createLinearGradient(0, hazeTop, 0, horizon);
        hz.addColorStop(0, rgba(P.haze, 0)); hz.addColorStop(1, rgba(P.haze, P.hazeA[ri] * (dark ? 0.55 : 0.5)));
        g.fillStyle = hz; g.fillRect(0, hazeTop, W, horizon - hazeTop + 2);
      }
    });
    /* quay: a low waterfront strip with warm lights */
    var qh = Math.max(5, 9 * sc);
    var qg = g.createLinearGradient(0, horizon - qh, 0, horizon + 2);
    qg.addColorStop(0, rgba(dark ? '6,9,28' : '120,128,172', 0)); qg.addColorStop(1, rgba(dark ? '6,9,28' : '150,150,200', dark ? 0.85 : 0.22));
    g.fillStyle = qg; g.fillRect(0, horizon - qh, W, qh + 2);
    var qx = 0;
    while (qx < W) {
      var qy = horizon - 1 - rnd() * qh * 0.7, r = 0.7 + rnd() * 0.7, a = 0.5 + rnd() * 0.5;
      g.fillStyle = rgba(P.quay, a); g.fillRect(qx, qy, r * 1.6, r * 1.2);
      if (rnd() < 0.2) glow(g, qx, qy, 6 * sc + 2, 6 * sc + 2, P.quay, dark ? 0.42 : 0.35);
      qx += 2.5 + rnd() * 9;
    }
    var bandg = g.createLinearGradient(0, horizon - 8, 0, horizon + 1);
    bandg.addColorStop(0, rgba(P.quay, 0)); bandg.addColorStop(1, rgba(P.quay, dark ? 0.2 : 0.22));
    g.fillStyle = bandg; g.fillRect(0, horizon - 8, W, 9);
    /* reflections of everything above the waterline, including each window tier */
    reflect(cCity, cCity); reflect(cA, cA); reflect(cB, cB);
    /* long glossy streaks under the tall towers */
    g.save(); g.globalCompositeOperation = 'lighter';
    heroes.forEach(function (h) {
      if (h.tag !== 'b' && h.tag !== 'c' && h.tag !== 'a') return;
      var rgb = h.tag === 'b' ? P.edge[0] : h.tag === 'c' ? P.crown : P.edge[1];
      var sg = g.createLinearGradient(0, horizon, 0, horizon + waterH * 0.85);
      sg.addColorStop(0, rgba(rgb, dark ? 0.2 : 0.14)); sg.addColorStop(1, rgba(rgb, 0));
      g.fillStyle = sg; g.fillRect(h.x - 2.5 * sc, horizon, 5 * sc, waterH * 0.85);
    });
    g.restore();
  }

  function drawGlints() {
    var rnd = rng(77), g = setup(cGl, W * 2, waterH);
    cGl.style.width = '200%';
    for (var i = 0; i < 70; i++) {
      var f = Math.pow(rnd(), 1.6), y = f * waterH * 0.96, len = (30 + rnd() * 150) * (0.45 + f), x = rnd() * W;
      var col = P.glintCols[Math.floor(rnd() * 3)], a = (0.05 + rnd() * 0.14) * (1 - f * 0.55) * (dark ? 1 : 0.9), hh = f > 0.5 ? 2 : 1;
      [x, x + W].forEach(function (xx) {
        var lg = g.createLinearGradient(xx, 0, xx + len, 0);
        lg.addColorStop(0, rgba(col, 0)); lg.addColorStop(0.5, rgba(col, a)); lg.addColorStop(1, rgba(col, 0));
        g.fillStyle = lg; g.fillRect(xx, y, len, hh);
      });
    }
  }

  function placeLayers() {
    glints.style.top = horizon + 'px'; glints.style.height = waterH + 'px';
    var u = W < 900 ? 'um' : 'u';
    bcBox.innerHTML = '';
    beaconPts.forEach(function (p, i) {
      var e = document.createElement('i'); e.style.left = p[0] + 'px'; e.style.top = p[1] + 'px'; e.style.animationDelay = (-i * 0.83) + 's';
      if (reduce) e.style.animation = 'none', e.style.opacity = 0.7;
      bcBox.appendChild(e);
    });
    if (alts) {
      var map = {}; heroes.forEach(function (h) { map[h.tag] = h; });
      var tags = ['a', 'b', 'c'];
      Array.prototype.forEach.call(alts.children, function (a, i) {
        var h = map[tags[i]]; if (!h) return;
        a.style.left = h.x + 'px'; a.style.top = h.y + 'px';
        a.style.setProperty('--h', (W < 900 ? 30 : i === 0 ? 104 : 52) + 'px');
      });
    }
  }
  function twinkles() {
    twBox.innerHTML = '';
    if (!dark || reduce) return;
    var rnd = rng(9), n = Math.min(18, Math.round(W / 80));
    for (var i = 0; i < n; i++) {
      var e = document.createElement('i');
      e.style.left = (rnd() * W).toFixed(0) + 'px'; e.style.top = (Math.pow(rnd(), 1.4) * horizon * 0.8).toFixed(0) + 'px';
      e.style.animationDuration = (3 + rnd() * 4).toFixed(1) + 's'; e.style.animationDelay = (-rnd() * 6).toFixed(1) + 's';
      twBox.appendChild(e);
    }
  }

  function build() {
    dark = root.dataset.theme !== 'light';
    P = dark ? PAL.dark : PAL.light;
    ground = (getComputedStyle(root).getPropertyValue('--ground') || '#12131f').trim();
    W = Math.round(hero.clientWidth); H = Math.round(hero.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    waterH = Math.round(wref.offsetHeight);
    var harborH = harbor.offsetHeight;
    lowZone = harborH - waterH;
    horizon = H - waterH;
    sc = Math.max(0.62, Math.min(1.1, W / 1440));
    if (W < 900) sc = Math.max(0.62, W / 700);
    capL = Math.max(36, lowZone - 10);
    capMax = compact ? lowZone + Math.min(110, horizon * 0.25) : horizon - Math.max(150, H * 0.2);
    if (W < 900) capL = compact ? Math.max(40, lowZone - 8) : lowZone - 14;
    scrollMax = Math.max(1, H);
    drawSky(setup(cSky, W, H), rng(5));
    drawCity();
    drawGlints();
    placeLayers();
    twinkles();
    var sf = cFx; sf.width = Math.round(W); sf.height = Math.round(H); fx.setTransform(1, 0, 0, 1, 0, 0);
    update(true);
  }

  /* ---------- scroll: transforms and opacities only ---------- */
  var ticking = false, lastY = -1, introA = reduce ? 1 : 0, introT0 = 0, introOn = false, stuck = null, oA = -1, oB = -1;
  function update(force) {
    ticking = false;
    var y = window.scrollY;
    if (stuck !== (y > 24)) { stuck = y > 24; if (header) header.classList.toggle('is-stuck', stuck); }
    if (!force && y === lastY) return;
    lastY = y;
    if (y > H + 160) return;
    var ty = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0)', tc = 'translate3d(0,' + (y * 0.14).toFixed(1) + 'px,0)';
    lySky.style.transform = ty; lyCity.style.transform = tc;
    if (alts) alts.style.transform = tc;
    var p = reduce ? 1 : clamp01(y / (H * 0.5));
    var a = Math.max(introA * 0.85, p), b = clamp01((y - H * 0.06) / (H * 0.42));
    if (reduce) { a = 1; b = 0.85; }
    if (Math.abs(a - oA) > 0.004 || force) { oA = a; cA.style.opacity = a.toFixed(3); }
    if (Math.abs(b - oB) > 0.004 || force) { oB = b; cB.style.opacity = b.toFixed(3); }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { update(false); }); } }
  window.addEventListener('scroll', onScroll, { passive: true });

  function runIntro() {
    if (reduce) { introA = 1; update(true); return; }
    introT0 = performance.now() + 450; introOn = true;
    (function step(now) {
      var t = clamp01((now - introT0) / 2600);
      introA = easeOutExpo(t); update(true);
      if (t < 1) requestAnimationFrame(step); else introOn = false;
    })(performance.now());
  }

  /* ---------- shooting stars + the headline meteor (loop only while something flies) ---------- */
  var shoot = null, meteor = null, running = false, timer = 0, DPR1 = 1;
  function streak(hx, hy, ang, len, a, w) {
    var tx = hx - Math.cos(ang) * len, ty = hy - Math.sin(ang) * len;
    var g = fx.createLinearGradient(tx, ty, hx, hy);
    var tail = dark ? '159,123,255' : '140,110,230', tip = dark ? '255,214,160' : '196,112,12';
    g.addColorStop(0, rgba(tail, 0)); g.addColorStop(0.6, rgba(dark ? '93,199,255' : '60,140,210', a * 0.5)); g.addColorStop(1, rgba(tip, a));
    fx.strokeStyle = g; fx.lineWidth = w; fx.lineCap = 'round';
    fx.beginPath(); fx.moveTo(tx, ty); fx.lineTo(hx, hy); fx.stroke();
  }
  function head(x, y, rgb, s, a) {
    var g = fx.createRadialGradient(x, y, 0, x, y, 20 * s);
    g.addColorStop(0, rgba(rgb, 0.45 * a)); g.addColorStop(0.4, rgba(rgb, 0.12 * a)); g.addColorStop(1, rgba(rgb, 0));
    fx.fillStyle = g; fx.beginPath(); fx.arc(x, y, 20 * s, 0, 6.283); fx.fill();
    fx.fillStyle = dark ? 'rgba(255,247,236,' + (0.95 * a) + ')' : 'rgba(196,112,12,' + (0.95 * a) + ')';
    fx.beginPath(); fx.arc(x, y, 1.9 * s, 0, 6.283); fx.fill();
  }
  function frame(now) {
    fx.clearRect(0, 0, W, H);
    var busy = false;
    if (shoot) {
      var p = (now - shoot.t0) / shoot.dur;
      if (p >= 1) shoot = null;
      else {
        busy = true;
        var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p, a = Math.sin(p * Math.PI);
        streak(hx, hy, shoot.ang, 130, 0.9 * a, 1.9); head(hx, hy, dark ? '255,200,130' : '196,112,12', 0.7, 1);
        if (hy < horizon - 4) {
          var my = 2 * horizon - hy;
          if (my < H - 20) { fx.globalAlpha = 0.28 * (1 - (my - horizon) / waterH); streak(hx, my, -shoot.ang, 90, 0.9 * a, 1.5); head(hx, my, dark ? '255,200,130' : '196,112,12', 0.45, 1); fx.globalAlpha = 1; }
        }
      }
    }
    if (meteor) {
      var m = meteor, el = now - m.t0, hx2, hy2, ta = 1;
      var p1 = clamp01(el / m.d1), acc = Math.pow(p1, 1.5);
      if (el < m.d1) { hx2 = m.sx + (m.ex - m.sx) * acc; hy2 = m.sy + (m.ey - m.sy) * acc; m.path.style.strokeDashoffset = '1'; }
      else { var p2 = easeOutExpo(clamp01((el - m.d1) / m.d2)); hx2 = m.ex - (m.ex - m.lx) * p2; hy2 = m.ey; m.path.style.strokeDashoffset = String(1 - p2); ta = 1 - clamp01((el - m.d1) / 600); }
      var ang2 = el < m.d1 ? Math.atan2(m.ey - m.sy, m.ex - m.sx) : Math.PI;
      var len2 = 260 * (el < m.d1 ? Math.min(1, acc * 3 + 0.1) : ta);
      var ha = el > m.d1 + m.d2 ? 1 - clamp01((el - m.d1 - m.d2) / 400) : 1;
      if (len2 > 1) streak(hx2, hy2, el < m.d1 ? ang2 : 0, len2, 0.95 * Math.max(ta, 0), 2.4);
      if (ha > 0) head(hx2, hy2, dark ? '255,200,130' : '196,112,12', 1, ha);
      if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; } else busy = true;
    }
    if (busy && !document.hidden) requestAnimationFrame(frame);
    else { running = false; fx.clearRect(0, 0, W, H); }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function scheduleShoot(ms) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (!document.hidden && window.scrollY < H * 0.8 && !shoot && !compact) {
        var ang = (26 + Math.random() * 14) * Math.PI / 180;
        shoot = { sx: W * (0.1 + Math.random() * 0.55), sy: horizon * (0.05 + Math.random() * 0.3), ang: ang, dist: W * 0.42, dur: 900 + Math.random() * 500, t0: performance.now() };
        kick();
      }
      scheduleShoot(7000 + Math.random() * 6000);
    }, ms);
  }
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg) return;
    var path = svg.querySelector('path');
    var rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-f1-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-f1-meteor', '1'); } catch (e) {}
    var cr = cFx.getBoundingClientRect();
    var ex = rect.right - cr.left, ey = rect.top - cr.top + 4;
    var dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left - cr.left, path: path, t0: performance.now(), d1: 800, d2: 1100 };
    kick();
  }

  /* ---------- lifecycle ---------- */
  document.addEventListener('visibilitychange', function () { if (!document.hidden && (shoot || meteor)) kick(); });
  document.addEventListener('rm:themechange', function () { requestAnimationFrame(build); });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 160); });

  build();
  var started = false;
  function go() {
    if (started) return; started = true;
    build(); runIntro();
    if (!reduce) scheduleShoot(2600);
    if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 700);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  setTimeout(go, 2500);
})();
