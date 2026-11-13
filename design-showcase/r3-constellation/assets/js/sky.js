/* Constellation sky.
   - A deterministic, hash-based star field (one star per grid cell) shared with the cursor: the hero bakes it
     once into a cached canvas, the cursor looks neighbours up through the same grid, so hidden stars below
     the hero exist only as latent points that the pointer wakes.
   - Bakes the star plate (stars, an atlas ecliptic arc, the RM constellation) once per resize, theme or tune change.
   - Twinkle is a few tiny elements pulsed with CSS opacity only; survey lines are transform-only. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.querySelector('.hero');

  /* ---------- tune + colour helpers (shared through window.RMSky) ---------- */
  function opt(id, d) {
    try { if (window.RMTune) { var v = window.RMTune.get(id); if (v !== undefined && v !== null && v !== '') return v; } } catch (e) {}
    return d;
  }
  function num(id, d) { var v = parseFloat(opt(id, d)); return isFinite(v) ? v : d; }
  function on(id, d) { var v = opt(id, d); return v === true || v === 'on' || v === 'true' || v === 1; }
  function dark() { return root.dataset.theme !== 'light'; }
  var cc = document.createElement('canvas').getContext('2d');
  function rgbOf(str, fb) {
    str = (str || '').trim();
    if (!str) return fb;
    cc.fillStyle = '#000000'; cc.fillStyle = str;
    var s = cc.fillStyle, m;
    if (s.charAt(0) === '#') return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
    m = s.match(/[\d.]+/g);
    return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : fb;
  }
  function pal() {
    var cs = getComputedStyle(root);
    return {
      v: rgbOf(cs.getPropertyValue('--violet'), [147, 160, 255]),
      c: rgbOf(cs.getPropertyValue('--cyan'), [127, 214, 255]),
      a: rgbOf(cs.getPropertyValue('--amber'), [255, 208, 138]),
      ink: dark() ? [236, 240, 255] : [29, 34, 54]
    };
  }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgba(c, a) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (+a).toFixed(3) + ')'; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------- star field ---------- */
  var S = { rm: null, C: 80, W: 0, H: 0, top: 0, HH: 900, stars: [] };
  var named = [];
  function h32(x, y, s) {
    var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s + 1, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function prob(y) {
    var HH = S.HH;
    if (y < HH) { var t = y / HH; return 0.78 * (t < 0.42 ? 1 : Math.max(0.4, 1 - (t - 0.42) / 0.5)); }
    return 0.55;
  }
  function cellStar(ix, iy) {
    var C = S.C;
    if (h32(ix, iy, 1) > prob(iy * C + C / 2)) return null;
    var r = h32(ix, iy, 4);
    return {
      x: (ix + 0.12 + 0.76 * h32(ix, iy, 2)) * C, y: (iy + 0.12 + 0.76 * h32(ix, iy, 3)) * C,
      m: r < 0.05 ? 3 : r < 0.2 ? 2 : r < 0.55 ? 1 : 0, k: (ix + 20000) * 40000 + (iy + 20000), t: h32(ix, iy, 5), d: 0
    };
  }
  function query(px, py, R) {
    var C = S.C, out = [], r2 = R * R, i0 = Math.floor((px - R) / C), i1 = Math.floor((px + R) / C), j0 = Math.floor((py - R) / C), j1 = Math.floor((py + R) / C), ix, iy, s, dx, dy, d2;
    if (j0 < 0) j0 = 0;
    for (iy = j0; iy <= j1; iy++) for (ix = i0; ix <= i1; ix++) {
      s = cellStar(ix, iy);
      if (!s) continue;
      dx = s.x - px; dy = s.y - py; d2 = dx * dx + dy * dy;
      if (S.rm && s.x > S.rm.l && s.x < S.rm.r && s.y > S.rm.t && s.y < S.rm.b) continue;
      if (d2 <= r2) { s.d = Math.sqrt(d2); out.push(s); }
    }
    return out;
  }
  window.RMSky = { query: query, pal: pal, opt: opt, num: num, on: on, dark: dark, rgba: rgba, mix: mixc, rgbOf: rgbOf, clamp01: clamp01, field: S };
  if (!hero) return;

  var compact = hero.classList.contains('compact');
  var cv = hero.querySelector('canvas.stars');
  var ui = hero.querySelector('.sky-ui');
  if (!cv || !ui) return;
  var ctx = cv.getContext('2d');
  var tw, lb, sv, svLines = [];
  ui.innerHTML = '<div class="sky-tw"></div><div class="sky-lb"></div><div class="survey"></div>';
  tw = ui.querySelector('.sky-tw'); lb = ui.querySelector('.sky-lb'); sv = ui.querySelector('.survey');

  /* ---------- RM constellation (design units 100 x 56) ---------- */
  var RM = {
    stars: [
      [6, 52, 2], [6, 4, 3], [28, 2.5, 1], [38, 15, 1], [27, 29, 2], [6, 29, 1], [41, 52, 1],
      [52, 52, 2], [52, 4, 2], [73, 37, 1], [94, 4, 3], [94, 52, 2],
      [46, 13, 0], [102, 30, 0], [-4, 18, 0]
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [7, 8], [8, 9], [9, 10], [10, 11]],
    loose: [[12, 8], [13, 11], [14, 1]]
  };
  var box = null;

  function rectIn(el, hr) {
    if (!el) return null;
    var rg = document.createRange(); rg.selectNodeContents(el);
    var r = rg.getBoundingClientRect();
    return { l: r.left - hr.left, r: r.right - hr.left, t: r.top - hr.top, b: r.bottom - hr.top };
  }
  function layoutBox() {
    box = null;
    var W = S.W, H = S.H, hr = hero.getBoundingClientRect();
    if (compact && W < 900) return;
    var art = hero.querySelector('.art'), artH = art ? art.clientHeight : 400, artTop = H - artH;
    var tr = rectIn(hero.querySelector('h1'), hr);
    if (!tr) return;
    var bx, by, bw, bh;
    if (W >= 900) {
      bx = Math.max(tr.r + 70, W * (compact ? 0.62 : 0.6));
      bw = Math.min(W - bx - Math.max(48, W * 0.06), compact ? 400 : 500, W * 0.34);
      if (bw < 220) { bw = 220; bx = W - bw - W * 0.05; }
      bh = bw * 0.56;
      by = Math.max(112, tr.t - 6);
      if (by + bh > artTop - 10) by = Math.max(96, artTop - 10 - bh);
      box = { x: bx, y: by, w: bw, h: bh, a: 1, tight: false };
    } else {
      bw = Math.min(W * 0.58, 216); bh = bw * 0.56;
      box = { x: W - bw - W * 0.07, y: 78, w: bw, h: bh, a: 1, tight: true };
    }
  }
  function boxPt(p) { return [box.x + (p[0] + 4) / 108 * box.w, box.y + (p[1] + 0) / 56 * box.h * 0.92 + box.h * 0.04]; }

  /* ---------- bake ---------- */
  var glowCache = {};
  function glow(c, a) {
    var key = c.join(',') + a, g = glowCache[key];
    if (g) return g;
    var s = 48, cn = document.createElement('canvas'); cn.width = cn.height = s;
    var x = cn.getContext('2d'), gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.3, rgba(c, a * 0.28)); gr.addColorStop(1, rgba(c, 0));
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    return (glowCache[key] = cn);
  }
  function plotStar(x, y, m, tint, a, P, isDark) {
    var s, ink = P.ink;
    if (isDark) {
      var col = tint < 0.2 ? P.warm : tint < 0.42 ? P.cool : P.white;
      if (m >= 1) { s = (m === 1 ? 14 : m === 2 ? 24 : 40); ctx.globalAlpha = a * (m === 1 ? 0.5 : 0.8); ctx.drawImage(glow(col, 0.55), x - s / 2, y - s / 2, s, s); }
      ctx.globalAlpha = a; ctx.fillStyle = rgba(col, 1);
      ctx.beginPath(); ctx.arc(x, y, m === 0 ? 0.65 : m === 1 ? 0.95 : m === 2 ? 1.25 : 1.6, 0, 6.283); ctx.fill();
      if (m >= 3) {
        ctx.globalAlpha = a * 0.7; ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
      }
    } else {
      ctx.globalAlpha = a * 0.95; ctx.fillStyle = rgba(ink, 1);
      ctx.beginPath(); ctx.arc(x, y, m === 0 ? 0.8 : m === 1 ? 1.1 : m === 2 ? 1.5 : 1.9, 0, 6.283); ctx.fill();
      if (m >= 3) {
        ctx.globalAlpha = a * 0.65; ctx.strokeStyle = rgba(ink, 1); ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(x - 6.5, y); ctx.lineTo(x + 6.5, y); ctx.moveTo(x, y - 6.5); ctx.lineTo(x, y + 6.5);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function ecliptic(P, isDark) {
    var W = S.W, H = S.H;
    var x0 = -0.05 * W, y0 = 0.64 * H, cx = 0.46 * W, cy = 0.02 * H, x1 = 1.05 * W, y1 = 0.3 * H;
    var col = isDark ? mixc(P.c, P.v, 0.4) : P.v;
    ctx.save();
    ctx.strokeStyle = rgba(col, isDark ? 0.3 : 0.34); ctx.lineWidth = 1; ctx.setLineDash([1.5, 6]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
    ctx.setLineDash([]);
    var N = Math.round(W / 56), i, t, px, py, dx, dy, l, major;
    for (i = 1; i < N; i++) {
      t = i / N;
      px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1; py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx); dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      l = Math.sqrt(dx * dx + dy * dy); major = i % 4 === 0;
      var nx = -dy / l * (major ? 6 : 3.5), ny = dx / l * (major ? 6 : 3.5);
      ctx.strokeStyle = rgba(col, major ? 0.5 : 0.3);
      ctx.beginPath(); ctx.moveTo(px - nx, py - ny); ctx.lineTo(px + nx, py + ny); ctx.stroke();
    }
    ctx.restore();
  }

  function bake() {
    var r = hero.getBoundingClientRect();
    S.W = Math.round(r.width); S.H = Math.round(r.height); S.top = r.top + window.scrollY; S.HH = S.top + S.H;
    var dens = Math.max(0.4, num('density', 1));
    S.C = 80 / Math.sqrt(dens);
    var isDark = dark(), P = pal();
    P.white = mixc(P.ink, [255, 255, 255], 0.0); P.cool = mixc(P.c, [255, 255, 255], 0.55); P.warm = mixc(P.a, [255, 255, 255], 0.5);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(S.W * dpr); cv.height = Math.round(S.H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S.W, S.H);
    glowCache = {};
    layoutBox();
    if (on('ecliptic', true)) ecliptic(P, isDark);
    S.stars = [];
    var i0 = 0, i1 = Math.ceil(S.W / S.C), j0 = Math.floor(S.top / S.C), j1 = Math.ceil(S.HH / S.C), ix, iy, s;
    for (iy = j0; iy <= j1; iy++) for (ix = i0; ix <= i1; ix++) {
      s = cellStar(ix, iy);
      if (!s || s.x > S.W + 4 || s.y < S.top || s.y > S.HH) continue;
      s.y -= S.top;
      if (box && s.x > box.x - 10 && s.x < box.x + box.w + 10 && s.y > box.y - 10 && s.y < box.y + box.h + 18 && s.m < 2) continue;
      S.stars.push(s);
      plotStar(s.x, s.y, s.m, s.t, 0.45 + 0.55 * h32(ix, iy, 6), P, isDark);
    }
    named = [];
    ui.style.opacity = '';
    lb.innerHTML = '';
    S.rm = box ? { l: box.x - 36, r: box.x + box.w + 36, t: S.top + box.y - 40, b: S.top + box.y + box.h + 44 } : null;
    if (box) drawRM(P, isDark);
    buildTwinkle();
    buildSurvey();
  }

  function drawRM(P, isDark) {
    var lineC = isDark ? mixc(P.v, [255, 255, 255], 0.45) : mixc(P.v, P.ink, 0.25);
    var pts = RM.stars.map(boxPt), A = box.a, i;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(lineC, (isDark ? 0.62 : 0.78) * A); ctx.lineWidth = isDark ? 1 : 0.9;
    ctx.beginPath();
    RM.lines.forEach(function (l) { ctx.moveTo(pts[l[0]][0], pts[l[0]][1]); ctx.lineTo(pts[l[1]][0], pts[l[1]][1]); });
    ctx.stroke();
    ctx.setLineDash([2, 5]); ctx.strokeStyle = rgba(lineC, 0.4 * A);
    ctx.beginPath();
    RM.loose.forEach(function (l) { ctx.moveTo(pts[l[0]][0], pts[l[0]][1]); ctx.lineTo(pts[l[1]][0], pts[l[1]][1]); });
    ctx.stroke();
    ctx.restore();
    for (i = 0; i < pts.length; i++) {
      var m = RM.stars[i][2];
      plotStar(pts[i][0], pts[i][1], m, i % 3 === 0 ? 0.1 : i % 3 === 1 ? 0.3 : 0.7, A, P, isDark);
      named.push({ x: pts[i][0], y: pts[i][1] + S.top, m: Math.max(1, m), k: -1 - i, t: 0.5, d: 0 });
    }
    function label(txt, x, y, cls, anchor) {
      var e = document.createElement('span');
      e.className = 'sky-label ' + cls; e.textContent = txt;
      e.style.left = x.toFixed(1) + 'px'; e.style.top = y.toFixed(1) + 'px';
      e.style.transform = anchor; e.style.opacity = A < 1 ? A : '';
      lb.appendChild(e);
    }
    if (!box.tight || box.a >= 1) {
      label('RM · Constellation', pts[1][0] - 2, pts[1][1] - 14, 'sk-title', 'translate(0,-100%)');
      label('Prototype', pts[0][0], pts[0][1] + 12, 'sk-name', 'translate(-8px,0)');
      label('Production', pts[11][0], pts[11][1] + 12, 'sk-name', 'translate(calc(-100% + 8px),0)');
    }
  }

  function buildTwinkle() {
    tw.innerHTML = '';
    var pool = S.stars.filter(function (s) { return s.m >= 1 && s.y < S.H * 0.62; });
    pool.sort(function (p, q) { return q.t - p.t; });
    var n = Math.min(pool.length, Math.round(14 * Math.min(1.5, num('density', 1)) + 4)), i, e, s;
    var frag = document.createDocumentFragment();
    for (i = 0; i < n; i++) {
      s = pool[i];
      e = document.createElement('i');
      e.className = 'tw' + (s.m >= 2 ? ' tw-big' : '');
      e.style.left = s.x.toFixed(1) + 'px'; e.style.top = s.y.toFixed(1) + 'px';
      e.style.setProperty('--td', (3.4 + (s.t * 7919 % 1) * 5).toFixed(2) + 's');
      e.style.setProperty('--dl', (-(s.t * 104729 % 1) * 8).toFixed(2) + 's');
      frag.appendChild(e);
    }
    tw.appendChild(frag);
  }

  /* ---------- survey lines from summits to stars (transform only) ---------- */
  var svItems = [];
  function segHit(x1, y1, x2, y2, r) {
    for (var i = 2; i <= 14; i++) {
      var t = i / 14, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      if (x > r.l && x < r.r && y > r.t && y < r.b) return true;
    }
    return false;
  }
  function buildSurvey() {
    sv.innerHTML = ''; svItems = [];
    if (compact || !on('survey', true) || !window.RMHero) return;
    var sp = window.RMHero.spots(), artTop = window.RMHero.artTop();
    if (!sp || !sp.length) return;
    var hr = hero.getBoundingClientRect(), obs = [];
    ['.hero-title', '.hero-statement', '.hero-support', '.hero-meta'].forEach(function (q) {
      var r = rectIn(hero.querySelector(q), hr); if (r) obs.push({ l: r.l - 14, r: r.r + 14, t: r.t - 10, b: r.b + 10 });
    });
    [].forEach.call(hero.querySelectorAll('.spots li span'), function (e) {
      var r = e.getBoundingClientRect(); if (r.width) obs.push({ l: r.left - hr.left - 10, r: r.right - hr.left + 10, t: r.top - hr.top - 10, b: r.bottom - hr.top + 10 });
    });
    [].forEach.call(hero.querySelectorAll('.hero-actions .btn'), function (b) {
      var r = b.getBoundingClientRect(); obs.push({ l: r.left - hr.left - 12, r: r.right - hr.left + 12, t: r.top - hr.top - 12, b: r.bottom - hr.top + 12 });
    });
    var used = [];
    sp.forEach(function (o) {
      var x1 = o.x, y1 = artTop + o.y, best = null, bs = 1e9;
      S.stars.forEach(function (s) {
        if (s.m < 1) return;
        var dy = y1 - s.y, dx = s.x - x1;
        if (dy < 110 || dy > 540 || Math.abs(dx) > 250) return;
        if (box && s.x > box.x - 24 && s.x < box.x + box.w + 24 && s.y > box.y - 24 && s.y < box.y + box.h + 40) return;
        for (var q = 0; q < used.length; q++) if (used[q] === s) return;
        for (var z = 0; z < obs.length; z++) if (segHit(x1, y1 - 10, s.x, s.y, obs[z])) return;
        var sc = Math.abs(dx) * 1.1 + Math.abs(dy - 300) * 0.3 - s.m * 18;
        if (sc < bs) { bs = sc; best = s; }
      });
      if (!best) return;
      used.push(best);
      var line = document.createElement('i'), mark = document.createElement('b');
      mark.style.left = best.x.toFixed(1) + 'px'; mark.style.top = best.y.toFixed(1) + 'px';
      sv.appendChild(line); sv.appendChild(mark);
      svItems.push({ line: line, o: o, x2: best.x, y2: best.y, artTop: artTop });
    });
    surveyFrame(0);
  }
  function surveyFrame(sy) {
    for (var i = 0; i < svItems.length; i++) {
      var it = svItems[i], x1 = it.o.x, y1 = it.artTop + it.o.y + sy * it.o.p - 11;
      var vx = it.x2 - x1, vy = it.y2 - y1, L = Math.sqrt(vx * vx + vy * vy);
      it.line.style.transform = 'translate3d(' + x1.toFixed(1) + 'px,' + y1.toFixed(1) + 'px,0) rotate(' + Math.atan2(-vx, vy).toFixed(4) + 'rad) scale(1,' + L.toFixed(1) + ')';
    }
  }
  var ticking = false;
  function onScroll() {
    ticking = false;
    if (!svItems.length) return;
    var sy = Math.min(window.scrollY, S.H);
    surveyFrame(sy);
    var sp = hero.querySelector('.spots');
    if (sp) sv.style.opacity = sp.style.opacity || '';
  }
  window.addEventListener('scroll', function () { if (!ticking && svItems.length) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  document.addEventListener('r3:spots', function () { buildSurvey(); onScroll(); });

  /* ---------- lifecycle ---------- */
  var rt = 0;
  function later(ms) { clearTimeout(rt); rt = setTimeout(function () { bake(); onScroll(); }, ms); }
  window.addEventListener('resize', function () { later(180); });
  document.addEventListener('rm:themechange', function () { later(120); });
  document.addEventListener('rm:tune', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    later(ch.indexOf('fonts') > -1 || ch.indexOf('init') > -1 ? 200 : 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { later(60); });
  bake();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { hero.classList.toggle('sky-off', !en[0].isIntersecting); }).observe(hero);
  }
})();
