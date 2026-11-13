/* Comet cursor: a fine hairline streak with tiny sparks. Page-wide, pointer-events none. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.matchMedia) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'comet';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var TRAIL_AGE = 460, MAX_PTS = 70, MAX_SPARKS = 110;
  var trail = [], sparks = [], prev = null, head = null;
  var active = false, native = false, onLink = false, running = false, last = 0, headA = 0;
  var NATIVE = 'input, textarea, select, button, label, summary, [contenteditable], .btn, .assist-panel, .contact-form';
  var ROSE_D = '236,128,148', ROSE_L = '178,58,82';

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function dark() { return root.dataset.theme !== 'light'; }
  function ink() { return dark() ? '232,236,246' : '14,15,18'; }
  function rose() { return dark() ? ROSE_D : ROSE_L; }

  function setHidden(h) {
    if (h === root.classList.contains('comet-hide')) return;
    root.classList.toggle('comet-hide', h);
  }

  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var t = e.target;
    native = !!(t && t.closest && t.closest(NATIVE));
    onLink = !native && !!(t && t.closest && t.closest('a'));
    var x = e.clientX, y = e.clientY, now = performance.now();
    if (native) {
      setHidden(false);
      active = false; prev = null; head = null;
      kick();
      return;
    }
    if (!active) { active = true; trail = []; }
    setHidden(true);
    head = { x: x, y: y };
    var dx = prev ? x - prev.x : 0, dy = prev ? y - prev.y : 0, spd = Math.sqrt(dx * dx + dy * dy);
    if (!prev || spd >= 1.2) {
      trail.push({ x: x, y: y, ts: now });
      if (trail.length > MAX_PTS) trail.shift();
    }
    if (prev && spd > 2.5 && sparks.length < MAX_SPARKS) {
      var n = spd > 14 ? 2 : (Math.random() < 0.55 ? 1 : 0);
      var base = Math.atan2(-dy, -dx);
      for (var i = 0; i < n; i++) {
        var a = base + (Math.random() - 0.5) * 1.7, v = 0.25 + Math.random() * 1.1;
        sparks.push({
          x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3,
          vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          r: 0.45 + Math.random() * 0.7, life: 0, max: 520 + Math.random() * 520,
          rose: Math.random() < (dark() ? 0.28 : 0.55)
        });
      }
    }
    prev = { x: x, y: y };
    kick();
  }
  function onLeave(e) {
    if (e && e.relatedTarget) return;
    active = false; prev = null; head = null; onLink = false;
    setHidden(false);
    kick();
  }

  function frame(now) {
    var dt = last ? Math.min(now - last, 50) : 16; last = now;
    ctx.clearRect(0, 0, W, H);
    var c = ink(), rc = rose();
    // age out trail
    while (trail.length && now - trail[0].ts > TRAIL_AGE) trail.shift();
    if (trail.length > 1) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (var i = 1; i < trail.length; i++) {
        var p0 = trail[i - 1], p1 = trail[i], p2 = trail[i + 1] || p1;
        var f = 1 - (now - p1.ts) / TRAIL_AGE; if (f <= 0) continue;
        var a = Math.pow(f, 1.4) * 0.9;
        ctx.strokeStyle = 'rgba(' + c + ',' + a.toFixed(3) + ')';
        ctx.lineWidth = 0.5 + 1.1 * f;
        ctx.beginPath();
        ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        ctx.stroke();
      }
    }
    // sparks
    for (var s = sparks.length - 1; s >= 0; s--) {
      var sp = sparks[s];
      sp.life += dt;
      if (sp.life >= sp.max) { sparks.splice(s, 1); continue; }
      sp.x += sp.vx * (dt / 16); sp.y += sp.vy * (dt / 16);
      sp.vx *= 0.985; sp.vy = sp.vy * 0.985 + 0.004;
      var al = Math.pow(1 - sp.life / sp.max, 1.3) * 0.9;
      ctx.fillStyle = 'rgba(' + (sp.rose ? rc : c) + ',' + al.toFixed(3) + ')';
      ctx.fillRect(sp.x - sp.r, sp.y - sp.r, sp.r * 2, sp.r * 2);
    }
    // head
    var target = active && head ? 1 : 0;
    headA += (target - headA) * 0.25;
    if (head && headA > 0.02) {
      var hc = onLink ? rc : c, r = onLink ? 3.2 : 1.9;
      var g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 11);
      g.addColorStop(0, 'rgba(' + hc + ',' + (0.22 * headA).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + hc + ',0)');
      ctx.fillStyle = g; ctx.fillRect(head.x - 11, head.y - 11, 22, 22);
      ctx.fillStyle = 'rgba(' + hc + ',' + headA.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(head.x, head.y, r, 0, 6.2832); ctx.fill();
    }
    if (trail.length || sparks.length || (active && head) || headA > 0.02) requestAnimationFrame(frame);
    else running = false;
  }
  function kick() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('mouseout', onLeave);
  window.addEventListener('blur', function () { onLeave(null); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) onLeave(null); });
})();
