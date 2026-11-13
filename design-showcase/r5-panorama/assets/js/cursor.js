/* Cursor modes, switchable live from the tune panel: elevation (contour-line trail that hugs the
   pointer path), comet, sparkle, none. Fine pointers only. The canvas sleeps once the effect has
   faded and the pointer has been still for ~120ms; the native cursor is never hidden. */
(function () {
  'use strict';
  var R5 = window.R5, root = document.documentElement;
  if (!R5 || !window.matchMedia) return;
  var fineMq = matchMedia('(hover: hover) and (pointer: fine)');
  if (!fineMq.matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'comet'; canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var mode = 'elevation';
  var trail = [], parts = [];
  var prev = null, precise = false, running = false, last = 0, lastMove = 0;
  var pal = null, glow = null, stars = {}, dots = {};
  var PRECISE = 'input, textarea, select, [contenteditable="true"], a, button, label, [role="button"], summary';

  function resolveMode() {
    var m = R5.opt('cursor', 'elevation');
    if (R5.motionOff()) m = 'none';
    mode = ['elevation', 'comet', 'sparkle', 'none'].indexOf(m) > -1 ? m : 'elevation';
    if (mode === 'none') { trail.length = 0; parts.length = 0; ctx.clearRect(0, 0, W, H); }
  }
  function sprite(rgb, size, core) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), h = size / 2, g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, core || 'rgba(' + rgb + ',1)'); g.addColorStop(0.4, 'rgba(' + rgb + ',0.28)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }
  function starSprite(rgb) {
    var s = 40, c = document.createElement('canvas'); c.width = c.height = s;
    var x = c.getContext('2d'), h = s / 2;
    var g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(' + rgb + ',0.5)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.fillStyle = 'rgba(' + rgb + ',1)';
    x.beginPath();
    x.moveTo(h, 3); x.quadraticCurveTo(h, h, s - 3, h); x.quadraticCurveTo(h, h, h, s - 3); x.quadraticCurveTo(h, h, 3, h); x.quadraticCurveTo(h, h, h, 3);
    x.fill();
    return c;
  }
  function bake() {
    var p = R5.palette(); pal = p;
    var T = R5.triplet, white = p.dark ? [255, 255, 255] : [255, 250, 240];
    var main = p.dark ? p.cyan : p.violet;
    glow = sprite(T(main), 56, 'rgba(' + T(white) + ',0.9)');
    dots = {}; stars = {};
    [p.violet, p.cyan, p.amber].forEach(function (c) { dots[T(c)] = sprite(T(c), 16); stars[T(c)] = starSprite(T(c)); });
  }
  function main() { return R5.triplet(pal.dark ? pal.cyan : pal.violet); }
  function pick() { var l = [pal.violet, pal.cyan, pal.amber]; return R5.triplet(l[Math.floor(Math.random() * 3)]); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  bake(); resolveMode(); resize();
  window.addEventListener('resize', resize);
  document.addEventListener('rm:themechange', function () { bake(); });
  document.addEventListener('rm:tune', function () { bake(); resolveMode(); });

  document.addEventListener('pointermove', function (e) {
    if (mode === 'none') return;
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    var t = e.target;
    precise = !!(t && t.closest && t.closest(PRECISE));
    var x = e.clientX, y = e.clientY, now = performance.now();
    lastMove = now;
    var dx = prev ? x - prev.x : 0, dy = prev ? y - prev.y : 0, spd = Math.sqrt(dx * dx + dy * dy);
    if (!precise) {
      if (mode === 'elevation') {
        var lp = trail[trail.length - 1];
        if (!lp || Math.hypot(x - lp.x, y - lp.y) >= 3.2) { trail.push({ x: x, y: y, ts: now }); if (trail.length > 90) trail.shift(); }
      } else if (mode === 'comet') {
        if (!prev || spd >= 1.5) { trail.push({ x: x, y: y, ts: now }); if (trail.length > 60) trail.shift(); }
        if (prev && spd > 3) {
          var base = Math.atan2(-dy, -dx), n = spd > 12 ? 3 : spd > 6 ? 2 : 1;
          for (var k = 0; k < n; k++) {
            var a = base + (Math.random() - 0.5) * 1.8, s = Math.random() * 1.5 + 0.3;
            parts.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 3 + 2, c: Math.random() < 0.4 ? main() : pick(), life: 0, max: 80 + Math.random() * 130 });
          }
          if (parts.length > 70) parts.splice(0, parts.length - 70);
        }
      } else if (mode === 'sparkle' && prev && spd > 2.5) {
        var cnt = spd > 14 ? 2 : 1;
        for (var q = 0; q < cnt; q++) {
          parts.push({ x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14, vx: (Math.random() - 0.5) * 0.5, vy: 0.15 + Math.random() * 0.45, r: 5 + Math.random() * 7, rot: Math.random() * 3, vr: (Math.random() - 0.5) * 0.04, c: pick(), life: 0, max: 520 + Math.random() * 520 });
        }
        if (parts.length > 44) parts.splice(0, parts.length - 44);
      }
    }
    prev = { x: x, y: y };
    if (!running && !precise) { running = true; last = 0; requestAnimationFrame(frame); }
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { prev = null; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { prev = null; trail.length = 0; parts.length = 0; } });

  /* elevation trace: parallel contour lines fan out from the path as they age; every 5th is an index contour */
  var LINES = [-3, -2, -1, 0, 1, 2, 3], AGE = 1500, BUCKETS = 6;
  function elevation(ts) {
    var cutoff = ts - AGE;
    while (trail.length && trail[0].ts < cutoff) trail.shift();
    var n = trail.length;
    if (n < 3) return;
    var nx = new Array(n), ny = new Array(n), i, j;
    for (i = 0; i < n; i++) {
      var a = trail[Math.max(0, i - 2)], b = trail[Math.min(n - 1, i + 2)];
      var tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      nx[i] = -ty / l; ny[i] = tx / l;
    }
    var amber = R5.triplet(pal.amber), cy = R5.triplet(pal.cyan), vi = R5.triplet(pal.violet);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (j = 0; j < LINES.length; j++) {
      var o = LINES[j], idx = o === 0;
      for (var b2 = 0; b2 < BUCKETS; b2++) {
        var i0 = Math.floor(n * b2 / BUCKETS), i1 = Math.min(n - 1, Math.floor(n * (b2 + 1) / BUCKETS) + 1);
        if (i1 - i0 < 1) continue;
        var age = 1 - (i0 + i1) / 2 / n;
        var t = trail[Math.floor((i0 + i1) / 2)], ageMs = (ts - t.ts) / AGE;
        var life = Math.max(0, 1 - ageMs);
        var spread = o * (2.6 + ageMs * 7.5) * (idx ? 0 : 1);
        ctx.beginPath();
        for (i = i0; i <= i1; i++) {
          var ag = (ts - trail[i].ts) / AGE, off = o * (2.6 + ag * 7.5);
          var px = trail[i].x + nx[i] * off, py = trail[i].y + ny[i] * off;
          if (i === i0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        var col = idx ? amber : (Math.abs(o) === 1 ? cy : vi);
        ctx.strokeStyle = 'rgba(' + col + ',1)';
        ctx.globalAlpha = Math.pow(life, 1.4) * (idx ? 0.95 : (Math.abs(o) === 1 ? 0.5 : 0.3)) * (pal.dark ? 1 : 1.1);
        ctx.lineWidth = idx ? 1.8 : 1;
        ctx.stroke();
        void age; void spread;
      }
    }
    ctx.globalAlpha = 1;
  }
  function cometTrail(ts) {
    var cutoff = ts - 420;
    while (trail.length && trail[0].ts < cutoff) trail.shift();
    if (trail.length < 2) return;
    var c = main(), tail = trail[0], hd = trail[trail.length - 1];
    ctx.beginPath();
    ctx.moveTo((tail.x + trail[1].x) / 2, (tail.y + trail[1].y) / 2);
    for (var i = 1; i < trail.length - 1; i++) ctx.quadraticCurveTo(trail[i].x, trail[i].y, (trail[i].x + trail[i + 1].x) / 2, (trail[i].y + trail[i + 1].y) / 2);
    ctx.lineTo(hd.x, hd.y);
    var dist = Math.hypot(hd.x - tail.x, hd.y - tail.y), stroke;
    if (dist < 4) stroke = 'rgba(' + c + ',0.5)';
    else {
      stroke = ctx.createLinearGradient(tail.x, tail.y, hd.x, hd.y);
      stroke.addColorStop(0, 'rgba(' + R5.triplet(pal.violet) + ',0)'); stroke.addColorStop(0.55, 'rgba(' + c + ',0.5)'); stroke.addColorStop(1, 'rgba(' + R5.triplet(pal.amber) + ',1)');
    }
    ctx.strokeStyle = stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.09; ctx.lineWidth = 18; ctx.stroke();
    ctx.globalAlpha = 0.25; ctx.lineWidth = 7; ctx.stroke();
    ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function frame(ts) {
    var dt = last ? Math.min(ts - last, 50) : 16; last = ts;
    ctx.clearRect(0, 0, W, H);
    var i, p;
    if (mode === 'comet') {
      for (i = parts.length - 1; i >= 0; i--) {
        p = parts[i]; p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy; p.vy += 0.008;
        ctx.globalAlpha = Math.max(0, (1 - p.life / p.max) * 0.9);
        ctx.drawImage(dots[p.c] || glow, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      ctx.globalAlpha = 1;
      cometTrail(ts);
      if (prev && !precise && ts - lastMove < 120) ctx.drawImage(glow, prev.x - 28, prev.y - 28, 56, 56);
    } else if (mode === 'elevation') {
      elevation(ts);
    } else if (mode === 'sparkle') {
      for (i = parts.length - 1; i >= 0; i--) {
        p = parts[i]; p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        var u = p.life / p.max, sc = Math.sin(Math.min(1, u * 1.15) * Math.PI);
        var sp = stars[p.c] || stars[Object.keys(stars)[0]], sz = p.r * 2 * (0.4 + 0.6 * sc);
        ctx.globalAlpha = Math.max(0, sc) * 0.95;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.drawImage(sp, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    var moving = prev && !precise && ts - lastMove < 120;
    if (mode === 'none' || (!moving && !trail.length && !parts.length)) {
      ctx.clearRect(0, 0, W, H); running = false; return;
    }
    requestAnimationFrame(frame);
  }
})();
