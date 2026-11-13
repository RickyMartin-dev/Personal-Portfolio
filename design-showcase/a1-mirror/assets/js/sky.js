/* Mirror Lake scene.
   Everything static (stars, ridges, reflections) is rendered once per size/theme into canvases.
   Per frame only a few transforms are written on scroll, a tiny veil canvas refreshes at ~12fps,
   and the fx canvas draws shooting stars while one is in flight. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero');
  var fx = document.getElementById('fx');
  if (!hero || !fx) return;
  var sky = hero.querySelector('.sky'), ridgesEl = hero.querySelector('.ridges'), shore = hero.querySelector('.shore');
  var lake = hero.querySelector('.lake'), reflSky = hero.querySelector('.refl-sky'), reflRg = hero.querySelector('.refl-rg');
  var shimEl = hero.querySelector('canvas.shim'), marks = hero.querySelector('.marks');
  var s1 = sky.querySelector('.s1'), veil = sky.querySelector('.veil'), veil2 = reflSky.querySelector('.veil'), shimC = shimEl;
  var fxc = fx.getContext('2d'), vc = veil.getContext('2d'), vc2 = veil2.getContext('2d'), shc = shimC.getContext('2d'), mistEl = null;
  var compact = hero.classList.contains('compact');
  var EXT = 50, C_LAKE = 0.28;
  var W = 0, H = 0, skyH = 0, lakeH = 0, rng = 0, S = 0.62, dpr = 1;
  var dark = true, pal = {}, sprites = [];
  var shoot = null, meteor = null, nextShoot = 0, running = false, inView = true, lastVeil = 0, tmo = 0, built = false;

  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function hex(c) {
    c = (c || '#000').trim();
    if (c.charAt(0) !== '#') return [0, 0, 0];
    if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function size(cv, w, h, d) { cv.width = Math.max(1, Math.round(w * d)); cv.height = Math.max(1, Math.round(h * d)); }

  function readTheme() {
    dark = root.dataset.theme !== 'light';
    var cs = getComputedStyle(root);
    var g = function (n) { return cs.getPropertyValue(n).trim(); };
    pal = {
      c: ['l1c', 'l2c', 'l3c', 'l4c'].map(function (n) { return hex(g('--' + n)); }),
      m: ['l1m', 'l2m', 'l3m', 'l4m'].map(function (n) { return hex(g('--' + n)); }),
      b: ['l1b', 'l2b', 'l3b', 'l4b'].map(function (n) { return hex(g('--' + n)); }),
      shade: hex(g('--shade')), lit: hex(g('--lit')), rim: hex(g('--rim')),
      shadeO: parseFloat(g('--shade-o')) || 0.4, litO: parseFloat(g('--lit-o')) || 0.3
    };
    sprites = dark
      ? [mk('159,123,255', 0.62), mk('93,199,255', 0.44), mk('255,181,98', 0.26)]
      : [mk('150,120,230', 0.3), mk('255,170,150', 0.3), mk('255,196,130', 0.34)];
  }
  function mk(rgb, peakA) {
    var c = document.createElement('canvas'); c.width = 2; c.height = 128;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(0.55, 'rgba(' + rgb + ',' + (peakA * 0.45) + ')');
    gr.addColorStop(0.85, 'rgba(' + rgb + ',' + peakA + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 2, 128);
    return c;
  }

  /* ---------- stars (baked once) ---------- */
  function bakeStars() {
    var r = mulberry(7), n = dark ? Math.min(190, Math.round((W * skyH) / 7000)) : 0;
    size(s1, W, skyH, 1);
    var g = s1.getContext('2d'); g.clearRect(0, 0, W, skyH);
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = Math.pow(r(), 1.25) * skyH * 0.78, z = r(), a = z < 0.6 ? 0.4 : z < 0.9 ? 0.65 : 0.95, sz = 0.6 + r() * 0.8;
      if (z > 0.93) {
        g.save(); g.shadowColor = 'rgba(200,215,255,0.9)'; g.shadowBlur = 6; g.fillStyle = 'rgba(244,246,255,' + a + ')';
        g.fillRect(x - 0.6, y - 0.6, 1.8, 1.8); g.restore();
      } else { g.fillStyle = 'rgba(238,241,255,' + a + ')'; g.fillRect(x, y, sz, sz); }
    }
  }

  /* ---------- lake shimmer: a few soft translucent bands on one tiny canvas ---------- */
  var shimSprite = null, bands = [];
  function buildShimmer() {
    var r = mulberry(5), n = compact ? 4 : 8;
    bands = [];
    for (var i = 0; i < n; i++) {
      var d = (i + 0.5) / n;
      bands.push({ y: 0.04 + d * 0.62, w: 0.14 + r() * 0.2, c: r(), sp: 0.03 + r() * 0.035, ph: r() * 6.28, a: 0.16 + (1 - d) * 0.34, h: 1 + (1 - d) * 1.6 });
    }
    shimSprite = document.createElement('canvas'); shimSprite.width = 64; shimSprite.height = 1;
    var g = shimSprite.getContext('2d'), gr = g.createLinearGradient(0, 0, 64, 0);
    var col = getComputedStyle(root).getPropertyValue('--shim').trim() || 'rgba(255,214,170,0.55)';
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 1);
  }
  function drawShimmer(t) {
    var w = shimC.width, h = shimC.height;
    shc.clearRect(0, 0, w, h);
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i], bw = b.w * w, x = (w - bw) * (0.5 + 0.5 * Math.sin(t * b.sp + b.ph)) ;
      shc.globalAlpha = b.a; shc.drawImage(shimSprite, x, b.y * h, bw, b.h);
    }
    shc.globalAlpha = 1;
  }

  /* ---------- aurora veil: tiny canvas, ~12fps ---------- */
  function drawVeil(t) {
    var vw = veil.width, vh = veil.height, K = W / vw, vis = dark ? 1 : 0.9;
    if (compact) vis *= 0.8;
    vc.setTransform(1, 0, 0, 1, 0, 0); vc.clearRect(0, 0, vw, vh);
    vc.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (var r = 0; r < 3; r++) {
      for (var i = 0; i < vw; i++) {
        var x = i * K, u = x / W, edge = clamp01(u * 3) * clamp01((1 - u) * 3), side = 0.3 + 0.7 * u;
        var y0 = skyH * (0.1 + 0.08 * r) + Math.sin(x * 0.004 + t * 0.12 + r * 2.1) * skyH * 0.07 + Math.sin(x * 0.012 - t * 0.09 + r) * skyH * 0.025;
        var h = skyH * (0.3 + 0.08 * r) * (0.75 + 0.25 * Math.sin(x * 0.007 + t * 0.1 + r * 1.7));
        var a = (0.55 + 0.45 * Math.sin(x * 0.0035 + t * 0.17 + r * 3.1)) * edge * side * vis * (r === 2 ? 0.8 : 1);
        if (a < 0.02) continue;
        vc.globalAlpha = a;
        vc.drawImage(sprites[r], i, y0 / K, 1.6, h / K);
      }
    }
    vc.globalAlpha = 1; vc.globalCompositeOperation = 'source-over';
    vc2.clearRect(0, 0, vw, vh); vc2.drawImage(veil, 0, 0);
  }

  /* ---------- shooting stars (drawn on sky and mirrored in the water) ---------- */
  function head(c, x, y, rgb, sc) {
    var g = c.createRadialGradient(x, y, 0, x, y, 22 * sc);
    g.addColorStop(0, 'rgba(' + rgb + ',0.45)'); g.addColorStop(0.4, 'rgba(' + rgb + ',0.12)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 22 * sc, 0, 6.283); c.fill();
    c.fillStyle = dark ? 'rgba(255,247,236,0.95)' : 'rgba(196,112,12,0.95)';
    c.beginPath(); c.arc(x, y, 2 * sc, 0, 6.283); c.fill();
  }
  function streak(c, hx, hy, ang, len, a, w) {
    var tx = hx - Math.cos(ang) * len, ty = hy - Math.sin(ang) * len, g = c.createLinearGradient(tx, ty, hx, hy);
    var tail = dark ? '159,123,255' : '120,90,220', tip = dark ? '255,200,130' : '196,112,12';
    g.addColorStop(0, 'rgba(' + tail + ',0)'); g.addColorStop(0.6, 'rgba(' + (dark ? '93,199,255' : '60,140,210') + ',' + (a * 0.5) + ')');
    g.addColorStop(1, 'rgba(' + tip + ',' + a + ')');
    c.strokeStyle = g; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke();
  }
  function clearFx() { fxc.setTransform(1, 0, 0, 1, 0, 0); fxc.clearRect(0, 0, fx.width, fx.height); }
  function frameFx(now) {
    var drew = false;
    clearFx();
    if (shoot) {
      var p = (now - shoot.t0) / shoot.dur;
      if (p >= 1) { shoot = null; nextShoot = now + 7000 + Math.random() * 6000; }
      else {
        var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p, a = Math.sin(p * Math.PI);
        paint(hx, hy, shoot.ang, 130, 0.9 * a, 2, 0.7, 1, dark ? '255,200,130' : '196,112,12'); drew = true;
      }
    } else if (now >= nextShoot && !compact && !reduce) {
      var ang = (28 + Math.random() * 14) * Math.PI / 180;
      shoot = { sx: W * (0.05 + Math.random() * 0.5), sy: skyH * (0.04 + Math.random() * 0.3), ang: ang, dist: W * 0.5, dur: 900 + Math.random() * 500, t0: now };
    } else if (compact && now >= nextShoot) nextShoot = now + 12000;
    if (meteor) { drawMeteor(now); drew = true; }
    return drew;
  }
  function paint(hx, hy, ang, len, a, w, hs, ha, rgb) {
    if (len > 1) streak(fxc, hx, hy, ang, len, a, w);
    if (ha > 0) { fxc.globalAlpha = ha; head(fxc, hx, hy, rgb, hs); fxc.globalAlpha = 1; }
    /* mirrored in the still water (only while the lake sits at rest) */
    if (window.scrollY > 40 || hy > skyH) return;
    var ry = skyH + (skyH - hy) * S, tx = hx - Math.cos(ang) * len, ty = skyH + (skyH - (hy - Math.sin(ang) * len)) * S;
    if (len > 1) {
      var g = fxc.createLinearGradient(tx, ty, hx, ry), tail = dark ? '159,123,255' : '120,90,220', tip = dark ? '255,200,130' : '196,112,12';
      g.addColorStop(0, 'rgba(' + tail + ',0)'); g.addColorStop(1, 'rgba(' + tip + ',' + (a * 0.38).toFixed(3) + ')');
      fxc.strokeStyle = g; fxc.lineWidth = w * 1.2; fxc.lineCap = 'round'; fxc.beginPath(); fxc.moveTo(tx, ty); fxc.lineTo(hx, ry); fxc.stroke();
    }
    if (ha > 0) { fxc.globalAlpha = ha * 0.3; head(fxc, hx, ry, rgb, hs * 0.8); fxc.globalAlpha = 1; }
  }

  /* title underline drawn by a shooting star */
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg) return;
    var path = svg.querySelector('path'), rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-a1-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-a1-meteor', '1'); } catch (e) {}
    var cr = fx.getBoundingClientRect(), ex = rect.right - cr.left, ey = rect.top - cr.top + 4, dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left - cr.left, path: path, t0: performance.now(), d1: 800, d2: 1100 };
    kick();
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
    paint(hx, hy, el < m.d1 ? ang : 0, len, 0.95 * Math.max(ta, 0), 2.4, 1, ha, dark ? '255,200,130' : '196,112,12');
    if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }

  /* ---------- loop: rAF only while something streaks; otherwise a slow timer for the veil ---------- */
  function isVisible() { return !document.hidden && inView; }
  function tick(now) {
    tmo = 0;
    if (!isVisible()) { running = false; return; }
    if (now - lastVeil >= 85) { drawVeil(now / 1000); drawShimmer(now / 1000); if (mistEl) mistEl.style.transform = 'translate3d(' + (Math.sin(now / 11000) * 6).toFixed(2) + '%,0,0)'; lastVeil = now; }
    if (shoot || meteor || now >= nextShoot) { frameFx(now); fxDirty = true; }
    else if (fxDirty) { clearFx(); fxDirty = false; }
    if (shoot || meteor) requestAnimationFrame(tick); else tmo = setTimeout(function () { tick(performance.now()); }, 90);
  }
  var fxDirty = false;
  function kick() {
    if (running || reduce || !isVisible() || !built) return;
    running = true; requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { inView = e[0].isIntersecting; if (inView) kick(); }, { rootMargin: '80px' }).observe(hero);
  }

  /* ---------- scroll: transforms only ---------- */
  var lastMo = '1', rK = [0.05, 0.16], lyrs = [], refls = [], ticking = false, lastY = -1, stuck = false;
  function applyScroll() {
    ticking = false;
    var y = window.scrollY;
    var hd = document.querySelector('.site-header');
    var st = y > 24;
    if (hd && st !== stuck) { stuck = st; hd.classList.toggle('is-stuck', st); }
    var yc = Math.min(y, H + 60);
    if (yc === lastY || !built) return;
    lastY = yc;
    var i, t = 'translate3d(0,' + (-C_LAKE * yc).toFixed(1) + 'px,0)';
    shore.style.transform = t;
    if (marks) { marks.style.transform = t; var mo = clamp01(1 - yc / (H * 0.26)).toFixed(2); if (mo !== lastMo) { lastMo = mo; marks.style.opacity = mo; } }
    for (i = 0; i < lyrs.length; i++) lyrs[i].style.transform = 'translate3d(0,' + (-rK[i] * yc).toFixed(1) + 'px,0)';
    for (i = 0; i < refls.length; i++) refls[i].style.transform = 'translate3d(0,' + (-S * (C_LAKE - rK[i]) * yc).toFixed(1) + 'px,0) scale(1,' + (-S) + ')';
    reflSky.style.transform = 'translate3d(0,' + (-S * C_LAKE * yc).toFixed(1) + 'px,0) scale(1,' + (-S) + ')';
    if (mistW) mistW.style.transform = 'translate3d(0,' + (-0.09 * yc).toFixed(1) + 'px,0)';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(applyScroll); } }, { passive: true });

  /* ---------- ridges ---------- */
  var PEAKS = [
    [[.05,.74,.17,.14,1.3],[.12,.55,.3,.22,1.2],[.5,.4,.25,.3,1.15],[.86,.78,.26,.2,1.25]],
    [[.04,.3,.1,.1,1.2],[.15,.84,.17,.13,1.45],[.31,.5,.1,.1,1.3],[.42,.36,.2,.12,1.1],[.64,.5,.05,.04,1.3],[.72,1,.2,.17,1.5],[.8,.55,.05,.08,1.3],[.93,.5,.16,.14,1.2]],
    [[.06,.55,.2,.1,1.3],[.3,.35,.16,.2,1.15],[.52,.72,.12,.08,1.4],[.62,.4,.1,.18,1.15],[.88,.62,.2,.14,1.3]],
    [[.2,.6,.3,.25,1.1],[.6,.8,.3,.3,1.1],[.92,.5,.2,.2,1.1]]
  ];
  var LY = [
    { vb: 0.5, ph: 0.4, seed: 11, shade: 0.7, lit: 1 },
    { vb: 0.64, ph: 0.62, seed: 29, shade: 1, lit: 0.9 },
    { vb: 0.8, ph: 0.4, seed: 53, shade: 1, lit: 0.35 },
    { vb: 0.95, ph: 0.15, seed: 71, shade: 0.35, lit: 0 }
  ];
  function noiseArr(seedN, N) {
    var r = mulberry(seedN), h = [], i;
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
  function pts(idx, w, h) {
    var l = LY[idx], N = 360, noise = noiseArr(l.seed, N), out = [];
    var span = w < 700 ? 0.6 : 1, off = w < 700 ? 0.28 : 0;
    var ph = compact ? l.ph * 0.9 : l.ph, vb = compact ? Math.min(0.97, l.vb + 0.04) : l.vb;
    for (var i = 0; i <= N; i++) {
      var u = i / N, v = prof(PEAKS[idx], off + u * span);
      v = Math.max(0, v + noise[i] * 0.11 * (0.25 + v));
      out.push([u * w, h * (vb - ph * v)]);
    }
    return out;
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
  function facePath(g, p, i, v, h) {
    var a = p[i], b = p[v], lo = Math.min(i, v), hi = Math.max(i, v), run = [];
    for (var q = lo; q <= hi; q++) run.push(p[q]);
    if (v < i) run.reverse();
    g.moveTo(run[0][0], run[0][1]);
    for (var k = 1; k < run.length; k++) g.lineTo(run[k][0], run[k][1]);
    g.lineTo(a[0] + (b[0] - a[0]) * 0.5, b[1] + h * 0.1); g.closePath();
  }
  function yAtX(p, x) {
    for (var i = 1; i < p.length; i++) if (p[i][0] >= x) { var a = p[i - 1], b = p[i], t = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t; }
    return p[p.length - 1][1];
  }

  var mistW = null, tmpC = document.createElement('canvas');
  function drawLayer(g, i, p, all, top) {
    var l = LY[i];
    var gr = g.createLinearGradient(0, top, 0, rng);
    gr.addColorStop(0, rgba(pal.c[i], 1)); gr.addColorStop(0.38, rgba(pal.m[i], 1)); gr.addColorStop(1, rgba(pal.b[i], 1));
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (var k = 1; k < p.length; k++) g.lineTo(p[k][0], p[k][1]);
    g.lineTo(W, rng + EXT); g.lineTo(0, rng + EXT); g.closePath();
    g.fillStyle = gr; g.fill();
    var sums = summits(p, rng * (compact ? 0.035 : 0.05)), canFilter = 'filter' in fxc;
    [[l.shade, pal.shadeO, pal.shade, true], [l.lit, pal.litO, pal.lit, false]].forEach(function (kd) {
      if (!kd[0] || !sums.length) return;
      var t = tmpC.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, tmpC.width, tmpC.height);
      t.setTransform(rdpr, 0, 0, rdpr, 0, -oy * rdpr);
      var fg = t.createLinearGradient(0, top, 0, rng * 0.98);
      fg.addColorStop(0, rgba(kd[2], 1)); fg.addColorStop(1, rgba(kd[2], 0));
      t.fillStyle = fg; t.beginPath();
      sums.forEach(function (s) { facePath(t, p, s[0], kd[3] ? s[1] : s[2], rng); });
      t.fill();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.globalAlpha = kd[1] * kd[0];
      if (canFilter) g.filter = 'blur(' + (2.4 * rdpr).toFixed(1) + 'px)';
      g.drawImage(tmpC, 0, 0);
      g.restore();
    });
    if (i < 2) {
      g.save(); g.lineJoin = 'round'; g.strokeStyle = rgba(pal.rim, 0.75); g.lineWidth = 1; g.shadowColor = rgba(pal.rim, 0.55); g.shadowBlur = 5;
      var pen = false; g.beginPath();
      for (var j = 0; j < p.length; j++) {
        var topAt = Math.min(all[0][j][1], all[1][j][1], all[2][j][1], all[3][j][1]);
        if (Math.abs(topAt - p[j][1]) < 0.01) { if (pen) g.lineTo(p[j][0], p[j][1]); else g.moveTo(p[j][0], p[j][1]); pen = true; } else pen = false;
      }
      g.stroke(); g.restore();
    }
  }
  var oy = 0, rdpr = 1;
  function buildRidges() {
    ridgesEl.innerHTML = ''; reflRg.innerHTML = ''; lyrs = []; refls = []; mistW = null; mistEl = null;
    var all = [], i;
    rdpr = Math.min(dpr, 1.25);
    for (i = 0; i < 4; i++) all.push(pts(i, W, rng));
    [[0, 1], [2, 3]].forEach(function (grp, gi) {
      var top = Infinity;
      grp.forEach(function (i) { top = Math.min(top, Math.min.apply(null, all[i].map(function (q) { return q[1]; }))); });
      oy = Math.max(0, Math.floor(top - 8));
      var rh = rng + EXT - oy, cv = document.createElement('canvas');
      size(cv, W, rh, rdpr); size(tmpC, W, rh, rdpr);
      cv.style.top = oy + 'px'; cv.style.height = rh + 'px';
      var g = cv.getContext('2d'); g.setTransform(rdpr, 0, 0, rdpr, 0, -oy * rdpr);
      grp.forEach(function (i) {
        var p = all[i], t2 = Math.min.apply(null, p.map(function (q) { return q[1]; }));
        g.save(); drawLayer(g, i, p, all, t2); g.restore();
        g.setTransform(rdpr, 0, 0, rdpr, 0, -oy * rdpr);
      });
      ridgesEl.appendChild(cv); lyrs.push(cv);
      if (gi === 0) {
        var mw = document.createElement('div'); mw.className = 'mist-w';
        mw.style.top = (rng * 0.5) + 'px'; mw.style.height = (rng * 0.3) + 'px';
        mw.innerHTML = '<div class="mist"></div>';
        ridgesEl.appendChild(mw); mistW = mw; mistEl = mw.firstChild;
      }
      /* reflection: above-water part only, reduced resolution, flipped and squashed by CSS */
      var vis = rng - oy, rc = document.createElement('canvas'), sc = 0.7;
      size(rc, W, vis, sc);
      rc.getContext('2d').drawImage(cv, 0, 0, cv.width, Math.round(vis * rdpr), 0, 0, rc.width, rc.height);
      rc.style.top = (-vis) + 'px'; rc.style.height = vis + 'px';
      reflRg.appendChild(rc); refls.push(rc);
    });
    /* marks stand on the shoreline */
    if (marks) layoutMarks();
  }
  /* marks stand on the shore, right of the copy, with a guaranteed gap between labels */
  function layoutMarks() {
    var list = [].slice.call(marks.querySelectorAll('.alt')), GAP = 26, EDGE = W < 700 ? 14 : 40, i;
    list.forEach(function (a) {
      a.style.setProperty('--h', parseFloat(a.dataset.lift || '50') + 'px');
      if (!a.querySelector('.rf')) { var rf = document.createElement('div'); rf.className = 'rf'; rf.setAttribute('aria-hidden', 'true'); rf.innerHTML = a.innerHTML; a.appendChild(rf); }
    });
    var xs = list.map(function (a) { return W * parseFloat(W < 700 && a.dataset.xm ? a.dataset.xm : a.dataset.x); });
    var ws = list.map(function (a) { return 14 + a.querySelector(':scope > span').offsetWidth; });
    for (i = list.length - 1; i >= 0; i--) {
      var maxX = i === list.length - 1 ? W - EDGE - ws[i] : xs[i + 1] - GAP - ws[i];
      xs[i] = Math.min(xs[i], maxX);
    }
    for (i = 0; i < list.length; i++) {
      var minX = i === 0 ? EDGE : xs[i - 1] + ws[i - 1] + GAP;
      xs[i] = Math.max(xs[i], minX);
      list[i].style.left = xs[i] + 'px';
    }
  }

  function build(force) {
    var rect = hero.getBoundingClientRect(), w = Math.round(rect.width), h = Math.round(rect.height);
    if (!force && built && w === W && Math.abs(h - H) < 40) return;
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    skyH = sky.offsetHeight; lakeH = H - skyH; rng = ridgesEl.offsetHeight;
    S = Math.max(0.35, Math.min(0.7, (lakeH * 0.98) / skyH));
    size(fx, W, H, 1); size(shimC, Math.ceil(W / 4), Math.ceil(lakeH / 4), 1);
    shimC.style.height = lakeH + 'px';
    size(veil, Math.ceil(W / 10), Math.ceil(skyH / 10), 1); size(veil2, veil.width, veil.height, 1);
    reflSky.style.top = (-skyH) + 'px'; reflSky.style.height = skyH + 'px';
    readTheme();
    bakeStars();
    buildRidges();
    buildShimmer();
    built = true; lastY = -1;
    drawVeil(performance.now() / 1000);
    applyScroll();
  }

  document.addEventListener('rm:themechange', function () { if (built) { build(true); } });
  var rt;
  if ('ResizeObserver' in window) new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(function () { build(false); }, 140); }).observe(hero);
  else window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(false); }, 140); });

  build(true);
  nextShoot = performance.now() + 3000;
  kick();
  var startFn = function () { if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1100); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(false); startFn(); }, startFn); else startFn();
})();
