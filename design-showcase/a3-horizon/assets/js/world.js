/* Horizon: one fixed landscape, three pre-rendered hours per theme, crossfaded by scroll.
   Everything static is baked once (resize / theme change). Per scroll frame we only write
   opacity / transform on a handful of promoted layers. */
(function () {
  'use strict';
  var root = document.documentElement;
  var world = document.getElementById('world');
  if (!world) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var sky = $$('.sk canvas:not(.tw)', world);
  var rg = $$('.rg canvas', world);
  var skEls = $$('.sk', world), rgEls = $$('.rg', world);
  var twA = $('.tw-a', world), twB = $('.tw-b', world);
  var orbEls = { sun: $('#orb-sun', world), moon: $('#orb-moon', world), sun2: $('#orb-sun2', world) };
  var orbCan = { sun: $('canvas', orbEls.sun), moon: $('canvas', orbEls.moon), sun2: $('canvas', orbEls.sun2) };
  var fx = $('#fx', world), fctx = fx.getContext('2d');
  var marks = $('.marks', world);
  var clockT = $('#clock-t'), clockN = $('#clock-n'), clockH = $('#clock-h');
  var header = $('.site-header'), clock = $('.clock', world);
  if (clock) document.body.appendChild(clock);

  var dark = root.dataset.theme !== 'light';
  var W = 0, H = 0, dpr = 1, docMax = 1, ridgeH = 0, horizon = 0;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ss(a, b, x) { x = clamp01((x - a) / (b - a)); return x * x * (3 - 2 * x); }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ---------------- palettes: [hour 0, hour 1, hour 2] ---------------- */
  var PAL = {
    dark: [
      { /* dusk */
        sky: [[0, '#0b0a22'], [0.32, '#1a1440'], [0.55, '#31204f'], [0.72, '#64355f'], [0.86, '#b0505f'], [1, '#ee9055']],
        glow: [{ x: 0.78, y: 0.84, rx: 0.62, ry: 0.34, c: '#ff9a5a', a: 0.42 }, { x: 0.3, y: 0.7, rx: 0.5, ry: 0.3, c: '#9f7bff', a: 0.14 }],
        stars: { n: 55, top: 0.42, a: 0.55 }, aurora: 0,
        ridge: [['#7a68a8', '#5a4d8a', '#6d4d7e'], ['#5f55a0', '#3f3873', '#55407a'], ['#3b3470', '#2a2759', '#33295a'], ['#1f1c42', '#171636', '#141330']],
        lit: ['#ffb070', 0.32], shade: ['#05051c', 0.42], rim: ['#ffc98a', 0.85, 0.35], mist: ['#b07fb8', 0.26]
      },
      { /* night */
        sky: [[0, '#04051a'], [0.35, '#0a0d2e'], [0.6, '#101a45'], [0.8, '#1a2b5a'], [1, '#25407a']],
        glow: [{ x: 0.55, y: 0.78, rx: 0.8, ry: 0.3, c: '#5dc7ff', a: 0.1 }],
        stars: { n: 230, top: 0.66, a: 0.9 }, aurora: 1,
        ridge: [['#46508f', '#2f3875', '#2a3066'], ['#343c7c', '#232a60', '#1f2552'], ['#232954', '#181c42', '#161a3a'], ['#12142e', '#0e1026', '#0b0c20']],
        lit: ['#7fb6ff', 0.22], shade: ['#02030e', 0.5], rim: ['#8ad4ff', 0.6, 0.24], mist: ['#5a6bb0', 0.18]
      },
      { /* first light */
        sky: [[0, '#0d1433'], [0.3, '#1a2c5c'], [0.55, '#3a5b92'], [0.72, '#8a86b4'], [0.86, '#e8a0a4'], [1, '#ffcf9e']],
        glow: [{ x: 0.3, y: 0.86, rx: 0.6, ry: 0.3, c: '#ffb48a', a: 0.45 }],
        stars: { n: 40, top: 0.3, a: 0.5 }, aurora: 0.22,
        ridge: [['#8a8cc0', '#6c70a8', '#7c6ea0'], ['#6a6fa8', '#50558c', '#5e5688'], ['#4a4e84', '#383c6c', '#3e3c70'], ['#2a2d58', '#202349', '#1b1d3d']],
        lit: ['#ffc9a0', 0.4], shade: ['#0a0b2a', 0.35], rim: ['#ffd9b0', 0.85, 0.36], mist: ['#f3b6c0', 0.3]
      }
    ],
    light: [
      { /* morning */
        sky: [[0, '#b3c4ee'], [0.4, '#d3d3f2'], [0.68, '#f2d9e0'], [0.86, '#ffe0c6'], [1, '#ffe9cf']],
        glow: [{ x: 0.2, y: 0.8, rx: 0.6, ry: 0.32, c: '#ffd9a8', a: 0.55 }],
        stars: null, aurora: 0,
        ridge: [['#d5d9f0', '#d3cce6', '#eed9dc'], ['#b9bfe0', '#aeabd0', '#e2cdd8'], ['#8f9bc4', '#8c8cb8', '#bfb0cc'], ['#656f9a', '#6a6f9a', '#5f6590']],
        lit: ['#ffe2c0', 0.5], shade: ['#3a4268', 0.3], rim: ['#ffd6a8', 0.9, 0.35], mist: ['#fff3ee', 0.55]
      },
      { /* midday */
        sky: [[0, '#86b4ee'], [0.45, '#b8d6f6'], [0.8, '#e4eefa'], [1, '#f4f1f6']],
        glow: [{ x: 0.7, y: 0.2, rx: 0.5, ry: 0.4, c: '#ffffff', a: 0.4 }],
        stars: null, aurora: 0,
        ridge: [['#cdd9ee', '#bccbe6', '#dbe0ee'], ['#a7bbdc', '#98aad0', '#c4cde0'], ['#7f95c0', '#7686b4', '#a2a9c9'], ['#566590', '#5a6690', '#565e88']],
        lit: ['#ffffff', 0.45], shade: ['#2c3a6a', 0.3], rim: ['#ffffff', 0.9, 0.4], mist: ['#ffffff', 0.5]
      },
      { /* golden hour */
        sky: [[0, '#6f86cf'], [0.3, '#a495cf'], [0.55, '#e0a3b8'], [0.78, '#ffb98a'], [1, '#ffd79b']],
        glow: [{ x: 0.78, y: 0.82, rx: 0.62, ry: 0.34, c: '#ffc070', a: 0.6 }],
        stars: null, aurora: 0,
        ridge: [['#d8a8b8', '#c08fae', '#e8b79c'], ['#b184ab', '#9a6f9c', '#cf9aa0'], ['#86709e', '#735f8c', '#a0798f'], ['#5a4f7e', '#4e4673', '#4a4068']],
        lit: ['#ffd09a', 0.55], shade: ['#3a2a5c', 0.35], rim: ['#ffd49a', 0.9, 0.4], mist: ['#ffd5b0', 0.5]
      }
    ]
  };

  /* ---------------- ridge geometry (same massif as Afterglow) ---------------- */
  var PEAKS = [
    [[.12,.55,.3,.22,1.2],[.5,.4,.25,.3,1.15],[.86,.78,.26,.2,1.25]],
    [[.04,.3,.1,.1,1.2],[.2,.58,.19,.14,1.3],[.42,.36,.2,.12,1.1],[.64,.5,.05,.04,1.3],[.72,1,.2,.17,1.5],[.8,.55,.05,.08,1.3],[.93,.5,.16,.14,1.2]],
    [[.06,.55,.2,.1,1.3],[.3,.35,.16,.2,1.15],[.52,.72,.12,.08,1.4],[.62,.4,.1,.18,1.15],[.88,.62,.2,.14,1.3]],
    [[.2,.6,.3,.25,1.1],[.6,.8,.3,.3,1.1],[.92,.5,.2,.2,1.1]]
  ];
  var L = [
    { vb: 0.58, ph: 0.36, seed: 11, shade: 0.7, lit: 1 },
    { vb: 0.7, ph: 0.62, seed: 29, shade: 1, lit: 0.9 },
    { vb: 0.82, ph: 0.4, seed: 53, shade: 1, lit: 0.35 },
    { vb: 0.95, ph: 0.15, seed: 71, shade: 0.35, lit: 0 }
  ];
  function noiseArr(seedN, N) {
    var r = rng(seedN), h = [], i;
    for (i = 0; i <= N; i++) h.push(0);
    var amp = 1;
    for (var step = 64; step >= 2; step /= 2, amp *= 0.55) for (var j = step / 2; j < N; j += step) h[j] += (r() - 0.5) * amp;
    for (var m = 1; m < N; m += 2) h[m] += (r() - 0.5) * 0.22;
    return h;
  }
  function prof(pk, x) {
    var v = 0.1;
    for (var i = 0; i < pk.length; i++) {
      var q = pk[i], d = x < q[0] ? (q[0] - x) / q[2] : (x - q[0]) / q[3];
      if (d < 1) v = Math.max(v, q[1] * Math.pow(1 - d, q[4]));
    }
    return v;
  }
  var geo = null;
  function buildGeo() {
    var h = ridgeH, w = W, all = [];
    for (var idx = 0; idx < 4; idx++) {
      var l = L[idx], N = 360, noise = noiseArr(l.seed, N), out = [];
      var span = w < 700 ? 0.6 : 1, off = w < 700 ? 0.28 : 0;
      for (var i = 0; i <= N; i++) {
        var u = i / N, v = prof(PEAKS[idx], off + u * span);
        v = Math.max(0, v + noise[i] * 0.11 * (0.25 + v));
        out.push([u * w, H - h + h * (l.vb - l.ph * v)]);
      }
      all.push(out);
    }
    geo = all;
    horizon = H - h + h * 0.7;
  }
  function yAt(p, x) {
    for (var i = 1; i < p.length; i++) if (p[i][0] >= x) { var a = p[i - 1], b = p[i], t = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t; }
    return p[p.length - 1][1];
  }
  function summits(p, minDrop) {
    var res = [], n = p.length, last = -99;
    for (var i = 6; i < n - 6; i++) {
      var ok = true;
      for (var k = 1; k <= 6; k++) if (p[i][1] > p[i - k][1] || p[i][1] > p[i + k][1]) { ok = false; break; }
      if (!ok || i - last < 8) continue;
      var r = i; while (r < n - 1 && p[r + 1][1] >= p[r][1] && r - i < 70) r++;
      var lf = i; while (lf > 0 && p[lf - 1][1] >= p[lf][1] && i - lf < 70) lf--;
      if (Math.max(p[r][1], p[lf][1]) - p[i][1] < minDrop) continue;
      res.push([i, r, lf]); last = i;
    }
    return res;
  }
  function facePath(c, p, i, v, h, dirR) {
    var a = p[i], b = p[v], lo = Math.min(i, v), hi = Math.max(i, v), run = [];
    for (var q = lo; q <= hi; q++) run.push(p[q]);
    if (!dirR) run.reverse();
    c.moveTo(run[0][0], run[0][1]);
    for (var k = 1; k < run.length; k++) c.lineTo(run[k][0], run[k][1]);
    c.lineTo(a[0] + (b[0] - a[0]) * 0.5, b[1] + h * 0.1);
    c.closePath();
  }
  function bodyPath(c, p) {
    c.beginPath(); c.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]);
    c.lineTo(W, H + 4); c.lineTo(0, H + 4); c.closePath();
  }
  function setFilter(c, f) { if ('filter' in c) c.filter = f; }

  /* ---------------- baking ---------------- */
  function sizeCanvas(c, w, h, d) {
    c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(h * d));
    var g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, h);
    return g;
  }
  function bakeSky(c, pal, seedN) {
    var g = sizeCanvas(c, W, H, dpr);
    var gr = g.createLinearGradient(0, 0, 0, H);
    pal.sky.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    pal.glow.forEach(function (o) {
      g.save(); g.translate(o.x * W, o.y * H); g.scale(1, o.ry / o.rx);
      var r = o.rx * W, rd = g.createRadialGradient(0, 0, 0, 0, 0, r);
      rd.addColorStop(0, rgba(o.c, o.a)); rd.addColorStop(0.5, rgba(o.c, o.a * 0.35)); rd.addColorStop(1, rgba(o.c, 0));
      g.fillStyle = rd; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
    });
    if (pal.aurora) bakeAurora(g, pal.aurora);
    if (pal.stars) {
      var r = rng(seedN), n = Math.round(Math.min(pal.stars.n, (W * H) / 5200));
      for (var i = 0; i < n; i++) {
        var z = r(), x = r() * W, y = Math.pow(r(), 1.25) * H * pal.stars.top;
        var a = (z < 0.6 ? 0.34 : z < 0.9 ? 0.6 : 0.9) * pal.stars.a, s = (0.5 + r() * 0.8) * (z > 0.9 ? 1.5 : 1);
        g.fillStyle = 'rgba(238,241,255,' + a.toFixed(3) + ')'; g.fillRect(x, y, s, s);
      }
    }
  }
  function bakeAurora(g, strength) {
    var vw = Math.ceil(W / 5), vh = Math.ceil(H / 5);
    var v = document.createElement('canvas'); v.width = vw; v.height = vh;
    var vc = v.getContext('2d'), K = W / vw, t = 9.5;
    vc.globalCompositeOperation = 'lighter';
    var cols = [['159,123,255', 0.5], ['93,199,255', 0.34], ['255,181,98', 0.18]];
    cols.forEach(function (c, r) {
      var sp = document.createElement('canvas'); sp.width = 2; sp.height = 256;
      var sg = sp.getContext('2d'), gr = sg.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(' + c[0] + ',0)'); gr.addColorStop(0.55, 'rgba(' + c[0] + ',' + c[1] * 0.45 + ')');
      gr.addColorStop(0.85, 'rgba(' + c[0] + ',' + c[1] + ')'); gr.addColorStop(1, 'rgba(' + c[0] + ',0)');
      sg.fillStyle = gr; sg.fillRect(0, 0, 2, 256);
      for (var i = 0; i < vw; i++) {
        var x = i * K, u = x / W, edge = clamp01(u * 3) * clamp01((1 - u) * 3), side = 0.35 + 0.65 * (1 - Math.abs(u - 0.5) * 1.2);
        var y0 = H * (0.1 + 0.09 * r) + Math.sin(x * 0.004 + t * 0.12 + r * 2.1) * H * 0.07 + Math.sin(x * 0.012 - t * 0.09 + r) * H * 0.025;
        var h = H * (0.26 + 0.07 * r) * (0.75 + 0.25 * Math.sin(x * 0.007 + t * 0.1 + r * 1.7));
        var a = (0.55 + 0.45 * Math.sin(x * 0.0035 + t * 0.17 + r * 3.1)) * edge * side * strength * (r === 2 ? 0.8 : 1);
        if (a < 0.02) continue;
        vc.globalAlpha = a; vc.drawImage(sp, i, y0 / K, 1.6, h / K);
      }
    });
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(v, 0, 0, W, H);
  }
  function bakeRidges(c, pal) {
    var g = sizeCanvas(c, W, H, dpr), h = ridgeH, top0 = H - h;
    function layer(idx) {
      var p = geo[idx], col = pal.ridge[idx], l = L[idx];
      var top = Math.min.apply(null, p.map(function (q) { return q[1]; }));
      var gr = g.createLinearGradient(0, top, 0, H);
      gr.addColorStop(0, col[0]); gr.addColorStop(0.38, col[1]); gr.addColorStop(1, col[2]);
      bodyPath(g, p); g.fillStyle = gr; g.fill();
      var sums = summits(p, h * 0.05);
      g.save(); bodyPath(g, p); g.clip(); setFilter(g, 'blur(2.4px)');
      [['shade', pal.shade, l.shade, true], ['lit', pal.lit, l.lit, false]].forEach(function (k) {
        if (!k[2]) return;
        var fg = g.createLinearGradient(0, top, 0, H * 0.99);
        fg.addColorStop(0, rgba(k[1][0], 1)); fg.addColorStop(1, rgba(k[1][0], 0));
        g.beginPath();
        sums.forEach(function (s) { facePath(g, p, s[0], k[3] ? s[1] : s[2], h, k[3]); });
        g.globalAlpha = k[1][1] * k[2]; g.fillStyle = fg; g.fill();
      });
      g.restore();
    }
    layer(0); layer(1);
    /* low mist between the second and third ridge */
    g.save(); setFilter(g, 'blur(' + Math.round(h * 0.04) + 'px)');
    [[0.3, 0.64, 0.55, 0.07], [0.72, 0.58, 0.45, 0.06], [0.5, 0.72, 0.6, 0.05]].forEach(function (m) {
      g.globalAlpha = pal.mist[1]; g.fillStyle = pal.mist[0];
      g.beginPath(); g.ellipse(W * m[0], top0 + h * m[1], W * m[2], h * m[3], 0, 0, 6.2832); g.fill();
    });
    g.restore();
    layer(2); layer(3);
    /* luminous rim on the outermost crest */
    var segs = [], cur = null;
    for (var i = 0; i < geo[0].length; i++) {
      var y0 = geo[0][i][1], y1 = geo[1][i][1], t = Math.min(y0, y1, geo[2][i][1], geo[3][i][1]);
      if (Math.abs(t - y0) < 0.01 || Math.abs(t - y1) < 0.01) {
        var src = Math.abs(t - y1) < 0.01 ? geo[1][i] : geo[0][i];
        if (!cur) { cur = []; segs.push(cur); } cur.push(src);
      } else cur = null;
    }
    function stroke(w, a, blur) {
      g.save(); if (blur) setFilter(g, 'blur(' + blur + 'px)');
      g.globalAlpha = a; g.strokeStyle = pal.rim[0]; g.lineWidth = w; g.lineJoin = 'round';
      segs.forEach(function (s) { g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (var k = 1; k < s.length; k++) g.lineTo(s[k][0], s[k][1]); g.stroke(); });
      g.restore();
    }
    stroke(3.2, pal.rim[2], 3); stroke(1, pal.rim[1] * 0.9, 0);
  }
  function bakeTwinkle(c, seedN, n, pal) {
    var g = sizeCanvas(c, W, H * 0.7, dpr);
    if (!pal.stars) return;
    var r = rng(seedN), cols = ['238,241,255', '200,220,255', '255,230,200'];
    var spr = document.createElement('canvas'); spr.width = spr.height = 24;
    var sg = spr.getContext('2d'), gr = sg.createRadialGradient(12, 12, 0, 12, 12, 12);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = gr; sg.fillRect(0, 0, 24, 24);
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = Math.pow(r(), 1.2) * H * 0.62, s = 5 + r() * 7;
      g.globalAlpha = 0.55 + r() * 0.45; g.drawImage(spr, x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = 1;
  }
  function bakeOrb(c, kind) {
    var S = Math.round(Math.min(W, H) * (kind === 'moon' ? 0.34 : 0.62)); S = Math.max(190, Math.min(S, 520));
    var g = sizeCanvas(c, S, S, dpr);
    c.style.width = S + 'px'; c.style.height = S + 'px';
    c.parentNode.style.setProperty('--s', S + 'px');
    c.parentNode._s = S;
    var m = S / 2, core = kind === 'moon' ? S * 0.05 : S * 0.045;
    var warm = kind === 'sun2' ? ['255,196,150', '255,150,120'] : (dark ? ['255,190,120', '255,120,70'] : ['255,236,200', '255,190,110']);
    if (kind === 'moon') {
      var mg = g.createRadialGradient(m, m, 0, m, m, m);
      mg.addColorStop(0, 'rgba(200,222,255,0.6)'); mg.addColorStop(0.2, 'rgba(150,185,255,0.22)'); mg.addColorStop(1, 'rgba(120,160,255,0)');
      g.fillStyle = mg; g.fillRect(0, 0, S, S);
      g.fillStyle = 'rgba(236,243,255,0.96)'; g.beginPath(); g.arc(m, m, core * 1.35, 0, 6.2832); g.fill();
      /* soft shaded limb */
      g.fillStyle = 'rgba(120,140,200,0.35)'; g.beginPath(); g.arc(m + core * 0.45, m - core * 0.2, core * 1.0, 0, 6.2832); g.fill();
      return;
    }
    var gg = g.createRadialGradient(m, m, 0, m, m, m);
    gg.addColorStop(0, 'rgba(' + warm[0] + ',0.85)'); gg.addColorStop(0.1, 'rgba(' + warm[0] + ',0.42)');
    gg.addColorStop(0.35, 'rgba(' + warm[1] + ',0.14)'); gg.addColorStop(1, 'rgba(' + warm[1] + ',0)');
    g.fillStyle = gg; g.fillRect(0, 0, S, S);
    g.fillStyle = dark ? 'rgba(255,244,226,0.98)' : 'rgba(255,252,244,0.98)';
    g.beginPath(); g.arc(m, m, core, 0, 6.2832); g.fill();
  }

  var baked = false;
  function bakeAll() {
    var pal = PAL[dark ? 'dark' : 'light'];
    var dprRaw = window.devicePixelRatio || 1;
    dpr = Math.min(dprRaw, 1.5);
    W = Math.round(world.clientWidth); H = Math.round(world.clientHeight);
    ridgeH = W < 700 ? Math.max(230, 0.3 * H) : Math.max(340, Math.min(0.56 * H, 560));
    buildGeo();
    for (var i = 0; i < 3; i++) { bakeSky(sky[i], pal[i], 17 + i * 5); bakeRidges(rg[i], pal[i]); }
    if (dark) { bakeTwinkle(twA, 101, 38, pal[1]); bakeTwinkle(twB, 202, 38, pal[1]); }
    else { sizeCanvas(twA, 1, 1, 1); sizeCanvas(twB, 1, 1, 1); }
    bakeOrb(orbCan.sun, 'sun'); bakeOrb(orbCan.moon, 'moon'); bakeOrb(orbCan.sun2, 'sun2');
    var d = Math.min(dprRaw, 1.5);
    fx.width = Math.round(W * d); fx.height = Math.round(H * d); fctx.setTransform(d, 0, 0, d, 0, 0);
    placeMarks();
    baked = true;
    measure();
    apply(true);
  }

  /* proof numbers ride the crest of the massif */
  function placeMarks() {
    if (!marks) return;
    $$('.alt', marks).forEach(function (a) {
      var fx0 = parseFloat(W < 700 && a.dataset.xm ? a.dataset.xm : a.dataset.x);
      var x = W * fx0, rootY = yAt(geo[2], x), top = rootY;
      geo.forEach(function (q) { for (var dx = -10; dx <= 190; dx += 6) top = Math.min(top, yAt(q, Math.max(0, Math.min(W, x + dx)))); });
      a.style.left = x + 'px'; a.style.top = rootY + 'px';
      a.style.setProperty('--h', Math.max(parseFloat(a.dataset.lift || '44'), rootY - top + 34) + 'px');
    });
  }

  /* ---------------- scroll scrub ---------------- */
  var cur = { a1: -1, a2: -1, mk: -1, label: '', stuck: null, hint: true };
  function setOp(el, v, key) {
    v = Math.round(v * 1000) / 1000;
    if (cur[key] === v) return;
    cur[key] = v;
    el.style.opacity = v;
    var hid = v < 0.004;
    if (el._hid !== hid) { el._hid = hid; el.style.visibility = hid ? 'hidden' : 'visible'; }
  }
  function orbSet(name, x, y, a) {
    var el = orbEls[name], s = el._s || 300, k = '_' + name;
    a = Math.round(a * 100) / 100;
    var t = 'translate3d(' + Math.round(x - s / 2) + 'px,' + Math.round(y - s / 2) + 'px,0)';
    if (el[k] !== t) { el[k] = t; el.style.transform = t; }
    if (el._a !== a) { el._a = a; el.style.opacity = a; el.style.visibility = a < 0.01 ? 'hidden' : 'visible'; }
  }
  var windows = [];
  function measure() {
    windows = [];
    var sy = window.scrollY || 0;
    $$('.hero, .gap').forEach(function (e) { var r = e.getBoundingClientRect(); windows.push([r.top + sy, r.bottom + sy]); });
    docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function apply(force) {
    var y = window.scrollY || window.pageYOffset || 0;
    var p = clamp01(y / docMax);
    var a1, a2;
    if (dark) { a1 = ss(0.05, 0.26, p); a2 = ss(0.6, 0.86, p); }
    else { a1 = ss(0.05, 0.4, p); a2 = ss(0.55, 0.92, p); }
    setOp(skEls[1], a1, 'a1'); setOp(rgEls[1], a1, 'a1r');
    setOp(skEls[2], a2, 'a2'); setOp(rgEls[2], a2, 'a2r');
    if (marks) setOp(marks, 1 - ss(0, H * 0.45, y), 'mk');
    var bot = y + window.innerHeight, show = false;
    for (var q2 = 0; q2 < windows.length; q2++) if (bot > windows[q2][0] + 40 && bot < windows[q2][1] + 40) { show = true; break; }
    if (show !== cur.show) { cur.show = show; clock.classList.toggle('off', !show); }
    var hz = horizon, mx = W < 700 ? 0.6 : 0.78;
    if (dark) {
      var set = ss(0, 0.2, p);
      orbSet('sun', W * (mx - 0.04 * set), H * (W < 700 ? 0.82 : 0.7) + set * H * 0.34, 1 - ss(0.12, 0.2, p));
      var u = clamp01((p - 0.08) / 0.72);
      orbSet('moon', W * (0.14 + 0.72 * u), hz + H * 0.12 - Math.sin(u * Math.PI) * H * 0.58, Math.min(ss(0.08, 0.2, p), 1 - ss(0.66, 0.8, p)));
      var r2 = ss(0.72, 1, p);
      orbSet('sun2', W * (0.26 + 0.1 * r2), hz + H * 0.2 - r2 * H * 0.27, ss(0.7, 0.8, p));
    } else {
      var q = p;
      orbSet('sun', W * (0.16 + 0.68 * q), hz + H * 0.02 - Math.sin(q * Math.PI) * H * 0.6 + (q < 0.04 ? 0 : 0), 1);
      orbSet('moon', 0, 0, 0); orbSet('sun2', 0, 0, 0);
    }
    /* clock */
    var lab;
    if (dark) {
      var hr = 18 + 20 / 60 + p * 11.6; hr = hr % 24;
      var mins = Math.round((hr * 60) / 5) * 5; var hh = Math.floor(mins / 60) % 24, mm = mins % 60;
      lab = pad2(hh) + ':' + pad2(mm) + '|' + (p < 0.16 ? 'Dusk' : p < 0.7 ? 'Night' : 'First light');
    } else {
      var hr2 = 7 + p * 11.75, mins2 = Math.round((hr2 * 60) / 5) * 5;
      lab = pad2(Math.floor(mins2 / 60)) + ':' + pad2(mins2 % 60) + '|' + (p < 0.3 ? 'Morning' : p < 0.7 ? 'Midday' : 'Golden hour');
    }
    if (lab !== cur.label) { cur.label = lab; var s = lab.split('|'); clockT.textContent = s[0]; clockN.textContent = s[1]; }
    var hint = y < 40;
    if (hint !== cur.hint) { cur.hint = hint; clockH.classList.toggle('gone', !hint); }
    var stuck = y > 24;
    if (header && stuck !== cur.stuck) { cur.stuck = stuck; header.classList.toggle('is-stuck', stuck); }
  }
  var ticking = false;
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; apply(); }); } }, { passive: true });

  /* ---------------- shooting stars + title meteor (small dirty-rect canvas) ---------------- */
  var shoot = null, meteor = null, fxRunning = false, dirty = null, shootTimer = 0;
  function streak(hx, hy, ang, len, a, w) {
    var tx = hx - Math.cos(ang) * len, ty = hy - Math.sin(ang) * len;
    var g = fctx.createLinearGradient(tx, ty, hx, hy);
    var tail = dark ? '159,123,255' : '120,90,220', tip = dark ? '255,200,130' : '196,112,12';
    g.addColorStop(0, 'rgba(' + tail + ',0)'); g.addColorStop(0.6, 'rgba(' + (dark ? '93,199,255' : '60,140,210') + ',' + (a * 0.5) + ')'); g.addColorStop(1, 'rgba(' + tip + ',' + a + ')');
    fctx.strokeStyle = g; fctx.lineWidth = w; fctx.lineCap = 'round';
    fctx.beginPath(); fctx.moveTo(tx, ty); fctx.lineTo(hx, hy); fctx.stroke();
    grow(Math.min(tx, hx), Math.min(ty, hy), Math.max(tx, hx), Math.max(ty, hy));
  }
  function head(x, y, scale, alpha) {
    var rgb = dark ? '255,200,130' : '196,112,12', g = fctx.createRadialGradient(x, y, 0, x, y, 22 * scale);
    g.addColorStop(0, 'rgba(' + rgb + ',0.45)'); g.addColorStop(0.4, 'rgba(' + rgb + ',0.12)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    fctx.globalAlpha = alpha; fctx.fillStyle = g; fctx.beginPath(); fctx.arc(x, y, 22 * scale, 0, 6.283); fctx.fill();
    fctx.fillStyle = dark ? 'rgba(255,247,236,0.95)' : 'rgba(196,112,12,0.95)';
    fctx.beginPath(); fctx.arc(x, y, 2 * scale, 0, 6.283); fctx.fill(); fctx.globalAlpha = 1;
    grow(x - 24 * scale, y - 24 * scale, x + 24 * scale, y + 24 * scale);
  }
  function grow(x0, y0, x1, y1) {
    if (!dirty) dirty = [x0, y0, x1, y1];
    else { dirty[0] = Math.min(dirty[0], x0); dirty[1] = Math.min(dirty[1], y0); dirty[2] = Math.max(dirty[2], x1); dirty[3] = Math.max(dirty[3], y1); }
  }
  function fxFrame(now) {
    if (dirty) { fctx.clearRect(dirty[0] - 6, dirty[1] - 6, dirty[2] - dirty[0] + 12, dirty[3] - dirty[1] + 12); dirty = null; }
    if (shoot) {
      var p = (now - shoot.t0) / shoot.dur;
      if (p >= 1) { shoot = null; queueShoot(); }
      else {
        var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p, a = Math.sin(p * Math.PI);
        streak(hx, hy, shoot.ang, 130, 0.9 * a, 2); head(hx, hy, 0.7, 1);
      }
    }
    if (meteor) drawMeteor(now);
    if (shoot || meteor) requestAnimationFrame(fxFrame);
    else { if (dirty) { fctx.clearRect(dirty[0] - 6, dirty[1] - 6, dirty[2] - dirty[0] + 12, dirty[3] - dirty[1] + 12); dirty = null; } fxRunning = false; }
  }
  function fxKick() { if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxFrame); } }
  function queueShoot() {
    clearTimeout(shootTimer);
    if (reduce || !dark) return;
    shootTimer = setTimeout(function () {
      if (document.hidden || (window.scrollY || 0) > H * 0.9 && Math.random() < 0.7) { queueShoot(); return; }
      var ang = (28 + Math.random() * 14) * Math.PI / 180;
      shoot = { sx: W * (0.05 + Math.random() * 0.55), sy: H * (0.05 + Math.random() * 0.28), ang: ang, dist: W * 0.5, dur: 900 + Math.random() * 500, t0: performance.now() };
      fxKick();
    }, 7000 + Math.random() * 6000);
  }
  function startMeteor() {
    var svg = $('[data-meteor] .underline');
    if (!svg) return;
    var path = $('path', svg), rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-a3-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-a3-meteor', '1'); } catch (e) {}
    var ex = rect.right, ey = rect.top + 4, dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left, path: path, t0: performance.now(), d1: 800, d2: 1100 };
    fxKick();
  }
  function drawMeteor(now) {
    var m = meteor, el = now - m.t0, hx, hy, ta = 1;
    var p1 = clamp01(el / m.d1), acc = Math.pow(p1, 1.5);
    if (el < m.d1) { hx = m.sx + (m.ex - m.sx) * acc; hy = m.sy + (m.ey - m.sy) * acc; m.path.style.strokeDashoffset = '1'; }
    else {
      var p2 = easeOutExpo(clamp01((el - m.d1) / m.d2));
      hx = m.ex - (m.ex - m.lx) * p2; hy = m.ey; m.path.style.strokeDashoffset = String(1 - p2);
      ta = 1 - clamp01((el - m.d1) / 600);
    }
    var ang = el < m.d1 ? Math.atan2(m.ey - m.sy, m.ex - m.sx) : Math.PI;
    var len = 260 * (el < m.d1 ? Math.min(1, acc * 3 + 0.1) : ta);
    var ha = el > m.d1 + m.d2 ? 1 - clamp01((el - m.d1 - m.d2) / 400) : 1;
    if (len > 1) streak(hx, hy, el < m.d1 ? ang : 0, len, 0.95 * Math.max(ta, 0), 2.4);
    if (ha > 0) head(hx, hy, 1, ha);
    if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) queueShoot(); });

  /* ---------------- lifecycle ---------------- */
  document.addEventListener('rm:themechange', function () {
    dark = root.dataset.theme !== 'light';
    if (!baked) return;
    cur.a1 = cur.a2 = cur.mk = -1; cur.label = '';
    bakeAll(); queueShoot();
  });
  var rt, lastW = 0, lastH = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = window.innerWidth, h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 160) { measure(); return; }
      lastW = w; lastH = h; bakeAll();
    }, 160);
  });
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { if (baked) { measure(); apply(); } });
    ro.observe(document.body);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); apply(); });

  lastW = window.innerWidth; lastH = window.innerHeight;
  bakeAll();
  if (!reduce) queueShoot();
  setTimeout(function () { if ($('[data-meteor]')) startMeteor(); }, 1100);
})();
