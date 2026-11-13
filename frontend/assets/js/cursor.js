/* Pointer effects: comet | spotlight | ring | dots | sparks | none (live-switchable through rm:config).
   One lazily-created full-viewport canvas (DPR capped at 1.5), pre-baked sprites, a rAF loop that sleeps whenever
   nothing is left to draw (idle ~120ms and empty). Fine pointers only; off for reduced motion and motion=off.
   The native cursor is never hidden. Colour = aurora[cursorColor]; the shipped comet keeps its --cm* tokens. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.matchMedia) return;
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var fineMq = matchMedia('(hover: hover) and (pointer: fine)');
  if (!fineMq.matches) return;

  var canvas = null, ctx = null, W = 0, H = 0, dpr = 1;
  var running = false, last = 0, lastMove = 0;
  var tx = -1, ty = -1, seen = false, precise = false;
  var mode = 'none', cs = getComputedStyle(root);
  var main = '255,255,255', sec = ['255,255,255', '255,255,255', '255,255,255'], dark = root.dataset.theme !== 'light';
  var sprites = {};
  var PRECISE = 'input, textarea, select, [contenteditable="true"], a, button, label, [role="button"], summary, [data-edit-pick]';

  function cfg() { return window.RMConfig ? window.RMConfig.get() : null; }
  function rgbOf(h) {
    h = String(h).trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    return (parseInt(h.slice(0, 2), 16) || 0) + ',' + (parseInt(h.slice(2, 4), 16) || 0) + ',' + (parseInt(h.slice(4, 6), 16) || 0);
  }
  function tok(n) { return cs.getPropertyValue(n).trim(); }
  function wanted() {
    if (reduceMq.matches || root.dataset.motion === 'off') return 'none';
    var c = cfg();
    return (c && c.motion.cursor) || 'comet';
  }

  /* ---------- palette + sprites (baked on change only) ---------- */
  function readPal() {
    var c = cfg(), ci = c ? c.motion.cursorColor : 2, di = window.RM_DEFAULTS ? window.RM_DEFAULTS.motion.cursorColor : 2;
    var au = function (i) { return rgbOf(tok('--au' + ((i % 5 + 5) % 5))); };
    dark = root.dataset.theme !== 'light';
    if (mode === 'comet' && ci === di) { main = rgbOf(tok('--cm0')); sec = ['--cm1', '--cm2', '--cm3'].map(function (n) { return rgbOf(tok(n)); }); }
    else { main = au(ci); sec = [au(ci + 1), au(ci + 4), au(ci + 2)]; }
  }
  function sprite(rgb, size, core, mid) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), h = size / 2, g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, core || 'rgba(' + rgb + ',1)'); g.addColorStop(0.4, 'rgba(' + rgb + ',' + (mid === undefined ? 0.28 : mid) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }
  function star(rgb, size) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), h = size / 2;
    var g = x.createRadialGradient(h, h, 0, h, h, h * 0.9);
    g.addColorStop(0, 'rgba(' + rgb + ',0.55)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    x.fillStyle = 'rgba(' + rgb + ',1)';
    x.beginPath();
    x.moveTo(h, 1); x.quadraticCurveTo(h, h, size - 1, h); x.quadraticCurveTo(h, h, h, size - 1); x.quadraticCurveTo(h, h, 1, h); x.quadraticCurveTo(h, h, h, 1);
    x.fill();
    return c;
  }
  function bake() {
    sprites = {};
    if (mode === 'comet') {
      sprites.glow = sprite(main, 56, dark ? 'rgba(255,255,255,0.9)' : 'rgba(255,250,240,0.9)');
      sec.forEach(function (c) { sprites['d' + c] = sprite(c, 16); });
      sprites['d' + main] = sprite(main, 16);
    } else if (mode === 'spotlight') {
      sprites.spot = sprite(main, 320, 'rgba(' + main + ',' + (dark ? 0.32 : 0.26) + ')', dark ? 0.12 : 0.1);
    } else if (mode === 'dots') {
      sprites.d0 = sprite(main, 24, 'rgba(' + main + ',1)', 0.5);
      sprites.d1 = sprite(sec[0], 24, 'rgba(' + sec[0] + ',1)', 0.5);
    } else if (mode === 'sparks') {
      sprites.s0 = star(main, 40); sprites.s1 = star(sec[0], 40); sprites.s2 = star(sec[1], 40);
    }
  }
  function ensureCanvas() {
    if (canvas) { canvas.style.display = ''; return; }
    canvas = document.createElement('canvas');
    canvas.id = 'comet'; canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
  }
  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  /* ---------- per-mode state ---------- */
  var trail = [], parts = [], prev = null;                       /* comet */
  var sx = 0, sy = 0, sa = 0;                                     /* spotlight */
  var rx = 0, ry = 0, rr = 15, ra = 0, rot = 0;                   /* ring */
  var chain = [], ca = 0;                                         /* dots */
  var sparks = [];                                                /* sparks */
  function resetState() { trail.length = 0; parts.length = 0; prev = null; sa = 0; ra = 0; ca = 0; sparks.length = 0; chain.length = 0; seen = false; }

  function setMode(m) {
    if (m === mode && (m === 'none' || sprites && Object.keys(sprites).length)) return;
    mode = m;
    resetState();
    if (canvas) ctx.clearRect(0, 0, W, H);
    if (m === 'none') { if (canvas) canvas.style.display = 'none'; running = false; return; }
    ensureCanvas(); readPal(); bake();
  }
  var rebakeT = 0;
  function refresh() {
    var m = wanted();
    if (m !== mode) { setMode(m); return; }
    if (m === 'none') return;
    var before = main + '|' + sec.join('|') + dark;
    readPal();
    if (before !== main + '|' + sec.join('|') + dark) bake();
  }
  document.addEventListener('rm:config', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    if (ch.indexOf('motion') < 0 && ch.indexOf('colors') < 0 && ch.indexOf('boot') < 0) return;
    clearTimeout(rebakeT); rebakeT = setTimeout(refresh, 120);
  });
  document.addEventListener('rm:themechange', function () { clearTimeout(rebakeT); rebakeT = setTimeout(refresh, 60); });
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', refresh);

  /* ---------- input ---------- */
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (mode === 'none') { var w = wanted(); if (w === 'none') return; setMode(w); }
    var t = e.target;
    precise = !!(t && t.closest && t.closest(PRECISE));
    var x = e.clientX, y = e.clientY, now = performance.now();
    var dx = prev ? x - prev.x : 0, dy = prev ? y - prev.y : 0, spd = Math.sqrt(dx * dx + dy * dy);
    lastMove = now; tx = x; ty = y;
    if (!seen) { sx = rx = x; sy = ry = y; seen = true; chain = []; for (var i = 0; i < 10; i++) chain.push({ x: x, y: y }); }
    if (mode === 'comet') {
      if (!precise && (!prev || spd >= 1.5)) { trail.push({ x: x, y: y, ts: now }); if (trail.length > 60) trail.shift(); }
      if (prev && spd > 3 && !precise) {
        var base = Math.atan2(-dy, -dx), n = spd > 12 ? 3 : spd > 6 ? 2 : 1;
        for (var k = 0; k < n; k++) {
          var a = base + (Math.random() - 0.5) * 1.8, s = Math.random() * 1.5 + 0.3;
          parts.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 3 + 2, c: Math.random() < 0.4 ? main : sec[Math.floor(Math.random() * sec.length)], life: 0, max: 80 + Math.random() * 130 });
        }
        if (parts.length > 70) parts.splice(0, parts.length - 70);
      }
    } else if (mode === 'sparks' && prev && spd > 4) {
      var cnt = spd > 16 ? 2 : 1;
      for (var q = 0; q < cnt; q++) {
        var ang = Math.random() * 6.283, sp = 0.3 + Math.random() * 1.1;
        sparks.push({ x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.25, r: 5 + Math.random() * 8, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.06, life: 0, max: 520 + Math.random() * 460, s: 's' + Math.floor(Math.random() * 3) });
      }
      if (sparks.length > 60) sparks.splice(0, sparks.length - 60);
    }
    prev = { x: x, y: y };
    kick();
  }, { passive: true });
  root.addEventListener('mouseleave', function () { prev = null; seen = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { resetState(); } });

  function kick() { if (!running && canvas && mode !== 'none') { running = true; last = 0; requestAnimationFrame(frame); } }

  /* ---------- modes ---------- */
  function drawComet(ts, dt) {
    var i;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.008;
      ctx.globalAlpha = Math.max(0, (1 - p.life / p.max) * 0.9);
      ctx.drawImage(sprites['d' + p.c] || sprites['d' + main], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.globalAlpha = 1;
    var cutoff = ts - 420;
    while (trail.length && trail[0].ts < cutoff) trail.shift();
    if (trail.length >= 2) {
      var tail = trail[0], hd = trail[trail.length - 1];
      ctx.beginPath();
      ctx.moveTo((tail.x + trail[1].x) / 2, (tail.y + trail[1].y) / 2);
      for (i = 1; i < trail.length - 1; i++) ctx.quadraticCurveTo(trail[i].x, trail[i].y, (trail[i].x + trail[i + 1].x) / 2, (trail[i].y + trail[i + 1].y) / 2);
      ctx.lineTo(hd.x, hd.y);
      var dist = Math.hypot(hd.x - tail.x, hd.y - tail.y), stroke;
      if (dist < 4) stroke = 'rgba(' + main + ',0.5)';
      else {
        stroke = ctx.createLinearGradient(tail.x, tail.y, hd.x, hd.y);
        stroke.addColorStop(0, 'rgba(' + sec[0] + ',0)'); stroke.addColorStop(0.55, 'rgba(' + main + ',0.5)'); stroke.addColorStop(1, 'rgba(' + sec[2] + ',1)');
      }
      ctx.strokeStyle = stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.09; ctx.lineWidth = 18; ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.lineWidth = 7; ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var moving = prev && !precise && ts - lastMove < 120;
    if (moving) ctx.drawImage(sprites.glow, prev.x - 28, prev.y - 28, 56, 56);
    return moving || trail.length || parts.length;
  }
  function drawSpot(ts, dt) {
    var active = seen && ts - lastMove < 900;
    sa += ((active ? 1 : 0) - sa) * Math.min(1, dt / (active ? 140 : 260));
    var k = 1 - Math.pow(0.001, dt / 1000 * 1.0);
    sx += (tx - sx) * Math.min(1, k * 0.55); sy += (ty - sy) * Math.min(1, k * 0.55);
    if (sa > 0.01) { ctx.globalAlpha = sa; ctx.drawImage(sprites.spot, sx - 160, sy - 160, 320, 320); ctx.globalAlpha = 1; }
    return sa > 0.012;
  }
  function drawRing(ts, dt) {
    var active = seen && ts - lastMove < 900;
    ra += ((active ? 1 : 0) - ra) * Math.min(1, dt / (active ? 120 : 220));
    var k = Math.min(1, 1 - Math.pow(0.0005, dt / 1000));
    var dx = tx - rx, dy = ty - ry;
    rx += dx * k; ry += dy * k;
    rr += ((precise ? 27 : 15) - rr) * Math.min(1, dt / 110);
    rot += (Math.hypot(dx, dy) * 0.004 + 0.0016) * dt;
    if (ra > 0.01) {
      ctx.lineCap = 'round';
      var segs = 3, gap = 0.9, arc = (6.283 / segs) - gap;
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = 'rgba(' + (pass ? main : sec[0]) + ',' + (pass ? 0.9 : 0.18) * ra + ')';
        ctx.lineWidth = pass ? 1.6 : 6;
        ctx.beginPath();
        for (var s = 0; s < segs; s++) { var a0 = rot + s * 6.283 / segs; ctx.moveTo(rx + Math.cos(a0) * rr, ry + Math.sin(a0) * rr); ctx.arc(rx, ry, rr, a0, a0 + arc); }
        ctx.stroke();
      }
    }
    return ra > 0.012;
  }
  function drawDots(ts, dt) {
    var active = seen && ts - lastMove < 700;
    ca += ((active ? 1 : 0) - ca) * Math.min(1, dt / (active ? 100 : 240));
    var head = chain[0]; if (!head) return false;
    head.x += (tx - head.x) * 0.6; head.y += (ty - head.y) * 0.6;
    for (var i = 1; i < chain.length; i++) { chain[i].x += (chain[i - 1].x - chain[i].x) * 0.34; chain[i].y += (chain[i - 1].y - chain[i].y) * 0.34; }
    if (ca > 0.01) {
      for (var j = chain.length - 1; j >= 0; j--) {
        var t = 1 - j / chain.length, r = 2.2 + t * 6.5;
        ctx.globalAlpha = ca * (0.25 + 0.7 * t);
        ctx.drawImage(sprites[j % 2 ? 'd1' : 'd0'], chain[j].x - r, chain[j].y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
    }
    return ca > 0.012;
  }
  function drawSparks(ts, dt) {
    for (var i = sparks.length - 1; i >= 0; i--) {
      var p = sparks[i]; p.life += dt;
      if (p.life >= p.max) { sparks.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.012; p.rot += p.vr;
      var u = p.life / p.max, a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85, r = p.r * (0.6 + 0.4 * (1 - u));
      ctx.globalAlpha = Math.max(0, a) * 0.95;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.drawImage(sprites[p.s], -r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return sparks.length > 0;
  }

  function frame(ts) {
    var dt = last ? Math.min(ts - last, 50) : 16; last = ts;
    ctx.clearRect(0, 0, W, H);
    var live = false;
    if (mode === 'comet') live = drawComet(ts, dt);
    else if (mode === 'spotlight') live = drawSpot(ts, dt);
    else if (mode === 'ring') live = drawRing(ts, dt);
    else if (mode === 'dots') live = drawDots(ts, dt);
    else if (mode === 'sparks') live = drawSparks(ts, dt);
    if (live && !document.hidden && mode !== 'none') requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); running = false; }
  }

  var m0 = wanted();
  if (m0 !== 'none') setMode(m0);
})();
