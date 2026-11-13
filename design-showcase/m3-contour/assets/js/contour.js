(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- noise ---------- */
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
    a0: 0.33, a1: 0.17, y0: 0.46, seed: 21, fx: 6.5, fz: 4.2, dz: 1.15, rows: 38, T: 72, step: 4,
    peaks: [[0.76, 0.34, 1.0, 0.14], [0.58, 0.30, 0.62, 0.10], [0.93, 0.32, 0.7, 0.10], [0.30, 0.48, 0.62, 0.17], [0.07, 0.6, 0.5, 0.15], [0.47, 0.8, 0.3, 0.2], [0.18, 0.92, 0.24, 0.2], [0.84, 0.84, 0.3, 0.2], [1.0, 0.55, 0.42, 0.13]]
  };
  var STRIP = {
    a0: 0.66, a1: 0.2, y0: 0.5, seed: 5, fx: 6, fz: 4, dz: 1.1, rows: 18, T: 30, step: 4,
    peaks: [[0.74, 0.4, 1.0, 0.18], [0.36, 0.5, 0.7, 0.2], [0.96, 0.3, 0.6, 0.14], [0.12, 0.6, 0.45, 0.16]]
  };

  var art = document.querySelector('.art');
  var svg = art && art.querySelector('svg');
  var spots = art && art.querySelector('.spots');
  var built = false, lastW = 0;

  function build(animate) {
    if (!art) return;
    var P = art.classList.contains('compact') ? STRIP : HERO;
    var w = art.clientWidth, totalH = art.clientHeight;
    if (!w) return;
    lastW = w;
    var narrow = w < 700;
    var T = narrow ? P.T * 0.7 : P.T;
    var Ah = totalH - T;
    var rows = narrow ? Math.round(P.rows * 0.8) : P.rows;
    var u0 = narrow && P === HERO ? 0.36 : 0, u1 = 1;
    var step = narrow ? 3 : P.step;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + totalH);
    svg.setAttribute('width', w); svg.setAttribute('height', totalH);
    svg.innerHTML = '';
    art.classList.toggle('static', !animate);

    var xs = [], x;
    for (x = -8; x <= w + 8; x += step) xs.push(x);
    var n = xs.length;

    // normalise heights
    var maxH = 0, data = [];
    for (var k = 0; k < rows; k++) {
      var v = k / (rows - 1), hs = [];
      for (var i = 0; i < n; i++) {
        var u = u0 + (u1 - u0) * (xs[i] / w);
        var hh = field(u, v, P);
        hs.push(hh); if (hh > maxH) maxH = hh;
      }
      data.push(hs);
    }
    var env = new Array(n).fill(1e9);
    var hot = 0.80 * maxH;
    var pathHot = [];
    for (k = 0; k < rows; k++) {
      var vv = k / (rows - 1);
      var yb = T + Ah * (P.y0 + (1 - P.y0 - 0.02) * Math.pow(vv, 1.5));
      var amp = Ah * (P.a0 + P.a1 * vv) / maxH;
      var ys = [], d = '', tick = '', rose = '', inRose = false;
      var hsr = data[k];
      for (i = 0; i < n; i++) {
        var y = yb - hsr[i] * amp;
        ys.push(y);
        if (y < env[i]) env[i] = y;
        d += (i ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + y.toFixed(1);
      }
      // shadow-side hatching
      for (i = 2; i < n - 2; i += (narrow ? 2 : 1)) {
        if (i % 2) continue;
        var s = (ys[i + 2] - ys[i - 2]) / (xs[i + 2] - xs[i - 2]);
        if (s > 0.35 && hsr[i] > 0.12 * maxH) {
          var len = Math.min(22, 4 + s * 7) * (0.6 + 0.4 * vv);
          tick += 'M' + xs[i].toFixed(1) + ' ' + (ys[i] + 1).toFixed(1) + 'v' + len.toFixed(1);
        }
      }
      for (i = 0; i < n; i++) {
        if (hsr[i] > hot) {
          rose += (inRose ? 'L' : 'M') + xs[i].toFixed(1) + ' ' + ys[i].toFixed(1);
          inRose = true;
        } else inRose = false;
      }
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'row');
      g.style.setProperty('--k', k);
      g.style.setProperty('--p', ((1 - vv) * 0.3).toFixed(3));
      var op = (0.38 + 0.62 * Math.pow(vv, 0.7)).toFixed(2);
      var fill = document.createElementNS(NS, 'path');
      fill.setAttribute('class', 'fl');
      fill.setAttribute('d', d + 'L' + (w + 8) + ' ' + (totalH + 90) + 'L-8 ' + (totalH + 90) + 'Z');
      g.appendChild(fill);
      if (tick) {
        var tk = document.createElementNS(NS, 'path');
        tk.setAttribute('class', 'tk'); tk.setAttribute('d', tick); tk.style.strokeOpacity = (op * 0.55).toFixed(2);
        g.appendChild(tk);
      }
      var ln = document.createElementNS(NS, 'path');
      ln.setAttribute('class', 'ln'); ln.setAttribute('d', d); ln.setAttribute('pathLength', '1'); ln.style.strokeOpacity = op;
      g.appendChild(ln);
      if (rose) {
        var rs = document.createElementNS(NS, 'path');
        rs.setAttribute('class', 'rs'); rs.setAttribute('d', rose); rs.setAttribute('pathLength', '1');
        g.appendChild(rs);
      }
      svg.appendChild(g);
    }
    placeSpots(xs, env, w, narrow);
    built = true;
  }

  function placeSpots(xs, env, w, narrow) {
    if (!spots) return;
    var items = [].slice.call(spots.children);
    var n = xs.length, sm = [], i, j;
    for (i = 0; i < n; i++) {
      var a = 0, c = 0;
      for (j = -4; j <= 4; j++) { if (env[i + j] !== undefined) { a += env[i + j]; c++; } }
      sm.push(a / c);
    }
    var cand = [];
    for (i = 3; i < n - 3; i++) {
      if (sm[i] <= sm[i - 1] && sm[i] < sm[i + 1] && xs[i] > w * 0.08 && xs[i] < w * 0.95) cand.push(i);
    }
    cand.sort(function (a, b) { return env[a] - env[b]; });
    var pool = [];
    cand.forEach(function (ci) {
      if (pool.length >= 8) return;
      for (var q = 0; q < pool.length; q++) if (Math.abs(xs[pool[q]] - xs[ci]) < w * 0.07) return;
      pool.push(ci);
    });
    var cnt = Math.min(items.length, pool.length), picked = [];
    if (cnt === items.length) {
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
      placed.push({ li: li, x: xs[ci], y: env[ci] });
    });
    lastSpots = { placed: placed, narrow: narrow, w: w, xs: xs, env: env };
    layoutSpots();
  }

  var lastSpots = null;
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
    if (!lastSpots || !art) return;
    var P = lastSpots.placed, narrow = lastSpots.narrow, artR = art.getBoundingClientRect();
    var obstacles = [];
    var hero = art.closest('.hero');
    if (hero) {
      [textRect(hero.querySelector('.hero-title')), textRect(hero.querySelector('.hero-statement'))].forEach(function (r) { if (r) obstacles.push(pad(r, 40)); });
      [].forEach.call(hero.querySelectorAll('.hero-actions .btn, .hero-actions .btn-link'), function (b) { obstacles.push(pad(rectOf(b), 40)); });
    }
    var hs = narrow ? [24, 50, 76, 100] : [8, 16, 24, 32, 44, 58, 72, 86, 100, 114, 128, 142];
    var vpw = window.innerWidth;
    function boxes(o) {
      var r = rectOf(o.li.querySelector('span')), ld = rectOf(o.li.querySelector('i'));
      var tri = { l: ld.left === undefined ? ld.l - 6 : ld.l - 6, r: ld.l + 7, t: ld.b, b: ld.b + 13 };
      return { label: r, leader: { l: ld.l - 1, r: ld.r + 1, t: ld.t, b: ld.b + 13 } , tri: tri };
    }
    function score(o, others) {
      var bx = boxes(o), n = 0, lab = pad(bx.label, 24);
      if (bx.label.l < 4 || bx.label.r > vpw - 4 || bx.label.t < artR.top - 70) n += 50;
      var sx = lastSpots.xs, se = lastSpots.env, mn = 1e9;
      for (var q2 = 0; q2 < sx.length; q2++) {
        var vx = artR.left + sx[q2];
        if (vx >= bx.label.l - 6 && vx <= bx.label.r + 6 && se[q2] < mn) mn = se[q2];
      }
      if (bx.label.b + 10 > artR.top + mn) n += 15;
      obstacles.forEach(function (ob) { if (hit(bx.label, ob) || hit(bx.leader, ob)) n += 20; });
      others.forEach(function (q) {
        var qb = boxes(q);
        if (hit(lab, qb.leader) || hit(lab, qb.label) || hit(pad(qb.label, 24), bx.leader)) n += 10;
      });
      return n;
    }
    for (var pass = 0; pass < 2; pass++) {
      P.forEach(function (o) {
        var others = P.filter(function (q) { return q !== o; });
        var edge = o.x > lastSpots.w - (narrow ? 130 : 230);
        var best = null, bs = 1e9;
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
        o.li.classList.toggle("flip", best.fl);
        o.li.style.setProperty('--h', best.h + 'px');
        o.li.style.setProperty('--lw', best.lw + 'em');
      });
    }
  }

  /* ---------- stars (hero only) ---------- */
  var sc = document.querySelector('.hero-stars');
  var sctx = sc && sc.getContext('2d');
  var stars = [], SW = 0, SH = 0, px = 0, py = 0, tx = 0, ty = 0, heroVisible = true, running = false;
  var theme = { dark: true };
  function readTheme() { theme.dark = root.dataset.theme !== 'light'; }
  function seedStars() {
    if (!sc) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    SW = sc.clientWidth; SH = sc.clientHeight;
    sc.width = Math.round(SW * dpr); sc.height = Math.round(SH * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var s = 13, r = function () { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) / 4294967296); };
    var count = Math.min(170, Math.round(SW * SH / 7500));
    stars = [];
    for (var i = 0; i < count; i++) {
      var yy = Math.pow(r(), 1.25) * SH * 0.72;
      stars.push({ x: r() * SW, y: yy + 70, z: r() < 0.7 ? 0 : 1, a: 0.35 + r() * 0.65, p: r() * 6.28, f: 0.3 + r() * 1.1 });
    }
    drawStars(performance.now());
  }
  function drawStars(now) {
    if (!sctx) return;
    sctx.clearRect(0, 0, SW, SH);
    var t = now / 1000;
    var rgb = theme.dark ? '236,238,244' : '12,13,16';
    var base = theme.dark ? 1 : 0.42;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = reduce ? 0.85 : 0.7 + 0.3 * Math.sin(t * s.f + s.p);
      var a = s.a * tw * base * (s.z ? 1 : 0.7);
      var sx = Math.round(s.x + px * (s.z + 1) * 4), sy = Math.round(s.y + py * (s.z + 1) * 4);
      sctx.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
      var sz = s.z ? 2 : 1;
      sctx.fillRect(sx, sy, sz, sz);
    }
  }
  function loop(now) {
    if (!heroVisible || document.hidden) { running = false; return; }
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    drawStars(now);
    requestAnimationFrame(loop);
  }
  function kick() { if (!running && !reduce && sc && heroVisible) { running = true; requestAnimationFrame(loop); } }
  window.addEventListener('pointermove', function (e) {
    if (!SW) return;
    tx = (e.clientX / window.innerWidth - 0.5) * -2; ty = (e.clientY / window.innerHeight - 0.5) * -2;
  }, { passive: true });
  if (sc && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; kick(); }).observe(sc.parentNode);
  }
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('rm:themechange', function () { readTheme(); drawStars(performance.now()); });

  /* ---------- scroll ---------- */
  var ticking = false, header = document.querySelector('.site-header');
  function onScroll() {
    ticking = false;
    var y = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (header) {
      header.classList.toggle('is-stuck', y > 24);
      header.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
    }
    if (art && !reduce) art.style.setProperty('--sy', Math.min(y, 900).toFixed(1) + 'px');
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (art && Math.abs(art.clientWidth - lastW) > 2) build(false);
      seedStars();
    }, 140);
  });

  readTheme();
  var go = function () { build(!reduce); seedStars(); onScroll(); kick(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layoutSpots(); });
  if (document.fonts && document.fonts.ready) { go(); } else go();
})();
