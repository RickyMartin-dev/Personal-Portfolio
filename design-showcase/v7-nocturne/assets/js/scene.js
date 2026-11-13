(function () {
  'use strict';
  var canvas = document.getElementById('city');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var root = document.documentElement;
  var compact = canvas.getAttribute('data-scene') === 'compact';
  var signEl = document.getElementById('sign');
  var heroEl = document.getElementById('hero');
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var PALETTES = {
    dark: {
      sky: [[0, '#03060f'], [0.42, '#09152e'], [0.75, '#15336a'], [1, '#2b4f8e']],
      haze: 'rgba(255,170,80,0.10)',
      layers: ['#12234a', '#09132c', '#03070f'],
      mist: 'rgba(40,78,140,0.34)',
      edge: 'rgba(120,160,230,0.10)',
      winOff: ['rgba(26,48,92,0.55)', 'rgba(14,28,60,0.7)', 'rgba(10,20,44,0.85)'],
      winOn: ['#FFB54A', '#FFC670', '#F2993A'],
      glow: 'rgba(255,181,74,0.16)',
      stars: true,
      water: ['#0b1a36', '#050b18', '#02040a'],
      reflect: 0.62,
      lamp: 'rgba(255,196,110,0.9)',
      rain: 'rgba(170,200,255,',
      rainA: 0.22,
      star: '255,236,200',
      ripple: 'rgba(190,215,255,',
      signRoof: '#03070f'
    },
    light: {
      sky: [[0, '#6379c9'], [0.45, '#9aaee6'], [0.78, '#cbd5f2'], [1, '#f6e6d6']],
      haze: 'rgba(255,214,170,0.45)',
      layers: ['#b3bedb', '#8f9dbd', '#68768f'],
      mist: 'rgba(238,230,235,0.48)',
      edge: 'rgba(255,255,255,0.42)',
      winOff: ['rgba(90,104,150,0.32)', 'rgba(66,80,124,0.42)', 'rgba(50,62,100,0.5)'],
      winOn: ['#E39A2B', '#F2B24E', '#D58418'],
      glow: 'rgba(255,170,60,0.22)',
      stars: false,
      water: ['#a9b7dc', '#8d9cc6', '#7684b0'],
      reflect: 0.7,
      lamp: 'rgba(214,134,28,0.95)',
      rain: 'rgba(50,70,130,',
      rainA: 0.26,
      star: '255,255,255',
      ripple: 'rgba(255,255,255,',
      signRoof: '#5b6984'
    }
  };

  var W = 0, H = 0, dpr = 1, hz = 0, pal, themeName;
  var skyBuf = document.createElement('canvas');
  var winBuf = document.createElement('canvas');
  var compBuf = document.createElement('canvas');
  var skyC = skyBuf.getContext('2d');
  var winC = winBuf.getContext('2d');
  var compC = compBuf.getContext('2d');
  var tiers = [];      // {x,y,w,h,layer,id}
  var wins = [];       // windows
  var starsList = [];
  var drops = [];
  var ripples = [];
  var sign = null;
  var progress = 0, scrollY = 0;
  var pointer = { x: -999, y: -999, on: false };
  var winDirty = true;
  var running = false, heroVisible = true, rafId = 0;
  var startT = performance.now();
  var star = null, nextStar = 1.4;
  var lastW = 0, lastH = 0;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    lastW = W; lastH = H;
    [canvas, skyBuf, winBuf, compBuf].forEach(function (c) {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    });
    hz = Math.round(H * (compact ? 0.86 : 0.80));
    themeName = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    pal = PALETTES[themeName];
    build();
    bakeSky();
    winDirty = true;
    seedRain();
    updateSign();
    render(0);
  }

  function build() {
    var r = rng(compact ? 11 : 7);
    tiers = []; wins = []; starsList = [];
    var sc = clamp(H / 900, 0.72, 1.25);
    var hMul = compact ? 0.62 : 1.22;
    var id = 0;
    var narrow = W < 640;

    function makeTower(cx, w, h, layer, kind) {
      var list = [];
      var nt = kind === 'deco' ? 5 : kind === 'slab' ? 1 : 1 + (r() * 3 | 0);
      var fr = [], sum = 0, i;
      for (i = 0; i < nt; i++) { var f = i === 0 ? 0.45 + r() * 0.25 : 0.2 + r() * 0.3; fr.push(f); sum += f; }
      var y = hz, cw = w, ccx = cx;
      for (i = 0; i < nt; i++) {
        var th = h * fr[i] / sum;
        list.push({ x: ccx - cw / 2, y: y - th, w: cw, h: th, layer: layer, id: id });
        y -= th;
        cw *= kind === 'deco' ? 0.74 : 0.74 + r() * 0.14;
        ccx += (r() - 0.5) * cw * 0.12;
      }
      var top = list[list.length - 1];
      var roof = kind === 'deco' ? 'spire' : kind === 'sign' ? 'flat' : ['antenna', 'water', 'flat', 'crown', 'antenna'][r() * 5 | 0];
      var tw = { tiers: list, roof: roof, cx: top.x + top.w / 2, topY: top.y, topW: top.w, layer: layer, id: id, base: w };
      id++;
      return tw;
    }

    var towers = [];
    // far layer
    var x = -20;
    while (x < W + 40) {
      var w = (34 + r() * 46) * sc;
      var h = (hz * (0.16 + r() * 0.2)) * hMul;
      towers.push(makeTower(x + w / 2, w, h, 0, 'std'));
      x += w * (0.55 + r() * 0.35);
    }
    // mid layer
    x = -30;
    var signCx = narrow ? W * 0.74 : W * 0.80;
    var signW = narrow ? Math.max(104, W * 0.3) : 150 * sc;
    var decoCx = narrow ? W * 0.42 : W * 0.60;
    var placedDeco = false, placedSign = false;
    while (x < W + 50) {
      var mw = (46 + r() * 60) * sc;
      var mh = hz * (0.2 + r() * 0.26) * hMul;
      var cx = x + mw / 2;
      if (!placedDeco && cx > decoCx) {
        var dw = (narrow ? 70 : 96) * sc;
        towers.push(makeTower(decoCx, dw, hz * 0.58 * hMul, 1, 'deco'));
        placedDeco = true; x = decoCx + dw * 0.55; continue;
      }
      if (!placedSign && !compact && cx > signCx - signW * 0.5 - 10) {
        var sh = hz * (narrow ? 0.30 : 0.30);
        var t = makeTower(signCx, signW, sh, 1, 'sign');
        sign = { cx: signCx, roofY: t.topY, w: t.topW };
        towers.push(t); placedSign = true; x = signCx + signW * 0.55; continue;
      }
      towers.push(makeTower(cx, mw, mh, 1, r() < 0.2 ? 'slab' : 'std'));
      x += mw * (0.7 + r() * 0.3);
    }
    // near layer
    x = -40;
    while (x < W + 60) {
      var nw = (70 + r() * 80) * sc;
      var nh = hz * (0.14 + r() * 0.2) * hMul;
      var ncx = x + nw / 2;
      if (!compact && sign && Math.abs(ncx - sign.cx) < sign.w * 0.9) { x += nw * 0.9; continue; }
      towers.push(makeTower(ncx, nw, nh, 2, r() < 0.3 ? 'slab' : 'std'));
      x += nw * (0.9 + r() * 1.1);
    }
    tiers = towers;

    // windows
    var sizes = [
      { w: 2.2, h: 3.2, gx: 3.2, gy: 4.6 },
      { w: 3.2, h: 5, gx: 4.6, gy: 6.4 },
      { w: 4.4, h: 7, gx: 6.4, gy: 9 }
    ];
    towers.forEach(function (tw) {
      var s = sizes[tw.layer];
      var wsz = { w: s.w * sc, h: s.h * sc, gx: s.gx * sc, gy: s.gy * sc };
      tw.tiers.forEach(function (t, ti) {
        var pad = 3 * sc + (tw.layer === 2 ? 3 : 0);
        var cols = Math.max(1, Math.floor((t.w - pad * 2 + wsz.gx - wsz.w) / (wsz.gx)));
        var rows = Math.max(1, Math.floor((t.h - pad * 2 - 3) / wsz.gy));
        var gridW = (cols - 1) * wsz.gx + wsz.w;
        var ox = t.x + (t.w - gridW) / 2;
        for (var rr = 0; rr < rows; rr++) {
          for (var cc = 0; cc < cols; cc++) {
            var wx = ox + cc * wsz.gx, wy = t.y + pad + 3 + rr * wsz.gy;
            if (wy + wsz.h > hz - 2) continue;
            if (occluded(wx + wsz.w / 2, wy + wsz.h / 2, tw.layer, tw)) continue;
            var rv = r();
            var thr = rv < 0.14 ? 9 : Math.pow(r(), 1.15) * 0.78 + 0.22 * (wx / W);
            wins.push({ x: wx, y: wy, w: wsz.w, h: wsz.h, thr: thr, c: r() * 3 | 0, b: tw.id, t: ti, r: rr, L: tw.layer });
          }
        }
      });
    });

    // stars
    for (var s2 = 0; s2 < 90; s2++) {
      starsList.push({ x: r() * W, y: r() * hz * 0.62, r: r() * 0.9 + 0.25, a: 0.25 + r() * 0.6 });
    }
  }

  function occluded(px, py, layer, own) {
    for (var i = 0; i < tiers.length; i++) {
      var tw = tiers[i];
      if (tw.layer <= layer || tw === own) continue;
      for (var j = 0; j < tw.tiers.length; j++) {
        var t = tw.tiers[j];
        if (px >= t.x - 1 && px <= t.x + t.w + 1 && py >= t.y - 1) return true;
      }
    }
    return false;
  }

  function bakeSky() {
    var c = skyC;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    var g = c.createLinearGradient(0, 0, 0, hz);
    pal.sky.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    c.fillStyle = g; c.fillRect(0, 0, W, hz + 2);
    // horizon haze
    var hg = c.createRadialGradient(W * 0.5, hz, 10, W * 0.5, hz, W * 0.7);
    hg.addColorStop(0, pal.haze); hg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = hg; c.fillRect(0, 0, W, hz + 2);
    if (pal.stars) {
      starsList.forEach(function (s) {
        c.globalAlpha = s.a * (1 - s.y / (hz * 0.7));
        c.fillStyle = '#dbe6ff';
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.283); c.fill();
      });
      c.globalAlpha = 1;
    } else {
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.beginPath(); c.arc(W * 0.18, hz * 0.34, 1.6, 0, 6.283); c.fill();
    }
    // layers
    for (var L = 0; L < 3; L++) {
      drawLayer(c, L);
      if (L === 0) {
        var mg = c.createLinearGradient(0, hz * 0.42, 0, hz);
        mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, pal.mist);
        c.fillStyle = mg; c.fillRect(0, hz * 0.42, W, hz * 0.58 + 1);
      }
      if (L === 1) {
        var mg2 = c.createLinearGradient(0, hz * 0.6, 0, hz);
        mg2.addColorStop(0, 'rgba(0,0,0,0)'); mg2.addColorStop(1, pal.mist.replace(/[\d.]+\)$/, '0.22)'));
        c.fillStyle = mg2; c.fillRect(0, hz * 0.6, W, hz * 0.4 + 1);
      }
    }
    // dim windows baked
    wins.forEach(function (w) {
      c.fillStyle = pal.winOff[w.L];
      c.fillRect(w.x, w.y, w.w, w.h);
    });
    // waterfront
    c.fillStyle = themeName === 'dark' ? '#030610' : '#59678a';
    c.fillRect(0, hz, W, 2);
    c.fillStyle = pal.lamp;
    for (var lx = 14; lx < W; lx += 38) {
      c.globalAlpha = 0.75;
      c.beginPath(); c.arc(lx, hz + 1, 1.3, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
  }

  function drawLayer(c, L) {
    c.fillStyle = pal.layers[L];
    tiers.forEach(function (tw) {
      if (tw.layer !== L) return;
      tw.tiers.forEach(function (t) { c.fillRect(t.x, t.y, t.w, t.h + 1); });
      // lit right edge
      c.fillStyle = pal.edge;
      tw.tiers.forEach(function (t) { c.fillRect(t.x + t.w - 1.2, t.y, 1.2, t.h); });
      c.fillStyle = pal.layers[L];
      roof(c, tw, L);
    });
  }

  function roof(c, tw, L) {
    var cx = tw.cx, y = tw.topY, w = tw.topW;
    c.strokeStyle = pal.layers[L]; c.lineWidth = 1.3; c.fillStyle = pal.layers[L];
    var u = clamp(H / 900, 0.72, 1.25);
    if (tw.roof === 'antenna') {
      c.beginPath(); c.moveTo(cx, y); c.lineTo(cx, y - 36 * u); c.stroke();
      c.fillRect(cx - 2.5, y - 8 * u, 5, 8 * u);
    } else if (tw.roof === 'water') {
      var tx = tw.tiers[tw.tiers.length - 1].x + w * 0.25;
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(tx, y); c.lineTo(tx + 1, y - 7 * u); c.moveTo(tx + 9 * u, y); c.lineTo(tx + 8 * u, y - 7 * u); c.stroke();
      c.fillRect(tx - 1, y - 18 * u, 11 * u, 11 * u);
      c.beginPath(); c.moveTo(tx - 2, y - 18 * u); c.lineTo(tx + 4.5 * u, y - 24 * u); c.lineTo(tx + 12 * u, y - 18 * u); c.closePath(); c.fill();
    } else if (tw.roof === 'crown') {
      c.fillRect(cx - w * 0.3, y - 7 * u, w * 0.6, 7 * u);
      c.fillRect(cx - w * 0.16, y - 14 * u, w * 0.32, 7 * u);
      c.beginPath(); c.moveTo(cx, y - 14 * u); c.lineTo(cx, y - 30 * u); c.stroke();
    } else if (tw.roof === 'spire') {
      c.beginPath(); c.moveTo(cx - w * 0.5, y); c.lineTo(cx, y - 52 * u); c.lineTo(cx + w * 0.5, y); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(cx, y - 52 * u); c.lineTo(cx, y - 96 * u); c.stroke();
      c.fillRect(cx - 2, y - 70 * u, 4, 18 * u);
    } else if (tw.roof === 'flat') {
      c.fillRect(tw.tiers[tw.tiers.length - 1].x - 1.5, y - 3, w + 3, 3);
    }
  }

  function drawWindows() {
    var c = winC;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    var on = pal.winOn;
    var base = 0.14 + progress * 0.98;
    var hb = -1, ht = -1, hr = -1;
    if (pointer.on) {
      for (var i = tiers.length - 1; i >= 0 && hb < 0; i--) {
        var tw = tiers[i];
        for (var j = 0; j < tw.tiers.length; j++) {
          var t = tw.tiers[j];
          if (pointer.x >= t.x && pointer.x <= t.x + t.w && pointer.y >= t.y && pointer.y <= t.y + t.h) { hb = tw.id; ht = j; break; }
        }
      }
    }
    var hrow = -1;
    if (hb >= 0) {
      var best = 1e9;
      for (var k = 0; k < wins.length; k++) {
        var w0 = wins[k];
        if (w0.b === hb && w0.t === ht) {
          var d0 = Math.abs(w0.y + w0.h / 2 - pointer.y);
          if (d0 < best) { best = d0; hrow = w0.r; }
        }
      }
    }
    for (var n = 0; n < wins.length; n++) {
      var w = wins[n];
      var a = clamp((base - w.thr) / 0.06, 0, 1);
      var boost = 0;
      if (pointer.on) {
        var dx = w.x - pointer.x, dy = w.y - pointer.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 6400) boost = Math.max(boost, 1 - d2 / 6400);
        if (hb >= 0 && w.b === hb && w.t === ht && w.r === hrow && w.thr < 9) boost = 1;
      }
      if (boost > 0 && w.thr < 9) a = Math.max(a, boost);
      if (a <= 0.01) continue;
      c.fillStyle = on[w.c];
      if (w.L > 0) {
        c.globalAlpha = a * 0.14;
        c.fillRect(w.x - 1.2, w.y - 1.2, w.w + 2.4, w.h + 2.4);
      }
      c.globalAlpha = a * (w.L === 0 ? 0.72 : 0.95);
      c.fillRect(w.x, w.y, w.w, w.h);
    }
    c.globalAlpha = 1;
    // sign tower roof glow handled via DOM
    compC.setTransform(1, 0, 0, 1, 0, 0);
    compC.clearRect(0, 0, compBuf.width, compBuf.height);
    compC.drawImage(skyBuf, 0, 0);
    compC.drawImage(winBuf, 0, 0);
    winDirty = false;
  }

  function seedRain() {
    var n = Math.round(clamp(W / 11, 50, 150));
    var r = rng(99);
    drops = [];
    for (var i = 0; i < n; i++) {
      drops.push({ x: r() * (W + 200) - 100, y: r() * H, len: 8 + r() * 16, sp: 520 + r() * 520, a: 0.35 + r() * 0.65 });
    }
    ripples = [];
  }

  function drawStar(t, mirror) {
    if (!star) return;
    var k = (t - star.t0) / star.dur;
    if (k < 0 || k > 1) return;
    var e = 1 - Math.pow(1 - k, 2.2);
    var hx = star.x0 + star.dx * e, hy = star.y0 + star.dy * e;
    var tx = hx - star.dx * 0.16 * Math.min(1, k * 4), ty = hy - star.dy * 0.16 * Math.min(1, k * 4);
    var fade = k < 0.12 ? k / 0.12 : 1 - Math.pow((k - 0.12) / 0.88, 1.6);
    var yy = function (y) { return mirror ? hz + (hz - y) * 0.5 : y; };
    var g = ctx.createLinearGradient(tx, yy(ty), hx, yy(hy));
    var rgb = pal.star;
    g.addColorStop(0, 'rgba(' + rgb + ',0)');
    g.addColorStop(1, 'rgba(' + rgb + ',' + (0.95 * fade * (mirror ? 0.3 : 1)) + ')');
    ctx.strokeStyle = g; ctx.lineWidth = mirror ? 1 : 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, yy(ty)); ctx.lineTo(hx, yy(hy)); ctx.stroke();
    if (!mirror) {
      ctx.fillStyle = 'rgba(' + rgb + ',' + fade + ')';
      ctx.beginPath(); ctx.arc(hx, hy, 2.1, 0, 6.283); ctx.fill();
    }
  }

  function render(t) {
    if (winDirty) drawWindows();
    var op = 1 - 0.58 * clamp(scrollY / (H * 0.9), 0, 1);
    canvas.style.opacity = op.toFixed(3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(compBuf, 0, 0, W, H);

    // water
    var wg = ctx.createLinearGradient(0, hz, 0, H);
    wg.addColorStop(0, pal.water[0]); wg.addColorStop(0.5, pal.water[1]); wg.addColorStop(1, pal.water[2]);
    ctx.fillStyle = wg; ctx.fillRect(0, hz + 1, W, H - hz);
    var K = 0.5, wh = H - hz, still = mqReduce.matches;
    for (var y = hz + 2; y < H; y += 3) {
      var d = y - hz;
      var sy = hz - d / K;
      if (sy < 0) break;
      var off = still ? Math.sin(d * 0.09) * 1.2 : Math.sin(d * 0.09 + t * 1.5) * (1.4 + d * 0.035) + Math.sin(d * 0.21 - t * 2.3) * 0.8;
      ctx.globalAlpha = pal.reflect * (1 - Math.pow(d / wh, 0.9) * 0.82);
      ctx.drawImage(compBuf, 0, sy * dpr, compBuf.width, (3 / K) * dpr, off, y, W, 3);
    }
    ctx.globalAlpha = 1;
    // sheen over the water surface
    var sg = ctx.createLinearGradient(0, hz, 0, H);
    sg.addColorStop(0, themeName === 'dark' ? 'rgba(5,10,24,0)' : 'rgba(255,255,255,0.0)');
    sg.addColorStop(1, themeName === 'dark' ? 'rgba(2,4,10,0.55)' : 'rgba(110,125,175,0.35)');
    ctx.fillStyle = sg; ctx.fillRect(0, hz + 1, W, wh);

    if (!still) {
      // star schedule
      var s = t;
      if (!star && s > nextStar) {
        var r = Math.random();
        var dir = Math.random() < 0.5 ? 1 : -1;
        star = {
          t0: s, dur: 1.5,
          x0: dir > 0 ? W * (0.1 + r * 0.45) : W * (0.55 + r * 0.4),
          y0: hz * (0.06 + Math.random() * 0.16),
          dx: dir * W * (0.28 + Math.random() * 0.12), dy: hz * (0.2 + Math.random() * 0.1)
        };
      }
      if (star && t - star.t0 > star.dur) { star = null; nextStar = t + 8 + Math.random() * 4; }
      drawStar(t, false); drawStar(t, true);

      // rain
      var dt = Math.min(0.05, (t - (render.last || t)) || 0.016);
      render.last = t;
      ctx.lineWidth = 1; ctx.lineCap = 'round';
      for (var b = 0; b < 3; b++) {
        ctx.strokeStyle = pal.rain + (pal.rainA * (0.45 + b * 0.3)).toFixed(3) + ')';
        ctx.beginPath();
        for (var i = b; i < drops.length; i += 3) {
          var p = drops[i];
          p.y += p.sp * dt; p.x -= p.sp * dt * 0.2;
          if (p.y > H) {
            if (p.y - p.sp * dt < H && Math.random() < 0.22 && ripples.length < 16) {
              ripples.push({ x: p.x, y: hz + 8 + Math.random() * (H - hz - 14), r: 1, life: 0 });
            }
            p.y = -p.len; p.x = Math.random() * (W + 200) - 40;
          }
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len * 0.2, p.y - p.len);
        }
        ctx.stroke();
      }
      for (var q = ripples.length - 1; q >= 0; q--) {
        var rp = ripples[q];
        rp.life += dt; rp.r += dt * 26;
        var al = 1 - rp.life / 1.3;
        if (al <= 0) { ripples.splice(q, 1); continue; }
        ctx.strokeStyle = pal.ripple + (al * 0.38).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.28, 0, 0, 6.283); ctx.stroke();
      }
    }
  }

  function frame(now) {
    if (!running) return;
    render((now - startT) / 1000);
    rafId = requestAnimationFrame(frame);
  }
  function shouldRun() {
    return !document.hidden && heroVisible && !mqReduce.matches;
  }
  function sync() {
    var want = shouldRun();
    if (want && !running) { running = true; render.last = undefined; rafId = requestAnimationFrame(frame); }
    else if (!want && running) { running = false; cancelAnimationFrame(rafId); }
  }
  var pending = false;
  function drawOnce() {
    if (running || pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; render((performance.now() - startT) / 1000); });
  }

  function updateSign() {
    if (!signEl) return;
    if (!sign || getComputedStyle(signEl).position === 'relative') return;
    signEl.style.display = '';
    var sw = signEl.offsetWidth || 280;
    var left = clamp(sign.cx - sw / 2, 10, W - sw - 10);
    signEl.style.left = left + 'px';
    signEl.style.top = (sign.roofY - 3) + 'px';
    var posts = signEl.querySelector('.sign-posts');
    if (posts) {
      posts.style.left = clamp(sign.cx - left - 28, 14, sw - 56) + 'px';
    }
  }
  function onScroll() {
    scrollY = window.pageYOffset || 0;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var np = clamp(scrollY / max, 0, 1);
    if (Math.abs(np - progress) > 0.002) { progress = np; winDirty = true; }
    if (signEl && getComputedStyle(signEl).position === 'fixed') {
      var o = 1 - clamp(scrollY / (H * 0.55), 0, 1);
      signEl.style.opacity = o.toFixed(3);
    }
    drawOnce();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || scrollY > H * 0.7) { if (pointer.on) { pointer.on = false; winDirty = true; drawOnce(); } return; }
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = pointer.y < hz;
    winDirty = true; drawOnce();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { pointer.on = false; winDirty = true; drawOnce(); });

  document.addEventListener('visibilitychange', sync);
  mqReduce.addEventListener && mqReduce.addEventListener('change', function () { sync(); drawOnce(); });
  if (heroEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(heroEl);
  }
  document.addEventListener('rm:themechange', function () {
    themeName = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    pal = PALETTES[themeName];
    bakeSky(); winDirty = true; drawOnce();
  });
  var rt;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var nw = canvas.clientWidth, nh = canvas.clientHeight;
      if (nw !== lastW || Math.abs(nh - lastH) > 90) { setup(); onScroll(); }
    }, 140);
  }
  window.addEventListener('resize', onResize);
  var fontsReady = document.fonts && document.fonts.ready;
  setup();
  onScroll();
  sync();
  if (fontsReady) fontsReady.then(function () { updateSign(); });
  window.NocturneScene = { get sign() { return sign; } };
})();
