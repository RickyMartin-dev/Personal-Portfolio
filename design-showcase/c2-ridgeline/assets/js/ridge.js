/* Ridgeline: stacked luminous ridgelines receding from the horizon.
   Everything static (sky, aurora, ridges) is rendered once per resize/theme into cached canvases.
   Scroll and pointer only write transforms on ~12 promoted ridge layers. The animated canvas
   (twinkle, shooting stars, title meteor) only runs while the hero is on screen. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero');
  var stack = document.querySelector('.ridges');
  var skyC = document.getElementById('sky');
  var fxC = document.getElementById('fx');
  if (!hero || !stack || !skyC || !fxC) return;
  var compact = hero.classList.contains('compact');
  var skyX = skyC.getContext('2d'), fx = fxC.getContext('2d');
  var header = document.querySelector('.site-header');
  var labels = Array.prototype.slice.call(stack.querySelectorAll('.alt'));

  var W = 0, H = 0, R = 0, topY = 0, dpr = 1, PAD = 0;
  var dark = true, P = null, ground = [18, 19, 31];
  var layers = [], labs = [], masks = [], zone = null;
  var sy = 0, mx = 0, mxT = 0, mLoop = false, stuck = false;
  var heroVisible = true, fxRunning = false, meteor = null, shoot = null, nextShoot = 0, lastTick = 0;
  var stars = [], glowSprite = null;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(3) + ')'; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function hex(h) {
    h = h.trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }

  /* ---------- palettes ---------- */
  var PAL = {
    dark: {
      line: [[159, 123, 255], [93, 199, 255], [255, 181, 98]], rim: [255, 214, 168],
      haze: [46, 38, 92], glow: [255, 170, 110], glow2: [140, 110, 255],
      sky: ['#07080f', '#101226', '#1f1b3d', '#4a3552'], aN: 1, summitMix: 0.65, stars: true
    },
    light: {
      line: [[132, 116, 184], [58, 66, 104], [66, 60, 86]], rim: [196, 112, 12],
      haze: [232, 214, 224], glow: [255, 190, 120], glow2: [255, 214, 190],
      sky: ['#ebe4f1', '#f4e6e8', '#f9e0cf', '#fbd5ae'], aN: 1, summitMix: 0.75, stars: false
    }
  };
  function readTheme() {
    dark = root.dataset.theme !== 'light';
    P = dark ? PAL.dark : PAL.light;
    var g = '';
    try { g = getComputedStyle(root).getPropertyValue('--ground'); } catch (e) {}
    ground = g ? hex(g) : (dark ? [18, 19, 31] : [248, 243, 236]);
  }

  /* ---------- terrain: coherent 2D ridged noise, so neighbouring lines read as one range ---------- */
  var perm = [];
  (function () { var r = rng(20260); for (var i = 0; i < 1024; i++) perm.push(r()); })();
  function hash(ix, iy) { return perm[(ix * 73 + iy * 151) & 1023] * 0.5 + perm[(ix * 31 + iy * 97 + 311) & 1023] * 0.5; }
  function vnoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y), fx_ = x - ix, fy_ = y - iy;
    var u = fx_ * fx_ * fx_ * (fx_ * (fx_ * 6 - 15) + 10), v = fy_ * fy_ * fy_ * (fy_ * (fy_ * 6 - 15) + 10);
    var a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  var OCT = [[1.5, 0.4], [3.3, 0.3], [7.4, 0.2], [16, 0.12], [34, 0.07]];
  function ridged(x, t) {
    var s = 0, wsum = 0;
    for (var o = 0; o < OCT.length; o++) {
      var f = OCT[o][0], w = OCT[o][1];
      var n = vnoise(x * f + 3.7 * o, t * 3.0 * Math.pow(f, 0.62) + 11.3 * o);
      var r = 1 - Math.abs(2 * n - 1);
      s += Math.pow(r, 1.8) * w; wsum += w;
    }
    return s / wsum;
  }
  function gauss(x, c, w) { var d = (x - c) / w; return Math.exp(-d * d); }
  /* height 0..1 at horizontal position u (0..1) on ridge depth t (0 far .. 1 near) */
  function height(u, t) {
    var env = 0.16 + 0.5 * gauss(u, 0.76 - 0.06 * t, 0.2 + 0.08 * t) + 0.38 * gauss(u, 0.58, 0.09 + 0.05 * t) + 0.46 * gauss(u, 0.92, 0.07 + 0.05 * t) + 0.28 * gauss(u, 0.14, 0.13);
    var m = clamp01((ridged(u, t) - 0.24) / 0.5); m = Math.pow(m, 1.35);
    var hills = 0.5 + 0.5 * Math.sin(u * 5.2 + t * 7.1) * Math.sin(u * 2.3 - t * 3.0);
    return Math.min(1.3, env * (0.14 + 0.86 * m) * (1 - 0.45 * t) + 0.1 * t * hills);
  }

  /* ---------- build ---------- */
  function build() {
    var pl = document.querySelector('.proof-line');
    if (pl) pl.hidden = !(hero.clientWidth < 700);
    var hr = hero.getBoundingClientRect(), sr = stack.getBoundingClientRect();
    W = Math.round(hr.width); H = Math.round(hr.height);
    R = Math.round(sr.height);
    topY = Math.round(sr.top - hr.top);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    PAD = Math.min(64, Math.round(W * 0.045));
    readTheme();
    readMasks(hr);
    layers.forEach(function (l) { if (l.parentNode) l.parentNode.removeChild(l); });
    layers = [];
    var small = W < 700;
    var N = compact ? 15 : (small ? 27 : 36), PER = 3, M = Math.ceil(N / PER);
    var STEP = small ? 3 : 4;
    var K = Math.ceil((W + PAD * 2) / STEP) + 1;
    var ys = [], base = [], amp = [], alpha = [], tv = [];
    var rangeTop = compact ? 0.14 : 0.2, rangeBot = compact ? 0.8 : 0.83;
    var ampK = compact ? 0.62 : (small ? 0.6 : 0.58);
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      tv.push(t);
      base.push(R * (rangeTop + (rangeBot - rangeTop) * Math.pow(t, 1.45)));
      amp.push(R * ampK * (1 - 0.74 * t));
      var a = (0.3 + 0.68 * smooth(0, 0.62, t)) * (1 - smooth(0.7, 0.98, t));
      alpha.push(a * P.aN);
      var arr = new Float32Array(K);
      for (var k = 0; k < K; k++) {
        var x = -PAD + k * STEP;
        arr[k] = base[i] - amp[i] * height(x / W, t);
      }
      ys.push(arr);
    }
    /* per layer bounds */
    var info = [];
    for (var j = 0; j < M; j++) {
      var i0 = j * PER, i1 = Math.min(N, i0 + PER) - 1;
      var minY = 1e9, maxFirst = -1e9;
      for (var q = i0; q <= i1; q++) for (k = 0; k < K; k++) if (ys[q][k] < minY) minY = ys[q][k];
      var bottom;
      if (j === M - 1) bottom = R + 40;
      else {
        var nf = ys[(j + 1) * PER];
        for (k = 0; k < K; k++) if (nf[k] > maxFirst) maxFirst = nf[k];
        bottom = maxFirst + 110;
      }
      info.push({ top: Math.floor(minY - 6), bottom: Math.ceil(bottom), i0: i0, i1: i1 });
    }
    var LW = W + PAD * 2;
    for (j = 0; j < M; j++) {
      var inf = info[j], u = M > 1 ? j / (M - 1) : 1;
      var cv = document.createElement('canvas');
      var ch = inf.bottom - inf.top;
      cv.width = Math.round(LW * dpr); cv.height = Math.round(ch * dpr);
      cv.className = 'rl';
      cv.style.cssText = 'left:' + (-PAD) + 'px;top:' + inf.top + 'px;width:' + LW + 'px;height:' + ch + 'px';
      cv.setAttribute('aria-hidden', 'true');
      var c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (i = inf.i0; i <= inf.i1; i++) drawRidge(c, ys[i], tv[i], base[i], amp[i], alpha[i], inf.top, STEP, K, ch, j === M - 1);
      stack.appendChild(cv);
      layers.push(cv);
      cv._k = reduce ? 0 : 0.4 * Math.pow(u, 1.15);
      cv._m = compact ? 0 : 4 + 26 * u;
      cv._y = 0; cv._x = 0;
    }
    /* keep DOM order far -> near, labels last */
    layers.forEach(function (l) { stack.appendChild(l); });
    labels.forEach(function (l) { stack.appendChild(l); });
    placeLabels(ys, base, STEP, K, N, PER, M, tv);
    paintSky();
    seedStars();
    sizeFx();
    glowSprite = makeGlow();
    apply(true);
  }

  /* soft exclusion zones under the hero copy, so lines recede behind text instead of striking through it */
  function readMasks(hr) {
    masks = []; zone = null;
    var sel = compact ? '.hero h1, .hero .grid > p' : '.hero-statement, .hero-support, .hero-actions .btn, .hero-meta, .proof-line, .hero-title-wrap';
    Array.prototype.forEach.call(hero.querySelectorAll(sel), function (n) {
      var r = n.getBoundingClientRect();
      masks.push({ l: r.left - hr.left - 10, r: r.right - hr.left + 10, t: r.top - hr.top - topY - 8, b: r.bottom - hr.top - topY + 8 });
    });
    if (!compact && masks.length) {
      var l0 = 1e9, r0 = 0, t0 = 1e9, b0 = 0;
      Array.prototype.forEach.call(hero.querySelectorAll('.hero-statement, .hero-actions .btn, .hero-meta'), function (n) { var r = n.getBoundingClientRect(); l0 = Math.min(l0, r.left); r0 = Math.max(r0, r.right); t0 = Math.min(t0, r.top); b0 = Math.max(b0, r.bottom); });
      var zr = Math.min(r0 - hr.left + 30, W < 700 ? W : 700), zl = 0, cx = (zl + zr) / 2, cy = (t0 + b0) / 2 - hr.top - topY;
      zone = { cx: cx, cy: cy, rx: (zr - zl) / 2 * 1.12, ry: (b0 - t0) / 2 + 70 };
    }
  }
  function maskAt(x, y) {
    var f = 1;
    if (zone) {
      var ex = (x - zone.cx) / zone.rx, ey = (y - zone.cy) / zone.ry, ed = Math.sqrt(ex * ex + ey * ey);
      f = smooth(0.82, 1.18, ed);
    }
    for (var i = 0; i < masks.length; i++) {
      var m = masks[i];
      var dx = Math.max(m.l - x, x - m.r, 0), dy = Math.max(m.t - y, y - m.b, 0);
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 56) { var v = smooth(0, 56, d); if (v < f) f = v; }
    }
    return f;
  }

  function lineColor(t, hf) {
    var L = P.line, c = t < 0.4 ? mix(L[0], L[1], smooth(0, 0.4, t)) : mix(L[1], L[2], smooth(0.4, 0.72, t));
    return mix(c, P.rim, clamp01(hf) * P.summitMix);
  }

  function drawRidge(c, arr, t, base, amp, alpha, top, STEP, K, ch, isLast) {
    var i, x, y;
    var tint = mix(P.haze, ground, smooth(0.0, dark ? 0.78 : 0.66, t));
    var G = amp * 1.15 + 70;
    /* occluding fill: haze at the crest melting into the page ground below */
    var y0 = base - amp * 0.7 - top, y1 = base + G - top;
    var gr = c.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, rgba(tint, 1));
    gr.addColorStop(1, rgba(ground, 1));
    c.beginPath();
    c.moveTo(0, arr[0] - top);
    for (i = 1; i < K; i++) c.lineTo(i * STEP, arr[i] - top);
    c.lineTo((K - 1) * STEP, ch + 2); c.lineTo(0, ch + 2); c.closePath();
    c.fillStyle = gr; c.fill();
    if (isLast) { c.fillStyle = rgba(ground, 1); c.fillRect(0, base + G - top, (K - 1) * STEP + 4, ch); }
    if (alpha < 0.012) return;
    var lw = 0.75 + 0.55 * t;
    var CH = 3, ox = -PAD;
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (i = 0; i < K - 1; i += CH) {
      var e = Math.min(K - 1, i + CH), hs = 0, ym = 0;
      for (var q = i; q <= e; q++) { var hh = (base - arr[q]) / (amp * 0.85); if (hh > hs) hs = hh; ym += arr[q]; }
      ym /= (e - i + 1);
      var mk = masks.length ? maskAt(ox + (i + e) * 0.5 * STEP, ym) : 1;
      var al = alpha * mk;
      if (al < 0.012) continue;
      var col = lineColor(t, Math.pow(clamp01(hs), 1.6));
      c.beginPath(); c.moveTo(i * STEP, arr[i] - top);
      for (q = i + 1; q <= e; q++) c.lineTo(q * STEP, arr[q] - top);
      c.strokeStyle = rgba(col, al * (dark ? 0.16 : 0.08)); c.lineWidth = 4.5; c.stroke();
      c.strokeStyle = rgba(col, al * (dark ? 0.22 : 0.11)); c.lineWidth = 2.2; c.stroke();
      c.strokeStyle = rgba(col, Math.min(1, al * (0.78 + 0.35 * clamp01(hs)))); c.lineWidth = lw; c.stroke();
    }
  }

  /* ---------- proof numbers pinned to summits (collision-aware) ---------- */
  function placeLabels(ys, base, STEP, K, N, PER, M, tv) {
    labs = [];
    if (compact || !labels.length || W < 700) { labels.forEach(function (l) { l.style.display = 'none'; }); return; }
    var small = W < 700, taken = [];
    labels.forEach(function (el, n) {
      var r0 = parseFloat(small ? el.dataset.s0 : el.dataset.r0), r1 = parseFloat(small ? el.dataset.s1 : el.dataset.r1);
      var i0 = Math.round(N * 0.12), i1 = Math.round(N * 0.74), best = null;
      for (var pass = 0; pass < 4 && !best; pass++) for (var i = i0; i < i1; i++) {
        for (var k = Math.max(8, Math.floor((r0 * W + PAD) / STEP)); k < Math.min(K - 8, Math.ceil((r1 * W + PAD) / STEP)); k++) {
          var y = ys[i][k], pk = true;
          for (var d = pass > 1 ? -6 : -10; d <= (pass > 1 ? 6 : 10) && pk; d += 2) if (k + d >= 0 && k + d < K) if (ys[i][k + d] < y - 0.01 ) pk = false;
          if (!pk) continue;
          var near = 1e9;
          for (var j = i + 1; j < N; j++) if (ys[j][k] < near) near = ys[j][k];
          var expo = near - y;
          if (expo < (pass ? 8 : 26)) continue;
          var abs = topY + y;
          if (abs < H * 0.3) continue;
          var x = -PAD + k * STEP;
          var fl = x > W - (small ? 118 : 250), lw_ = small ? 112 : 200, th = small ? 28 : 52;
          var hb = parseFloat(small ? el.dataset.hs : el.dataset.h), hh_ = 0, rx0, rx1, ry0, ry1, hit = true;
          var fl0 = fl;
          for (var ho = 0; ho < 8 && hit; ho++) {
            fl = ho % 2 ? !fl0 : fl0;
            hh_ = hb + (ho >> 1) * (small ? 14 : 22);
            rx0 = fl ? x - 14 - lw_ : x - 4; rx1 = fl ? x + 4 : x + 14 + lw_;
            ry1 = y - hh_ + 20; ry0 = ry1 - th;
            hit = masks.some(function (m) { return rx1 > m.l && rx0 < m.r && ry1 > m.t && ry0 < m.b; });
            if (!hit) hit = taken.some(function (tk) { return (rx1 + 10 > tk.r.x0 && rx0 - 10 < tk.r.x1 && ry1 + 8 > tk.r.y0 && ry0 - 8 < tk.r.y1) || (rx1 > tk.p.x0 && rx0 < tk.p.x1 && ry1 > tk.p.y0 && ry0 < tk.p.y1) || (x + 6 > tk.r.x0 && x - 6 < tk.r.x1 && y > tk.r.y0 && y - hh_ < tk.r.y1); });
            if (!hit) {
              var ka = Math.max(0, Math.floor((rx0 + PAD) / STEP)), kb = Math.min(K - 1, Math.ceil((rx1 + PAD) / STEP));
              for (var jj = 0; jj < N && !hit; jj++) for (var kk = ka; kk <= kb; kk++) { var yy = ys[jj][kk]; if (yy > ry0 - 4 && yy < ry1 + 4) { hit = true; break; } }
            }
          }
          if (hit) continue;
          var clash = taken.some(function (tk) { return Math.abs(tk.x - x) < (small ? 84 - pass * 24 : 240 - pass * 55); });
          if (clash) continue;
          var sc = expo * 0.5 - y * 0.8 + (i < N * 0.5 ? 12 : 0);
          if (!best || sc > best.sc) best = { sc: sc, x: x, y: y, i: i, h: hh_, fl: fl, p: { x0: x - 6, x1: x + 6, y0: y - hh_, y1: y }, r: { x0: rx0, x1: rx1, y0: ry0, y1: ry1 } };
        }
      }
      if (!best) { el.style.display = 'none'; var pl2 = document.querySelector('.proof-line'); if (pl2) pl2.hidden = false; return; }
      el.style.display = '';
      taken.push(best);
      var layerIdx = Math.min(M - 1, Math.floor(best.i / PER));
      var h = best.h;
      el.style.left = Math.round(best.x) + 'px';
      el.style.top = Math.round(best.y) + 'px';
      el.style.setProperty('--h', h + 'px');
      el.classList.toggle('flip', best.fl);
      labs.push({ el: el, layer: layers[layerIdx] });
    });
  }

  /* ---------- static sky, baked once ---------- */
  function paintSky() {
    var dp = dpr;
    skyC.width = Math.round(W * dp); skyC.height = Math.round(H * dp);
    var c = skyX;
    c.setTransform(dp, 0, 0, dp, 0, 0);
    var yh = topY + R * 0.26;
    var g = c.createLinearGradient(0, 0, 0, H);
    var s = P.sky;
    g.addColorStop(0, s[0]); g.addColorStop(clamp01(yh * 0.45 / H), s[1]); g.addColorStop(clamp01(yh * 0.82 / H), s[2]); g.addColorStop(clamp01(yh / H), s[3]);
    g.addColorStop(clamp01((yh + R * 0.4) / H), rgba(ground, 1)); g.addColorStop(1, rgba(ground, 1));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    /* aurora veil: low-res columns, upscaled once */
    var vw = Math.ceil(W / 5), vh = Math.ceil(yh * 1.0 / 5);
    var vc = document.createElement('canvas'); vc.width = vw; vc.height = vh;
    var v = vc.getContext('2d'), Hs = yh;
    var cols = dark ? [[159, 123, 255, 0.5], [93, 199, 255, 0.34], [255, 181, 98, 0.18]] : [[170, 140, 235, 0.2], [255, 170, 150, 0.26], [255, 196, 130, 0.3]];
    v.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (var r = 0; r < 3; r++) {
      var sp = document.createElement('canvas'); sp.width = 2; sp.height = 128;
      var sg = sp.getContext('2d'), gg = sg.createLinearGradient(0, 0, 0, 128), cc = cols[r];
      gg.addColorStop(0, 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',0)');
      gg.addColorStop(0.55, 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',' + (cc[3] * 0.45) + ')');
      gg.addColorStop(0.85, 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',' + cc[3] + ')');
      gg.addColorStop(1, 'rgba(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ',0)');
      sg.fillStyle = gg; sg.fillRect(0, 0, 2, 128);
      for (var i = 0; i < vw; i++) {
        var x = i * 5, u = x / W;
        var edge = clamp01(u * 2.6) * clamp01((1 - u) * 2.6);
        var y0 = Hs * (0.12 + 0.1 * r) + Math.sin(x * 0.0042 + r * 2.1 + 1.2) * Hs * 0.09 + Math.sin(x * 0.012 + r) * Hs * 0.03;
        var h = Hs * (0.3 + 0.08 * r) * (0.75 + 0.25 * Math.sin(x * 0.007 + r * 1.7));
        var a = (0.55 + 0.45 * Math.sin(x * 0.0035 + r * 3.1 + 0.6)) * edge * (0.35 + 0.65 * u) * (r === 2 ? 0.8 : 1);
        if (a < 0.03) continue;
        v.globalAlpha = a;
        v.drawImage(sp, i, y0 / 5, 1.6, h / 5);
      }
    }
    v.globalAlpha = 1;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.globalAlpha = compact ? 0.7 : 1;
    c.drawImage(vc, 0, 0, W, Hs * (vh * 5 / Hs));
    c.globalAlpha = 1;
    /* afterglow behind the far range */
    c.save();
    c.translate(W * 0.74, yh + R * 0.05); c.scale(1, 0.5);
    var rg = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.55);
    rg.addColorStop(0, rgba(P.glow, dark ? 0.34 : 0.62)); rg.addColorStop(0.35, rgba(P.glow, dark ? 0.12 : 0.26)); rg.addColorStop(1, rgba(P.glow, 0));
    c.fillStyle = rg; c.fillRect(-W, -W, W * 2, W * 2);
    c.restore();
    c.save();
    c.translate(W * 0.3, yh + R * 0.1); c.scale(1, 0.45);
    rg = c.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
    rg.addColorStop(0, rgba(P.glow2, dark ? 0.16 : 0.34)); rg.addColorStop(1, rgba(P.glow2, 0));
    c.fillStyle = rg; c.fillRect(-W, -W, W * 2, W * 2);
    c.restore();
    /* dim static stars */
    if (P.stars) {
      var r2 = rng(7), n = Math.min(190, Math.round(W * yh / 7500));
      for (i = 0; i < n; i++) {
        var sx = r2() * W, sy_ = Math.pow(r2(), 1.2) * yh * 0.95, sz = 0.5 + r2() * 0.8;
        c.fillStyle = 'rgba(232,236,255,' + (0.18 + r2() * 0.3).toFixed(2) + ')';
        c.fillRect(sx, sy_, sz, sz);
      }
    }
  }

  /* ---------- animated layer (small canvas, sky only) ---------- */
  var fxW = 0, fxH = 0;
  function sizeFx() {
    fxW = W; fxH = Math.round(Math.min(H, topY + R * 0.5));
    fxC.width = Math.round(fxW * dpr); fxC.height = Math.round(fxH * dpr);
    fxC.style.height = fxH + 'px';
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function seedStars() {
    stars = [];
    if (!P.stars) return;
    var r = rng(41), n = compact ? 14 : 30, lim = Math.max(80, topY + R * 0.18);
    for (var i = 0; i < n; i++) stars.push({ x: r() * W, y: r() * lim, s: 0.8 + r() * 0.9, p: r() * 6.28, f: 0.5 + r() * 1.2, big: r() < 0.25 });
  }
  function makeGlow() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    var col = dark ? '255,200,130' : '196,112,12';
    gr.addColorStop(0, 'rgba(' + col + ',0.5)'); gr.addColorStop(0.35, 'rgba(' + col + ',0.14)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  }
  function head(x, y, sc) {
    var s = 44 * sc;
    fx.drawImage(glowSprite, x - s / 2, y - s / 2, s, s);
    fx.fillStyle = dark ? 'rgba(255,247,236,0.95)' : 'rgba(196,112,12,0.95)';
    fx.beginPath(); fx.arc(x, y, 1.8 * sc, 0, 6.283); fx.fill();
  }
  function streak(hx, hy, ang, len, a, w) {
    var tx = hx - Math.cos(ang) * len, ty = hy - Math.sin(ang) * len;
    var g = fx.createLinearGradient(tx, ty, hx, hy);
    var tail = dark ? '159,123,255' : '120,90,220', tip = dark ? '255,200,130' : '196,112,12';
    g.addColorStop(0, 'rgba(' + tail + ',0)');
    g.addColorStop(0.6, 'rgba(' + (dark ? '93,199,255' : '60,140,210') + ',' + (a * 0.5).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + tip + ',' + a.toFixed(3) + ')');
    fx.strokeStyle = g; fx.lineWidth = w; fx.lineCap = 'round';
    fx.beginPath(); fx.moveTo(tx, ty); fx.lineTo(hx, hy); fx.stroke();
  }
  function drawFx(now) {
    fx.clearRect(0, 0, fxW, fxH);
    var t = now / 1000;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], tw = reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * s.f + s.p);
      fx.fillStyle = 'rgba(240,243,255,' + (0.25 + 0.7 * tw).toFixed(3) + ')';
      var sz = s.s * (s.big ? 1.5 : 1);
      fx.fillRect(s.x, s.y, sz, sz);
    }
    if (reduce) return;
    if (!shoot && now >= nextShoot && !compact) {
      var ang = (26 + Math.random() * 14) * Math.PI / 180;
      shoot = { sx: W * (0.1 + Math.random() * 0.55), sy: Math.max(60, topY * (0.2 + Math.random() * 0.5)), ang: ang, dist: W * 0.42, dur: 900 + Math.random() * 500, t0: now };
    }
    if (shoot) {
      var p = (now - shoot.t0) / shoot.dur;
      if (p >= 1) { shoot = null; nextShoot = now + 8000 + Math.random() * 6000; }
      else {
        var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p;
        var a = Math.sin(p * Math.PI);
        streak(hx, hy, shoot.ang, 130, 0.9 * a, 2);
        head(hx, hy, 0.7);
      }
    }
    if (meteor) drawMeteor(now);
  }

  /* title underline drawn by a shooting star */
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg) return;
    var path = svg.querySelector('path');
    var rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-c2-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-c2-meteor', '1'); } catch (e) {}
    var cr = fxC.getBoundingClientRect();
    var ex = rect.right - cr.left, ey = rect.top - cr.top + 4;
    var dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left - cr.left, path: path, t0: performance.now(), d1: 800, d2: 1100 };
    kickFx();
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
    if (ha > 0) { fx.globalAlpha = ha; head(hx, hy, 1); fx.globalAlpha = 1; }
    if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }
  function fxLoop(now) {
    if (!heroVisible || document.hidden) { fxRunning = false; return; }
    var busy = meteor || shoot || now >= nextShoot;
    if (busy || now - lastTick > 130) { lastTick = now; drawFx(now); }
    requestAnimationFrame(fxLoop);
  }
  function kickFx() {
    if (fxRunning || reduce || !heroVisible || document.hidden) return;
    fxRunning = true; requestAnimationFrame(fxLoop);
  }

  /* ---------- scroll + pointer: transforms only ---------- */
  function setT(el, x, y) {
    if (el._x === x && el._y === y) return;
    el._x = x; el._y = y;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }
  function apply(force) {
    if (!force && !heroVisible) return;
    for (var i = 0; i < layers.length; i++) {
      var l = layers[i];
      setT(l, Math.round(-mx * l._m), Math.round(sy * l._k));
    }
    for (var j = 0; j < labs.length; j++) {
      var b = labs[j];
      setT(b.el, Math.round(-mx * b.layer._m), Math.round(sy * b.layer._k));
    }
  }
  var ticking = false;
  function onScroll() {
    ticking = false;
    sy = window.scrollY;
    var s = sy > 24;
    if (header && s !== stuck) { stuck = s; header.classList.toggle('is-stuck', s); }
    if (!reduce) apply(false);
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  if (!reduce && !compact) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      mxT = (e.clientX / window.innerWidth - 0.5) * 2;
      if (!mLoop && heroVisible) { mLoop = true; requestAnimationFrame(mStep); }
    }, { passive: true });
  }
  function mStep() {
    mx += (mxT - mx) * 0.07;
    if (Math.abs(mxT - mx) < 0.002) { mx = mxT; mLoop = false; apply(false); return; }
    apply(false);
    requestAnimationFrame(mStep);
  }

  /* ---------- lifecycle ---------- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      heroVisible = en[0].isIntersecting;
      if (heroVisible) { apply(true); kickFx(); }
    }, { rootMargin: '80px' }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kickFx(); });
  document.addEventListener('rm:themechange', function () { build(); drawFx(performance.now()); kickFx(); });
  var rt, lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', function () {
    /* ignore mobile URL-bar height jitter */
    if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 140) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    clearTimeout(rt); rt = setTimeout(function () { build(); drawFx(performance.now()); }, 140);
  });

  sy = window.scrollY;
  build();
  onScroll();
  nextShoot = performance.now() + 2500;
  drawFx(performance.now());
  kickFx();
  var startFn = function () { if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1100); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(); drawFx(performance.now()); startFn(); }, startFn); else startFn();
})();
