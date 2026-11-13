(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('stars');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var stars = [];
  var px = 0, py = 0, tx = 0, ty = 0;
  var dawn = 0;
  var running = false, last = 0;
  var meteor = null;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  var theme = { dark: true, star: '238,241,248', accent: '#ffb35c' };
  function readTheme() {
    theme.dark = root.dataset.theme !== 'light';
    theme.star = theme.dark ? '238,241,248' : '11,18,38';
    theme.accent = cssVar('--accent') || '#ffb35c';
  }

  function seedStars() {
    var r = rng(7);
    var count = Math.min(240, Math.round((W * H) / 9500));
    stars = [];
    for (var i = 0; i < count; i++) {
      var d = r();
      stars.push({
        x: r() * W, y: r() * H * 0.85,
        z: d < 0.6 ? 0 : d < 0.9 ? 1 : 2,
        s: 0.5 + r() * 0.9, p: r() * 6.28, f: 0.4 + r() * 1.3,
        cross: r() > 0.94
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedStars();
    draw(performance.now());
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var t = now / 1000;
    var fade = 1 - dawn * 0.65;
    var base = theme.dark ? 1.25 : 0.55;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var par = (s.z + 1) * 5;
      var x = s.x + px * par, y = s.y + py * par;
      var tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.f + s.p);
      var a = (s.z === 0 ? 0.38 : s.z === 1 ? 0.6 : 0.85) * tw * fade * base;
      ctx.fillStyle = 'rgba(' + theme.star + ',' + a.toFixed(3) + ')';
      var size = s.s * (s.z === 2 ? 1.5 : 1);
      if (theme.dark) { ctx.fillRect(x, y, size, size); }
      else { ctx.beginPath(); ctx.arc(x, y, size * 0.8, 0, 6.283); ctx.fill(); }
      if (s.cross && s.z === 2) {
        ctx.strokeStyle = 'rgba(' + theme.star + ',' + (a * 0.5).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
      }
    }
    if (meteor) drawMeteor(now);
  }

  /* meteor */
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg) return;
    var path = svg.querySelector('path');
    var rect = svg.getBoundingClientRect();
    var w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4');
    path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-v1-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-v1-meteor', '1'); } catch (e) {}
    var endX = rect.right, endY = rect.top + 4;
    var dy = endY + 60, dx = dy * 1.7;
    meteor = { sx: endX + dx, sy: -60, ex: endX, ey: endY, lx: rect.left, path: path, w: w, t0: 0, d1: 800, d2: 1000, done: false };
    meteor.t0 = performance.now();
    if (!running) loop(performance.now());
  }

  function drawMeteor(now) {
    var m = meteor, el = now - m.t0;
    var hx, hy, trailAlpha = 1;
    var p1 = ease(el / m.d1);
    var acc = Math.pow(p1, 1.5);
    if (el < m.d1) {
      hx = m.sx + (m.ex - m.sx) * acc; hy = m.sy + (m.ey - m.sy) * acc;
      m.path.style.strokeDashoffset = '1';
    } else {
      var p2 = easeOutExpo(ease((el - m.d1) / m.d2));
      hx = m.ex - (m.ex - m.lx) * p2; hy = m.ey;
      m.path.style.strokeDashoffset = String(1 - p2);
      trailAlpha = 1 - ease((el - m.d1) / 500);
    }
    var ang = Math.atan2(m.ey - m.sy, m.ex - m.sx);
    var len = 240 * (el < m.d1 ? Math.min(1, acc * 3 + 0.1) : trailAlpha);
    var headA = el > m.d1 + m.d2 ? 1 - ease((el - m.d1 - m.d2) / 400) : 1;
    var dark = theme.dark;
    if (el < m.d1 + 500) {
      var bx = hx, by = hy;
      if (el >= m.d1) { bx = m.ex; by = m.ey; }
      var tx2 = bx - Math.cos(ang) * len, ty2 = by - Math.sin(ang) * len;
      var g = ctx.createLinearGradient(tx2, ty2, bx, by);
      var col = dark ? '255,179,92' : '173,89,0';
      g.addColorStop(0, 'rgba(' + col + ',0)');
      g.addColorStop(1, 'rgba(' + col + ',' + (0.9 * Math.max(trailAlpha, 0)).toFixed(3) + ')');
      var nx = -Math.sin(ang), ny = Math.cos(ang);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(tx2, ty2); ctx.lineTo(bx + nx * 1.4, by + ny * 1.4); ctx.lineTo(bx - nx * 1.4, by - ny * 1.4); ctx.closePath();
      ctx.fill();
    }
    if (headA > 0) {
      ctx.fillStyle = dark ? 'rgba(255,244,226,' + headA + ')' : 'rgba(173,89,0,' + headA + ')';
      ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, 6.283); ctx.fill();
    }
    if (el > m.d1 + m.d2 + 450) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }

  /* loop */
  function visible() { return !document.hidden && window.scrollY < window.innerHeight * 1.15; }
  function loop(now) {
    if (!visible() && !meteor) { running = false; return; }
    running = true;
    if (!reduce || meteor) {
      px += (tx - px) * 0.04; py += (ty - py) * 0.04;
      draw(now);
    }
    requestAnimationFrame(loop);
  }
  function kick() { if (!running && visible() && !reduce) { running = true; requestAnimationFrame(loop); } }

  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / W - 0.5) * -2; ty = (e.clientY / H - 0.5) * -2;
  }, { passive: true });

  /* dawn tied to scroll */
  var ticking = false;
  function updateDawn() {
    ticking = false;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var d = Math.min(1, Math.max(0, window.scrollY / max));
    dawn = d;
    root.style.setProperty('--dawn', d.toFixed(3));
    var hd = document.querySelector('.site-header');
    if (hd) hd.classList.toggle('is-stuck', window.scrollY > 24);
    if (reduce) draw(performance.now()); else kick();
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updateDawn); } }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  document.addEventListener('rm:themechange', function () { readTheme(); draw(performance.now()); });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { resize(); buildRidges(); }, 120); });

  /* ridges: seeded midpoint displacement, angular alpine silhouettes */
  function smooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function makeRidge(seed, peaks) {
    var r = rng(seed), N = 160, h = [];
    for (var i = 0; i <= N; i++) {
      var f = i / N, k = 1;
      while (k < peaks.length - 1 && peaks[k][0] < f) k++;
      var a = peaks[k - 1], b = peaks[k], t = (f - a[0]) / (b[0] - a[0] || 1);
      h.push(a[1] + (b[1] - a[1]) * t);
    }
    var amp = 0.05;
    for (var step = 32; step >= 2; step /= 2, amp *= 0.6) {
      for (var j = step / 2; j < N; j += step) h[j] += (r() - 0.5) * 2 * amp;
    }
    for (var m = 1; m < N; m += 2) h[m] += (r() - 0.5) * 0.02;
    return h;
  }
  var P_FAR = [[0,.25],[.08,.4],[.15,.3],[.24,.55],[.3,.38],[.37,.5],[.45,.3],[.55,.62],[.6,.45],[.68,.85],[.72,.6],[.78,.7],[.85,.5],[.92,.78],[1,.45]];
  var P_MID = [[0,.3],[.1,.2],[.18,.5],[.23,.35],[.33,.28],[.42,.55],[.5,.4],[.57,.3],[.65,.55],[.74,.95],[.8,.6],[.88,.4],[.95,.7],[1,.5]];
  var P_NEAR = [[0,.2],[.07,.12],[.14,.35],[.2,.18],[.3,.25],[.38,.15],[.46,.4],[.52,.22],[.6,.18],[.68,.5],[.74,.3],[.82,.22],[.9,.6],[.95,.35],[1,.55]];
  var layers = [
    { base: 0.3, amp: 0.5, h: makeRidge(11, P_FAR), cls: 'r-far', line: 'r-far-line' },
    { base: 0.5, amp: 0.5, h: makeRidge(29, P_MID), cls: 'r-mid', line: 'r-mid-line' },
    { base: 0.7, amp: 0.4, h: makeRidge(53, P_NEAR), cls: 'r-near', line: 'r-line' }
  ];
  function env(x, w) { return w < 700 ? 0.85 : 0.45 + 0.55 * smooth(0.2, 0.7, x / w); }
  function layerPts(L, w, h) {
    var N = L.h.length - 1, span = w < 700 ? 0.55 : 1, off = w < 700 ? 0.25 : 0, pts = [];
    for (var i = 0; i <= N; i++) {
      var x = (i / N) * w;
      var v = L.h[Math.min(N, Math.round(((i / N) * span + off) * N))];
      pts.push([x, h * (L.base + 0.08) - h * L.amp * env(x, w) * v * 1.1 + h * 0.2 * (1 - env(x, w)) * 0]);
    }
    return pts;
  }
  function yAt(pts, x) {
    for (var i = 1; i < pts.length; i++) if (pts[i][0] >= x) {
      var a = pts[i - 1], b = pts[i], t = (x - a[0]) / (b[0] - a[0] || 1);
      return a[1] + (b[1] - a[1]) * t;
    }
    return pts[pts.length - 1][1];
  }
  var NS = 'http://www.w3.org/2000/svg';
  function buildRidges() {
    var wrap = document.querySelector('.ridges');
    if (!wrap) return;
    var w = wrap.clientWidth, h = wrap.clientHeight;
    var compact = wrap.classList.contains('compact');
    var svg = wrap.querySelector('svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '';
    var near = null;
    layers.forEach(function (L, idx) {
      var Lc = compact ? { base: L.base + 0.12, amp: L.amp * 0.8, h: L.h } : L;
      var pts = layerPts(Lc, w, h);
      var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
      var fill = document.createElementNS(NS, 'path');
      fill.setAttribute('d', d + ' L' + w + ' ' + (h + 2) + ' L0 ' + (h + 2) + 'Z');
      fill.setAttribute('class', L.cls);
      svg.appendChild(fill);
      var line = document.createElementNS(NS, 'path');
      line.setAttribute('d', d);
      line.setAttribute('class', L.line);
      line.setAttribute('stroke-linejoin', 'miter');
      svg.appendChild(line);
      if (idx === 2) near = pts;
    });
    wrap.querySelectorAll('.alt').forEach(function (a) {
      var fx = parseFloat(w < 700 && a.dataset.xm ? a.dataset.xm : a.dataset.x);
      var x = w * fx, y = yAt(near, x), top = y;
      for (var dx = 0; dx <= 170; dx += 6) top = Math.min(top, yAt(near, Math.min(w, x + dx)));
      var lift = Math.max(parseFloat(a.dataset.lift || '44'), y - top + 46);
      a.style.left = x + 'px';
      a.style.top = y + 'px';
      a.style.setProperty('--h', lift + 'px');
    });
  }

  readTheme();
  buildRidges();
  resize();
  updateDawn();
  if (!reduce) kick();
  var startFn = function () {
    var go = function () { if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1200); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  };
  if (document.readyState === 'complete') startFn(); else window.addEventListener('load', startFn);
})();
