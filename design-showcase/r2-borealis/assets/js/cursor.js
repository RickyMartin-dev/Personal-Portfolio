/* Borealis cursors (fine pointers only, native cursor never hidden): silk ribbon, comet, aurora dust, none.
   One fixed canvas, pre-baked sprites, a loop that sleeps once the pointer rests and everything has faded.
   Colours follow the active palette. Modes swap live from the tune panel. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.matchMedia) return;
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var fineMq = matchMedia('(hover: hover) and (pointer: fine)');
  if (!fineMq.matches) return;

  var canvas = null, ctx = null, W = 0, H = 0, dpr = 1;
  var mode = 'ribbon', lenK = 1, swayK = 1;
  var mx = 0, my = 0, hx = 0, hy = 0, hasPtr = false, precise = false;
  var pts = [], parts = [], trail = [];
  var running = false, last = 0, lastMove = 0, sp = 0;
  var PRECISE = 'input, textarea, select, [contenteditable="true"], a, button, label, [role="button"], summary';
  var dark = true, col = [[154, 130, 255], [85, 220, 196], [255, 184, 107]], glow = null, dots = [];

  function parse(c, fb) {
    c = (c || '').trim();
    var m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    m = /^#([0-9a-f]{6})/i.exec(c);
    if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(c);
    return m ? [+m[1], +m[2], +m[3]] : fb;
  }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
  function sprite(c, size, core) {
    var s = document.createElement('canvas'); s.width = s.height = size;
    var x = s.getContext('2d'), h = size / 2, g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, core || rgba(c, 1)); g.addColorStop(0.4, rgba(c, 0.28)); g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return s;
  }
  function bake() {
    dark = root.dataset.theme !== 'light';
    var cs = getComputedStyle(root);
    col = [parse(cs.getPropertyValue('--violet'), col[0]), parse(cs.getPropertyValue('--cyan'), col[1]), parse(cs.getPropertyValue('--amber'), col[2])];
    glow = sprite(col[1], 56, dark ? 'rgba(255,255,255,0.92)' : rgba(col[2], 0.95));
    dots = col.map(function (c) { return sprite(c, 16); });
  }

  function opts() {
    var T = window.RMTune && RMTune.get ? RMTune : null;
    function g(id, d) { var v = T ? T.get(id) : undefined; return v == null || v === '' ? d : v; }
    var m = String(g('cursor', 'ribbon'));
    if (root.dataset.motion === 'off' || reduceMq.matches) m = 'none';
    lenK = +g('ribbonlen', 1); swayK = +g('ribbonsway', 1);
    if (m !== mode) { mode = m; pts.length = 0; parts.length = 0; trail.length = 0; if (ctx) ctx.clearRect(0, 0, W, H); }
    if (mode === 'none') { running = false; if (canvas) canvas.style.display = 'none'; }
    else { ensure(); canvas.style.display = ''; }
  }

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
  window.addEventListener('resize', resize);

  function pick() { return col[(Math.random() * 3) | 0]; }

  document.addEventListener('pointermove', function (e) {
    if (mode === 'none') return;
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    var t = e.target;
    precise = !!(t && t.closest && t.closest(PRECISE));
    var now = performance.now(), dx = hasPtr ? e.clientX - mx : 0, dy = hasPtr ? e.clientY - my : 0, spd = Math.sqrt(dx * dx + dy * dy);
    if (!hasPtr) { hx = e.clientX; hy = e.clientY; }
    mx = e.clientX; my = e.clientY; hasPtr = true; lastMove = now;
    if (mode === 'comet') {
      if (!precise && spd >= 1.5) { trail.push({ x: mx, y: my, ts: now }); if (trail.length > 60) trail.shift(); }
      if (spd > 3 && !precise) {
        var base = Math.atan2(-dy, -dx), n = spd > 12 ? 3 : spd > 6 ? 2 : 1;
        for (var k = 0; k < n; k++) {
          var a = base + (Math.random() - 0.5) * 1.8, s = Math.random() * 1.5 + 0.3;
          parts.push({ x: mx + (Math.random() - 0.5) * 5, y: my + (Math.random() - 0.5) * 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 3 + 2, c: (Math.random() * 3) | 0, life: 0, max: 80 + Math.random() * 130 });
        }
        if (parts.length > 70) parts.splice(0, parts.length - 70);
      }
    } else if (mode === 'dust' && !precise && spd > 1.5) {
      var m = spd > 14 ? 3 : spd > 6 ? 2 : 1;
      for (var q = 0; q < m; q++) {
        parts.push({ x: mx + (Math.random() - 0.5) * 12, y: my + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 0.5, vy: -(0.18 + Math.random() * 0.55), r: 1.6 + Math.random() * 3.6, c: (Math.random() * 3) | 0, life: 0, max: 900 + Math.random() * 1100, ph: Math.random() * 6.28 });
      }
      if (parts.length > 110) parts.splice(0, parts.length - 110);
    }
    if (!running && !precise) kick();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { hasPtr = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { hasPtr = false; pts.length = 0; trail.length = 0; parts.length = 0; } });
  function kick() { if (!running && mode !== 'none' && canvas) { running = true; last = 0; requestAnimationFrame(frame); } }

  /* ---------- silk ribbon ---------- */
  function drawRibbon(ts, dt) {
    var moving = hasPtr && !precise && ts - lastMove < 120;
    if (hasPtr) {
      var ease = 1 - Math.pow(0.0009, dt / 1000);
      var ox = hx, oy = hy;
      hx += (mx - hx) * ease; hy += (my - hy) * ease;
      var v = Math.hypot(hx - ox, hy - oy) / Math.max(dt, 1) * 16;
      sp += (v - sp) * 0.25;
    }
    var LIFE = 640 * lenK;
    if (moving) {
      var lp = pts[pts.length - 1];
      if (!lp || Math.hypot(hx - lp.x, hy - lp.y) > 2.2) pts.push({ x: hx, y: hy, t: ts });
    }
    while (pts.length && ts - pts[0].t > LIFE) pts.shift();
    if (pts.length > 140) pts.splice(0, pts.length - 140);
    var n = pts.length;
    if (n >= 3) {
      var cx = [], cy = [], wd = [], i, p;
      for (i = 0; i < n; i++) {
        p = pts[i];
        var a = (ts - p.t) / LIFE; if (a > 1) a = 1;
        var pa = pts[i > 0 ? i - 1 : 0], pb = pts[i < n - 1 ? i + 1 : n - 1];
        var tx = pb.x - pa.x, ty = pb.y - pa.y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
        var sway = Math.sin(i * 0.3 - ts * 0.0062) * swayK * (2 + Math.min(sp, 12) * 0.55) * Math.pow(a, 0.8);
        cx.push(p.x + nx * sway); cy.push(p.y + ny * sway);
        var w = 14 * Math.pow(1 - a, 1.25) * (0.62 + 0.38 * Math.min(1, sp / 5)) * (0.84 + 0.16 * Math.sin(i * 0.5 + ts * 0.004));
        wd.push(w);
        pts[i]._n = [nx, ny];
      }
      // outline as two smoothed edges
      var L = [], R = [];
      for (i = 0; i < n; i++) {
        var nn = pts[i]._n; L.push([cx[i] + nn[0] * wd[i] / 2, cy[i] + nn[1] * wd[i] / 2]); R.push([cx[i] - nn[0] * wd[i] / 2, cy[i] - nn[1] * wd[i] / 2]);
      }
      var path = new Path2D();
      path.moveTo(L[0][0], L[0][1]);
      for (i = 1; i < n - 1; i++) path.quadraticCurveTo(L[i][0], L[i][1], (L[i][0] + L[i + 1][0]) / 2, (L[i][1] + L[i + 1][1]) / 2);
      path.lineTo(L[n - 1][0], L[n - 1][1]);
      path.lineTo(R[n - 1][0], R[n - 1][1]);
      for (i = n - 2; i > 0; i--) path.quadraticCurveTo(R[i][0], R[i][1], (R[i][0] + R[i - 1][0]) / 2, (R[i][1] + R[i - 1][1]) / 2);
      path.lineTo(R[0][0], R[0][1]);
      path.closePath();
      var t0 = pts[0], t1 = pts[n - 1];
      if (Math.hypot(t1.x - t0.x, t1.y - t0.y) > 3) {
        var g = ctx.createLinearGradient(t0.x, t0.y, t1.x, t1.y);
        g.addColorStop(0, rgba(col[0], 0)); g.addColorStop(0.3, rgba(col[0], dark ? 0.62 : 0.55));
        g.addColorStop(0.68, rgba(col[1], dark ? 0.9 : 0.8)); g.addColorStop(1, rgba(col[2], 0.96));
        ctx.globalAlpha = 0.22; ctx.save(); ctx.translate(0, 0);
        ctx.fillStyle = g; ctx.fill(path);
        ctx.strokeStyle = g; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.stroke(path);
        ctx.restore();
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fill(path);
        // crisp centre-line sheen
        ctx.beginPath(); ctx.moveTo(cx[0], cy[0]);
        for (i = 1; i < n - 1; i++) ctx.quadraticCurveTo(cx[i], cy[i], (cx[i] + cx[i + 1]) / 2, (cy[i] + cy[i + 1]) / 2);
        ctx.lineTo(cx[n - 1], cy[n - 1]);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    if (moving) ctx.drawImage(glow, hx - 24, hy - 24, 48, 48);
    return moving || n > 0;
  }

  /* ---------- comet ---------- */
  function drawComet(ts, dt) {
    var i;
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.008;
      ctx.globalAlpha = Math.max(0, (1 - p.life / p.max) * 0.9);
      ctx.drawImage(dots[p.c], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
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
      if (dist < 4) stroke = rgba(col[1], 0.5);
      else {
        stroke = ctx.createLinearGradient(tail.x, tail.y, hd.x, hd.y);
        stroke.addColorStop(0, rgba(col[0], 0)); stroke.addColorStop(0.55, rgba(col[1], 0.5)); stroke.addColorStop(1, rgba(col[2], 1));
      }
      ctx.strokeStyle = stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.09; ctx.lineWidth = 18; ctx.stroke();
      ctx.globalAlpha = 0.25; ctx.lineWidth = 7; ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    var moving = hasPtr && !precise && ts - lastMove < 120;
    if (moving) ctx.drawImage(glow, mx - 28, my - 28, 56, 56);
    return moving || trail.length > 0 || parts.length > 0;
  }

  /* ---------- aurora dust ---------- */
  function drawDust(ts, dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      var k = p.life / p.max;
      p.x += p.vx + Math.sin(p.ph + p.life * 0.003) * 0.28; p.y += p.vy * (1 - k * 0.5);
      var tw = 0.65 + 0.35 * Math.sin(p.ph + p.life * 0.012);
      ctx.globalAlpha = Math.max(0, Math.sin(Math.PI * Math.min(1, k * 1.25)) * 0.95 * tw);
      var r = p.r * (1.5 - 0.6 * k);
      ctx.drawImage(dots[p.c], p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    var moving = hasPtr && !precise && ts - lastMove < 120;
    if (moving) ctx.drawImage(glow, mx - 14, my - 14, 28, 28);
    return moving || parts.length > 0;
  }

  function frame(ts) {
    if (!running) return;
    var dt = last ? Math.min(ts - last, 50) : 16; last = ts;
    ctx.clearRect(0, 0, W, H);
    var alive = mode === 'ribbon' ? drawRibbon(ts, dt) : mode === 'comet' ? drawComet(ts, dt) : mode === 'dust' ? drawDust(ts, dt) : false;
    if (!alive || mode === 'none') { ctx.clearRect(0, 0, W, H); running = false; return; }
    requestAnimationFrame(frame);
  }

  bake();
  document.addEventListener('rm:themechange', bake);
  var rt;
  document.addEventListener('rm:tune', function () { clearTimeout(rt); bake(); opts(); });
  document.addEventListener('rm:r2opts', function () { bake(); opts(); });
  opts();
})();
