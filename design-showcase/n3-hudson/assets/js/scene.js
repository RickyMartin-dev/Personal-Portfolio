/* Hudson — Manhattan across the river. Windows warm on with scroll; their light is mirrored in the water. */
(function () {
  'use strict';
  var canvas = document.getElementById('city');
  if (!canvas || !canvas.getContext) return;
  var host = canvas.parentElement;
  var band = canvas.getAttribute('data-scene') === 'band';
  var hero = host.closest('.hero');
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PAL = {
    dark: {
      sky0: [[9, 10, 22], [19, 17, 42], [46, 35, 68]],
      sky1: [[12, 13, 28], [27, 24, 56], [86, 56, 72]],
      front: 'rgb(6,7,14)', back: 'rgb(15,16,34)', far: ['rgb(15,16,34)', 'rgb(15,16,34)'], mid: ['rgb(6,7,14)', 'rgb(6,7,14)'], deep: ['rgb(6,7,14)', 'rgb(6,7,14)'], shade: 'rgba(0,0,0,0)', lit: 'rgba(0,0,0,0)', crownA: 0.5, wk: 1, haze: [70, 52, 98],
      unlit: 'rgba(46,52,96,0.34)', unlitB: 'rgba(60,64,116,0.22)',
      warm: '255,192,104', cool: '196,224,255',
      water0: [22, 24, 50], water1: [11, 12, 24], refl: 0.62,
      rim: 'rgba(150,130,255,0.34)', rimB: 'rgba(110,150,230,0.16)', stars: true, glow: '255,170,90'
    },
    light: {
      sky0: [[128, 148, 206], [182, 191, 228], [242, 204, 192]],
      sky1: [[178, 205, 238], [216, 228, 244], [251, 233, 213]],
      front: 'rgb(46,54,88)', back: 'rgb(190,200,226)', far: ['rgb(214,221,238)', 'rgb(184,195,222)'], mid: ['rgb(138,150,186)', 'rgb(98,110,152)'], deep: ['rgb(86,98,140)', 'rgb(40,48,84)'], shade: 'rgba(24,32,70,0.17)', lit: 'rgba(255,240,226,0.34)', crownA: 0.4, wk: 0.78, haze: [238, 216, 216],
      unlit: 'rgba(168,180,218,0.2)', unlitB: 'rgba(200,208,230,0.18)',
      warm: '255,170,64', cool: '255,226,180',
      water0: [150, 166, 204], water1: [206, 216, 234], refl: 0.5,
      rim: 'rgba(255,255,255,0.5)', rimB: 'rgba(255,255,255,0.3)', stars: false, glow: '255,190,120'
    }
  };

  var W = 0, H = 0, dpr = 1, hz = 0, s = 1, sh = 1, pal, theme;
  var buf = document.createElement('canvas'), bctx = buf.getContext('2d');
  var silB = document.createElement('canvas'), silF = document.createElement('canvas');
  var refl = document.createElement('canvas'), rctx = refl.getContext('2d');
  var aur = document.createElement('canvas');
  var small = document.createElement('canvas'), sctx = small.getContext('2d');
  var tiersB = [], tiersF = [], winsB = [], winsF = [], streakW = [], stars = [], anchors = {}, spireTops = [];
  var cars = [];
  var cur = 0, target = 0, lastDraw = -1, lastCity = 0, lastP = -1;
  var running = false, visible = true, raf = 0, shoot = null, nextShoot = 2.5;
  var t0 = performance.now(), prev = 0;
  var litEl = document.querySelectorAll('[data-lit]');
  var callouts = Array.prototype.map.call(host.querySelectorAll('[data-at]'), function (el) { return { el: el, at: parseFloat(el.getAttribute('data-at')) }; });

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }
  function ease(t) { return t * t * (3 - 2 * t); }

  /* ---------- skyline model ---------- */
  var CENTERS = [0.6, 0.885];
  var curLM = false;
  function tower(list, r, layer, cx, w, steps, spire, key) {
    var prevH = 0, topY = hz;
    steps.forEach(function (st, i) {
      var tw = w * st[0], th = st[1] * sh;
      if (th <= prevH) return;
      list.push({ x: cx - tw / 2, y: hz - th, w: tw, h: th - prevH, layer: layer, cx: cx, i: i, lm: curLM, crown: !!key && (key === 'esb' || key === 'chry' || key === 'ov') && i >= steps.length - 2 });
      prevH = th; topY = hz - th;
    });
    var topW = w * steps[steps.length - 1][0];
    if (spire) {
      var spH = spire.h * sh, spW = (spire.w || 0.14) * topW;
      list.push({ sp: true, x: cx - topW * 0.3, y: topY, w: topW * 0.6, h: spire.crown ? spire.crown * sh : 0, tip: topY - spH, layer: layer, cx: cx, sw: spW });
      spireTops.push({ key: key, x: cx, y: topY - spH });
    }
    if (key) anchors[key] = { x: cx, y: topY - (spire ? spire.h * sh : 0) };
  }

  function build() {
    var r = rng(band ? 31 : 17);
    tiersB = []; tiersF = []; spireTops = []; anchors = {};
    var narrow = W < 700;
    function xs(f) { return W * f; }
    function ws(v) { return v * s * (narrow ? 1.12 : 1); }
    // back layer: hazy depth
    var x = -10;
    while (x < W + 20) {
      var f = x / W, near = Math.exp(-Math.pow((f - 0.64) / 0.2, 2)) + 0.7 * Math.exp(-Math.pow((f - 0.88) / 0.1, 2));
      var bw = ws(22 + r() * 36), bh = (46 + r() * 70 + near * 130 * (0.5 + r() * 0.6)) ;
      var steps = [[1, bh]]; if (r() < 0.5) steps = [[1, bh * 0.72], [0.74, bh]];
      tower(tiersB, r, 'b', x + bw / 2, bw, steps, r() < 0.2 ? { h: 10 + r() * 22, w: 0.08 } : null);
      x += bw + r() * ws(3);
    }
    // front layer, left: upper west side / chelsea lowrise
    x = -6;
    while (x < xs(0.45)) {
      var lw = ws(26 + r() * 34), lh = 20 + r() * 44;
      var fl = x / W; if (fl > 0.3) lh += 10 + (fl - 0.3) * 120 * r();
      if (r() < 0.08) lh += 24;
      var st = [[1, lh]]; if (r() < 0.35) st = [[1, lh * 0.8], [0.7, lh]];
      tower(tiersF, r, 'f', x + lw / 2, lw, st, r() < 0.1 ? { h: 8, w: 0.1 } : null);
      x += lw + ws(2 + r() * 5);
    }
    // landmarks and midtown fill
    curLM = true;
    tower(tiersF, r, 'f', xs(0.468), ws(30), [[1, 250]], null, 'slim');
    tower(tiersF, r, 'f', xs(0.505), ws(40), [[1, 150], [0.9, 176]], null);
    tower(tiersF, r, 'f', xs(0.535), ws(58), [[1, 196], [0.86, 226], [0.7, 243], [0.5, 255], [0.3, 262]], { h: 30, w: 0.12 }, 'ov');
    tower(tiersF, r, 'f', xs(0.578), ws(46), [[1, 130], [0.9, 160]], null);
    tower(tiersF, r, 'f', xs(0.606), ws(52), [[1, 150], [0.84, 178], [0.7, 194], [0.58, 205], [0.46, 213], [0.34, 219]], { h: 54, w: 0.1, crown: 22 }, 'chry');
    tower(tiersF, r, 'f', xs(0.652), ws(64), [[1, 62], [0.86, 150], [0.64, 218], [0.44, 250], [0.3, 268], [0.2, 280]], { h: 66, w: 0.1 }, 'esb');
    tower(tiersF, r, 'f', xs(0.698), ws(50), [[1, 120], [0.84, 172]], null);
    tower(tiersF, r, 'f', xs(0.732), ws(42), [[1, 140]], null);
    tower(tiersF, r, 'f', xs(0.764), ws(36), [[1, 96], [0.8, 112]], null);
    // downtown
    curLM = false;
    var fx = xs(0.80);
    while (fx < W + 20) {
      var dw = ws(26 + r() * 26), dh = 70 + r() * 110, ff = fx / W;
      if (Math.abs(ff - 0.885) < 0.035) { fx += dw * 0.4; continue; }
      var dst = [[1, dh]]; if (r() < 0.45) dst = [[1, dh * 0.82], [0.76, dh]];
      tower(tiersF, r, 'f', fx + dw / 2, dw, dst, r() < 0.15 ? { h: 14, w: 0.1 } : null);
      fx += dw + ws(2 + r() * 4);
    }
    curLM = true;
    tower(tiersF, r, 'f', xs(0.885), ws(44), [[1, 200], [0.94, 262], [0.86, 302]], { h: 48, w: 0.07 }, 'wtc');
    // windows
    winsB = []; winsF = []; streakW = [];
    var pxb = clamp(4.6 * s, 3.4, 6) * (theme === 'light' ? 0.85 : 1), pyb = pxb * 1.4;
    var pxf = clamp(7.2 * s, 5.2, 8.5) * (theme === 'light' ? 0.8 : 1), pyf = pxf * 1.32;
    function fill(tiers, wins, px, py, ww, wh, back) {
      tiers.forEach(function (t) {
        if (t.sp || t.h < py) return;
        var cols = Math.floor((t.w - 3) / px), rows = Math.floor((t.h - 3) / py);
        if (cols < 1 || rows < 1) return;
        var ox = t.x + (t.w - cols * px) / 2 + (px - ww) / 2, oy = t.y + t.h - rows * py;
        var dist = Math.min(Math.abs(t.cx / W - CENTERS[0]), Math.abs(t.cx / W - CENTERS[1])) / 0.55;
        var bo = r() * 0.1;
        for (var rr = 0; rr < rows; rr++) {
          var rowOn = r() > 0.12;
          for (var cc = 0; cc < cols; cc++) {
            if (!rowOn && r() > 0.2) continue;
            if (r() < 0.2) continue;
            var thr = 0.1 + dist * 0.62 + bo + r() * 0.2 + (rr / rows) * 0.05;
            if (r() < 0.06) thr = -1;
            var w = { x: ox + cc * px, y: oy + rr * py + (py - wh) / 2, w: ww, h: wh, t: thr, c: r() < 0.14 ? 1 : 0, f: r() < 0.05 ? 1 : 0, k: r() };
            wins.push(w);
            if (!back && r() < 0.34) streakW.push(w);
          }
        }
      });
    }
    fill(tiersB, winsB, pxb, pyb, Math.max(1.4, pxb * 0.4), Math.max(2, pyb * 0.42), true);
    fill(tiersF, winsF, pxf, pyf, Math.max(1.8, pxf * (theme === 'light' ? 0.36 : 0.42)), Math.max(2.4, pyf * (theme === 'light' ? 0.4 : 0.46)), false);
    // stars
    var sr = rng(5); stars = [];
    for (var i = 0; i < (narrow ? 70 : 150); i++) stars.push({ x: sr() * W, y: sr() * hz * 0.7, r: 0.3 + sr() * 0.8, p: sr() * 6.28, sp: 0.4 + sr() * 1.2 });
    // waterfront traffic
    cars = [];
    for (var c = 0; c < 26; c++) cars.push({ x: r() * W, v: (r() < 0.5 ? 1 : -1) * (6 + r() * 14), w: r() < 0.5 ? 1 : 0 });
  }

  function bakeSil() {
    function bake(cv, tiers, wins, col, unlit, rimCol, back) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var c = cv.getContext('2d'); c.scale(dpr, dpr);
      function colors(t) { return back ? pal.far : (t.lm ? pal.deep : pal.mid); }
      tiers.forEach(function (t) {
        var cs = colors(t);
        if (t.sp) {
          var cc = back ? pal.far[1] : pal.deep[1];
          c.fillStyle = cc;
          c.beginPath();
          if (t.h) { c.moveTo(t.x, t.y + 1); c.lineTo(t.cx - t.w * 0.18, t.y - t.h); c.lineTo(t.cx + t.w * 0.18, t.y - t.h); c.lineTo(t.x + t.w, t.y + 1); c.closePath(); c.fill(); }
          c.beginPath(); c.moveTo(t.cx - t.sw / 2, t.y - t.h + 1); c.lineTo(t.cx, t.tip); c.lineTo(t.cx + t.sw / 2, t.y - t.h + 1); c.closePath(); c.fill();
          return;
        }
        var gy = back ? t.y : hz - 300 * sh;
        var g = c.createLinearGradient(0, back ? t.y : hz - 330 * sh, 0, hz);
        g.addColorStop(0, cs[0]); g.addColorStop(1, cs[1]);
        c.fillStyle = back ? g : g;
        c.fillRect(t.x, t.y, t.w, t.h + 1);
        if (!back && theme === 'light') {
          c.fillStyle = pal.shade; c.fillRect(t.x + t.w * 0.6, t.y, t.w * 0.4, t.h + 1);
          c.fillStyle = pal.lit; c.fillRect(t.x, t.y, Math.max(1, t.w * 0.06), t.h + 1);
        } else if (back && theme === 'light') {
          c.fillStyle = 'rgba(40,52,100,0.07)'; c.fillRect(t.x + t.w * 0.6, t.y, t.w * 0.4, t.h + 1);
        }
      });
      c.fillStyle = unlit;
      wins.forEach(function (w) { c.fillRect(w.x, w.y, w.w, w.h); });
      c.fillStyle = rimCol;
      tiers.forEach(function (t) { if (!t.sp && t.h > 4) c.fillRect(t.x, t.y, t.w, 1); });
    }
    bake(silB, tiersB, winsB, pal.back, pal.unlitB, pal.rimB, true);
    bake(silF, tiersF, winsF, pal.front, pal.unlit, pal.rim, false);
    // atmosphere over the back layer
    var c = silB.getContext('2d');
    var g = c.createLinearGradient(0, hz - 300 * sh, 0, hz);
    g.addColorStop(0, rgb(pal.haze, 0)); g.addColorStop(1, rgb(pal.haze, theme === 'dark' ? 0.2 : 0.5));
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = g; c.fillRect(0, hz - 330 * sh, W, 330 * sh + 2);
    c.globalCompositeOperation = 'source-over';
  }

  /* ---------- per-frame drawing ---------- */
  function winAlpha(t, p) { return clamp((p * 1.08 - t) / 0.07, 0, 1); }

  function drawWins(c, wins, p, time, maxA, off) {
    var cols = [pal.warm, pal.cool];
    for (var ci = 0; ci < 2; ci++) {
      for (var b = 1; b <= 6; b++) {
        c.fillStyle = 'rgba(' + cols[ci] + ',' + (b / 6 * maxA).toFixed(3) + ')';
        for (var i = 0; i < wins.length; i++) {
          var w = wins[i];
          if (w.c !== ci) continue;
          var a = winAlpha(w.t, p);
          if (a <= 0) continue;
          if (w.f && a >= 1) a = 0.72 + 0.28 * Math.sin(time * 0.0007 + w.k * 40);
          if (Math.ceil(a * 6 - 0.001) !== b) continue;
          c.fillRect(w.x, w.y + off, w.w, w.h);
        }
      }
    }
  }

  function drawCity(p, time) {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, buf.width, buf.height);
    bctx.drawImage(silB, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWins(bctx, winsB, p, time, 0.5, 0);
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.drawImage(silF, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWins(bctx, winsF, p, time, 0.86, 0);
    // lit crown bands on landmark towers
    var ca = clamp((p - 0.12) / 0.5, 0, 1) * pal.crownA;
    if (ca > 0.01) {
      bctx.fillStyle = 'rgba(' + pal.warm + ',' + ca.toFixed(3) + ')';
      for (var ti = 0; ti < tiersF.length; ti++) { var tc = tiersF[ti]; if (tc.crown && tc.h > 3) bctx.fillRect(tc.x + 0.5, tc.y + 1, tc.w - 1, Math.min(2.5, tc.h)); }
    }
    // beacons
    spireTops.forEach(function (sp) {
      if (sp.key !== 'esb' && sp.key !== 'wtc') return;
      var on = (Math.sin(time * 0.0022 + sp.x) > 0.55) ? 0.9 : 0.25;
      bctx.fillStyle = 'rgba(255,92,92,' + on + ')'; bctx.fillRect(sp.x - 1, sp.y - 1, 2, 2.5);
    });
    // glow bloom (small buffer)
    if (theme === 'dark') {
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, small.width, small.height);
      sctx.drawImage(buf, 0, 0, small.width, small.height);
    }
    lastCity = time; lastP = p;
  }

  function skyAt(p) {
    var a = pal; var k = ease(clamp(p, 0, 1));
    return [mix(a.sky0[0], a.sky1[0], k), mix(a.sky0[1], a.sky1[1], k), mix(a.sky0[2], a.sky1[2], k)];
  }

  function aurora(time, p) {
    var dark = theme === 'dark';
    var defs = dark
      ? [['159,123,255', 0.15, 0.2, 1], ['93,199,255', 0.1, 0.27, 2], ['159,123,255', 0.08, 0.14, 3]]
      : [['255,176,200', 0.1, 0.2, 1], ['150,190,255', 0.08, 0.27, 2]];
    var AK = 0.25, ac = aur.getContext('2d');
    ac.setTransform(1, 0, 0, 1, 0, 0); ac.clearRect(0, 0, aur.width, aur.height); ac.scale(AK, AK);
    var main = ctx; ctx = ac;
    ctx.save();
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    defs.forEach(function (d, k) {
      var base = H * d[2], span = H * 0.3;
      var g = ctx.createLinearGradient(0, base - 70, 0, base + span);
      g.addColorStop(0, 'rgba(' + d[0] + ',0)'); g.addColorStop(0.28, 'rgba(' + d[0] + ',1)'); g.addColorStop(1, 'rgba(' + d[0] + ',0)');
      ctx.fillStyle = g;
      var step = 4;
      for (var x = -step; x < W + step; x += step) {
        var y = base + Math.sin(x * 0.0042 + time * 0.00011 * d[3] + k * 2) * 38 + Math.sin(x * 0.012 - time * 0.00018) * 12 - p * 18;
        var al = 0.5 + 0.5 * Math.sin(x * 0.011 + time * 0.00032 * d[3] + k) * Math.sin(x * 0.004 - time * 0.00017 + k * 3);
        ctx.globalAlpha = Math.min(1, d[1] * 3.4 * (0.35 + 0.65 * al) * (1 - 0.35 * p) * 0.8);
        ctx.fillRect(x, y - 70, step + 0.5, span + 70);
      }
    });
    ctx.restore();
    ctx = main;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    ctx.globalAlpha = 0.295;
    ctx.drawImage(aur, 0, 0, aur.width, aur.height, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function render(time) {
    var p = cur;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sk = skyAt(p);
    var g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, rgb(sk[0])); g.addColorStop(0.55, rgb(sk[1])); g.addColorStop(1, rgb(sk[2]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 1);

    if (pal.stars) {
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i], tw = 0.55 + 0.45 * Math.sin(time * 0.001 * st.sp + st.p);
        ctx.fillStyle = 'rgba(232,236,255,' + (0.5 * tw * (1 - st.y / (hz * 0.8))) + ')';
        ctx.fillRect(st.x, st.y - p * 8, st.r, st.r);
      }
    }
    aurora(time, p);

    // shooting star
    if (!reduce && theme === 'dark') {
      if (!shoot && time / 1000 > nextShoot) {
        var ang = (24 + Math.random() * 14) * Math.PI / 180;
        shoot = { x: W * (0.1 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.22), dx: Math.cos(ang), dy: Math.sin(ang), t: time, d: 900 + Math.random() * 400, len: 110 + Math.random() * 60, c: ['159,123,255', '93,199,255', '255,181,98'][Math.floor(Math.random() * 3)] };
      }
      if (shoot) {
        var q = (time - shoot.t) / shoot.d;
        if (q >= 1) { shoot = null; nextShoot = time / 1000 + 6 + Math.random() * 6; }
        else {
          var dist = q * W * 0.4, hx = shoot.x + shoot.dx * dist, hy = shoot.y + shoot.dy * dist, fade = Math.sin(q * Math.PI);
          var tx = hx - shoot.dx * shoot.len, ty = hy - shoot.dy * shoot.len;
          var sg = ctx.createLinearGradient(tx, ty, hx, hy);
          var sc = theme === 'dark' ? shoot.c : '255,255,255';
          sg.addColorStop(0, 'rgba(' + sc + ',0)'); sg.addColorStop(1, 'rgba(' + sc + ',' + (0.85 * fade) + ')');
          ctx.strokeStyle = sg; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,' + fade + ')'; ctx.beginPath(); ctx.arc(hx, hy, 1.3, 0, 6.3); ctx.fill();
        }
      }
    }

    // city glow on the sky
    var lit = clamp(p, 0, 1) * 0.8 + 0.2;
    var gR = Math.max(W * 0.5, 300);
    var gg = ctx.createRadialGradient(W * 0.68, hz, 0, W * 0.68, hz, gR);
    gg.addColorStop(0, 'rgba(' + pal.glow + ',' + (0.2 * lit) + ')'); gg.addColorStop(1, 'rgba(' + pal.glow + ',0)');
    ctx.save(); ctx.translate(0, hz); ctx.scale(1, 0.55); ctx.translate(0, -hz);
    ctx.fillStyle = gg; ctx.fillRect(0, hz - gR - 4, W, gR + 8); ctx.restore();

    // rebuild city buffer when needed
    if (Math.abs(p - lastP) > 0.0008 || time - lastCity > 120 || lastP < 0) drawCity(p, time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(buf, 0, 0);
    if (theme === 'dark') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.9; ctx.drawImage(small, 0, 0, buf.width, buf.height);
      ctx.restore();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // river
    var R = H - hz, wg = ctx.createLinearGradient(0, hz, 0, H);
    wg.addColorStop(0, rgb(pal.water0)); wg.addColorStop(1, rgb(pal.water1));
    ctx.fillStyle = wg; ctx.fillRect(0, hz, W, R + 1);
    var hg = ctx.createLinearGradient(0, hz, 0, hz + R * 0.5);
    hg.addColorStop(0, rgb(sk[2], theme === 'dark' ? 0.5 : 0.6)); hg.addColorStop(1, rgb(sk[2], 0));
    ctx.fillStyle = hg; ctx.fillRect(0, hz, W, R * 0.5);

    // mirrored city
    var sl = 2, k = 0.94, soft = theme === 'light';
    if (soft) { sl = 3; }
    var rc = soft ? rctx : ctx, RK = soft ? 1 / 3 : 1;
    if (soft) { rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.clearRect(0, 0, refl.width, refl.height); }
    for (var y = 0; y < R; y += sl) {
      var f = 1 - y / R;
      var amp = soft ? 1.2 + y * 0.05 : 0.35 + y * 0.02;
      var xo = Math.sin(y * (soft ? 0.23 : 0.17) + time * 0.0013 + Math.sin(y * 0.023 + time * 0.0004) * 2.4) * amp;
      var srcY = (hz - (y + sl) * k) * dpr;
      if (srcY < 0) break;
      rc.globalAlpha = soft ? pal.refl * 0.62 * Math.pow(f, 2.1) * (0.7 + 0.3 * Math.sin(y * 0.9 + time * 0.002)) : pal.refl * Math.pow(f, 1.25);
      rc.save();
      if (soft) { rc.translate(0, (y + sl) * RK); rc.scale(1, -1); rc.drawImage(buf, 0, srcY, buf.width, sl * k * dpr, xo * RK, 0, W * RK, sl * RK); }
      else { rc.translate(0, hz + y + sl); rc.scale(1, -1); rc.drawImage(buf, 0, srcY, buf.width, sl * k * dpr, xo, 0, W, sl); }
      rc.restore();
    }
    if (soft) { ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; ctx.drawImage(refl, 0, hz, W, R); }
    ctx.globalAlpha = 1;

    // window light streaks on the water
    ctx.fillStyle = 'rgba(' + pal.warm + ',1)';
    for (var i2 = 0; i2 < streakW.length; i2++) {
      var w = streakW[i2], a = winAlpha(w.t, p);
      if (a < 0.6) continue;
      var y0 = hz + (hz - w.y) * 0.94;
      if (y0 > H - 4) continue;
      var len = 5 + w.k * 26, fade = 1 - (y0 - hz) / R;
      var sx = w.x + Math.sin(time * 0.0016 + w.x * 0.37) * 1.4;
      ctx.globalAlpha = 0.2 * a * fade * (0.55 + 0.45 * Math.sin(time * 0.0031 + w.k * 60));
      ctx.fillRect(sx, y0, 1.5, Math.min(len, H - y0));
    }
    ctx.globalAlpha = 1;

    // waterfront traffic
    var dt = Math.min(time - prev, 60) / 1000; prev = time;
    for (var c = 0; c < cars.length; c++) {
      var cr = cars[c];
      if (!reduce) cr.x += cr.v * dt * s;
      if (cr.x < -4) cr.x = W + 4; else if (cr.x > W + 4) cr.x = -4;
      var col = cr.v > 0 ? '255,240,210' : '255,80,70';
      ctx.fillStyle = 'rgba(' + col + ',' + (0.55 * lit) + ')'; ctx.fillRect(cr.x, hz - 2, 1.6, 1.2);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.14 * lit) + ')'; ctx.fillRect(cr.x, hz + 2, 1.4, 8 + (c % 5) * 3);
    }
    // slow glints
    ctx.fillStyle = theme === 'dark' ? 'rgba(180,190,255,0.05)' : 'rgba(255,255,255,0.22)';
    for (var gI = 0; gI < 26; gI++) {
      var gy = hz + 8 + ((gI * 37) % Math.max(R - 16, 1)), gx = ((gI * 211 + time * 0.012 * (1 + (gI % 3) * 0.4)) % (W + 120)) - 60;
      ctx.fillRect(gx, gy, 24 + (gI % 4) * 18, 1);
    }
    ctx.fillStyle = pal.front; ctx.globalAlpha = 0.9; ctx.fillRect(0, hz - 1, W, 2); ctx.globalAlpha = 1;

    var pct = Math.round(clamp(p, 0, 1) * 100);
    for (var e = 0; e < litEl.length; e++) { if (litEl[e]._v !== pct) { litEl[e]._v = pct; litEl[e].textContent = (pct < 10 ? '0' : '') + pct + '%'; } }
    if (hero) hero.style.setProperty('--p', cur.toFixed(4));
    for (var q = 0; q < callouts.length; q++) callouts[q].el.classList.toggle('on', cur >= callouts[q].at);
  }

  /* ---------- plumbing ---------- */
  function place() {
    var els = host.querySelectorAll('[data-anchor]');
    for (var i = 0; i < els.length; i++) {
      var a = anchors[els[i].getAttribute('data-anchor')];
      if (!a) continue;
      els[i].style.left = a.x + 'px'; els[i].style.top = a.y + 'px';
    }
  }

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    buf.width = canvas.width; buf.height = canvas.height;
    refl.width = Math.ceil(W / 3); refl.height = Math.ceil((H - Math.round(H * (band ? 0.8 : (W < 700 ? 0.82 : 0.78)))) / 3) + 2;
    aur.width = Math.ceil(W / 4); aur.height = Math.ceil(H / 4);
    small.width = Math.max(40, Math.round(W / 7)); small.height = Math.max(30, Math.round(H / 7));
    theme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    pal = PAL[theme];
    s = clamp(Math.min(W / 1440, H / 900) * (W < 700 ? 1.5 : 1), 0.58, 1.3);
    hz = Math.round(H * (band ? 0.8 : (W < 700 ? 0.82 : 0.78)));
    sh = band ? clamp((H * 0.34) / 340, 0.5, 1.1) * (W < 700 ? 0.72 : 1) : (W < 700 ? 0.7 : clamp(s * 1.04, 0.62, 1.3));
    build(); bakeSil(); place();
    lastP = -1; lastDraw = -1;
    draw(performance.now() - t0);
  }

  function computeTarget(time) {
    var sy = window.pageYOffset || 0;
    if (band) {
      var auto = reduce ? 0.7 : clamp((time - 500) / 3200, 0, 1) * 0.72;
      return Math.max(auto, clamp(sy / 640, 0, 1));
    }
    var rect = hero.getBoundingClientRect();
    var span = Math.max(rect.height - window.innerHeight, 1);
    var sp = clamp(-rect.top / span, 0, 1);
    var auto2 = reduce ? 0 : clamp((time - 400) / 2600, 0, 1) * 0.1;
    return Math.max(sp, auto2);
  }

  function draw(time) {
    target = computeTarget(time);
    cur = reduce ? target : cur + (target - cur) * clamp(dtAvg * 4.2, 0, 1);
    if (Math.abs(target - cur) < 0.0004) cur = target;
    render(time);
  }
  var dtAvg = 0.016, lastT = 0;
  function loop(now) {
    raf = 0;
    if (!running) return;
    var time = now - t0;
    dtAvg = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016; lastT = now;
    draw(time);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; lastT = 0; raf = requestAnimationFrame(loop); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  setup();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); else stop(); }, { rootMargin: '80px' }).observe(host);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  document.addEventListener('rm:themechange', function () { setup(); });
  var rw = W, rh = H, rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (Math.abs(host.clientWidth - rw) > 2 || Math.abs(host.clientHeight - rh) > 120) { rw = host.clientWidth; rh = host.clientHeight; setup(); } }, 120);
  });
  if (reduce) { window.addEventListener('scroll', function () { draw(performance.now() - t0); }, { passive: true }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  start();
})();
