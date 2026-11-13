/* Skyward: a scroll-driven ascent from the street fog of Midtown to above the cloud sea.
   Everything is baked once (resize / theme) into offscreen canvases that become DOM layers.
   Scroll then only moves those layers: via CSS scroll-driven animations (compositor, zero main-thread
   work) or, where unsupported, one rAF-coalesced pass that writes translate/opacity on ~60 elements.
   No filters, blend modes or backdrop-filter anywhere; no custom properties are written during scroll. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgba(c, a) { return 'rgba(' + c + ',' + a + ')'; }

  /* ---------------------------------------------------------------- palettes */
  var PAL = {
    dark: {
      stars: true,
      lay: {
        far:  { body: '#1e2349', shade: 0.30, lite: 0.02, dim: 'rgba(170,185,255,0.03)', hazeA: 0.24, edgeA: 0.2, rimA: 0.26 },
        mid:  { body: '#151838', shade: 0.38, lite: 0.05, dim: 'rgba(170,185,255,0.035)', hazeA: 0.26, edgeA: 0.42, rimA: 0.42 },
        near: { body: '#0a0c1d', shade: 0.45, lite: 0.04, dim: 'rgba(160,180,255,0.03)', hazeA: 0.22, edgeA: 0.62, rimA: 0.55 }
      },
      haze: '255,160,120', rose: '255,150,176', cyan: '93,199,255', violet: '159,123,255',
      win: ['255,206,132', '226,238,255'], winA: 0.85,
      cloud: [
        { body: [66, 74, 134], hi: [150, 200, 255], lo: [24, 28, 66], a: 0.96 },
        { body: [84, 88, 152], hi: [196, 186, 252], lo: [30, 32, 78], a: 0.97 },
        { body: [104, 106, 172], hi: [232, 208, 255], lo: [40, 42, 92], a: 0.98 }
      ],
      fog: { body: [96, 104, 160], hi: [170, 178, 230], lo: [60, 64, 110], a: 0.26 },
      aur: [['93,199,255', 0.34], ['159,123,255', 0.30], ['120,230,200', 0.14]]
    },
    light: {
      stars: false,
      lay: {
        far:  { body: '#cdcfe9', shade: 0.08, lite: 0.08, dim: 'rgba(60,66,110,0.10)', hazeA: 0.30, edgeA: 0.20, rimA: 0.28 },
        mid:  { body: '#b0b6d6', shade: 0.14, lite: 0.1, dim: 'rgba(40,46,90,0.12)', hazeA: 0.24, edgeA: 0.32, rimA: 0.36 },
        near: { body: '#6f7a9e', shade: 0.24, lite: 0.12, dim: 'rgba(24,30,66,0.14)', hazeA: 0.20, edgeA: 0.5, rimA: 0.46 }
      },
      haze: '255,196,168', rose: '255,150,160', cyan: '70,150,220', violet: '120,90,220',
      win: ['255,180,100', '120,170,230'], winA: 0.95,
      cloud: [
        { body: [238, 232, 252], hi: [255, 255, 255], lo: [190, 184, 224], a: 0.97 },
        { body: [246, 238, 250], hi: [255, 255, 255], lo: [204, 196, 232], a: 0.97 },
        { body: [252, 245, 250], hi: [255, 255, 255], lo: [222, 214, 240], a: 0.98 }
      ],
      fog: { body: [250, 244, 250], hi: [255, 255, 255], lo: [226, 218, 240], a: 0.26 },
      aur: [['160,130,255', 0.16], ['255,170,150', 0.16], ['120,200,255', 0.10]]
    }
  };

  /* ---------------------------------------------------------------- scene */
  function scene(stage) {
    var world = stage.querySelector('.world');
    var hero = stage.parentElement;
    var compact = stage.hasAttribute('data-compact');
    var still = compact || reduce;
    var cssTL = !still && !/[?&]js=1/.test(location.search) && !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
    var DPRC = 1.25;
    var W = 0, H = 0, A = 0, dpr = 1, pin = 1, pal, theme;
    var items = [], anchors = {}, built = false;
    var onScreen = true, shootT = 0;
    var altEl = document.getElementById('alt');
    var cache = {};

    if (still) { stage.classList.add('still'); if (!compact) hero.classList.add('no-pin'); }

    function mk(w, h) {
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
      c.x = c.getContext('2d'); c.x.scale(dpr, dpr);
      return c;
    }
    function layerEl(z, top, w, h, cls) {
      var d = document.createElement('div');
      d.className = 'sk' + (cls ? ' ' + cls : '');
      d.style.cssText = 'z-index:' + z + ';top:' + Math.round(top) + 'px;width:' + Math.round(w) + 'px;' + (h ? 'height:' + Math.round(h) + 'px' : '');
      world.appendChild(d);
      return d;
    }
    /* kind: y = translate (px), o = opacity, v = visibility hidden once past the range */
    function act(el, kind, a, b, v0, v1, ease) {
      if (still) {
        if (kind === 'y') el.style.translate = '0 ' + v1.toFixed(1) + 'px';
        else if (kind === 'o') el.style.opacity = v1;
        return;
      }
      items.push({ el: el, kind: kind, a: a, b: b, v0: v0, v1: v1, ease: ease || 'linear' });
    }

    /* ------------------------------------------------------------ towers */
    function T(type, cx, w, c, base) {
      return { type: type, cx: cx, w: w, c: c, base: base, path: new Path2D(), pieces: [], x0: cx - w / 2, x1: cx + w / 2, top: c, glass: false, rim: false };
    }
    function rect(t, x0, y0, x1, y1, win) { t.path.rect(x0, y0, x1 - x0, y1 - y0); t.pieces.push({ k: 0, x0: x0, x1: x1, y0: y0, y1: y1, win: win }); if (x0 < t.x0) t.x0 = x0; if (x1 > t.x1) t.x1 = x1; }
    function tri(t, xl, xr, yb, xa, ya) { t.path.moveTo(xl, yb); t.path.lineTo(xa, ya); t.path.lineTo(xr, yb); t.path.closePath(); }
    function taper(t, xc, wb, yb, wt, yt) {
      t.path.moveTo(xc - wb / 2, yb); t.path.lineTo(xc - wt / 2, yt); t.path.lineTo(xc + wt / 2, yt); t.path.lineTo(xc + wb / 2, yb); t.path.closePath();
      t.pieces.push({ k: 1, xc: xc, wb: wb, wt: wt, y0: yt, y1: yb, win: true });
    }
    function ext(t, y) {
      var a = 1e9, b = -1e9;
      for (var i = 0; i < t.pieces.length; i++) {
        var p = t.pieces[i];
        if (!p.win || y < p.y0 || y > p.y1) continue;
        var x0, x1;
        if (p.k === 0) { x0 = p.x0; x1 = p.x1; } else { var f = (p.y1 - y) / (p.y1 - p.y0), half = (p.wb + (p.wt - p.wb) * f) / 2; x0 = p.xc - half; x1 = p.xc + half; }
        if (x0 < a) a = x0; if (x1 > b) b = x1;
      }
      return b > a ? [a, b] : null;
    }
    function build(s, base) {
      var cx = s.cx, w = s.w, c = s.c, t = T(s.type, cx, w, c, base), hw = w / 2, y;
      t.glass = !!s.hero; t.rim = !!s.hero;
      if (s.type === 'needle') {
        tri(t, cx - w * 0.05, cx + w * 0.05, c + w * 2.4, cx, c);
        taper(t, cx, w, c + w * 7.5, w * 0.36, c + w * 2.4);
        rect(t, cx - hw, c + w * 7.5, cx + hw, base, true);
      } else if (s.type === 'setback') {
        y = c + w * 1.4; tri(t, cx - w * 0.045, cx + w * 0.045, y, cx, c);
        [[0.26, 0], [0.4, 0.4], [0.56, 0.95], [0.76, 1.8], [1, 2.9]].forEach(function (r) { rect(t, cx - w * r[0] / 2, y + r[1] * w, cx + w * r[0] / 2, base, true); });
      } else if (s.type === 'crown') {
        tri(t, cx - w * 0.04, cx + w * 0.04, c + w * 0.9, cx, c);
        var yb = [c + w * 0.95, c + w * 1.45, c + w * 1.95, c + w * 2.45], rx = [0.17, 0.27, 0.38, 0.5];
        for (var j = 0; j < 4; j++) {
          var r = w * rx[j], ry = w * 0.4;
          t.path.moveTo(cx - r, yb[j]); t.path.ellipse(cx, yb[j], r, ry, 0, Math.PI, Math.PI * 2); t.path.closePath();
          rect(t, cx - r, yb[j], cx + r, j < 3 ? yb[j + 1] : base, true);
        }
        rect(t, cx - hw, yb[3], cx + hw, base, true);
      } else if (s.roof === 'slant') {
        var lift = w * 0.55, x0 = cx - hw, x1 = cx + hw;
        t.path.moveTo(x0, base); t.path.lineTo(x0, c + lift); t.path.lineTo(x1, c); t.path.lineTo(x1, base); t.path.closePath();
        t.pieces.push({ k: 0, x0: x0, x1: x1, y0: c + lift * 0.7, y1: base, win: true });
      } else {
        rect(t, cx - hw, c + w * 0.4, cx + hw, base, true);
        if (s.roof === 'step') { rect(t, cx - w * 0.34, c + w * 0.1, cx + w * 0.34, c + w * 0.5, true); rect(t, cx - w * 0.16, c, cx + w * 0.16, c + w * 0.14, false); }
        else if (s.roof === 'mast') { rect(t, cx - w * 0.3, c + w * 0.18, cx + w * 0.3, c + w * 0.45, false); tri(t, cx - w * 0.05, cx + w * 0.05, c + w * 0.2, cx, c - w * 0.9); t.top = c - w * 0.9; }
        else rect(t, cx - w * 0.24, c, cx + w * 0.24, c + w * 0.46, false);
      }
      return t;
    }

    /* ------------------------------------------------------------ plan */
    function plan(name, u, HL) {
      var mob = W < 700, r = rng({ far: 11, mid: 23, near: 37 }[name]), list = [], x;
      var roofs = ['flat', 'flat', 'step', 'mast', 'flat', 'slant', 'step'];
      function filler(xa, xb, wLo, wHi, step, cFn, pNeedle) {
        x = xa;
        while (x < xb) {
          var w = (wLo + r() * (wHi - wLo)) * u, xf = (x + w / 2) / W, q = r();
          var c = cFn(xf, r);
          var type = q < pNeedle ? 'needle' : q < pNeedle + 0.2 ? 'setback' : q < pNeedle + 0.32 ? 'crown' : 'slab';
          var s = { type: type, cx: x + w / 2, w: type === 'needle' ? w * 0.5 : w, c: c, roof: roofs[(r() * roofs.length) | 0] };
          if (c < HL - H * 0.18 && !(still && c > H * 1.02)) list.push(s);
          x += w * (step[0] + r() * (step[1] - step[0]));
        }
      }
      var wm = mob ? 1.2 : 1;
      if (name === 'far') {
        filler(-u, W + u, 0.5 * wm, 1.0 * wm, [2.2, 4.6], function (xf, r) {
          var tall = r() < (xf < 0.5 ? 0.14 : 0.3);
          return tall ? H * (0.4 + r() * 0.14) : H * (0.64 + r() * 0.62);
        }, 0.16);
      } else if (name === 'mid') {
        filler(-u, W + u, 0.8 * wm, 1.4 * wm, [3.2, 6.2], function (xf, r) {
          var tall = r() < (xf < 0.5 ? 0.06 : 0.3);
          if (tall) return H * (0.46 + r() * 0.15);
          return xf < 0.5 ? H * (1.3 + r() * 0.4) : H * (0.78 + r() * 0.9);
        }, 0.12);
      } else {
        filler(-u * 1.5, W * 0.085, 0.9, 1.5, [0.95, 1.2], function (xf, r) { return H * (1.5 + r() * 0.5); }, 0);
        filler(W * 0.62, W + u * 2, 0.8, 1.3, [1.8, 3.4], function (xf, r) { return H * (1.7 + r() * 0.5); }, 0);
      }
      var X = function (f) { return W * f; }, hv = [];
      function hero(type, xf, wf, ch, extra) {
        var s = { type: type, cx: X(xf), w: wf * u * (mob ? 1.15 : 1) * (type === 'needle' ? 1 : 1), c: H * ch, hero: true, roof: 'flat' };
        for (var k in extra) s[k] = extra[k];
        if (still && !s.keep && xf < 0.55 && ch < 0.58) return;
        hv.push(s);
      }
      if (name === 'near') {
        hero('needle', 0.80, 0.62, 0.13);
        hero('setback', 0.885, 1.5, 0.24);
        hero('crown', 0.725, 1.15, 0.38, { anchor2: 'b', lift2: 120, flip2: 1 });
        hero('slab', 0.955, 1.0, 0.32, { roof: 'step' });
        hero('slab', 0.03, 1.3, 0.52, { roof: 'mast', keep: true });
      } else if (name === 'mid') {
        hero('needle', 0.60, 0.5, 0.43, { anchor2: 'a', lift2: 170, flip2: 1 });
        hero('setback', 0.765, 1.0, 0.42);
        hero('needle', 0.86, 0.45, 0.41, { anchor2: 'c', lift2: 80, flip2: 1 });
        hero('slab', 0.665, 1.0, 0.52, { roof: 'slant' });
        hero('crown', 0.935, 0.8, 0.47);
        hero('needle', 0.30, 0.4, 0.5, { anchor: 'b', lift: 78 });
        hero('setback', 0.17, 0.9, 0.52, { anchor: 'a', lift: 150 });
      } else {
        hero('needle', 0.52, 0.36, 0.45, { anchor: 'c', lift: 112 });
        hero('setback', 0.7, 0.7, 0.44);
        hero('needle', 0.93, 0.34, 0.4);
      }
      return list.concat(hv);
    }

    /* ------------------------------------------------------------ one tower layer */
    var CFG = {
      far: { k: 0.3, z: 4, cw: 3.6, lit: 0.16 },
      mid: { k: 0.6, z: 6, cw: 5.0, lit: 0.34 },
      near: { k: 1.0, z: 8, cw: 6.2, lit: 0.5 }
    };
    function towerLayer(name) {
      var cfg = CFG[name], P = pal.lay[name], kA = still ? 0 : cfg.k * A, HL = H + kA;
      var u = clamp(W / 26, 15, 56) * (W < 700 ? 1.5 : 1), base = HL + 6;
      var list = plan(name, u, HL), towers = list.map(function (s) { return build(s, base); });
      /* one wrapper moves with scroll; each tower is its own tight canvas, so the compositor never blends empty sky */
      var wrap = layerEl(cfg.z, 0, W, HL, still ? '' : 'tl');
      var s = clamp(W / 1440, 0.7, 1.05), cw = cfg.cw * s * (W < 700 ? 0.85 : 1), ww = Math.max(2, Math.round(cw * 0.5)), wh = Math.max(3, Math.round(cw * 0.72)), rp = Math.round(cw * 1.5), mg = cw * 0.7;
      var streetY = HL - H * 0.5, bandH = H * (name === 'near' ? 0.42 : 0.55), nStrip = 0;
      function place(cv, x, y, w, h) { cv.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px'; wrap.appendChild(cv); }
      towers.forEach(function (t, ti) {
        var bx = Math.floor(t.x0 - 4), bw = Math.ceil(t.x1 + 4) - bx, by = Math.floor(t.top - 4), bh = Math.ceil(base - by);
        if (bx + bw < 0 || bx > W) return;
        var cv = mk(bw, bh), k = cv.x; k.translate(-bx, -by);
        k.fillStyle = P.body; k.fill(t.path);
        k.save(); k.clip(t.path);
        var sh = k.createLinearGradient(t.x0, 0, t.x1, 0);
        sh.addColorStop(0, 'rgba(255,255,255,' + P.lite + ')'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,' + P.shade + ')');
        k.fillStyle = sh; k.fillRect(t.x0, t.top, t.x1 - t.x0, base - t.top);
        var hy = HL - H * 0.9, hz = k.createLinearGradient(0, hy, 0, HL);
        hz.addColorStop(0, rgba(pal.haze, 0)); hz.addColorStop(0.6, rgba(pal.haze, P.hazeA * 0.35)); hz.addColorStop(1, rgba(pal.haze, P.hazeA * 1.5));
        k.fillStyle = hz; k.fillRect(t.x0, hy, t.x1 - t.x0, HL - hy + 8);
        if (t.rim) {
          var rl = Math.min(t.w * 7, H * 0.3), rg = k.createLinearGradient(0, t.top, 0, t.top + rl);
          rg.addColorStop(0, rgba(pal.rose, P.rimA)); rg.addColorStop(0.45, rgba(pal.rose, P.rimA * 0.3)); rg.addColorStop(1, rgba(pal.rose, 0));
          k.fillStyle = rg; k.fillRect(t.x0, t.top, t.x1 - t.x0, rl);
        }
        k.restore();
        if (t.glass) {
          var len = Math.min(base - t.top, H * 1.1), y0 = t.top + t.w * 1.2;
          var lg = k.createLinearGradient(0, y0, 0, y0 + len);
          lg.addColorStop(0, rgba(pal.cyan, P.edgeA)); lg.addColorStop(1, rgba(pal.cyan, 0));
          k.strokeStyle = lg; k.lineWidth = 1; k.beginPath(); k.moveTo(t.x0 + 0.5, y0); k.lineTo(t.x0 + 0.5, y0 + len); k.stroke();
          lg = k.createLinearGradient(0, y0, 0, y0 + len * 0.7);
          lg.addColorStop(0, rgba(pal.violet, P.edgeA * 0.75)); lg.addColorStop(1, rgba(pal.violet, 0));
          k.strokeStyle = lg; k.beginPath(); k.moveTo(t.x1 - 0.5, y0); k.lineTo(t.x1 - 0.5, y0 + len * 0.7); k.stroke();
        }
        /* windows: dim grid on the body, lit ones either baked (street level, far layer, still frames) or collected for scroll-lit bands */
        var xf0 = t.cx / W, r = rng(5000 + ti * 131 + name.length), dim = new Path2D(), bands = {}, baked = [], yLim = still ? HL : HL + 4;
        for (var y = t.top + rp; y < yLim; y += rp) {
          var e = ext(t, y); if (!e) continue;
          var n = Math.floor((e[1] - e[0] - 2 * mg) / cw); if (n < 1) continue;
          var sx = (e[0] + e[1]) / 2 - n * cw / 2 + (cw - ww) / 2, street = y > streetY;
          var rowOn = r() < (street ? 0.8 : 0.5) * (xf0 < 0.6 && name !== 'far' && !still ? 0.55 : 1), rowCl = r();
          for (var j = 0; j < n; j++) {
            var x = Math.round(sx + j * cw), yy = Math.round(y);
            dim.rect(x, yy, ww, wh);
            if (rowOn && r() < cfg.lit * (W < 700 ? 0.6 : 1) * (xf0 < 0.6 && !still ? 0.5 : 1) * (0.5 + rowCl) * (street ? 1.2 : 1)) {
              var q = r(), cell = [x, yy, q < 0.94 ? 0 : 1, 0.5 + r() * 0.5];
              if (still || street || name === 'far') baked.push(cell);
              else { var bi = (yy / bandH) | 0; (bands[bi] = bands[bi] || []).push(cell); }
            }
          }
        }
        k.fillStyle = P.dim; k.fill(dim);
        litDraw(k, baked, 0, name === 'far' ? 0.7 : 1, ww, wh);
        place(cv, bx, by, bw, bh);
        Object.keys(bands).forEach(function (key) {
          var bt = key * bandH, bt0 = Math.max(bt, by), bt1 = Math.min(bt + bandH, by + bh), lh = Math.ceil(bt1 - bt0);
          if (lh < 2) return;
          var lc = mk(bw, lh); lc.x.translate(-bx, -bt0); litDraw(lc.x, bands[key], 0, 1, ww, wh);
          place(lc, bx, bt0, bw, lh); lc.className = 'sk-strip'; nStrip++;
          var yc = bt0 + lh / 2, Yl0 = H * 0.66, Yl1 = H * 0.1, pst = (Yl0 - yc + kA) / (kA + (Yl0 - Yl1)), pc = clamp(pst, -0.2, 0.97);
          if (pc + 0.07 <= 0.005) lc.style.opacity = 1; else act(lc, 'o', Math.max(0, pc - 0.07), Math.min(1, pc + 0.07), 0, 1);
        });
      });
      act(wrap, 'y', 0, 1, -kA, 0);
      if (name === 'far' && !still) act(wrap, 'o', 0.2, 0.7, 1, 0.55);
      list.forEach(function (s2) { var id = still ? s2.anchor2 : s2.anchor; if (id) anchors[id] = { x: s2.cx, y: s2.c, lift: still ? s2.lift2 : s2.lift, flip: still ? s2.flip2 : 0 }; });
      cache[name] = { towers: towers.length, strips: nStrip };
      return wrap;
    }

    function litDraw(k, cells, offY, scale, ww, wh) {
      if (!cells.length) return;
      var groups = {};
      cells.forEach(function (c) { var g = c[2] * 3 + (c[3] > 0.82 ? 2 : c[3] > 0.62 ? 1 : 0); (groups[g] = groups[g] || []).push(c); });
      Object.keys(groups).forEach(function (g) {
        var col = pal.win[(g / 3) | 0], tier = g % 3, a = pal.winA * (0.34 + 0.22 * tier) * scale, list = groups[g], i;
        k.beginPath();
        for (i = 0; i < list.length; i++) k.rect(list[i][0] - 1.5, list[i][1] - offY - 1.5, ww + 3, wh + 3);
        k.fillStyle = rgba(col, a * 0.13); k.fill();
        k.beginPath();
        for (i = 0; i < list.length; i++) k.rect(list[i][0], list[i][1] - offY, ww, wh);
        k.fillStyle = rgba(col, a); k.fill();
      });
    }

    /* ------------------------------------------------------------ clouds & fog */
    function mix(a, b, f) { return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)]; }
    function puff(c, a) {
      var s = document.createElement('canvas'); s.width = s.height = 128; var x = s.getContext('2d');
      var g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(' + c.join(',') + ',' + a + ')'); g.addColorStop(0.52, 'rgba(' + c.join(',') + ',' + a * 0.94 + ')'); g.addColorStop(0.8, 'rgba(' + c.join(',') + ',' + a * 0.4 + ')'); g.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      return s;
    }
    function mkNoise(seed) {
      var r = rng(seed), G = new Float32Array(4096), i;
      for (i = 0; i < 4096; i++) G[i] = r();
      function sm(t) { return t * t * (3 - 2 * t); }
      function n(x, y) {
        var xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
        var a = G[((yi & 63) << 6) | (xi & 63)], b = G[((yi & 63) << 6) | ((xi + 1) & 63)], c = G[(((yi + 1) & 63) << 6) | (xi & 63)], d = G[(((yi + 1) & 63) << 6) | ((xi + 1) & 63)];
        return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
      }
      return function (x, y) { return n(x, y) * 0.5 + n(x * 2.1, y * 2.1) * 0.27 + n(x * 4.4, y * 4.4) * 0.15 + n(x * 9, y * 9) * 0.08; };
    }
    function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    /* stratus: strata of fractal-noise cloud, flat tops with soft billows stretched horizontally, baked at 1/3 res and
       smoothly upscaled. Back strata are paler and fainter (atmospheric fade); front strata deeper. */
    function cloud(w, h, o) {
      var cv = mk(w, h), S = 3, lw = Math.ceil(w / S), lh = Math.ceil(h / S), P = o.p, rows = o.rows || 1, wisp = !!o.wisp, st;
      cv.x.imageSmoothingEnabled = true; cv.x.imageSmoothingQuality = 'high';
      for (st = 0; st < rows; st++) {
        var f = rows > 1 ? st / (rows - 1) : 0, N = mkNoise(o.seed * 17 + st * 5), M = mkNoise(o.seed * 31 + st * 9 + 3);
        var tmp = document.createElement('canvas'); tmp.width = lw; tmp.height = lh;
        var tx = tmp.getContext('2d'), id = tx.createImageData(lw, lh), d = id.data, te = (o.te + f * (o.depth || 0)) / S, amp = o.amp / S * 0.9;
        var fx = 0.022 + f * 0.01, body = mix(mix(P.body, P.lo, f * 0.55), P.hi, (1 - f) * 0.12);
        var aBase = P.a * (wisp ? 1 : 0.8 + 0.2 * f);
        for (var j = 0; j < lh; j++) for (var i = 0; i < lw; i++) {
          var k = (j * lw + i) * 4, al, c0, c1, c2;
          if (wisp) {
            var nn = N(i * 0.016, j * 0.22), bell = Math.sin(clamp(j / lh, 0, 1) * Math.PI);
            al = sstep(0.42, 0.78, nn) * bell * aBase * (0.6 + 0.8 * M(i * 0.03, j * 0.4)) * 1.6;
            c0 = P.body[0]; c1 = P.body[1]; c2 = P.body[2];
          } else {
            var edge = te + (N(i * fx, 0.37) - 0.5) * amp * 2.4 + (N(i * 0.08, j * 0.02 + 5) - 0.5) * amp * 0.5, dd = j - edge;
            al = sstep(-amp * 0.18, amp * 0.55, dd);
            var depthT = clamp(dd / (amp * 5), 0, 1), hl = clamp(1 - dd / (amp * 1.7), 0, 1), mot = M(i * 0.045, j * 0.16);
            var col = mix(body, P.lo, depthT * 0.75); col = mix(col, P.hi, hl * hl * (0.35 + 0.7 * mot));
            c0 = col[0]; c1 = col[1]; c2 = col[2];
            al *= aBase;
            if (!o.solid) al *= 1 - sstep(lh * 0.38, lh, j);
          }
          d[k] = c0; d[k + 1] = c1; d[k + 2] = c2; d[k + 3] = clamp(al, 0, 1) * 255;
        }
        tx.putImageData(id, 0, 0);
        cv.x.drawImage(tmp, 0, 0, w, h);
      }
      if (o.solid) {
        var lo = P.lo.join(','), y0 = o.te + (o.depth || 0) + o.amp * 1.2, g = cv.x.createLinearGradient(0, y0, 0, h);
        g.addColorStop(0, rgba(mix(P.body, P.lo, 0.7).join(','), 0)); g.addColorStop(0.3, rgba(mix(P.body, P.lo, 0.8).join(','), 0.95)); g.addColorStop(1, rgba(lo, 0.98));
        cv.x.fillStyle = g; cv.x.fillRect(0, y0, w, h - y0);
      }
      return cv;
    }

    function skyCanvas(h) {
      var cv = mk(W, h), x = cv.x, cs = getComputedStyle(root), g = x.createLinearGradient(0, 0, 0, h);
      ['--sk0', '--sk1', '--sk2', '--sk3', '--sk4', '--sk5'].forEach(function (v, i) { g.addColorStop([0, 0.22, 0.44, 0.66, 0.86, 1][i], cs.getPropertyValue(v).trim() || '#000'); });
      x.fillStyle = g; x.fillRect(0, 0, W, h);
      if (!pal.stars) return cv;
      var r = rng(77), n = Math.round(W * h / 4200), i;
      for (i = 0; i < n; i++) {
        var y = r() * h * 0.92, f = Math.pow(clamp(1 - y / (h * 0.9), 0, 1), 0.75), big = r() < 0.1, a = (0.3 + r() * 0.65) * f;
        x.fillStyle = 'rgba(226,232,250,' + a.toFixed(3) + ')';
        var sz = big ? 1.6 : r() < 0.4 ? 1.2 : 0.9;
        x.fillRect(r() * W, y, sz, sz);
      }
      for (i = 0; i < 7; i++) {
        var sx = r() * W, sy = r() * h * 0.5;
        x.fillStyle = 'rgba(235,240,255,0.5)'; x.fillRect(sx - 4, sy, 9, 1); x.fillRect(sx, sy - 4, 1, 9);
        x.fillStyle = 'rgba(255,255,255,0.9)'; x.fillRect(sx - 0.5, sy - 0.5, 2, 2);
      }
      return cv;
    }
    function auroraCanvas() {
      var w = 720, h = 360, cv = document.createElement('canvas'); cv.width = w; cv.height = h; var x = cv.getContext('2d');
      pal.aur.forEach(function (rb, ri) {
        var ph = ri * 2.1 + 0.6, by = h * (0.4 + ri * 0.1);
        for (var i = 0; i < w; i += 2) {
          var y = by + Math.sin(i * 0.009 + ph) * h * 0.1 + Math.sin(i * 0.023 + ph * 1.7) * h * 0.035;
          var L = h * (0.36 + 0.12 * Math.sin(i * 0.015 + ph * 0.6)), ray = 0.5 + 0.5 * Math.sin(i * 0.83 + ph) * Math.sin(i * 0.19 + ph * 2.3);
          var ra = rb[1] * (0.3 + 0.7 * ray) * (0.6 + 0.4 * Math.sin(i * 0.031 + ph));
          var g = x.createLinearGradient(0, y - L, 0, y + L * 0.45);
          g.addColorStop(0, rgba(rb[0], 0)); g.addColorStop(0.55, rgba(rb[0], ra * 0.42)); g.addColorStop(0.82, rgba(rb[0], ra)); g.addColorStop(1, rgba(rb[0], 0));
          x.fillStyle = g; x.fillRect(i, y - L, 2.2, L * 1.45);
        }
      });
      return cv;
    }

    /* ------------------------------------------------------------ assemble */
    function assemble() {
      world.textContent = ''; items = []; anchors = {};
      var skyH = H + (still ? 0 : 0.4 * A), cl = pal.cloud;
      var sky = layerEl(0, 0, W, skyH, still ? '' : 'tl');
      sky.appendChild(skyCanvas(skyH));
      if (pal.stars) {
        var tr = rng(31);
        for (var ti = 0; ti < 16; ti++) {
          var d = document.createElement('i'); d.className = 'tw';
          d.style.cssText = 'left:' + (tr() * 100).toFixed(1) + '%;top:' + (tr() * skyH * 0.7).toFixed(0) + 'px;animation-delay:' + (-tr() * 9).toFixed(1) + 's;animation-duration:' + (4 + tr() * 5).toFixed(1) + 's';
          sky.appendChild(d);
        }
      }
      act(sky, 'y', 0, 1, -0.4 * A, 0);
      if (still) sky.style.translate = '0 ' + (H - skyH) + 'px';

      var au = layerEl(2, 0, W, H * 0.7, still ? '' : 'tl sk-aurora'); var ac = auroraCanvas(); ac.className = 'sk-sway'; ac.style.cssText = 'width:112%;height:100%;margin-left:-6%'; au.appendChild(ac);
      if (still) au.style.opacity = 1; else { act(au, 'o', 0.5, 0.95, 0, 1); act(au, 'y', 0, 1, -0.2 * H, 0); }

      towerLayer('far');
      function band(i, z, yF, k, seed) {
        var hC = H * 0.36, te = H * 0.1, el = layerEl(z, 0, W, hC, still ? '' : 'tl');
        el.appendChild(cloud(W, hC, { p: cl[i], te: te, amp: H * 0.042, sp: W * 0.05, seed: seed, rows: 2, depth: H * 0.07 }));
        var T1 = yF - te; act(el, 'y', 0, 1, T1 - k * A, T1); return el;
      }
      band(0, 5, H * 0.58, 0.7, 3);
      towerLayer('mid');
      band(1, 7, H * 0.635, 0.95, 5);
      towerLayer('near');
      /* the sea itself: static texture that thickens under the passing bands, then dissolves into the page ground */
      var hS = H * 0.55, sea = layerEl(9, H * 0.665 - H * 0.08, W, hS, still ? '' : 'tl');
      sea.appendChild(cloud(W, hS, { p: cl[2], te: H * 0.08, amp: H * 0.05, sp: W * 0.05, seed: 8, rows: 4, depth: H * 0.22, solid: true }));
      if (still) sea.style.opacity = 1; else act(sea, 'o', 0.45, 0.9, 0, 1);
      /* passing fog */
      if (!still) {
        [[9, 0.45, 1.45, 8, 0.58], [9, -0.1, 1.0, 9, 0.5], [9, -0.75, 0.7, 10, 0.5]].forEach(function (f) {
          var hf = H * f[4], el = layerEl(f[0], 0, W, hf, 'tl'), cv = cloud(W, hf, { p: pal.fog, te: hf * 0.5, amp: hf * 0.22, sp: W * 0.05, seed: f[3], wisp: true });
          el.appendChild(cv); act(el, 'y', 0, 1, f[1] * H, f[2] * H);
        });
      }
      band(2, 10, H * 0.71, 1.2, 11);
      if (!still) {
        var warm = layerEl(11, H * 0.4, W, H * 0.6, 'tl sk-warm');
        act(warm, 'y', 0, 0.6, 0, H * 0.7); act(warm, 'o', 0, 0.5, 1, 0);
      }
      var gf = layerEl(12, H * 0.56, W, H * 0.44, still ? 'sk-ground' : 'tl sk-ground');
      if (still) gf.style.opacity = 1; else act(gf, 'o', 0.5, 0.98, 0, 1);

      /* proof marks at the spires */
      ['a', 'b', 'c'].forEach(function (id) {
        var el = stage.querySelector('.alt[data-anchor="' + id + '"]'), an = anchors[id]; if (!el || !an) return;
        if (still) { el.style.opacity = 1; return; }
        var lift = (W < 700 && !still ? { a: 150, b: 60, c: 120 }[id] : an.lift) || clamp(an.y - 120, 36, 84); el.style.cssText = 'left:' + an.x.toFixed(1) + 'px;top:' + an.y.toFixed(1) + 'px;--h:' + lift.toFixed(0) + 'px';
        el.classList.toggle('flip', !!an.flip || an.x > W - 220);
        if (still) el.style.opacity = 1; else act(el, 'o', 0.8, 0.96, 0, 1);
      });

      if (!still) {
        var cp = stage.querySelector('.copy'), ci = stage.querySelector('.copy-in'), hint = stage.querySelector('.hint'), gi = stage.querySelector('.gauge i');
        if (cp) act(cp, 'y', 0, 0.3, 0, -90);
        if (ci) { act(ci, 'o', 0.02, 0.27, 1, 0, 'cubic-bezier(0.4,0,0.9,0.55)'); act(ci, 'v', 0, 0.27, 0, 1); }
        if (hint) { act(hint, 'o', 0, 0.07, 1, 0); act(hint, 'v', 0, 0.07, 0, 1); }
        if (gi) act(gi, 'y', 0, 1, 140, 0);
      }
    }

    /* ------------------------------------------------------------ scroll wiring */
    function wire() {
      if (still) return;
      if (cssTL) {
        var by = new Map();
        items.forEach(function (it) { if (!by.has(it.el)) by.set(it.el, []); by.get(it.el).push(it); });
        by.forEach(function (list, el) {
          el.classList.add('sk-css');
          var names = [], starts = [], ends = [], eases = [];
          list.forEach(function (it) {
            var nm = it.kind === 'y' ? 'sk-y' : it.kind === 'o' ? 'sk-o' : 'sk-v';
            if (it.kind === 'y') { el.style.setProperty('--y0', it.v0.toFixed(1) + 'px'); el.style.setProperty('--y1', it.v1.toFixed(1) + 'px'); }
            if (it.kind === 'o') { el.style.setProperty('--o0', it.v0); el.style.setProperty('--o1', it.v1); }
            names.push(nm); starts.push((it.a * pin).toFixed(1) + 'px'); ends.push((it.b * pin).toFixed(1) + 'px'); eases.push(it.ease);
          });
          el.style.animationName = names.join(','); el.style.animationTimingFunction = eases.join(',');
          el.style.animationRangeStart = starts.join(','); el.style.animationRangeEnd = ends.join(',');
        });
      } else {
        apply(clamp(window.scrollY / pin, 0, 1));
      }
    }
    function apply(p) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i], t = clamp((p - it.a) / (it.b - it.a), 0, 1), v = it.v0 + (it.v1 - it.v0) * t;
        if (it.kind === 'y') it.el.style.translate = '0 ' + v.toFixed(1) + 'px';
        else if (it.kind === 'o') it.el.style.opacity = v.toFixed(3);
        else it.el.style.visibility = p >= it.b ? 'hidden' : 'visible';
      }
    }

    /* HUD altitude: the only main-thread scroll work in the CSS path (one text node, quantised) */
    var lastAlt = -1, tick = false;
    function onScroll() {
      tick = false;
      var p = clamp(window.scrollY / pin, 0, 1);
      if (!cssTL) apply(p);
      if (altEl) {
        var m = Math.round(12 + p * 1438); m = Math.round(m / 6) * 6;
        if (m !== lastAlt) { lastAlt = m; altEl.textContent = ('000' + m).slice(-4); }
      }
    }
    function sched() { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }

    /* ------------------------------------------------------------ shooting stars (DOM, CSS-animated) */
    function spawnShoot() {
      clearTimeout(shootT);
      shootT = setTimeout(spawnShoot, 8000 + Math.random() * 7000);
      if (document.hidden || !onScreen || theme === 'light' || reduce) return;
      if (!still && window.scrollY / pin < 0.12) return;
      var el = document.createElement('div'), ang = 20 + Math.random() * 18, dist = W * (0.34 + Math.random() * 0.2), r = ang * Math.PI / 180;
      el.className = 'shoot';
      el.style.cssText = 'left:' + (W * (0.12 + Math.random() * 0.5)).toFixed(0) + 'px;top:' + (H * (0.06 + Math.random() * 0.2)).toFixed(0) + 'px;--a:' + ang.toFixed(1) + 'deg;--dx:' + (Math.cos(r) * dist).toFixed(0) + 'px;--dy:' + (Math.sin(r) * dist).toFixed(0) + 'px';
      el.addEventListener('animationend', function () { el.remove(); });
      world.appendChild(el);
    }

    /* ------------------------------------------------------------ lifecycle */
    function measure() {
      W = stage.clientWidth; H = stage.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, DPRC);
      A = still ? 0 : (W < 700 ? 1.3 : 1.45) * H;
      pin = Math.max(1, hero.offsetHeight - H);
      window.RMStage = { stuckAt: still ? 24 : pin + H - 80 };
      theme = root.dataset.theme === 'light' ? 'light' : 'dark'; pal = PAL[theme];
    }
    function rebuild() {
      measure(); assemble(); wire(); lastAlt = -1; onScroll(); built = true;
    }
    rebuild();
    var rt, lw = W, lh = H;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w = stage.clientWidth, h = stage.clientHeight;
        if (w === lw && Math.abs(h - lh) < 120 && !compact) { pin = Math.max(1, hero.offsetHeight - H); return; }
        lw = w; lh = h; rebuild();
      }, 180);
    });
    document.addEventListener('rm:themechange', function () { rebuild(); });
    window.addEventListener('scroll', sched, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; }).observe(stage);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { pin = Math.max(1, hero.offsetHeight - H); });
    shootT = setTimeout(spawnShoot, 4500);
  }

  /* ---------------------------------------------------------------- headline underline drawn by a shooting star */
  function meteor() {
    var wrap = document.querySelector('[data-meteor]');
    if (!wrap) return;
    var svg = wrap.querySelector('.underline'), path = svg.querySelector('path');
    var w = svg.getBoundingClientRect().width;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 8');
    path.setAttribute('d', 'M' + w + ' 4 L0 4'); path.setAttribute('pathLength', '1');
    var seen = false;
    try { seen = sessionStorage.getItem('rm-f4-meteor') === '1'; } catch (e) {}
    if (reduce || seen || window.scrollY > 200 || !wrap.animate) { path.style.strokeDashoffset = '0'; return; }
    try { sessionStorage.setItem('rm-f4-meteor', '1'); } catch (e) {}
    var y = svg.offsetTop + 4, mt = document.createElement('div');
    mt.className = 'mt'; mt.style.top = y + 'px'; mt.style.left = '-200px';
    wrap.appendChild(mt);
    var d1 = 800, d2 = 1100, ease = 'cubic-bezier(0.22,0.8,0.3,1)', sx = w + 260, sy = -190;
    var ang = Math.atan2(-sy, -(sx - w)) * 180 / Math.PI;
    mt.animate([
      { opacity: 0, transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(' + ang + 'deg)', easing: 'cubic-bezier(0.5,0,0.9,0.6)' },
      { opacity: 1, offset: 0.2, transform: 'translate(' + (sx - 70) + 'px,' + (sy + 52) + 'px) rotate(' + ang + 'deg)', easing: 'cubic-bezier(0.5,0,0.9,0.6)' },
      { opacity: 1, transform: 'translate(' + w + 'px,0px) rotate(' + ang + 'deg)' }
    ], { duration: d1, fill: 'forwards' });
    mt.animate([
      { opacity: 1, transform: 'translate(' + w + 'px,0px) rotate(180deg)' },
      { opacity: 1, offset: 0.8, transform: 'translate(' + (w * 0.2) + 'px,0px) rotate(180deg)' },
      { opacity: 0, transform: 'translate(0px,0px) rotate(180deg)' }
    ], { duration: d2, delay: d1, easing: ease, fill: 'forwards' });
    var a = path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: d2, delay: d1, easing: ease, fill: 'both' });
    a.onfinish = function () { path.style.strokeDashoffset = '0'; };
    setTimeout(function () { mt.remove(); }, d1 + d2 + 200);
  }
  var stage = document.getElementById('stage');
  if (stage) scene(stage);
  meteor();
})();
