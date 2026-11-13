/* Gallery scene: a cached alpine panorama (static canvases) with a light animated sky layer.
   Static: sky + stars, four ridge layers. Animated (30fps, paused off-screen): aurora bands,
   twinkle, dust, shooting star. Home page also choreographs the frame -> full-bleed -> dissolve
   using transforms/opacity only, written to a handful of elements (never to :root). */
(function () {
  'use strict';
  var root = document.documentElement;
  var stage = document.querySelector('.stage');
  if (!stage) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var skyC = stage.querySelector('.sky'), fxC = stage.querySelector('.fx');
  var rl = [].slice.call(stage.querySelectorAll('.rl'));
  var slot = stage.querySelector('.hole');
  var hero = stage.closest('.hero');
  var home = !!slot;
  var MAT = 14;

  var W = 0, H = 0, dpr = 1, fxH = 0;
  var hole = { x: 0, y: 0, w: 0, h: 0 };
  var dark = true, css = {};
  var bands = [], twinkle = [], dust = [], spr = {};
  var shoot = null, nextShoot = 0, running = false, visible = true, lastDraw = 0, lastT = 0;
  var fx = fxC.getContext('2d');

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function rgba(hex, a) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  function readCss() {
    var cs = getComputedStyle(root);
    var v = function (n) { return cs.getPropertyValue(n).trim(); };
    dark = root.dataset.theme !== 'light';
    css = {
      sky: [v('--sky-0'), v('--sky-1'), v('--sky-2'), v('--sky-3')],
      c: [v('--l1c'), v('--l2c'), v('--l3c'), v('--l4c')],
      m: [v('--l1m'), v('--l2m'), v('--l3m'), v('--l4m')],
      b: [v('--l1b'), v('--l2b'), v('--l3b'), v('--l4b')],
      lit: v('--lit'), litO: parseFloat(v('--lit-o')), shade: v('--shade'), shadeO: parseFloat(v('--shade-o')),
      rim: v('--rim'), mist: v('--mist'), mistO: parseFloat(v('--mist-o'))
    };
  }

  /* ---------- geometry ---------- */
  function measure() {
    var sr = stage.getBoundingClientRect();
    W = Math.round(sr.width); H = Math.round(sr.height);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (slot) {
      var r = slot.getBoundingClientRect();
      hole = { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
    } else {
      hole = { x: 0, y: 0, w: W, h: H };
    }
    fxH = Math.min(H, Math.round(hole.y + hole.h * 0.78));
  }

  /* ---------- static layers ---------- */
  /* peak: [u (0..1 across the frame), height (x frame height), left base k, right base k, sharpness] */
  var PEAKS = [
    [[0.6, 0.43, 1.45, 1.2, 1.3], [0.22, 0.22, 1.3, 1.1, 1.2], [1.0, 0.27, 1.1, 1.5, 1.2], [0.42, 0.2, 0.8, 0.9, 1.3], [0.78, 0.24, 0.9, 1.0, 1.25],
     [-0.4, 0.25, 1.5, 1.1, 1.2], [-0.95, 0.34, 1.3, 1.6, 1.3], [-1.55, 0.2, 1.3, 1.3, 1.2], [-0.1, 0.13, 1.2, 1.2, 1.2], [1.5, 0.27, 1.5, 1.2, 1.2], [1.12, 0.14, 1.2, 1.2, 1.2]],
    [[0.08, 0.24, 1.3, 1.2, 1.2], [0.5, 0.27, 1.25, 1.3, 1.3], [0.88, 0.19, 1.2, 1.2, 1.2], [0.3, 0.12, 1.1, 1.1, 1.1], [-0.4, 0.25, 1.3, 1.3, 1.2], [-0.9, 0.21, 1.2, 1.3, 1.2], [-1.4, 0.26, 1.3, 1.2, 1.3], [1.3, 0.24, 1.3, 1.3, 1.2], [1.7, 0.2, 1.2, 1.2, 1.2]],
    [[0.2, 0.15, 1.3, 1.2, 1.15], [0.68, 0.17, 1.25, 1.25, 1.2], [1.0, 0.1, 1.2, 1.2, 1.2], [-0.35, 0.16, 1.3, 1.3, 1.2], [-0.9, 0.14, 1.2, 1.2, 1.2], [1.4, 0.16, 1.3, 1.3, 1.2], [-1.5, 0.15, 1.2, 1.2, 1.2]],
    [[0.35, 0.075, 1.4, 1.4, 1.1], [0.9, 0.06, 1.4, 1.4, 1.1], [-0.3, 0.07, 1.4, 1.4, 1.1], [-1.0, 0.07, 1.4, 1.4, 1.1], [1.5, 0.07, 1.4, 1.4, 1.1]]
  ];
  var VB = [0.7, 0.8, 0.88, 0.955];
  function noiseArr(seed, N) {
    var r = rng(seed), h = [], i, step, amp = 1;
    for (i = 0; i <= N; i++) h.push(0);
    for (step = 64; step >= 2; step /= 2, amp *= 0.55) for (var j = step / 2; j < N; j += step) h[j] += (r() - 0.5) * amp;
    for (var m = 1; m < N; m += 2) h[m] += (r() - 0.5) * 0.22;
    return h;
  }
  function terrain(i) {
    var hh = hole.h, pk = PEAKS[i], base = hole.y + hh * VB[i];
    var ph = rng(90 + i * 7)() * 6;
    var N = Math.ceil(W / 3) + 3, nz = noiseArr(11 + i * 23, N);
    var ys = new Float32Array(W + 8);
    for (var x = 0; x < ys.length; x++) {
      var u = (x - hole.x) / hole.w, v = 0;
      for (var k = 0; k < pk.length; k++) {
        var q = pk[k], hpx = q[1] * hh, d = u < q[0] ? (q[0] - u) * hole.w / (hpx * q[2]) : (u - q[0]) * hole.w / (hpx * q[3]);
        if (d < 1) { var t = hpx * Math.pow(1 - d, q[4]); if (t > v) v = t; }
      }
      var fi = x / 3, i0 = fi | 0, n = nz[i0] + (nz[i0 + 1] - nz[i0]) * (fi - i0);
      var roll = hh * [0.045, 0.04, 0.03, 0.022][i] * (0.55 + 0.45 * Math.sin(x * 0.0042 + ph) + 0.25 * Math.sin(x * 0.011 + ph * 2));
      ys[x] = base - roll - v - n * (0.008 * hh + v * 0.07) * [1, 0.85, 0.6, 0.4][i];
    }
    return { ys: ys, base: base };
  }
  /* summits with a clear drop both sides: [index, rightValley, leftValley] */
  function summits(raw, minDrop) {
    var ys = new Float32Array(raw.length), res = [], n = W, last = -99, K = 14;
    for (var z = 0; z < raw.length; z++) { var sA = 0, sc = 0; for (var o = -5; o <= 5; o++) { var zz = z + o; if (zz >= 0 && zz < raw.length) { sA += raw[zz]; sc++; } } ys[z] = sA / sc; }
    for (var i = K; i < n - K; i += 1) {
      var ok = true;
      for (var k = 2; k <= K; k += 2) if (ys[i] > ys[i - k] || ys[i] > ys[i + k]) { ok = false; break; }
      if (!ok || i - last < 22) continue;
      var r = i; while (r < n - 1 && ys[r + 1] >= ys[r] && r - i < 420) r++;
      var lf = i; while (lf > 0 && ys[lf - 1] >= ys[lf] && i - lf < 420) lf--;
      if (Math.min(ys[r], ys[lf]) - ys[i] < minDrop) continue;
      res.push([i, r, lf]); last = i;
    }
    return res;
  }

  function paintSky() {
    var c = skyC; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var hz = hole.y + hole.h * 0.66;
    var gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, css.sky[0]); gr.addColorStop(0.42, css.sky[1]); gr.addColorStop(0.76, css.sky[2]); gr.addColorStop(1, css.sky[3]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    var gx = hole.x + hole.w * 0.74, gy = hz - hole.h * 0.04, gr2 = Math.max(hole.w, hole.h) * 0.75;
    var a = dark ? 0.24 : 0.5;
    g.save(); g.translate(gx, 0); g.scale(1.5, 1); g.translate(-gx, 0);
    var rg2 = g.createRadialGradient(gx, gy, 0, gx, gy, gr2 * 0.9);
    rg2.addColorStop(0, 'rgba(255,' + (dark ? 181 : 200) + ',' + (dark ? 98 : 150) + ',' + a + ')');
    rg2.addColorStop(0.5, 'rgba(255,' + (dark ? 150 : 180) + ',' + (dark ? 110 : 160) + ',' + (a * 0.28) + ')');
    rg2.addColorStop(1, 'rgba(255,181,98,0)');
    g.fillStyle = rg2; g.fillRect(0, 0, W, H);
    g.restore();
    if (dark) {
      var r = rng(7), n = Math.min(240, Math.round(W * hz / 5200));
      for (var i = 0; i < n; i++) {
        var x = r() * W, y = Math.pow(r(), 1.25) * hz * 0.98, s = 0.5 + r() * 0.9, al = 0.18 + r() * 0.5;
        g.fillStyle = 'rgba(238,241,255,' + al.toFixed(2) + ')';
        g.fillRect(x, y, s, s);
      }
    }
  }

  function face(g, ys, i, v, hh) {
    ys = smooth(ys);
    var lo = Math.min(i, v), hi = Math.max(i, v), x;
    g.beginPath();
    if (v >= i) for (x = lo; x <= hi; x++) g[x === lo ? 'moveTo' : 'lineTo'](x, ys[x]);
    else for (x = hi; x >= lo; x--) g[x === hi ? 'moveTo' : 'lineTo'](x, ys[x]);
    g.lineTo(i + (v - i) * 0.55, ys[v] + hh * 0.13);
    g.closePath();
    g.fill();
  }

  var smCache = null, smSrc = null;
  function smooth(raw) {
    if (smSrc === raw) return smCache;
    var o = new Float32Array(raw.length);
    for (var z = 0; z < raw.length; z++) { var a = 0, c = 0; for (var k = -5; k <= 5; k++) { var q = z + k; if (q >= 0 && q < raw.length) { a += raw[q]; c++; } } o[z] = a / c; }
    smSrc = raw; smCache = o; return o;
  }

  function paintRidge(i) {
    var c = rl[i]; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    var real = c.getContext('2d'); real.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = real;
    var t = terrain(i), ys = t.ys, hh = hole.h, x, ymin = 1e9;
    for (x = 0; x < W; x++) if (ys[x] < ymin) ymin = ys[x];
    if (i > 0) {
      var mg = g.createLinearGradient(0, t.base - hh * 0.26, 0, t.base + hh * 0.16);
      mg.addColorStop(0, rgba(css.mist, 0)); mg.addColorStop(0.55, rgba(css.mist, css.mistO * (dark ? 1 : 0.85))); mg.addColorStop(1, rgba(css.mist, 0));
      g.fillStyle = mg; g.fillRect(0, t.base - hh * 0.26, W, hh * 0.42);
    }
    var yEnd = Math.min(H, Math.max(ymin + 40, t.base + hh * 0.22));
    var tc = mk(W * dpr, H * dpr), tg = tc.getContext('2d'); tg.setTransform(dpr, 0, 0, dpr, 0, 0);
    var fg = tg.createLinearGradient(0, ymin, 0, yEnd);
    fg.addColorStop(0, css.c[i]); fg.addColorStop(0.42, css.m[i]); fg.addColorStop(1, css.b[i]);
    tg.fillStyle = fg;
    tg.beginPath(); tg.moveTo(0, H + 2);
    for (x = 0; x <= W; x++) tg.lineTo(x, ys[x]);
    tg.lineTo(W, H + 2); tg.closePath(); tg.fill();
    /* crisp faces: shade on the left of each summit, lit (toward the afterglow) on the right */
    var sums = summits(ys, hh * [0.05, 0.04, 0.03, 0.02][i]);
    smSrc = null;
    var wShade = [0.8, 1, 1, 0.4][i], wLit = [1, 0.9, 0.4, 0][i];
    var fgrad = function (col, op) {
      var gr = tg.createLinearGradient(0, ymin, 0, Math.min(H, t.base + hh * 0.1));
      gr.addColorStop(0, rgba(col, op)); gr.addColorStop(1, rgba(col, 0)); return gr;
    };
    var ov = mk(W * dpr / 2, H * dpr / 2), og = ov.getContext('2d'); og.setTransform(dpr / 2, 0, 0, dpr / 2, 0, 0);
    var gsh = og.createLinearGradient(0, ymin, 0, Math.min(H, t.base + hh * 0.1)), gli = og.createLinearGradient(0, ymin, 0, Math.min(H, t.base + hh * 0.1));
    gsh.addColorStop(0, rgba(css.shade, css.shadeO * 1.3 * wShade)); gsh.addColorStop(1, rgba(css.shade, 0));
    gli.addColorStop(0, rgba(css.lit, css.litO * 1.15 * wLit)); gli.addColorStop(1, rgba(css.lit, 0));
    for (var k = 0; k < sums.length; k++) {
      og.fillStyle = gsh; face(og, ys, sums[k][0], sums[k][2], hh);
      if (wLit > 0) { og.fillStyle = gli; face(og, ys, sums[k][0], sums[k][1], hh); }
    }
    tg.save(); tg.setTransform(1, 0, 0, 1, 0, 0);
    tg.globalCompositeOperation = 'source-atop';
    tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high';
    tg.drawImage(ov, 0, 0, tc.width, tc.height);
    tg.restore();
    real.drawImage(tc, 0, 0, W, H);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = css.rim;
    g.globalAlpha = 0.16; g.lineWidth = 1; g.beginPath(); g.moveTo(0, ys[0]);
    for (x = 1; x < W; x++) g.lineTo(x, ys[x]);
    g.stroke();
    for (x = 0; x < W - 12; x += 12) {
      var m = (ys[x] - ys[x + 12]) / 12 + (ys[x - (x > 12 ? 12 : 0)] - ys[x]) / 12 * 0;
      var al = clamp(m / 0.9, 0, 1) * (0.75 - i * 0.18);
      if (al < 0.05) continue;
      g.globalAlpha = al; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(x, ys[x]);
      for (var q = 1; q <= 12; q++) g.lineTo(x + q, ys[x + q]);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /* ---------- animated sky ---------- */
  function paintBands() {
    var cols = dark ? ['159,123,255', '93,199,255', '255,181,98'] : ['150,120,230', '255,170,150', '255,196,130'];
    var peak = dark ? [0.78, 0.6, 0.38] : [0.42, 0.4, 0.44];
    var bw = Math.ceil(W * 1.3 / 2), bh = Math.ceil(hole.h * 0.5 / 2);
    var cx = hole.x + hole.w * 0.5;
    bands = [];
    for (var k = 0; k < 3; k++) {
      var c = mk(bw, bh), g = c.getContext('2d');
      var sp = mk(2, 128), sg = sp.getContext('2d');
      var gr = sg.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(' + cols[k] + ',0)'); gr.addColorStop(0.55, 'rgba(' + cols[k] + ',' + (peak[k] * 0.45) + ')');
      gr.addColorStop(0.86, 'rgba(' + cols[k] + ',' + peak[k] + ')'); gr.addColorStop(1, 'rgba(' + cols[k] + ',0)');
      sg.fillStyle = gr; sg.fillRect(0, 0, 2, 128);
      for (var i = 0; i < bw; i++) {
        var xw = i * 2 - (bw * 2 - W) / 2, u = xw / W;
        var edge = clamp(u * 2.4 + 0.1, 0, 1) * clamp((1 - u) * 2.4 + 0.1, 0, 1);
        var focus = 0.35 + 0.65 * Math.exp(-Math.pow((xw - cx) / (hole.w * 0.9), 2));
        var a = (0.5 + 0.5 * Math.sin(xw * 0.0042 + k * 2.3) * Math.sin(xw * 0.0013 + k)) * edge * focus;
        a = clamp(a + 0.08 * focus, 0, 1);
        if (a < 0.03) continue;
        var y0 = bh * (0.18 + 0.1 * k) + Math.sin(xw * 0.0045 + k * 2.1) * bh * 0.24 + Math.sin(xw * 0.013 - k) * bh * 0.06;
        var h = bh * (0.52 + 0.1 * k) * (0.72 + 0.28 * Math.sin(xw * 0.0075 + k * 1.7));
        g.globalAlpha = a;
        g.drawImage(sp, 0, 0, 2, 128, i, y0, 1.7, h);
      }
      bands.push(c);
    }
  }

  function paintSprites() {
    var star = mk(16, 16), g = star.getContext('2d');
    var rg = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    rg.addColorStop(0, 'rgba(255,250,240,1)'); rg.addColorStop(0.25, 'rgba(238,241,255,0.55)'); rg.addColorStop(1, 'rgba(238,241,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 16, 16);
    spr.star = star;
    var dcols = dark ? ['159,123,255', '93,199,255', '255,181,98'] : ['255,255,255', '255,240,230', '255,224,190'];
    spr.dust = dcols.map(function (c) {
      var d = mk(16, 16), q = d.getContext('2d');
      var gg = q.createRadialGradient(8, 8, 0, 8, 8, 8);
      gg.addColorStop(0, 'rgba(' + c + ',1)'); gg.addColorStop(0.35, 'rgba(' + c + ',0.45)'); gg.addColorStop(1, 'rgba(' + c + ',0)');
      q.fillStyle = gg; q.fillRect(0, 0, 16, 16); return d;
    });
    var sc = mk(220, 14), sg = sc.getContext('2d');
    var tail = dark ? '159,123,255' : '120,90,220', mid = dark ? '93,199,255' : '60,140,210', tip = dark ? '255,214,160' : '196,112,12';
    var lg = sg.createLinearGradient(0, 0, 200, 0);
    lg.addColorStop(0, 'rgba(' + tail + ',0)'); lg.addColorStop(0.65, 'rgba(' + mid + ',0.5)'); lg.addColorStop(1, 'rgba(' + tip + ',1)');
    sg.fillStyle = lg; sg.fillRect(0, 6, 205, 2);
    var hg = sg.createRadialGradient(205, 7, 0, 205, 7, 12);
    hg.addColorStop(0, 'rgba(255,248,236,1)'); hg.addColorStop(0.3, 'rgba(' + tip + ',0.55)'); hg.addColorStop(1, 'rgba(' + tip + ',0)');
    sg.fillStyle = hg; sg.fillRect(190, 0, 30, 14);
    spr.streak = sc;
  }

  function seedMotion() {
    var r = rng(19), i;
    twinkle = [];
    if (dark) for (i = 0; i < 34; i++) twinkle.push({ x: r() * W, y: r() * hole.y + r() * hole.h * 0.55, s: 5 + r() * 6, f: 0.5 + r() * 1.4, p: r() * 6.28 });
    dust = [];
    for (i = 0; i < 20; i++) dust.push({ x: hole.x + (r() * 1.6 - 0.3) * hole.w, y: hole.y + hole.h * (0.2 + r() * 0.55), s: 5 + r() * 7, a: 0.25 + r() * 0.5, vx: (r() - 0.5) * 5, vy: -(3 + r() * 7), c: Math.floor(r() * 3), p: r() * 6.28 });
  }

  function drawFx(now) {
    var t = now / 1000, dt = lastT ? Math.min(t - lastT, 0.1) : 0.033; lastT = t;
    var g = fx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, fxH);
    g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    var bw = bands.length ? bands[0].width * 2 : 0;
    for (var k = 0; k < bands.length; k++) {
      var ox = -(bw - W) / 2 + Math.sin(t * 0.06 + k * 2) * W * 0.035;
      var oy = hole.y + hole.h * (0.0 + 0.05 * k) + Math.sin(t * 0.1 + k) * hole.h * 0.018;
      g.globalAlpha = (dark ? 1 : 0.9) * (0.72 + 0.28 * Math.sin(t * 0.17 + k * 1.9));
      g.drawImage(bands[k], ox, oy, bw, bands[k].height * 2);
    }
    g.globalCompositeOperation = 'source-over';
    for (var i = 0; i < twinkle.length; i++) {
      var s = twinkle[i];
      g.globalAlpha = 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.f + s.p));
      g.drawImage(spr.star, s.x - s.s / 2, s.y - s.s / 2, s.s, s.s);
    }
    for (var j = 0; j < dust.length; j++) {
      var d = dust[j];
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y < hole.y - 10) { d.y = hole.y + hole.h * (0.55 + Math.random() * 0.2); d.x = hole.x + (Math.random() * 1.5 - 0.25) * hole.w; }
      g.globalAlpha = Math.max(0.05, d.a * (0.6 + 0.4 * Math.sin(t * 0.9 + d.p))) * (dark ? 1 : 0.9);
      g.drawImage(spr.dust[d.c], d.x - d.s / 2, d.y - d.s / 2, d.s, d.s);
    }
    g.globalAlpha = 1;
    if (!shoot && now >= nextShoot) {
      shoot = { x: hole.x + hole.w * (0.1 + Math.random() * 0.55), y: hole.y + hole.h * (0.04 + Math.random() * 0.2), ang: (24 + Math.random() * 14) * Math.PI / 180, dist: hole.w * (0.7 + Math.random() * 0.3), dur: 1000 + Math.random() * 500, t0: now };
    }
    if (shoot) {
      var f = (now - shoot.t0) / shoot.dur;
      if (f >= 1) { shoot = null; nextShoot = now + 5500 + Math.random() * 4500; }
      else {
        var e = 1 - Math.pow(1 - f, 2.2), px = shoot.x + Math.cos(shoot.ang) * shoot.dist * e, py = shoot.y + Math.sin(shoot.ang) * shoot.dist * e;
        g.globalAlpha = Math.sin(Math.PI * Math.min(1, f * 1.15)) * 0.95;
        g.save(); g.translate(px, py); g.rotate(shoot.ang);
        g.drawImage(spr.streak, -205, -7);
        g.restore(); g.globalAlpha = 1;
      }
    }
  }

  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (now - lastDraw < 31) return;
    lastDraw = now;
    drawFx(now);
  }
  function setRun() {
    var want = !reduce && visible && !document.hidden;
    if (want && !running) { running = true; lastT = 0; requestAnimationFrame(loop); }
    else if (!want) running = false;
  }

  function build() {
    var tb = performance.now();
    measure();
    if (W < 10 || H < 10) return;
    readCss();
    paintSky();
    for (var i = 0; i < rl.length; i++) paintRidge(i);
    fxC.width = Math.round(W * dpr); fxC.height = Math.round(fxH * dpr);
    fxC.style.height = fxH + 'px';
    paintBands(); paintSprites(); seedMotion();
    nextShoot = performance.now() + 2200;
    drawFx(performance.now());
    if (home) layout();
  }

  /* ---------- home: frame -> full bleed -> dissolve ---------- */
  var drop = 0, bars = {}, ring, copy, feather, O = null, heroTop = 0, range = 1, lastP = -1, gone = false, ticking = false;
  function layout() {
    O = { l: hole.x - MAT, t: hole.y - MAT, r: hole.x + hole.w + MAT, b: hole.y + hole.h + MAT };
    O.w = O.r - O.l; O.h = O.b - O.t;
    var s = function (el, l, t, w, h) { el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px'; };
    s(bars.top, 0, 0, W, O.t);
    s(bars.bottom, 0, O.b, W, H - O.b);
    s(bars.left, 0, O.t, O.l, O.h);
    s(bars.right, O.r, O.t, W - O.r, O.h);
    s(ring, 0, 0, O.w, O.h);
    drop = Math.max(0, (H - O.b) * (W < 821 ? 0.42 : 0.5));
    var cap = bars.bottom.querySelector('.plate-cap');
    if (cap) { cap.style.left = O.l + MAT + 'px'; cap.style.width = hole.w + 'px'; }
    var hr = hero.getBoundingClientRect();
    heroTop = hr.top + window.scrollY;
    range = Math.max(1, (hero.offsetHeight - stage.offsetHeight) * 0.8);
    lastP = -1;
    apply(progress());
  }
  function progress() {
    if (reduce || W < 821) return 0;
    var p = clamp((window.scrollY - heroTop) / range, 0, 1);
    return p * p * (3 - 2 * p);
  }
  function apply(p) {
    if (p === lastP || !O) return;
    lastP = p;
    var q = 1 - p;
    bars.top.style.transform = 'translate3d(0,' + (-p * O.t).toFixed(1) + 'px,0)';
    bars.bottom.style.transform = 'translate3d(0,' + (p * (H - O.b)).toFixed(1) + 'px,0)';
    bars.left.style.transform = 'translate3d(' + (-p * O.l).toFixed(1) + 'px,0,0)';
    bars.right.style.transform = 'translate3d(' + (p * (W - O.r)).toFixed(1) + 'px,0,0)';
    var L = O.l * q, T = O.t * q, R = O.r + (W - O.r) * p, B = O.b + (H - O.b) * p;
    ring.style.transform = 'translate3d(' + L.toFixed(1) + 'px,' + T.toFixed(1) + 'px,0) scale(' + ((R - L) / O.w).toFixed(4) + ',' + ((B - T) / O.h).toFixed(4) + ')';
    ring.style.opacity = clamp(1 - p * 3.2, 0, 1).toFixed(3);
    copy.style.transform = 'translate3d(0,' + (-p * 46).toFixed(1) + 'px,0)';
    copy.style.opacity = clamp(1 - p * 2.8, 0, 1).toFixed(3);
    var hide = p > 0.4;
    if (hide !== gone) { gone = hide; copy.classList.toggle('gone', hide); }
    feather.style.opacity = clamp((p - 0.5) / 0.5, 0, 1).toFixed(3);
    for (var i = 0; i < rl.length; i++) rl[i].style.transform = 'translate3d(0,' + (p * drop * [0.5, 0.7, 0.85, 1][i]).toFixed(1) + 'px,0) scale(' + (1 + p * [0.02, 0.05, 0.09, 0.15][i]).toFixed(4) + ')';
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; apply(progress()); });
  }

  if (home) {
    bars = { top: stage.querySelector('.bar-top'), bottom: stage.querySelector('.bar-bottom'), left: stage.querySelector('.bar-left'), right: stage.querySelector('.bar-right') };
    ring = stage.querySelector('.mat'); copy = stage.querySelector('.copy'); feather = stage.querySelector('.feather');
    if (!reduce) window.addEventListener('scroll', onScroll, { passive: true });
  }

  var rzT;
  function schedule() { clearTimeout(rzT); rzT = setTimeout(build, 120); }
  window.addEventListener('resize', schedule);
  if (window.ResizeObserver) {
    var lastW = 0, lastH = 0;
    new ResizeObserver(function (en) {
      var r = en[0].contentRect;
      if (Math.abs(r.width - lastW) > 1 || Math.abs(r.height - lastH) > 1) { lastW = r.width; lastH = r.height; schedule(); }
    }).observe(stage);
  }
  document.addEventListener('rm:themechange', function () { setTimeout(build, 0); });
  document.addEventListener('visibilitychange', setRun);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; setRun(); }, { rootMargin: '80px' }).observe(stage);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (home) { measure(); layout(); } });
  requestAnimationFrame(function () { setTimeout(function () { build(); setRun(); }, 0); });
  window.RMScene = { rebuild: build };
})();
