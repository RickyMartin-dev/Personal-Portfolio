/* Aurora Lines hero: engraved range (cached SVG bands, transform-only parallax),
   baked aurora veil + stars, shooting stars and the title meteor on a sleeping canvas. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduceMq = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = (reduceMq && reduceMq.matches) || root.dataset.motion === 'off';
  var hero = document.querySelector('.hero');
  var art = document.querySelector('.hero .art');
  var fore = document.querySelector('.hero .art-fore');
  if (!hero || !art) return;
  var compact = hero.classList.contains('compact');
  var spots = hero.querySelector('.spots');
  var header = document.querySelector('.site-header');
  var dark = root.dataset.theme !== 'light';
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- terrain field (Contour's generator) ---------- */
  function hash2(ix, iz, seed) {
    var h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed + 1, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, z, seed) {
    var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    var sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    var a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  }
  function ridged(x, z, seed) {
    var s = 0, a = 1, f = 1, n = 0;
    for (var o = 0; o < 5; o++) {
      var v = 1 - Math.abs(vnoise(x * f, z * f, seed + o * 7) * 2 - 1);
      s += v * v * a; n += a; a *= 0.5; f *= 2.05;
    }
    return s / n;
  }
  function field(u, v, P) {
    var env = 0, i;
    for (i = 0; i < P.peaks.length; i++) {
      var p = P.peaks[i];
      var dx = (u - p[0]) / p[3], dz = (v - p[1]) / (p[3] * P.dz);
      var d = Math.sqrt(dx * dx + dz * dz);
      env = Math.max(env, p[2] * Math.exp(-Math.pow(d, 1.05) * 1.3));
    }
    var r = ridged(u * P.fx, v * P.fz, P.seed);
    var r2 = ridged(u * P.fx * 1.8 + 11, v * P.fz * 1.8, P.seed + 40);
    return env * (0.5 + 0.75 * r) + 0.07 * r2 * (0.4 + v);
  }
  var HERO = {
    a0: 0.33, a1: 0.17, y0: 0.46, seed: 21, fx: 6.5, fz: 4.2, dz: 1.15, rows: 38, T: 40, step: 4, bands: 5,
    peaks: [[0.76, 0.34, 1.0, 0.14], [0.58, 0.30, 0.62, 0.10], [0.93, 0.32, 0.7, 0.10], [0.30, 0.48, 0.62, 0.17], [0.07, 0.6, 0.5, 0.15], [0.47, 0.8, 0.3, 0.2], [0.18, 0.92, 0.24, 0.2], [0.84, 0.84, 0.3, 0.2], [1.0, 0.55, 0.42, 0.13]]
  };
  var STRIP = {
    a0: 0.66, a1: 0.2, y0: 0.5, seed: 5, fx: 6, fz: 4, dz: 1.1, rows: 18, T: 14, step: 4, bands: 5,
    peaks: [[0.74, 0.4, 1.0, 0.18], [0.36, 0.5, 0.7, 0.2], [0.96, 0.3, 0.6, 0.14], [0.12, 0.6, 0.45, 0.16]]
  };

  var heroH = 0, bandEls = [], bandP = [], lastW = 0, lastSpots = null;

  function build() {
    var P = compact ? STRIP : HERO;
    var w = art.clientWidth, H = art.clientHeight;
    if (!w || !H) return;
    lastW = w;
    var narrow = w < 700;
    var T = P.T, Ah = H - T;
    var rows = narrow ? Math.round(P.rows * 0.8) : P.rows;
    var nb = narrow ? Math.max(4, P.bands - 2) : P.bands;
    var per = Math.ceil(rows / nb);
    var u0 = narrow && !compact ? 0.36 : 0, u1 = 1;
    var step = narrow ? 3 : P.step;
    var xs = [], x, i, k;
    for (x = -8; x <= w + 8; x += step) xs.push(x);
    var n = xs.length;

    var maxH = 0, data = [];
    for (k = 0; k < rows; k++) {
      var v = k / (rows - 1), hs = [];
      for (i = 0; i < n; i++) {
        var hh = field(u0 + (u1 - u0) * (xs[i] / w), v, P);
        hs.push(hh); if (hh > maxH) maxH = hh;
      }
      data.push(hs);
    }
    var env = new Array(n).fill(1e9), envRow = new Array(n).fill(0);
    var hot = 0.80 * maxH;
    var rowsOut = [];
    var minY = 1e9;
    for (k = 0; k < rows; k++) {
      var vv = k / (rows - 1);
      var yb = T + Ah * (P.y0 + (1 - P.y0 - 0.02) * Math.pow(vv, 1.5));
      var amp = Ah * (P.a0 + P.a1 * vv) / maxH;
      var ys = [], d = '', tick = '', rose = '', inRose = false, hsr = data[k];
      for (i = 0; i < n; i++) {
        var y = yb - hsr[i] * amp;
        ys.push(y);
        if (y < env[i]) { env[i] = y; envRow[i] = k; }
        if (y < minY) minY = y;
        d += (i ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + y.toFixed(1);
      }
      for (i = 2; i < n - 2; i += (narrow ? 2 : 1)) {
        if (i % 2) continue;
        var s = (ys[i + 2] - ys[i - 2]) / (xs[i + 2] - xs[i - 2]);
        if (s > 0.35 && hsr[i] > 0.12 * maxH) {
          var len = Math.min(22, 4 + s * 7) * (0.6 + 0.4 * vv);
          tick += 'M' + xs[i].toFixed(1) + ' ' + (ys[i] + 1).toFixed(1) + 'v' + len.toFixed(1);
        }
      }
      for (i = 0; i < n; i++) {
        if (hsr[i] > hot) { rose += (inRose ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1); inRose = true; }
        else inRose = false;
      }
      rowsOut.push({ vv: vv, d: d, tick: tick, rose: '', ys: ys, hsr: hsr });
    }

    // rim highlight only where a row is the visible envelope (one clean stroke, no doubling)
    rowsOut.forEach(function (R) {
      var r2 = '', on = false;
      for (var q = 0; q < n; q++) {
        if (R.hsr[q] > hot && R.ys[q] <= env[q] + 1.2) { r2 += (on ? 'L' : 'M') + xs[q].toFixed(1) + ' ' + R.ys[q].toFixed(1); on = true; }
        else on = false;
      }
      R.rose = r2;
    });
    // assemble one SVG per depth band
    var html = [], b;
    bandP = [];
    for (b = 0; b < nb; b++) {
      var r0 = b * per, r1 = Math.min(rows, r0 + per);
      if (r0 >= rows) break;
      bandP.push(Math.max(0, (1 - (r0 + r1 - 1) / 2 / (rows - 1)) * 0.3));
      var g = '<svg class="band" aria-hidden="true" focusable="false" viewBox="0 0 ' + w + ' ' + H + '" style="--b:' + b + '">' +
        '<defs><linearGradient id="lg' + b + '" gradientUnits="userSpaceOnUse" x1="0" y1="' + minY.toFixed(0) + '" x2="0" y2="' + H + '">' +
        '<stop offset="0" style="stop-color:var(--ln-top)"/><stop offset="0.14" style="stop-color:var(--ln-top)"/><stop offset="0.4" style="stop-color:var(--ln-mid)"/>' +
        '<stop offset="0.72" style="stop-color:var(--ln-low)"/><stop offset="1" style="stop-color:var(--ln-base)"/></linearGradient></defs>';
      for (k = r0; k < r1; k++) {
        var R = rowsOut[k], vq = R.vv;
        var far = Math.round(Math.pow(1 - vq, 1.3) * 100);
        var op = (0.34 + 0.66 * Math.pow(vq, 0.7)).toFixed(2);
        g += '<path class="fl" style="fill:color-mix(in srgb,var(--far) ' + far + '%,var(--ground))" d="' + R.d + 'L' + (w + 8) + ' ' + (H + 6) + 'L-8 ' + (H + 6) + 'Z"/>';
        if (R.tick) g += '<path class="tk" style="stroke:url(#lg' + b + ');stroke-opacity:' + (op * 0.5).toFixed(2) + '" d="' + R.tick + '"/>';
        g += '<path class="ln" pathLength="1" style="stroke:url(#lg' + b + ');stroke-opacity:' + op + '" d="' + R.d + '"/>';
        if (R.rose) g += '<path class="rg" d="' + R.rose + '"/><path class="rs" pathLength="1" style="stroke-opacity:' + (0.5 + 0.5 * vq).toFixed(2) + '" d="' + R.rose + '"/>';
      }
      html.push(g + '</svg>');
    }
    art.classList.remove('static');
    art.innerHTML = html.join('');
    bandEls = [].slice.call(art.children);
    placeFore();
    if (reduce) { art.classList.add('static'); if (fore) fore.classList.add('static'); }
    else { clearTimeout(build.t); build.t = setTimeout(function () { art.classList.add('static'); if (fore) fore.classList.add('static'); }, 6800); }
    if (spots) placeSpots(xs, env, envRow, per, w, narrow);
  }

  /* the nearest depth bands live in a second layer above the headline, so summits pass in front of the letters */
  function foreCount() {
    if (!fore) return 0;
    var m = R4.tune('ridge', 'front');
    return m === 'off' ? 0 : m === 'deep' ? 3 : 2;
  }
  function placeFore() {
    if (!fore || !bandEls.length) return;
    var n = Math.min(foreCount(), bandEls.length - 1), len = bandEls.length;
    for (var i = 0; i < len; i++) (i >= len - n ? fore : art).appendChild(bandEls[i]);
  }

  /* ---------- spot heights (collision-aware) ---------- */
  function placeSpots(xs, env, envRow, per, w, narrow) {
    var items = [].slice.call(spots.children), n = xs.length, sm = [], i, j;
    spots.style.opacity = '';
    items.forEach(function (li) { li.style.transform = ''; });
    for (i = 0; i < n; i++) {
      var a = 0, c = 0;
      for (j = -4; j <= 4; j++) { if (env[i + j] !== undefined) { a += env[i + j]; c++; } }
      sm.push(a / c);
    }
    var cand = [];
    for (i = 3; i < n - 3; i++) {
      if (sm[i] <= sm[i - 1] && sm[i] < sm[i + 1] && xs[i] > w * 0.08 && xs[i] < w * 0.95) cand.push(i);
    }
    var emin = 1e9, emax = -1e9;
    env.forEach(function (e) { if (e < emin) emin = e; if (e > emax) emax = e; });
    cand = cand.filter(function (ci) { return env[ci] < emin + (emax - emin) * 0.5; });
    cand.sort(function (a, b) { return env[a] - env[b]; });
    var pool = [];
    cand.forEach(function (ci) {
      if (pool.length >= 8) return;
      for (var q = 0; q < pool.length; q++) if (Math.abs(xs[pool[q]] - xs[ci]) < w * 0.07) return;
      pool.push(ci);
    });
    var cnt = Math.min(items.length, pool.length), picked = [];
    if (cnt === items.length && cnt === 3) {
      var bestSet = null, bestScore = -1e9;
      for (var a1 = 0; a1 < pool.length; a1++) for (var b1 = a1 + 1; b1 < pool.length; b1++) for (var c1 = b1 + 1; c1 < pool.length; c1++) {
        var set = [pool[a1], pool[b1], pool[c1]].sort(function (x1, x2) { return xs[x1] - xs[x2]; });
        var gap = Math.min(xs[set[1]] - xs[set[0]], xs[set[2]] - xs[set[1]]);
        var sc = Math.min(gap, w * 0.3) - (env[set[0]] + env[set[1]] + env[set[2]]) * 0.25;
        if (sc > bestScore) { bestScore = sc; bestSet = set; }
      }
      picked = bestSet || [];
    } else picked = pool.slice(0, cnt);
    var top = picked.length ? picked.reduce(function (m, v) { return env[v] < env[m] ? v : m; }) : -1;
    picked.sort(function (a, b) { return xs[a] - xs[b]; });
    var placed = [];
    items.forEach(function (li, idx) {
      var ci = picked[idx];
      if (ci === undefined) { li.style.display = 'none'; return; }
      li.style.display = '';
      li.classList.toggle('is-main', ci === top);
      li.style.left = xs[ci].toFixed(1) + 'px';
      li.style.top = env[ci].toFixed(1) + 'px';
      li.style.setProperty('--h', '30px');
      li.classList.toggle('flip', xs[ci] > w - (narrow ? 130 : 230));
      placed.push({ li: li, x: xs[ci], y: env[ci], p: bandP[Math.min(bandP.length - 1, Math.floor(envRow[ci] / per))] || 0 });
    });
    lastSpots = { placed: placed, narrow: narrow, w: w, xs: xs, env: env };
    layoutSpots();
  }
  function rectOf(el) { var r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }
  function pad(r, p) { return { l: r.l - p, r: r.r + p, t: r.t - p, b: r.b + p }; }
  function hit(a, b) { return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t; }
  function textRect(el) {
    if (!el) return null;
    var rg = document.createRange(); rg.selectNodeContents(el);
    var r = rg.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom };
  }
  function layoutSpots() {
    if (!lastSpots || !spots) return;
    var P = lastSpots.placed, narrow = lastSpots.narrow, artR = art.getBoundingClientRect();
    var obstacles = [];
    ['.hero-title', '.hero-statement', '.hero-support', '.hero-meta'].forEach(function (s) {
      var r = textRect(hero.querySelector(s)); if (r) obstacles.push(pad(r, narrow ? 8 : 36));
    });
    [].forEach.call(hero.querySelectorAll('.hero-actions .btn'), function (b) { obstacles.push(pad(rectOf(b), narrow ? 8 : 36)); });
    var hs = narrow ? [24, 50, 76, 100, 126] : [8, 16, 24, 32, 44, 58, 72, 86, 100, 114, 128, 142];
    var vpw = window.innerWidth;
    function boxes(o) {
      var r = rectOf(o.li.querySelector('span')), ld = rectOf(o.li.querySelector('i'));
      return { label: r, leader: { l: ld.l - 1, r: ld.r + 1, t: ld.t, b: ld.b + 13 } };
    }
    function score(o, others) {
      var bx = boxes(o), n = 0, lab = pad(bx.label, narrow ? 2 : 24);
      if (bx.label.l < 4 || bx.label.r > vpw - 4) n += 50;
      var sx = lastSpots.xs, se = lastSpots.env, mn = 1e9;
      for (var q2 = 0; q2 < sx.length; q2++) {
        var vx = artR.left + sx[q2];
        if (vx >= bx.label.l - 6 && vx <= bx.label.r + 6 && se[q2] < mn) mn = se[q2];
      }
      if (bx.label.b + 10 > artR.top + mn) n += 15;
      obstacles.forEach(function (ob) { if (hit(bx.label, ob) || hit(bx.leader, ob)) n += 20; });
      others.forEach(function (q) {
        var qb = boxes(q);
        if (hit(lab, qb.leader) || hit(lab, qb.label) || hit(pad(qb.label, narrow ? 2 : 24), bx.leader)) n += narrow ? 30 : 10;
      });
      return n;
    }
    for (var pass = 0; pass < 2; pass++) {
      P.forEach(function (o) {
        var others = P.filter(function (q) { return q !== o; });
        var edge = o.x > lastSpots.w - (narrow ? 130 : 230);
        var best = { fl: edge, h: hs[3], lw: 14 }, bs = 1e9;
        [14, 9.5].forEach(function (lw) {
          [edge, !edge].forEach(function (fl) {
            hs.forEach(function (h) {
              o.li.classList.toggle('flip', fl);
              o.li.style.setProperty('--h', h + 'px');
              o.li.style.setProperty('--lw', lw + 'em');
              var sc = score(o, others) + (fl !== edge ? 1 : 0) + h / 200 + (lw < 14 ? 0.5 : 0);
              if (sc < bs) { bs = sc; best = { fl: fl, h: h, lw: lw }; }
            });
          });
        });
        o.li.classList.toggle('flip', best.fl);
        o.li.style.setProperty('--h', best.h + 'px');
        o.li.style.setProperty('--lw', best.lw + 'em');
      });
    }
  }

  /* ---------- baked sky: aurora veil + stars ---------- */
  var W = 0, H = 0;
  var veils = [].slice.call(hero.querySelectorAll('canvas.veil'));
  var starCs = [].slice.call(hero.querySelectorAll('canvas.stars'));
  function strip(stops) {
    var c = document.createElement('canvas'); c.width = 1; c.height = 64;
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, 1, 64);
    return c;
  }
  function bakeVeil() {
    if (!veils.length) return;
    var pc = R4.read(), M = R4.mix, S = R4.str, WH = [255, 255, 255];
    var cy = pc.cyan, vi = pc.violet, am = pc.amber;
    if (!dark) { cy = M(cy, WH, 0.45); vi = M(vi, WH, 0.5); am = M(am, WH, 0.55); }
    var ribbons = [
      [[0, 'rgba(' + S(cy) + ',0)'], [0.3, 'rgba(' + S(cy) + ',0.5)'], [0.62, 'rgba(' + S(M(cy, vi, 0.55)) + ',0.3)'], [1, 'rgba(' + S(vi) + ',0)']],
      [[0, 'rgba(' + S(vi) + ',0)'], [0.34, 'rgba(' + S(vi) + ',0.5)'], [0.7, 'rgba(' + S(M(vi, am, 0.5)) + ',0.22)'], [1, 'rgba(' + S(am) + ',0)']]
    ];
    var cv = veils[0];
    {
      var K = 6, cw = Math.max(40, Math.ceil(W * 1.16 / K)), ch = Math.max(40, Math.ceil(H * 0.78 / K));
      cv.width = cw; cv.height = ch;
      var v = cv.getContext('2d');
      v.clearRect(0, 0, cw, ch);
      v.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      for (var r = 0; r < ribbons.length; r++) {
      var sp = strip(ribbons[r]), rnd = rng(31 + r * 17);
      var fold = rnd() * 6, amp = dark ? 1.0 : 0.8;
      for (var i = 0; i < cw; i++) {
        var u = i / cw, x = i * K;
        var edge = clamp01(u * 2.6) * clamp01((1 - u) * 2.6);
        var side = 0.22 + 0.78 * Math.pow(u, 0.8);
        var y0 = H * (0.2 + 0.1 * r) - u * H * 0.12 + Math.sin(x * 0.0042 + fold + r * 2.1) * H * 0.08 + Math.sin(x * 0.011 + fold) * H * 0.02;
        var h = H * (0.34 + 0.08 * r) * (0.8 + 0.2 * Math.sin(x * 0.0071 + r * 1.7 + fold));
        var rays = 0.86 + 0.14 * Math.sin(x * 0.045 + fold * 2);
        var a = (0.5 + 0.5 * Math.sin(x * 0.0036 + r * 3.1 + fold)) * edge * side * rays * amp;
        if (a < 0.02) continue;
        v.globalAlpha = Math.min(1, a);
        v.drawImage(sp, i - 0.5, y0 / K, 2.2, h / K);
      }
      }
      v.globalAlpha = 1;
    }
  }
  function bakeStars() {
    if (!starCs.length) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), SW = Math.round(W * 1.16), SH = Math.round(H);
    starCs.forEach(function (cv, layer) {
      cv.width = Math.round(SW * dpr); cv.height = Math.round(SH * dpr);
      var x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, SW, SH);
      if (!dark) return;
      var rnd = rng(77 + layer * 13), count = Math.min(150, Math.round(SW * SH / 14000));
      for (var i = 0; i < count; i++) {
        var yy = Math.pow(rnd(), 1.3) * SH * (compact ? 0.8 : 0.7) + 60;
        var big = rnd() < 0.18, a = 0.35 + rnd() * 0.65;
        x.fillStyle = 'rgba(' + (rnd() < 0.2 ? '186,214,255' : '238,241,255') + ',' + (a * (big ? 1 : 0.7)).toFixed(2) + ')';
        var s = big ? 1.8 : 1.1;
        x.beginPath(); x.arc(rnd() * SW, yy, s * 0.6, 0, 6.283); x.fill();
      }
    });
  }

  /* ---------- fx canvas: shooting stars + underline meteor (sleeps when idle) ---------- */
  var fx = document.getElementById('fx'), fctx = fx && fx.getContext('2d');
  var fdpr = 1, shoot = null, meteor = null, fxRun = false, nextTimer = 0, heroVisible = true;
  var sprite = { c: null, dark: null };
  function makeSprite() {
    var s = 48, c = document.createElement('canvas'); c.width = c.height = s;
    var pc = R4.read(), x = c.getContext('2d'), rgb = R4.str(dark ? R4.mix(pc.amber, [255, 255, 255], 0.3) : pc.amber);
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(' + rgb + ',0.5)'); g.addColorStop(0.35, 'rgba(' + rgb + ',0.14)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.fillStyle = dark ? 'rgba(255,247,236,0.95)' : 'rgba(' + rgb + ',0.95)';
    x.beginPath(); x.arc(s / 2, s / 2, 2, 0, 6.283); x.fill();
    sprite.c = c; sprite.dark = dark;
  }
  function head(x, y, scale) {
    if (sprite.dark !== dark) makeSprite();
    var s = 48 * scale; fctx.drawImage(sprite.c, x - s / 2, y - s / 2, s, s);
  }
  function streak(hx, hy, ang, len, a, w) {
    var tx = hx - Math.cos(ang) * len, ty = hy - Math.sin(ang) * len;
    var g = fctx.createLinearGradient(tx, ty, hx, hy);
    var pc = R4.read(), vi = R4.str(pc.violet), cy = R4.str(pc.cyan), am = R4.str(dark ? R4.mix(pc.amber, [255, 255, 255], 0.3) : pc.amber);
    g.addColorStop(0, 'rgba(' + vi + ',0)');
    g.addColorStop(0.6, 'rgba(' + cy + ',' + (a * 0.5) + ')');
    g.addColorStop(1, 'rgba(' + am + ',' + a + ')');
    fctx.strokeStyle = g; fctx.lineWidth = w; fctx.lineCap = 'round';
    fctx.beginPath(); fctx.moveTo(tx, ty); fctx.lineTo(hx, hy); fctx.stroke();
  }
  function fxFrame(now) {
    fctx.clearRect(0, 0, W, H);
    var live = false;
    if (shoot) {
      var p = (now - shoot.t0) / shoot.dur;
      if (p >= 1) shoot = null;
      else {
        live = true;
        var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p;
        streak(hx, hy, shoot.ang, 130, 0.9 * Math.sin(p * Math.PI), 2);
        head(hx, hy, 0.7);
      }
    }
    if (meteor) { live = true; drawMeteor(now); }
    if (live && heroVisible && !document.hidden) requestAnimationFrame(fxFrame);
    else { fctx.clearRect(0, 0, W, H); fxRun = false; }
  }
  function fxKick() { if (!fxRun && fctx && !reduce) { fxRun = true; requestAnimationFrame(fxFrame); } }
  function scheduleShoot(delay) {
    clearTimeout(nextTimer);
    if (compact || reduce) return;
    nextTimer = setTimeout(function () {
      if (heroVisible && !document.hidden && dark) {
        var ang = (28 + Math.random() * 14) * Math.PI / 180;
        shoot = { sx: W * (0.05 + Math.random() * 0.5), sy: H * (0.04 + Math.random() * 0.28), ang: ang, dist: W * 0.5, dur: 900 + Math.random() * 500, t0: performance.now() };
        fxKick();
      }
      scheduleShoot(7000 + Math.random() * 6000);
    }, delay);
  }
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg) return;
    var path = svg.querySelector('path');
    var rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-r4-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200 || !fctx) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-r4-meteor', '1'); } catch (e) {}
    var cr = fx.getBoundingClientRect();
    var ex = rect.right - cr.left, ey = rect.top - cr.top + 4;
    var dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left - cr.left, path: path, t0: performance.now(), d1: 800, d2: 1100 };
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
    if (ha > 0) { fctx.globalAlpha = ha; head(hx, hy, 1); fctx.globalAlpha = 1; }
    if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }

  /* ---------- pointer parallax on the star layers (transform only, sleeps when settled) ---------- */
  var ptx = 0, pty = 0, pcx = 0, pcy = 0, prun = false;
  function pframe() {
    pcx += (ptx - pcx) * 0.08; pcy += (pty - pcy) * 0.08;
    for (var i = 0; i < starCs.length; i++) {
      var k = (i + 1) * 5;
      starCs[i].style.transform = 'translate3d(' + (pcx * k).toFixed(2) + 'px,' + (pcy * k).toFixed(2) + 'px,0)';
    }
    if (Math.abs(ptx - pcx) + Math.abs(pty - pcy) > 0.002 && heroVisible) requestAnimationFrame(pframe); else prun = false;
  }
  if (!reduce && !compact) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || !heroVisible) return;
      ptx = (e.clientX / window.innerWidth - 0.5) * -2; pty = (e.clientY / window.innerHeight - 0.5) * -2;
      if (!prun) { prun = true; requestAnimationFrame(pframe); }
    }, { passive: true });
  }

  /* ---------- scroll: header state + band parallax (transforms/opacity only) ---------- */
  var ticking = false, lastSy = -1;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    if (header) header.classList.toggle('is-stuck', y > 24);
    if (reduce) return;
    var sy = Math.min(y, heroH);
    if (sy === lastSy) return;
    lastSy = sy;
    for (var b = 0; b < bandEls.length; b++) {
      bandEls[b].style.transform = 'translate3d(0,' + Math.round(sy * (bandP[b] || 0)) + 'px,0)';
    }
    if (lastSpots) {
      for (var s = 0; s < lastSpots.placed.length; s++) {
        var o = lastSpots.placed[s];
        o.li.style.transform = 'translate3d(0,' + (sy * o.p).toFixed(1) + 'px,0)';
      }
      spots.style.opacity = String(Math.max(0, 1 - sy / (heroH * 0.55)).toFixed(3));
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- lifecycle ---------- */
  function measure() {
    var r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height); heroH = H;
    fdpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (fx) {
      fx.width = Math.round(W * fdpr); fx.height = Math.round(H * fdpr);
      fctx.setTransform(fdpr, 0, 0, fdpr, 0, 0);
    }
  }
  function fullBuild(rebuildArt) {
    measure();
    bakeVeil(); bakeStars();
    if (rebuildArt) build();
    lastSy = -1; onScroll();
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; hero.classList.toggle('off', !heroVisible); if (heroVisible && (shoot || meteor)) fxKick(); }).observe(hero);
  }
  document.addEventListener('rm:themechange', function () { dark = root.dataset.theme !== 'light'; sprite.dark = null; bakeVeil(); bakeStars(); });
  var tt;
  document.addEventListener('rm:tune', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    clearTimeout(tt);
    tt = setTimeout(function () {
      dark = root.dataset.theme !== 'light'; sprite.dark = null;
      reduce = (reduceMq && reduceMq.matches) || root.dataset.motion === 'off';
      bakeVeil(); bakeStars();
      if (ch.indexOf('ridge') > -1 || !ch.length) { placeFore(); lastSy = -1; onScroll(); }
      if (reduce) { art.classList.add('static'); if (fore) fore.classList.add('static'); }
    }, 120);
  });
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var changed = Math.abs(art.clientWidth - lastW) > 2;
      fullBuild(changed);
    }, 160);
  });

  fullBuild(true);
  scheduleShoot(2800);
  var startFn = function () { if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1100); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layoutSpots(); startFn(); }, startFn); else startFn();
})();
