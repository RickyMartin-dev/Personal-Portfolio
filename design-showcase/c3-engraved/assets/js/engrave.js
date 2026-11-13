/* Engraved Dusk: painted ridge layers + etched contour hatching, rendered once into cached canvases.
   Runtime work: transforms on a handful of layers (scroll), CSS-only aurora/twinkle, and a tiny
   on-demand canvas for shooting stars. No filters, no blend modes, no per-frame gradients for scenery. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('.hero');
  var sky = hero && hero.querySelector('.hero-sky');
  var wrap = hero && hero.querySelector('.ridges');
  var fx = document.getElementById('fx');
  if (!hero || !sky || !wrap) return;
  var compact = hero.classList.contains('compact');
  var fctx = fx ? fx.getContext('2d') : null;
  var dark = true, W = 0, H = 0, RW = 0, RH = 0, dpr = 1;
  var layers = [], starsWrap = null, heroH = 1;
  var hasFilter = (function () { try { var c = document.createElement('canvas').getContext('2d'); return 'filter' in c; } catch (e) { return false; } })();

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  /* ---------- palette from CSS tokens ---------- */
  var pal = {};
  function readPal() {
    var cs = getComputedStyle(root);
    dark = root.dataset.theme !== 'light';
    ['l1c', 'l1m', 'l1b', 'l2c', 'l2m', 'l2b', 'l3c', 'l3m', 'l3b', 'l4c', 'l4m', 'l4b', 'lit', 'shade', 'rim', 'ground'].forEach(function (k) { pal[k] = cs.getPropertyValue('--' + k).trim(); });
    pal.litO = parseFloat(cs.getPropertyValue('--lit-o')) || 0.4;
    pal.shadeO = parseFloat(cs.getPropertyValue('--shade-o')) || 0.3;
    ['s', 'm', 'l'].forEach(function (k) { pal['ink' + k] = cs.getPropertyValue('--ink-' + k).trim() || '200,200,255'; });
  }

  function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1'); return parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16); }

  /* ---------- ridge profiles (the painted massif from Afterglow) ---------- */
  var PEAKS = [
    [[.12,.55,.3,.22,1.2],[.5,.4,.25,.3,1.15],[.86,.78,.26,.2,1.25]],
    [[.04,.3,.1,.1,1.2],[.2,.58,.19,.14,1.3],[.42,.36,.2,.12,1.1],[.64,.5,.05,.04,1.3],[.72,1,.2,.17,1.5],[.8,.55,.05,.08,1.3],[.93,.5,.16,.14,1.2]],
    [[.06,.55,.2,.1,1.3],[.3,.35,.16,.2,1.15],[.52,.72,.12,.08,1.4],[.62,.4,.1,.18,1.15],[.88,.62,.2,.14,1.3]],
    [[.2,.6,.3,.25,1.1],[.6,.8,.3,.3,1.1],[.92,.5,.2,.2,1.1]]
  ];
  /* vb: base, ph: height, k: scroll sink rate (near rows sink fastest, uncovering the summits behind),
     eng: engraving strength, ls: line spacing, lines: count */
  var L = [
    { vb: 0.58, ph: 0.36, k: 0.05, seed: 11, shade: 0.7, lit: 1,   eng: 1,    ls: 4.4, lines: 34 },
    { vb: 0.7,  ph: 0.62, k: 0.14, seed: 29, shade: 1,   lit: 0.9, eng: 0.95, ls: 4.8, lines: 32 },
    { vb: 0.82, ph: 0.4,  k: 0.24, seed: 53, shade: 1,   lit: 0.35, eng: 0.8, ls: 5.6, lines: 26 },
    { vb: 0.95, ph: 0.15, k: 0.36, seed: 71, shade: 0.35, lit: 0,  eng: 0.4,  ls: 6.6, lines: 12 }
  ];
  function noiseArr(seedN, N) {
    var r = rng(seedN), h = [], i;
    for (i = 0; i <= N; i++) h.push(0);
    var amp = 1;
    for (var step = 64; step >= 2; step /= 2, amp *= 0.55) for (var j = step / 2; j < N; j += step) h[j] += (r() - 0.5) * amp;
    for (var m = 1; m < N; m += 2) h[m] += (r() - 0.5) * 0.22;
    return h;
  }
  function prof(pk, x) {
    var v = 0.1;
    for (var i = 0; i < pk.length; i++) {
      var q = pk[i], d = x < q[0] ? (q[0] - x) / q[2] : (x - q[0]) / q[3];
      if (d < 1) v = Math.max(v, q[1] * Math.pow(1 - d, q[4]));
    }
    return v;
  }
  var N = 360;
  function pts(idx, w, h, cmp) {
    var l = L[idx], noise = noiseArr(l.seed, N), out = [];
    var span = w < 700 ? 0.6 : 1, off = w < 700 ? 0.28 : 0;
    var ph = cmp ? l.ph * 0.9 : l.ph, vb = cmp ? Math.min(0.98, l.vb + 0.05) : l.vb;
    for (var i = 0; i <= N; i++) {
      var u = i / N, v = prof(PEAKS[idx], off + u * span);
      v = Math.max(0, v + noise[i] * 0.11 * (0.25 + v));
      out.push([u * w, h * (vb - ph * v)]);
    }
    return out;
  }
  function yAt(p, x) {
    for (var i = 1; i < p.length; i++) if (p[i][0] >= x) { var a = p[i - 1], b = p[i], t = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t; }
    return p[p.length - 1][1];
  }
  function summits(p, minDrop) {
    var res = [], n = p.length, last = -99;
    for (var i = 6; i < n - 6; i++) {
      var ok = true;
      for (var k = 1; k <= 6; k++) if (p[i][1] > p[i - k][1] || p[i][1] > p[i + k][1]) { ok = false; break; }
      if (!ok || i - last < 8) continue;
      var r = i; while (r < n - 1 && p[r + 1][1] >= p[r][1] && r - i < 70) r++;
      var lf = i; while (lf > 0 && p[lf - 1][1] >= p[lf][1] && i - lf < 70) lf--;
      if (Math.max(p[r][1], p[lf][1]) - p[i][1] < minDrop) continue;
      res.push([i, r, lf]); last = i;
    }
    return res;
  }
  function facePath(ctx, p, i, v, h, dirR) {
    var a = p[i], b = p[v], lo = Math.min(i, v), hi = Math.max(i, v), run = [];
    for (var q = lo; q <= hi; q++) run.push(p[q]);
    if (!dirR) run.reverse();
    ctx.moveTo(run[0][0], run[0][1]);
    for (var k = 1; k < run.length; k++) ctx.lineTo(run[k][0], run[k][1]);
    ctx.lineTo(a[0] + (b[0] - a[0]) * 0.5, b[1] + h * 0.1);
    ctx.closePath();
  }
  function smooth(arr, r) {
    var n = arr.length, out = new Array(n), i, j, s, c;
    for (i = 0; i < n; i++) {
      s = 0; c = 0;
      for (j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) { s += arr[j]; c++; }
      out[i] = s / c;
    }
    return out;
  }

  /* ---------- paint one ridge layer, with its engraving, into a cached canvas ---------- */
  function paintLayer(idx, p, w, h, cmp) {
    var l = L[idx], c = mk(w * dpr, h * dpr), g = c.getContext('2d');
    g.scale(dpr, dpr);
    var top = Math.min.apply(null, p.map(function (q) { return q[1]; }));
    var key = 'l' + (idx + 1);
    /* body */
    var gr = g.createLinearGradient(0, top, 0, h);
    gr.addColorStop(0, pal[key + 'c']); gr.addColorStop(0.38, pal[key + 'm']); gr.addColorStop(1, pal[key + 'b']);
    g.beginPath(); g.moveTo(0, h + 2);
    for (var i = 0; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    g.lineTo(w, h + 2); g.closePath();
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();

    /* soft painted faces (shade on right flanks, alpenglow on left flanks) */
    var sums = summits(p, h * (cmp ? 0.035 : 0.05));
    function paintFaces(dirR, hex, alpha) {
      var rgb = hexRgb(hex);
      var fg = g.createLinearGradient(0, top, 0, h * 0.98);
      fg.addColorStop(0, 'rgba(' + rgb + ',1)'); fg.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.save();
      if (hasFilter) g.filter = 'blur(' + (cmp ? 1.6 : 2.4) + 'px)';
      g.globalAlpha = alpha;
      g.fillStyle = fg;
      g.beginPath();
      sums.forEach(function (s) { facePath(g, p, s[0], dirR ? s[1] : s[2], h, dirR); });
      g.fill();
      g.restore();
    }
    paintFaces(true, pal.shade, pal.shadeO * l.shade);
    if (l.lit) paintFaces(false, pal.lit, pal.litO * l.lit);

    /* ---- engraving ---- */
    var n = p.length, ys = p.map(function (q) { return q[1]; });
    var base = smooth(ys, 2);
    var shadeAt = new Array(n);
    var sm = smooth(ys, 5);
    for (i = 0; i < n; i++) {
      var a = sm[Math.max(0, i - 3)], b = sm[Math.min(n - 1, i + 3)];
      var slope = (b - a) / ((Math.min(n - 1, i + 3) - Math.max(0, i - 3)) * (w / N));
      shadeAt[i] = clamp01(0.5 + slope * 1.1);
    }
    var sh2 = smooth(shadeAt, 4);
    function bucket(v) { return v < 0.36 ? 0 : v < 0.46 ? 1 : v < 0.54 ? 2 : v < 0.64 ? 3 : 4; }
    var FAM = [0, 0, 1, 2, 2], BA = [0.5, 0.7, 0.85, 1, 1.1], BW = [0.55, 0.62, 0.7, 0.8, 0.9];
    var ink = [pal.inkl, pal.inkm, pal.inks];
    var strokes = ink.map(function (rgb) {
      var sg = g.createLinearGradient(0, top, 0, top + (h - top) * 0.85);
      if (dark) { sg.addColorStop(0, 'rgba(' + rgb + ',1)'); sg.addColorStop(1, 'rgba(' + rgb + ',0.4)'); }
      else { sg.addColorStop(0, 'rgba(' + rgb + ',1)'); sg.addColorStop(1, 'rgba(' + rgb + ',0.55)'); }
      return sg;
    });
    if (dark) {
      /* aurora tint by elevation: cyan near crests, violet lower, amber in lit flanks */
      strokes[2] = (function () { var sg = g.createLinearGradient(0, top, 0, top + (h - top) * 0.8); sg.addColorStop(0, 'rgba(120,205,255,1)'); sg.addColorStop(0.35, 'rgba(' + pal.inks + ',0.95)'); sg.addColorStop(1, 'rgba(159,123,255,0.45)'); return sg; })();
      strokes[0] = (function () { var sg = g.createLinearGradient(0, top, 0, top + (h - top) * 0.8); sg.addColorStop(0, 'rgba(255,214,160,1)'); sg.addColorStop(0.4, 'rgba(' + pal.inkl + ',0.9)'); sg.addColorStop(1, 'rgba(255,150,170,0.4)'); return sg; })();
    }
    var K = Math.round(l.lines * (cmp ? 0.75 : 1) * (w < 700 ? 0.8 : 1));
    var lines = [], off = 0;
    for (var k = 0; k < K; k++) {
      off += l.ls * (1 + k * 0.025);
      var mix = Math.min(0.5, k * 0.014), sr = smooth(ys, 3 + Math.round(k * 0.4)), row = new Array(n);
      for (i = 0; i < n; i++) row[i] = ys[i] * (1 - mix) + sr[i] * mix + off;
      lines.push(row);
    }
    g.lineJoin = 'round'; g.lineCap = 'round';
    function ss(a0, a1, v) { var t = clamp01((v - a0) / (a1 - a0)); return t * t * (3 - 2 * t); }
    var Q = 12;
    function strokeRow(row, kk, half) {
      var fall = Math.pow(1 - kk / K, 1.15), odd = kk % 2 === 1, groups = {};
      for (var j = 0; j < n - 1; j++) {
        var s = (sh2[j] + sh2[j + 1]) / 2;
        var f = 0.5 + 0.6 * ss(0.3, 0.7, s);
        if (odd) f *= 0.45 + 0.55 * ss(0.36, 0.56, s);
        if (half) f *= 0.8 * ss(0.46, 0.66, s);
        var lv = Math.round(f * Q / 1.1);
        if (lv < 1) continue;
        var fam = s < 0.44 ? 0 : s < 0.56 ? 1 : 2, key = fam * 100 + lv;
        (groups[key] = groups[key] || []).push(j);
      }
      for (var key2 in groups) {
        var segs = groups[key2], fm = Math.floor(key2 / 100), lv2 = key2 % 100, last = -9;
        g.beginPath();
        for (var m = 0; m < segs.length; m++) {
          var jj = segs[m];
          if (jj !== last + 1) g.moveTo(p[jj][0], row[jj]);
          g.lineTo(p[jj + 1][0], row[jj + 1]); last = jj;
        }
        g.strokeStyle = strokes[fm];
        g.lineWidth = (0.55 + 0.35 * lv2 / Q) * (half ? 0.75 : 1);
        g.globalAlpha = Math.min(1, 0.55 * (lv2 / Q) * 1.1 * fall * l.eng * (dark ? 1 : 1.2));
        g.stroke();
      }
    }
    for (k = 0; k < K; k++) {
      strokeRow(lines[k], k, false);
      if (k < K - 1) {
        var mid = lines[k].map(function (v, j) { return (v + lines[k + 1][j]) / 2; });
        strokeRow(mid, k, true);
      }
    }

    /* cross-hatch bitten into deep shade just under the crest */
    if (l.eng > 0.5) {
      var rr = rng(l.seed + 5);
      g.lineWidth = 0.55;
      g.strokeStyle = strokes[2];
      for (var x = 2; x < w; x += cmp ? 3.4 : 2.8) {
        var j2 = Math.min(n - 1, Math.round(x / w * N));
        var sv = sh2[j2];
        if (sv < 0.58) continue;
        var depth = (sv - 0.55) * (cmp ? 90 : 150) * l.eng * (0.5 + rr());
        var y0 = p[j2][1] + 2;
        g.globalAlpha = Math.min(0.5, 0.18 + (sv - 0.58) * 1.4) * (dark ? 1 : 1.25);
        g.beginPath(); g.moveTo(x, y0); g.lineTo(x - depth * 0.42, y0 + depth); g.stroke();
      }
    }
    g.restore();

    /* baked rim light along the crest (alpenglow); left flanks catch it */
    g.save();
    g.lineJoin = 'round'; g.lineCap = 'round';
    var rimK = [0.9, 0.85, 0.55, 0.15][idx];
    [[6, 0.07], [3, 0.14]].forEach(function (cfg) {
      g.beginPath(); var pen = false;
      for (var j = 0; j < n; j++) { if (sh2[j] > 0.66) { pen = false; continue; } if (!pen) { g.moveTo(p[j][0], p[j][1]); pen = true; } else g.lineTo(p[j][0], p[j][1]); }
      g.strokeStyle = pal.rim; g.lineWidth = cfg[0]; g.globalAlpha = cfg[1] * rimK; g.stroke();
    });
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (var q = 1; q < n; q++) g.lineTo(p[q][0], p[q][1]);
    g.strokeStyle = pal.rim; g.lineWidth = 0.9; g.globalAlpha = 0.5 * rimK; g.stroke();
    g.beginPath(); var pen2 = false;
    for (var z = 0; z < n; z++) { if (sh2[z] > 0.6) { pen2 = false; continue; } if (!pen2) { g.moveTo(p[z][0], p[z][1]); pen2 = true; } else g.lineTo(p[z][0], p[z][1]); }
    g.lineWidth = 1.15; g.globalAlpha = 0.85 * rimK; g.stroke();
    g.restore();
    return c;
  }

  /* ---------- sky layers: stars + aurora ribbons, pre-rendered ---------- */
  function buildSky() {
    sky.querySelectorAll('.sk-gen').forEach(function (e) { e.remove(); });
    var fxEl = fx;
    var r = rng(7), ws = Math.min(window.devicePixelRatio || 1, 1.5);
    starsWrap = document.createElement('div'); starsWrap.className = 'stars-wrap sk-gen';
    var sets = [{ n: Math.min(120, Math.round(W * H / 11000)), cls: '' }, { n: 26, cls: 'tw1' }, { n: 26, cls: 'tw2' }];
    sets.forEach(function (s) {
      var SH = Math.round(H * 0.66), c = mk(W * ws, SH * ws); c.className = s.cls; c.style.height = SH + 'px';
      var g = c.getContext('2d'); g.scale(ws, ws);
      for (var i = 0; i < s.n; i++) {
        var d = r(), sz = (0.5 + r() * 0.9) * (d > 0.9 ? 1.5 : 1), a = (d < 0.6 ? 0.45 : d < 0.9 ? 0.7 : 0.95);
        g.fillStyle = 'rgba(238,241,255,' + a.toFixed(2) + ')';
        g.fillRect(r() * W, r() * SH * 0.97, sz, sz);
      }
      starsWrap.appendChild(c);
    });
    sky.insertBefore(starsWrap, fxEl);
    /* aurora ribbons: three stacked curtains drawn once at half resolution */
    var rw = Math.round(W * 1.24 / 2), rh = Math.round(H * 0.7 / 2);
    var spr = dark ? ['159,123,255', '93,199,255', '255,181,98'] : ['150,120,230', '255,170,150', '255,196,130'];
    var peak = dark ? [0.75, 0.55, 0.34] : [0.36, 0.34, 0.36];
    var groups = [[0, 1], [2, 0]];
    for (var rI = 0; rI < 2; rI++) {
      var c = mk(rw, rh); c.className = 'aur aur' + rI + ' sk-gen';
      var g2 = c.getContext('2d');
      if (dark) g2.globalCompositeOperation = 'lighter';
      groups[rI].forEach(function (sI, gi) {
        var sp = mk(2, 128), sg = sp.getContext('2d'), gg = sg.createLinearGradient(0, 0, 0, 128);
        var pk = peak[sI] * (rI === 1 && gi === 1 ? 0.5 : 1);
        gg.addColorStop(0, 'rgba(' + spr[sI] + ',0)'); gg.addColorStop(0.55, 'rgba(' + spr[sI] + ',' + pk * 0.45 + ')');
        gg.addColorStop(0.85, 'rgba(' + spr[sI] + ',' + pk + ')'); gg.addColorStop(1, 'rgba(' + spr[sI] + ',0)');
        sg.fillStyle = gg; sg.fillRect(0, 0, 2, 128);
        var HH = H / 2, ph = rI * 2.7 + gi * 2.1 + sI;
        for (var x = 0; x < rw; x++) {
          var u = x / rw, xx = x * 2;
          var edge = clamp01(u * 3) * clamp01((1 - u) * 3);
          var y0 = HH * (0.1 + 0.08 * sI) + Math.sin(xx * 0.004 + ph) * HH * 0.07 + Math.sin(xx * 0.012 + sI) * HH * 0.025;
          var hh = HH * (0.26 + 0.07 * sI) * (0.75 + 0.25 * Math.sin(xx * 0.007 + sI * 1.7 + rI));
          var al = (0.55 + 0.45 * Math.sin(xx * 0.0035 + ph * 1.3)) * edge * (0.3 + 0.7 * u) * (sI === 2 ? 0.8 : 1) * (dark ? 1 : 0.9);
          if (al < 0.02) continue;
          g2.globalAlpha = al;
          g2.drawImage(sp, x, y0, 1, hh);
        }
      });
      sky.insertBefore(c, starsWrap);
    }
  }

  /* ---------- build everything (resize / theme only) ---------- */
  var alts = [];
  function build() {
    var rect = hero.getBoundingClientRect();
    W = Math.round(rect.width); H = Math.round(rect.height);
    heroH = Math.max(1, hero.offsetHeight);
    RW = wrap.clientWidth; RH = wrap.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    readPal();
    if (fx) { fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    buildSky();
    wrap.querySelectorAll('.alt').forEach(function (a) { if (a.parentNode !== wrap) wrap.appendChild(a); });
    Array.prototype.slice.call(wrap.querySelectorAll('.lyr')).forEach(function (e) { e.remove(); });
    layers = [];
    var all = [];
    for (var i = 0; i < 4; i++) all.push(pts(i, RW, RH, compact));
    var nodes = [];
    for (i = 0; i < 4; i++) {
      var d = document.createElement('div'); d.className = 'lyr';
      var cv = paintLayer(i, all[i], RW, RH, compact);
      d.appendChild(cv);
      nodes.push(d);
      layers.push({ el: d, k: L[i].k, y: 0 });
    }
    var first = wrap.firstChild;
    nodes.forEach(function (d) { wrap.insertBefore(d, first); });
    placeAlts(all, nodes);
    scrollFrame(true);
  }

  /* spot heights: snap to a real summit, ride on that layer's wrapper, avoid colliding with each other */
  function placeAlts(all, nodes) {
    var items = [], narrow = RW < 700, span = narrow ? 0.6 : 1, off = narrow ? 0.28 : 0;
    wrap.querySelectorAll('.alt').forEach(function (a) {
      var lay = parseInt(a.dataset.lay || '2', 10), P = all[lay];
      var px = parseFloat(narrow && a.dataset.pxm ? a.dataset.pxm : a.dataset.px), x = RW * (px - off) / span;
      var sums = summits(P, RH * 0.02), best = null, bd = 1e9;
      sums.forEach(function (s) { var dx = Math.abs(P[s[0]][0] - x); if (dx < bd) { bd = dx; best = s; } });
      if (best && bd < RW * 0.08) x = P[best[0]][0];
      x = Math.max(14, Math.min(RW - 14, x));
      var root = yAt(P, x), topY = root;
      for (var q = 0; q <= lay; q++) for (var dx = -6; dx <= 150; dx += 6) topY = Math.min(topY, yAt(all[q], Math.max(0, Math.min(RW, x + dx))));
      a.style.left = x + 'px'; a.style.top = root + 'px';
      var hgt = Math.max(parseFloat(a.dataset.lift || '44'), root - topY + 34);
      a.style.setProperty('--h', hgt + 'px');
      a.classList.remove('flip');
      nodes[lay].appendChild(a);
      items.push({ a: a, x: x, root: root, h: hgt, w: a.querySelector('span').offsetWidth + 20 });
    });
    items.sort(function (p, q) { return p.x - q.x; });
    items.forEach(function (it) { if (it.a.dataset.flip && !narrow || it.x + it.w > RW - 8) { it.a.classList.add('flip'); it.flip = true; } });
    function box(it) { var x0 = it.flip ? it.x - it.w : it.x, y1 = it.root - it.h + 12; return { x0: x0, x1: x0 + it.w, y0: y1 - 40, y1: y1 + 6 }; }
    for (var i = 1; i < items.length; i++) {
      for (var j = 0; j < i; j++) {
        var A = box(items[i]), B = box(items[j]);
        if (A.x0 < B.x1 + 10 && B.x0 < A.x1 + 10 && A.y0 < B.y1 + 6 && B.y0 < A.y1 + 6) {
          items[i].h += 54; items[i].a.style.setProperty('--h', items[i].h + 'px');
        }
      }
    }
  }

  /* ---------- scroll: transforms only, rAF-coalesced, no layout reads ---------- */
  var ticking = false, stuck = false, hdr = document.querySelector('.site-header');
  function scrollFrame(force) {
    ticking = false;
    var y = window.scrollY || 0;
    var s = y > 24;
    if (s !== stuck && hdr) { stuck = s; hdr.classList.toggle('is-stuck', s); }
    if (reduce) return;
    if (y > heroH + 120 && !force) return;
    var yy = Math.min(y, heroH + 120);
    for (var i = 0; i < layers.length; i++) {
      var ty = Math.round(yy * layers[i].k * 10) / 10;
      if (ty !== layers[i].y || force) { layers[i].y = ty; layers[i].el.style.transform = 'translate3d(0,' + ty + 'px,0)'; }
    }
    if (starsWrap) starsWrap.style.transform = 'translate3d(0,' + (yy * 0.12).toFixed(1) + 'px,0)';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(scrollFrame); } }, { passive: true });

  /* ---------- shooting stars + underline meteor: on-demand canvas ---------- */
  var heroVisible = true, running = false, shoot = null, meteor = null, nextT = null;
  var headSprite = null;
  function makeHead() {
    var s = mk(48, 48), g = s.getContext('2d'), rgb = dark ? '255,200,130' : '196,112,12';
    var gr = g.createRadialGradient(24, 24, 0, 24, 24, 22);
    gr.addColorStop(0, 'rgba(' + rgb + ',0.45)'); gr.addColorStop(0.4, 'rgba(' + rgb + ',0.12)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    g.fillStyle = dark ? 'rgba(255,247,236,0.95)' : 'rgba(196,112,12,0.95)';
    g.beginPath(); g.arc(24, 24, 2, 0, 6.283); g.fill();
    return s;
  }
  function head(x, y, sc) { if (!headSprite) headSprite = makeHead(); fctx.drawImage(headSprite, x - 24 * sc, y - 24 * sc, 48 * sc, 48 * sc); }
  function streak(hx, hy, ang, len, a, w) {
    var tx = hx - Math.cos(ang) * len, ty = hy - Math.sin(ang) * len;
    var g = fctx.createLinearGradient(tx, ty, hx, hy);
    g.addColorStop(0, 'rgba(' + (dark ? '159,123,255' : '120,90,220') + ',0)');
    g.addColorStop(0.6, 'rgba(' + (dark ? '93,199,255' : '60,140,210') + ',' + (a * 0.5) + ')');
    g.addColorStop(1, 'rgba(' + (dark ? '255,200,130' : '196,112,12') + ',' + a + ')');
    fctx.strokeStyle = g; fctx.lineWidth = w; fctx.lineCap = 'round';
    fctx.beginPath(); fctx.moveTo(tx, ty); fctx.lineTo(hx, hy); fctx.stroke();
  }
  function fxFrame(now) {
    if (!shoot && !meteor) { fctx.clearRect(0, 0, W, H); running = false; return; }
    if (document.hidden) { running = false; return; }
    fctx.clearRect(0, 0, W, H);
    if (shoot) {
      var p = (now - shoot.t0) / shoot.dur;
      if (p >= 1) { shoot = null; schedule(); }
      else {
        var hx = shoot.sx + Math.cos(shoot.ang) * shoot.dist * p, hy = shoot.sy + Math.sin(shoot.ang) * shoot.dist * p;
        streak(hx, hy, shoot.ang, 130, 0.9 * Math.sin(p * Math.PI), 2); head(hx, hy, 0.7);
      }
    }
    if (meteor) drawMeteor(now);
    requestAnimationFrame(fxFrame);
  }
  function kick() { if (!running && !reduce && (shoot || meteor)) { running = true; requestAnimationFrame(fxFrame); } }
  function schedule() {
    clearTimeout(nextT);
    if (reduce) return;
    nextT = setTimeout(function () {
      if (!heroVisible || document.hidden || !W) { schedule(); return; }
      var ang = (28 + Math.random() * 14) * Math.PI / 180;
      shoot = { sx: W * (0.05 + Math.random() * 0.5), sy: H * (0.04 + Math.random() * 0.3), ang: ang, dist: W * 0.5, dur: 900 + Math.random() * 500, t0: performance.now() };
      kick();
    }, (compact ? 11000 : 6500) + Math.random() * 6000);
  }
  function startMeteor() {
    var svg = document.querySelector('[data-meteor] .underline');
    if (!svg || !fctx) return;
    var path = svg.querySelector('path');
    var rect = svg.getBoundingClientRect(), w = rect.width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-c3-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-c3-meteor', '1'); } catch (e) {}
    var cr = fx.getBoundingClientRect();
    var ex = rect.right - cr.left, ey = rect.top - cr.top + 4;
    var dy = ey + 60, dx = dy * 1.7;
    meteor = { sx: ex + dx, sy: -60, ex: ex, ey: ey, lx: rect.left - cr.left, path: path, t0: performance.now(), d1: 800, d2: 1100 };
    kick();
  }
  function drawMeteor(now) {
    var m = meteor, el = now - m.t0, hx, hy, ta = 1;
    var p1 = clamp01(el / m.d1), acc = Math.pow(p1, 1.5);
    if (el < m.d1) { hx = m.sx + (m.ex - m.sx) * acc; hy = m.sy + (m.ey - m.sy) * acc; m.path.style.strokeDashoffset = '1'; }
    else {
      var p2 = easeOutExpo(clamp01((el - m.d1) / m.d2));
      hx = m.ex - (m.ex - m.lx) * p2; hy = m.ey; m.path.style.strokeDashoffset = String(1 - p2);
      ta = 1 - clamp01((el - m.d1) / 600);
    }
    var ang = el < m.d1 ? Math.atan2(m.ey - m.sy, m.ex - m.sx) : Math.PI;
    var len = 260 * (el < m.d1 ? Math.min(1, acc * 3 + 0.1) : ta);
    var ha = el > m.d1 + m.d2 ? 1 - clamp01((el - m.d1 - m.d2) / 400) : 1;
    if (len > 1) streak(hx, hy, el < m.d1 ? ang : 0, len, 0.95 * Math.max(ta, 0), 2.4);
    if (ha > 0) { fctx.globalAlpha = ha; head(hx, hy, 1); fctx.globalAlpha = 1; }
    if (el > m.d1 + m.d2 + 500) { m.path.style.strokeDashoffset = '0'; meteor = null; }
  }

  /* pause CSS-driven sky motion when the hero is off-screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      heroVisible = es[0].isIntersecting;
      hero.classList.toggle('off', !heroVisible);
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { hero.classList.toggle('off', document.hidden || !heroVisible); });
  document.addEventListener('rm:themechange', function () { headSprite = null; build(); });
  var rt, lastW = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (Math.abs(window.innerWidth - lastW) > 2 || true) { lastW = window.innerWidth; build(); } }, 160);
  });

  lastW = window.innerWidth;
  build();
  schedule();
  var startFn = function () { if (document.querySelector('[data-meteor]')) setTimeout(startMeteor, 1100); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(); startFn(); }, startFn); else startFn();
})();
