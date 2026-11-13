/* r4 kinetic: split-text reveals, headline fit + scroll line offsets, skills marquee,
   magnetic UI, and the ink / spark cursors. Scroll work is passive, rAF-coalesced and
   writes transforms on a handful of elements only (never CSS variables on :root). */
(function () {
  'use strict';
  var root = document.documentElement;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMq = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  var fineMq = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)');
  var narrowMq = window.matchMedia && matchMedia('(max-width: 640px)');
  function motion() { return reduceMq && reduceMq.matches ? 'off' : (root.dataset.motion || 'full'); }
  function t(id, def) { return R4.tune(id, def); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- split text ---------- */
  function splitChars(w, counter) {
    var txt = w.textContent; w.textContent = '';
    for (var i = 0; i < txt.length; i++) {
      var c = document.createElement('span');
      c.className = 'ch'; c.textContent = txt.charAt(i);
      c.style.setProperty('--i', counter.n++);
      w.appendChild(c);
    }
  }
  var titles = $$('h1[data-kin]');
  titles.forEach(function (h) {
    if (h.classList.contains('kin-c')) {
      var text = h.textContent.trim();
      h.setAttribute('aria-label', text);
      h.textContent = '';
      var ln = document.createElement('span'), inn = document.createElement('span');
      ln.className = 'ln l1'; ln.setAttribute('aria-hidden', 'true'); inn.className = 'ln-in';
      text.split(/\s+/).forEach(function (word, i, arr) {
        var w = document.createElement('span'); w.className = 'w'; w.textContent = word; inn.appendChild(w);
        if (i < arr.length - 1) inn.appendChild(document.createTextNode(' '));
      });
      ln.appendChild(inn); h.appendChild(ln);
    }
    var counter = { n: 0 };
    $$('.ln', h).forEach(function (ln, li) {
      ln.querySelector('.ln-in').style.setProperty('--li', li);
      $$('.w', ln).forEach(function (w) { splitChars(w, counter); });
    });
    // word index runs across lines for the word reveal
    $$('.w', h).forEach(function (w, i) { w.style.setProperty('--wi', i); });
  });

  function play() {
    titles.forEach(function (h) {
      h.dataset.rv = t('reveal', 'letters');
      h.classList.add('ready');
      h.classList.remove('go');
      void h.offsetWidth;
      if (motion() !== 'off') h.classList.add('go');
    });
  }

  /* ---------- fit the giant headline to the column, for any display font ---------- */
  var hero1 = document.querySelector('.hero-title');
  var fitT = 0;
  function fit() {
    if (!hero1) return;
    var wrap = hero1.parentNode, avail = wrap.clientWidth;
    var narrow = narrowMq && narrowMq.matches;
    var fs = parseFloat(getComputedStyle(hero1).fontSize) || 100;
    var units = narrow ? $$('.w', hero1) : $$('.ln-in', hero1);
    var maxW = 0;
    units.forEach(function (u) { maxW = Math.max(maxW, u.offsetWidth); });
    if (!maxW) return;
    var unit = maxW / fs;
    var fitMax = (avail / unit) * 0.985;
    var lines = narrow ? 4 : 2;
    var hcap = (window.innerHeight * (narrow ? 0.4 : 0.47)) / (lines * 0.9);
    var base = Math.min(fitMax * 0.985, hcap, 240);
    hero1.style.setProperty('--hs', base.toFixed(1) + 'px');
    hero1.style.setProperty('--hmax', fitMax.toFixed(1) + 'px');
    lastY = -1; onScroll();
  }
  function fitSoon() { clearTimeout(fitT); fitT = setTimeout(fit, 70); }
  window.addEventListener('resize', fitSoon);
  if (document.fonts) {
    document.fonts.ready.then(fit);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitSoon);
  }

  /* ---------- headline lines slide apart on scroll (transform on three elements) ---------- */
  var lines = hero1 ? $$('.ln', hero1) : [];
  var rates = [-0.2, 0.28];
  var ticking = false, lastY = -1;
  function onScroll() {
    ticking = false;
    if (!lines.length) return;
    var y = Math.min(window.scrollY, window.innerHeight * 1.1);
    if (y === lastY) return;
    lastY = y;
    var k = motion() === 'off' ? 0 : t('drift', 1) * (motion() === 'calm' ? 0.5 : 1);
    for (var i = 0; i < lines.length; i++) {
      var x = k ? Math.round(y * rates[i % 2] * k) : 0;
      lines[i].style.transform = x ? 'translate3d(' + x + 'px,0,0)' : '';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- section headings: word-mask reveal, armed on first scroll ---------- */
  function splitWords(h) {
    var nodes = [].slice.call(h.childNodes), i = 0;
    h.textContent = '';
    nodes.forEach(function (n) {
      if (n.nodeType !== 3) { h.appendChild(n); return; }
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { h.appendChild(document.createTextNode(' ')); return; }
        var m = document.createElement('span'), inn = document.createElement('span');
        m.className = 'mw'; inn.className = 'mw-in'; inn.style.setProperty('--wi', i++); inn.textContent = part;
        m.appendChild(inn); h.appendChild(m);
      });
    });
  }
  var armEv = ['scroll', 'wheel', 'touchmove', 'keydown'];
  function armHeads() {
    armEv.forEach(function (e) { window.removeEventListener(e, armHeads); });
    if (!('IntersectionObserver' in window) || (reduceMq && reduceMq.matches)) return;
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    $$('main .section h2.h2').forEach(function (h) {
      if (h.getBoundingClientRect().top < vh * 0.9) return;
      h.classList.remove('rv', 'in');
      var label = h.textContent.trim();
      h.setAttribute('aria-label', label);
      splitWords(h);
      $$('.mw', h).forEach(function (m) { m.setAttribute('aria-hidden', 'true'); });
      h.classList.add('kin2');
      io.observe(h);
    });
  }
  armEv.forEach(function (e) { window.addEventListener(e, armHeads, { passive: true }); });

  /* ---------- marquee ---------- */
  var rows = [], mqPaused = false, mqRun = false, mqLast = 0, mqVisible = new Set(), lastScrollY = window.scrollY, boost = 0;
  var mqBtn = document.querySelector('.mq-pause');
  function mqInit() {
    $$('.mq').forEach(function (el) {
      var track = el.querySelector('.mq-track'), list = track.firstElementChild;
      var copy = list.cloneNode(true); copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
      var row = { el: el, track: track, list: list, copy: copy, x: 0, w: 0, dir: +el.dataset.dir || -1, base: +el.dataset.speed || 40, hover: false };
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') row.hover = true; });
      el.addEventListener('pointerleave', function () { row.hover = false; });
      el.addEventListener('focusin', function () { row.hover = true; });
      el.addEventListener('focusout', function () { row.hover = false; });
      rows.push(row);
    });
    mqMeasure();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) mqVisible.add(e.target); else mqVisible.delete(e.target); });
        mqKick();
      });
      rows.forEach(function (r) { io.observe(r.el); });
    } else rows.forEach(function (r) { mqVisible.add(r.el); });
    if (mqBtn) mqBtn.addEventListener('click', function () {
      mqPaused = !mqPaused;
      mqBtn.setAttribute('aria-pressed', String(mqPaused));
      mqBtn.setAttribute('aria-label', mqPaused ? 'Play scrolling text' : 'Pause scrolling text');
      mqKick();
    });
    mqApply();
  }
  function mqMeasure() {
    rows.forEach(function (r) {
      r.w = r.list.getBoundingClientRect().width || 1;
      // enough copies to cover wide screens
      while (r.track.children.length * r.w < window.innerWidth * 2 + r.w) {
        var c = r.list.cloneNode(true); c.setAttribute('aria-hidden', 'true'); r.track.appendChild(c);
      }
    });
  }
  function mqApply() {
    var off = motion() === 'off';
    rows.forEach(function (r) {
      r.el.classList.toggle('mq-static', off);
      if (off) r.track.style.transform = '';
    });
    mqKick();
  }
  function mqKick() {
    if (mqRun || !rows.length || motion() === 'off') return;
    mqRun = true; mqLast = 0; lastScrollY = window.scrollY;
    requestAnimationFrame(mqFrame);
  }
  function mqFrame(ts) {
    var dt = mqLast ? Math.min(ts - mqLast, 50) : 16; mqLast = ts;
    var visible = false, i;
    var sy = window.scrollY, sv = (sy - lastScrollY) / Math.max(dt, 1) * 1000; lastScrollY = sy;
    boost += (sv - boost) * 0.08;
    var mul = t('marquee', 1) * (motion() === 'calm' ? 0.5 : 1);
    var reactive = t('marqueeScroll', true) !== false;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!mqVisible.has(r.el)) continue;
      visible = true;
      var v = (mqPaused || r.hover) ? 0 : r.base * mul;
      if (reactive && !mqPaused) v += Math.max(-600, Math.min(600, boost)) * 0.18 * Math.max(mul, 0.4);
      r.x += r.dir * v * dt / 1000;
      var x = ((r.x % r.w) + r.w) % r.w - r.w;
      r.track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }
    if (visible && !document.hidden && motion() !== 'off') requestAnimationFrame(mqFrame); else mqRun = false;
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) mqKick(); });
  window.addEventListener('resize', function () { clearTimeout(mqInit.t); mqInit.t = setTimeout(mqMeasure, 150); });
  if (document.fonts) document.fonts.ready.then(mqMeasure);
  if (document.querySelector('.mq')) mqInit();

  /* ---------- magnetic UI ---------- */
  var MAG = '.btn, .nav a, .brand, .icon-btn, .work-link, .contact-links a';
  var mags = [], mx = -999, my = -999, mrun = false, mAny = false;
  function collect() { mags = $$(MAG).filter(function (e) { return !e.closest('.assist-panel'); }).map(function (e) { return { el: e, x: 0, y: 0, tx: 0, ty: 0 }; }); }
  function strength() { return motion() === 'off' ? 0 : +t('magnet', 1) * (motion() === 'calm' ? 0.5 : 1); }
  function mframe() {
    var S = strength(), i, m, r, rects = [], moving = false;
    for (i = 0; i < mags.length; i++) rects.push(S ? mags[i].el.getBoundingClientRect() : null);
    for (i = 0; i < mags.length; i++) {
      m = mags[i]; r = rects[i];
      if (r && r.bottom > -80 && r.top < window.innerHeight + 80 && !m.el.matches('.contact-links a')) {
        var cx = r.left + r.width / 2 - m.x, cy = r.top + r.height / 2 - m.y;
        var dx = mx - cx, dy = my - cy, rad = Math.max(r.width, r.height) / 2 + 56 * Math.min(S, 1.5);
        if (Math.hypot(dx, dy) < rad) { m.tx = clamp(dx * 0.32 * S, -16 * S, 16 * S); m.ty = clamp(dy * 0.32 * S, -12 * S, 12 * S); }
        else { m.tx = 0; m.ty = 0; }
      } else { m.tx = 0; m.ty = 0; }
      m.x += (m.tx - m.x) * 0.2; m.y += (m.ty - m.y) * 0.2;
      var settled = Math.abs(m.tx - m.x) < 0.05 && Math.abs(m.ty - m.y) < 0.05;
      if (settled && !m.tx && !m.ty) { m.x = 0; m.y = 0; if (m.on) { m.el.style.transform = ''; m.on = false; } }
      else { moving = true; m.on = true; m.el.style.transform = 'translate3d(' + m.x.toFixed(2) + 'px,' + m.y.toFixed(2) + 'px,0)'; }
    }
    if (moving || mAny) { mAny = false; requestAnimationFrame(mframe); } else mrun = false;
  }
  function mPointer(e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    mx = e.clientX; my = e.clientY; mAny = true;
    if (!mrun && strength()) { mrun = true; requestAnimationFrame(mframe); }
  }
  if (fineMq && fineMq.matches) {
    collect();
    document.addEventListener('pointermove', mPointer, { passive: true });
    document.addEventListener('mouseleave', function () { mx = my = -999; mAny = true; if (!mrun) { mrun = true; requestAnimationFrame(mframe); } });
  }

  /* ---------- cursors: ink (dot that stretches with velocity) and spark trail ---------- */
  var ink = null, ix = 0, iy = 0, tx = 0, ty = 0, isc = 1, itarget = 1, irun = false, iseen = false, ihot = false, itext = false;
  var HOT = 'a, button, [role="button"], label, summary, select, .btn';
  function inkOn() { return fineMq && fineMq.matches && !(reduceMq && reduceMq.matches) && motion() !== 'off' && t('cursor', 'ink') === 'ink'; }
  function inkEnsure() {
    if (ink) return;
    ink = document.createElement('div'); ink.className = 'ink'; ink.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ink);
  }
  function inkFrame() {
    ix += (tx - ix) * 0.3; iy += (ty - iy) * 0.3;
    var vx = tx - ix, vy = ty - iy, sp = Math.hypot(vx, vy);
    isc += (itarget - isc) * 0.22;
    var st = 1 + Math.min(sp * 0.06, 1.3), sq = 1 / Math.sqrt(st), a = Math.atan2(vy, vx);
    ink.style.transform = 'translate3d(' + (ix - 7).toFixed(1) + 'px,' + (iy - 7).toFixed(1) + 'px,0) rotate(' + a.toFixed(3) + 'rad) scale(' + (isc * st).toFixed(3) + ',' + (isc * sq).toFixed(3) + ')';
    if (sp > 0.06 || Math.abs(itarget - isc) > 0.01) requestAnimationFrame(inkFrame); else irun = false;
  }
  function inkPointer(e) {
    if (!inkOn() || (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
    inkEnsure();
    tx = e.clientX; ty = e.clientY;
    var tg = e.target && e.target.closest ? e.target : null;
    itext = !!(tg && tg.closest('input, textarea, [contenteditable="true"]'));
    ihot = !!(tg && tg.closest(HOT));
    itarget = ihot ? 2.9 : 1;
    ink.classList.toggle('hot', ihot);
    ink.classList.toggle('on', !itext);
    if (!iseen) { ix = tx; iy = ty; iseen = true; }
    root.classList.add('ink-on');
    if (!irun) { irun = true; requestAnimationFrame(inkFrame); }
  }
  document.addEventListener('pointermove', inkPointer, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { if (ink) ink.classList.remove('on'); iseen = false; });
  function inkSync() {
    var on = inkOn();
    root.classList.toggle('ink-on', on && iseen);
    if (!on && ink) ink.classList.remove('on');
  }

  var sk = null, sctx = null, sW = 0, sH = 0, sdpr = 1, sparks = [], sprites = [], srun = false, slast = 0, sprev = null, sacc = 0;
  function sparkOn() { return fineMq && fineMq.matches && !(reduceMq && reduceMq.matches) && motion() !== 'off' && t('cursor', 'ink') === 'spark'; }
  function sparkSprites() {
    var pc = R4.read(), S = R4.str, cols = [S(pc.amber), S(pc.cyan), S(pc.violet), '255,255,255'];
    if (!pc.dark) cols[3] = S(pc.amber);
    sprites = cols.map(function (rgb) {
      var c = document.createElement('canvas'); c.width = c.height = 24;
      var x = c.getContext('2d'), h = 12;
      var g = x.createRadialGradient(h, h, 0, h, h, h); g.addColorStop(0, 'rgba(' + rgb + ',0.5)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, 24, 24);
      x.fillStyle = 'rgba(' + rgb + ',1)';
      x.beginPath(); x.moveTo(h, 3); x.quadraticCurveTo(h, h, 21, h); x.quadraticCurveTo(h, h, h, 21); x.quadraticCurveTo(h, h, 3, h); x.quadraticCurveTo(h, h, h, 3); x.fill();
      return c;
    });
  }
  function sparkEnsure() {
    if (sk) return;
    sk = document.createElement('canvas'); sk.id = 'spark'; sk.setAttribute('aria-hidden', 'true');
    document.body.appendChild(sk); sctx = sk.getContext('2d'); sparkResize(); sparkSprites();
    window.addEventListener('resize', sparkResize);
  }
  function sparkResize() {
    if (!sk) return;
    sdpr = Math.min(window.devicePixelRatio || 1, 1.5); sW = window.innerWidth; sH = window.innerHeight;
    sk.width = Math.round(sW * sdpr); sk.height = Math.round(sH * sdpr); sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0);
  }
  function sparkPointer(e) {
    if (!sparkOn() || (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
    sparkEnsure();
    var x = e.clientX, y = e.clientY;
    if (sprev) {
      var dx = x - sprev.x, dy = y - sprev.y, d = Math.hypot(dx, dy);
      sacc += d;
      while (sacc > 11) {
        sacc -= 11;
        var a = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 1.6, s = 0.4 + Math.random() * 1.6 + Math.min(d * 0.05, 1.5);
        sparks.push({ x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.2, r: 4 + Math.random() * 6, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.12, life: 0, max: 520 + Math.random() * 480, c: (Math.random() * 4) | 0 });
      }
      if (sparks.length > 70) sparks.splice(0, sparks.length - 70);
    }
    sprev = { x: x, y: y };
    if (!srun) { srun = true; slast = 0; requestAnimationFrame(sparkFrame); }
  }
  function sparkFrame(ts) {
    var dt = slast ? Math.min(ts - slast, 50) : 16; slast = ts;
    sctx.clearRect(0, 0, sW, sH);
    for (var i = sparks.length - 1; i >= 0; i--) {
      var p = sparks[i]; p.life += dt;
      if (p.life >= p.max) { sparks.splice(i, 1); continue; }
      var k = 1 - p.life / p.max;
      p.x += p.vx * dt / 16; p.y += p.vy * dt / 16; p.vy += 0.012 * dt / 16; p.vx *= 0.985; p.rot += p.vr;
      var sz = p.r * (0.4 + 0.6 * k) * 2;
      sctx.globalAlpha = k;
      sctx.setTransform(sdpr * Math.cos(p.rot), sdpr * Math.sin(p.rot), -sdpr * Math.sin(p.rot), sdpr * Math.cos(p.rot), p.x * sdpr, p.y * sdpr);
      sctx.drawImage(sprites[p.c], -sz / 2, -sz / 2, sz, sz);
    }
    sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0); sctx.globalAlpha = 1;
    if (sparks.length) requestAnimationFrame(sparkFrame);
    else { sctx.clearRect(0, 0, sW, sH); srun = false; }
  }
  document.addEventListener('pointermove', sparkPointer, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { sprev = null; });

  /* ---------- tune + lifecycle ---------- */
  var tuneT = 0;
  document.addEventListener('rm:tune', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    inkSync(); mqApply();
    if (ch.indexOf('reveal') > -1) play();
    if (sk && sctx) { clearTimeout(tuneT); tuneT = setTimeout(sparkSprites, 120); }
    if (ch.length) fitSoon();
    lastY = -1; onScroll();
  });
  document.addEventListener('rm:themechange', function () { if (sk) setTimeout(sparkSprites, 60); });
  if (reduceMq && reduceMq.addEventListener) reduceMq.addEventListener('change', function () { mqApply(); inkSync(); });

  fit();
  play();
  onScroll();
})();
