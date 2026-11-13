/* Cursor modes: constellation link (default), comet, star-trail, none. Fine pointers only.
   One fixed canvas, created on first use. The link mode asks the shared star grid (window.RMSky) for neighbours
   of the pointer only, draws a handful of lines, and sleeps as soon as everything has settled; the comet and
   the trail sleep when their buffers are empty. The native cursor is never hidden. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.matchMedia) return;
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var fineMq = matchMedia('(hover: hover) and (pointer: fine)');
  if (!fineMq.matches) return;
  var Sky = window.RMSky;
  if (!Sky) return;

  var canvas = null, ctx = null, W = 0, H = 0, dpr = 1;
  var mode = 'link', running = false, last = 0, lastMove = 0;
  var ptr = { tx: 0, ty: 0, x: 0, y: 0, in: false, precise: false, idle: false, seen: false };
  var PRECISE = 'input, textarea, select, [contenteditable="true"], a, button, label, [role="button"], summary, .rmt-root, .rmt-root *';
  var P, sprites = {}, idleT = 0;

  function readMode() {
    var m = Sky.opt('cursor', 'link');
    if (reduceMq.matches || root.dataset.motion === 'off') return 'none';
    return m === 'comet' || m === 'trail' || m === 'none' ? m : 'link';
  }

  /* ---------- canvas + sprites ---------- */
  function ensure() {
    if (canvas) return;
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
  window.addEventListener('resize', function () { resize(); });
  function sprite(rgb, size, core, mid) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), h = size / 2, g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, core || Sky.rgba(rgb, 1)); g.addColorStop(0.35, Sky.rgba(rgb, mid || 0.3)); g.addColorStop(1, Sky.rgba(rgb, 0));
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }
  function bake() {
    P = Sky.pal();
    var d = Sky.dark();
    P.main = d ? P.c : P.v;
    P.hot = P.a;
    P.line = d ? Sky.mix(P.v, [255, 255, 255], 0.5) : Sky.mix(P.v, P.ink, 0.2);
    sprites = {
      glow: sprite(P.main, 56, d ? 'rgba(255,255,255,0.9)' : 'rgba(255,250,240,0.9)'),
      spark: sprite(P.hot, 30, d ? 'rgba(255,248,235,0.95)' : Sky.rgba(P.hot, 0.95), 0.45),
      dotA: sprite(P.v, 16), dotB: sprite(P.c, 16), dotC: sprite(P.a, 16),
      star: sprite(d ? Sky.mix(P.c, [255, 255, 255], 0.5) : P.v, 40, d ? 'rgba(255,255,255,0.95)' : Sky.rgba(P.ink, 0.9), d ? 0.32 : 0.22)
    };
  }
  bake();

  /* ---------- link mode ---------- */
  var lit = {}, litN = 0, stamp = 0;
  function drawLink(ts) {
    var R = Sky.num('linkRadius', 170), live = false, i, j, key, e, s;
    var active = ptr.in && !ptr.precise && !ptr.idle;
    var rm = Sky.field.rm;
    if (rm && active) { var gx = ptr.x + window.scrollX, gy = ptr.y + window.scrollY; if (gx > rm.l && gx < rm.r && gy > rm.t && gy < rm.b) active = false; }
    ptr.x += (ptr.tx - ptr.x) * 0.34; ptr.y += (ptr.ty - ptr.y) * 0.34;
    if (Math.abs(ptr.tx - ptr.x) + Math.abs(ptr.ty - ptr.y) > 0.4) live = true; else { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    var sx = window.scrollX, sy = window.scrollY;
    stamp++;
    var near = active ? Sky.query(ptr.x + sx, ptr.y + sy, R) : [];
    for (i = 0; i < near.length; i++) {
      s = near[i];
      e = lit[s.k];
      if (!e) { e = lit[s.k] = { s: s, v: 0, t: 0, z: 0 }; litN++; }
      e.s = s; e.t = Math.pow(1 - s.d / R, 0.8); e.z = stamp;
    }
    var act = [];
    for (key in lit) {
      e = lit[key];
      if (e.z !== stamp) e.t = 0;
      e.v += (e.t - e.v) * 0.2;
      if (e.t === 0 && e.v < 0.025) { delete lit[key]; litN--; continue; }
      if (Math.abs(e.t - e.v) > 0.012) live = true;
      act.push(e);
    }
    var cutX = ptr.x, cutY = ptr.y;
    act.sort(function (a, b) { return a.s.d - b.s.d; });
    if (act.length > 16) act.length = 16;
    // star to star: each star to its nearest neighbour(s) in the lit set
    var lines = [], rr = R * 0.62;
    for (i = 0; i < act.length; i++) {
      var best = -1, bd = 1e9, b2 = -1, d2 = 1e9, ai = act[i].s;
      for (j = 0; j < act.length; j++) {
        if (j === i) continue;
        var dx = act[j].s.x - ai.x, dy = act[j].s.y - ai.y, dd = dx * dx + dy * dy;
        if (dd < bd) { b2 = best; d2 = bd; bd = dd; best = j; } else if (dd < d2) { d2 = dd; b2 = j; }
      }
      if (best > -1 && bd < rr * rr && (best > i || act[best].s.d > ai.d)) lines.push([i, best]);
      if (b2 > -1 && d2 < rr * rr * 0.45 && b2 > i) lines.push([i, b2]);
    }
    ctx.clearRect(0, 0, W, H);
    var lc = P.line, dark = Sky.dark();
    // star links
    ctx.lineCap = 'round';
    ctx.lineWidth = dark ? 0.8 : 0.75;
    for (i = 0; i < lines.length; i++) {
      var A = act[lines[i][0]], B = act[lines[i][1]], a = Math.min(A.v, B.v) * 0.7;
      if (a < 0.03) continue;
      ctx.strokeStyle = Sky.rgba(lc, a * (dark ? 0.8 : 1));
      ctx.beginPath(); ctx.moveTo(A.s.x - sx, A.s.y - sy); ctx.lineTo(B.s.x - sx, B.s.y - sy); ctx.stroke();
    }
    // pointer links (nearest few)
    var nl = Math.min(5, act.length);
    for (i = 0; i < nl; i++) {
      e = act[i];
      var ap = e.v * e.v * 0.8;
      ctx.strokeStyle = Sky.rgba(dark ? P.main : P.v, ap * (dark ? 0.85 : 0.9));
      ctx.lineWidth = 0.6 + 0.3 * e.v;
      ctx.beginPath(); ctx.moveTo(cutX, cutY); ctx.lineTo(e.s.x - sx, e.s.y - sy); ctx.stroke();
    }
    // stars
    for (i = 0; i < act.length; i++) {
      e = act[i];
      var sz = 14 + e.s.m * 7 + e.v * 16;
      ctx.globalAlpha = Math.min(1, e.v * 1.3);
      ctx.drawImage(sprites.star, e.s.x - sx - sz / 2, e.s.y - sy - sz / 2, sz, sz);
      if (e.s.m >= 2 && e.v > 0.25) {
        var L = 3 + e.s.m * 2 + e.v * 5;
        ctx.strokeStyle = Sky.rgba(dark ? [255, 255, 255] : P.ink, e.v * 0.8); ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(e.s.x - sx - L, e.s.y - sy); ctx.lineTo(e.s.x - sx + L, e.s.y - sy); ctx.moveTo(e.s.x - sx, e.s.y - sy - L); ctx.lineTo(e.s.x - sx, e.s.y - sy + L); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (act.length && active) { ctx.globalAlpha = 0.85; ctx.drawImage(sprites.spark, cutX - 11, cutY - 11, 22, 22); ctx.globalAlpha = 1; }
    if (!live && !act.length) { ctx.clearRect(0, 0, W, H); return false; }
    return live || (ts - lastMove < 120 && active);
  }

  /* ---------- comet ---------- */
  var trail = [], parts = [];
  var MAX_AGE = 420, MAX_PTS = 60;
  function cometMove(x, y, spd, dx, dy, now) {
    if (!ptr.precise && spd >= 1.5) { trail.push({ x: x, y: y, ts: now }); if (trail.length > MAX_PTS) trail.shift(); }
    if (spd > 3 && !ptr.precise) {
      var base = Math.atan2(-dy, -dx), n = spd > 12 ? 3 : spd > 6 ? 2 : 1, cols = [sprites.dotA, sprites.dotB, sprites.dotC];
      for (var k = 0; k < n; k++) {
        var a = base + (Math.random() - 0.5) * 1.8, s = Math.random() * 1.5 + 0.3;
        parts.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 3 + 2, c: cols[Math.floor(Math.random() * 3)], life: 0, max: 80 + Math.random() * 130 });
      }
      if (parts.length > 70) parts.splice(0, parts.length - 70);
    }
  }
  function drawComet(ts, dt) {
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.008;
      ctx.globalAlpha = Math.max(0, (1 - p.life / p.max) * 0.9);
      ctx.drawImage(p.c, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.globalAlpha = 1;
    var cutoff = ts - MAX_AGE;
    while (trail.length && trail[0].ts < cutoff) trail.shift();
    if (trail.length >= 2) {
      var c = P.main, tail = trail[0], hd = trail[trail.length - 1];
      ctx.beginPath();
      ctx.moveTo((tail.x + trail[1].x) / 2, (tail.y + trail[1].y) / 2);
      for (i = 1; i < trail.length - 1; i++) ctx.quadraticCurveTo(trail[i].x, trail[i].y, (trail[i].x + trail[i + 1].x) / 2, (trail[i].y + trail[i + 1].y) / 2);
      ctx.lineTo(hd.x, hd.y);
      var dist = Math.hypot(hd.x - tail.x, hd.y - tail.y), stroke;
      if (dist < 4) stroke = Sky.rgba(c, 0.5);
      else {
        stroke = ctx.createLinearGradient(tail.x, tail.y, hd.x, hd.y);
        stroke.addColorStop(0, Sky.rgba(P.v, 0)); stroke.addColorStop(0.55, Sky.rgba(c, 0.5)); stroke.addColorStop(1, Sky.rgba(P.a, 1));
      }
      ctx.strokeStyle = stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.09; ctx.lineWidth = 18; ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.lineWidth = 7; ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var moving = ptr.in && !ptr.precise && ts - lastMove < 120;
    if (moving) ctx.drawImage(sprites.glow, ptr.tx - 28, ptr.ty - 28, 56, 56);
    if (!moving && !trail.length && !parts.length) { ctx.clearRect(0, 0, W, H); return false; }
    return true;
  }

  /* ---------- star trail: a long exposure drawn as a few parallel arcs ---------- */
  var tpts = [];
  var T_AGE = 1800, T_MAX = 150;
  function trailMove(x, y, spd, now) {
    if (!ptr.precise && spd >= 1.2) { tpts.push({ x: x, y: y, ts: now }); if (tpts.length > T_MAX) tpts.shift(); }
  }
  function drawTrail(ts) {
    var age = root.dataset.motion === 'calm' ? T_AGE * 0.65 : T_AGE, cutoff = ts - age;
    while (tpts.length && tpts[0].ts < cutoff) tpts.shift();
    ctx.clearRect(0, 0, W, H);
    var n = tpts.length, dark = Sky.dark();
    if (n >= 2) {
      var col = dark ? Sky.mix(P.v, [255, 255, 255], 0.55) : Sky.mix(P.v, P.ink, 0.25);
      var poleX = W * 0.5, poleY = -H * 0.8, angs = [-0.016, 0, 0.016], amp = [0.34, 1, 0.34];
      var B = 5, bi, ai, i, per = Math.ceil(n / B);
      for (ai = 0; ai < 3; ai++) {
        ctx.save();
        ctx.translate(poleX, poleY); ctx.rotate(angs[ai]); ctx.translate(-poleX, -poleY);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (bi = 0; bi < B; bi++) {
          var i0 = bi * per, i1 = Math.min(n - 1, i0 + per);
          if (i0 >= n - 1) break;
          var fa = (tpts[i0].ts + tpts[i1].ts) / 2, f = 1 - (ts - fa) / age;
          if (f <= 0) continue;
          ctx.strokeStyle = Sky.rgba(col, Math.pow(f, 1.3) * amp[ai] * (dark ? 0.9 : 1));
          ctx.lineWidth = ai === 1 ? 1.4 : 0.8;
          ctx.beginPath(); ctx.moveTo(tpts[i0].x, tpts[i0].y);
          for (i = i0 + 1; i <= i1; i++) ctx.lineTo(tpts[i].x, tpts[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }
      for (i = 2; i < n; i += 7) {
        var ff = 1 - (ts - tpts[i].ts) / age;
        if (ff <= 0) continue;
        ctx.globalAlpha = Math.min(1, ff * 1.2);
        ctx.drawImage(sprites.star, tpts[i].x - 8, tpts[i].y - 8, 16, 16);
      }
      ctx.globalAlpha = 1;
    }
    var moving = ptr.in && !ptr.precise && ts - lastMove < 140;
    if (moving) { ctx.globalAlpha = 0.9; ctx.drawImage(sprites.spark, ptr.tx - 12, ptr.ty - 12, 24, 24); ctx.globalAlpha = 1; }
    if (!moving && !n) { ctx.clearRect(0, 0, W, H); return false; }
    return true;
  }

  /* ---------- loop ---------- */
  function frame(ts) {
    var dt = last ? Math.min(ts - last, 50) : 16; last = ts;
    var again = false;
    if (mode === 'link') again = drawLink(ts);
    else if (mode === 'comet') again = drawComet(ts, dt);
    else if (mode === 'trail') again = drawTrail(ts);
    if (again && !document.hidden) requestAnimationFrame(frame); else running = false;
  }
  function wake() {
    if (mode === 'none') return;
    ensure();
    if (!running) { running = true; last = 0; requestAnimationFrame(frame); }
  }

  document.addEventListener('pointermove', function (e) {
    if (mode === 'none') return;
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    var t = e.target, now = performance.now(), x = e.clientX, y = e.clientY;
    ptr.precise = !!(t && t.closest && t.closest(PRECISE));
    var dx = ptr.seen ? x - ptr.tx : 0, dy = ptr.seen ? y - ptr.ty : 0, spd = Math.sqrt(dx * dx + dy * dy);
    if (!ptr.seen || !ptr.in) { ptr.x = x; ptr.y = y; }
    ptr.tx = x; ptr.ty = y; ptr.in = true; ptr.seen = true; ptr.idle = false;
    lastMove = now;
    if (mode === 'comet') cometMove(x, y, spd, dx, dy, now);
    else if (mode === 'trail') trailMove(x, y, spd, now);
    else {
      clearTimeout(idleT);
      idleT = setTimeout(function () { ptr.idle = true; wake(); }, 2400);
    }
    wake();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { ptr.in = false; ptr.seen = false; wake(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { trail.length = 0; parts.length = 0; tpts.length = 0; lit = {}; litN = 0; ptr.in = false; ptr.seen = false; } });
  var sct = false;
  window.addEventListener('scroll', function () {
    if (mode !== 'link' || !litN || sct) return;
    sct = true; requestAnimationFrame(function () { sct = false; wake(); });
  }, { passive: true });

  function setMode() {
    var m = readMode();
    if (m === mode && canvas) return;
    mode = m;
    trail.length = 0; parts.length = 0; tpts.length = 0; lit = {}; litN = 0;
    if (canvas) { ctx.clearRect(0, 0, W, H); if (mode === 'none') canvas.style.display = 'none'; else canvas.style.display = ''; }
  }
  function refresh() { bake(); setMode(); if (canvas && mode !== 'none') canvas.style.display = ''; }
  document.addEventListener('rm:themechange', function () { setTimeout(refresh, 90); });
  document.addEventListener('rm:tune', function () { refresh(); });
  mode = readMode();
  if (reduceMq.addEventListener) reduceMq.addEventListener('change', setMode);
})();
