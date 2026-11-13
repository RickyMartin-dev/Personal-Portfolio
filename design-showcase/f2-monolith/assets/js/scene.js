/* Fogline — monochrome Manhattan skyline above a sea of fog.
   Windows light floor by floor, rising from the fog line, as the page scrolls. */
(function () {
  'use strict';
  var canvas = document.getElementById('scene');
  var host = document.getElementById('scene-host');
  if (!canvas && !host) return;
  var ctx = canvas ? canvas.getContext('2d') : null;
  var root = document.documentElement;
  var compact = !!canvas;
  var stage = document.getElementById('stage');
  var litEl = document.getElementById('lit-pct');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var PAL = {
    dark: {
      bg: '#0b0d12', skyTop: '#05070a', skyHor: '#1a202b',
      glow: 'rgba(150,172,210,0.20)', line: 'rgba(190,206,236,0.12)',
      towers: ['#222936', '#121620', '#06070a'],
      shade: 0.42, sparse: 1, rose: '240,150,150', roseA: 0.42, rim: '255,190,175,0.55',
      fogBase: '#151a23',
      fogTones: [[128,142,170,0.17], [74,84,108,0.20]],
      win: '246,222,180', win2: '222,234,255', winA: 0.7, dim: 'rgba(160,180,215,0.055)',
      stars: true
    },
    light: {
      bg: '#f2f2f3', skyTop: '#e4e4e7', skyHor: '#fcfcfc',
      glow: 'rgba(255,255,255,0.95)', line: 'rgba(255,255,255,0.9)',
      towers: ['#e2e4e9', '#cdd0d8', '#aeb3bf'],
      shade: 0.30, sparse: 0.3, sideA: [0.10, 0.16, 0.24], rose: '222,120,128', roseA: 0.78, rim: '255,170,175,0.85',
      fogBase: '#f9f9fa',
      fogTones: [[255,255,255,0.62], [206,208,218,0.5]],
      win: '92,116,156', win2: '150,170,205', winA: 0.5, dim: 'rgba(60,76,104,0.05)',
      stars: false
    }
  };

  var W = 0, H = 0, dpr = 1, fy = 0, pal, themeName;
  var skyBuf, layBuf = [], fogTex = {}, winCv = [], winCtx = [], lays = [], fogEls = [], skyEl = null, lastBase = -9, stageTop = 0, stageSpan = 1;
  var towers = [[], [], []];
  var wins = [{}, {}, {}];
  var stars = [];
  var ps = compact ? 0.7 : 0, pt = ps;
  var visible = true, rafId = 0, lastPct = -1;
  var LS = [0.85, 1.2, 1.15];
  var CW = 6.4;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); return c; }

  /* ---------- tower construction ---------- */
  function T(L, glow) { return { L: L, glow: !!glow, path: new Path2D(), pieces: [], top: 1e9, x0: 1e9, x1: -1e9 }; }
  function bound(t, x0, x1, y0) { if (x0 < t.x0) t.x0 = x0; if (x1 > t.x1) t.x1 = x1; if (y0 < t.top) t.top = y0; }
  function rect(t, x0, y0, x1, y1, win) {
    t.path.rect(x0, y0, x1 - x0, y1 - y0);
    t.pieces.push({ k: 0, x0: x0, x1: x1, y0: y0, y1: y1, win: win });
    bound(t, x0, x1, y0);
  }
  function tri(t, xl, xr, yb, xa, ya) {
    t.path.moveTo(xl, yb); t.path.lineTo(xa, ya); t.path.lineTo(xr, yb); t.path.closePath();
    bound(t, xl, xr, ya);
  }
  function taper(t, xc, wb, yb, wt, yt) {
    t.path.moveTo(xc - wb / 2, yb); t.path.lineTo(xc - wt / 2, yt); t.path.lineTo(xc + wt / 2, yt); t.path.lineTo(xc + wb / 2, yb); t.path.closePath();
    t.pieces.push({ k: 1, xc: xc, wb: wb, wt: wt, y0: yt, y1: yb, win: true });
    bound(t, xc - wb / 2, xc + wb / 2, yt);
  }
  function water(t, cx, yTop, sz) {
    var lw = Math.max(1, sz * 0.12);
    rect(t, cx - sz * 0.46, yTop - sz * 0.42, cx - sz * 0.46 + lw, yTop, false);
    rect(t, cx + sz * 0.46 - lw, yTop - sz * 0.42, cx + sz * 0.46, yTop, false);
    rect(t, cx - sz * 0.5, yTop - sz * 1.3, cx + sz * 0.5, yTop - sz * 0.42, false);
    tri(t, cx - sz * 0.58, cx + sz * 0.58, yTop - sz * 1.3, cx, yTop - sz * 1.78);
  }
  function ext(t, y) {
    var a = 1e9, b = -1e9;
    for (var i = 0; i < t.pieces.length; i++) {
      var p = t.pieces[i];
      if (!p.win || y < p.y0 || y > p.y1) continue;
      var x0, x1;
      if (p.k === 0) { x0 = p.x0; x1 = p.x1; }
      else { var f = (p.y1 - y) / (p.y1 - p.y0), half = (p.wb + (p.wt - p.wb) * f) / 2; x0 = p.xc - half; x1 = p.xc + half; }
      if (x0 < a) a = x0; if (x1 > b) b = x1;
    }
    return b > a ? [a, b] : null;
  }

  var B = 0; // base y (below canvas)
  function deco(L, cx, w, h, glow) {
    var t = T(L, glow), tiers = [[1, 0.5], [0.8, 0.72], [0.6, 0.86], [0.38, 0.94]];
    tiers.forEach(function (r) { rect(t, cx - w * r[0] / 2, fy - h * r[1], cx + w * r[0] / 2, B, true); });
    tri(t, cx - w * 0.07, cx + w * 0.07, fy - h * 0.94, cx, fy - h);
    return t;
  }
  function crown(L, cx, w, h, glow) {
    var t = T(L, glow);
    rect(t, cx - w / 2, fy - h * 0.72, cx + w / 2, B, true);
    for (var k = 0; k < 4; k++) {
      var rx = w * (0.5 - 0.095 * k), yb = fy - h * (0.7 + 0.05 * k), ry = h * 0.085;
      t.path.ellipse(cx, yb, rx, ry, 0, Math.PI, Math.PI * 2);
      t.path.closePath();
      bound(t, cx - rx, cx + rx, yb - ry);
    }
    tri(t, cx - w * 0.04, cx + w * 0.04, fy - h * 0.93, cx, fy - h);
    return t;
  }
  function needle(L, cx, w, h, glow) {
    var t = T(L, glow);
    rect(t, cx - w / 2, fy - h * 0.975, cx + w / 2, B, true);
    rect(t, cx - w * 0.32, fy - h * 0.99, cx + w * 0.32, fy - h * 0.975, false);
    tri(t, cx - w * 0.06, cx + w * 0.06, fy - h * 0.99, cx, fy - h);
    return t;
  }
  function spire(L, cx, w, h, glow) {
    var t = T(L, glow);
    rect(t, cx - w / 2, fy - h * 0.52, cx + w / 2, B, true);
    taper(t, cx, w, fy - h * 0.52, w * 0.34, fy - h * 0.9);
    rect(t, cx - w * 0.17, fy - h * 0.94, cx + w * 0.17, fy - h * 0.9, false);
    tri(t, cx - w * 0.05, cx + w * 0.05, fy - h * 0.94, cx, fy - h);
    return t;
  }
  function slab(L, cx, w, h, roof, glow) {
    var t = T(L, glow), x0 = cx - w / 2, x1 = cx + w / 2, top = fy - h, u = Math.max(3, w * 0.09);
    if (roof === 'slant') {
      var lift = w * 0.4;
      t.path.moveTo(x0, B); t.path.lineTo(x0, top); t.path.lineTo(x1, top - lift); t.path.lineTo(x1, B); t.path.closePath();
      t.pieces.push({ k: 0, x0: x0, x1: x1, y0: top - lift * 0.3, y1: B, win: true });
      bound(t, x0, x1, top - lift);
      return t;
    }
    rect(t, x0, top, x1, B, true);
    if (roof === 'step') rect(t, cx - w * 0.32, top - h * 0.12, cx + w * 0.32, top, true);
    else if (roof === 'flat') rect(t, cx - w * 0.22, top - u * 1.4, cx + w * 0.22, top, false);
    else if (roof === 'water') water(t, cx + w * 0.18, top, Math.max(5, w * 0.3));
    else if (roof === 'spire') tri(t, cx - w * 0.05, cx + w * 0.05, top, cx, top - w * 0.9);
    return t;
  }

  function build() {
    B = H + 4;
    var mob = W < 700;
    var r = rng(compact ? 21 : 9);
    var u = clamp(W / 26, 15, 56);
    var wsc = mob ? 1.45 : 1;
    var hsc = compact ? 1.7 : (mob ? 0.95 : 1);
    towers = [[], [], []];
    CW = mob ? 4.6 : 7.2;
    var roofs = ['flat', 'flat', 'water', 'step', 'flat', 'spire', 'slant', 'step'];

    function fill(L, xa, xb, wLo, wHi, hLo, hHi, step, pTall) {
      var x = xa;
      while (x < xb) {
        var w = (wLo + r() * (wHi - wLo)) * u * wsc, h = (hLo + r() * (hHi - hLo)) * H * hsc;
        var roof = roofs[(r() * roofs.length) | 0], q = r();
        if (L === 0 && roof === 'water') roof = 'flat';
        if (!compact) { var xr = x / W; if (xr < 0.7) { var cap = H * 0.19 / (q < pTall ? 2.2 : q < pTall * 1.7 ? 1.35 : 1.45); if (h > cap) h = cap * (0.55 + r() * 0.45); } }
        var tw;
        if (q < pTall) tw = needle(L, x + w / 2, w * 0.55, h * (1.5 + r() * 0.7), false);
        else if (q < pTall * 1.7) tw = spire(L, x + w / 2, w * 0.7, h * 1.35, false);
        else tw = slab(L, x + w / 2, w, h, roof, false);
        towers[L].push(tw);
        x += w * (step[0] + r() * (step[1] - step[0]));
      }
    }
    fill(0, -u, W + u, 0.4, 0.95, 0.07, 0.2, [0.7, 1.3], 0.2);
    fill(1, -u, W + u, 0.5, 1.2, 0.035, 0.13, [0.75, 1.2], 0.14);
    // near layer: graphite masses on the flanks
    fill(2, -u * 1.5, W * (mob ? 0.2 : 0.17), 0.8, 1.6, 0.05, 0.12, [0.95, 1.2], 0);
    fill(2, W * (mob ? 0.92 : 0.94), W + u * 2, 0.8, 1.4, 0.04, 0.09, [0.95, 1.2], 0);

    var X = function (f) { return W * f; };
    var m8 = mob ? 0.8 : 1;
    var hm = mob ? 0.52 : 1;
    var nw = 0.55 * u * wsc;
    var heroes = mob ? [
      needle(1, X(0.60), nw, 0.62 * H * hm, true),
      deco(1, X(0.74), 1.15 * u * wsc * 0.8, 0.68 * H * hm, true),
      needle(1, X(0.88), nw, 0.78 * H * hm, true),
      spire(1, X(0.46), 0.9 * u * wsc * 0.8, 0.5 * H * hm, true),
      crown(1, X(0.33), 0.85 * u * wsc * 0.8, 0.38 * H * hm, true),
      needle(0, X(0.97), nw * 0.8, 0.7 * H * hm, true),
      spire(0, X(0.67), 0.7 * u * wsc, 0.62 * H * hm, true),
      needle(0, X(0.2), nw * 0.8, 0.48 * H * hm, true)
    ] : [
      needle(1, X(0.80), nw, 0.66 * H, true),
      deco(1, X(0.875), 1.15 * u, 0.62 * H, true),
      needle(1, X(0.94), 0.5 * u, 0.7 * H, true),
      spire(1, X(0.76), 0.9 * u, 0.46 * H, true),
      crown(1, X(0.69), 0.85 * u, 0.17 * H, true),
      slab(1, X(0.5), 1.2 * u, 0.1 * H, 'slant', false),
      needle(0, X(0.6), 0.5 * u, 0.15 * H, true),
      spire(0, X(0.77), 0.6 * u, 0.52 * H, true),
      needle(0, X(0.86), 0.42 * u, 0.58 * H, true),
      deco(0, X(0.4), 0.8 * u, 0.15 * H, true)
    ];
    heroes.forEach(function (t) { towers[t.L].push(t); });
    towers.forEach(function (list) { list.sort(function (a, b) { return (a.glow ? 1 : 0) - (b.glow ? 1 : 0); }); });

    if (pal.sideA) {
      var gl3 = [];
      towers.forEach(function (l) { l.forEach(function (t) { if (t.glow) gl3.push(t); }); });
      gl3.sort(function (a, b) { return a.top - b.top; });
      gl3.forEach(function (t, i) { if (i > 2) t.glow = false; });
    }
    var tip = H;
    towers.forEach(function (list) { list.forEach(function (t) {
      if (t.top < tip) tip = t.top;
      t.gl = (fy - t.top) * 0.16;
    }); });

    // windows
    wins = [0, 1, 2].map(function (L) {
      var xs = [], ys = [], ws = [], hs = [], th = [], al = [];
      var cw = CW * LS[L], ww = Math.max(2, Math.round(cw * 0.5)), wh = Math.max(3, Math.round(cw * 0.7)), rp = Math.round(cw * 1.4), mg = cw * 0.7;
      var dx = [], dy = [], dw = [], dh = [], tn = [];
      var span = Math.max(40, fy - tip);
      towers[L].forEach(function (t) {
        var occ = (L === 0 ? 0.5 : L === 1 ? 0.78 : 1) * (0.3 + r() * 0.7) * pal.sparse;
        var yLim = H + 4;
        for (var y = t.top + rp; y < yLim; y += rp) {
          var e = ext(t, y); if (!e) continue;
          var n = Math.floor((e[1] - e[0] - 2 * mg) / cw); if (n < 1) continue;
          var sx = (e[0] + e[1]) / 2 - n * cw / 2 + (cw - ww) / 2;
          var rowOn = r() < (L === 1 ? 0.72 : L === 0 ? 0.55 : 0.8);
          var rowT = clamp((fy - y) / span, 0, 1.2);
          for (var j = 0; j < n; j++) {
            var x = sx + j * cw;
            x = Math.round(x); dx.push(x); dy.push(Math.round(y)); dw.push(ww); dh.push(wh);
            if (rowOn && r() < (L === 1 ? 0.5 : 0.6) * occ) {
              tn.push(r() < 0.13 ? 1 : 0);
              xs.push(x); ys.push(Math.round(y)); ws.push(ww); hs.push(wh);
              th.push(Math.max(0, rowT + (r() - 0.35) * 0.16 + (x / W) * 0.05));
              al.push(0.45 + r() * 0.55);
            }
          }
        }
      });
      return { x: Float32Array.from(xs), y: Float32Array.from(ys), w: Float32Array.from(ws), h: Float32Array.from(hs), th: Float32Array.from(th), a: Float32Array.from(al), n: xs.length, dim: [dx, dy, dw, dh], lit: new Float32Array(xs.length), c: Uint8Array.from(tn) };
    });

    // stars
    stars = [];
    var sr = rng(77), sn = Math.round(W * fy / 5200);
    for (var i = 0; i < sn; i++) stars.push({ x: sr() * W, y: sr() * fy * 0.62, r: sr() < 0.12 ? 1.5 : 0.9, a: 0.25 + sr() * 0.6, ph: sr() * 6.28 });
  }

  /* ---------- baked layers ---------- */
  function bake() {
    var c;
    skyBuf = mk(W, H); c = skyBuf.getContext('2d'); c.scale(dpr, dpr);
    var hy = fy - H * (compact ? 0.3 : 0.2);
    var g = c.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyHor);
    c.fillStyle = g; c.fillRect(0, 0, W, hy + 1);
    c.fillStyle = pal.skyHor; c.fillRect(0, hy, W, H - hy);
    g = c.createLinearGradient(0, hy - H * 0.12, 0, hy + H * 0.1);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, pal.glow); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, hy - H * 0.12, W, H * 0.22);
    g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.3, pal.line); g.addColorStop(0.7, pal.line); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, hy + H * 0.012, W, 1.2);
    if (pal.stars) {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], f = clamp((fy * 0.7 - s.y) / (fy * 0.25), 0, 1);
        c.fillStyle = 'rgba(225,232,248,' + (s.a * f * 0.8).toFixed(3) + ')';
        c.fillRect(s.x, s.y, s.r, s.r);
      }
    }

    for (var L = 0; L < 3; L++) {
      var b = mk(W, H), k = b.getContext('2d');
      if (L === 0) k.drawImage(skyBuf, 0, 0);
      k.scale(dpr, dpr);
      towers[L].forEach(function (t) {
        k.fillStyle = pal.towers[L]; k.fill(t.path);
        k.save(); k.clip(t.path);
        if (t.glow) {
          var bw = Math.max(2, Math.ceil(t.x1 - t.x0)), bh = Math.max(2, Math.ceil(t.gl + 2));
          var tm = mk(bw, bh), tc = tm.getContext('2d'); tc.scale(dpr, dpr);
          var gl = tc.createLinearGradient(0, 0, 0, t.gl);
          gl.addColorStop(0, 'rgba(' + pal.rose + ',' + pal.roseA + ')');
          gl.addColorStop(0.4, 'rgba(' + pal.rose + ',' + (pal.roseA * 0.35) + ')');
          gl.addColorStop(1, 'rgba(' + pal.rose + ',0)');
          tc.fillStyle = gl; tc.fillRect(0, 0, bw, bh);
          tc.globalCompositeOperation = 'destination-in';
          var hg = tc.createLinearGradient(0, 0, bw, 0);
          hg.addColorStop(0, 'rgba(0,0,0,1)'); hg.addColorStop(0.4, 'rgba(0,0,0,0.9)'); hg.addColorStop(0.78, 'rgba(0,0,0,0)');
          tc.fillStyle = hg; tc.fillRect(0, 0, bw, bh);
          k.drawImage(tm, t.x0, t.top, bw, bh);
        }
        if (pal.sideA) {
          var tw0 = t.x1 - t.x0, sx = t.x0 + tw0 * 0.6;
          k.fillStyle = 'rgba(255,255,255,' + (0.16 + 0.1 * L).toFixed(2) + ')'; k.fillRect(t.x0, t.top, sx - t.x0, H - t.top + 4);
          k.fillStyle = 'rgba(58,70,96,' + pal.sideA[L] + ')'; k.fillRect(sx, t.top, t.x1 - sx, H - t.top + 4);
          var vg = k.createLinearGradient(0, t.top, 0, fy + H * 0.1);
          vg.addColorStop(0, 'rgba(255,255,255,0.22)'); vg.addColorStop(1, 'rgba(255,255,255,0)');
          k.fillStyle = vg; k.fillRect(t.x0, t.top, tw0, fy + H * 0.1 - t.top);
        } else {
          var sh = k.createLinearGradient(t.x0, 0, t.x1, 0);
          sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.42, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,' + pal.shade + ')');
          k.fillStyle = sh; k.fillRect(t.x0, t.top, t.x1 - t.x0, H - t.top + 4);
        }
        k.restore();
        if (t.glow) {
          k.save(); k.beginPath(); k.rect(t.x0 - 2, t.top - 2, t.x1 - t.x0 + 4, t.gl * 0.3 + 2); k.clip();
          k.strokeStyle = 'rgba(' + pal.rim + ')'; k.lineWidth = 1; k.stroke(t.path); k.restore();
        }
      });
      var d = wins[L].dim; k.fillStyle = pal.dim; k.beginPath();
      for (var j = 0; j < d[0].length; j++) k.rect(d[0][j], d[1][j], d[2][j], d[3][j]);
      k.fill();
      layBuf[L] = b;
    }

    var tw = Math.round(W * 1.5);
    fogTex.A = fog(tw, H * 0.3, 3, 0.9, 'band');
    fogTex.B = fog(tw, H * 0.32, 8, 1.05, 'band');
    fogTex.F = fog(tw, H - (fy - H * 0.1), 12, 1.25, 'front');
    fogTex.tw = tw;
  }

  function fog(w, h, seed, dens, mode) {
    var cv = mk(w, h), c = cv.getContext('2d'), r = rng(seed * 31);
    c.scale(dpr, dpr);
    if (mode === 'front') {
      var g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, hexA(pal.fogBase, 0)); g.addColorStop(0.22, hexA(pal.fogBase, 0.28)); g.addColorStop(0.5, hexA(pal.fogBase, 0.9)); g.addColorStop(0.7, pal.fogBase); g.addColorStop(1, pal.bg);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
    var n = Math.round(w / (mode === 'front' ? 30 : 60) * dens), gain = mode === 'front' ? 1.7 : 1.15;
    for (var i = 0; i < n; i++) {
      var tone = pal.fogTones[r() < 0.55 ? 0 : 1];
      var rx = (130 + r() * 360) * (W < 700 ? 0.7 : 1), ry = rx * (0.1 + r() * 0.16);
      var cy = ry * 1.05 + r() * h * (mode === 'front' ? 0.4 : 0.3);
      var cx = r() * w;
      for (var o = -1; o <= 1; o++) {
        c.save(); c.translate(cx + o * w, cy); c.scale(1, ry / rx);
        var rg = c.createRadialGradient(0, 0, 0, 0, 0, rx);
        rg.addColorStop(0, 'rgba(' + tone[0] + ',' + tone[1] + ',' + tone[2] + ',' + Math.min(0.9, tone[3] * gain) + ')');
        rg.addColorStop(1, 'rgba(' + tone[0] + ',' + tone[1] + ',' + tone[2] + ',0)');
        c.fillStyle = rg; c.beginPath(); c.arc(0, 0, rx, 0, 6.2832); c.fill(); c.restore();
      }
    }
    if (mode === 'band') {
      c.globalCompositeOperation = 'destination-in';
      var m = c.createLinearGradient(0, 0, 0, h);
      m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = m; c.fillRect(0, 0, w, h);
    }
    return cv;
  }

  /* ---------- windows ---------- */
  function drawWins(c, L, base) {
    var w = wins[L], lit = w.lit, i, tot = 0;
    for (i = 0; i < w.n; i++) {
      var v = (base - w.th[i]) / 0.15;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      lit[i] = v; tot += v;
    }
    w.tot = tot;
    var NB = 6, b, col;
    for (col = 0; col < 2; col++) {
      var rgb = col ? pal.win2 : pal.win;
      for (b = 0; b < NB; b++) {
        var lo = b / NB, hi = (b + 1) / NB, any = false;
        c.beginPath();
        for (i = 0; i < w.n; i++) {
          if (w.c[i] !== col) continue;
          var q = lit[i] * w.a[i];
          if (q <= 0) continue;
          if (q > lo && q <= hi + (b === NB - 1 ? 1 : 0)) { c.rect(w.x[i], w.y[i], w.w[i], w.h[i]); any = true; }
        }
        if (any) { c.fillStyle = 'rgba(' + rgb + ',' + (pal.winA * (0.28 + 0.72 * (b + 1) / NB) * (L === 0 ? 0.7 : 1)).toFixed(3) + ')'; c.fill(); }
      }
    }
  }

  function updatePct() {
    if (!litEl) return;
    var tot = 0, cnt = 0;
    for (var L = 0; L < 3; L++) { tot += wins[L].tot || 0; cnt += wins[L].n; }
    var pct = Math.round(cnt ? tot / cnt * 100 : 0);
    if (pct !== lastPct) { lastPct = pct; litEl.textContent = ('00' + pct).slice(-3) + ' %'; }
  }

  function renderWins(force) {
    var base = ps * 1.15 + 0.05;
    if (!force && Math.abs(base - lastBase) < 0.022) return;
    lastBase = base;
    for (var L = 0; L < 3; L++) {
      var c = winCtx[L];
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(layBuf[L], 0, 0);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWins(c, L, base);
    }
    updatePct();
  }

  /* ---------- compact: one static composite ---------- */
  function renderCompact() {
    var p = ps;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(skyBuf, 0, 0);
    var base = p * 1.15 + 0.05, tw = fogTex.tw;
    var fogs = [[fogTex.A, fy - H * 0.26 + p * H * 0.02, 0.7, 0], [fogTex.B, fy - H * 0.2 + p * H * 0.035, 0.85, tw * 0.37]];
    for (var L = 0; L < 3; L++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layBuf[L], 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWins(ctx, L, base);
      if (L < 2) {
        var f = fogs[L]; ctx.globalAlpha = f[2];
        for (var x = -f[3]; x < W; x += tw) ctx.drawImage(f[0], x, f[1], tw, f[0].height / dpr);
        ctx.globalAlpha = 1;
      }
    }
    ctx.drawImage(fogTex.F, -tw * 0.21, fy - H * 0.1 + p * H * 0.055, tw, fogTex.F.height / dpr);
    ctx.drawImage(fogTex.F, tw * 0.79, fy - H * 0.1 + p * H * 0.055, tw, fogTex.F.height / dpr);
    updatePct();
  }

  /* ---------- home: DOM layers moved by transform only ---------- */
  var copy = document.querySelector('.hero-copy'), copyOn = true;
  function mkFog(tex, cls, dur, rev) {
    var wrap = document.createElement('div'); wrap.className = 'fg ' + cls;
    var inner = document.createElement('div'); inner.className = 'fg-in';
    var cv = document.createElement('canvas'); cv.width = tex.width * 2; cv.height = tex.height;
    var c = cv.getContext('2d'); c.drawImage(tex, 0, 0); c.drawImage(tex, tex.width, 0);
    cv.style.width = (fogTex.tw * 2) + 'px'; cv.style.height = (tex.height / dpr) + 'px';
    inner.style.setProperty('--tw', '-' + fogTex.tw + 'px');
    inner.style.animationDuration = dur + 's';
    if (rev) inner.style.animationDirection = 'reverse';
    inner.appendChild(cv); wrap.appendChild(inner);
    return wrap;
  }
  function mountHome() {
    host.textContent = '';
    host.style.backgroundColor = pal.skyTop;
    fogEls = [];
    var fA = mkFog(fogTex.A, 'fgA', 240, false), fB = mkFog(fogTex.B, 'fgB', 170, true), fF = mkFog(fogTex.F, 'fgF', 130, false);
    fA.style.top = (fy - H * 0.26) + 'px'; fB.style.top = (fy - H * 0.2) + 'px'; fF.style.top = (fy - H * 0.1) + 'px';
    fogEls = [fA, fB, fF];
    lays = []; winCv = []; winCtx = [];
    for (var L = 0; L < 3; L++) {
      var w = document.createElement('div'); w.className = 'lay';
      var wc = document.createElement('canvas'); wc.className = 'ly'; wc.width = layBuf[L].width; wc.height = layBuf[L].height;
      w.appendChild(wc); winCv.push(wc); winCtx.push(wc.getContext('2d')); lays.push(w);
      host.appendChild(w);
      if (L === 0) host.appendChild(fA); if (L === 1) host.appendChild(fB);
    }
    host.appendChild(fF);
  }
  function applyScroll() {
    var p = ps, i;
    var sink = [0.07, 0.14, 0.24], thin = [0.55, 0.6, 0.5];
    for (i = 0; i < 3; i++) {
      fogEls[i].style.transform = 'translate3d(0,' + (p * sink[i] * H).toFixed(1) + 'px,0)';
      fogEls[i].style.opacity = (1 - p * thin[i]).toFixed(3);
    }
    renderWins(false);
    if (copy) {
      var k = clamp((p - 0.62) / 0.36, 0, 1); k = k * k * (3 - 2 * k);
      copy.style.opacity = (1 - k).toFixed(3);
      copy.style.transform = 'translate3d(0,' + (-k * 36).toFixed(1) + 'px,0)';
      var on = k < 0.92;
      if (on !== copyOn) { copyOn = on; copy.style.visibility = on ? '' : 'hidden'; }
    }
  }

  function target() {
    if (compact) return 0.7;
    return clamp(((window.pageYOffset || 0) - stageTop) / stageSpan, 0, 1);
  }

  function frame() {
    rafId = 0;
    var d = pt - ps;
    if (mqReduce.matches || Math.abs(d) < 0.0006) ps = pt; else ps += d * 0.14;
    applyScroll();
    if (ps !== pt) rafId = requestAnimationFrame(frame);
  }
  function kick() { if (!compact && !rafId) rafId = requestAnimationFrame(frame); }

  function setup() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var box = compact ? canvas : host;
    var rc = box.getBoundingClientRect();
    W = Math.round(rc.width) || window.innerWidth;
    H = Math.round(rc.height) || window.innerHeight;
    themeName = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    pal = PAL[themeName];
    fy = Math.round(H * (compact ? 0.8 : (W < 700 ? 0.9 : 0.8)));
    if (!compact) {
      var sr = stage.getBoundingClientRect();
      stageTop = sr.top + (window.pageYOffset || 0);
      stageSpan = Math.max(1, sr.height - window.innerHeight);
    }
    build(); bake();
    lastPct = -1; lastBase = -9;
    if (compact) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      renderCompact();
    } else {
      mountHome();
      pt = target(); ps = pt;
      applyScroll(); renderWins(true);
    }
  }

  var rt, lastW = 0, lastH = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var rc = (compact ? canvas : host).getBoundingClientRect();
      if (Math.abs(rc.width - lastW) < 2 && Math.abs(rc.height - lastH) < 90 && W < 700) return;
      lastW = rc.width; lastH = rc.height; setup();
    }, 160);
  });
  if (!compact) {
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { tick = false; pt = target(); if (mqReduce.matches) ps = pt; kick(); });
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { host.classList.toggle('is-off', !en[0].isIntersecting); }).observe(host);
    }
  }
  document.addEventListener('rm:themechange', setup);
  document.addEventListener('visibilitychange', function () { if (host) host.classList.toggle('is-off', document.hidden); });

  var rc0 = (compact ? canvas : host).getBoundingClientRect(); lastW = rc0.width; lastH = rc0.height;
  setup();
})();
