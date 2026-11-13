(function () {
  'use strict';
  var root = document.documentElement, body = document.body;
  var PAGE = body.getAttribute('data-page');
  var mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = mqRM.matches;
  var NS = 'http://www.w3.org/2000/svg';
  function $(s, c) { return (c || document).querySelector(s); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return '#' + A.map(function (v, i) { var x = Math.round(lerp(v, B[i], t)); return (x < 16 ? '0' : '') + x.toString(16); }).join(''); }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function r1(n) { return Math.round(n * 10) / 10; }

  var PAL = {
    light: {
      A: { skyTop: '#1c63b8', skyMid: '#2a72c2', skyLow: '#a9d4f2', glow: '#fff3c4', clLit: '#fff6dc', clRim: '#fffdf2', clMid: '#e3ecf8', clShade: '#7f9ccb', mtFar: '#8ea6d6', mtMid: '#6f94c4', mtNear: '#3f9a6a', hillB: '#5db26a', hillF: '#3f9d4f', haze: '#cfe6f6', gD: '#1f7a3c', gM: '#3aa655', gL: '#8ccf4a', gY: '#c3dd55' },
      B: { skyTop: '#2a62a8', skyMid: '#356fb4', skyLow: '#f6d9a0', glow: '#ffd98a', clLit: '#ffe2a8', clRim: '#fff2c8', clMid: '#f1d6bf', clShade: '#8f8ab8', mtFar: '#a39cc8', mtMid: '#8788bd', mtNear: '#4f9b60', hillB: '#6cb85a', hillF: '#4aa046', haze: '#f6dfb5', gD: '#2a7a35', gM: '#52a845', gL: '#b5d445', gY: '#e6dc58' }
    },
    dark: {
      A: { skyTop: '#1a1f5c', skyMid: '#4a3a8c', skyLow: '#e6806a', glow: '#ffb98a', clLit: '#cdb0e4', clRim: '#f3d9ee', clMid: '#7459a8', clShade: '#302f76', mtFar: '#4b3f8a', mtMid: '#35306e', mtNear: '#1c2f4f', hillB: '#1f4a5a', hillF: '#17413f', haze: '#b0607a', gD: '#0f3b3a', gM: '#1b6a58', gL: '#3f9a72', gY: '#6bb88a' },
      B: { skyTop: '#080a26', skyMid: '#121a4a', skyLow: '#2a3a7a', glow: '#9fb4ff', clLit: '#8fa2dc', clRim: '#dfe8ff', clMid: '#3c4590', clShade: '#171d4c', mtFar: '#1a2058', mtMid: '#121846', mtNear: '#0f1d38', hillB: '#123245', hillF: '#0c2630', haze: '#26336e', gD: '#0a2a30', gM: '#14504a', gL: '#2c7f68', gY: '#4aa088' }
    }
  };
  var cur = {}, theme = root.dataset.theme || 'light', progress = 0, shown = -1;
  var CSSKEYS = ['skyTop', 'skyMid', 'skyLow', 'glow', 'clLit', 'clRim', 'clMid', 'clShade', 'mtFar', 'mtMid', 'mtNear', 'hillB', 'hillF', 'haze'];
  function applyTime(p) {
    var P = PAL[theme] || PAL.light;
    for (var k in P.A) cur[k] = mix(P.A[k], P.B[k], p);
    CSSKEYS.forEach(function (k) { root.style.setProperty('--w-' + k, cur[k]); });
    starVis = theme === 'dark' ? lerp(.4, 1, p) : 0;
    shown = p;
  }
  var starVis = 0;

  /* world: clouds and landscape */
  var cloudsEl = $('#clouds'), landEl = $('#land');
  var vw = 0, vh = 0;
  function cloudSvg(w, seed, tall) {
    var R = rng(seed), puffs = [], W = w * 1.4, H = w * (tall ? 1.1 : .78), base = H * .9, cx = W / 2, i, t;
    var nb = 9;
    for (i = 0; i < nb; i++) { var k = (i + .5) / nb - .5, r = w * (.12 + R() * .05) * (1 - Math.abs(k) * .5); puffs.push({ x: cx + k * w * 1.02 + (R() - .5) * r * .4, y: base - r * .92, r: r }); }
    var nt = tall ? 3 : 2;
    for (t = 0; t < nt; t++) {
      var kk = nt === 1 ? 0 : t / (nt - 1) - .5, tx = cx + kk * w * .62 + (R() - .5) * w * .08, f = (.55 + R() * .45) * (1 - Math.abs(kk) * .35), R0 = w * (.17 + R() * .03) * (tall ? 1.1 : 1), lv = Math.max(2, Math.round(1.5 + f * (tall ? 3.6 : 2.4)));
      for (i = 0; i < lv; i++) {
        var rr = R0 * (1 - i * .15), yy = base - R0 * .95 - i * R0 * .66, nsp = i === lv - 1 ? 1 : 3;
        for (var j = 0; j < nsp; j++) puffs.push({ x: tx + (nsp === 1 ? 0 : (j - 1) * rr * .72) + (R() - .5) * rr * .25, y: yy - (j === 1 ? rr * .12 : 0) + (R() - .5) * rr * .2, r: rr * (nsp === 1 ? .85 : .78 + R() * .3) });
      }
    }
    var s = el('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H });
    var g = el('g', {}, s);
    [[1, 0, 0, 'cl-shade', '#paint-c'], [.88, .1, -.2, 'cl-mid', '#paint-cs'], [.64, .2, -.42, 'cl-lit', '#paint-cs'], [.3, .3, -.7, 'cl-rim', '#paint-cs']].forEach(function (L) {
      var gg = el('g', { 'class': L[3], filter: 'url(' + L[4] + ')' }, g);
      puffs.forEach(function (p) { if (L[3] === 'cl-rim' && p.y > base - p.r * 1.2) return; el('circle', { cx: r1(p.x + L[1] * p.r), cy: r1(p.y + L[2] * p.r), r: r1(p.r * L[0]) }, gg); });
    });
    var wg = el('g', { 'class': 'cl-lit', filter: 'url(#paint-cs)', opacity: .55 }, s);
    for (i = 0; i < 3; i++) el('ellipse', { cx: r1(cx + (R() - .5) * w * 1.1), cy: r1(base - w * (.02 + R() * .12)), rx: r1(w * (.14 + R() * .12)), ry: r1(w * .016), 'class': '' }, wg);
    return { svg: s, W: W, H: H, base: base };
  }
  function buildClouds() {
    cloudsEl.textContent = '';
    var mobile = vw < 700, defs = mobile
      ? [{ x: .86, y: .64, w: .7, t: 1 }, { x: .74, y: .60, w: .62 }, { x: .2, y: .66, w: .5 }, { x: .9, y: .09, w: .28 }]
      : [{ x: .9, y: .6, w: .38, t: 1 }, { x: .79, y: .34, w: .3 }, { x: .64, y: .6, w: .22 }, { x: .97, y: .56, w: .17 }, { x: .1, y: .66, w: .17 }, { x: .56, y: .12, w: .13 }];
    defs.forEach(function (d, i) {
      var w = d.w * vw, c = cloudSvg(w, 40 + i * 13, d.t);
      c.svg.style.left = r1(d.x * vw - c.W / 2) + 'px';
      c.svg.style.top = r1(d.y * vh - c.base) + 'px';
      c.svg.style.animationDuration = (70 + i * 17) + 's';
      c.svg.style.animationDelay = (-i * 23) + 's';
      c.svg.style.position = 'absolute';
      cloudsEl.appendChild(c.svg);
    });
  }
  function ridge(R, n, base, amp, sharp) {
    var pts = [], step = vw / n;
    for (var i = -1; i <= n + 1; i++) {
      var peak = (i % 2 === 0) ? 1 : .35 + R() * .3;
      var big = .55 + .45 * Math.sin(i * .55 + sharp) * Math.sin(i * .21 + 1);
      pts.push([i * step + (R() - .5) * step * .35, base - amp * peak * (.45 + .55 * Math.abs(big)) * (.7 + R() * .5)]);
    }
    return pts;
  }
  function polyD(pts, base) { return 'M' + pts.map(function (p) { return r1(p[0]) + ' ' + r1(p[1]); }).join('L') + 'L' + r1(pts[pts.length - 1][0]) + ' ' + base + 'L' + r1(pts[0][0]) + ' ' + base + 'Z'; }
  function buildLand() {
    landEl.textContent = '';
    var s = el('svg', { viewBox: '0 0 ' + vw + ' ' + vh, preserveAspectRatio: 'none' }, landEl);
    var mobile = vw < 700, R = rng(21), B = vh;
    var gF = el('g', { filter: 'url(#paint)' }, s);
    var far = ridge(R, mobile ? 6 : 12, B * .62, B * .24, 1);
    el('path', { d: polyD(far, B), style: 'fill:var(--w-mtFar)' }, gF);
    far.forEach(function (p, i) { if (i % 2 === 0 && p[1] < B * .5) { var h = (B * .62 - p[1]) * .3; el('path', { d: 'M' + r1(p[0]) + ' ' + r1(p[1]) + 'L' + r1(p[0] + h * .55) + ' ' + r1(p[1] + h) + 'L' + r1(p[0] + h * .15) + ' ' + r1(p[1] + h * .7) + 'L' + r1(p[0] - h * .2) + ' ' + r1(p[1] + h * .95) + 'L' + r1(p[0] - h * .5) + ' ' + r1(p[1] + h) + 'Z', style: 'fill:var(--w-clLit);opacity:.5' }, gF); } });
    var mid = ridge(R, mobile ? 5 : 9, B * .68, B * .17, 3);
    el('path', { d: polyD(mid, B), style: 'fill:var(--w-mtMid)' }, gF);
    mid.forEach(function (p, i) { if (i % 2 === 0) { var h = (B * .68 - p[1]); el('path', { d: 'M' + r1(p[0]) + ' ' + r1(p[1]) + 'L' + r1(p[0] - h * .55) + ' ' + r1(p[1] + h * .95) + 'L' + r1(p[0] - h * .08) + ' ' + r1(p[1] + h * .95) + 'Z', fill: '#0b1a2a', opacity: .16 }, gF); } });
    var hz = el('defs', {}, s), lg = el('linearGradient', { id: 'hazeg', x1: 0, y1: 0, x2: 0, y2: 1 }, hz);
    el('stop', { offset: 0, style: 'stop-color:var(--w-haze);stop-opacity:0' }, lg); el('stop', { offset: 1, style: 'stop-color:var(--w-haze);stop-opacity:.7' }, lg);
    el('rect', { x: 0, y: r1(B * .5), width: vw, height: r1(B * .24), fill: 'url(#hazeg)' }, s);
    var gN = el('g', { filter: 'url(#paint)' }, s);
    var near = ridge(R, mobile ? 4 : 7, B * .75, B * .12, 5);
    var nd = 'M0 ' + B; near.forEach(function (p, i) { var q = near[i - 1]; if (q) nd += 'Q' + r1((q[0] + p[0]) / 2) + ' ' + r1(Math.min(q[1], p[1]) - 10) + ' ' + r1(p[0]) + ' ' + r1(p[1]); else nd += 'L' + r1(p[0]) + ' ' + r1(p[1]); }); nd += 'L' + vw + ' ' + B + 'Z';
    el('path', { d: nd, style: 'fill:var(--w-mtNear)' }, gN);
    for (var i = 0; i < (mobile ? 22 : 60); i++) { var x = R() * vw, y = B * (.66 + R() * .09); el('path', { d: 'M' + r1(x) + ' ' + r1(y) + 'l' + r1(10 + R() * 22) + ' ' + r1(-6 - R() * 10), stroke: 'var(--w-hillB)', 'stroke-width': 3, opacity: .28, 'stroke-linecap': 'round' }, gN); }
    function yb(x) { return B * .73 + Math.sin(x * .004 + 1) * B * .016 + Math.sin(x * .011) * B * .006; }
    function yf(x) { return B * .8 + Math.sin(x * .003 + 3) * B * .018; }
    function hill(fn, key) { var d = 'M0 ' + B; for (var x = 0; x <= vw + 20; x += 20) d += 'L' + x + ' ' + r1(fn(x)); return d + 'L' + vw + ' ' + B + 'Z'; }
    var gB = el('g', { filter: 'url(#paint)' }, s);
    el('path', { d: hill(yb), style: 'fill:var(--w-hillB)' }, gB);
    var sc = clamp(vw / 1500, .6, 1.1);
    for (var t = 0; t < (mobile ? 6 : 14); t++) { var tx = R() * vw, ty = yb(tx) + 6, rr = (10 + R() * 12) * sc; el('rect', { x: r1(tx - 1.5), y: r1(ty - rr * .5), width: 3, height: r1(rr * .6), fill: '#3a2a22' }, gB); el('circle', { cx: r1(tx), cy: r1(ty - rr * 1.1), r: r1(rr), style: 'fill:var(--w-mtNear)' }, gB); el('circle', { cx: r1(tx + rr * .25), cy: r1(ty - rr * 1.35), r: r1(rr * .6), style: 'fill:var(--w-hillF);opacity:.5' }, gB); }
    var wx = mobile ? vw * .76 : vw * .84, wy = yb(wx) + 8, k = (mobile ? .8 : 1) * sc * 1.1;
    var g = el('g', { transform: 'translate(' + r1(wx) + ' ' + r1(wy) + ') scale(' + r1(k) + ')' }, gB);
    el('rect', { x: -34, y: -36, width: 68, height: 38, fill: '#a9734a' }, g);
    el('path', { d: 'M-42 -34L0 -66 42 -34Z', fill: '#c4584a' }, g);
    el('rect', { x: 18, y: -66, width: 9, height: 22, fill: '#7b4b36' }, g);
    el('rect', { x: -22, y: -26, width: 18, height: 16, rx: 2, fill: '#ffe08a', 'class': 'ww-window', stroke: '#4a2c1c', 'stroke-width': 2 }, g);
    el('rect', { x: 8, y: -26, width: 14, height: 28, rx: 2, fill: '#5b3a28' }, g);
    var halo = el('circle', { cx: -13, cy: -18, r: 34, 'class': 'ww-halo', fill: '#ffd98a' }, g); halo.style.opacity = theme === 'dark' ? .22 : 0;
    el('path', { d: 'M22 -70C16 -82 30 -86 24 -100', fill: 'none', stroke: '#fff', 'stroke-opacity': .5, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    var gW = el('g', {}, s);
    var cols = theme === 'dark' ? ['#cfe0ff', '#ffd98a', '#ffa0b8', '#a8b4ff'] : ['#ffffff', '#ffd64a', '#ff7a6a', '#b79cff'];
    for (var f = 0; f < (mobile ? 30 : 80); f++) { var fx = R() * vw, fy = yb(fx) + 10 + R() * (B * .05); el('circle', { cx: r1(fx), cy: r1(fy), r: r1(1.2 + R() * 1.6), fill: cols[f % 4], opacity: .85 }, gW); }
    var gH2 = el('g', { filter: 'url(#paint)' }, s);
    el('path', { d: hill(yf), style: 'fill:var(--w-hillF)' }, gH2);
    landEl._cols = gW;
  }
  function recolorFlowers() {
    var g = landEl._cols; if (!g) return; var cols = theme === 'dark' ? ['#cfe0ff', '#ffd98a', '#ffa0b8', '#a8b4ff'] : ['#ffffff', '#ffd64a', '#ff7a6a', '#b79cff'];
    Array.prototype.forEach.call(g.children, function (c, i) { c.setAttribute('fill', cols[i % 4]); });
    var h = $('.ww-halo', landEl); if (h) h.style.opacity = theme === 'dark' ? .22 : 0;
  }

  /* canvases */
  var cvS = $('#stars'), cvG = $('#grass'), cvF = $('#fx');
  var ctxS = cvS.getContext('2d'), ctxG = cvG.getContext('2d'), ctxF = cvF.getContext('2d');
  var dpr = 1, gH = 0, stars = [], N = 0, X, Y, H, W, PH, BN, VL, BAND, TONE, groups = [], flowers = [], flies = [];
  function buildStars() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvS.width = vw * dpr; cvS.height = vh * dpr; cvS.style.height = vh + 'px';
    var R = rng(5), n = vw < 700 ? 90 : 180; stars = [];
    for (var i = 0; i < n; i++) stars.push({ x: R() * vw, y: R() * vh * .62, r: .4 + R() * 1.3, p: R() * 6.28, s: .6 + R() * 1.6 });
  }
  function drawStars(t) {
    ctxS.setTransform(dpr, 0, 0, dpr, 0, 0); ctxS.clearRect(0, 0, vw, vh);
    if (theme !== 'dark') return;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = starVis * (reduced ? .8 : .45 + .55 * Math.sin(t * s.s + s.p) * .5 + .27);
      ctxS.fillStyle = 'rgba(255,248,225,' + clamp(a, 0, 1) + ')';
      ctxS.beginPath(); ctxS.arc(s.x, s.y, s.r, 0, 6.283); ctxS.fill();
    }
  }
  function buildGrass() {
    var mobile = vw < 700; gH = Math.round(vh * .4);
    cvG.width = vw * dpr; cvG.height = gH * dpr; cvG.style.height = gH + 'px';
    N = mobile ? Math.min(850, Math.round(vw * 2.2)) : Math.min(2400, Math.round(vw * 1.6));
    X = new Float32Array(N); Y = new Float32Array(N); H = new Float32Array(N); W = new Float32Array(N); PH = new Float32Array(N); BN = new Float32Array(N); VL = new Float32Array(N); BAND = new Uint8Array(N); TONE = new Uint8Array(N);
    var R = rng(7), sc = clamp(vw / 1400, .75, 1.15); groups = []; for (var g = 0; g < 8; g++) groups.push([]);
    for (var i = 0; i < N; i++) {
      var d = Math.pow(R(), .85); X[i] = R() * (vw + 40) - 20; Y[i] = lerp(gH * .3, gH + 6, d);
      H[i] = lerp(16, 86, d) * (.7 + R() * .6) * sc; W[i] = lerp(1.3, 3.2, d) * (.8 + R() * .5); PH[i] = R() * 6.28;
      BAND[i] = d < .25 ? 0 : d < .5 ? 1 : d < .75 ? 2 : 3; TONE[i] = R() < .42 ? 1 : 0; groups[BAND[i] * 2 + TONE[i]].push(i);
    }
    flowers = []; var fN = mobile ? 26 : 70;
    for (var f = 0; f < fN; f++) { var idx = Math.floor(R() * N), tries = 0; while (BAND[idx] < 1 && tries++ < 20) idx = Math.floor(R() * N); H[idx] *= 1.15; flowers.push({ i: idx, c: Math.floor(R() * 4), r: 1.8 + R() * 1.8 }); }
    flies = []; var fl = mobile ? 14 : 28; for (var j = 0; j < fl; j++) flies.push({ x: R() * vw, y: gH * (.1 + R() * .8), p: R() * 6.28, s: .3 + R() * .7, a: 10 + R() * 30 });
  }
  var pointer = { x: -9999, y: -9999, vx: 0 }, gusts = [], parts = [], meteors = [], nextGust = 3.5, nextMeteor = 2.5;
  function gustAt(x, t) { var s = 0; for (var i = 0; i < gusts.length; i++) { var g = gusts[i], gx = g.x0 + g.v * (t - g.t0), u = (x - gx) / g.wid; s += g.amp * Math.exp(-u * u) * clamp(1 - (t - g.t0) / g.life, 0, 1); } return s; }
  var FL = { light: ['#ffffff', '#ffd64a', '#ff7a6a', '#b79cff'], dark: ['#cfe0ff', '#ffd98a', '#ffa0b8', '#a8b4ff'] };
  function drawGrass(t, dt) {
    var c = ctxG, top = vh - gH, px = pointer.x, py = pointer.y - top, R = Math.max(90, vw * .075), R2 = R * R, i, j;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, vw, gH);
    var dark = theme === 'dark', P = cur;
    var bandCol = [
      [mix(P.gM, P.haze, dark ? .25 : .45), mix(P.gL, P.haze, dark ? .25 : .4)],
      [P.gM, P.gL],
      [mix(P.gM, P.gD, .45), P.gL],
      [P.gD, mix(P.gM, P.gL, .5)]
    ];
    for (i = 0; i < N; i++) {
      var x = X[i], wind = Math.sin(x * .006 + t * .8) * .5 + Math.sin(x * .017 - t * 1.6 + PH[i]) * .2 + gustAt(x, t) * 1.4;
      var target = reduced ? Math.sin(x * .006 + PH[i] * .2) * .12 : wind * .3;
      var dx = x - px, dy = Y[i] - H[i] * .5 - py, d2 = dx * dx + dy * dy;
      if (d2 < R2) { var d = Math.sqrt(d2), k = 1 - d / R; target += (dx >= 0 ? 1 : -1) * k * k * 1.15 + pointer.vx * k * .004; }
      var acc = (target - BN[i]) * 40 - VL[i] * 7; VL[i] += acc * dt; BN[i] += VL[i] * dt;
    }
    for (var g = 0; g < 8; g++) {
      var lst = groups[g]; if (!lst.length) continue;
      c.fillStyle = bandCol[g >> 1][g & 1]; c.beginPath();
      for (j = 0; j < lst.length; j++) {
        i = lst[j]; var bx = X[i], by = Y[i], h = H[i], bn = clamp(BN[i], -1.3, 1.3), w = W[i], bend = bn * h;
        var tx = bx + bend, ty = by - h * (1 - Math.abs(bn) * .28), cx = bx + bend * .25, cy = by - h * .62;
        c.moveTo(bx - w, by); c.quadraticCurveTo(cx - w * .6, cy, tx, ty); c.quadraticCurveTo(cx + w * .6, cy, bx + w, by);
      }
      c.fill();
    }
    var fc = FL[dark ? 'dark' : 'light'];
    for (j = 0; j < flowers.length; j++) {
      var F = flowers[j]; i = F.i; var bn2 = clamp(BN[i], -1.3, 1.3), fx = X[i] + bn2 * H[i], fy = Y[i] - H[i] * (1 - Math.abs(bn2) * .28);
      if (dark) { c.fillStyle = fc[F.c]; c.globalAlpha = .18; c.beginPath(); c.arc(fx, fy, F.r * 3, 0, 6.283); c.fill(); c.globalAlpha = 1; }
      c.fillStyle = fc[F.c]; c.beginPath(); c.arc(fx, fy, F.r, 0, 6.283); c.fill();
    }
    for (j = 0; j < flies.length; j++) {
      var f = flies[j], tt = reduced ? 0 : t, fxp = f.x + Math.sin(tt * f.s + f.p) * f.a, fyp = f.y + Math.cos(tt * f.s * .8 + f.p) * f.a * .5 - (dark ? 0 : (tt * 6 % gH) * .3);
      var al = dark ? .5 + .5 * Math.sin(tt * 1.7 + f.p) : .55;
      if (!dark && fyp < 0) fyp += gH;
      if (dark) { c.fillStyle = 'rgba(255,226,140,' + (al * .18) + ')'; c.beginPath(); c.arc(fxp, fyp, 8, 0, 6.283); c.fill(); }
      c.fillStyle = dark ? 'rgba(255,240,170,' + al + ')' : 'rgba(255,255,235,' + al + ')'; c.beginPath(); c.arc(fxp, fyp, dark ? 1.9 : 1.5, 0, 6.283); c.fill();
    }
  }
  function spawnGust(t) {
    var ltr = true;
    gusts.push({ x0: -vw * .3, v: vw * .22, t0: t, life: 7, wid: vw * .18, amp: .7 });
    var n = vw < 700 ? 10 : 18;
    for (var i = 0; i < n; i++) parts.push({ x: -20 - Math.random() * vw * .25, y: vh * (.18 + Math.random() * .62), vx: 150 + Math.random() * 130, ph: Math.random() * 6.28, f: 1.2 + Math.random() * 1.6, r: 2.2 + Math.random() * 2.6, k: Math.floor(Math.random() * 4), rot: Math.random() * 6.28, t0: t, seed: Math.random() < .45 });
  }
  var PC = { light: ['#ffffff', '#ffd9de', '#fff1a8', '#ffffff'], dark: ['#ffe9a8', '#ffd27a', '#cfe0ff', '#ffe9a8'] };
  function drawFx(t, dt) {
    var c = ctxF, dark = theme === 'dark', i;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, vw, vh);
    if (reduced) return;
    if (t > nextGust) { spawnGust(t); nextGust = t + 14 + Math.random() * 10; }
    gusts = gusts.filter(function (g) { return t - g.t0 < g.life; });
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.x += p.vx * dt; p.y += (Math.sin((t - p.t0) * p.f + p.ph) * 28 + 10) * dt; p.rot += dt * 2;
      if (p.x > vw + 30) { parts.splice(i, 1); continue; }
      var col = PC[dark ? 'dark' : 'light'][p.k];
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = col; c.globalAlpha = .9;
      if (p.seed) { c.strokeStyle = col; c.lineWidth = .8; c.beginPath(); for (var a = 0; a < 6; a++) { c.moveTo(0, 0); c.lineTo(Math.cos(a * 1.05) * p.r * 3, Math.sin(a * 1.05) * p.r * 3); } c.stroke(); c.beginPath(); c.arc(0, 0, 1.4, 0, 6.283); c.fill(); }
      else { c.beginPath(); c.ellipse(0, 0, p.r * 1.7, p.r, 0, 0, 6.283); c.fill(); }
      c.restore();
    }
    c.globalAlpha = 1;
    if (dark) {
      if (t > nextMeteor) { var ang = .5 + Math.random() * .25; meteors.push({ x: vw * (.2 + Math.random() * .7), y: vh * (.03 + Math.random() * .22), vx: Math.cos(ang) * -380, vy: Math.sin(ang) * 380, t0: t, life: 1.3 }); nextMeteor = t + 4 + Math.random() * 5; }
      for (i = meteors.length - 1; i >= 0; i--) {
        var m = meteors[i], age = t - m.t0; if (age > m.life) { meteors.splice(i, 1); continue; }
        var hx = m.x + m.vx * age, hy = m.y + m.vy * age, tx = hx - m.vx * .26, ty = hy - m.vy * .26, al = Math.sin(clamp(age / m.life, 0, 1) * Math.PI);
        var gr = c.createLinearGradient(hx, hy, tx, ty); gr.addColorStop(0, 'rgba(255,230,160,' + al + ')'); gr.addColorStop(1, 'rgba(255,230,160,0)');
        c.strokeStyle = gr; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx, hy); c.lineTo(tx, ty); c.stroke();
        c.fillStyle = 'rgba(255,246,210,' + al + ')'; c.beginPath(); c.arc(hx, hy, 2.2, 0, 6.283); c.fill();
      }
    }
  }

  /* glider */
  var gliderEl = $('#glider');
  function placeGlider(t) {
    var gx, gy, rot;
    if (reduced) { gx = vw * (vw < 700 ? .62 : .62); gy = vh * .26; rot = -6; }
    else {
      var u = ((t * .0105 + .12) % 1.25) - .12; gx = u * vw - 60;
      var band = vw < 700 ? .5 : .44;
      gy = vh * band + Math.sin(t * .42) * vh * .035 + Math.sin(t * .9) * 6 - (gusts.length ? 14 : 0);
      rot = Math.cos(t * .42) * 7 - 3;
    }
    gliderEl.style.transform = 'translate3d(' + r1(gx) + 'px,' + r1(gy) + 'px,0) rotate(' + r1(rot) + 'deg)';
  }

  /* resize / rebuild */
  var builtW = 0, builtH = 0;
  function rebuild(force) {
    var w = innerWidth, h = innerHeight;
    if (!force && Math.abs(w - builtW) < 40 && Math.abs(h - builtH) < 140) return;
    builtW = w; builtH = h; vw = w; vh = h;
    ['#fx'].forEach(function () { dpr = Math.min(window.devicePixelRatio || 1, 2); cvF.width = vw * dpr; cvF.height = vh * dpr; });
    buildStars(); buildGrass(); buildClouds(); buildLand(); drawAll(0, .016);
  }
  var tmo; window.addEventListener('resize', function () { clearTimeout(tmo); tmo = setTimeout(function () { rebuild(false); buildTrail(); }, 160); });

  /* loop */
  var last = 0, running = true, tAcc = 0, stCount = 0;
  function drawAll(t, dt) { drawStars(t); drawGrass(t, dt); drawFx(t, dt); placeGlider(t); }
  function targetProgress() {
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight), p = clamp(scrollY / max, 0, 1);
    return PAGE === 'home' ? p : p * .6;
  }
  function frame(ts) {
    if (!running) return;
    var t = ts / 1000, dt = Math.min(.033, last ? t - last : .016); last = t;
    var tp = targetProgress(); progress += (tp - progress) * Math.min(1, dt * 4);
    if (Math.abs(progress - shown) > .002) applyTime(progress);
    var sy = scrollY; cloudsEl.style.transform = 'translate3d(0,' + r1(-sy * .06) + 'px,0)'; landEl.style.transform = 'translate3d(0,' + r1(-sy * .025) + 'px,0)';
    pointer.vx *= .9;
    if (!reduced) { stCount++; if (stCount % 4 === 0 || true) drawStars(t); }
    drawGrass(t, dt); drawFx(t, dt); placeGlider(t);
    requestAnimationFrame(frame);
  }
  function start() { if (reduced) { applyTime(targetProgress()); drawAll(0, .016); return; } running = true; last = 0; requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else if (!reduced && !running) { running = true; last = 0; requestAnimationFrame(frame); } });
  window.addEventListener('pointermove', function (e) { pointer.vx = clamp(e.movementX || 0, -60, 60) * 2; pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  window.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; });
  document.addEventListener('rm:themechange', function (e) {
    theme = e.detail.theme; applyTime(progress); recolorFlowers(); cvS.style.display = theme === 'dark' ? '' : 'none'; drawAll(performance.now() / 1000, .016);
  });
  var onRM = function () { reduced = mqRM.matches; if (reduced) { running = false; drawAll(0, .016); } else if (!running) { running = true; last = 0; requestAnimationFrame(frame); } };
  if (mqRM.addEventListener) mqRM.addEventListener('change', onRM);
  window.addEventListener('scroll', function () { if (reduced) { applyTime(targetProgress()); drawAll(0, .016); } }, { passive: true });

  /* trail (about) */
  var trailEl = $('.trail');
  function buildTrail() {
    if (!trailEl) return;
    var svg = $('.trail-svg', trailEl); svg.textContent = '';
    var box = trailEl.getBoundingClientRect(), stones = [].slice.call(trailEl.querySelectorAll('.stone')).map(function (s) { var r = s.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
    if (stones.length < 2) return;
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    stones.reverse();
    var m = box.width < 640, pts = [[stones[0][0] + (m ? 8 : 0), box.height]].concat(stones, [[stones[stones.length - 1][0] + (m ? 10 : 30), 0]]);
    var d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]);
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], dy = (b[1] - a[1]) * .5; d += 'C' + r1(a[0]) + ' ' + r1(a[1] + dy) + ' ' + r1(b[0]) + ' ' + r1(b[1] - dy) + ' ' + r1(b[0]) + ' ' + r1(b[1]); }
    var g = el('g', { filter: 'url(#paint-s)' }, svg);
    [['rgba(30,20,10,.45)', m ? 30 : 46], ['var(--trail)', m ? 22 : 36]].forEach(function (s) { el('path', { d: d, 'class': 'trail-path', style: 'stroke:' + s[0] + ';stroke-width:' + s[1] }, g); });
    el('path', { d: d, 'class': 'trail-path', style: 'stroke:var(--wash);stroke-width:3;stroke-dasharray:3 12;opacity:.9' }, g);
  }
  if (window.ResizeObserver && trailEl) new ResizeObserver(function () { buildTrail(); }).observe(trailEl);

  /* UI */
  var toastEl = $('#toast'), toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 4200); }
  document.addEventListener('click', function (e) {
    var r = e.target.closest('[data-resume]'); if (r) { e.preventDefault(); toast('Résumé PDF coming soon — reach out by email meanwhile'); return; }
    var pl = e.target.closest('[data-play]'); if (pl) { e.preventDefault(); toast('Playable in the full release'); }
  });
  var aiBtn = $('[data-ai-open]'), aiPanel = $('#ai-panel'), aiX = $('[data-ai-close]');
  function aiSet(open) { aiPanel.hidden = !open; aiBtn.setAttribute('aria-expanded', String(open)); if (open) aiX.focus(); else aiBtn.focus(); }
  aiBtn.addEventListener('click', function () { aiSet(aiPanel.hidden); });
  aiX.addEventListener('click', function () { aiSet(false); });
  document.addEventListener('keydown', function (e) {
    if (aiPanel.hidden) return;
    if (e.key === 'Escape') { aiSet(false); return; }
    if (e.key === 'Tab') {
      var f = [aiX, aiBtn], i = f.indexOf(document.activeElement);
      if (i === -1) { e.preventDefault(); aiX.focus(); }
      else { e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); }
    }
  });

  var form = $('#contact-form');
  if (form) {
    var errs = { cname: 'Enter your name so I know who to reply to.', cemail: 'Enter a valid email address, like name@example.com.', cmsg: 'Write a short message so I know what you have in mind.' };
    function check(inp) {
      var v = inp.value.trim(), msg = '';
      if (!v) msg = errs[inp.id]; else if (inp.id === 'cemail' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = errs.cemail;
      $('#' + inp.id + '-err').textContent = msg; inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg;
    }
    form.querySelectorAll('input,textarea').forEach(function (i) { i.addEventListener('blur', function () { if (i.value || i.getAttribute('aria-invalid')) check(i); }); i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') check(i); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null; form.querySelectorAll('input,textarea').forEach(function (i) { if (!check(i) && !bad) bad = i; });
      if (bad) { bad.focus(); return; }
      $('.form-body', form).hidden = true; var s = $('#sent'); s.hidden = false; s.focus();
    });
  }

  /* init */
  theme = root.dataset.theme || 'light';
  applyTime(targetProgress()); progress = shown; rebuild(true); recolorFlowers(); cvS.style.display = theme === 'dark' ? '' : 'none';
  start(); buildTrail();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildTrail);
  window.addEventListener('load', buildTrail);
})();
