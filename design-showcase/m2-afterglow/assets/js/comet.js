/* Comet cursor: aurora-coloured trail, glowing head, sparkles. Page-wide, fine pointers only. */
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
  var prev = null, active = false, precise = false, running = false, last = 0, headA = 0;
  var MAX_AGE = 420, MAX_PTS = 80;
  var DARK = ['159,123,255', '93,199,255', '255,181,98'];
  var LIGHT = ['112,76,222', '30,126,184', '196,112,12'];
  var PRECISE = 'input, textarea, select, [contenteditable="true"]';
  var dark = root.dataset.theme !== 'light';
  document.addEventListener('rm:themechange', function () { dark = root.dataset.theme !== 'light'; });

  function pal() { return dark ? DARK : LIGHT; }
  function pick() { var p = pal(); return p[Math.floor(Math.random() * p.length)]; }
  function main() { return dark ? '93,199,255' : '112,76,222'; }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function setActive(on) {
    if (on === active) return;
    active = on;
    root.classList.toggle('comet-on', on);
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    setActive(true);
    var t = e.target;
    precise = !!(t && t.closest && t.closest(PRECISE + ', a, button, label, [role="button"], summary'));
    var x = e.clientX, y = e.clientY;
    var dx = prev ? x - prev.x : 0, dy = prev ? y - prev.y : 0, spd = Math.sqrt(dx * dx + dy * dy);
    if (!prev || spd >= 1.5) { trail.push({ x: x, y: y, ts: performance.now() }); if (trail.length > MAX_PTS) trail.shift(); }
    if (prev && spd > 3 && !precise) {
      var base = Math.atan2(-dy, -dx), n = spd > 12 ? 3 : spd > 6 ? 2 : 1;
      for (var k = 0; k < n; k++) {
        var a = base + (Math.random() - 0.5) * 1.8, s = Math.random() * 1.5 + 0.3;
        parts.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 0.9 + 0.3, c: Math.random() < 0.4 ? main() : pick(), life: 0, max: 80 + Math.random() * 130 });
      }
      if (Math.random() < 0.02) burst(x, y, base);
    }
    prev = { x: x, y: y };
    start();
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', function () { prev = null; setActive(false); });

  function burst(x, y, base) {
    var n = 4 + Math.floor(Math.random() * 5);
    for (var i = 0; i < n; i++) {
      var a = base + (Math.random() - 0.5) * Math.PI * 1.6, s = Math.random() * 2 + 0.5;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: Math.random() * 1.5 + 0.7, c: pick(), life: 0, max: 350 + Math.random() * 400, chunk: true, ph: Math.random() * 6.28 });
    }
  }

  function drawHead(x, y, c) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, 26);
    g.addColorStop(0, 'rgba(' + c + ',0.22)'); g.addColorStop(0.4, 'rgba(' + c + ',0.07)'); g.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, 6.283); ctx.fill();
    g = ctx.createRadialGradient(x, y, 0, x, y, 5);
    g.addColorStop(0, dark ? 'rgba(255,255,255,1)' : 'rgba(255,250,240,1)'); g.addColorStop(0.45, 'rgba(' + c + ',0.9)'); g.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.283); ctx.fill();
  }

  function drawTrail(ts) {
    var cutoff = ts - MAX_AGE;
    while (trail.length && trail[0].ts < cutoff) trail.shift();
    if (trail.length < 2) return;
    var c = main(), tail = trail[0], hd = trail[trail.length - 1];
    ctx.beginPath();
    ctx.moveTo((tail.x + trail[1].x) / 2, (tail.y + trail[1].y) / 2);
    for (var i = 1; i < trail.length - 1; i++) ctx.quadraticCurveTo(trail[i].x, trail[i].y, (trail[i].x + trail[i + 1].x) / 2, (trail[i].y + trail[i + 1].y) / 2);
    ctx.lineTo(hd.x, hd.y);
    var dist = Math.hypot(hd.x - tail.x, hd.y - tail.y);
    function grad(a) {
      if (dist < 4) return 'rgba(' + c + ',' + a * 0.5 + ')';
      var g = ctx.createLinearGradient(tail.x, tail.y, hd.x, hd.y);
      g.addColorStop(0, 'rgba(' + pal()[0] + ',0)'); g.addColorStop(0.55, 'rgba(' + c + ',' + a * 0.4 + ')'); g.addColorStop(1, 'rgba(' + pal()[2] + ',' + a + ')');
      return g;
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = grad(0.07); ctx.lineWidth = 18; ctx.stroke();
    ctx.strokeStyle = grad(0.2); ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = grad(0.9); ctx.lineWidth = 2; ctx.stroke();
  }

  function drawParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += p.chunk ? 0.015 : 0.008;
      var f = p.life / p.max;
      var a = p.chunk ? (1 - f) * 0.9 * (Math.sin(p.ph + p.life * 0.025) * 0.35 + 0.65) : (1 - f) * 0.85;
      ctx.fillStyle = 'rgba(' + p.c + ',' + Math.max(0, a) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
  }

  function frame(ts) {
    var dt = last ? Math.min(ts - last, 50) : 16; last = ts;
    ctx.clearRect(0, 0, W, H);
    drawParts(dt);
    drawTrail(ts);
    var target = active && !precise && prev ? 1 : 0;
    headA += (target - headA) * 0.25;
    if (headA > 0.02 && prev) {
      ctx.globalAlpha = headA; drawHead(prev.x, prev.y, main()); ctx.globalAlpha = 1;
    }
    if (!active && !prev && !trail.length && !parts.length && headA < 0.02) { running = false; last = 0; return; }
    requestAnimationFrame(frame);
  }
  function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { prev = null; trail.length = 0; parts.length = 0; } });
})();
