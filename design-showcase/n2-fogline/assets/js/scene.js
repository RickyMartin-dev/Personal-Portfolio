/* Fogline — monochrome Manhattan skyline above a sea of fog.
   Windows light floor by floor, rising from the fog line, as the page scrolls. */
(function () {
  'use strict';
  var canvas = document.getElementById('scene');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var compact = canvas.hasAttribute('data-compact');
  var stage = document.getElementById('stage');
  var litEl = document.getElementById('lit-pct');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var PAL = {
    dark: {
      bg: '#0b0d12', skyTop: '#05070a', skyHor: '#1a202b',
      glow: 'rgba(150,172,210,0.20)', line: 'rgba(190,206,236,0.12)',
      towers: ['#222936', '#121620', '#06070a'],
      shade: 0.42, rose: '240,150,150', roseA: 0.42, rim: '255,190,175,0.55',
      fogBase: '#151a23',
      fogTones: [[128,142,170,0.17], [74,84,108,0.20]],
      win: '255,222,164', winA: 0.95, dim: 'rgba(160,180,215,0.055)',
      stars: true
    },
    light: {
      bg: '#f2f2f3', skyTop: '#e4e4e7', skyHor: '#fcfcfc',
      glow: 'rgba(255,255,255,0.95)', line: 'rgba(255,255,255,0.9)',
      towers: ['#d3d5da', '#b0b3bb', '#8d9099'],
      shade: 0.30, rose: '222,120,128', roseA: 0.78, rim: '255,170,175,0.85',
      fogBase: '#f9f9fa',
      fogTones: [[255,255,255,0.62], [206,208,218,0.5]],
      win: '255,240,208', winA: 0.92, dim: 'rgba(30,34,46,0.07)',
      stars: false
    }
  };

  var W = 0, H = 0, dpr = 1, fy = 0, pal, themeName;
  var skyBuf, layBuf = [], fogTex = {};
  var towers = [[], [], []];
  var wins = [{}, {}, {}];
  var stars = [];
  var ps = 0, pt = 0;
  var visible = true, rafId = 0, lastPct = -1;
  var shoot = null, nextShoot = 6000;
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
      spire(1, X(0.73), 0.9 * u, 0.46 * H, true),
      crown(1, X(0.665), 0.85 * u, 0.36 * H, true),
      slab(1, X(0.5), 1.2 * u, 0.1 * H, 'slant', false),
      needle(0, X(0.6), 0.5 * u, 0.3 * H, true),
      spire(0, X(0.77), 0.6 * u, 0.52 * H, true),
      needle(0, X(0.86), 0.42 * u, 0.58 * H, true),
      deco(0, X(0.4), 0.8 * u, 0.2 * H, true)
    ];
    heroes.forEach(function (t) { towers[t.L].push(t); });
    towers.forEach(function (list) { list.sort(function (a, b) { return (a.glow ? 1 : 0) - (b.glow ? 1 : 0); }); });

    var tip = H;
    towers.forEach(function (list) { list.forEach(function (t) {
      if (t.top < tip) tip = t.top;
      t.gl = (fy - t.top) * 0.16;
    }); });

    // windows
    wins = [0, 1, 2].map(function (L) {
      var xs = [], ys = [], ws = [], hs = [], th = [], al = [];
      var cw = CW * LS[L], ww = Math.max(2, Math.round(cw * 0.5)), wh = Math.max(3, Math.round(cw * 0.7)), rp = Math.round(cw * 1.4), mg = cw * 0.7;
      var dx = [], dy = [], dw = [], dh = [];
      var span = Math.max(40, fy - tip);
      towers[L].forEach(function (t) {
        var yLim = fy + H * 0.06;
        for (var y = t.top + rp; y < yLim; y += rp) {
          var e = ext(t, y); if (!e) continue;
          var n = Math.floor((e[1] - e[0] - 2 * mg) / cw); if (n < 1) continue;
          var sx = (e[0] + e[1]) / 2 - n * cw / 2 + (cw - ww) / 2;
          var rowOn = r() < (L === 1 ? 0.72 : L === 0 ? 0.55 : 0.8);
          var rowT = clamp((fy - y) / span, 0, 1.2);
          for (var j = 0; j < n; j++) {
            var x = sx + j * cw;
            x = Math.round(x); dx.push(x); dy.push(Math.round(y)); dw.push(ww); dh.push(wh);
            if (rowOn && r() < (L === 1 ? 0.5 : 0.6)) {
              xs.push(x); ys.push(Math.round(y)); ws.push(ww); hs.push(wh);
              th.push(Math.max(0, rowT + (r() - 0.35) * 0.16 + (x / W) * 0.05));
              al.push(0.45 + r() * 0.55);
            }
          }
        }
      });
      return { x: Float32Array.from(xs), y: Float32Array.from(ys), w: Float32Array.from(ws), h: Float32Array.from(hs), th: Float32Array.from(th), a: Float32Array.from(al), n: xs.length, dim: [dx, dy, dw, dh], lit: new Float32Array(xs.length) };
    });

    // stars
    stars = [];
    var sr = rng(77), sn = Math.round(W * fy / 5200);
    for (var i = 0; i < sn; i++) stars.push({ x: sr() * W, y: sr() * fy * 0.62, r: sr() < 0.12 ? 1.5 : 0.9, a: 0.25 + sr() * 0.6, ph: sr() * 6.28 });
  }

  /* ---------- baked layers ---------- */
  function bake() {
    var c;
    // sky
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

    // tower layers
    for (var L = 0; L < 3; L++) {
      var b = mk(W, H), k = b.getContext('2d'); k.scale(dpr, dpr);
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
        var sh = k.createLinearGradient(t.x0, 0, t.x1, 0);
        sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.42, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,' + pal.shade + ')');
        k.fillStyle = sh; k.fillRect(t.x0, t.top, t.x1 - t.x0, H - t.top + 4);
        k.restore();
        if (t.glow) {
          k.save(); k.beginPath(); k.rect(t.x0 - 2, t.top - 2, t.x1 - t.x0 + 4, t.gl * 0.3 + 2); k.clip();
          k.strokeStyle = 'rgba(' + pal.rim + ')'; k.lineWidth = 1; k.stroke(t.path); k.restore();
        }
      });
      var d = wins[L].dim; k.fillStyle = pal.dim; k.beginPath();
      for (var i = 0; i < d[0].length; i++) k.rect(d[0][i], d[1][i], d[2][i], d[3][i]);
      k.fill();
      layBuf[L] = b;
    }

    // fog textures
    var tw = Math.round(W * 1.5);
    fogTex.A = fog(tw, H * 0.3, 3, 0.8, 'band');
    fogTex.B = fog(tw, H * 0.32, 8, 1, 'band');
    fogTex.F = fog(tw, H - (fy - H * 0.1), 12, 1.2, 'front');
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

  /* ---------- frame ---------- */
  function drawFog(tex, y, speed, dirShift, alpha, t) {
    var tw = fogTex.tw, th = tex.height / dpr;
    var o = (((t * 0.001 * speed + dirShift) % tw) + tw) % tw;
    ctx.globalAlpha = alpha;
    for (var x = -o; x < W; x += tw) ctx.drawImage(tex, x, y, tw, th);
    ctx.globalAlpha = 1;
  }

  function drawWins(L, t) {
    var w = wins[L], lit = w.lit, i, p = ps;
    var base = p * 1.3 + 0.16, tot = 0;
    for (i = 0; i < w.n; i++) {
      var v = (base - w.th[i]) / 0.15;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      lit[i] = v; tot += v;
    }
    wins[L].tot = tot;
    var NB = 6, b;
    for (b = 0; b < NB; b++) {
      var lo = b / NB, hi = (b + 1) / NB, any = false;
      ctx.beginPath();
      for (i = 0; i < w.n; i++) {
        var q = lit[i] * w.a[i] * (b === NB - 1 ? 1 : 1);
        if (q <= 0) continue;
        if (q > lo && q <= hi + (b === NB - 1 ? 1 : 0)) { ctx.rect(w.x[i], w.y[i], w.w[i], w.h[i]); any = true; }
      }
      if (any && b >= 3 && L > 0) { ctx.fillStyle = 'rgba(' + pal.win + ',0.07)'; ctx.fill(); }
      if (any) { ctx.fillStyle = 'rgba(' + pal.win + ',' + (pal.winA * (0.28 + 0.72 * (b + 1) / NB)).toFixed(3) + ')'; ctx.fill(); }
    }
  }

  function render(t) {
    var p = ps;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(skyBuf, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (pal.stars) drawStars(t);
    var tot = 0, cnt = 0;
    for (var L = 0; L < 3; L++) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layBuf[L], 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWins(L, t); tot += wins[L].tot; cnt += wins[L].n;
      if (L === 0) drawFog(fogTex.A, fy - H * 0.26 + p * H * 0.02, 5, p * W * 0.1, 0.7, t);
      if (L === 1) drawFog(fogTex.B, fy - H * 0.2 + p * H * 0.035, -7, -p * W * 0.14, 0.85, t);
    }
    drawFog(fogTex.F, fy - H * 0.1 + p * H * 0.055, 9, p * W * 0.09, 1, t);
    if (litEl) {
      var pct = Math.round(cnt ? tot / cnt * 100 : 0);
      if (pct !== lastPct) { lastPct = pct; litEl.textContent = ('00' + pct).slice(-3) + ' %'; }
    }
  }

  function drawStars(t) {
    var tm = mqReduce.matches ? 0 : t;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], f = clamp((fy * 0.7 - s.y) / (fy * 0.25), 0, 1);
      var a = s.a * f * (0.65 + 0.35 * Math.sin(tm * 0.0009 + s.ph));
      ctx.fillStyle = 'rgba(225,232,248,' + a.toFixed(3) + ')';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    if (mqReduce.matches) return;
    if (!shoot && t > nextShoot) { shoot = { x: W * (0.15 + Math.random() * 0.6), y: fy * (0.08 + Math.random() * 0.18), t0: t }; }
    if (shoot) {
      var k = (t - shoot.t0) / 1100;
      if (k > 1) { shoot = null; nextShoot = t + 12000 + Math.random() * 9000; return; }
      var hx = shoot.x - k * 220, hy = shoot.y + k * 80, al = Math.sin(k * Math.PI) * 0.7;
      var g = ctx.createLinearGradient(hx, hy, hx + 90, hy - 33);
      g.addColorStop(0, 'rgba(235,240,255,' + al + ')'); g.addColorStop(1, 'rgba(235,240,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 90, hy - 33); ctx.stroke();
    }
  }

  function target() {
    if (compact) return 0.42 + 0.58 * clamp((window.pageYOffset || 0) / (H * 0.9), 0, 1);
    var r = stage.getBoundingClientRect(), span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
  }

  function frame(t) {
    rafId = 0;
    var d = pt - ps;
    if (mqReduce.matches || Math.abs(d) < 0.0006) ps = pt; else ps += d * 0.12;
    render(t);
    if (visible && (!mqReduce.matches || ps !== pt)) rafId = requestAnimationFrame(frame);
  }
  function kick() { if (!rafId) rafId = requestAnimationFrame(frame); }

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var rc = canvas.getBoundingClientRect();
    W = Math.round(rc.width) || window.innerWidth;
    H = Math.round(rc.height) || window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    themeName = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    pal = PAL[themeName];
    fy = Math.round(H * (compact ? 0.8 : (W < 700 ? 0.925 : 0.9)));
    build(); bake();
    pt = target(); ps = pt;
    lastPct = -1;
    kick();
  }

  var rt, lastW = 0, lastH = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var rc = canvas.getBoundingClientRect();
      // ignore pure height changes from mobile browser chrome
      if (Math.abs(rc.width - lastW) < 2 && Math.abs(rc.height - lastH) < 90 && W < 700) return;
      lastW = rc.width; lastH = rc.height; setup();
    }, 160);
  });
  window.addEventListener('scroll', function () { pt = target(); if (mqReduce.matches) ps = pt; kick(); }, { passive: true });
  document.addEventListener('rm:themechange', setup);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

  var rc0 = canvas.getBoundingClientRect(); lastW = rc0.width; lastH = rc0.height;
  setup();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { kick(); });
})();
