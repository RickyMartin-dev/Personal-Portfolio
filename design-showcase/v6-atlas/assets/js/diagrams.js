(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var f = function (n) { return n.toFixed(1); };
  var orb = document.getElementById('dg-orbit');
  if (orb) {
    var cx = 280, cy = 180, rx = 212, ry = 108, tilt = -14 * Math.PI / 180;
    var pt = function (th, k) {
      k = k || 1;
      var x = Math.cos(th) * rx * k, y = Math.sin(th) * ry * k;
      return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
    };
    var stages = [['Data', 'DVC'], ['Train', 'TensorFlow'], ['Track', 'MLflow'], ['Serve', 'Flask · Docker'], ['Deploy', 'AWS']];
    var h = '<g transform="rotate(-14 280 180)"><ellipse cx="280" cy="180" rx="212" ry="108" class="l1 orb-main"/><ellipse cx="280" cy="180" rx="150" ry="76" class="l3 dash"/><ellipse cx="280" cy="180" rx="88" ry="44" class="l3 dash"/></g>';
    h += '<circle cx="280" cy="180" r="30" fill="url(#hatch-d)" class="l2"/><circle cx="280" cy="180" r="30" class="l2" fill="none"/><circle cx="280" cy="180" r="5" class="dg-st"/><path d="M280 160v40M260 180h40" class="l3"/>';
    h += '<text x="280" y="228" text-anchor="middle" class="dg-lab sc">Model</text>';
    var links = '';
    stages.forEach(function (s, i) {
      var th = (-110 + i * 72) * Math.PI / 180, p = pt(th), nx = Math.cos(th), ny = Math.sin(th);
      var lx = p[0] + (nx >= 0 ? 18 : -18), anchor = nx >= -0.2 ? 'start' : 'end';
      if (Math.abs(nx) < 0.35) { anchor = 'middle'; lx = p[0]; }
      var ly = p[1] + (ny < -0.2 ? -22 : ny > 0.4 ? 30 : 4);
      h += '<circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="12" class="dg-halo"/><circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="12" fill="url(#hatch)" class="l2"/><circle cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="3.4" class="dg-st"/>';
      h += '<text x="' + f(lx) + '" y="' + f(ly) + '" text-anchor="' + anchor + '" class="dg-name">' + s[0] + '</text><text x="' + f(lx) + '" y="' + f(ly + 15) + '" text-anchor="' + anchor + '" class="dg-lab">' + s[1] + '</text>';
    });
    h += '<g id="comet"><circle r="9" class="comet-halo"/><circle r="3.6" class="comet-head"/></g>';
    orb.innerHTML = h;
    var comet = document.getElementById('comet'), th0 = -2.2, vis = true, raf = 0, last = 0;
    var tick = function (t) {
      if (!vis || document.hidden || reduced.matches) { raf = 0; return; }
      th0 += Math.min(0.05, (t - last) / 1000) * 0.32; last = t;
      var p = pt(th0); comet.setAttribute('transform', 'translate(' + f(p[0]) + ' ' + f(p[1]) + ')');
      raf = requestAnimationFrame(tick);
    };
    var go = function () { if (!raf && vis && !document.hidden && !reduced.matches) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    var p0 = pt(th0); comet.setAttribute('transform', 'translate(' + f(p0[0]) + ' ' + f(p0[1]) + ')');
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; go(); }).observe(orb);
    document.addEventListener('visibilitychange', go);
  }

  var sen = document.getElementById('dg-sensor');
  if (sen) {
    var rnd = window.AtlasData.rng(31), s = '', cols = 24, rows = 19, x0 = 24, y0 = 34, sp = 14.6;
    var ax = 178, ay = 172;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var x = x0 + c * sp + (rnd() - 0.5) * 3.2, y = y0 + r * sp + (rnd() - 0.5) * 3.2;
      var dx = (x - ax) / 78, dy = (y - ay) / 54, d2 = dx * dx + dy * dy, p = Math.exp(-d2 * 1.5);
      if (rnd() > 0.35 + p * 0.7) continue;
      s += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(0.7 + p * 2.7 + rnd() * 0.4) + '"/>';
    }
    var h2 = '<g class="dg-dots">' + s + '</g>';
    h2 += '<rect x="14" y="24" width="' + (cols * sp + 6) + '" height="' + (rows * sp + 6) + '" class="l2" fill="none"/>';
    var ticks = '';
    for (var i = 0; i <= cols; i++) ticks += 'M' + f(x0 - 4 + i * sp + 4) + ' 24v' + (i % 4 ? 4 : 8);
    for (i = 0; i <= rows; i++) ticks += 'M14 ' + f(y0 - 4 + i * sp + 4) + 'h' + (i % 4 ? 4 : 8);
    h2 += '<path d="' + ticks + '" class="l2"/>';
    h2 += '<ellipse cx="' + ax + '" cy="' + ay + '" rx="78" ry="54" class="l1 dash" fill="none" transform="rotate(-18 ' + ax + ' ' + ay + ')"/>';
    h2 += '<text x="22" y="' + (y0 + rows * sp + 26) + '" class="dg-lab">Soft sensor array</text>';
    var nodes = [[420, 92, 'Signal', 'tactile readout'], [420, 190, 'Features', 'soft sensors'], [420, 288, 'Class', 'touch understanding']];
    h2 += '<path d="M' + (ax + 60) + ' ' + (ay - 30) + 'C330 120 380 90 420 92M420 92V190M420 190V288" class="l1" fill="none"/>';
    nodes.forEach(function (n) {
      h2 += '<circle cx="' + n[0] + '" cy="' + n[1] + '" r="11" class="dg-halo"/><circle cx="' + n[0] + '" cy="' + n[1] + '" r="11" fill="url(#hatch)" class="l2"/><circle cx="' + n[0] + '" cy="' + n[1] + '" r="3.4" class="dg-st"/>';
      h2 += '<text x="' + (n[0] + 20) + '" y="' + (n[1] + 2) + '" class="dg-name">' + n[2] + '</text><text x="' + (n[0] + 20) + '" y="' + (n[1] + 17) + '" class="dg-lab sm">' + n[3] + '</text>';
    });
    sen.innerHTML = h2;
  }
})();
