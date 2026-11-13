(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('fx');
  var hero = document.querySelector('.hero');
  if (!canvas || !hero) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var stars = [], dust = [], sprites = [];
  var px = 0, py = 0, tx = 0, ty = 0, dawn = 0;
  var running = false, meteor = null, shoot = null, nextShoot = 0;
  var dark = true;
  var vcan = document.createElement('canvas'), vctx = vcan.getContext('2d');
  var NS = 'http://www.w3.org/2000/svg';
  var compact = hero.classList.contains('compact');

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  /* ---------- theme-dependent sprites for the aurora veil ---------- */
  function makeSprite(rgb, peakA) {
    var c = document.createElement('canvas'); c.width = 2; c.height = 256;
    var g = c.getContext('2d');
    var gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(' + rgb + ',0)');
    gr.addColorStop(0.55, 'rgba(' + rgb + ',' + (peakA * 0.45) + ')');
    gr.addColorStop(0.85, 'rgba(' + rgb + ',' + peakA + ')');
    gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    return c;
  }
  function readTheme() {
    dark = root.dataset.theme !== 'light';
    sprites = dark
      ? [makeSprite('159,123,255', 0.5), makeSprite('93,199,255', 0.34), makeSprite('255,181,98', 0.22)]
      : [makeSprite('150,120,230', 0.3), makeSprite('255,170,150', 0.3), makeSprite('255,196,130', 0.34)];
  }

  function seed() {
    var r = rng(7);
    stars = [];
    var n = Math.min(170, Math.round((W * H) / 8000));
    for (var i = 0; i < n; i++) {
      var d = r();
      stars.push({ x: r() * W, y: r() * H * 0.62, z: d < 0.6 ? 0 : d < 0.9 ? 1 : 2, s: 0.5 + r() * 0.9, p: r() * 6.28, f: 0.4 + r() * 1.3 });
    }
    dust = [];
    var cols = ['159,123,255', '93,199,255', '255,181,98'];
    for (var j = 0; j < 26; j++) {
      dust.push({ x: r() * W, y: r() * H, r: 0.5 + r() * 0.9, a: 0.08 + r() * 0.16, vx: (r() - 0.5) * 0.14, vy: -(0.1 + r() * 0.28), c: cols[Math.floor(r() * 3)], p: r() * 6.28 });
    }
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(rect.width); H = Math.round(rect.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vcan.width = Math.ceil(W / 5); vcan.height = Math.ceil(H / 5);
    seed();
    buildRidges();
    draw(performance.now());
  }

  /* ---------- drawing ---------- */
  function drawVeil(t) {
    var vis = (dark ? 1 : 0.9) * (1 - dawn * 0.6);
    if (compact) vis *= 0.8;
    var v = vctx, vw = vcan.width, K = W / vw;
    v.setTransform(1, 0, 0, 1, 0, 0);
    v.clearRect(0, 0, vw, vcan.height);
    v.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    for (var r = 0; r < sprites.length; r++) {
      for (var i = 0; i < vw; i++) {
        var x = i * K, u = x / W;
        var edge = clamp01(u * 3) * clamp01((1 - u) * 3);
        var side = 0.3 + 0.7 * u;
        var y0 = H * (0.1 + 0.08 * r) + Math.sin(x * 0.004 + t * 0.12 + r * 2.1) * H * 0.07 + Math.sin(x * 0.012 - t * 0.09 + r) * H * 0.025;
        var h = H * (0.26 + 0.07 * r) * (0.75 + 0.25 * Math.sin(x * 0.007 + t * 0.1 + r * 1.7));
        var a = (0.55 + 0.45 * Math.sin(x * 0.0035 + t * 0.17 + r * 3.1)) * edge * side * vis * (r === 2 ? 0.8 : 1);
        if (a < 0.02) continue;
        v.globalAlpha = a;
        v.drawImage(sprites[r], i, y0 / K, 1.6, h / K);
      }
    }
    v.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(vcan, 0, 0, W, H);
  }

  function head(x, y, rgb, scale) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, 22 * scale);
    g.addColorStop(0, 'rgba(' + rgb + ',0.45)'); g.addColorStop(0.4, 'rgba(' + rgb + ',0.12)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 22 * scale, 0, 6.283); ctx.fill();
    ctx.fillStyle = dark ? 'rgba(255,247,236,0.95)' : 'rgba(196,112,12,0.95)';
    ctx.beginPath(); ctx.arc(x, y, 2 * scale, 0, 6.283); ctx.fill();
  }

  function streak(hx, hy, ang, len, a, w) {
    var tx2 = hx - Math.cos(ang) * len, ty2 = hy - Math.sin(ang) * len;
    var g = ctx.createLinearGradient(tx2, ty2, hx, hy);
    var tail = dark ? '159,123,255' : '120,90,220', tip = dark ? '255,200,130' : '196,112,12';
    g.addColorStop(0, 'rgba(' + tail + ',0)');
    g.addColorStop(0.6, 'rgba(' + (dark ? '93,199,255' : '60,140,210') + ',' + (a * 0.5) + ')');
    g.addColorStop(1, 'rgba(' + tip + ',' + a + ')');
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx2, ty2); ctx.lineTo(hx, hy); ctx.stroke();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var t = now / 1000;
    var fade = 1 - dawn * 0.7;
    drawVeil(t);
    if (dark) {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i], par = (s.z + 1) * 5;
        var x = s.x + px * par, y = s.y + py * par;
        var tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.f + s.p);
        var a = (s.z === 0 ? 0.38 : s.z === 1 ? 0.62 : 0.9) * tw * fade;
        ctx.fillStyle = 'rgba(238,241,255,' + a.toFixed(3) + ')';
        var sz = s.s * (s.z === 2 ? 1.5 : 1);
        ctx.fillRect(x, y, sz, sz);
      }
    }
    for (var j = 0; j < dust.length; j++) {
      var p = dust[j];
      if (!reduce) { p.x += p.vx; p.y += p.vy; if (p.y < -4) { p.y = H * (0.5 + Math.random() * 0.4); p.x = Math.random() * W; } }
      var al = Math.max(0.02, p.a + Math.sin(t * 0.8 + p.p) * 0.05) * (dark ? 1 : 1.4);
      ctx.fillStyle = 'rgba(' + (dark ? p.c : '255,255,255') + ',' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    if (!reduce) { updateShoot(now); if (meteor) drawMeteor(now); }
  }

  function updateShoot(now) {
    if (!shoot) {
      if (now >= nextShoot && !compact) {
        var ang = (28 + Math.random() * 14) * Math.PI / 180;
        shoot = { sx: W * (0.05 + Math.random() * 0.5), sy: H * (0.04 + Math.random() * 0.3), ang: ang, dist: W * 0.5, dur: 900 + Math.random() * 500, t0: now };
      } else if (compact && now >= nextShoot) { nextShoot = now + 12000; }
      return;
    }
    var p = (now - shoot.t0) / shoot.dur;
    if (p >= 1) { shoot = null; nextShoot = now + 7000 + Math.random() * 6000; return; }
    var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p;
    var a = Math.sin(p * Math.PI);
    streak(hx, hy, shoot.ang, 130, 0.9 * a, 2);
    head(hx, hy, dark ? '255,200,130' : '196,112,12', 0.7);
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
    try { seen = sessionStorage.getItem('rm-m2-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-m2-meteor', '1'); } catch (e) {}
    var cr = canvas.getBoundingClientRect();
    var ex = rect.right - cr.left, ey = rect.top - cr.top + 4;
    var dy = ey + 60, dx = dy * 1.7;
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
    if (len > 1) streak(hx, hy, el < m.d1 ? ang : 0, len, 0.95 * Math.max(ta, 0), 2.4);
    if (ha > 0) { ctx.globalAlpha = ha; head(hx, hy, dark ? '255,200,130' : '196,112,12', 1); ctx.globalAlpha = 1; }
    if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }

  /* ---------- loop ---------- */
  function visible() { return !document.hidden && window.scrollY < hero.offsetHeight + 40; }
  function loop(now) {
    if (!visible() && !meteor) { running = false; return; }
    running = true;
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    draw(now);
    requestAnimationFrame(loop);
  }
  function kick() { if (!running && visible() && !reduce) { running = true; requestAnimationFrame(loop); } else if (meteor && !running) { running = true; requestAnimationFrame(loop); } }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    tx = (e.clientX / window.innerWidth - 0.5) * -2; ty = (e.clientY / window.innerHeight - 0.5) * -2;
  }, { passive: true });

  /* ---------- scroll: dawn, header, parallax ---------- */
  var ticking = false, lyr = [];
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    var hh = Math.max(1, hero.offsetHeight);
    dawn = clamp01(y / hh);
    root.style.setProperty('--dawn', dawn.toFixed(3));
    var hd = document.querySelector('.site-header');
    if (hd) hd.classList.toggle('is-stuck', y > 24);
    if (y < hh + 80) {
      for (var i = 0; i < lyr.length; i++) lyr[i].g.style.transform = 'translate3d(0,' + (y * lyr[i].k).toFixed(1) + 'px,0)';
    }
    if (reduce) draw(performance.now()); else kick();
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  document.addEventListener('rm:themechange', function () { readTheme(); draw(performance.now()); });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });

  /* ---------- ridges: layered alpine massif with aerial perspective ---------- */
  /* each peak: [centre, height, left half-width, right half-width, sharpness] in 0..1 space */
  var PEAKS = [
    [[.12,.55,.3,.22,1.2],[.5,.4,.25,.3,1.15],[.86,.78,.26,.2,1.25]],
    [[.04,.3,.1,.1,1.2],[.2,.58,.19,.14,1.3],[.42,.36,.2,.12,1.1],[.64,.5,.05,.04,1.3],[.72,1,.2,.17,1.5],[.8,.55,.05,.08,1.3],[.93,.5,.16,.14,1.2]],
    [[.06,.55,.2,.1,1.3],[.3,.35,.16,.2,1.15],[.52,.72,.12,.08,1.4],[.62,.4,.1,.18,1.15],[.88,.62,.2,.14,1.3]],
    [[.2,.6,.3,.25,1.1],[.6,.8,.3,.3,1.1],[.92,.5,.2,.2,1.1]]
  ];
  var L = [
    { vb: 0.58, ph: 0.36, k: 0.2, seed: 11, shade: 0.7, lit: 1 },
    { vb: 0.7, ph: 0.62, k: 0.13, seed: 29, shade: 1, lit: 0.9 },
    { vb: 0.82, ph: 0.4, k: 0.07, seed: 53, shade: 1, lit: 0.35 },
    { vb: 0.95, ph: 0.15, k: 0.025, seed: 71, shade: 0.35, lit: 0 }
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
  function pts(idx, w, h, cmp) {
    var l = L[idx], N = 360, noise = noiseArr(l.seed, N), out = [];
    var span = w < 700 ? 0.6 : 1, off = w < 700 ? 0.28 : 0;
    var ph = cmp ? l.ph * 0.9 : l.ph, vb = cmp ? Math.min(0.98, l.vb + 0.05) : l.vb;
    for (var i = 0; i <= N; i++) {
      var u = i / N, v = prof(PEAKS[idx], off + u * span);
      v = Math.max(0, v + noise[i] * 0.11 * (0.25 + v));
      out.push([u * w, h * (vb - ph * v)]);
    }
    return out;
  }
  function yAt(p, x) {
    for (var i = 1; i < p.length; i++) if (p[i][0] >= x) { var a = p[i - 1], b = p[i], t = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t; }
    return p[p.length - 1][1];
  }
  function el(n, attrs) { var e = document.createElementNS(NS, n); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function stop(off, col, op) { var s = el('stop', { offset: off }); s.style.stopColor = col; if (op != null) s.style.stopOpacity = op; return s; }
  function f1(n) { return n.toFixed(1); }

  /* summits with a clear drop on both sides: [index, rightValley, leftValley] */
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
  /* soft polygon on one side of a summit: ridge run from the crest down to the valley, closed by a bent spur line */
  function face(p, i, v, h, dirR) {
    var a = p[i], b = p[v], lo = Math.min(i, v), hi = Math.max(i, v), run = [];
    for (var q = lo; q <= hi; q++) run.push(p[q]);
    if (!dirR) run.reverse();
    var d = 'M' + run.map(function (c) { return f1(c[0]) + ' ' + f1(c[1]); }).join(' L');
    var tx = a[0] + (b[0] - a[0]) * 0.5, ty = b[1] + h * 0.1;
    return d + ' L' + f1(tx) + ' ' + f1(ty) + ' Z';
  }

  function buildRidges() {
    var wrap = hero.querySelector('.ridges');
    if (!wrap) return;
    var w = wrap.clientWidth, h = wrap.clientHeight;
    var cmp = wrap.classList.contains('compact');
    var svg = wrap.querySelector('svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.innerHTML = '';
    lyr = [];
    var defs = el('defs', {}); svg.appendChild(defs);
    var soft = el('filter', { id: 'soft', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    soft.appendChild(el('feGaussianBlur', { stdDeviation: cmp ? 1.6 : 2.4 })); defs.appendChild(soft);
    var glowF = el('filter', { id: 'glow', x: '-5%', y: '-50%', width: '110%', height: '200%' });
    glowF.appendChild(el('feGaussianBlur', { stdDeviation: 3 })); defs.appendChild(glowF);
    var all = [];
    for (var idx = 0; idx < 4; idx++) all.push(pts(idx, w, h, cmp));
    var cols = ['l1', 'l2', 'l3', 'l4'];

    function layer(idx) {
      var p = all[idx], l = L[idx], c = cols[idx];
      var top = Math.min.apply(null, p.map(function (q) { return q[1]; }));
      var g = el('g', { 'class': 'lyr' });
      var grad = el('linearGradient', { id: 'gr' + idx, gradientUnits: 'userSpaceOnUse', x1: 0, y1: top, x2: 0, y2: h });
      grad.appendChild(stop(0, 'var(--' + c + 'c)')); grad.appendChild(stop(0.38, 'var(--' + c + 'm)')); grad.appendChild(stop(1, 'var(--' + c + 'b)'));
      defs.appendChild(grad);
      var d = 'M' + p.map(function (q) { return f1(q[0]) + ' ' + f1(q[1]); }).join(' L');
      var body = d + ' L' + w + ' ' + (h + 400) + ' L0 ' + (h + 400) + 'Z';
      var clip = el('clipPath', { id: 'cp' + idx }); clip.appendChild(el('path', { d: body })); defs.appendChild(clip);
      g.appendChild(el('path', { d: body, fill: 'url(#gr' + idx + ')' }));
      [['shd', 'shade'], ['lit', 'lit']].forEach(function (kind) {
        var gg = el('linearGradient', { id: kind[0] + idx, gradientUnits: 'userSpaceOnUse', x1: 0, y1: top, x2: 0, y2: h * 0.98 });
        gg.appendChild(stop(0, 'var(--' + kind[1] + ')', 1)); gg.appendChild(stop(1, 'var(--' + kind[1] + ')', 0)); defs.appendChild(gg);
      });
      var sums = summits(p, h * (cmp ? 0.035 : 0.05));
      var sh = '', li = '';
      sums.forEach(function (s) { sh += face(p, s[0], s[1], h, true); li += face(p, s[0], s[2], h, false); });
      var shg = el('g', { 'clip-path': 'url(#cp' + idx + ')', filter: 'url(#soft)' });
      shg.appendChild((function () { var e = el('path', { d: sh, fill: 'url(#shd' + idx + ')' }); e.style.opacity = 'calc(var(--shade-o) * ' + l.shade + ')'; return e; })());
      if (l.lit) shg.appendChild((function () { var e = el('path', { d: li, fill: 'url(#lit' + idx + ')' }); e.style.opacity = 'calc(var(--lit-o) * ' + l.lit + ')'; return e; })());
      g.appendChild(shg);
      svg.appendChild(g);
      lyr.push({ g: g, k: l.k });
    }

    layer(0); layer(1);
    /* low mist band between the second and third ridge */
    var mg = el('g', { 'class': 'mist' });
    [[0.3, 0.64, 0.55, 0.07, 0], [0.72, 0.58, 0.45, 0.06, 1], [0.5, 0.72, 0.6, 0.05, 2]].forEach(function (m) {
      var e = el('ellipse', { cx: w * m[0], cy: h * m[1], rx: w * m[2], ry: h * m[3], fill: 'var(--mist)' });
      e.style.opacity = 'var(--mist-o)'; e.style.filter = 'blur(' + (cmp ? 10 : 20) + 'px)';
      e.style.animation = 'drift' + m[4] + ' ' + (55 + m[4] * 22) + 's ease-in-out infinite alternate';
      mg.appendChild(e);
    });
    svg.appendChild(mg); lyr.push({ g: mg, k: 0.1 });
    layer(2); layer(3);

    /* thin luminous rim only along the outermost crest line */
    var rim = '', pen = false;
    for (var i = 0; i < all[0].length; i++) {
      var y0 = all[0][i][1], y1 = all[1][i][1], top = Math.min(y0, y1, all[2][i][1], all[3][i][1]);
      if (Math.abs(top - y0) < 0.01 || Math.abs(top - y1) < 0.01) {
        var src = Math.abs(top - y1) < 0.01 ? all[1][i] : all[0][i];
        rim += (pen ? ' L' : ' M') + f1(src[0]) + ' ' + f1(src[1]); pen = true;
      } else pen = false;
    }
    var rg = el('g', { 'class': 'lyr' });
    var glow = el('path', { d: rim, fill: 'none', 'stroke-width': 3, 'stroke-linejoin': 'round', filter: 'url(#glow)' });
    glow.style.stroke = 'var(--rim)'; glow.style.opacity = 0.35;
    var line = el('path', { d: rim, fill: 'none', 'stroke-width': 1, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });
    line.style.stroke = 'var(--rim)'; line.style.opacity = 0.75;
    rg.appendChild(glow); rg.appendChild(line); svg.appendChild(rg); lyr.push({ g: rg, k: 0.16 });

    var fg = el('linearGradient', { id: 'grf', x1: 0, y1: 0, x2: 0, y2: 1 });
    fg.appendChild(stop(0, 'var(--ground)', 0)); fg.appendChild(stop(0.7, 'var(--ground)'));
    defs.appendChild(fg);
    svg.appendChild(el('rect', { x: 0, y: h * (cmp ? 0.6 : 0.78), width: w, height: h * (cmp ? 0.5 : 0.31), fill: 'url(#grf)' }));
    wrap.querySelectorAll('.alt').forEach(function (a) {
      var fx = parseFloat(w < 700 && a.dataset.xm ? a.dataset.xm : a.dataset.x);
      var x = w * fx, root = yAt(all[2], x), top = root;
      all.forEach(function (q) { for (var dx = -10; dx <= 190; dx += 6) top = Math.min(top, yAt(q, Math.max(0, Math.min(w, x + dx)))); });
      a.style.left = x + 'px'; a.style.top = root + 'px';
      a.style.setProperty('--h', Math.max(parseFloat(a.dataset.lift || '44'), root - top + 34) + 'px');
    });
    onScroll();
  }
  var st = document.createElement('style');
  st.textContent = '@keyframes drift0{from{transform:translateX(-6%)}to{transform:translateX(8%)}}@keyframes drift1{from{transform:translateX(7%)}to{transform:translateX(-9%)}}@keyframes drift2{from{transform:translateX(-4%)}to{transform:translateX(5%)}}@media (prefers-reduced-motion:reduce){.mist ellipse{animation:none!important}}';
  document.head.appendChild(st);

  readTheme();
  resize();
  onScroll();
  nextShoot = performance.now() + 2500;
  if (!reduce) kick();
  var startFn = function () { if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1100); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); startFn(); }, startFn); else startFn();
})();
