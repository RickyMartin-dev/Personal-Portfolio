(function () {
  var PAL = {
    plate: '#7d8cc2', plate2: '#93a1d2', rack: '#5a6b92', rackTop: '#71829f', slot: '#222a46',
    ledG: '#55f4a6', ledA: '#ffc05a', white: '#f6f8ff', dot: '#2c3659', cable: '#ffb347',
    belt: '#2e3656', belt2: '#3d4768', rail: '#94a2c4', steel: '#b2bdd6', steelD: '#8190b0',
    tube: '#3a4568', lens: '#6df0ff', tileA: '#4fd1c5', tileB: '#ffb454', tileC: '#a184ff',
    ok: '#5ae38c', glove: '#35417a', sensor: '#5af2d2', sensorB: '#ffc45c', joint: '#8f9bbd',
    palm: '#a3b3d9', accent: '#ffbd59', grass: '#5fbf55', rock: '#9aa3bb', snow: '#f4f8ff',
    trunk: '#8a5a3a', leaf: '#2f8f4a', water: '#43b8f2'
  };
  var GLOW = { ledG: 1, ledA: 1, lens: 1, sensor: 1, sensorB: 1, ok: 1 };
  var TINT = {
    dark: [0.78, 0.84, 1.05],
    light: [1, 1, 1]
  };
  var L = (function () { var v = [0.55, 0.75, 0.35]; var n = Math.hypot(v[0], v[1], v[2]); return v.map(function (c) { return c / n; }); })();

  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  var cache = {};
  function shade(key, s, theme) {
    var id = key + '|' + Math.round(s * 50) + theme;
    if (cache[id]) return cache[id];
    var b = hex(PAL[key]);
    var t = GLOW[key] ? [1, 1, 1] : TINT[theme];
    var k = GLOW[key] ? Math.min(1.05, 0.55 + s * 0.55) : s;
    var o = 'rgb(' + b.map(function (v, i) { return Math.max(0, Math.min(255, Math.round(v * k * t[i]))); }).join(',') + ')';
    cache[id] = o;
    return o;
  }

  function Builder() {
    var m = {};
    return {
      set: function (x, y, z, c) { m[x + ',' + y + ',' + z] = [x, y, z, c]; },
      box: function (x, y, z, w, h, d, c) {
        for (var i = 0; i < w; i++) for (var j = 0; j < h; j++) for (var k = 0; k < d; k++) m[(x + i) + ',' + (y + j) + ',' + (z + k)] = [x + i, y + j, z + k, c];
      },
      del: function (x, y, z) { delete m[x + ',' + y + ',' + z]; },
      get: function (x, y, z) { return m[x + ',' + y + ',' + z]; },
      list: function () {
        var out = [];
        for (var key in m) {
          var v = m[key], x = v[0], y = v[1], z = v[2];
          if (m[(x + 1) + ',' + y + ',' + z] && m[(x - 1) + ',' + y + ',' + z] && m[x + ',' + (y + 1) + ',' + z] && m[x + ',' + (y - 1) + ',' + z] && m[x + ',' + y + ',' + (z + 1)] && m[x + ',' + y + ',' + (z - 1)]) continue;
          out.push(v);
        }
        return out;
      }
    };
  }

  var MODELS = {
    rack: function () {
      var b = Builder();
      b.box(0, 0, 0, 12, 1, 12, 'plate');
      b.box(0, 0, 0, 12, 1, 1, 'plate2'); b.box(0, 0, 0, 1, 1, 12, 'plate2');
      b.box(3, 1, 3, 5, 9, 5, 'rack');
      b.box(3, 10, 3, 5, 1, 5, 'rackTop');
      for (var y = 2; y <= 8; y += 2) {
        b.box(3, y, 7, 5, 1, 1, 'slot');
        b.box(7, y, 3, 1, 1, 5, 'slot');
        b.set(7, y, 7, y % 4 === 0 ? 'ledA' : 'ledG');
        b.set(4, y, 7, 'ledG');
        b.set(7, y, 4, 'ledG');
        b.set(7, y + 1 > 9 ? 9 : y + 1, 5, 'rackTop');
      }
      b.box(3, 1, 7, 5, 1, 1, 'rackTop');
      b.box(8, 1, 6, 4, 1, 1, 'cable'); b.box(11, 1, 6, 1, 1, 4, 'cable');
      /* speech bubble block */
      b.box(5, 13, 6, 6, 4, 1, 'white');
      b.set(6, 12, 6, 'white'); b.set(5, 11, 6, 'white');
      b.set(6, 15, 6, 'dot'); b.set(7, 15, 6, 'dot'); b.set(8, 15, 6, 'dot');
      b.set(7, 14, 6, 'ledG');
      b.box(5, 13, 5, 1, 4, 1, 'steel'); b.box(10, 13, 5, 1, 4, 1, 'steel');
      return b.list();
    },
    scope: function () {
      var b = Builder();
      b.box(0, 0, 0, 16, 1, 10, 'plate');
      b.box(0, 0, 0, 16, 1, 1, 'plate2'); b.box(0, 0, 0, 1, 1, 10, 'plate2');
      /* microscope */
      b.box(1, 1, 1, 5, 1, 4, 'steelD');
      b.box(4, 2, 2, 2, 7, 2, 'steel');
      b.box(2, 8, 2, 4, 2, 2, 'steel');
      b.set(3, 7, 2, 'tube'); b.set(3, 7, 3, 'tube');
      b.set(2, 6, 2, 'tube'); b.set(2, 6, 3, 'tube');
      b.set(1, 5, 2, 'tube'); b.set(1, 5, 3, 'tube');
      b.set(1, 4, 2, 'lens'); b.set(1, 4, 3, 'lens');
      b.box(6, 10, 2, 1, 1, 2, 'tube'); b.box(7, 11, 2, 1, 1, 2, 'tube');
      b.box(0, 3, 1, 4, 1, 4, 'rail');
      b.box(1, 4, 1, 1, 1, 1, 'tileA');
      /* conveyor along x */
      b.box(1, 1, 6, 14, 1, 3, 'rail');
      for (var x = 1; x < 15; x++) {
        b.box(x, 2, 6, 1, 1, 3, x % 2 ? 'belt' : 'belt2');
      }
      b.box(1, 3, 6, 14, 1, 1, 'rail'); b.box(1, 3, 8, 14, 1, 1, 'rail');
      b.box(3, 3, 7, 2, 1, 1, 'tileA');
      b.box(7, 3, 7, 2, 1, 1, 'tileB'); b.box(7, 4, 7, 2, 1, 1, 'tileB');
      b.box(11, 3, 7, 2, 1, 1, 'tileC');
      /* output bin w/ ok light */
      b.box(13, 4, 5, 3, 3, 1, 'rack');
      b.box(14, 5, 5, 1, 1, 1, 'ok');
      b.box(15, 1, 5, 1, 4, 5, 'rack');
      b.set(15, 5, 7, 'ok');
      return b.list();
    },
    hand: function () {
      var b = Builder();
      b.box(0, 0, 0, 12, 1, 12, 'plate');
      b.box(0, 0, 0, 12, 1, 1, 'plate2'); b.box(0, 0, 0, 1, 1, 12, 'plate2');
      b.box(4, 1, 4, 4, 4, 4, 'steelD'); b.box(4, 4, 4, 4, 1, 4, 'rail');
      b.box(2, 5, 4, 8, 5, 2, 'palm');
      for (var x = 2; x < 10; x++) for (var y = 5; y < 10; y++) {
        var sensor = (x + y) % 2 === 0;
        b.set(x, y, 5, sensor ? ((x * 3 + y) % 7 === 0 ? 'sensorB' : 'sensor') : 'glove');
      }
      var fingers = [[2, 3], [4, 5], [6, 5], [8, 4]];
      fingers.forEach(function (f) {
        for (var h = 0; h < f[1]; h++) {
          var c = (h % 2 === 1) ? 'joint' : 'palm';
          if (h === f[1] - 1) c = 'sensor';
          b.box(f[0], 10 + h, 4, 2, 1, 2, c === 'sensor' ? 'palm' : c);
          if (c === 'sensor') b.set(f[0], 10 + h, 5, 'sensor');
          if (c === 'sensor') b.set(f[0] + 1, 10 + h, 5, 'sensorB');
        }
      });
      b.box(10, 6, 4, 1, 1, 2, 'palm'); b.box(11, 7, 4, 1, 1, 2, 'joint'); b.box(11, 8, 4, 1, 1, 2, 'palm'); b.set(11, 9, 5, 'sensor');
      return b.list();
    },
    island: function () {
      var b = Builder();
      var r = 7;
      for (var x = -r; x <= r; x++) for (var z = -r; z <= r; z++) {
        var d = Math.hypot(x, z); if (d > r) continue;
        var top = Math.max(1, Math.round(7 - d * 0.9));
        b.box(x + r, 0, z + r, 1, 1, 1, 'rock');
        for (var y = 1; y <= top; y++) b.set(x + r, y, z + r, y > 4 ? 'snow' : (y > 2 ? 'rock' : 'grass'));
      }
      return b.list();
    }
  };

  function bounds(vox, C) {
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (var a = 0; a < 8; a++) {
      var ang = a * Math.PI / 4, cs = Math.cos(ang), sn = Math.sin(ang);
      vox.forEach(function (v) {
        for (var i = 0; i < 8; i++) {
          var dx = (i & 1 ? 0.5 : -0.5), dy = (i & 2 ? 0.5 : -0.5), dz = (i & 4 ? 0.5 : -0.5);
          var cx = v[0] - C[0] + dx, cz = v[2] - C[1] + dz;
          var X = cx * cs - cz * sn, Z = cx * sn + cz * cs, Y = v[1] + dy;
          var sx = (X - Z) * 0.866, sy = (X + Z) * 0.5 - Y;
          if (sx < minx) minx = sx; if (sx > maxx) maxx = sx; if (sy < miny) miny = sy; if (sy > maxy) maxy = sy;
        }
      });
    }
    return [minx - 1, miny - 1, maxx - minx + 2, maxy - miny + 2];
  }

  var FACES = {
    top: [[0, 1, 0], [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]],
    px: [[1, 0, 0], [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]]],
    nx: [[-1, 0, 0], [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]]],
    pz: [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]]],
    nz: [[0, 0, -1], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]]
  };

  function Plate(el, name) {
    this.el = el;
    this.vox = MODELS[name]();
    var mx = 0, mz = 0, n = 0;
    this.vox.forEach(function (v) { mx += v[0]; mz += v[2]; n++; });
    this.C = [mx / n + 0.5, mz / n + 0.5];
    this.maxY = 0; this.vox.forEach(function (v) { if (v[1] > this.maxY) this.maxY = v[1]; }, this);
    this.limit = this.maxY;
    this.angle = 0;
    var bb = bounds(this.vox, this.C);
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', bb.join(' '));
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', el.getAttribute('data-label') || '');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    el.appendChild(this.svg);
    this.mode = 'rest';
    this.draw();
  }
  Plate.prototype.draw = function () {
    var theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    var a = this.angle, cs = Math.cos(a), sn = Math.sin(a), C = this.C, lim = this.limit;
    var off = [];
    for (var i = 0; i < 8; i++) {
      var dx = (i & 1 ? 0.5 : -0.5), dz = (i & 4 ? 0.5 : -0.5);
      off.push([dx * cs - dz * sn, dx * sn + dz * cs]);
    }
    var vis = [];
    Object.keys(FACES).forEach(function (k) {
      var n = FACES[k][0];
      var nx = n[0] * cs - n[2] * sn, nz = n[0] * sn + n[2] * cs, ny = n[1];
      if (nx + ny + nz > 0.01) {
        var dot = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        vis.push({ k: k, s: 0.52 + 0.5 * dot });
      }
    });
    var items = [];
    for (var q = 0; q < this.vox.length; q++) {
      var v = this.vox[q];
      if (v[1] > lim) continue;
      var cx = v[0] - C[0] + 0.5, cz = v[2] - C[1] + 0.5;
      var X = cx * cs - cz * sn, Z = cx * sn + cz * cs, Y = v[1] + 0.5;
      items.push([X + Y + Z, X, Y, Z, v[3]]);
    }
    items.sort(function (p, r) { return p[0] - r[0]; });
    var out = '';
    for (var t = 0; t < items.length; t++) {
      var it = items[t];
      for (var f = 0; f < vis.length; f++) {
        var corners = FACES[vis[f].k][1], pts = '';
        for (var c = 0; c < 4; c++) {
          var cc = corners[c];
          var ix = (cc[0] ? 1 : 0) + (cc[1] ? 2 : 0) + (cc[2] ? 4 : 0);
          var ox = off[ix][0], oz = off[ix][1];
          var px = it[1] + ox, pz = it[3] + oz, py = it[2] + (cc[1] ? 0.5 : -0.5);
          pts += ((px - pz) * 0.866).toFixed(2) + ',' + ((px + pz) * 0.5 - py).toFixed(2) + ' ';
        }
        var col = shade(it[4], vis[f].k === 'top' ? Math.max(vis[f].s, 0.92) : vis[f].s, theme);
        out += '<polygon points="' + pts + '" fill="' + col + '" stroke="' + col + '" stroke-width="0.05" stroke-linejoin="round"/>';
      }
    }
    this.svg.innerHTML = out;
  };
  Plate.prototype.startSpin = function () {
    if (this.reduce) return;
    this.mode = 'spin';
    this.kick();
  };
  Plate.prototype.stopSpin = function () {
    if (this.mode === 'spin') { this.mode = 'settle'; this.target = Math.ceil(this.angle / (Math.PI * 2)) * Math.PI * 2; this.kick(); }
  };
  Plate.prototype.kick = function () {
    if (this.raf) return;
    var self = this, last = performance.now();
    function step(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      if (now - last < 30) { self.raf = requestAnimationFrame(step); return; }
      last = now;
      if (self.mode === 'spin') self.angle += dt * 1.5;
      else if (self.mode === 'settle') {
        self.angle += (self.target - self.angle) * Math.min(1, dt * 4.5) + 0.004;
        if (Math.abs(self.target - self.angle) < 0.02) { self.angle = 0; self.mode = 'rest'; }
      }
      if (self.mode === 'build') {
        self.limit += dt * (self.maxY / 0.9);
        if (self.limit >= self.maxY) { self.limit = self.maxY; self.mode = 'rest'; }
      }
      self.draw();
      if (self.mode !== 'rest' && !document.hidden) self.raf = requestAnimationFrame(step); else self.raf = 0;
    }
    this.raf = requestAnimationFrame(step);
  };

  function init() {
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var plates = [];
    document.querySelectorAll('[data-iso]').forEach(function (el) {
      var p = new Plate(el, el.getAttribute('data-iso'));
      p.reduce = reduce;
      plates.push(p);
      if (el.hasAttribute('data-spin')) {
        el.addEventListener('pointerenter', function () { p.startSpin(); });
        el.addEventListener('pointerleave', function () { p.stopSpin(); });
        el.addEventListener('focus', function () { p.startSpin(); });
        el.addEventListener('blur', function () { p.stopSpin(); });
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.classList.toggle('is-live'); if (el.classList.contains('is-live')) p.startSpin(); else p.stopSpin(); }
        });
        if (!reduce && 'IntersectionObserver' in window) {
          var seenOut = false;
          var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
              if (!e.isIntersecting) { seenOut = true; return; }
              if (seenOut) { io.disconnect(); p.limit = 0; p.mode = 'build'; p.kick(); }
            });
          }, { threshold: 0.35 });
          io.observe(el);
        }
      }
    });
    document.addEventListener('rm:themechange', function () { plates.forEach(function (p) { p.draw(); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
