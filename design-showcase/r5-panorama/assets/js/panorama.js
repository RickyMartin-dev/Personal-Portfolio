/* Pinned panorama: vertical scroll becomes a camera pan across a very wide engraved range.
   Five cached layers (aurora, stars, far / mid / near ridges) are baked once into tiled canvases
   and moved with transforms only. Section offsets are cached on resize; the scroll frame reads
   only scrollY. Summits are the career and project milestones, each with a spot-height label,
   a caption card that fades in at centre, and a place on the in-world altitude line. */
(function () {
  'use strict';
  var R5 = window.R5, root = document.documentElement;
  var sec = document.querySelector('.pano');
  if (!R5 || !sec) return;
  var stage = sec.querySelector('.pano-stage');
  var laySky = sec.querySelector('.pano-sky');
  var layFar = sec.querySelector('.pano-far'), layMid = sec.querySelector('.pano-mid'), layNear = sec.querySelector('.pano-near');
  var tilesNear = layNear.querySelector('.pano-tiles');
  var dawn = sec.querySelector('.pano-dawn'), msList = sec.querySelector('.pano-ms');
  var head = sec.querySelector('.pano-head'), hud = sec.querySelector('.pano-hud');
  var items = [].slice.call(sec.querySelectorAll('.ms'));
  var ticks = [].slice.call(sec.querySelectorAll('.hud-tick'));
  var hudTrack = sec.querySelector('.hud-track'), hudMark = sec.querySelector('.hud-mark'), hudFill = sec.querySelector('.hud-fill');
  var hudCue = sec.querySelector('.hud-cue'), hudNow = sec.querySelector('.hud-now');
  var N = items.length;
  var HEIGHTS = [0.5, 0.58, 0.55, 0.68, 0.64, 0.8, 1];
  var TILE = 1600;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }

  var M = null;          /* layout + metrics */
  var baked = false, bakeToken = 0, bakeSig = '';
  var secTop = 0, range = 1, trackW = 0;
  var target = 0, cur = 0, running = false, lastT = 0;
  var active = -2, passed = -1, lastOp = {}, lastDawn = -1;
  var isStatic = false;

  /* ---------- layout (reads layout; never called from the scroll frame) ---------- */
  function layout() {
    var vw = stage.clientWidth, H = stage.clientHeight;
    if (!vw || !H) return null;
    var k = +R5.opt('parallax', 1) || 1;
    var minS = Math.min(900, Math.max(0.46 * vw, 430));
    var D = Math.round(7.4 * minS);
    var s = { far: clamp(1 - 0.66 * k, 0.06, 0.92), mid: clamp(1 - 0.38 * k, 0.22, 0.96), sky: clamp(0.1 * k, 0.03, 0.26) };
    var Lh = Math.round(H * 0.72);
    var m = { vw: vw, H: H, Lh: Lh, D: D, s: s, narrow: vw < 700, k: k };
    m.W = { near: vw + D, mid: Math.ceil(vw + D * s.mid), far: Math.ceil(vw + D * s.far), sky: Math.ceil(vw + D * s.sky) };
    m.x0 = vw / 2 + 0.07 * D; m.x1 = vw / 2 + 0.9 * D;
    m.sp = (m.x1 - m.x0) / (N - 1);
    m.xs = [];
    for (var i = 0; i < N; i++) m.xs.push(m.x0 + m.sp * i);
    return m;
  }
  function metrics() {
    var r = sec.getBoundingClientRect();
    secTop = r.top + window.scrollY;
    range = Math.max(1, sec.offsetHeight - stage.clientHeight);
    if (hudTrack) trackW = hudTrack.clientWidth;
  }

  /* ---------- tiled canvases ---------- */
  function clearTiles(el) { [].slice.call(el.querySelectorAll('canvas.t')).forEach(function (c) { c.remove(); }); }
  function tileLayer(el, W, hCss, scale, draw, hostEl, topCss) {
    clearTiles(hostEl || el);
    el.style.width = W + 'px';
    el.style.height = '100%';
    var made = [];
    for (var x0 = 0; x0 < W; x0 += TILE) {
      var tw = Math.min(TILE, W - x0), over = 0;
      var cw = Math.max(1, Math.round((tw + over) * scale)), ch = Math.max(1, Math.round(hCss * scale));
      var c = document.createElement('canvas');
      c.className = 't'; c.width = cw; c.height = ch;
      c.style.left = x0 + 'px'; c.style.width = (cw / scale) + 'px'; c.style.height = (ch / scale) + 'px';
      if (topCss !== undefined) { c.style.top = topCss + 'px'; c.style.bottom = 'auto'; }
      (hostEl || el).appendChild(c);
      made.push({ c: c, ctx: c.getContext('2d'), x0: x0, tw: tw + over, sx: cw / (tw + over) });
    }
    made.forEach(function (t) { draw(t.ctx, t.x0, t.tw, t.sx, ch2(t)); });
    function ch2(t) { return t.c.height / t.sx; }
  }

  /* ---------- engraved terrain ---------- */
  function terrain(S, W, Lh) {
    var xs = [], x, i, k;
    for (x = -8; x <= W + 8; x += S.step) xs.push(x);
    var n = xs.length, rows = S.rows, data = [], maxH = 0;
    var P = { peaks: S.peaks, dz: S.dz, fx: W / S.cell, fz: S.fz, seed: S.seed, oct: 4 };
    for (k = 0; k < rows; k++) {
      var v = k / (rows - 1), hs = new Float32Array(n);
      for (i = 0; i < n; i++) { var hh = R5.field(xs[i] / W, v, P); hs[i] = hh; if (hh > maxH) maxH = hh; }
      data.push(hs);
    }
    var env = new Float32Array(n).fill(1e9), envRow = new Int16Array(n), minY = 1e9, out = [];
    for (k = 0; k < rows; k++) {
      var vv = k / (rows - 1);
      var yb = Lh * (S.b0 + (S.b1 - S.b0) * Math.pow(vv, 1.5));
      var amp = Lh * (S.a0 + S.a1 * vv) / maxH, ys = new Float32Array(n), hsr = data[k];
      for (i = 0; i < n; i++) {
        var y = yb - hsr[i] * amp; ys[i] = y;
        if (y < env[i]) { env[i] = y; envRow[i] = k; }
        if (y < minY) minY = y;
      }
      out.push({ vv: vv, ys: ys, hsr: hsr, depth: S.d0 + (S.d1 - S.d0) * vv, ticks: null });
    }
    if (S.ticks) {
      out.forEach(function (R) {
        var t = [];
        for (var q = 2; q < n - 2; q += 2) {
          var sl = (R.ys[q + 2] - R.ys[q - 2]) / (xs[q + 2] - xs[q - 2]);
          if (sl > 0.35 && R.hsr[q] > 0.12 * maxH) t.push(q, Math.min(22, 4 + sl * 7) * (0.6 + 0.4 * R.vv));
        }
        R.ticks = t;
      });
    }
    return { xs: xs, n: n, rows: out, env: env, envRow: envRow, minY: minY, maxH: maxH, S: S, W: W, Lh: Lh };
  }
  function drawTerrain(ctx, T, pal, tx, tw, scale, hCss, wgt) {
    var S = T.S, xs = T.xs, n = T.n, Lh = T.Lh;
    ctx.setTransform(scale, 0, 0, scale, -tx * scale, 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var ia = Math.max(0, Math.floor((tx - 4 + 8) / S.step) - 1), ib = Math.min(n - 1, Math.ceil((tx + tw + 4 + 8) / S.step) + 1);
    var lg = ctx.createLinearGradient(0, T.minY, 0, Lh);
    lg.addColorStop(0, R5.css(pal.top)); lg.addColorStop(0.14, R5.css(pal.top)); lg.addColorStop(0.4, R5.css(pal.mid));
    lg.addColorStop(0.72, R5.css(pal.low)); lg.addColorStop(1, R5.css(pal.base));
    var hot = S.rim ? S.rim * T.maxH : 1e9, k, i;
    for (k = 0; k < T.rows.length; k++) {
      var R = T.rows[k], ys = R.ys, d = R.depth;
      var farPct = Math.pow(1 - d, 1.3) * S.fillFar;
      ctx.globalAlpha = 1;
      ctx.fillStyle = R5.css(R5.mix(pal.ground, pal.far, farPct));
      ctx.beginPath();
      ctx.moveTo(xs[ia], ys[ia]);
      for (i = ia + 1; i <= ib; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.lineTo(xs[ib], Lh + 8); ctx.lineTo(xs[ia], Lh + 8); ctx.closePath(); ctx.fill();
      var op = (0.34 + 0.66 * Math.pow(d, 0.7)) * S.lineA;
      if (R.ticks && R.ticks.length) {
        ctx.beginPath();
        for (i = 0; i < R.ticks.length; i += 2) {
          var qi = R.ticks[i];
          if (qi < ia || qi > ib) continue;
          ctx.moveTo(xs[qi], ys[qi] + 1); ctx.lineTo(xs[qi], ys[qi] + 1 + R.ticks[i + 1]);
        }
        ctx.strokeStyle = lg; ctx.globalAlpha = op * 0.5; ctx.lineWidth = 0.8 * wgt; ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(xs[ia], ys[ia]);
      for (i = ia + 1; i <= ib; i++) ctx.lineTo(xs[i], ys[i]);
      ctx.strokeStyle = lg; ctx.globalAlpha = op; ctx.lineWidth = S.lw * wgt; ctx.stroke();
      if (S.rim) {
        var on = false, drew = false;
        ctx.beginPath();
        for (i = ia; i <= ib; i++) {
          if (R.hsr[i] > hot && ys[i] <= T.env[i] + 1.2) { if (on) ctx.lineTo(xs[i], ys[i]); else ctx.moveTo(xs[i], ys[i]); on = true; drew = true; }
          else on = false;
        }
        if (drew) {
          ctx.strokeStyle = R5.css(pal.rim);
          ctx.globalAlpha = 0.16; ctx.lineWidth = 4 * wgt; ctx.stroke();
          ctx.globalAlpha = 0.5 + 0.5 * R.vv; ctx.lineWidth = 1.5 * wgt; ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- layer specs ---------- */
  function specs(m) {
    var rnd = R5.rng(9), u = function (x) { return x / m.W.near; }, wu = m.sp * 0.5 / m.W.near;
    var nearPeaks = [], i;
    for (i = 0; i < N; i++) nearPeaks.push([u(m.xs[i]), 0.3, HEIGHTS[i], wu * (0.95 + 0.2 * rnd())]);
    for (i = 0; i < N * 2 + 2; i++) nearPeaks.push([rnd(), 0.5 + rnd() * 0.45, 0.14 + rnd() * 0.2, wu * (0.7 + rnd() * 0.6)]);
    var mid = [], far = [];
    for (i = 0; i < 10; i++) mid.push([(i + 0.3 + rnd() * 0.5) / 10, 0.3 + rnd() * 0.3, 0.4 + rnd() * 0.6, 0.045 + rnd() * 0.03]);
    for (i = 0; i < 7; i++) far.push([(i + 0.2 + rnd() * 0.6) / 7, 0.3 + rnd() * 0.3, 0.5 + rnd() * 0.5, 0.07 + rnd() * 0.04]);
    var nr = m.narrow;
    return {
      near: { rows: nr ? 17 : 22, step: nr ? 4 : 5, b0: 0.5, b1: 0.97, a0: 0.28, a1: 0.13, d0: 0.55, d1: 1, dz: 3.2, cell: 230, fz: 4, seed: 21, peaks: nearPeaks, lw: 1, lineA: 1, fillFar: 1, ticks: true, rim: 0.6 },
      mid: { rows: nr ? 6 : 8, step: 6, b0: 0.42, b1: 0.72, a0: 0.25, a1: 0.07, d0: 0.25, d1: 0.55, dz: 2.6, cell: 300, fz: 3, seed: 5, peaks: mid, lw: 0.9, lineA: 0.6, fillFar: 1, ticks: false, rim: 0 },
      far: { rows: nr ? 3 : 4, step: 8, b0: 0.36, b1: 0.56, a0: 0.22, a1: 0.05, d0: 0.02, d1: 0.28, dz: 2.4, cell: 420, fz: 2.4, seed: 44, peaks: far, lw: 0.8, lineA: 0.5, fillFar: 1, ticks: false, rim: 0 }
    };
  }

  /* ---------- sky bakes ---------- */
  function strip(stops) {
    var c = document.createElement('canvas'); c.width = 1; c.height = 64;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, 1, 64);
    return c;
  }
  function auroraCanvas(m, pal) {
    var amt = +R5.opt('aurora', 1);
    var K = 5, W = m.W.sky, H = m.H;
    var cw = Math.max(40, Math.ceil(W / K)), ch = Math.max(40, Math.ceil(H * 0.7 / K));
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    if (amt <= 0.01) return cv;
    var v = cv.getContext('2d'), dark = pal.dark;
    var wh = [255, 255, 255];
    var c1 = dark ? pal.cyan : R5.mix(pal.cyan, wh, 0.5), c2 = dark ? pal.violet : R5.mix(pal.violet, wh, 0.5), c3 = dark ? R5.mix(pal.violet, pal.amber, 0.55) : R5.mix(pal.amber, wh, 0.55);
    var ribbons = [
      [[0, R5.css(c1, 0)], [0.3, R5.css(c1, 0.5)], [0.62, R5.css(R5.mix(c1, c2, 0.55), 0.3)], [1, R5.css(c2, 0)]],
      [[0, R5.css(c2, 0)], [0.34, R5.css(c2, 0.5)], [0.7, R5.css(c3, 0.24)], [1, R5.css(pal.amber, 0)]]
    ];
    v.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (var r = 0; r < ribbons.length; r++) {
      var sp = strip(ribbons[r]), rnd = R5.rng(31 + r * 17), fold = rnd() * 6;
      for (var i = 0; i < cw; i++) {
        var uu = i / cw, x = i * K;
        var edge = clamp01(uu * 6) * clamp01((1 - uu) * 4);
        var dawnFade = 1 - 0.85 * smooth((uu - 0.55) / 0.4);
        var y0 = H * (0.18 + 0.1 * r) + Math.sin(x * 0.0036 + fold + r * 2.1) * H * 0.09 + Math.sin(x * 0.011 + fold) * H * 0.02;
        var h = H * (0.32 + 0.08 * r) * (0.8 + 0.2 * Math.sin(x * 0.0063 + r * 1.7 + fold));
        var rays = 0.86 + 0.14 * Math.sin(x * 0.045 + fold * 2);
        var a = (0.5 + 0.5 * Math.sin(x * 0.0029 + r * 3.1 + fold)) * edge * dawnFade * rays * (dark ? 1 : 0.8) * amt;
        if (a < 0.02) continue;
        v.globalAlpha = Math.min(1, a);
        v.drawImage(sp, i - 0.5, y0 / K, 2.2, h / K);
      }
    }
    v.globalAlpha = 1;
    return cv;
  }
  function bakeSky(m, pal) {
    var W = m.W.sky, H = m.H, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var au = auroraCanvas(m, pal);
    var rnd0 = R5.rng(77), count = Math.min(260, Math.round(W * H / 15000)), pts = [], i;
    for (i = 0; i < count; i++) pts.push([rnd0() * W, Math.pow(rnd0(), 1.25) * H * 0.62 + 56, rnd0() < 0.16, 0.35 + rnd0() * 0.65, rnd0() < 0.22]);
    tileLayer(laySky, W, Math.round(H * 0.72), dpr, function (ctx, x0, tw, sx) {
      ctx.setTransform(sx, 0, 0, sx, -x0 * sx, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(au, 0, 0, W, Math.round(H * 0.7));
      if (!pal.dark) return;
      for (var q = 0; q < pts.length; q++) {
        var pt = pts[q], px = pt[0], py = pt[1], big = pt[2], a = pt[3];
        if (px < x0 - 4 || px > x0 + tw + 4) continue;
        var fade = 1 - 0.85 * smooth((px / W - 0.55) / 0.4);
        ctx.fillStyle = pt[4] ? R5.css(R5.mix([186, 214, 255], pal.cyan, 0.3), a * fade * (big ? 1 : 0.7)) : 'rgba(238,241,255,' + (a * fade * (big ? 1 : 0.7)).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(px, py, (big ? 1.8 : 1.1) * 0.6, 0, 6.283); ctx.fill();
      }
    });
  }

  /* ---------- bake all (chunked so no single long task) ---------- */
  function bake(only) {
    if (isStatic || !M) return;
    var pal = R5.palette();
    var wgt = +R5.opt('weight', 1) || 1;
    var sig = [M.vw, M.H, pal.dark, R5.css(pal.violet), R5.css(pal.cyan), R5.css(pal.amber), wgt, +R5.opt('aurora', 1), M.k].join('|');
    if (sig === bakeSig && baked && !only) return;
    var token = ++bakeToken, m = M, sp = specs(m);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    function q(v) { return Math.max(0.5, Math.round(v * 4) / 4); }
    var steps = [
      function () { bakeSky(m, pal); },
      function () {
        var T = terrain(sp.far, m.W.far, m.Lh);
        tileLayer(layFar, m.W.far, Math.round(m.Lh * 0.58), q(dpr * 0.7), function (c, x0, tw, sx) { drawTerrain(c, T, pal, x0, tw, sx, m.Lh, wgt); }, undefined, m.H - m.Lh);
      },
      function () {
        var T = terrain(sp.mid, m.W.mid, m.Lh);
        tileLayer(layMid, m.W.mid, Math.round(m.Lh * 0.66), q(dpr * 0.9), function (c, x0, tw, sx) { drawTerrain(c, T, pal, x0, tw, sx, m.Lh, wgt); }, undefined, m.H - m.Lh);
      },
      function () {
        var T = terrain(sp.near, m.W.near, m.Lh);
        tileLayer(layNear, m.W.near, m.Lh, q(dpr), function (c, x0, tw, sx) { drawTerrain(c, T, pal, x0, tw, sx, m.Lh, wgt); }, tilesNear);
        place(m, T);
      },
      function () {
        bakeSig = sig; baked = true;
        sec.classList.add('is-ready');
        lastOp = {}; active = -2; passed = -1; lastDawn = -1;
        cur = target; render(cur, true);
      }
    ];
    var i = 0;
    (function next() {
      if (token !== bakeToken) return;
      if (i >= steps.length) return;
      steps[i++]();
      setTimeout(next, 16);
    })();
  }

  /* ---------- milestone placement on the baked near layer ---------- */
  function place(m, T) {
    var xs = T.xs, env = T.env, n = T.n, sm = new Float32Array(n), i, j;
    for (i = 0; i < n; i++) {
      var a = 0, c = 0;
      for (j = -4; j <= 4; j++) { if (env[i + j] !== undefined) { a += env[i + j]; c++; } }
      sm[i] = a / c;
    }
    m.pos = []; m.p = []; m.sw = [];
    items.forEach(function (li, idx) {
      var xi = m.xs[idx], best = -1, bv = 1e9;
      for (i = 0; i < n; i++) {
        if (Math.abs(xs[i] - xi) <= m.sp * 0.14 && sm[i] < bv) { bv = sm[i]; best = i; }
      }
      if (best < 0) best = Math.round((xi + 8) / T.S.step);
      var px = xs[best], py = (m.H - m.Lh) + sm[best];
      li.style.left = px.toFixed(1) + 'px';
      li.style.top = py.toFixed(1) + 'px';
      m.pos.push(px);
      m.sw = m.sw || []; var sp = li.querySelector('.ms-spot'); m.sw[idx] = sp ? sp.offsetWidth + 14 : 160;
      m.p.push(clamp01((px - m.vw / 2) / m.D));
    });
    ticks.forEach(function (t, idx) { t.style.left = (m.p[idx] * 100).toFixed(2) + '%'; });
    metrics();
  }

  /* ---------- render (transform / opacity only) ---------- */
  function setT(el, x, y) { el.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)'; }
  function setOp(key, el, v) {
    v = Math.round(v * 100) / 100;
    if (lastOp[key] === v) return;
    lastOp[key] = v; el.style.opacity = v;
  }
  function render(p, force) {
    if (!M || !baked) return;
    var m = M, d = smooth((p - 0.9) / 0.1);
    var x = -p * m.D;
    setT(layNear, x, d * m.Lh * 0.66);
    setT(layMid, x * m.s.mid, d * m.Lh * 0.58);
    setT(layFar, x * m.s.far, d * m.Lh * 0.5);
    setT(laySky, x * m.s.sky, 0);
    var dw = smooth((p - 0.5) / 0.45);
    if (dawn) setOp('dawn', dawn, dw);
    if (head) setOp('head', head, 1 - clamp01(p / 0.055));
    if (hud) setOp('hud', hud, 1 - d);
    setOp('ms', msList, 1 - clamp01(d * 1.6));
    hudMark.style.transform = 'translate3d(' + (p * trackW).toFixed(1) + 'px,0,0)';
    hudFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    /* active summit: nearest to the screen centre */
    var cx = m.vw / 2 + p * m.D, best = -1, bd = 1e9, i;
    for (i = 0; i < N; i++) { var dd = Math.abs((m.pos ? m.pos[i] : m.xs[i]) - cx); if (dd < bd) { bd = dd; best = i; } }
    if (m.narrow) { if (p < 0.012 || p > 0.955) best = -1; }
    else if (bd > m.sp * 0.42 || p > 0.955) best = -1;
    if (best !== active) {
      if (active >= 0) { items[active].classList.remove('is-on'); setLinks(active, false); }
      active = best;
      if (active >= 0) { items[active].classList.add('is-on'); setLinks(active, true); }
      sec.classList.toggle('has-on', active >= 0);
      ticks.forEach(function (t, idx) { t.classList.toggle('is-now', idx === active); t.setAttribute('aria-current', idx === active ? 'true' : 'false'); });
      var tag = active >= 0 ? items[active].querySelector('.ms-spot') : null;
      if (hudNow) {
        hudNow.querySelector('b').textContent = tag ? tag.querySelector('b').textContent : '';
        hudNow.querySelector('em').textContent = tag ? tag.querySelector('em').textContent : '';
      }
    }
    /* edge fade for labels; narrow screens keep the active card centred */
    if (m.pos) {
      for (i = 0; i < N; i++) {
        var sx = m.pos[i] + x, f = 1;
        if (i !== active) f = clamp01((sx - 14) / 70) * clamp01((m.vw - 16 - (sx + 12 + (m.sw[i] || 160))) / 70 + 0.15);
        setOp('ms' + i, items[i], f);
      }
      if (m.narrow && active >= 0) { dock(active, Math.round(m.vw / 2 - (m.pos[active] + x))); }
    }
    var pc = 0;
    if (m.p) for (i = 0; i < N; i++) if (m.p[i] <= p + 0.002) pc = i + 1;
    if (pc !== passed) { passed = pc; ticks.forEach(function (t, idx) { t.classList.toggle('is-past', idx < pc); }); }
    if (hudCue) setOp('cue', hudCue, 1 - clamp01((p - 0.008) / 0.03));
    if (hudNow) setOp('now', hudNow, clamp01((p - 0.02) / 0.03));
  }
  var docked = -1;
  function dock(i, dx) {
    var el = items[i].querySelector('.ms-dock');
    if (docked >= 0 && docked !== i) { var o = items[docked].querySelector('.ms-dock'); if (o) o.style.transform = ''; }
    docked = i; el.style.transform = 'translate3d(' + dx + 'px,0,0)';
  }
  function setLinks(i, on) {
    [].forEach.call(items[i].querySelectorAll('a'), function (a) { if (on) a.removeAttribute('tabindex'); else a.setAttribute('tabindex', '-1'); });
  }

  function readTarget() { target = clamp01((window.scrollY - secTop) / range); }
  function frame(now) {
    var dt = lastT ? Math.min(now - lastT, 64) : 16; lastT = now;
    var tau = root.getAttribute('data-motion') === 'calm' ? 170 : 90;
    var k = 1 - Math.exp(-dt / tau);
    cur += (target - cur) * k;
    if (Math.abs(target - cur) < 0.0003) cur = target;
    render(cur);
    if (cur !== target) requestAnimationFrame(frame); else { running = false; lastT = 0; }
  }
  function kick() { if (!running && baked && !isStatic) { running = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', function () {
    if (isStatic) return;
    readTarget(); kick();
  }, { passive: true });

  /* ---------- controls: tick buttons, focus, static switch ---------- */
  function goTo(i) {
    if (!M || !M.p) return;
    var y = secTop + clamp01(M.p[i]) * range;
    window.scrollTo({ top: y, behavior: R5.motionOff() ? 'auto' : 'smooth' });
  }
  ticks.forEach(function (t, i) { t.addEventListener('click', function () { goTo(i); }); });
  items.forEach(function (li, i) {
    li.addEventListener('focusin', function () {
      if (isStatic || !M || !M.p || li.classList.contains('is-on')) return;
      window.scrollTo({ top: secTop + M.p[i] * range, behavior: 'auto' });
    });
  });
  items.forEach(function (li, i) { setLinks(i, false); });

  function applyAttrs() {
    var labels = R5.opt('labels', 'all'), cap = R5.opt('caption', 'card'), pl = R5.opt('panlen', 'standard');
    var hudOn = R5.opt('hud', true); hudOn = hudOn === true || hudOn === 'on' || hudOn === 'true';
    sec.setAttribute('data-labels', labels); sec.setAttribute('data-caption', cap); sec.setAttribute('data-panlen', pl);
    sec.classList.toggle('no-hud', !hudOn);
  }
  function setStatic(v) {
    isStatic = v;
    root.classList.toggle('r5-static', v);
    items.forEach(function (li, i) { setLinks(i, v); });
    if (v) { items.forEach(function (li) { li.style.left = ''; li.style.top = ''; li.style.opacity = ''; li.classList.remove('is-on'); var dk = li.querySelector('.ms-dock'); if (dk) dk.style.transform = ''; }); active = -2; lastOp = {}; docked = -1; }
  }

  /* ---------- lifecycle ---------- */
  var rt, relayoutT;
  function relayout(force) {
    setStatic(R5.motionOff());
    applyAttrs();
    if (isStatic) { bakeToken++; return; }
    var m = layout();
    if (!m) return;
    var prev = M;
    M = m;
    metrics();
    if (prev && prev.p && !force && Math.abs(prev.vw - m.vw) < 2 && Math.abs(prev.H - m.H) < 80) { M.p = prev.p; M.pos = prev.pos; M.H = prev.H; M.Lh = prev.Lh; }
    readTarget();
    if (force || !prev || !baked || !M.p || Math.abs(prev.vw - m.vw) >= 2 || Math.abs(prev.H - m.H) >= 80 || prev.k !== m.k) { baked = false; bakeSig = ''; bake(); }
    else { bake(); cur = target; render(cur, true); }
  }
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { relayout(false); }, 160); });
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { clearTimeout(relayoutT); relayoutT = setTimeout(function () { if (!isStatic) { metrics(); readTarget(); } }, 120); });
    ro.observe(document.body);
  }
  document.addEventListener('rm:themechange', function () { if (!isStatic) { clearTimeout(rt); rt = setTimeout(function () { bake(); }, 60); } });
  document.addEventListener('rm:tune', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    applyAttrs();
    var wasStatic = isStatic;
    var nowStatic = R5.motionOff();
    clearTimeout(rt);
    rt = setTimeout(function () { relayout(nowStatic !== wasStatic); }, 120);
    if (ch.indexOf('panlen') > -1) setTimeout(function () { metrics(); readTarget(); kick(); }, 80);
  });

  function boot() { if (!M || !baked) relayout(true); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { metrics(); readTarget(); }, function () {});
  window.addEventListener('load', function () { metrics(); readTarget(); });
  var start = function () { setTimeout(boot, 120); };
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
