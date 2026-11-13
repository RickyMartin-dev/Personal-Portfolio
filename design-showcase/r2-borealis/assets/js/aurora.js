/* Borealis: living aurora curtains.
   Each curtain is a tall strip (rays + vertical colour) baked once. Every other frame the sky canvas
   (half resolution) is cleared and each curtain is drawn as ~60 vertical slices with sine-offset y,
   height and alpha: a few hundred drawImage calls on a small canvas, no per-frame gradients.
   A second tiny canvas lays a soft glow over the engraved range where the aurora is brightest.
   Everything pauses off-screen, in a hidden tab, and when motion is off. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.querySelector('.hero');
  var cv = hero && hero.querySelector('canvas.aurora');
  if (!cv) return;
  var rg = hero.querySelector('canvas.rglow');
  var ctx = cv.getContext('2d');
  var gctx = rg && rg.getContext('2d');
  var compact = hero.classList.contains('compact');
  var reduceMq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var opt = { intensity: 1, speed: 1, height: 1, mode: 'afterglow', curtains: 3, rglow: true };
  function flag(v, d) { return v == null ? d : !(v === false || v === 'false' || v === 'off' || v === 0 || v === '0'); }
  function readOpts() {
    var T = window.RMTune && RMTune.get ? RMTune : null;
    function g(id, d) { var v = T ? T.get(id) : undefined; return v == null || v === '' ? d : v; }
    opt.intensity = +g('intensity', 1);
    opt.speed = +g('speed', 1);
    opt.height = +g('height', 1);
    opt.mode = String(g('colormode', 'afterglow'));
    opt.curtains = +g('curtains', 3) >= 3 ? 3 : 2;
    opt.rglow = flag(g('rglow', true), true);
  }

  function parse(c, fb) {
    c = (c || '').trim();
    var m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = /^#([0-9a-f]{6})/i.exec(c);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(c);
    if (m) return [+m[1], +m[2], +m[3]];
    return fb;
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- palette + baked strips ---------- */
  var dark = true, strips = [], glowSp = [], SW = 128, SH = 192;
  function palette() {
    var cs = getComputedStyle(root);
    var V = parse(cs.getPropertyValue('--violet'), [154, 130, 255]);
    var C = parse(cs.getPropertyValue('--cyan'), [85, 220, 196]);
    var A = parse(cs.getPropertyValue('--amber'), [255, 184, 107]);
    var white = [255, 255, 255];
    if (opt.mode === 'classic') {
      var G = dark ? [88, 255, 168] : [38, 190, 128];
      var T = dark ? [64, 226, 214] : [34, 168, 190];
      var M = dark ? [255, 124, 206] : [226, 108, 176];
      return [[G, T, V], [T, V, M], [G, mix(G, V, 0.5), V]];
    }
    if (opt.mode === 'mono') {
      var lo = dark ? mix(C, white, 0.5) : mix(C, white, 0.25);
      var mid = C;
      var hi = dark ? mix(C, V, 0.35) : mix(C, V, 0.3);
      return [[lo, mid, hi], [mix(lo, white, 0.15), mid, mix(hi, C, 0.4)], [lo, mix(mid, hi, 0.5), hi]];
    }
    return [[C, mix(C, V, 0.55), V], [V, mix(V, [255, 128, 190], 0.4), mix(A, V, 0.4)], [mix(A, C, 0.35), mix(C, V, 0.5), V]];
  }
  function bakeStrip(cols, seed) {
    var s = document.createElement('canvas'); s.width = SW; s.height = SH;
    var x = s.getContext('2d');
    var col = document.createElement('canvas'); col.width = 1; col.height = SH;
    var cx = col.getContext('2d'), g = cx.createLinearGradient(0, 0, 0, SH);
    var k = dark ? 1 : 0.9;
    // bottom hem is the hot edge, rays fade upward through three colours
    g.addColorStop(0, rgba(cols[2], 0));
    g.addColorStop(0.3, rgba(cols[2], 0.05 * k));
    g.addColorStop(0.55, rgba(mix(cols[2], cols[1], 0.6), 0.2 * k));
    g.addColorStop(0.8, rgba(cols[1], 0.5 * k));
    g.addColorStop(0.9, rgba(mix(cols[1], cols[0], 0.6), 0.8 * k));
    g.addColorStop(0.955, rgba(cols[0], 0.9 * k));
    g.addColorStop(1, rgba(cols[0], 0));
    cx.fillStyle = g; cx.fillRect(0, 0, 1, SH);
    var r = rng(seed), ph = r() * 6, ph2 = r() * 6;
    for (var i = 0; i < SW; i++) {
      var ray = 0.5 + 0.5 * Math.sin(i * 0.31 + ph) * Math.sin(i * 0.113 + ph2);
      ray = dark ? 0.28 + 0.72 * Math.pow(clamp01(ray + (r() - 0.5) * 0.35), 1.2) : 0.86 + 0.14 * ray;
      x.globalAlpha = ray;
      x.drawImage(col, i, 0);
    }
    x.globalAlpha = 1;
    return s;
  }
  function bakeGlow(c) {
    var s = document.createElement('canvas'); s.width = s.height = 64;
    var x = s.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, rgba(c, 0.55)); g.addColorStop(0.45, rgba(c, 0.18)); g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return s;
  }
  function bake() {
    dark = root.dataset.theme !== 'light';
    var P = palette();
    strips = P.map(function (c, i) { return bakeStrip(dark ? c : c.map(function (v) { return mix(v, [255, 255, 255], 0.38); }), 11 + i * 29); });
    glowSp = [bakeGlow(P[0][0]), bakeGlow(P[1][1])];
  }

  /* ---------- geometry ---------- */
  var W = 0, H = 0, Wl = 0, Hl = 0, K = 0.42, GK = 0.25, gW = 0, gH = 0, SL = 6, PAD = 140, mask = null;
  var YC = [0.07, 0.16, 0.025], HF = [0.4, 0.34, 0.46];
  function measure() {
    var r = hero.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    var ch = Math.round(H * (compact ? 0.92 : 0.8));
    SL = W < 900 ? 9 : 6;
    Wl = Math.max(80, Math.round(W * K)); Hl = Math.max(60, Math.round(ch * K));
    if (cv.width !== Wl || cv.height !== Hl) { cv.width = Wl; cv.height = Hl; }
    if (rg) {
      var ar = hero.querySelector('.art'), aw = ar ? ar.clientWidth : W, ah = ar ? ar.clientHeight : 300;
      gW = Math.max(40, Math.round(aw * GK)); gH = Math.max(30, Math.round((ah + PAD) * GK));
      if (rg.width !== gW || rg.height !== gH) { rg.width = gW; rg.height = gH; }
    }
    bakeMask();
  }

  function bakeMask() {
    mask = null;
    var els = hero.querySelectorAll('.hero-statement, .hero-support, .hero-actions, .hero.compact .grid > p');
    if (!els.length) return;
    var hr = hero.getBoundingClientRect(), l = 1e9, r = -1e9, tp = 1e9, b = -1e9;
    [].forEach.call(els, function (e) { var q = e.getBoundingClientRect(); if (q.width < 2) return; l = Math.min(l, q.left); r = Math.max(r, q.right); tp = Math.min(tp, q.top); b = Math.max(b, q.bottom); });
    if (r < 0) return;
    var cx = ((l + r) / 2 - hr.left) * K, cy = ((tp + b) / 2 - hr.top) * K, rx = ((r - l) / 2 + 90) * K, ry = ((b - tp) / 2 + 70) * K;
    var m = document.createElement('canvas'); m.width = Wl; m.height = Hl;
    var x = m.getContext('2d');
    x.translate(cx, cy); x.scale(1, ry / rx);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    var a = dark ? 0.92 : 0.8;
    g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.8 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(-rx, -rx * (rx / ry), rx * 2, rx * 2 * (rx / ry));
    mask = m;
  }
  function field(xp, t, c) {
    var u0 = xp / 1440, drop = Hl * 0.22 * Math.pow(u0, 1.6);
    // returns [y0, h, a] in canvas units for a slice at virtual x (0..1440)
    var y0 = drop + Hl * (YC[c] + 0.055 * Math.sin(xp * 0.0050 + c * 2.1 + t * 0.11) + 0.012 * Math.sin(xp * 0.0123 - t * 0.17 + c));
    var h = Hl * HF[c] * opt.height * (0.84 + 0.16 * Math.sin(xp * 0.0071 + t * 0.09 + c * 1.7));
    var b = 0.5 + 0.5 * Math.sin(xp * 0.0034 - t * 0.07 + c * 3.1 + 1);
    var sh = 0.5 + 0.5 * Math.sin(xp * 0.017 + t * 0.5 + c * 2);
    return [y0, h, (0.18 + 0.82 * b) * (0.84 + 0.16 * sh) * (0.2 + 0.8 * Math.pow(Math.min(1, u0), 1.1))];
  }
  function bright(u, t) {
    var xp = u * 1440, s = 0;
    for (var c = 0; c < opt.curtains; c++) { var f = field(xp, t, c); s += f[2] * (c === 1 ? 0.8 : 1); }
    return clamp01(s * opt.intensity / opt.curtains * 1.25);
  }

  function drawSky(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, Wl, Hl);
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    var n = Math.ceil(Wl / SL), kA = (dark ? 1.25 : 0.75) * opt.intensity;
    for (var c = 0; c < opt.curtains; c++) {
      var S = strips[c]; if (!S) continue;
      for (var i = 0; i < n; i++) {
        var x = i * SL, u = (x + SL / 2) / Wl;
        var edge = clamp01(u * 3) * clamp01((1 - u) * 3);
        var f = field(u * 1440, t, c);
        var a = f[2] * edge * kA;
        if (a < 0.025) continue;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(S, ((i * 3 + c * 37) % (SW - 4)), 0, 3, SH, x, f[0], dark ? SL + 1 : SL + 5, f[1]);
      }
    }
    ctx.globalAlpha = 1;
    if (mask) { ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(mask, 0, 0); }
    ctx.globalCompositeOperation = 'source-over';
  }

  function envAt(x) {
    var R = window.__rmRange; if (!R) return null;
    var i = Math.round((x + 8) / R.step); i = i < 0 ? 0 : i > R.env.length - 1 ? R.env.length - 1 : i;
    return R.env[i];
  }
  function drawGlow(t) {
    if (!gctx) return;
    gctx.clearRect(0, 0, gW, gH);
    if (!opt.rglow) return;
    var R = window.__rmRange; if (!R) return;
    var aw = gW / GK, step = Math.max(34, aw / 36), amp = (dark ? 0.62 : 0.4) * Math.min(1.4, opt.intensity);
    for (var x = 0; x <= aw; x += step) {
      var u = x / aw, b = bright(u, t);
      if (b < 0.16) continue;
      var y = envAt(x); if (y == null) continue;
      var sz = (150 + 170 * b) * GK, sp = glowSp[Math.sin(x * 0.004 + t * 0.05) > 0 ? 0 : 1];
      gctx.globalAlpha = Math.min(1, amp * b * b * 1.5);
      gctx.drawImage(sp, x * GK - sz / 2, (y + PAD) * GK - sz * 0.55, sz, sz);
    }
    gctx.globalAlpha = 1;
  }

  /* ---------- loop ---------- */
  var visible = true, running = false, clock = 0, lastTs = 0, frameN = 0, lastDraw = 0, STATIC_T = 14.5;
  function still() { return reduceMq.matches || root.dataset.motion === 'off'; }
  function speedK() { return (root.dataset.motion === 'calm' ? 0.5 : 1) * opt.speed; }
  function frame(ts) {
    if (!running) return;
    if (!visible || document.hidden || still()) { running = false; lastTs = 0; return; }
    var dt = lastTs ? Math.min(ts - lastTs, 100) : 16; lastTs = ts;
    clock += dt / 1000 * speedK();
    if (ts - lastDraw >= (root.dataset.motion === 'calm' ? 50 : 40)) {
      lastDraw = ts; frameN++;
      drawSky(clock + STATIC_T);
      if (frameN % 3 === 0) drawGlow(clock + STATIC_T);
    }
    requestAnimationFrame(frame);
  }
  function kick() {
    if (still()) { drawSky(STATIC_T); drawGlow(STATIC_T); return; }
    if (!running && visible && !document.hidden) { running = true; lastTs = 0; requestAnimationFrame(frame); }
  }
  function refresh() {
    readOpts(); bake(); measure();
    drawSky(clock + STATIC_T); drawGlow(clock + STATIC_T);
    kick();
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  var rt;
  function later() { clearTimeout(rt); rt = setTimeout(refresh, 120); }
  document.addEventListener('rm:themechange', later);
  document.addEventListener('rm:tune', later);
  document.addEventListener('rm:r2opts', refresh);
  document.addEventListener('rm:range', function () { measure(); drawSky(clock + STATIC_T); drawGlow(clock + STATIC_T); });
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); drawSky(clock + STATIC_T); drawGlow(clock + STATIC_T); }, 160); });
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', kick);

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); drawSky(clock + STATIC_T); });
  readOpts(); bake(); measure();
  drawSky(STATIC_T); drawGlow(STATIC_T);
  kick();
})();
