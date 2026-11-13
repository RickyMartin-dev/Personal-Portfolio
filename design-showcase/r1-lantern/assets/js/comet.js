/* Comet cursor: aurora trail, pre-rendered glow sprites, sparkles. Fine pointers only.
   Sleeps: when the trail and particles are empty and the pointer has been still ~120ms,
   the canvas is cleared once and the loop stops. The native cursor is never hidden. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.matchMedia) return;
  var reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  var fineMq = matchMedia('(hover: hover) and (pointer: fine)');
  if (reduceMq.matches || !fineMq.matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'comet'; canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var trail = [], parts = [];
  var prev = null, precise = false, running = false, last = 0, lastMove = 0;
  var MAX_AGE = 420, MAX_PTS = 60;
  function modeNow() {
    var v; try { v = window.RMTune && RMTune.get('cursor'); } catch (e) {}
    return v || root.dataset.tuneCursor || 'lantern';
  }
  var PROBE = document.createElement('span');
  PROBE.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(PROBE);
  function rgbVar(name, fb) {
    PROBE.style.color = 'var(' + name + ')';
    var raw = getComputedStyle(PROBE).color, k = /^color\(/.test(raw) ? 255 : 1, n = raw.match(/[\d.]+/g);
    return n && n.length > 2 ? Math.round(n[0] * k) + ',' + Math.round(n[1] * k) + ',' + Math.round(n[2] * k) : fb;
  }
  var PAL3 = ['159,123,255', '93,199,255', '255,181,98'];
  function readPal() { PAL3 = [rgbVar('--violet', PAL3[0]), rgbVar('--cyan', PAL3[1]), rgbVar('--amber', PAL3[2])]; }
  readPal();
  var PRECISE = 'input, textarea, select, [contenteditable="true"], a, button, label, [role="button"], summary';
  var dark = root.dataset.theme !== 'light';
  var glow = null, dots = {};
  function pal() { return PAL3; }
  function pick() { var p = pal(); return p[Math.floor(Math.random() * p.length)]; }
  function main() { return dark ? PAL3[1] : PAL3[0]; }

  function sprite(rgb, size, core) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), h = size / 2, g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, core || 'rgba(' + rgb + ',1)'); g.addColorStop(0.4, 'rgba(' + rgb + ',0.28)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }
  function bake() {
    glow = sprite(main(), 56, dark ? 'rgba(255,255,255,0.9)' : 'rgba(255,250,240,0.9)');
    dots = {};
    pal().forEach(function (c) { dots[c] = sprite(c, 16); });
  }
  bake();
  document.addEventListener('rm:themechange', function () { dark = root.dataset.theme !== 'light'; setTimeout(function () { readPal(); bake(); }, 30); });
  document.addEventListener('rm:tune', function () {
    setTimeout(function () { readPal(); bake(); if (modeNow() !== 'comet') { trail.length = 0; parts.length = 0; prev = null; } }, 120);
  });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (modeNow() !== 'comet') return;
    var t = e.target;
    precise = !!(t && t.closest && t.closest(PRECISE));
    var x = e.clientX, y = e.clientY, now = performance.now();
    lastMove = now;
    var dx = prev ? x - prev.x : 0, dy = prev ? y - prev.y : 0, spd = Math.sqrt(dx * dx + dy * dy);
    if (!precise && (!prev || spd >= 1.5)) { trail.push({ x: x, y: y, ts: now }); if (trail.length > MAX_PTS) trail.shift(); }
    if (prev && spd > 3 && !precise) {
      var base = Math.atan2(-dy, -dx), n = spd > 12 ? 3 : spd > 6 ? 2 : 1;
      for (var k = 0; k < n; k++) {
        var a = base + (Math.random() - 0.5) * 1.8, s = Math.random() * 1.5 + 0.3;
        parts.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 3 + 2, c: Math.random() < 0.4 ? main() : pick(), life: 0, max: 80 + Math.random() * 130 });
      }
      if (parts.length > 70) parts.splice(0, parts.length - 70);
    }
    prev = { x: x, y: y };
    if (!running && !precise) { running = true; last = 0; requestAnimationFrame(frame); }
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { prev = null; });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { prev = null; trail.length = 0; parts.length = 0; } });

  function drawTrail(ts) {
    var cutoff = ts - MAX_AGE;
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
      stroke.addColorStop(0, 'rgba(' + pal()[0] + ',0)'); stroke.addColorStop(0.55, 'rgba(' + c + ',0.5)'); stroke.addColorStop(1, 'rgba(' + pal()[2] + ',1)');
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
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.008;
      ctx.globalAlpha = Math.max(0, (1 - p.life / p.max) * 0.9);
      ctx.drawImage(dots[p.c] || dots[pal()[0]], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    ctx.globalAlpha = 1;
    drawTrail(ts);
    var moving = prev && !precise && ts - lastMove < 120;
    if (moving) ctx.drawImage(glow, prev.x - 28, prev.y - 28, 56, 56);
    if (!moving && !trail.length && !parts.length) {
      ctx.clearRect(0, 0, W, H); running = false; return;
    }
    requestAnimationFrame(frame);
  }
})();
