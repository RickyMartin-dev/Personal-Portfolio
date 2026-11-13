/* Panorama shared helpers: palette reads (the tune panel writes --violet/--cyan/--amber on :root),
   colour mixing for baked canvases, a seeded rng and the engraved terrain field. */
(function () {
  'use strict';
  var root = document.documentElement;
  var FALLBACK = {
    dark: { '--violet': '#9f7bff', '--cyan': '#5dc7ff', '--amber': '#ffb562', '--ground': '#12131f' },
    light: { '--violet': '#6a46d9', '--cyan': '#1d7fb8', '--amber': '#c4700c', '--ground': '#f7f4fa' }
  };
  function parse(str, fb) {
    var s = (str || '').trim(), m;
    if ((m = /^#([0-9a-f]{3})$/i.exec(s))) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16)];
    if ((m = /^#([0-9a-f]{6})/i.exec(s))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
    if ((m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(s))) return [+m[1], +m[2], +m[3]];
    return fb ? parse(fb) : [128, 128, 128];
  }
  function theme() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }
  function readVar(name) {
    var v = getComputedStyle(root).getPropertyValue(name);
    return parse(v, FALLBACK[theme()][name]);
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c, a) {
    var r = Math.round(c[0]), g = Math.round(c[1]), b = Math.round(c[2]);
    return a === undefined || a >= 1 ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + (+a).toFixed(3) + ')';
  }
  function triplet(c) { return Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]); }
  /* the baked colours, derived the same way afterglow.css derives its CSS vars */
  function palette() {
    var dark = theme() === 'dark';
    var violet = readVar('--violet'), cyan = readVar('--cyan'), amber = readVar('--amber'), ground = readVar('--ground');
    var white = [255, 255, 255];
    return {
      dark: dark, violet: violet, cyan: cyan, amber: amber, ground: ground,
      far: mix(ground, violet, dark ? 0.2 : 0.13),
      top: dark ? mix(amber, white, 0.2) : amber,
      mid: cyan, low: violet,
      base: dark ? mix(violet, [58, 58, 144], 0.3) : mix(violet, white, 0.2),
      rim: dark ? mix(amber, white, 0.3) : mix(amber, white, 0.15),
      haze: dark ? mix(mix(violet, [26, 18, 38], 0.7), amber, 0.18) : mix(mix(violet, white, 0.2), amber, 0.2)
    };
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(ix, iz, seed) {
    var h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed + 1, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, z, seed) {
    var ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    var sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    var a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  }
  function ridged(x, z, seed, oct) {
    var s = 0, a = 1, f = 1, n = 0;
    for (var o = 0; o < (oct || 5); o++) {
      var v = 1 - Math.abs(vnoise(x * f, z * f, seed + o * 7) * 2 - 1);
      s += v * v * a; n += a; a *= 0.5; f *= 2.05;
    }
    return s / n;
  }
  /* P: { peaks:[[u,v,amp,width]], dz, fx, fz, seed, oct } ; (u,v) in 0..1 */
  function field(u, v, P) {
    var env = 0, i;
    for (i = 0; i < P.peaks.length; i++) {
      var p = P.peaks[i];
      var dx = (u - p[0]) / p[3];
      if (dx > 4 || dx < -4) continue;
      var dz = (v - p[1]) / (p[3] * P.dz);
      var d = Math.sqrt(dx * dx + dz * dz);
      env = Math.max(env, p[2] * Math.exp(-Math.pow(d, 1.05) * 1.3));
    }
    var r = ridged(u * P.fx, v * P.fz, P.seed, P.oct);
    var r2 = ridged(u * P.fx * 1.8 + 11, v * P.fz * 1.8, P.seed + 40, 3);
    return env * (0.5 + 0.75 * r) + 0.07 * r2 * (0.4 + v);
  }
  function opt(id, def) {
    try { if (window.RMTune) { var v = window.RMTune.get(id); if (v !== undefined && v !== null) return v; } } catch (e) {}
    return def;
  }
  function motionOff() {
    return root.getAttribute('data-motion') === 'off' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  window.R5 = { parse: parse, theme: theme, readVar: readVar, mix: mix, css: css, triplet: triplet, palette: palette, rng: rng, field: field, ridged: ridged, opt: opt, motionOff: motionOff };
})();
