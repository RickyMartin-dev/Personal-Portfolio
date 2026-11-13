/* Kinetic band: a big serif statement line and a mono skills ticker slide sideways in opposite directions.
   Transform-only (translate3d on two tracks), one rAF loop that runs only while a row is on screen,
   the tab is visible and motion is allowed. Speed, direction, hover-pause, separator and ticker follow rm:config. */
(function () {
  'use strict';
  var root = document.documentElement;
  var band = document.querySelector('.marquee');
  if (!band) return;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMq = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  function motion() { return reduceMq && reduceMq.matches ? 'off' : (root.dataset.motion || 'full'); }
  function K() {
    var c = window.RMConfig && window.RMConfig.get();
    return (c && c.motion && c.motion.kinetic) || { speed: 1, direction: 'left', pauseOnHover: true };
  }

  var rows = [], paused = false, run = false, lastT = 0, visible = new Set(), lastY = window.scrollY, boost = 0;
  var btn = band.querySelector('.mq-pause');

  $$('.mq', band).forEach(function (el, idx) {
    var track = el.querySelector('.mq-track'), list = track.firstElementChild;
    var copy = list.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); track.appendChild(copy);
    var row = { el: el, track: track, list: list, x: 0, w: 1, idx: idx, base: +el.dataset.speed || 40, hover: false };
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && K().pauseOnHover !== false) row.hover = true; });
    el.addEventListener('pointerleave', function () { row.hover = false; });
    el.addEventListener('focusin', function () { if (K().pauseOnHover !== false) row.hover = true; });
    el.addEventListener('focusout', function () { row.hover = false; });
    rows.push(row);
  });

  function measure() {
    rows.forEach(function (r) {
      r.w = r.list.getBoundingClientRect().width || 1;
      while (r.track.children.length * r.w < window.innerWidth * 2 + r.w) {
        var c = r.list.cloneNode(true); c.setAttribute('aria-hidden', 'true'); r.track.appendChild(c);
      }
    });
  }
  function applyMotion() {
    var off = motion() === 'off';
    rows.forEach(function (r) { r.el.classList.toggle('mq-static', off); if (off) r.track.style.transform = ''; });
    kick();
  }
  function kick() {
    if (run || !rows.length || motion() === 'off') return;
    run = true; lastT = 0; lastY = window.scrollY;
    requestAnimationFrame(frame);
  }
  function frame(ts) {
    var dt = lastT ? Math.min(ts - lastT, 50) : 16; lastT = ts;
    var k = K(), any = false, i;
    var sy = window.scrollY, sv = (sy - lastY) / Math.max(dt, 1) * 1000; lastY = sy;
    boost += (sv - boost) * 0.08;
    var mul = (+k.speed || 1) * (motion() === 'calm' ? 0.5 : 1);
    var dirA = k.direction === 'right' ? 1 : -1;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!visible.has(r.el)) continue;
      any = true;
      var v = (paused || r.hover) ? 0 : r.base * mul;
      if (!paused) v += Math.max(-600, Math.min(600, boost)) * 0.12 * Math.max(mul, 0.4);
      r.x += (r.idx === 0 ? dirA : -dirA) * v * dt / 1000;
      var x = ((r.x % r.w) + r.w) % r.w - r.w;
      r.track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }
    if (any && !document.hidden && motion() !== 'off') requestAnimationFrame(frame); else run = false;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      kick();
    });
    rows.forEach(function (r) { io.observe(r.el); });
  } else rows.forEach(function (r) { visible.add(r.el); });

  if (btn) btn.addEventListener('click', function () {
    paused = !paused;
    btn.setAttribute('aria-pressed', String(paused));
    btn.setAttribute('aria-label', paused ? 'Play scrolling text' : 'Pause scrolling text');
    kick();
  });

  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  var mt = 0;
  function remeasure() { clearTimeout(mt); mt = setTimeout(measure, 150); }
  window.addEventListener('resize', remeasure);
  if (document.fonts) { document.fonts.ready.then(measure); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', remeasure); }
  document.addEventListener('rm:config', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    if (ch.indexOf('type') > -1 || ch.indexOf('layout') > -1 || ch.indexOf('motion') > -1 || ch.indexOf('copy') > -1) remeasure();
    if (ch.indexOf('motion') > -1) applyMotion();
  });
  if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener('change', applyMotion);
  measure();
  applyMotion();
})();
