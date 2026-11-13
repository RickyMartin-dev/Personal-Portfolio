/* m1-summit fx: comet cursor (page-wide), headline-underline meteor, night shooting stars, sticky header */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* header state */
  var hd = document.querySelector('.site-header');
  function stuck() { if (hd) hd.classList.toggle('is-stuck', window.scrollY > 24); }
  window.addEventListener('scroll', stuck, { passive: true }); stuck();

  var canvas = document.createElement('canvas');
  canvas.id = 'comet'; canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function dark() { return root.dataset.theme !== 'light'; }
  function palette() {
    return dark()
      ? { main: '240,170,182', alt: ['232,144,158', '205,218,240', '255,255,255'], core: '255,255,255' }
      : { main: '176,72,92', alt: ['176,72,92', '70,76,92', '214,128,140'], core: '40,42,52' };
  }

  var trail = [], parts = [], prev = null, active = false, precise = false, inside = false;
  var meteor = null, shoot = null, nextShoot = performance.now() + 5000;
  var running = false, last = 0;
  var TRAIL_AGE = 420, MAX_PTS = 80;
  var PRECISE = 'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable]';

  function setPrecise(v) {
    if (v === precise) return;
    precise = v; root.classList.toggle('comet-precise', v);
  }

  /* ---- cursor ---- */
  if (fine && !reduce) {
    root.classList.add('comet-on');
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      inside = true;
      var el = e.target;
      var p = el && el.closest ? !!el.closest(PRECISE) : false;
      setPrecise(p);
      if (p) { prev = null; kick(); return; }
      var x = e.clientX, y = e.clientY;
      var dx = prev ? x - prev.x : 0, dy = prev ? y - prev.y : 0, spd = Math.sqrt(dx * dx + dy * dy);
      if (!prev || spd >= 1.5) { trail.push({ x: x, y: y, ts: performance.now() }); if (trail.length > MAX_PTS) trail.shift(); }
      if (prev && spd > 3) {
        var pal = palette(), base = Math.atan2(-dy, -dx), n = spd > 12 ? 3 : spd > 6 ? 2 : 1;
        for (var k = 0; k < n; k++) {
          var sp = (Math.random() - 0.5) * 1.8, v = Math.random() * 1.5 + 0.3;
          parts.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(base + sp) * v, vy: Math.sin(base + sp) * v, r: Math.random() * 0.9 + 0.3, life: 0, max: 80 + Math.random() * 130, c: Math.random() < 0.45 ? pal.main : pal.alt[(Math.random() * pal.alt.length) | 0] });
        }
      }
      prev = { x: x, y: y }; active = true; kick();
    }, { passive: true });
    document.addEventListener('mouseleave', function () { inside = false; active = false; prev = null; setPrecise(false); });
    document.addEventListener('mouseenter', function () { inside = true; });
  }

  function head(x, y, c) {
    var isD = dark();
    [[28, 0.2, 0.06], [12, 0.5, 0.18]].forEach(function (b) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, b[0]);
      g.addColorStop(0, 'rgba(' + c + ',' + (isD ? b[1] : b[1] * 0.7) + ')'); g.addColorStop(0.5, 'rgba(' + c + ',' + b[2] + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, b[0], 0, 6.283); ctx.fill();
    });
    var pal = palette();
    var g2 = ctx.createRadialGradient(x, y, 0, x, y, 5);
    g2.addColorStop(0, 'rgba(' + pal.core + ',1)'); g2.addColorStop(0.45, 'rgba(' + c + ',0.9)'); g2.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.283); ctx.fill();
  }

  function drawTrail(ts) {
    var cut = ts - TRAIL_AGE;
    while (trail.length && trail[0].ts < cut) trail.shift();
    if (trail.length < 2) return;
    var c = palette().main, tail = trail[0], hd2 = trail[trail.length - 1];
    ctx.beginPath(); ctx.moveTo((tail.x + trail[1].x) / 2, (tail.y + trail[1].y) / 2);
    for (var i = 1; i < trail.length - 1; i++) { var a = trail[i], b = trail[i + 1]; ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2); }
    ctx.lineTo(hd2.x, hd2.y);
    var dist = Math.hypot(hd2.x - tail.x, hd2.y - tail.y);
    function grad(al) {
      var g = dist > 4 ? ctx.createLinearGradient(tail.x, tail.y, hd2.x, hd2.y) : ctx.createRadialGradient(hd2.x, hd2.y, 0, hd2.x, hd2.y, 20);
      g.addColorStop(0, 'rgba(' + c + ',0)'); g.addColorStop(0.5, 'rgba(' + c + ',' + al * 0.35 + ')'); g.addColorStop(1, 'rgba(' + c + ',' + al + ')');
      return g;
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var k = dark() ? 1 : 0.8;
    ctx.strokeStyle = grad(0.05 * k); ctx.lineWidth = 18; ctx.stroke();
    ctx.strokeStyle = grad(0.18 * k); ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = grad(0.85); ctx.lineWidth = 2; ctx.stroke();
  }

  function drawParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.008;
      ctx.fillStyle = 'rgba(' + p.c + ',' + ((1 - p.life / p.max) * 0.85).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
  }

  /* ---- headline meteor (draws the underline) ---- */
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function expo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg) return;
    var path = svg.querySelector('path'), rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-m1-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-m1-meteor', '1'); } catch (e) {}
    var ex = rect.right, ey = rect.top + 4, dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left, path: path, t0: performance.now(), d1: 800, d2: 1000 };
    kick();
  }
  function drawMeteor(now) {
    var m = meteor, el = now - m.t0, hx, hy, ta = 1, d1 = m.d1, d2 = m.d2;
    if (el < d1) { var a = Math.pow(ease(el / d1), 1.5); hx = m.sx + (m.ex - m.sx) * a; hy = m.sy + (m.ey - m.sy) * a; m.path.style.strokeDashoffset = '1'; }
    else { var p2 = expo(ease((el - d1) / d2)); hx = m.ex - (m.ex - m.lx) * p2; hy = m.ey; m.path.style.strokeDashoffset = String(1 - p2); ta = 1 - ease((el - d1) / 500); }
    var ang = Math.atan2(m.ey - m.sy, m.ex - m.sx), len = 240 * (el < d1 ? Math.min(1, Math.pow(ease(el / d1), 1.5) * 3 + 0.1) : ta);
    var col = palette().main;
    if (el < d1 + 500) {
      var bx = el >= d1 ? m.ex : hx, by = el >= d1 ? m.ey : hy;
      var tx = bx - Math.cos(ang) * len, ty = by - Math.sin(ang) * len;
      var g = ctx.createLinearGradient(tx, ty, bx, by);
      g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(1, 'rgba(' + col + ',' + (0.9 * Math.max(ta, 0)).toFixed(3) + ')');
      var nx = -Math.sin(ang), ny = Math.cos(ang);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(bx + nx * 1.3, by + ny * 1.3); ctx.lineTo(bx - nx * 1.3, by - ny * 1.3); ctx.closePath(); ctx.fill();
    }
    var ha = el > d1 + d2 ? 1 - ease((el - d1 - d2) / 400) : 1;
    if (ha > 0) { ctx.fillStyle = 'rgba(' + palette().core + ',' + ha + ')'; ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, 6.283); ctx.fill(); }
    if (el > d1 + d2 + 450) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }

  /* ---- night shooting star ---- */
  function maybeShoot(now) {
    if (reduce || !dark()) return;
    var sc = document.querySelector('.scene');
    if (!sc) return;
    var r = sc.getBoundingClientRect();
    if (shoot) {
      var p = (now - shoot.t0) / shoot.dur;
      if (p >= 1) { shoot = null; nextShoot = now + 9000 + Math.random() * 9000; return; }
      var hx = shoot.x + Math.cos(shoot.a) * shoot.d * p, hy = shoot.y + Math.sin(shoot.a) * shoot.d * p;
      var tx = hx - Math.cos(shoot.a) * shoot.len, ty = hy - Math.sin(shoot.a) * shoot.len;
      var al = Math.sin(p * Math.PI);
      var g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, 'rgba(210,222,245,0)'); g.addColorStop(1, 'rgba(235,242,255,' + (0.85 * al).toFixed(3) + ')');
      ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      return;
    }
    if (now >= nextShoot && r.bottom > 200 && r.top < 100) {
      var a = (24 + Math.random() * 14) * Math.PI / 180;
      shoot = { x: W * (0.08 + Math.random() * 0.5), y: 90 + Math.random() * Math.min(260, H * 0.25), a: a, d: W * 0.3, len: 110 + Math.random() * 60, t0: now, dur: 900 + Math.random() * 400 };
    }
  }

  function frame(now) {
    var dt = last ? Math.min(now - last, 50) : 16; last = now;
    ctx.clearRect(0, 0, W, H);
    drawParts(dt);
    var live = active && !precise && inside;
    if (live || trail.length) drawTrail(now);
    if (live && trail.length) { var h = trail[trail.length - 1]; head(h.x, h.y, palette().main); }
    if (meteor) drawMeteor(now);
    maybeShoot(now);
    var idle = !live && !trail.length && !parts.length && !meteor && !shoot;
    var canShoot = !reduce && dark() && document.querySelector('.scene');
    if (idle && !canShoot) { running = false; last = 0; return; }
    if (document.hidden) { running = false; last = 0; return; }
    requestAnimationFrame(frame);
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  document.addEventListener('visibilitychange', kick);
  document.addEventListener('rm:themechange', kick);
  var go = function () { if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1100); kick(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
})();
