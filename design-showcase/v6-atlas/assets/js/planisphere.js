(function () {
  'use strict';
  var D = window.AtlasData, host = document.getElementById('wheel');
  if (!host) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var rnd = D.rng(97), f = function (n) { return n.toFixed(1); };
  function pol(r, a) { a = a * Math.PI / 180; return [r * Math.sin(a), -r * Math.cos(a)]; }

  var s = '';
  /* fixed plate: degree scale */
  var t1 = '', t5 = '', t10 = '';
  for (var d = 0; d < 360; d++) {
    var len = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5, p1 = pol(505, d), p2 = pol(505 - len, d);
    var seg = 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]);
    if (d % 10 === 0) t10 += seg; else if (d % 5 === 0) t5 += seg; else t1 += seg;
  }
  s += '<g class="w-ring"><circle r="515" class="l2"/><circle r="505" class="l1"/><circle r="491" class="l2"/><circle r="470" class="l1"/>';
  s += '<path d="' + t1 + '" class="l3"/><path d="' + t5 + '" class="l2"/><path d="' + t10 + '" class="l1"/>';
  for (d = 0; d < 360; d += 30) s += '<text transform="rotate(' + d + ') translate(0 -475)" class="w-deg" text-anchor="middle">' + d + '&deg;</text>';
  s += '</g>';

  /* rotating wheel */
  s += '<defs><clipPath id="sky"><circle r="468"/></clipPath></defs><g clip-path="url(#sky)"><g id="wheel-rot">';
  s += '<circle r="470" class="w-sky"/>';
  s += '<path d="M-440 -150C-250 -300 40 40 440 -110" class="w-band"/>';
  [117, 233, 350].forEach(function (r, i) { s += '<circle r="' + r + '" class="' + (i === 2 ? 'l1 eq' : 'l3 dash') + '"/>'; });
  s += '<text x="6" y="-121" class="w-dec">+60&deg;</text><text x="6" y="-237" class="w-dec">+30&deg;</text><text x="6" y="-354" class="w-dec">0&deg;</text>';
  var ra = '';
  for (d = 0; d < 360; d += 15) { var a1 = pol(16, d), a2 = pol(470, d); ra += 'M' + f(a1[0]) + ' ' + f(a1[1]) + 'L' + f(a2[0]) + ' ' + f(a2[1]); }
  s += '<path d="' + ra + '" class="l3"/>';
  s += '<circle cx="0" cy="-91" r="350" class="l2 ecl"/>';
  for (d = 0; d < 360; d += 15) s += '<text transform="rotate(' + d + ') translate(0 -452)" class="w-ra" text-anchor="middle">' + (d / 15) + 'h</text>';
  /* field stars */
  var fs = '';
  for (var i = 0; i < 360; i++) {
    var rr = Math.sqrt(rnd()) * 462, aa = rnd() * 360, q = pol(rr, aa), m = rnd();
    fs += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + f(0.55 + m * m * m * 1.9) + '" opacity="' + f(0.3 + rnd() * 0.5) + '"/>';
  }
  s += '<g class="w-field">' + fs + '</g>';
  /* pole */
  s += '<g class="w-pole"><circle r="26" class="l3"/><circle r="9" class="l2"/><path d="M0-22V22M-22 0H22M-13-13L13 13M13-13L-13 13" class="l2"/><circle r="3.6" class="w-st"/></g>';

  /* constellations */
  var groups = D.groups.map(function (g) {
    var n = g.tools.length, R = 50 + 24 * Math.sqrt(n), L = D.layout(g, R);
    var c = pol(232, g.angle), out = pol(1, g.angle);
    var path = '';
    L.edges.forEach(function (e) { path += 'M' + f(L.pts[e[0]].x) + ' ' + f(L.pts[e[0]].y) + 'L' + f(L.pts[e[1]].x) + ' ' + f(L.pts[e[1]].y); });
    var h = '<g class="const" data-id="' + g.id + '" transform="translate(' + f(c[0]) + ' ' + f(c[1]) + ')">';
    h += '<circle r="' + f(R + 14) + '" class="hit"/>';
    h += '<path d="' + path + '" class="c-ghost"/><path d="' + path + '" class="c-line" pathLength="1"/>';
    L.pts.forEach(function (p) {
      var r = D.radius(p.mag) * 1.25, left = p.x < 0;
      h += '<g transform="translate(' + f(p.x) + ' ' + f(p.y) + ')" class="st m' + p.mag + '">';
      if (p.mag === 1) h += '<path d="M0-13V13M-13 0H13" class="spike"/><circle r="9" class="ring"/>';
      else if (p.mag === 2) h += '<circle r="7" class="ring"/>';
      h += '<circle r="' + r + '" class="w-st"/>';
      h += '<g class="unrot"><text x="' + (left ? -10 : 10) + '" y="4" text-anchor="' + (left ? 'end' : 'start') + '" class="tl">' + p.name.replace('&', '&amp;') + '</text></g></g>';
    });
    var nm = pol(R + 24, 0);
    h += '<g transform="translate(' + f(out[0] * (R * 0.35)) + ' ' + f(out[1] * (R * 0.35) - R - 20) + ')"><g class="unrot"><text class="cname" text-anchor="middle">' + g.name.replace('&', '&amp;') + '</text></g></g>';
    return h + '</g>';
  });
  s += groups.join('');
  s += '</g></g>';

  /* fixed horizon of mountains */
  function ridge(a) {
    var v = Math.abs(Math.sin(a * 0.052 + 1.3)) * 17 + Math.abs(Math.sin(a * 0.131 + 0.4)) * 11 + Math.abs(Math.sin(a * 0.317 + 2.1)) * 6 + Math.abs(Math.sin(a * 0.83)) * 3;
    return 3 + v;
  }
  var rd = '', od = '';
  for (var k = 0; k <= 720; k++) { var A = k * 0.5, P = pol(471 - ridge(A), A); rd += (k ? 'L' : 'M') + f(P[0]) + ' ' + f(P[1]); }
  rd += 'Z';
  for (k = 0; k <= 360; k++) { var Q = pol(471, k); od += (k ? 'L' : 'M') + f(Q[0]) + ' ' + f(Q[1]); }
  od += 'Z';
  s += '<g class="w-mtn"><path d="' + rd + od + '" fill-rule="evenodd" class="m-fill"/><path d="' + rd + od + '" fill-rule="evenodd" class="m-hatch"/><path d="' + rd + '" class="m-edge"/></g>';

  host.innerHTML = '<svg id="wheel-svg" viewBox="-520 -520 1040 1040" aria-hidden="true" focusable="false">' + s + '</svg>';
  var svg = document.getElementById('wheel-svg'), rot = document.getElementById('wheel-rot');
  var unrots = svg.querySelectorAll('.unrot'), consts = svg.querySelectorAll('.const');

  var angle = 8, vel = 0, last = 0, running = false, visible = true, hover = false, drag = null;
  function apply() {
    rot.setAttribute('transform', 'rotate(' + angle.toFixed(2) + ')');
    var u = 'rotate(' + (-angle).toFixed(2) + ')';
    for (var i = 0; i < unrots.length; i++) unrots[i].setAttribute('transform', u);
  }
  function loop(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!drag) {
      angle += vel * dt * 60;
      vel *= 0.94; if (Math.abs(vel) < 0.002) vel = 0;
      if (!hover && !reduced.matches) angle += dt * 0.9;
    }
    apply();
    requestAnimationFrame(loop);
  }
  function sync() {
    var want = visible && !document.hidden && !reduced.matches;
    if (want && !running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    if (!want) running = false;
  }
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; sync(); }).observe(host);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener && reduced.addEventListener('change', sync);
  apply(); sync();

  /* interaction: drag, wheel, keys */
  function ang(e) {
    var r = svg.getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
  }
  svg.addEventListener('pointerdown', function (e) {
    drag = { a: ang(e), id: e.pointerId, moved: 0 }; vel = 0;
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    host.classList.add('dragging');
  });
  svg.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var a = ang(e), d = a - drag.a; if (d > 180) d -= 360; if (d < -180) d += 360;
    angle += d; vel = d * 0.25; drag.a = a; if (reduced.matches) apply();
  });
  function end() { drag = null; host.classList.remove('dragging'); }
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  host.addEventListener('wheel', function (e) {
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault(); angle += (e.deltaX || e.deltaY) * 0.12; if (reduced.matches) apply();
    }
  }, { passive: false });
  host.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 1 : 6;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { angle += step; e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { angle -= step; e.preventDefault(); }
    else return;
    apply();
  });

  /* constellation focus + index */
  var list = document.getElementById('idx-list');
  list.innerHTML = D.groups.map(function (g) {
    return '<div class="idx-item" data-id="' + g.id + '"><button type="button" class="idx" aria-expanded="false" aria-controls="cap-' + g.id + '"><span class="idx-mark">' + D.emblem(g, 40) + '</span><span class="idx-name">' + g.name + '</span><span class="idx-n">' + g.tools.length + ' stars</span></button>' +
      '<div class="idx-cap" id="cap-' + g.id + '" role="region" aria-label="' + g.name + ' plate caption"><ul class="tools">' +
      g.tools.map(function (t) { return '<li>' + t[0].replace('&', '&amp;') + '</li>'; }).join('') + '</ul></div></div>';
  }).join('');
  var items = list.querySelectorAll('.idx-item'), selected = 'llm', shown = null;
  function show(id) {
    if (shown === id) return; shown = id;
    consts.forEach(function (c) { c.classList.toggle('is-active', c.dataset.id === id); });
    items.forEach(function (it) {
      var on = it.dataset.id === id;
      it.classList.toggle('is-active', on);
      it.querySelector('.idx').setAttribute('aria-expanded', String(on));
    });
  }
  function choose(id) { selected = id; show(id); }
  items.forEach(function (it) {
    var b = it.querySelector('.idx'), id = it.dataset.id;
    b.addEventListener('click', function () { choose(id); });
    b.addEventListener('mouseenter', function () { show(id); });
    b.addEventListener('focus', function () { show(id); });
    it.addEventListener('mouseleave', function () { show(selected); });
    b.addEventListener('blur', function () { show(selected); });
  });
  consts.forEach(function (c) {
    c.addEventListener('pointerenter', function () { hover = true; show(c.dataset.id); });
    c.addEventListener('pointerleave', function () { hover = false; show(selected); });
    c.addEventListener('click', function () { choose(c.dataset.id); });
  });
  host.addEventListener('pointerleave', function () { hover = false; });
  show('llm');
})();
