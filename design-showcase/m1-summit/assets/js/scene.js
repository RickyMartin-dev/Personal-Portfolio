/* m1-summit scene: procedural alpine massif over a cloud sea (voxel-space render, canvas 2D) */
(function () {
  'use strict';
  var root = document.documentElement;
  var host = document.querySelector('.scene');
  if (!host) return;
  var canvas = host.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var sizer = host.querySelector('.sizer');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var compact = host.dataset.scene === 'compact';

  var W = 0, H = 0, S = 0, scale = 1, hy = 0;
  var img = null;            // { light, dark } offscreen canvases
  var fog = null;            // fog tiles per theme
  var stars = [];
  var fade = 0, running = false, built = false, scrollY = 0, t0 = performance.now();
  var dark = root.dataset.theme !== 'light';

  var PAL = {
    light: { skyTop: [226, 227, 230], skyHor: [247, 247, 248], ground: [243, 243, 244], fog: '255,255,255', fogA: 0.78 },
    dark:  { skyTop: [4, 6, 11],      skyHor: [40, 50, 74],     ground: [11, 13, 18],    fog: '132,148,182', fogA: 0.3 }
  };
  function rgb(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }

  /* ---------- noise ---------- */
  function hash(x, y, s) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, s, per) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var x0 = xi, x1 = xi + 1;
    if (per) { x0 = ((x0 % per) + per) % per; x1 = ((x1 % per) + per) % per; }
    var a = hash(x0, yi, s), b = hash(x1, yi, s), c = hash(x0, yi + 1, s), d = hash(x1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function sstep(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  /* ---------- terrain ---------- */
  var N = 1024, CL = 40, HYF = 0.4;
  var PEAKS = [
    // x, y, height, radius, seed
    [470, 650, 190, 205, 1],
    [655, 735, 106, 150, 2],
    [800, 840, 72, 130, 3],
    [252, 585, 74, 130, 4],
    [60, 330, 128, 240, 5],
    [520, 240, 58, 170, 6],
    [760, 560, 56, 120, 7]
  ];
  var HM, TONE, GLOW, SNOW, CLOUD;
  function blur(src, r) {
    var tmp = new Float32Array(N * N), out = new Float32Array(N * N), x, y, k, acc, n = 2 * r + 1;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      acc = 0; for (k = -r; k <= r; k++) acc += src[y * N + Math.min(N - 1, Math.max(0, x + k))];
      tmp[y * N + x] = acc / n;
    }
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      acc = 0; for (k = -r; k <= r; k++) acc += tmp[Math.min(N - 1, Math.max(0, y + k)) * N + x];
      out[y * N + x] = acc / n;
    }
    return out;
  }
  function buildTerrain() {
    var raw = new Float32Array(N * N);
    var i, x, y, p, k;
    for (y = 0; y < N; y++) {
      for (x = 0; x < N; x++) {
        var shape = 0;
        for (k = 0; k < PEAKS.length; k++) {
          p = PEAKS[k];
          var dx = x - p[0], dy = y - p[1];
          var ang = Math.atan2(dy, dx);
          var wob = 0.7 + 0.6 * vnoise(Math.cos(ang) * 1.6 + 5, Math.sin(ang) * 1.6 + 5, p[4] + 20);
          var d = Math.sqrt(dx * dx + dy * dy) / (p[3] * wob);
          if (d < 1) {
            var f = Math.pow(1 - d, 1.3) * p[2];
            if (f > shape) shape = f + (shape > 0 ? shape * 0.06 : 0); else shape += f * 0.06;
          }
        }
        // large ridged forms only: buttresses and gullies, no fine noise
        var rd = 0, fr = 1 / 120, am = 36;
        for (var o = 0; o < 5; o++) {
          var n = vnoise(x * fr, y * fr, 11 + o);
          var r = 1 - Math.abs(2 * n - 1);
          rd += am * r * r;
          fr *= 2.2; am *= 0.58;
        }
        var w = sstep(8, 90, shape);
        raw[y * N + x] = shape + (rd - 24) * w + vnoise(x / 160, y / 160, 3) * 16;
      }
    }
    HM = blur(raw, 1);
    TONE = new Uint8Array(N * N); GLOW = new Uint8Array(N * N); SNOW = new Uint8Array(N * N);
    var Lx = -0.7, Ly = -0.3, Lz = 0.62;
    var ln = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz); Lx /= ln; Ly /= ln; Lz /= ln;
    for (y = 3; y < N - 3; y++) {
      for (x = 3; x < N - 3; x++) {
        i = y * N + x;
        var hx = (HM[i + 1] - HM[i - 1]) * 0.5, hyy = (HM[i + N] - HM[i - N]) * 0.5;
        var inv = 1 / Math.sqrt(hx * hx + hyy * hyy + 1);
        var nx = -hx * inv, ny = -hyy * inv, nz = inv;
        var lit = nx * Lx + ny * Ly + nz * Lz; lit = lit < 0 ? 0 : lit;
        var h = HM[i];
        var sn = sstep(CL + 26, CL + 100, h + (vnoise(x / 40, y / 40, 31) - 0.5) * 40) * sstep(0.5, 0.82, nz);
        var rock = 0.04 + 0.66 * Math.pow(lit, 1.7);
        var tone = rock * (1 - sn) + (0.6 + 0.4 * lit) * sn;
        TONE[i] = Math.max(0, Math.min(255, tone * 255));
        SNOW[i] = sn * 255;
        GLOW[i] = sstep(CL + 132, CL + 178, h) * Math.pow(lit, 0.85) * 255;
      }
    }
    CLOUD = new Uint8Array(512 * 512);
    for (y = 0; y < 512; y++) for (x = 0; x < 512; x++) {
      var c = 0.55 * vnoise(x / 64, y / 64, 41, 8) + 0.3 * vnoise(x / 28, y / 28, 42, 18) + 0.15 * vnoise(x / 11, y / 11, 43, 46);
      CLOUD[y * 512 + x] = Math.max(0, Math.min(255, c * 255));
    }
  }

  /* ---------- voxel render (continuous column fill) ---------- */
  function renderMassif() {
    var sc = Math.max(2, scale);
    var w = Math.round(W * sc), h = Math.round(S * sc);
    var zoom = W < 700 ? 2.1 : (compact ? 1.2 : 1.15);
    var f = 0.8 * w * zoom;
    var zs = 650, summitFrac = W < 700 ? 0.44 : 0.47;
    var camX = 470 - (summitFrac - 0.5) * zs * (w / f);
    var camY = 0, camH = CL + 156;
    var hyR = Math.round(h * HYF);
    hy = hyR / sc;
    var cols = w;
    var tone = new Uint8Array(w * h), glow = new Uint8Array(w * h), cld = new Uint8Array(w * h), cshade = new Uint8Array(w * h), haze = new Uint8Array(w * h), alpha = new Uint8Array(w * h);
    var ybuf = new Float32Array(cols); for (var i = 0; i < cols; i++) ybuf[i] = h;
    var ptn = new Float32Array(cols), pgl = new Float32Array(cols), pcl = new Float32Array(cols), pcs = new Float32Array(cols), phz = new Float32Array(cols);
    var z0 = Math.max(20, f * (camH - CL) / (h * 1.6 - hyR)), z = z0, dz = Math.max(0.5, z0 / 160);
    var zmax = 7000, ax = w / f, first = true;
    while (z < zmax) {
      var fogA = Math.pow(Math.min(1, z / 3600), 1.15);
      var Y = camY + z, Yi = Math.floor(Y), yfr = Y - Yi;
      for (var c = 0; c < cols; c++) {
        var X = camX + (c / w - 0.5) * z * ax;
        var Xi = Math.floor(X), xfr = X - Xi;
        var hh, tn, gl;
        if (Xi < 4 || Xi >= N - 5 || Yi < 4 || Yi >= N - 5) { hh = 0; tn = 0; gl = 0; }
        else {
          var q = Yi * N + Xi;
          var a0 = (1 - xfr) * (1 - yfr), a1 = xfr * (1 - yfr), a2 = (1 - xfr) * yfr, a3 = xfr * yfr;
          hh = HM[q] * a0 + HM[q + 1] * a1 + HM[q + N] * a2 + HM[q + N + 1] * a3;
          tn = TONE[q] * a0 + TONE[q + 1] * a1 + TONE[q + N] * a2 + TONE[q + N + 1] * a3;
          gl = GLOW[q] * a0 + GLOW[q + 1] * a1 + GLOW[q + N] * a2 + GLOW[q + N + 1] * a3;
        }
        var cx = ((Math.floor(X * 0.6) % 512) + 512) % 512, cy = ((Math.floor(Y * 0.6) % 512) + 512) % 512;
        var cn = CLOUD[cy * 512 + cx];
        var cover = sstep(CL + 10, CL - 4, hh);
        var heff = Math.max(hh, CL + (cn / 255 - 0.5) * 6);
        var row = hyR + (camH - heff) * f / z;
        var yb = ybuf[c];
        var hz = Math.min(255, fogA * 255);
        if (row < yb) {
          var r0 = Math.max(0, Math.ceil(row));
          var span = Math.max(1, yb - row);
          for (var r = r0; r < yb; r++) {
            // interpolate from this sample (top of span) to the nearer one (bottom of span)
            var u = first ? 0 : (r - row) / span; u = u < 0 ? 0 : u > 1 ? 1 : u;
            var pi = r * w + c;
            tone[pi] = tn + (ptn[c] - tn) * u; glow[pi] = gl + (pgl[c] - gl) * u;
            cld[pi] = (cover + (pcl[c] - cover) * u) * 255; cshade[pi] = cn + (pcs[c] - cn) * u;
            haze[pi] = hz + (phz[c] - hz) * u; alpha[pi] = 255;
          }
          ybuf[c] = r0 < yb ? r0 : yb;
          if (row < 0) ybuf[c] = 0;
        }
        ptn[c] = tn; pgl[c] = gl; pcl[c] = cover; pcs[c] = cn; phz[c] = hz;
      }
      first = false;
      z += dz; dz = z < 1300 ? Math.max(dz, 0.5 + (z - z0) * 0.0008) : dz + 0.0035 + z * 0.00006;
    }
    for (var c2 = 0; c2 < cols; c2++) {
      for (var r2 = hyR; r2 < ybuf[c2]; r2++) {
        var p2 = r2 * w + c2;
        cld[p2] = 255; cshade[p2] = 130; haze[p2] = 255; alpha[p2] = 255; tone[p2] = 0; glow[p2] = 0;
      }
    }
    return { w: w, h: h, sc: sc, tone: tone, glow: glow, cld: cld, cshade: cshade, haze: haze, alpha: alpha };
  }

  function colorize(m, theme) {
    var w = m.w, h = m.h, sc = m.sc;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var cx = cv.getContext('2d'), id = cx.createImageData(w, h), d = id.data;
    var isDark = theme === 'dark';
    var top = new Int32Array(w), x, y;
    for (x = 0; x < w; x++) { top[x] = h; for (y = 0; y < h; y++) { var ii = y * w + x; if (m.alpha[ii] && m.cld[ii] < 128) { top[x] = y; break; } } }
    var rimH = 3.2 * sc;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        var i = y * w + x, o = i * 4;
        if (!m.alpha[i]) continue;
        var cl = m.cld[i] / 255, hz = m.haze[i] / 255, gl = m.glow[i] / 255, t = m.tone[i] / 255, cs = m.cshade[i] / 255;
        var rr, gg, bb, cr, cgc, cb;
        if (!isDark) {
          var g = 56 + Math.pow(t, 1.05) * 184;
          rr = g; gg = g; bb = g + 2;
          var rg = Math.min(1, gl * 0.42);
          rr += (206 - g) * rg * (0.5 + 0.5 * t); gg += (112 - g) * rg * 0.7; bb += (124 - g) * rg * 0.7;
          var cb0 = 220 + cs * 36;
          cr = cb0; cgc = cb0; cb = cb0 + 1;
          rr += (cr - rr) * cl; gg += (cgc - gg) * cl; bb += (cb - bb) * cl;
          var hk0 = hz * (0.25 + 0.75 * cl); rr += (247 - rr) * hk0; gg += (247 - gg) * hk0; bb += (248 - bb) * hk0;
        } else {
          var g2 = 8 + Math.pow(Math.min(1, t * 1.4), 1.1) * 245;
          rr = g2 * 0.82; gg = g2 * 0.93; bb = g2 * 1.12 + 10;
          var rim = 0;
          if (cl < 0.5 && y - top[x] < rimH && gl > 0.05) rim = (1 - (y - top[x]) / rimH) * Math.min(1, gl * 1.6);
          var rg2 = Math.min(1, gl * 0.5 + rim * 0.9);
          rr += (150 - rr) * rg2 * 0.6; gg += (190 - gg) * rg2 * 0.7; bb += (255 - bb) * rg2 * 0.8;
          var cb1 = 46 + cs * 46;
          cr = cb1 * 0.92; cgc = cb1 * 1.02; cb = cb1 * 1.28 + 6;
          rr += (cr - rr) * cl; gg += (cgc - gg) * cl; bb += (cb - bb) * cl;
          var hk = hz * (0.06 + 0.94 * cl); rr += (40 - rr) * hk; gg += (50 - gg) * hk; bb += (74 - bb) * hk;
        }
        d[o] = rr; d[o + 1] = gg; d[o + 2] = bb; d[o + 3] = 255;
      }
    }
    cx.putImageData(id, 0, 0);
    return { cv: cv, top: top };
  }

  /* ---------- fog tiles ---------- */
  function fogTile(theme, seed, tw, th, soft) {
    var cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
    var cx = cv.getContext('2d'), id = cx.createImageData(tw, th), d = id.data;
    var col = theme === 'dark' ? [150, 166, 200] : [255, 255, 255];
    for (var y = 0; y < th; y++) {
      var vy = y / th, env = Math.sin(vy * Math.PI); env = Math.pow(env, soft);
      for (var x = 0; x < tw; x++) {
        var n = 0.55 * vnoise(x / tw * 5, y / 26, seed, 5) + 0.3 * vnoise(x / tw * 14, y / 14, seed + 1, 14) + 0.15 * vnoise(x / tw * 36, y / 8, seed + 2, 36);
        var a = sstep(0.34, 0.8, n) * env;
        var o = (y * tw + x) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = a * 255;
      }
    }
    cx.putImageData(id, 0, 0);
    return cv;
  }

  /* ---------- sizing ---------- */
  function seedStars() {
    stars = [];
    var n = Math.round(Math.min(320, W * hy / 2600));
    for (var i = 0; i < n; i++) {
      stars.push({ x: hash(i, 1, 77) * W, y: Math.pow(hash(i, 2, 77), 1.3) * (hy + 10), s: 0.5 + hash(i, 3, 77) * 1.1, p: hash(i, 4, 77) * 6.28, f: 0.5 + hash(i, 5, 77) * 1.6 });
    }
  }

  function resize() {
    var r = host.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    if (!W || !H) return;
    S = Math.min(H, Math.max(160, sizer.offsetHeight));
    HYF = compact ? 0.4 : (W < 700 ? 0.3 : 0.477);
    scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    hy = S * HYF;
    seedStars();
    built = false;
    drawFrame(performance.now());
    clearTimeout(resize.t);
    resize.t = setTimeout(build, 40);
  }

  function build() {
    if (!W) return;
    if (!HM) buildTerrain();
    var m = renderMassif();
    var l = colorize(m, 'light'), d = colorize(m, 'dark');
    img = { light: l, dark: d, w: m.w, h: m.h };
    fog = {
      light: [fogTile('light', 21, 640, 120, 1.2), fogTile('light', 31, 640, 120, 1.0), fogTile('light', 41, 640, 140, 0.8)],
      dark: [fogTile('dark', 21, 640, 120, 1.2), fogTile('dark', 31, 640, 120, 1.0), fogTile('dark', 41, 640, 140, 0.8)]
    };
    built = true;
    fade = reduce ? 1 : 0;
    placeMarks();
    kick();
  }

  function placeMarks() { /* reserved: proof numbers live in the .bench gauge */ }

  /* ---------- frame ---------- */
  var pats = new Map();
  function drawFog(tile, y, h, speed, par, alpha, t) {
    var sc = h / tile.height, k = sc * 1.8, tw = tile.width * k;
    var off = reduce ? 0 : ((t / 1000 * speed + scrollY * par) % tw + tw) % tw;
    var pat = pats.get(tile); if (!pat) { pat = ctx.createPattern(tile, 'repeat'); pats.set(tile, pat); }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(-off, y);
    ctx.scale(k, sc);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, (W + off) / k + 2, tile.height);
    ctx.restore();
  }

  function drawFrame(now) {
    if (!W) return;
    var pal = dark ? PAL.dark : PAL.light;
    var t = now - t0;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var top = H - S;                       // scene top in canvas
    var hAbs = top + hy;
    // sky
    var g = ctx.createLinearGradient(0, 0, 0, hAbs + 4);
    g.addColorStop(0, rgb(pal.skyTop)); g.addColorStop(1, rgb(pal.skyHor));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hAbs + 4);
    // haze base under massif
    ctx.fillStyle = dark ? 'rgb(40,50,74)' : 'rgb(247,247,248)';
    ctx.fillRect(0, hAbs, W, H - hAbs);
    // stars
    if (dark) {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t / 1000 * s.f + s.p);
        var fadeY = 1 - Math.min(1, s.y / (hy + 10)) * 0.8;
        ctx.fillStyle = 'rgba(236,242,255,' + (1.0 * tw * fadeY).toFixed(3) + ')';
        ctx.fillRect(s.x, s.y - scrollY * 0.03, s.s, s.s);
      }
    }
    // horizon glow
    var hg = ctx.createLinearGradient(0, hAbs - 120, 0, hAbs);
    hg.addColorStop(0, dark ? 'rgba(70,84,120,0)' : 'rgba(255,255,255,0)');
    hg.addColorStop(1, dark ? 'rgba(60,74,110,0)' : 'rgba(255,255,255,0.5)');
    ctx.fillStyle = hg; ctx.fillRect(0, hAbs - 120, W, 120);

    var par = Math.min(120, scrollY * 0.12);
    // far fog band
    if (fog) drawFog(fog[dark ? 'dark' : 'light'][0], hAbs - 6 + par * 0.4, 70, 5, 0.04, dark ? 0.12 : 0.8, t);
    if (img) {
      ctx.globalAlpha = fade;
      ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img[dark ? 'dark' : 'light'].cv, 0, top + par, W, S);
      ctx.globalAlpha = 1;
      if (fog) {
        var set = fog[dark ? 'dark' : 'light'], fa = pal.fogA;
        drawFog(set[1], top + S * (dark ? 0.62 : 0.55) + par, S * 0.28, 9, 0.1, fa * (dark ? 0.6 : 0.78), t);
        drawFog(set[2], top + S * 0.78 + par * 1.3, S * 0.3, 15, 0.18, fa * (dark ? 0.7 : 0.9), t);
      }
    }
    // fade into page
    var fh = Math.min(S * 0.4, H);
    var fg = ctx.createLinearGradient(0, H - fh, 0, H);
    fg.addColorStop(0, rgb(pal.ground, 0)); fg.addColorStop(0.75, rgb(pal.ground, 0.92)); fg.addColorStop(1, rgb(pal.ground, 1));
    ctx.fillStyle = fg; ctx.fillRect(0, H - fh, W, fh + 1);
    // soft top fade for header legibility (light)
  }

  /* ---------- loop ---------- */
  function inView() {
    var r = host.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && !document.hidden;
  }
  function loop(now) {
    if (!inView() && fade >= 1) { running = false; return; }
    running = true;
    if (fade < 1) fade = Math.min(1, fade + 0.025);
    scrollY = Math.max(0, -host.getBoundingClientRect().top);
    drawFrame(now);
    if (reduce && fade >= 1) { running = false; return; }
    requestAnimationFrame(loop);
  }
  function kick() { if (!running && built) { running = true; requestAnimationFrame(loop); } }

  window.addEventListener('scroll', function () {
    scrollY = Math.max(0, -host.getBoundingClientRect().top);
    if (reduce && built) drawFrame(performance.now()); else kick();
  }, { passive: true });
  document.addEventListener('visibilitychange', kick);
  document.addEventListener('rm:themechange', function () { dark = root.dataset.theme !== 'light'; if (W) drawFrame(performance.now()); kick(); });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
  window.__summitScene = { redraw: function () { drawFrame(performance.now()); } };
  resize();
})();
