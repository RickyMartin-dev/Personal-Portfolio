/* Skills as an interactive star chart. The toolkit <dl> stays the source of truth: each group becomes an
   accordion button (keyboard accessible), and a decorative SVG sky draws one constellation per group.
   Hovering or focusing a group lights its constellation and lists its tools. Static SVG, CSS transitions only. */
(function () {
  'use strict';
  var dl = document.querySelector('dl.index');
  if (!dl) return;
  var NS = 'http://www.w3.org/2000/svg';
  var rows = [].slice.call(dl.children);
  var groups = rows.map(function (r) {
    return { row: r, dt: r.querySelector('dt'), dd: r.querySelector('dd'), name: r.querySelector('dt').textContent.trim(), tools: [].map.call(r.querySelectorAll('li'), function (li) { return li.textContent.trim(); }) };
  });
  if (!groups.length) return;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- layout: a region per group, Poisson-ish stars, minimum spanning tree plus two loop edges ---------- */
  var VW = 760, VH = 520;
  var REG = [
    { x: 22, y: 48, w: 276, h: 176 }, { x: 336, y: 36, w: 404, h: 190 }, { x: 22, y: 292, w: 218, h: 200 },
    { x: 276, y: 292, w: 262, h: 200 }, { x: 574, y: 292, w: 166, h: 200 }
  ];
  function layout(g, gi) {
    var R = REG[gi % REG.length], n = g.tools.length, rnd = rng(911 + gi * 97), pts = [], dmin = 0.78 * Math.sqrt(R.w * R.h / n), tries = 0, i;
    while (pts.length < n && tries < 4000) {
      var p = { x: R.x + 12 + rnd() * (R.w - 24), y: R.y + 14 + rnd() * (R.h - 28) }, ok = true;
      for (i = 0; i < pts.length; i++) { if (Math.hypot(pts[i].x - p.x, pts[i].y - p.y) < dmin) { ok = false; break; } }
      if (ok) pts.push(p);
      if (++tries % 120 === 0) dmin *= 0.93;
    }
    while (pts.length < n) pts.push({ x: R.x + rnd() * R.w, y: R.y + rnd() * R.h });
    // order stars left to right so the tool order reads loosely across the sky
    var order = pts.map(function (p, idx) { return idx; });
    pts.forEach(function (p, idx) { p.m = rnd() < 0.18 ? 2 : rnd() < 0.5 ? 1 : 0; });
    // Prim MST
    var inT = [0], edges = [], used = {}; used[0] = 1;
    while (inT.length < n) {
      var bd = 1e9, bi = -1, bj = -1;
      inT.forEach(function (a) { for (var j = 0; j < n; j++) { if (used[j]) continue; var d = Math.hypot(pts[a].x - pts[j].x, pts[a].y - pts[j].y); if (d < bd) { bd = d; bi = a; bj = j; } } });
      edges.push([bi, bj]); used[bj] = 1; inT.push(bj);
    }
    var cand = [];
    for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) cand.push([i, j, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)]);
    cand.sort(function (a, b) { return a[2] - b[2]; });
    var extra = 0;
    for (i = 0; i < cand.length && extra < 2 && n > 4; i++) {
      var c = cand[i], has = edges.some(function (e) { return (e[0] === c[0] && e[1] === c[1]) || (e[0] === c[1] && e[1] === c[0]); });
      if (!has && c[2] > dmin * 0.95) { edges.push([c[0], c[1]]); extra++; }
    }
    return { pts: pts, edges: edges, R: R, order: order };
  }

  /* ---------- build svg ---------- */
  var fig = document.createElement('figure');
  fig.className = 'starchart';
  fig.setAttribute('aria-hidden', 'true');
  var svg = el('svg', { viewBox: '0 0 ' + VW + ' ' + VH, focusable: 'false', preserveAspectRatio: 'xMidYMid meet' });
  var defs = el('defs', {}, svg);
  var rg = el('radialGradient', { id: 'csg' }, defs);
  el('stop', { offset: '0', style: 'stop-color:var(--cs-glow);stop-opacity:.75' }, rg);
  el('stop', { offset: '0.4', style: 'stop-color:var(--cs-glow);stop-opacity:.22' }, rg);
  el('stop', { offset: '1', style: 'stop-color:var(--cs-glow);stop-opacity:0' }, rg);
  // atlas margin ticks
  var tk = el('g', { class: 'cs-ticks' }, svg), i;
  for (i = 0; i <= VW; i += 20) el('path', { d: 'M' + i + ' 0v' + (i % 100 === 0 ? 9 : 4) + 'M' + i + ' ' + VH + 'v-' + (i % 100 === 0 ? 9 : 4) }, tk);
  for (i = 0; i <= VH; i += 20) el('path', { d: 'M0 ' + i + 'h' + (i % 100 === 0 ? 9 : 4) + 'M' + VW + ' ' + i + 'h-' + (i % 100 === 0 ? 9 : 4) }, tk);
  // background dust
  var bg = el('g', { class: 'cs-dust' }, svg), br = rng(5);
  for (i = 0; i < 90; i++) el('circle', { cx: (br() * VW).toFixed(1), cy: (br() * VH).toFixed(1), r: (0.5 + br() * 0.7).toFixed(2), style: 'opacity:' + (0.25 + br() * 0.5).toFixed(2) }, bg);

  var cgs = groups.map(function (g, gi) {
    var L = layout(g, gi), cg = el('g', { class: 'cg', 'data-i': gi }, svg), placed = [];
    g.L = L;
    el('rect', { class: 'cs-hit', x: L.R.x - 6, y: L.R.y - 22, width: L.R.w + 12, height: L.R.h + 30 }, cg);
    var ed = el('g', { class: 'cs-edges' }, cg);
    L.edges.forEach(function (e, k) {
      el('path', { class: 'ce', pathLength: '1', d: 'M' + L.pts[e[0]].x.toFixed(1) + ' ' + L.pts[e[0]].y.toFixed(1) + 'L' + L.pts[e[1]].x.toFixed(1) + ' ' + L.pts[e[1]].y.toFixed(1), style: '--k:' + k }, ed);
    });
    var topY = 1e9; L.pts.forEach(function (p) { if (p.y < topY) topY = p.y; });
    var nm = el('text', { class: 'sky-label cs-name', x: L.R.x + 2, y: L.R.y - 6 }, cg);
    nm.textContent = g.name;
    L.pts.forEach(function (p, k) {
      var s = el('g', { class: 'cstar m' + p.m, transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')' }, cg);
      el('circle', { class: 'cs-halo', r: 15, fill: 'url(#csg)' }, s);
      var sp = p.m === 2 ? 6.5 : p.m === 1 ? 4.5 : 3;
      el('path', { class: 'cs-spike', d: 'M-' + sp + ' 0H' + sp + 'M0 -' + sp + 'V' + sp }, s);
      el('circle', { class: 'cs-dot', r: p.m === 2 ? 2.4 : p.m === 1 ? 1.9 : 1.4 }, s);
    });
    // labels: first free of right / left / below / above, kept inside the plate
    var boxes = [];
    L.pts.forEach(function (p) { boxes.push({ l: p.x - 5, r: p.x + 5, t: p.y - 5, b: p.y + 5 }); });
    var texts = el('g', { class: 'cs-labels' }, cg);
    L.pts.forEach(function (p, k) {
      var txt = g.tools[k], w = txt.length * 7.3 + 6, h = 15;
      var opts = [
        { x: p.x + 9, y: p.y + 4, a: 'start', l: p.x + 8, t: p.y - 8 }, { x: p.x - 9, y: p.y + 4, a: 'end', l: p.x - 9 - w, t: p.y - 8 },
        { x: p.x, y: p.y + 19, a: 'middle', l: p.x - w / 2, t: p.y + 7 }, { x: p.x, y: p.y - 11, a: 'middle', l: p.x - w / 2, t: p.y - 24 }
      ], pick = null, o;
      for (var q = 0; q < opts.length && !pick; q++) {
        o = opts[q];
        var bx = { l: o.l, r: o.l + w, t: o.t, b: o.t + h };
        if (bx.l < 4 || bx.r > VW - 4 || bx.t < 4 || bx.b > VH - 4) continue;
        var clash = boxes.some(function (b2, bi) { return bi !== k && bx.l < b2.r && bx.r > b2.l && bx.t < b2.b && bx.b > b2.t; });
        if (!clash) { pick = o; boxes.push(bx); }
      }
      if (!pick) { pick = opts[0]; boxes.push({ l: pick.l, r: pick.l + w, t: pick.t, b: pick.t + h }); }
      var t = el('text', { class: 'sky-label cs-lbl', x: pick.x.toFixed(1), y: pick.y.toFixed(1), 'text-anchor': pick.a }, texts);
      t.textContent = txt;
    });
    return cg;
  });
  fig.appendChild(svg);

  /* ---------- rail (the original dl, now an accordion) ---------- */
  var wrap = document.createElement('div');
  wrap.className = 'chart-layout';
  dl.parentNode.insertBefore(wrap, dl);
  wrap.appendChild(fig);
  wrap.appendChild(dl);
  dl.classList.add('is-chart');
  var btns = [];
  groups.forEach(function (g, gi) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cg-btn';
    b.setAttribute('aria-expanded', 'false');
    var id = 'tk-' + gi;
    g.dd.id = id;
    b.setAttribute('aria-controls', id);
    b.innerHTML = '<span class="cg-star" aria-hidden="true"></span><span class="cg-name"></span><span class="cg-count"></span>';
    b.querySelector('.cg-name').textContent = g.name;
    b.querySelector('.cg-count').textContent = g.tools.length + (g.tools.length === 1 ? ' star' : ' stars');
    g.dt.textContent = '';
    g.dt.appendChild(b);
    btns.push(b);
    g.row.addEventListener('mouseenter', function () { activate(gi); });
    b.addEventListener('focus', function () { activate(gi); });
    b.addEventListener('click', function () { activate(gi); });
    b.addEventListener('keydown', function (e) {
      var k = e.key, to = -1;
      if (k === 'ArrowDown' || k === 'ArrowRight') to = (gi + 1) % groups.length;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') to = (gi + groups.length - 1) % groups.length;
      else if (k === 'Home') to = 0; else if (k === 'End') to = groups.length - 1;
      if (to > -1) { e.preventDefault(); btns[to].focus(); }
    });
    cgs[gi].addEventListener('mouseenter', function () { activate(gi); });
  });
  var cur = -1;
  function activate(i) {
    if (i === cur) return;
    cur = i;
    groups.forEach(function (g, gi) {
      var on = gi === i;
      g.row.classList.toggle('is-open', on);
      btns[gi].setAttribute('aria-expanded', String(on));
      cgs[gi].classList.toggle('is-on', on);
    });
    svg.classList.add('has-on');
  }
  activate(0);
})();
