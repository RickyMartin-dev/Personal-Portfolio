(function () {
  'use strict';
  var f = function (n) { return n.toFixed(1); };
  var well = document.getElementById('art-tetris');
  if (well) {
    var C = 16, X = 40, Y = 22, rows = [
      '..........', '..........', '..........', '..........', '..........', '..........', '..........', '..........',
      '..........', '......Z...', '..O...ZZ..', '..OO...Z.L', 'I.OOJ.ZZ.L', 'I.TJJ.SSLL', 'ITTTJ.SSLL', 'IOOSS.TTTJ'
    ];
    var pat = { I: 'url(#hatch)', O: 'url(#cross)', T: 'url(#stipple)', J: 'url(#hatch-d)', L: 'url(#hatch)', S: 'url(#cross)', Z: 'url(#stipple)' };
    var s = '<rect x="' + (X - 6) + '" y="' + (Y - 6) + '" width="' + (C * 10 + 12) + '" height="' + (C * 16 + 12) + '" class="l1" fill="none"/><rect x="' + X + '" y="' + Y + '" width="' + C * 10 + '" height="' + C * 16 + '" class="l2" fill="none"/>';
    var g = '';
    for (var i = 1; i < 10; i++) g += 'M' + (X + i * C) + ' ' + Y + 'v' + C * 16;
    for (i = 1; i < 16; i++) g += 'M' + X + ' ' + (Y + i * C) + 'h' + C * 10;
    s += '<path d="' + g + '" class="l3"/>';
    rows.forEach(function (row, r) {
      for (var c = 0; c < 10; c++) {
        var ch = row[c]; if (ch === '.') continue;
        s += '<rect x="' + (X + c * C + 1) + '" y="' + (Y + r * C + 1) + '" width="' + (C - 2) + '" height="' + (C - 2) + '" fill="' + pat[ch] + '" class="l1"/>';
      }
    });
    [[4, 0], [3, 1], [4, 1], [5, 1]].forEach(function (p) {
      s += '<rect x="' + (X + p[0] * C + 1) + '" y="' + (Y + (p[1] + 2) * C + 1) + '" width="' + (C - 2) + '" height="' + (C - 2) + '" class="piece"/>';
    });
    [[4, 0], [3, 1], [4, 1], [5, 1]].forEach(function (p) {
      s += '<rect x="' + (X + (p[0] + 1) * C + 1) + '" y="' + (Y + (p[1] + 7) * C + 1) + '" width="' + (C - 2) + '" height="' + (C - 2) + '" class="ghost-p"/>';
    });
    s += '<path d="M' + (X + 4 * C + 8) + ' ' + (Y + 3 * C + 4) + 'V' + (Y + 7 * C - 4) + '" class="l2 dash"/>';
    var tx = '';
    for (i = 0; i <= 16; i++) tx += 'M' + (X - 6) + ' ' + (Y + i * C) + 'h-' + (i % 4 ? 4 : 8);
    s += '<path d="' + tx + '" class="l2"/>';
    well.innerHTML = s;
  }
  var road = document.getElementById('art-road');
  if (road) {
    var d = 'M170 270C90 215 250 165 170 110S110 20 190-20';
    var h = '<g class="art-peaks"><path d="M0 130L40 70L62 98L92 40L130 130Z M300 70L336 20L372 70Z M310 220L350 150L400 220Z" class="m-fill"/><path d="M0 130L40 70L62 98L92 40L130 130Z M300 70L336 20L372 70Z M310 220L350 150L400 220Z" fill="url(#hatch)" class="l1"/></g>';
    h += '<path d="' + d + '" class="road-edge" style="stroke-width:104"/><path d="' + d + '" class="road-bed" style="stroke-width:100"/><path d="' + d + '" fill="none" stroke="url(#hatch-d)" style="stroke-width:100"/>';
    h += '<path d="' + d + '" class="road-mid"/>';
    h += '<path id="rp" d="' + d + '" fill="none" stroke="none"/>';
    road.innerHTML = h;
    var rp = document.getElementById('rp'), L = rp.getTotalLength(), cars = [[0.10, 1, 'me'], [0.30, -1], [0.50, -1], [0.62, 1], [0.78, -1]], cs = '';
    cars.forEach(function (c) {
      var p = rp.getPointAtLength(L * c[0]), q = rp.getPointAtLength(L * c[0] + 2), a = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + 90;
      var nx = Math.cos((a) * Math.PI / 180), ny = Math.sin((a) * Math.PI / 180), o = c[1] * 24;
      var x = p.x + nx * o, y = p.y + ny * o, cls = c[2] ? 'car me' : 'car';
      var flip = c[1] < 0 ? 180 : 0;
      cs += '<g transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(a + flip) + ')"><rect x="-9" y="-17" width="18" height="34" rx="4" class="' + cls + '"/><rect x="-6" y="-8" width="12" height="9" rx="2" class="win"/><path d="M-9 -14h18" class="l3"/></g>';
    });
    road.insertAdjacentHTML('beforeend', cs);
  }
  var reticle = document.querySelectorAll('.art-wait');
  reticle.forEach(function (el, i) {
    var rnd = window.AtlasData.rng(70 + i), s = '';
    for (var k = 0; k < 40; k++) s += '<circle cx="' + f(20 + rnd() * 280) + '" cy="' + f(16 + rnd() * 208) + '" r="' + f(0.5 + rnd() * 1.1) + '" opacity="' + f(0.3 + rnd() * 0.5) + '"/>';
    el.innerHTML = '<g class="dg-dots">' + s + '</g><circle cx="160" cy="120" r="62" class="l2 dash" fill="none"/><circle cx="160" cy="120" r="34" class="l3" fill="none"/><path d="M160 36v34M160 170v34M76 120h34M210 120h34" class="l1"/><circle cx="160" cy="120" r="2.4" class="dg-st"/>';
  });
})();
