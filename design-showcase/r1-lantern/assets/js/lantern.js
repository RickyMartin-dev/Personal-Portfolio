/* Lantern: the engraved range is drawn twice (dim SVG, and a cached lit canvas). The cursor is a lantern:
   a cached radial sprite is composited with destination-in over a cursor-sized region of the lit layer,
   easing toward the pointer. Rest position is the summit (touch, reduced motion, other cursor modes).
   Also: fireflies cursor mode, and an amber cast that warms nearby labels.
   Everything sleeps when the light has settled; scroll only schedules a single frame. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.querySelector('.hero');
  var art = document.querySelector('.hero .art');
  var reduceMq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var fineMq = window.matchMedia ? matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };

  /* ---------- options ---------- */
  function opt(id, def) {
    var v;
    try { v = window.RMTune && RMTune.get(id); } catch (e) {}
    if (v === undefined || v === null) {
      var a = root.dataset['tune' + id.charAt(0).toUpperCase() + id.slice(1)];
      v = a === undefined ? def : a;
    }
    return v;
  }
  function num(id, def) { var n = parseFloat(opt(id, def)); return isNaN(n) ? def : n; }
  function mode() { return String(opt('cursor', 'lantern')); }
  function still() { return reduceMq.matches || !fineMq.matches || root.dataset.motion === 'off'; }
  function follows() { return mode() === 'lantern' && !still(); }

  /* ---------- colour ---------- */
  var probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  function rgbOf(name, fb) {
    probe.style.color = 'var(' + name + ')';
    var raw = getComputedStyle(probe).color, m = raw.match(/[\d.]+/g);
    if (!m || m.length < 3) return fb;
    var k = /^color\(/.test(raw) ? 255 : 1;
    return [Math.round(m[0] * k), Math.round(m[1] * k), Math.round(m[2] * k)];
  }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function isDark() { return root.dataset.theme !== 'light'; }
  var WHITE = [255, 255, 255];
  function palette() {
    var v = rgbOf('--violet', [159, 123, 255]), c = rgbOf('--cyan', [93, 199, 255]), a = rgbOf('--amber', [255, 181, 98]);
    var w = Math.max(0, Math.min(1, num('warmth', 70) / 100));
    var dark = isDark();
    var cool = dark ? mix(c, WHITE, 0.5) : c;
    var warm = dark ? mix(a, WHITE, 0.28) : a;
    var base = mix(cool, warm, w);
    return { v: v, c: c, a: a, base: base, warm: warm, dark: dark };
  }

  /* ---------- sprites ---------- */
  function radial(size, stops) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), h = size / 2, g = x.createRadialGradient(h, h, 0, h, h, h);
    stops.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }
  var poolMask = radial(256, [[0, 'rgba(0,0,0,1)'], [0.3, 'rgba(0,0,0,0.95)'], [0.55, 'rgba(0,0,0,0.7)'], [0.75, 'rgba(0,0,0,0.35)'], [0.9, 'rgba(0,0,0,0.1)'], [1, 'rgba(0,0,0,0)']]);
  var glowSprite = null, litGlow = null;
  function bakeSprites(P) {
    var d = P.dark;
    glowSprite = radial(256, [[0, rgba(P.warm, d ? 0.36 : 0.34)], [0.35, rgba(P.warm, d ? 0.17 : 0.16)], [0.7, rgba(P.warm, d ? 0.05 : 0.05)], [1, rgba(P.warm, 0)]]);
    litGlow = radial(256, [[0, rgba(P.warm, d ? 0.30 : 0.34)], [0.45, rgba(P.warm, d ? 0.11 : 0.15)], [1, rgba(P.warm, 0)]]);
  }

  /* ---------- state ---------- */
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var VW = window.innerWidth, VH = window.innerHeight;
  var P = palette();
  bakeSprites(P);
  var lit = document.createElement('canvas'), lc = lit.getContext('2d');          // fully lit range (offscreen)
  var beacon = document.createElement('canvas'), bc = beacon.getContext('2d');    // lit range around the summit only (offscreen)
  var scratch = document.createElement('canvas'), sc = scratch.getContext('2d');  // cursor-sized compositing region
  var shown = null, sh = null;                                                    // visible canvas in .art
  var lamp = document.createElement('canvas'), lctx = lamp.getContext('2d');      // fixed ambient glow
  lamp.id = 'lamp'; lamp.setAttribute('aria-hidden', 'true');
  document.body.appendChild(lamp);
  var A = null;               // art data from hero.js
  var artLeft = 0, artDocTop = 0;
  var pos = { x: -400, y: -400 }, intro = true, havePointer = false, pointerIn = true;
  var running = false, last = 0, heroVisible = true;
  var prevBox = null, prevGlow = null;
  var warmEls = [], warmVals = [];

  function resizeCanvases() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    VW = window.innerWidth; VH = window.innerHeight;
    lamp.width = VW; lamp.height = VH;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    prevGlow = null;
  }
  function radius() { return Math.max(60, Math.min(420, num('radius', 200))); }

  /* ---------- lit layer bake (palette, warmth, theme) ---------- */
  function bakeLit() {
    if (!A) return;
    var w = A.w, H = A.H, d = dpr;
    P = palette(); bakeSprites(P);
    lit.width = Math.round(w * d); lit.height = Math.round(H * d);
    lc.setTransform(d, 0, 0, d, 0, 0);
    lc.clearRect(0, 0, w, H);
    var dark = P.dark, top, mid, low, base, rim;
    if (dark) {
      top = mix(P.warm, WHITE, 0.45); mid = mix(P.base, P.warm, 0.35); low = mix(P.base, P.v, 0.35); base = mix(P.v, P.warm, 0.2); rim = mix(P.warm, WHITE, 0.7);
    } else {
      var INK = [27, 34, 48]; top = mix(P.a, [0, 0, 0], 0.12); mid = mix(P.a, INK, 0.5); low = mix(P.v, INK, 0.35); base = mix(P.v, INK, 0.2); rim = mix(P.a, [0, 0, 0], 0.1);
    }
    var g = lc.createLinearGradient(0, A.minY, 0, H);
    g.addColorStop(0, rgba(top, 1)); g.addColorStop(0.14, rgba(top, 1)); g.addColorStop(0.4, rgba(mid, 1)); g.addColorStop(0.72, rgba(low, 1)); g.addColorStop(1, rgba(base, 1));
    lc.lineJoin = 'round'; lc.lineCap = 'round';
    for (var k = 0; k < A.rows.length; k++) {
      var R = A.rows[k];
      lc.globalCompositeOperation = 'destination-out';
      lc.globalAlpha = 1;
      lc.fill(new Path2D(R.d + 'L' + (w + 8) + ' ' + (H + 6) + 'L-8 ' + (H + 6) + 'Z'));
      lc.globalCompositeOperation = 'source-over';
      lc.strokeStyle = g;
      if (R.tick) { lc.globalAlpha = Math.min(1, R.op * 0.8); lc.lineWidth = 0.9; lc.lineCap = 'butt'; lc.stroke(new Path2D(R.tick)); lc.lineCap = 'round'; }
      var pth = new Path2D(R.d);
      lc.globalAlpha = Math.min(1, R.op * (dark ? 0.2 : 0.14)); lc.lineWidth = 6; lc.stroke(pth);
      lc.globalAlpha = Math.min(1, R.op * 0.3); lc.lineWidth = 3; lc.stroke(pth);
      lc.globalAlpha = 1; lc.lineWidth = 1.6; lc.stroke(pth);
      if (R.rose) { lc.globalAlpha = 0.95; lc.strokeStyle = rgba(rim, 1); lc.lineWidth = 2.4; lc.stroke(new Path2D(R.rose)); }
    }
    lc.globalAlpha = 1;
    bakeBeacon();
  }
  function bakeBeacon() {
    if (!A) return;
    var d = dpr, r = radius() * 0.62;
    beacon.width = lit.width; beacon.height = lit.height;
    bc.setTransform(1, 0, 0, 1, 0, 0);
    bc.globalCompositeOperation = 'source-over';
    bc.clearRect(0, 0, beacon.width, beacon.height);
    bc.drawImage(lit, 0, 0);
    bc.globalCompositeOperation = 'destination-in';
    bc.globalAlpha = 0.85;
    bc.drawImage(poolMask, (A.summit.x - r) * d, (A.summit.y - r) * d, 2 * r * d, 2 * r * d);
    bc.globalAlpha = 1;
    bc.globalCompositeOperation = 'source-over';
    // glow around the summit (static, belongs to the beacon)
    bc.globalAlpha = 0.3;
    bc.drawImage(litGlow, (A.summit.x - r) * d, (A.summit.y - r) * d, 2 * r * d, 2 * r * d);
    bc.globalAlpha = 1;
    var s = Math.ceil((2 * radius() + 4) * d);
    scratch.width = s; scratch.height = s;
  }

  function attachCanvas() {
    if (!art || !A) return;
    shown = art.querySelector('canvas.lit');
    if (!shown) {
      shown = document.createElement('canvas');
      shown.className = 'lit'; shown.setAttribute('aria-hidden', 'true');
      art.appendChild(shown);
    }
    shown.width = Math.round(A.w * dpr); shown.height = Math.round(A.H * dpr);
    sh = shown.getContext('2d');
    sh.setTransform(dpr, 0, 0, dpr, 0, 0);
    prevBox = null;
  }

  function buildHike() {
    if (!art || !A || hero.classList.contains('compact')) return;
    var old = art.querySelector('svg.hike');
    if (old) art.removeChild(old);
    var hint = document.querySelector('.lamp-hint');
    if (!hint || !hint.offsetParent) hint = document.querySelector('.hero-meta');
    if (!hint) return;
    var r = hint.getBoundingClientRect(), ar = art.getBoundingClientRect();
    var sx = r.left - ar.left + 3, sy = r.bottom - ar.top + 18, tx = A.summit.x, ty = A.summit.y + 6;
    if (ty - sy > -40 || window.innerWidth < 700) return;
    var N = 5, pts = [], i;
    for (i = 0; i <= N; i++) {
      var t = i / N;
      var x = sx + (tx - sx) * Math.pow(t, 0.9) + (i % 2 ? 1 : -1) * 40 * Math.sin(Math.PI * t) * (i === 0 || i === N ? 0 : 1);
      pts.push([x, sy + (ty - sy) * Math.pow(t, 2.3)]);
    }
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (i = 1; i < pts.length; i++) {
      var p0 = pts[i - 1], p1 = pts[i], my = (p0[1] + p1[1]) / 2;
      d += ' C' + p0[0].toFixed(1) + ' ' + my.toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + my.toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
    }
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hike'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    var p = document.createElementNS(NS, 'path'); p.setAttribute('class', 'hike-dots'); p.setAttribute('d', d);
    svg.appendChild(p);
    var pin = document.createElementNS(NS, 'path'); pin.setAttribute('class', 'hike-pin');
    pin.setAttribute('d', 'M' + (sx - 3.5) + ' ' + sy + ' l3.5 -3.5 l3.5 3.5 l-3.5 3.5z');
    svg.appendChild(pin);
    art.insertBefore(svg, shown || null);
  }

  function measureArt() {
    if (!art) return;
    var r = art.getBoundingClientRect();
    artLeft = r.left; artDocTop = r.top + window.scrollY;
    cacheWarm();
  }

  /* ---------- warm cast on labels ---------- */
  function cacheWarm() {
    var sel = '.spots b, main h2.h2, .tl-date strong, .work-row h3, .focus-item h3, .game h3, .interests h3';
    var list = [].slice.call(document.querySelectorAll(sel)), sy = window.scrollY;
    warmEls = list.map(function (el) {
      var r = el.getBoundingClientRect();
      el.setAttribute('data-warm', '');
      return { el: el, x: r.left + r.width / 2, y: r.top + sy + r.height / 2, hw: Math.min(r.width, 520) / 2, spot: !!el.closest('.spots') };
    });
    warmVals = warmEls.map(function () { return 0; });
  }
  function updateWarm(on) {
    var sy = window.scrollY, r = radius() * 1.55, i, W, k, dx, dy, d;
    for (i = 0; i < warmEls.length; i++) {
      W = warmEls[i]; k = 0;
      if (on) {
        // spots move with the hero; their cached y is document based so scroll-correct it the same way
        dx = Math.max(0, Math.abs(pos.x - W.x) - W.hw * 0.6); dy = pos.y - (W.y - sy);
        d = Math.sqrt(dx * dx + dy * dy);
        if (d < r) { k = 1 - d / r; k = k * k * (3 - 2 * k); k = Math.round(k * 8) / 8; }
      }
      if (k !== warmVals[i]) {
        warmVals[i] = k;
        W.el.style.setProperty('--warm', k.toFixed(2));
      }
    }
  }

  /* ---------- render ---------- */
  function clampBox(cx, cy, r) {
    var x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
    var x1 = Math.min(A.w, Math.ceil(cx + r)), y1 = Math.min(A.H, Math.ceil(cy + r));
    if (x1 <= x0 || y1 <= y0) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function union(a, b) {
    if (!a) return b; if (!b) return a;
    var x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), x1 = Math.max(a.x + a.w, b.x + b.w), y1 = Math.max(a.y + a.h, b.y + b.h);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function renderLit() {
    if (!A || !sh || !beacon.width) return;
    var r = radius(), d = dpr;
    var cx = pos.x - artLeft, cy = pos.y - (artDocTop - window.scrollY);
    var B = heroVisible ? clampBox(cx, cy, r) : null;
    var U = union(prevBox, B);
    if (U) {
      sh.clearRect(U.x, U.y, U.w, U.h);
      sh.drawImage(beacon, U.x * d, U.y * d, U.w * d, U.h * d, U.x, U.y, U.w, U.h);
    }
    if (B) {
      var bw = Math.round(B.w * d), bh = Math.round(B.h * d);
      sc.setTransform(1, 0, 0, 1, 0, 0);
      sc.globalCompositeOperation = 'source-over';
      sc.clearRect(0, 0, scratch.width, scratch.height);
      sc.drawImage(lit, B.x * d, B.y * d, bw, bh, 0, 0, bw, bh);
      sc.globalCompositeOperation = 'destination-in';
      sc.drawImage(poolMask, (cx - r - B.x) * d, (cy - r - B.y) * d, 2 * r * d, 2 * r * d);
      sh.drawImage(scratch, 0, 0, bw, bh, B.x, B.y, B.w, B.h);
    }
    prevBox = B;
  }
  function renderGlow(on) {
    if (prevGlow) { lctx.clearRect(prevGlow.x, prevGlow.y, prevGlow.s, prevGlow.s); prevGlow = null; }
    if (!on) return;
    var s = radius() * 2.2, x = pos.x - s / 2, y = pos.y - s / 2;
    lctx.drawImage(glowSprite, x, y, s, s);
    prevGlow = { x: Math.floor(x) - 1, y: Math.floor(y) - 1, s: Math.ceil(s) + 2 };
  }
  function summitView() {
    return A ? { x: artLeft + A.summit.x, y: artDocTop - window.scrollY + A.summit.y } : { x: VW * 0.7, y: VH * 0.6 };
  }
  function target() {
    if (!follows() || !havePointer || !pointerIn) return summitView();
    return pos.target || summitView();
  }
  function ease() { var lag = num('lag', 55) / 100, cal = root.dataset.motion === 'calm' ? 0.7 : 1; return (0.34 - 0.31 * lag) * cal; }

  function frame(ts) {
    var dt = last ? Math.min(ts - last, 48) : 16; last = ts;
    var tg = target();
    var k = 1 - Math.pow(1 - ease(), dt / 16.67);
    pos.x += (tg.x - pos.x) * k; pos.y += (tg.y - pos.y) * k;
    var moving = Math.abs(tg.x - pos.x) + Math.abs(tg.y - pos.y) > 0.6;
    if (!moving) { pos.x = tg.x; pos.y = tg.y; intro = false; }
    renderLit();
    var live = follows() && havePointer && pointerIn;
    renderGlow(live);
    updateWarm(live);
    if (moving && !document.hidden) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }

  /* ---------- pointer + scroll ---------- */
  var hint = document.querySelector('.lamp-hint');
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    if (!follows()) return;
    havePointer = true; pointerIn = true;
    pos.target = { x: e.clientX, y: e.clientY };
    if (intro) { intro = false; }
    if (hint && !hint.classList.contains('gone')) hint.classList.add('gone');
    kick();
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { pointerIn = false; kick(); });
  document.documentElement.addEventListener('mouseenter', function () { pointerIn = true; });
  var sticking = false;
  window.addEventListener('scroll', function () {
    if (sticking) return; sticking = true;
    requestAnimationFrame(function () { sticking = false; if (!running) { renderLit(); } });
  }, { passive: true });
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; if (heroVisible) kick(); else renderLit(); }).observe(hero);
  }

  /* ---------- lifecycle ---------- */
  function setup() {
    A = window.__rmArt;
    if (!A) return;
    attachCanvas(); measureArt(); buildHike(); bakeLit();
    if (!havePointer || !follows()) {
      // intro: the light walks up from the foot of the range to the summit
      var s = summitView();
      pos.x = s.x; pos.y = s.y; intro = false;
    }
    renderLit();
    if (!still()) kick();
  }
  function relayout() {
    resizeCanvases(); measureArt(); buildHike();
    if (A && shown) { shown.width = Math.round(A.w * dpr); shown.height = Math.round(A.H * dpr); sh = shown.getContext('2d'); sh.setTransform(dpr, 0, 0, dpr, 0, 0); prevBox = null; bakeLit(); }
    if (!follows() || !havePointer) { var s = summitView(); pos.x = s.x; pos.y = s.y; }
    renderLit();
  }
  document.addEventListener('rm:artbuilt', setup);
  var rt, tt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 200); });
  document.addEventListener('rm:themechange', function () { setTimeout(function () { bakeLit(); prevBox = null; renderLit(); }, 30); });
  document.addEventListener('rm:tune', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    clearTimeout(tt);
    tt = setTimeout(function () {
      measureArt(); bakeLit(); prevBox = null;
      if (!follows()) { havePointer = false; var s = summitView(); pos.x = s.x; pos.y = s.y; renderGlow(false); updateWarm(false); }
      renderLit(); fliesSync();
      if (follows() && havePointer) kick();
    }, 120);
  });
  resizeCanvases();
  if (window.__rmArt) setup();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureArt(); relayout(); });
  window.addEventListener('load', function () { measureArt(); });

  /* ---------- fireflies (cursor mode) ---------- */
  var fly = null, fctx = null, flies = [], fRun = false, fLast = 0, fMove = 0, fAlpha = 0, fPtr = { x: 0, y: 0 };
  var FLY_N = 8, flySprites = null;
  function ensureFly() {
    if (fly) return;
    fly = document.createElement('canvas'); fly.id = 'fly'; fly.setAttribute('aria-hidden', 'true');
    document.body.appendChild(fly);
    fctx = fly.getContext('2d');
    sizeFly();
    window.addEventListener('resize', sizeFly);
  }
  function sizeFly() { if (!fly) return; fly.width = Math.round(window.innerWidth * dpr); fly.height = Math.round(window.innerHeight * dpr); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function bakeFlies() {
    var p = palette();
    flySprites = [p.warm, mix(p.warm, WHITE, 0.45), mix(p.c, WHITE, 0.4)].map(function (c) {
      return radial(32, [[0, 'rgba(255,255,255,0.95)'], [0.18, rgba(mix(c, WHITE, 0.5), 0.9)], [0.45, rgba(c, 0.28)], [1, rgba(c, 0)]]);
    });
  }
  function spawn() {
    flies = [];
    for (var i = 0; i < FLY_N; i++) {
      flies.push({ x: fPtr.x, y: fPtr.y, vx: 0, vy: 0, ph: Math.random() * 6.28, rad: 26 + Math.random() * 78, sp: 0.5 + Math.random() * 0.9, tw: Math.random() * 6.28, sz: 9 + Math.random() * 9, sp2: i % 3 });
    }
  }
  function flyFrame(ts) {
    var dt = fLast ? Math.min(ts - fLast, 48) : 16; fLast = ts;
    var t = ts / 1000, idle = ts - fMove, i, f;
    fAlpha += ((idle < 2400 ? 1 : 0) - fAlpha) * (1 - Math.pow(0.9, dt / 16.67));
    fctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (i = 0; i < flies.length; i++) {
      f = flies[i];
      var tx = fPtr.x + Math.cos(t * f.sp + f.ph) * f.rad, ty = fPtr.y + Math.sin(t * f.sp * 1.3 + f.ph) * f.rad * 0.7 - 6;
      f.vx += (tx - f.x) * 0.0032 * dt; f.vy += (ty - f.y) * 0.0032 * dt;
      f.vx *= 0.93; f.vy *= 0.93;
      f.x += f.vx * dt * 0.06 * 16; f.y += f.vy * dt * 0.06 * 16;
      var a = fAlpha * (0.55 + 0.45 * Math.sin(t * 2.4 + f.tw));
      if (a > 0.01) { fctx.globalAlpha = a; fctx.drawImage(flySprites[f.sp2], f.x - f.sz, f.y - f.sz, f.sz * 2, f.sz * 2); }
    }
    fctx.globalAlpha = 1;
    if (fAlpha > 0.02 && !document.hidden) requestAnimationFrame(flyFrame);
    else { fctx.clearRect(0, 0, window.innerWidth, window.innerHeight); fRun = false; fLast = 0; fAlpha = 0; }
  }
  window.addEventListener('pointermove', function (e) {
    if (mode() !== 'fireflies' || still()) return;
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    ensureFly();
    fPtr.x = e.clientX; fPtr.y = e.clientY; fMove = performance.now();
    if (!flySprites) bakeFlies();
    if (!fRun) { if (!flies.length || fAlpha < 0.02) spawn(); fRun = true; fAlpha = Math.max(fAlpha, 0.001); requestAnimationFrame(flyFrame); }
  }, { passive: true });
  function fliesSync() {
    flySprites = null;
    if (mode() !== 'fireflies' && fctx) { fctx.clearRect(0, 0, window.innerWidth, window.innerHeight); fAlpha = 0; }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { fAlpha = 0; } });
  window.RMLantern = { sync: function () { document.dispatchEvent(new CustomEvent('rm:tune', { detail: { changed: ['sync'] } })); } };
})();
