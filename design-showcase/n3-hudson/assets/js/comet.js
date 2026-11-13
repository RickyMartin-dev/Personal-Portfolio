/* Comet cursor — aurora trail, white-hot head, drifting sparks. Fine pointers only. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var cv = document.createElement('canvas');
  cv.className = 'comet'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');
  var AURORA = ['159,123,255', '93,199,255', '255,181,98'];
  var W = 0, H = 0, dpr = 1;
  var trail = [], sparks = [], mouse = null, prev = null, active = false, raf = 0, last = 0;
  var MAX_AGE = 430;
  var root = document.documentElement;
  var PRECISE = 'input,textarea,select,[contenteditable],label,.assist-panel';

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
  }
  size(); window.addEventListener('resize', size);

  function headColor() { return root.getAttribute('data-theme') === 'light' ? '120,92,230' : '170,150,255'; }

  document.addEventListener('mousemove', function (e) {
    var over = e.target && e.target.closest && e.target.closest(PRECISE);
    var x = e.clientX, y = e.clientY;
    mouse = { x: x, y: y };
    root.classList.toggle('comet-on', !over);
    var spd = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
    if (!prev || spd >= 1.5) { trail.push({ x: x, y: y, t: performance.now() }); if (trail.length > 70) trail.shift(); }
    if (prev && spd > 3 && !over) {
      var n = spd > 12 ? 3 : spd > 6 ? 2 : 1, base = Math.atan2(prev.y - y, prev.x - x);
      for (var i = 0; i < n; i++) {
        var a = base + (Math.random() - 0.5) * 1.8, v = Math.random() * 1.4 + 0.3;
        sparks.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 0.9 + 0.3, life: 0, max: 520 + Math.random() * 600, c: AURORA[(Math.random() * 3) | 0] });
      }
    }
    prev = { x: x, y: y };
    active = !over;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }, { passive: true });
  document.addEventListener('mouseleave', function () { active = false; mouse = null; prev = null; root.classList.remove('comet-on'); });

  function frame(now) {
    var dt = Math.min(now - last, 50); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var cut = now - MAX_AGE;
    while (trail.length && trail[0].t < cut) trail.shift();
    var col = headColor();
    if (trail.length > 1) {
      var tail = trail[0], head = trail[trail.length - 1];
      ctx.beginPath();
      ctx.moveTo((tail.x + trail[1].x) / 2, (tail.y + trail[1].y) / 2);
      for (var i = 1; i < trail.length - 1; i++) ctx.quadraticCurveTo(trail[i].x, trail[i].y, (trail[i].x + trail[i + 1].x) / 2, (trail[i].y + trail[i + 1].y) / 2);
      ctx.lineTo(head.x, head.y);
      var dist = Math.hypot(head.x - tail.x, head.y - tail.y);
      if (dist > 4) {
        var mk = function (a) { var g = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y); g.addColorStop(0, 'rgba(93,199,255,0)'); g.addColorStop(0.55, 'rgba(' + col + ',' + a * 0.4 + ')'); g.addColorStop(1, 'rgba(' + col + ',' + a + ')'); return g; };
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = mk(0.06); ctx.lineWidth = 16; ctx.stroke();
        ctx.strokeStyle = mk(0.2); ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = mk(0.85); ctx.lineWidth = 1.8; ctx.stroke();
      }
    }
    for (var j = sparks.length - 1; j >= 0; j--) {
      var p = sparks[j]; p.life += dt;
      if (p.life >= p.max) { sparks.splice(j, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.006;
      ctx.fillStyle = 'rgba(' + p.c + ',' + (0.85 * (1 - p.life / p.max)) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
    }
    if (mouse && active) {
      var g1 = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 22);
      g1.addColorStop(0, 'rgba(' + col + ',0.28)'); g1.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 22, 0, 6.3); ctx.fill();
      var g2 = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 4.5);
      g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(0.45, 'rgba(' + col + ',0.9)'); g2.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 4.5, 0, 6.3); ctx.fill();
    }
    if (trail.length || sparks.length || (mouse && active)) raf = requestAnimationFrame(frame); else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }
})();
