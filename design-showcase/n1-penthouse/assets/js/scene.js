(function () {
  'use strict';
  var canvas = document.getElementById('city');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var compact = canvas.getAttribute('data-scene') === 'compact';
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var PAL = {
    dark: {
      sky: [[0, '#050505'], [0.5, '#12100d'], [0.8, '#2a2118'], [1, '#4a3a27']],
      glow: 'rgba(214,176,110,0.22)',
      far: '#2c2720', mid: '#221e19', near: '#080807',
      edge: 'rgba(201,169,106,0.16)', stroke: null,
      winOn: ['#f2cf86', '#e4b45c', '#f6dfaa'],
      winOff: 'rgba(236,231,221,0.045)', winOffA: 1,
      bloom: true, bloomA: 0.7,
      stars: true,
      fog: '128,118,102', fogA: [0.10, 0.15],
      ground: ['#12100d', '#0b0a09'], quay: 'rgba(201,169,106,0.30)',
      reflect: 0.42, rain: 'rgba(210,205,195,', rainA: 0.10,
      bg: '11,10,9', hatch: 0
    },
    light: {
      sky: [[0, '#d9dee2'], [0.55, '#e9e8e3'], [0.85, '#f3eee3'], [1, '#f7efe0']],
      glow: 'rgba(255,246,228,0.6)',
      far: '#e6e3dc', mid: '#d9d5cb', near: '#c0bbaf',
      edge: 'rgba(255,255,255,0.35)', stroke: 'rgba(52,48,42,',
      winOn: ['#f5ecd6', '#efe2c4', '#fff8e8'],
      winOff: 'rgba(60,55,48,0.2)', winOffA: 1,
      bloom: false, bloomA: 0,
      stars: false,
      fog: '250,248,243', fogA: [0.5, 0.6],
      ground: ['#e3e0d8', '#eeece6'], quay: 'rgba(40,36,30,0.35)',
      reflect: 0.30, rain: 'rgba(60,55,48,', rainA: 0.10,
      bg: '238,236,230', hatch: 1
    }
  };

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var VW = 2200;
  var W = 0, H = 0, dpr = 1, hz = 0, s = 1, offX = 0, narrow = false;
  var pal, themeName, progress = 0, scrollY = 0;
  var city = null, wins = [], nearRects = [];
  var baseBuf, winBuf, b1, b2, fogTex;
  var bc, wc, b1c, b2c, fc;
  var winDirty = true, running = false, rafId = 0, lastT = 0, t0 = performance.now();
  var drops = [];
  var blink = null;

  function mk() { var c = document.createElement('canvas'); return c; }
  baseBuf = mk(); winBuf = mk(); b1 = mk(); b2 = mk(); fogTex = mk();
  bc = baseBuf.getContext('2d'); wc = winBuf.getContext('2d'); b1c = b1.getContext('2d'); b2c = b2.getContext('2d'); fc = fogTex.getContext('2d');

  /* ---------- city model (virtual units, y up from street) ---------- */
  function stack(x, spec, extra) {
    var tiers = [], prev = 0;
    spec.forEach(function (p) { tiers.push({ cx: x, w: p[0], y0: prev, y1: p[1] }); prev = p[1]; });
    var b = { x: x, tiers: tiers, top: prev, roof: 'flat' };
    for (var k in extra) b[k] = extra[k];
    return b;
  }

  function buildCity() {
    var R = rng(11), near = [], mid = [], far = [], i, x;
    var lm = [
      stack(1120, [[78, 44], [66, 300]], { roof: 'crown', name: 'chrysler' }),
      stack(1270, [[56, 150], [52, 380], [44, 520]], { roof: 'flat', lines: true }),
      stack(1420, [[132, 52], [106, 236], [86, 292], [64, 332], [42, 366], [26, 388]], { roof: 'mast', mastH: 84, name: 'esb' }),
      stack(1580, [[90, 70], [80, 300], [58, 372]], { roof: 'needle', mastH: 92 }),
      stack(1700, [[46, 442]], { roof: 'flat', cw: 9, rh: 11 }),
      stack(1900, [[74, 120], [72, 250], [68, 340], [62, 430], [54, 486]], { roof: 'needle', mastH: 112, thick: true })
    ];
    lm.forEach(function (b) { b.layer = 2; near.push(b); });
    // low-rise left, mid-rise elsewhere on near layer
    x = 40;
    while (x < VW - 20) {
      var w = 52 + R() * 50;
      var cx = x + w / 2, ok = true;
      for (i = 0; i < lm.length; i++) if (Math.abs(lm[i].x - cx) < lm[i].tiers[0].w / 2 + w / 2 + 6) { ok = false; x = lm[i].x + lm[i].tiers[0].w / 2 + 6; break; }
      if (!ok) continue;
      var zone = cx < 1000 ? 0 : 1;
      var h = zone === 0 ? 40 + R() * 70 : 110 + R() * 150;
      var spec = [], n = 1 + Math.floor(R() * 3), ww = w, hh;
      for (var k = 0; k < n; k++) {
        hh = h * (k === n - 1 ? 1 : (0.5 + 0.2 * k));
        spec.push([ww, hh]); ww *= 0.84 + R() * 0.08;
      }
      var r = R(), roof = r < 0.34 ? 'wt' : r < 0.52 ? 'step' : r < 0.64 ? 'mast' : 'flat';
      var b = stack(cx, spec, { roof: roof, mastH: 22 + R() * 26, layer: 2 });
      near.push(b);
      x += w + 4 + R() * 10;
    }
    // mid layer
    x = -30;
    while (x < VW + 30) {
      var wm = 44 + R() * 70, bump = Math.exp(-Math.pow((x - 1550) / 520, 2));
      var hm = (x < 1000 ? 90 + R() * 60 : 120 + R() * 150) + 150 * bump;
      var sp = [[wm, hm * 0.7], [wm * 0.84, hm]];
      mid.push(stack(x + wm / 2, R() < 0.5 ? sp : [[wm, hm]], { roof: R() < 0.25 ? 'mast' : R() < 0.3 ? 'wt' : 'flat', mastH: 20 + R() * 22, layer: 1 }));
      x += wm * (0.7 + R() * 0.4);
    }
    x = -40;
    while (x < VW + 40) {
      var wf = 50 + R() * 80, bf = Math.exp(-Math.pow((x - 1550) / 600, 2));
      far.push(stack(x + wf / 2, [[wf, (x < 1000 ? 110 : 170) + R() * (x < 1000 ? 60 : 170) + 110 * bf]], { roof: R() < 0.2 ? 'mast' : 'flat', mastH: 24, layer: 0 }));
      x += wf * (0.6 + R() * 0.5);
    }
    return { near: near, mid: mid, far: far };
  }

  /* ---------- geometry helpers ---------- */
  function px(xu) { return offX + xu * s; }
  function py(yu) { return hz - yu * s; }

  function roofPath(c, b, fill) {
    var t = b.tiers[b.tiers.length - 1], top = py(b.top), cx = px(b.x), w = t.w * s, u = s;
    if (b.roof === 'flat') {
      c.fillRect(cx - w / 2 - 1.5 * u, top - 2.5 * u, w + 3 * u, 2.6 * u);
    } else if (b.roof === 'step') {
      c.fillRect(cx - w * 0.34, top - 7 * u, w * 0.68, 7.5 * u);
      c.fillRect(cx - w * 0.16, top - 13 * u, w * 0.32, 6.5 * u);
    } else if (b.roof === 'mast') {
      c.fillRect(cx - w * 0.2, top - 6 * u, w * 0.4, 6.5 * u);
      c.fillRect(cx - 0.8 * u, top - (6 + (b.mastH || 30)) * u, 1.6 * u, (b.mastH || 30) * u);
    } else if (b.roof === 'needle') {
      var base = (b.thick ? 5 : 3.5);
      c.beginPath(); c.moveTo(cx - base * u, top); c.lineTo(cx, top - b.mastH * u); c.lineTo(cx + base * u, top); c.closePath(); c.fill();
      if (b.thick) c.fillRect(cx - 4 * u, top - 6 * u, 8 * u, 6.5 * u);
    } else if (b.roof === 'wt') {
      // water tower silhouette: tank on legs, conical cap
      var tw = Math.min(12, w / s * 0.3) * u, th = 13 * u, lg = 6 * u, tx = cx + w * 0.12;
      c.fillRect(tx - tw / 2, top - lg - th, tw, th);
      c.beginPath(); c.moveTo(tx - tw / 2 - 1 * u, top - lg - th); c.lineTo(tx, top - lg - th - 5 * u); c.lineTo(tx + tw / 2 + 1 * u, top - lg - th); c.closePath(); c.fill();
      c.fillRect(tx - tw / 2 + 0.5 * u, top - lg, 1 * u, lg); c.fillRect(tx + tw / 2 - 1.5 * u, top - lg, 1 * u, lg);
      c.fillRect(tx - 0.5 * u, top - lg, 1 * u, lg);
    } else if (b.roof === 'crown') {
      // stepped, pointed crown (Art Deco), silhouette only
      var ws = [0.84, 0.68, 0.54, 0.4, 0.27, 0.15], y = top;
      for (var i = 0; i < ws.length; i++) {
        c.fillRect(cx - w * ws[i] / 2, y - 15 * u, w * ws[i], 15.6 * u);
        y -= 15 * u;
      }
      c.beginPath(); c.moveTo(cx - 2.6 * u, y); c.lineTo(cx, y - 50 * u); c.lineTo(cx + 2.6 * u, y); c.closePath(); c.fill();
    }
  }

  function drawLayer(c, list, col, stroke, hatchPat) {
    c.fillStyle = col;
    list.forEach(function (b) {
      b.tiers.forEach(function (t) {
        c.fillRect(px(t.cx) - t.w * s / 2, py(t.y1), t.w * s, (t.y1 - t.y0) * s + 1);
      });
      roofPath(c, b);
    });
    if (hatchPat) {
      c.fillStyle = hatchPat;
      list.forEach(function (b) {
        b.tiers.forEach(function (t) { c.fillRect(px(t.cx) - t.w * s / 2, py(t.y1), t.w * s, (t.y1 - t.y0) * s + 1); });
      });
    }
    if (stroke) {
      c.strokeStyle = stroke; c.lineWidth = 0.8;
      list.forEach(function (b) {
        b.tiers.forEach(function (t) {
          c.strokeRect(px(t.cx) - t.w * s / 2 + 0.4, py(t.y1) + 0.4, t.w * s - 0.8, (t.y1 - t.y0) * s);
        });
      });
    }
  }

  function edgeLight(c, list, col) {
    c.fillStyle = col;
    list.forEach(function (b) {
      b.tiers.forEach(function (t) { c.fillRect(px(t.cx) + t.w * s / 2 - 1, py(t.y1), 1, (t.y1 - t.y0) * s); });
    });
  }

  function hatchPattern() {
    var p = mk(); p.width = 6; p.height = 6;
    var c = p.getContext('2d');
    c.strokeStyle = 'rgba(40,36,30,0.07)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 6); c.lineTo(6, 0); c.stroke();
    return ctx.createPattern(p, 'repeat');
  }

  /* ---------- windows ---------- */
  function buildWindows() {
    wins = [];
    nearRects = [];
    var R = rng(29);
    city.near.forEach(function (b) { b.tiers.forEach(function (t) { nearRects.push([px(t.cx) - t.w * s / 2, py(t.y1), px(t.cx) + t.w * s / 2, py(t.y0)]); }); });
    [city.mid, city.near].forEach(function (list, li) {
      var layer = li + 1;
      list.forEach(function (b) {
        var boff = R();
        var bx = clamp(Math.abs(b.x / VW - 0.7) / 0.7, 0, 1), leftSide = b.x < 1000;
        var cw = b.cw || (layer === 2 ? 7 : 6), rh = b.rh || (layer === 2 ? 9 : 8);
        b.tiers.forEach(function (t, ti) {
          var cols = Math.floor((t.w - 12) / cw);
          if (cols < 1) return;
          var x0 = t.cx - cols * cw / 2 + (cw - cw * 0.5) / 2;
          var yBase = t.y0 + (ti === 0 ? 11 : 5);
          var rows = Math.floor((t.y1 - 6 - yBase) / rh);
          for (var r = 0; r < rows; r++) {
            var fl = r / Math.max(1, rows - 1);
            var ry = yBase + r * rh;
            for (var cI = 0; cI < cols; cI++) {
              if (R() < 0.04) continue;
              if (leftSide && (layer === 1 || R() < 0.8)) continue;
              var wx = px(x0 + cI * cw), wy = py(ry + rh * 0.52), ww = cw * 0.5 * s, wh = rh * 0.52 * s;
              var mx = wx + ww / 2, my = wy + wh / 2, occ = false;
              if (layer === 1) {
                for (var q = 0; q < nearRects.length; q++) { var nr = nearRects[q]; if (mx > nr[0] && mx < nr[2] && my > nr[1] && my < nr[3]) { occ = true; break; } }
              }
              if (occ) continue;
              var thr = R() < 0.12 ? 9 : 0.04 + bx * 0.36 + boff * 0.16 + fl * 0.14 + R() * 0.12;
              wins.push({ x: wx, y: wy, w: ww, h: wh, thr: thr, c: Math.floor(R() * 3.2) % 3, v: 0.55 + R() * 0.45, L: layer, ci: cI, ls: leftSide });
            }
          }
        });
      });
    });
  }

  function drawWindows() {
    wc.setTransform(dpr, 0, 0, dpr, 0, 0);
    wc.clearRect(0, 0, W, H);
    var P = 0.2 + progress * 1.02;
    var i, w, a;
    // unlit grid
    wc.fillStyle = pal.winOff;
    for (i = 0; i < wins.length; i++) {
      w = wins[i];
      if (themeName === 'dark' && w.L === 1) continue;
      if (themeName === 'light' && (w.ls || w.ci % 2)) continue;
      wc.globalAlpha = w.L === 1 ? 0.55 : 1;
      wc.fillRect(w.x, w.y, w.w, w.h);
    }
    for (var ci = 0; ci < 3; ci++) {
      wc.fillStyle = pal.winOn[ci];
      for (i = 0; i < wins.length; i++) {
        w = wins[i];
        if (w.c !== ci) continue;
        if (themeName === 'light' && (w.ls || w.ci % 2)) continue;
        a = clamp((P - w.thr) / 0.07, 0, 1);
        if (a <= 0.01) continue;
        wc.globalAlpha = a * w.v * (w.L === 1 ? 0.8 : 1) * (themeName === 'light' ? 0.9 : 1);
        wc.fillRect(w.x, w.y, w.w, w.h);
      }
    }
    wc.globalAlpha = 1;
    if (pal.bloom) {
      b1c.clearRect(0, 0, b1.width, b1.height); b1c.drawImage(winBuf, 0, 0, b1.width, b1.height);
      b2c.clearRect(0, 0, b2.width, b2.height); b2c.drawImage(b1, 0, 0, b2.width, b2.height);
    }
    winDirty = false;
  }

  /* ---------- static base ---------- */
  function bakeBase() {
    var c = bc;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    var g = c.createLinearGradient(0, 0, 0, hz);
    pal.sky.forEach(function (p) { g.addColorStop(p[0], p[1]); });
    c.fillStyle = g; c.fillRect(0, 0, W, hz + 1);
    var rg = c.createRadialGradient(W * 0.62, hz, 0, W * 0.62, hz, Math.max(W, H) * 0.7);
    rg.addColorStop(0, pal.glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(0, 0, W, hz + 1);
    if (pal.stars) {
      var R = rng(5), n = Math.round(clamp(W / 14, 40, 120));
      for (var i = 0; i < n; i++) {
        var sy = R() * hz * 0.62;
        c.fillStyle = 'rgba(236,231,221,' + (0.08 + R() * 0.32) + ')';
        c.fillRect(Math.floor(R() * W), Math.floor(sy), 1, 1);
      }
    }
    var hp = pal.hatch ? hatchPattern() : null;
    drawLayer(c, city.far, pal.far, pal.stroke ? pal.stroke + '0.10)' : null, null);
    drawLayer(c, city.mid, pal.mid, pal.stroke ? pal.stroke + '0.18)' : null, null);
    // haze between mid and near
    var hg = c.createLinearGradient(0, hz - 340 * s, 0, hz);
    hg.addColorStop(0, 'rgba(' + pal.fog + ',0)'); hg.addColorStop(1, 'rgba(' + pal.fog + ',' + (themeName === 'dark' ? 0.10 : 0.35) + ')');
    c.fillStyle = hg; c.fillRect(0, hz - 340 * s, W, 340 * s);
    var nl = city.near.filter(function (b) { return b.x < 1000; }), nr = city.near.filter(function (b) { return b.x >= 1000; });
    drawLayer(c, nl, themeName === 'dark' ? '#14120f' : pal.mid, null, null);
    drawLayer(c, nr, pal.near, pal.stroke ? pal.stroke + '0.4)' : null, hp);
    if (!pal.stroke) edgeLight(c, nr, pal.edge);
    // ground
    var gg = c.createLinearGradient(0, hz, 0, H);
    gg.addColorStop(0, pal.ground[0]); gg.addColorStop(1, pal.ground[1]);
    c.fillStyle = gg; c.fillRect(0, hz, W, H - hz);
  }

  function bakeFog() {
    var tw = 1000, th = 220;
    fogTex.width = tw; fogTex.height = th;
    var R = rng(41);
    fc.clearRect(0, 0, tw, th);
    for (var i = 0; i < 16; i++) {
      var x = R() * tw, y = th * (0.3 + R() * 0.4), rx = 140 + R() * 220, ry = 18 + R() * 40, a = 0.35 + R() * 0.5;
      for (var k = -1; k <= 1; k++) {
        fc.save(); fc.translate(x + k * tw, y); fc.scale(1, ry / rx);
        var g = fc.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, 'rgba(' + pal.fog + ',' + a + ')'); g.addColorStop(1, 'rgba(' + pal.fog + ',0)');
        fc.fillStyle = g; fc.beginPath(); fc.arc(0, 0, rx, 0, 6.2832); fc.fill(); fc.restore();
      }
    }
  }

  function seedRain() {
    drops = [];
    var R = rng(3), n = Math.round(clamp(W / 16, 30, 90));
    for (var i = 0; i < n; i++) drops.push({ x: R() * W, y: R() * H, l: 12 + R() * 22, v: 520 + R() * 420, a: 0.35 + R() * 0.65 });
  }

  /* ---------- frame ---------- */
  function render(t) {
    if (winDirty) drawWindows();
    var c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(baseBuf, 0, 0);
    c.drawImage(winBuf, 0, 0);
    if (pal.bloom) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = pal.bloomA * 0.6; c.drawImage(b1, 0, 0, canvas.width, canvas.height);
      c.globalAlpha = pal.bloomA; c.drawImage(b2, 0, 0, canvas.width, canvas.height);
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fog bands
    var fh = (compact ? 0.16 : 0.22) * H, fw = Math.max(W * 1.2, 1000);
    var drift = mqReduce.matches ? 0 : t;
    [[hz - fh * 1.05, 7, pal.fogA[0], 1], [hz - fh * 0.4, -4, pal.fogA[1], 1]].forEach(function (f) {
      var off = ((drift * f[1]) % fw + fw) % fw;
      c.globalAlpha = f[2];
      for (var xx = -off; xx < W; xx += fw) c.drawImage(fogTex, xx, f[0], fw, fh);
    });
    c.globalAlpha = 1;
    // quay line
    c.fillStyle = pal.quay; c.fillRect(0, Math.round(hz), W, 1);
    // reflection (wet foreground)
    var Rh = H - hz;
    if (Rh > 8) {
      var step = 2, k;
      for (var y = 1; y < Rh; y += step) {
        var f = 1 - y / Rh;
        var dx = Math.sin(y * 0.19 + t * 0.9) * (0.6 + y * 0.018) + Math.sin(y * 0.047 - t * 0.5) * 1.4;
        c.globalAlpha = pal.reflect * Math.pow(f, 1.35);
        var sy = (hz - y * 0.9) * dpr;
        c.drawImage(canvas, 0, sy, canvas.width, step * dpr, dx, hz + y, W, step);
      }
      c.globalAlpha = 1;
    }
    // rain
    if (!mqReduce.matches) {
      c.lineWidth = 1; c.lineCap = 'butt';
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        c.strokeStyle = pal.rain + (pal.rainA * d.a) + ')';
        c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - d.l * 0.14, d.y + d.l); c.stroke();
      }
    }
    // beacon
    if (blink && pal.bloom && !mqReduce.matches) {
      var on = (Math.sin(t * 2.2) > 0.82);
      if (on) { c.fillStyle = 'rgba(214,120,96,0.9)'; c.fillRect(px(blink.x) - 1, py(blink.y) - 1, 2, 2); }
    }
    // fade to page ground
    var fg = c.createLinearGradient(0, hz + (H - hz) * 0.35, 0, H);
    fg.addColorStop(0, 'rgba(' + pal.bg + ',0)'); fg.addColorStop(1, 'rgba(' + pal.bg + ',0.94)');
    c.fillStyle = fg; c.fillRect(0, hz + (H - hz) * 0.35, W, H);
  }

  function stepRain(dt) {
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      d.y += d.v * dt; d.x -= d.v * dt * 0.14;
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * (W + 80); }
    }
  }

  function frame(now) {
    rafId = 0;
    if (!running) return;
    var dt = Math.min(0.06, (now - lastT) / 1000);
    if (now - lastT < 30) { rafId = requestAnimationFrame(frame); return; }
    lastT = now;
    stepRain(dt);
    render((now - t0) / 1000);
    rafId = requestAnimationFrame(frame);
  }
  function shouldRun() { return !mqReduce.matches && !document.hidden && scrollY < H * 1.3; }
  function sync() {
    var want = shouldRun();
    if (want && !running) { running = true; lastT = performance.now(); rafId = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
  }
  var pending = false;
  function drawOnce() {
    if (pending || running) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render((performance.now() - t0) / 1000); });
  }

  /* ---------- setup ---------- */
  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    narrow = W < 760;
    hz = Math.round(H * (compact ? 0.9 : narrow ? 0.84 : 0.82));
    s = (compact || narrow) ? H / 1500 : H / 1240;
    s = Math.max(s, W / VW);
    offX = (W - VW * s) / 2;
    [canvas, baseBuf, winBuf].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    b1.width = Math.max(8, Math.round(W / 6)); b1.height = Math.max(8, Math.round(H / 6));
    b2.width = Math.max(4, Math.round(W / 16)); b2.height = Math.max(4, Math.round(H / 16));
    themeName = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    pal = PAL[themeName];
    if (!city) city = buildCity();
    var esb = city.near[2];
    blink = { x: esb.x, y: esb.top + esb.mastH + 4 };
    bakeFog(); bakeBase(); buildWindows(); seedRain();
    winDirty = true;
  }
  function retheme() {
    themeName = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    pal = PAL[themeName];
    bakeFog(); bakeBase(); winDirty = true; drawOnce();
  }

  function onScroll() {
    scrollY = window.pageYOffset || 0;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var np = 0.62 * clamp(scrollY / (H * 1.05), 0, 1) + 0.38 * clamp(scrollY / (max * 0.85), 0, 1);
    if (Math.abs(np - progress) > 0.002) { progress = np; winDirty = true; drawOnce(); }
    var base = compact ? 0.7 : 1, lo = compact ? 0.42 : 0.5;
    canvas.style.opacity = String(base - (base - lo) * clamp(scrollY / (H * 0.8), 0, 1));
    sync();
  }

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { setup(); onScroll(); drawOnce(); }, 120); });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('rm:themechange', retheme);
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', function () { sync(); drawOnce(); });

  setup();
  onScroll();
  render(0);
  sync();
})();
