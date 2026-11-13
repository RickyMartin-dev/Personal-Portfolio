/* Elevation: a city drawn as an architect's elevation, three depth rows, floors that light on scroll.
   Performance model: towers are generated once per size, lines are drawn once (plus a short intro),
   lit bays are redrawn only when the count of lit floors actually changes, rows move by transform only. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero');
  if (!hero) return;
  var compact = hero.classList.contains('compact');
  var $ = function (id) { return document.getElementById(id); };
  var cvVeil1 = $('veil1'), cvStars = $('stars'), cvFx = $('fx');
  var fx = cvFx.getContext('2d');
  var rows = [0, 1, 2].map(function (i) {
    var el = hero.querySelector('.row.r' + i);
    return el ? { el: el, ln: el.querySelector('canvas.ln'), lc: document.createElement('canvas'), towers: [], style: null, ext: 0, cH: 0, bands: [] } : null;
  });
  if (rows.some(function (r) { return !r; })) return;
  rows.forEach(function (r) { r.g = r.lc.getContext('2d'); r.lg = r.ln.getContext('2d'); });

  var NS_SEED = 7;
  var K = [0.2, 0.1, 0];          /* scroll rise rates: far rows rise faster, uncovering more of themselves */
  var MK = [4, 9, 16];            /* mouse lateral parallax (px) */
  var W = 0, H = 0, Hs = 0, Wc = 0, PAD = 24, dpr = 1, fdpr = 1;
  var dark = true, sk = null;
  var introT0 = 0, introDone = reduce, introLit = reduce ? 1 : 0;
  var sy = 0, mx = 0, mtx = 0, lastApplied = -1e9, stuck = false;
  var heroVis = true, glow = null;
  var fxH = 0, twk = [], shoot = null, meteor = null, nextShoot = 0, fxRun = false, lastFx = 0;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function hex(s) {
    s = (s || '').trim();
    if (s.charAt(0) !== '#') return [18, 19, 31];
    if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)];
  }
  function mix(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }
  function css(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a === undefined ? 1 : a) + ')'; }

  /* ---------- theme-dependent drawing styles ---------- */
  function readTheme() {
    dark = root.dataset.theme !== 'light';
    var cs = getComputedStyle(root);
    sk = [hex(cs.getPropertyValue('--sky-0')), hex(cs.getPropertyValue('--sky-1')), hex(cs.getPropertyValue('--sky-2')), hex(cs.getPropertyValue('--ground'))];
  }
  function skyAt(t) {
    if (t <= 0.4) return mix(sk[0], sk[1], t / 0.4);
    if (t <= 0.72) return mix(sk[1], sk[2], (t - 0.4) / 0.32);
    return mix(sk[2], sk[3], clamp01((t - 0.72) / 0.28));
  }
  var TINT_M = [0.38, 0.5, 0.62];
  function buildStyles() {
    rows.forEach(function (r, ri) {
      var g = r.g, cH = r.cH, st = {};
      var tint = dark ? [7, 8, 20] : [255, 255, 255];
      var m = dark ? TINT_M[ri] : [0.42, 0.55, 0.7][ri];
      var fg = g.createLinearGradient(0, 0, 0, cH);
      for (var k = 0; k <= 8; k++) {
        var y = (cH * k) / 8, t = (H - Hs + y) / H;
        var c = mix(skyAt(Math.min(1, t)), tint, m * (1 - smooth(0.62, 1, t)));
        fg.addColorStop(k / 8, css(c, 1));
      }
      st.fill = fg;
      if (dark) {
        if (ri === 0) { st.stroke = 'rgba(150,120,245,0.58)'; st.lw = 1; }
        else if (ri === 1) { st.stroke = 'rgba(112,178,255,0.7)'; st.lw = 1; }
        else {
          var sg = g.createLinearGradient(0, Hs * 0.04, 0, Hs * 1.0);
          sg.addColorStop(0, 'rgba(120,214,255,1)'); sg.addColorStop(0.5, 'rgba(140,160,255,0.92)'); sg.addColorStop(1, 'rgba(159,123,255,0.55)');
          st.stroke = sg; st.lw = 1.15;
        }
        st.detail = ri === 2 ? st.stroke : st.stroke;
        st.detA = [0.14, 0.16, 0.2][ri];
        st.hatch = [150, 150, 218];
        st.pen = 'rgba(255,214,160,0.9)';
        st.lit = [[255, 190, 112], [232, 244, 255]];
        st.tip = 'rgba(255,181,98,1)';
      } else {
        if (ri === 0) { st.stroke = 'rgba(62,70,120,0.6)'; st.lw = 1; }
        else if (ri === 1) { st.stroke = 'rgba(48,56,128,0.78)'; st.lw = 1; }
        else {
          var sl = g.createLinearGradient(0, Hs * 0.04, 0, Hs * 1.0);
          sl.addColorStop(0, 'rgba(70,52,210,1)'); sl.addColorStop(0.55, 'rgba(40,46,118,1)'); sl.addColorStop(1, 'rgba(30,38,80,0.7)');
          st.stroke = sl; st.lw = 1.15;
        }
        st.detail = st.stroke;
        st.detA = [0.2, 0.2, 0.22][ri];
        st.hatch = [90, 100, 170];
        st.pen = 'rgba(200,100,10,0.9)';
        st.lit = [[246, 168, 70], [255, 236, 200]];
        st.tip = 'rgba(214,118,14,1)';
      }
      r.style = st;
    });
    glow = document.createElement('canvas'); glow.width = glow.height = 64;
    var gg = glow.getContext('2d'), rg = gg.createRadialGradient(32, 32, 0, 32, 32, 32), lc = rows[2].style.lit[0];
    rg.addColorStop(0, css(lc, dark ? 0.55 : 0.4)); rg.addColorStop(0.45, css(lc, dark ? 0.16 : 0.12)); rg.addColorStop(1, css(lc, 0));
    gg.fillStyle = rg; gg.fillRect(0, 0, 64, 64);
  }

  /* ---------- generation ---------- */
  var CFG = [
    { wMin: 24, wMax: 44, ov0: 1.03, ov1: 1.4, hMin: 0.3, hMax: 0.68, hs: 0.8, base: 0.7, fh: 3.4, cw: 3.4, mg: 0.5, mull: 0 },
    { wMin: 40, wMax: 72, ov0: 1.03, ov1: 1.35, hMin: 0.34, hMax: 0.9, hs: 0.92, base: 0.82, fh: 4.8, cw: 4.6, mg: 0.7, mull: 0 },
    { wMin: 60, wMax: 104, ov0: 1.03, ov1: 1.3, hMin: 0.28, hMax: 0.84, hs: 1.0, base: 0.93, fh: 6.6, cw: 6.4, mg: 1, mull: 1 }
  ];
  var CROWNS = ['flat', 'step', 'slant', 'spire', 'antenna', 'step', 'spire'];
  var LITO = [0, 0.07, 0.14];

  function genRow(ri) {
    var c = CFG[ri], r = rows[ri], rnd = rng(100 + ri * 37 + (Wc < 700 ? 5 : 0));
    var narrow = Wc < 700, sc = Math.max(0.62, Math.min(1.25, Wc / 1440)), base = Hs * c.base, cH = r.cH;
    var fh = c.fh * Math.max(0.82, sc), cw = c.cw * Math.max(0.82, sc);
    var list = [], x = -c.wMax * sc * 0.4;
    while (x < Wc + 30) {
      var w = lerp(c.wMin, c.wMax, rnd()) * sc, cx = x + w / 2, u = cx / Wc;
      var prof = narrow ? 0.64 + 0.36 * Math.exp(-Math.pow((u - 0.62) / 0.38, 2)) : 0.46 + 0.54 * Math.exp(-Math.pow((u - 0.74) / 0.22, 2));
      var hf = lerp(c.hMin, c.hMax, Math.pow(rnd(), 0.8)) * prof;
      var Ht = Math.max(Hs * 0.12, hf * Hs * c.hs);
      if (narrow) Ht = Math.min(Ht * 0.78, base - 125 + ri * 8);
      var nt = Ht > Hs * 0.45 ? (rnd() < 0.6 ? 3 : 2) : (rnd() < 0.5 ? 2 : 1);
      var fr = nt === 1 ? [1] : nt === 2 ? [0.62, 1] : [0.45, 0.78, 1];
      var wf = [1, 0.78, 0.56];
      var tiers = [], yb = base, off = (rnd() - 0.5) * w * 0.08;
      for (var k = 0; k < nt; k++) {
        var tw = w * wf[k], tcx = cx + (k ? off * k : 0);
        var yt = base - Ht * fr[k];
        tiers.push({ x0: tcx - tw / 2, x1: tcx + tw / 2, yb: yb, yt: yt });
        yb = yt;
      }
      var top = tiers[nt - 1], tw2 = top.x1 - top.x0, tcx2 = (top.x0 + top.x1) / 2, ty = top.yt;
      var crown = CROWNS[Math.floor(rnd() * CROWNS.length)];
      if (ri === 2 && Ht > Hs * 0.6 && rnd() < 0.7) crown = 'spire';
      if (ri === 0 && crown === 'spire') crown = 'step';
      var pts = [[tiers[0].x0, cH]], q;
      for (q = 0; q < nt; q++) {
        pts.push([tiers[q].x0, tiers[q].yb]); pts.push([tiers[q].x0, tiers[q].yt]);
        if (q < nt - 1) pts.push([tiers[q + 1].x0, tiers[q].yt]);
      }
      var needle = null, crownY = ty, a = tw2 * 0.2, cap = Math.max(3, Ht * 0.03), L = tiers[0].x0, R = tiers[0].x1;
      var x0 = top.x0, x1 = top.x1;
      if (crown === 'step') { pts.push([x0 + a, ty], [x0 + a, ty - cap], [x1 - a, ty - cap], [x1 - a, ty]); crownY = ty - cap; }
      else if (crown === 'slant') { var sl = Math.min(tw2 * 0.5, Ht * 0.12), dir = rnd() < 0.5; pts.push(dir ? [x0, ty + sl] : [x0, ty]); pts.push(dir ? [x1, ty] : [x1, ty + sl]); crownY = ty; }
      else if (crown === 'spire') {
        var ph = Math.min(Ht * 0.16, tw2 * 1.1) + 6, nd = Math.min(Ht * 0.14, 46) + 8;
        pts.push([x0 + tw2 * 0.1, ty - ph * 0.3], [tcx2 - 1.5, ty - ph], [tcx2 + 1.5, ty - ph], [x1 - tw2 * 0.1, ty - ph * 0.3]);
        needle = { x: tcx2, y0: ty - ph, y1: ty - ph - nd }; crownY = needle.y1;
      } else if (crown === 'antenna') { var nd2 = Math.min(Ht * 0.12, 40) + 6; needle = { x: tcx2, y0: ty, y1: ty - nd2 }; crownY = needle.y1; }
      pts.push([x1, ty]);
      for (q = nt - 1; q >= 0; q--) {
        if (q < nt - 1) pts.push([tiers[q + 1].x1, tiers[q].yt]);
        pts.push([tiers[q].x1, tiers[q].yt]); pts.push([tiers[q].x1, tiers[q].yb]);
      }
      pts.push([tiers[0].x1, cH]);
      /* lit bays, bottom floor first */
      var bays = [], fidx = 0;
      for (q = 0; q < nt; q++) {
        var t = tiers[q], tw3 = t.x1 - t.x0, cols = Math.max(1, Math.floor((tw3 - 2) / cw)), bw = tw3 / cols, nf = Math.max(0, Math.floor((t.yb - t.yt) / fh));
        t.cols = cols; t.bw = bw; t.nf = nf;
        var runLeft = 0, runOn = rnd() < 0.5;
        for (var f = 0; f < nf; f++, fidx++) {
          if (runLeft <= 0) { runOn = !runOn; runLeft = 2 + Math.floor(rnd() * 5); }
          runLeft--;
          var fl = runOn ? 0.93 : 0.03, by = t.yb - (f + 1) * fh;
          for (var cc = 0; cc < cols; cc++) {
            if (rnd() < fl) bays.push({ x: t.x0 + cc * bw + c.mg, y: by + c.mg, w: bw - 2 * c.mg, h: fh - 2 * c.mg, c: rnd() < 0.04 ? 1 : 0 });
          }
        }
      }
      list.push({ cx: cx, l: Math.min(L, x0) - 2, rr: Math.max(R, x1) + 2, w: w, tiers: tiers, pts: pts, needle: needle, crownY: Math.max(crownY, -10), top: crownY, bays: bays, fh: fh, delay: 0, start: 0, dur: 0.36, p: 0, n: 0, base: base });
      x += w * lerp(c.ov0, c.ov1, rnd());
    }
    /* order of lighting and intro stagger */
    var N = list.length, ord = list.map(function (_, i) { return i; });
    for (var i = N - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), tmp = ord[i]; ord[i] = ord[j]; ord[j] = tmp; }
    list.forEach(function (t, i) { t.start = LITO[ri] + (ord[i] / Math.max(1, N)) * 0.5; t.delay = ri * 130 + (t.cx / Wc) * 480 + rnd() * 140; });
    /* fog hatch bands */
    var bandsAt = ri === 0 ? [0.6] : ri === 1 ? [0.72, 0.5] : [0.84], hr = rng(900 + ri * 11), segs = [];
    var step = Math.max(2.6, 3 * Math.max(0.85, sc));
    bandsAt.forEach(function (bc, bi) {
      var half = Hs * (bi ? 0.05 : 0.075), yy;
      for (yy = bc * Hs - half; yy <= bc * Hs + half; yy += step) {
        var prof2 = Math.pow(1 - Math.abs((yy - bc * Hs) / half), 1.4), xx = -20;
        while (xx < Wc) {
          var len = 50 + hr() * 190, gap = 8 + hr() * 60;
          segs.push([xx, yy, xx + len, prof2 * (0.35 + 0.65 * hr())]);
          xx += len + gap;
        }
      }
    });
    r.bands = segs;
    r.towers = list;
  }

  /* ---------- drawing ---------- */
  function drawTower(g, t, st, rev, ri) {
    var c = CFG[ri];
    var yFrom = Hs * 1.02, yTo = t.top - 16, cy = lerp(yFrom, yTo, rev);
    g.save();
    g.beginPath(); g.rect(t.l - 6, cy, t.rr - t.l + 12, r_cH(ri) - cy); g.clip();
    g.beginPath();
    for (var i = 0; i < t.pts.length; i++) { if (i) g.lineTo(t.pts[i][0], t.pts[i][1]); else g.moveTo(t.pts[i][0], t.pts[i][1]); }
    g.closePath();
    g.fillStyle = st.fill; g.fill();
    g.beginPath();
    for (i = 0; i < t.pts.length; i++) { if (i) g.lineTo(t.pts[i][0], t.pts[i][1]); else g.moveTo(t.pts[i][0], t.pts[i][1]); }
    g.strokeStyle = st.stroke; g.lineWidth = st.lw; g.lineJoin = 'miter'; g.stroke();
    /* floors, mullions, fine inner frame */
    var fl = new Path2D(), fs = new Path2D(), mu = new Path2D(), k, f, cc;
    for (k = 0; k < t.tiers.length; k++) {
      var T = t.tiers[k];
      for (f = 1; f < T.nf; f++) {
        var y = T.yb - f * t.fh;
        if (f % 5 === 0) { fs.moveTo(T.x0, y); fs.lineTo(T.x1, y); } else { fl.moveTo(T.x0 + 2, y); fl.lineTo(T.x1 - 2, y); }
      }
      if (c.mull && T.nf > 2) for (cc = 1; cc < T.cols; cc++) { var mxx = T.x0 + cc * T.bw; mu.moveTo(mxx, T.yb); mu.lineTo(mxx, T.yt + 1); }
      if (ri === 2) { fs.moveTo(T.x0 + 3, T.yb); fs.lineTo(T.x0 + 3, T.yt); fs.moveTo(T.x1 - 3, T.yb); fs.lineTo(T.x1 - 3, T.yt); }
    }
    g.strokeStyle = st.detail; g.lineWidth = 1;
    g.globalAlpha = st.detA * 0.8; g.stroke(fl);
    g.globalAlpha = st.detA * 1.7; g.stroke(fs);
    g.globalAlpha = st.detA * 0.5; g.stroke(mu);
    g.globalAlpha = 1;
    if (t.needle) {
      var nn = t.needle;
      g.beginPath(); g.moveTo(nn.x, nn.y0); g.lineTo(nn.x, nn.y1); g.strokeStyle = st.stroke; g.lineWidth = 1; g.stroke();
      if (ri > 0) { g.fillStyle = st.tip; g.beginPath(); g.moveTo(nn.x, nn.y1 - 3.5); g.lineTo(nn.x + 2.4, nn.y1); g.lineTo(nn.x, nn.y1 + 3.5); g.lineTo(nn.x - 2.4, nn.y1); g.closePath(); g.fill(); }
    }
    g.restore();
    /* pen line at the drawing front */
    if (rev > 0.02 && rev < 0.98) {
      for (k = 0; k < t.tiers.length; k++) {
        var T2 = t.tiers[k];
        if (cy >= T2.yt && cy <= T2.yb) {
          var pg = g.createLinearGradient(T2.x0, 0, T2.x1, 0);
          pg.addColorStop(0, 'rgba(255,255,255,0)'); pg.addColorStop(0.5, st.pen); pg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = pg; g.fillRect(T2.x0 - 2, cy - 0.5, T2.x1 - T2.x0 + 4, 1.2);
          break;
        }
      }
    }
  }
  function r_cH(ri) { return rows[ri].cH; }

  function drawLines(ri, now) {
    var r = rows[ri], g = r.g, st = r.style;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, Wc, r.cH);
    var it = introDone ? 1e9 : now - introT0, avg = 0, i;
    for (i = 0; i < r.towers.length; i++) {
      var t = r.towers[i], rev = introDone ? 1 : easeOut(clamp01((it - t.delay) / 1050));
      avg += rev;
      if (rev <= 0) continue;
      drawTower(g, t, st, rev, ri);
    }
    avg /= Math.max(1, r.towers.length);
    /* fog hatching, fine horizontal strokes */
    var h = st.hatch, ba = (dark ? 0.2 : 0.2) * (ri === 2 ? 1.1 : 1) * smooth(0.5, 1, avg);
    if (ba > 0.005) {
      g.lineWidth = 1;
      var buckets = [0.25, 0.5, 0.75, 1];
      for (var b = 0; b < buckets.length; b++) {
        g.beginPath();
        for (i = 0; i < r.bands.length; i++) {
          var s = r.bands[i], bi = s[3] > 0.75 ? 3 : s[3] > 0.5 ? 2 : s[3] > 0.25 ? 1 : 0;
          if (bi !== b) continue;
          g.moveTo(s[0], s[1] + 0.5); g.lineTo(s[2], s[1] + 0.5);
        }
        g.strokeStyle = css(h, ba * buckets[b]); g.stroke();
      }
    }
    drawLit(ri);
  }

  var litSig = [-1, -1, -1];
  function litState(ri, S, force) {
    var r = rows[ri], sum = 0, i;
    for (i = 0; i < r.towers.length; i++) {
      var t = r.towers[i], p = clamp01((S - t.start) / t.dur);
      t.p = p; t.n = Math.floor(p * t.bays.length); sum += t.n;
    }
    if (!force && sum === litSig[ri]) return;
    litSig[ri] = sum;
    drawLit(ri);
  }
  function drawLit(ri) {
    var r = rows[ri], g = r.lg, st = r.style, paths = [new Path2D(), new Path2D()], any = false, i, j;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, Wc, r.cH);
    g.drawImage(r.lc, 0, 0, Wc, r.cH);
    for (i = 0; i < r.towers.length; i++) {
      var t = r.towers[i];
      if (t.n < 1) continue;
      any = true;
      for (j = 0; j < t.n; j++) { var b = t.bays[j]; paths[b.c].rect(b.x, b.y, b.w, b.h); }
    }
    if (!any) return;
    var ga = (ri === 2 ? 0.95 : ri === 1 ? 0.8 : 0.6) * (dark ? 1 : 0.42);
    g.globalAlpha = ga;
    for (j = 0; j < 2; j++) { g.fillStyle = css(st.lit[j], 1); g.fill(paths[j]); }
    g.globalAlpha = 1;
    for (i = 0; i < r.towers.length; i++) {
      var t2 = r.towers[i];
      if (t2.n < 1) continue;
      var fb = t2.bays[t2.n - 1], gw = (t2.rr - t2.l) * 1.7, fa = (ri === 2 ? 0.7 : 0.5) * (t2.p < 1 ? 1 : 0.5) * (dark ? 1 : 0.5);
      g.globalAlpha = fa; g.drawImage(glow, (t2.l + t2.rr) / 2 - gw / 2, fb.y - gw * 0.5, gw, gw);
      if (t2.p < 1 && ri > 0) {
        g.globalAlpha = 0.55; g.fillStyle = css(st.lit[0], 1);
        g.fillRect(t2.l + 2, fb.y + fb.h, t2.rr - t2.l - 4, 0.8);
      }
    }
    g.globalAlpha = 1;
  }
  function currentS() {
    if (reduce) return 0.5;
    return 0.4 * introLit + (sy / Math.max(1, H)) * 1.2;
  }
  function drawAllStatic(now) {
    for (var i = 0; i < 3; i++) drawLines(i, now);
    var S = currentS();
    for (i = 0; i < 3; i++) litState(i, S, true);
  }

  /* ---------- sky: static layers + a few moving things ---------- */
  function makeSprite(rgb, peakA) {
    var c = document.createElement('canvas'); c.width = 2; c.height = 256;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(' + rgb + ',0)'); gr.addColorStop(0.55, 'rgba(' + rgb + ',' + (peakA * 0.45) + ')');
    gr.addColorStop(0.85, 'rgba(' + rgb + ',' + peakA + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    return c;
  }
  function paintVeil(cv, defs, phase) {
    var g = cv.getContext('2d'), vw = cv.width, vh = cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, vw, vh);
    g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    var step = 1;
    for (var r = 0; r < defs.length; r++) {
      var sp = makeSprite(defs[r][0], defs[r][1]);
      for (var x = 0; x < vw; x += step) {
        var u = x / vw, edge = clamp01(u * 3) * clamp01((1 - u) * 3), side = 0.25 + 0.75 * u;
        var y0 = vh * (0.1 + 0.08 * r) + Math.sin(x * 0.004 + phase + r * 2.1) * vh * 0.07 + Math.sin(x * 0.012 - phase * 0.7 + r) * vh * 0.025;
        var hh = vh * (0.28 + 0.07 * r) * (0.75 + 0.25 * Math.sin(x * 0.007 + phase * 0.8 + r * 1.7));
        var a = (0.55 + 0.45 * Math.sin(x * 0.0035 + phase * 1.4 + r * 3.1)) * edge * side;
        if (a < 0.03) continue;
        g.globalAlpha = a; g.drawImage(sp, x, y0, step, hh);
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function paintSky() {
    var sh = Math.round(H * 0.66), vw = Math.ceil(W / 2), vh = Math.ceil(sh / 2);
    cvVeil1.width = vw; cvVeil1.height = vh;
    var sc = compact ? 0.7 : 1;
    if (dark) paintVeil(cvVeil1, [['159,123,255', 0.5 * sc], ['93,199,255', 0.38 * sc], ['255,181,98', 0.16 * sc], ['93,199,255', 0.16 * sc]], 0.9);
    else paintVeil(cvVeil1, [['150,120,230', 0.22 * sc], ['255,170,150', 0.22 * sc], ['255,196,130', 0.22 * sc]], 0.9);
    var sdpr = Math.min(window.devicePixelRatio || 1, 1.25);
    cvStars.width = Math.round(W * sdpr); cvStars.height = Math.round(sh * sdpr);
    var g = cvStars.getContext('2d');
    g.setTransform(sdpr, 0, 0, sdpr, 0, 0); g.clearRect(0, 0, W, sh);
    var r = rng(NS_SEED), n = Math.min(190, Math.round((W * H) / 7500)), limit = 0.95;
    twk = [];
    for (var i = 0; i < n; i++) {
      var x = r() * W, y = Math.pow(r(), 0.9) * sh * limit, z = r(), s = 0.5 + r() * 0.9, tw = r() < 0.15;
      if (tw && twk.length < 26) { twk.push({ x: x, y: y, s: s * 1.5, p: r() * 6.28, f: 0.6 + r() * 1.4 }); continue; }
      if (!dark) continue;
      g.fillStyle = 'rgba(238,241,255,' + (z < 0.6 ? 0.32 : z < 0.9 ? 0.55 : 0.8) + ')';
      g.fillRect(x, y, s, s);
    }
  }

  function head(x, y, rgb, scale) {
    var g = fx.createRadialGradient(x, y, 0, x, y, 22 * scale);
    g.addColorStop(0, 'rgba(' + rgb + ',0.45)'); g.addColorStop(0.4, 'rgba(' + rgb + ',0.12)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    fx.fillStyle = g; fx.beginPath(); fx.arc(x, y, 22 * scale, 0, 6.283); fx.fill();
    fx.fillStyle = dark ? 'rgba(255,247,236,0.95)' : 'rgba(196,112,12,0.95)';
    fx.beginPath(); fx.arc(x, y, 2 * scale, 0, 6.283); fx.fill();
  }
  function streak(hx, hy, ang, len, a, w) {
    var tx2 = hx - Math.cos(ang) * len, ty2 = hy - Math.sin(ang) * len, g = fx.createLinearGradient(tx2, ty2, hx, hy);
    var tail = dark ? '159,123,255' : '120,90,220', tip = dark ? '255,200,130' : '196,112,12';
    g.addColorStop(0, 'rgba(' + tail + ',0)'); g.addColorStop(0.6, 'rgba(' + (dark ? '93,199,255' : '60,140,210') + ',' + (a * 0.5) + ')'); g.addColorStop(1, 'rgba(' + tip + ',' + a + ')');
    fx.strokeStyle = g; fx.lineWidth = w; fx.lineCap = 'round';
    fx.beginPath(); fx.moveTo(tx2, ty2); fx.lineTo(hx, hy); fx.stroke();
  }
  function updateShoot(now) {
    if (!shoot) {
      if (now >= nextShoot && !compact) {
        var ang = (26 + Math.random() * 14) * Math.PI / 180;
        shoot = { sx: W * (0.1 + Math.random() * 0.55), sy: H * (0.04 + Math.random() * 0.2), ang: ang, dist: W * 0.42, dur: 900 + Math.random() * 500, t0: now };
      } else if (compact && now >= nextShoot) nextShoot = now + 14000;
      return;
    }
    var p = (now - shoot.t0) / shoot.dur;
    if (p >= 1) { shoot = null; nextShoot = now + 8000 + Math.random() * 7000; return; }
    var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p;
    streak(hx, hy, shoot.ang, 130, 0.9 * Math.sin(p * Math.PI), 2);
    head(hx, hy, dark ? '255,200,130' : '196,112,12', 0.7);
  }
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg) return;
    var path = svg.querySelector('path'), rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-f3-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-f3-meteor', '1'); } catch (e) {}
    var cr = cvFx.getBoundingClientRect(), ex = rect.right - cr.left, ey = rect.top - cr.top + 4, dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left - cr.left, path: path, t0: performance.now(), d1: 800, d2: 1100 };
    kickFx();
  }
  function drawMeteor(now) {
    var m = meteor, el = now - m.t0, hx, hy, ta = 1, p1 = clamp01(el / m.d1), acc = Math.pow(p1, 1.5);
    if (el < m.d1) { hx = m.sx + (m.ex - m.sx) * acc; hy = m.sy + (m.ey - m.sy) * acc; m.path.style.strokeDashoffset = '1'; }
    else {
      var p2 = easeOutExpo(clamp01((el - m.d1) / m.d2));
      hx = m.ex - (m.ex - m.lx) * p2; hy = m.ey; m.path.style.strokeDashoffset = String(1 - p2);
      ta = 1 - clamp01((el - m.d1) / 600);
    }
    var ang = el < m.d1 ? Math.atan2(m.ey - m.sy, m.ex - m.sx) : Math.PI;
    var len = 260 * (el < m.d1 ? Math.min(1, acc * 3 + 0.1) : ta), ha = el > m.d1 + m.d2 ? 1 - clamp01((el - m.d1 - m.d2) / 400) : 1;
    if (len > 1) streak(hx, hy, el < m.d1 ? ang : 0, len, 0.95 * Math.max(ta, 0), 2.4);
    if (ha > 0) { fx.globalAlpha = ha; head(hx, hy, dark ? '255,200,130' : '196,112,12', 1); fx.globalAlpha = 1; }
    if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }
  function drawFx(now) {
    fx.setTransform(fdpr, 0, 0, fdpr, 0, 0);
    fx.clearRect(0, 0, W, fxH);
    if (dark) {
      var t = now / 1000;
      for (var i = 0; i < twk.length; i++) {
        var s = twk[i], a = 0.2 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.f + s.p));
        fx.fillStyle = 'rgba(238,241,255,' + a.toFixed(2) + ')'; fx.fillRect(s.x, s.y, s.s, s.s);
      }
    }
    if (!reduce) { updateShoot(now); if (meteor) drawMeteor(now); }
  }
  function fxLoop(now) {
    if (!heroVis || document.hidden) { fxRun = false; return; }
    var busy = shoot || meteor;
    if (busy || now - lastFx > 80) { lastFx = now; drawFx(now); }
    requestAnimationFrame(fxLoop);
  }
  function kickFx() { if (!fxRun && heroVis && !document.hidden && !reduce) { fxRun = true; requestAnimationFrame(fxLoop); } }

  /* ---------- intro (lines draw in), scroll, pointer ---------- */
  var introRun = false;
  function introLoop(now) {
    var it = now - introT0;
    if (it >= 2000 && !introDone) { introDone = true; }
    introLit = clamp01((it - 1050) / 950);
    var done = introDone;
    for (var i = 0; i < 3; i++) drawLines(i, now);
    var S = currentS();
    for (i = 0; i < 3; i++) litState(i, S, false);
    if (!done) requestAnimationFrame(introLoop); else { introRun = false; introLit = 1; }
  }
  function startIntro() {
    if (reduce) { introDone = true; introLit = 1; drawAllStatic(0); return; }
    introDone = false; introLit = 0; introT0 = performance.now(); introRun = true;
    requestAnimationFrame(introLoop);
  }
  function apply() {
    var ext = Math.min(sy, H + 200);
    for (var i = 0; i < 3; i++) {
      rows[i].el.style.transform = reduce ? '' : 'translate3d(' + (mx * MK[i]).toFixed(2) + 'px,' + (-ext * K[i] * (compact ? 0.7 : 1)).toFixed(1) + 'px,0)';
    }
    if (!introRun) { var S = currentS(); for (i = 0; i < 3; i++) litState(i, S, false); }
  }
  var ticking = false, hd = document.querySelector('.site-header');
  function onScroll() {
    ticking = false;
    sy = window.scrollY;
    var st = sy > 24;
    if (st !== stuck) { stuck = st; if (hd) hd.classList.toggle('is-stuck', st); }
    if (sy > H + 160 && lastApplied > H + 160) return;
    lastApplied = sy;
    apply();
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  var mRun = false;
  function mLoop() {
    mx += (mtx - mx) * 0.08;
    if (Math.abs(mtx - mx) < 0.002) { mx = mtx; mRun = false; apply(); return; }
    apply();
    requestAnimationFrame(mLoop);
  }
  if (!reduce && window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || sy > H) return;
      mtx = (e.clientX / window.innerWidth - 0.5) * 2;
      if (!mRun) { mRun = true; requestAnimationFrame(mLoop); }
    }, { passive: true });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { heroVis = en[0].isIntersecting; if (heroVis) kickFx(); }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kickFx(); });

  /* ---------- elevation callouts for the proof numbers ---------- */
  function placeCallouts() {
    var cbs = [].slice.call(hero.querySelectorAll('.cb'));
    if (!cbs.length) return;
    if (W < 640) { cbs.forEach(function (c) { c.style.cssText = ''; c.classList.add('ready'); }); return; }
    var row = rows[2].el, prev = row.style.transform; row.style.transform = 'none';
    var sY = window.scrollY, rr = row.getBoundingClientRect(), rowL = rr.left, rowT = rr.top + sY;
    var blocks = [].slice.call(hero.querySelectorAll('.hero-title-wrap, .hero-statement, .hero-support, .hero-actions > *, .hero-meta, .hero-copy h1, .hero-copy .grid > p')).map(function (e) {
      var b = e.getBoundingClientRect();
      if (e.classList.contains('hero-meta') || e.classList.contains('hero-statement') || e.classList.contains('hero-support')) { var rg = document.createRange(); rg.selectNodeContents(e); var rb = rg.getBoundingClientRect(); if (rb.width) b = rb; } return { l: b.left - 16, r: b.right + 16, t: b.top + sY - 14, b: b.bottom + sY + 14 };
    });
    var sizes = cbs.map(function (c) { var s = c.querySelector('span').getBoundingClientRect(); return { w: s.width + 14, h: s.height }; });
    var vw = window.innerWidth, towers = rows[2].towers.filter(function (t) { return t.cx > 120 && t.cx < Wc - 120 && t.crownY > -6; }).slice().sort(function (a, b) { return a.crownY - b.crownY; });
    var picks = [], used = [], Ls = [36, 46, 56, 78, 100, 124, 150, 180, 214, 250];
    function hit(a, b) { return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t; }
    /* highest skyline point under a horizontal span, across all rows, in page coordinates */
    function skyTop(l, r) {
      var m = 1e9;
      for (var ri = 0; ri < 3; ri++) rows[ri].towers.forEach(function (t) {
        var tl = rowL + t.l, tr = rowL + t.rr;
        if (tr <= l || tl >= r) return;
        for (var x = Math.max(l, tl); x <= Math.min(r, tr); x += 8) {
          var lx = x - rowL, top = t.tiers[t.tiers.length - 1], y = 1e9;
          for (var k = 0; k < t.tiers.length; k++) if (lx >= t.tiers[k].x0 && lx <= t.tiers[k].x1) y = Math.min(y, t.tiers[k].yt);
          if (Math.abs(lx - (top.x0 + top.x1) / 2) < (top.x1 - top.x0) * 0.4) y = Math.min(y, t.top + (t.needle ? 0 : 0));
          m = Math.min(m, rowT + y - K[ri] * 140);
        }
      });
      return m;
    }
    function tryPass(sep, minTop, loose) {
      towers.forEach(function (t) {
        if (picks.length >= cbs.length) return;
        for (var u = 0; u < used.length; u++) if (Math.abs(used[u] - t.cx) < Wc * sep) return;
        var size = sizes[picks.length];
        for (var li = 0; li < Ls.length; li++) {
          for (var side = 0; side < 2; side++) {
            var L = Ls[li], px = rowL + t.cx, py = rowT + t.crownY, bot = py - L + 14, top = bot - size.h;
            var rc = side ? { l: px - 14 - size.w, r: px - 14, t: top, b: bot } : { l: px + 14, r: px + 14 + size.w, t: top, b: bot };
            if (rc.l < 24 || rc.r > vw - 24 || rc.t < minTop) continue;
            if (!loose && skyTop(rc.l, rc.r) < rc.b + 18) continue;
            var bad = false, q;
            for (q = 0; q < blocks.length; q++) if (hit(rc, blocks[q])) { bad = true; break; }
            for (q = 0; q < picks.length && !bad; q++) if (hit(rc, { l: picks[q].rc.l - 10, r: picks[q].rc.r + 10, t: picks[q].rc.t - 8, b: picks[q].rc.b + 8 })) bad = true;
            if (!bad) { picks.push({ t: t, L: L, flip: !!side, rc: rc }); used.push(t.cx); return; }
          }
        }
      });
    }
    /* preferred: exhaustive search for the cleanest triple of strictly clear labels */
    if (cbs.length === 3) {
      var opts = [];
      towers.forEach(function (t) {
        for (var si = 0; si < 2; si++) {
          for (var li = 0; li < Ls.length; li++) {
            var L = Ls[li], size = sizes[0], px = rowL + t.cx, py = rowT + t.crownY, bot = py - L + 14, top = bot - size.h;
            var rc = si ? { l: px - 14 - size.w, r: px - 14, t: top, b: bot } : { l: px + 14, r: px + 14 + size.w, t: top, b: bot };
            if (rc.l < 24 || rc.r > vw - 24 || rc.t < 92 || skyTop(rc.l, rc.r) < rc.b + 10) continue;
            var bad = false;
            for (var q = 0; q < blocks.length; q++) if (hit(rc, blocks[q])) { bad = true; break; }
            if (!bad) { opts.push({ t: t, L: L, flip: !!si, rc: rc }); break; }
          }
        }
      });
      var best = null, bs = -1e9;
      for (var a1 = 0; a1 < opts.length; a1++) for (var b1 = a1 + 1; b1 < opts.length; b1++) for (var c1 = b1 + 1; c1 < opts.length; c1++) {
        var tr = [opts[a1], opts[b1], opts[c1]].sort(function (x, y) { return x.t.cx - y.t.cx; });
        var g1 = tr[1].t.cx - tr[0].t.cx, g2 = tr[2].t.cx - tr[1].t.cx;
        if (Math.min(g1, g2) < Wc * 0.1) continue;
        var ok = true;
        for (var u1 = 0; u1 < 3 && ok; u1++) for (var u2 = u1 + 1; u2 < 3; u2++) if (hit({ l: tr[u1].rc.l - 12, r: tr[u1].rc.r + 12, t: tr[u1].rc.t - 8, b: tr[u1].rc.b + 8 }, tr[u2].rc)) { ok = false; break; }
        if (!ok) continue;
        var sc2 = Math.min(g1, g2) - (tr[0].L + tr[1].L + tr[2].L) * 0.6;
        if (sc2 > bs) { bs = sc2; best = tr; }
      }
      if (best) best.forEach(function (o) { picks.push(o); used.push(o.t.cx); });
    }
    if (picks.length < cbs.length) { picks.length = 0; used.length = 0; }
    tryPass(0.17, 92); if (picks.length < cbs.length) tryPass(0.1, 80); if (picks.length < cbs.length) tryPass(0.06, 80); if (picks.length < cbs.length) tryPass(0.03, 76); if (picks.length < cbs.length) tryPass(0.03, 76, true);
    picks.sort(function (a, b) { return a.t.cx - b.t.cx; });
    cbs.forEach(function (c, i) {
      var p = picks[i];
      if (!p) { c.style.display = 'none'; return; }
      c.style.display = '';
      c.style.left = p.t.cx.toFixed(1) + 'px'; c.style.top = p.t.crownY.toFixed(1) + 'px';
      c.style.setProperty('--h', p.L + 'px'); c.style.setProperty('--tick', '12px');
      c.classList.toggle('flip', p.flip);
    });
    row.style.transform = prev;
    requestAnimationFrame(function () { cbs.forEach(function (c) { c.classList.add('ready'); }); });
  }

  /* ---------- sizing ---------- */
  var lastW = 0, lastH = 0;
  function build(first) {
    var hr = hero.getBoundingClientRect(), eh = hero.querySelector('.elev').clientHeight;
    W = Math.round(hr.width); H = Math.round(hr.height); Hs = eh;
    if (!W || !H) return;
    Wc = W + PAD * 2;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5, 2400 / Wc);
    fdpr = Math.min(window.devicePixelRatio || 1, 1.5);
    fxH = Math.round(H * 0.72); cvFx.width = Math.round(W * fdpr); cvFx.height = Math.round(fxH * fdpr);
    rows.forEach(function (r, ri) {
      r.ext = Math.ceil(K[ri] * H * (compact ? 0.7 : 1)) + 28;
      r.cH = Hs + r.ext;
      r.el.style.setProperty('--ext', r.ext + 'px');
      r.ln.width = Math.round(Wc * dpr); r.ln.height = Math.round(r.cH * dpr);
      r.lc.width = r.ln.width; r.lc.height = r.ln.height;
      litSig[ri] = -1;
    });
    readTheme();
    buildStyles();
    rows.forEach(function (r, ri) { genRow(ri); });
    paintSky();
    placeCallouts();
    lastW = W; lastH = H;
    sy = window.scrollY; apply();
    if (first) startIntro(); else { introDone = true; introLit = 1; drawAllStatic(0); }
    drawFx(performance.now());
  }
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = Math.round(hero.getBoundingClientRect().width);
      if (w === lastW && Math.abs(hero.offsetHeight - lastH) < 120) return;
      build(false);
    }, 160);
  });
  document.addEventListener('rm:themechange', function () {
    readTheme(); buildStyles(); paintSky();
    if (!introRun) drawAllStatic(0);
    drawFx(performance.now());
  });

  nextShoot = performance.now() + 3200;
  var started = false;
  function go() { if (started) return; started = true; build(true); kickFx(); onScroll(); if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1100); }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (!started) go(); else build(false); }, go);
    setTimeout(go, 700);
  } else go();
})();
