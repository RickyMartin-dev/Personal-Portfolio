(function () {
  'use strict';
  var page = (document.querySelector('meta[name="rm-page"]') || {}).content || 'home';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var body = document.body;

  var I = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/><path d="M16 4.5v3M14.5 6h3"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z"/><path d="M19 17v4M17 19h4"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mark: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="12.5"/><path d="M16 3.5v25M3.5 16h25" stroke-width="1"/><path d="M16 9l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" class="gold-fill"/></svg>'
  };

  var defs = '<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    '<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" style="stroke:var(--hatch);stroke-width:.8"/></pattern>' +
    '<pattern id="hatch-d" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="3" style="stroke:var(--hatch);stroke-width:.7"/></pattern>' +
    '<pattern id="cross" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0L5 5M5 0L0 5" style="stroke:var(--hatch);stroke-width:.6;fill:none"/></pattern>' +
    '<pattern id="stipple" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".7" style="fill:var(--hatch)"/><circle cx="6" cy="3" r=".5" style="fill:var(--hatch)"/><circle cx="3.2" cy="6.4" r=".6" style="fill:var(--hatch)"/><circle cx="7.4" cy="7.6" r=".45" style="fill:var(--hatch)"/></pattern>' +
    '</defs></svg>';

  var nav = [['home', 'Home', 'index.html'], ['about', 'About', 'about.html'], ['games', 'Games', 'games.html']];
  var header = '<header class="site-head"><div class="site-head__in">' +
    '<a class="brand" href="index.html" aria-label="Ricky Martin, home">' + I.mark + '<span class="brand-name">Ricky Martin</span></a>' +
    '<nav aria-label="Primary"><ul>' + nav.map(function (n) {
      return '<li><a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : '') + '>' + n[1] + '</a></li>';
    }).join('') + '</ul></nav>' +
    '<button type="button" class="theme-toggle" data-theme-toggle aria-label="Dark mode" aria-pressed="true"><span class="ti ti-moon">' + I.moon + '</span><span class="ti ti-sun">' + I.sun + '</span></button>' +
    '</div></header>';

  var frame = '<div class="frame" aria-hidden="true"><div class="r r-t"><span class="r-lab"></span></div><div class="r r-b"></div><div class="r r-l"><span class="r-read" id="read-dec">Dec +00&deg;</span></div><div class="r r-r"></div></div>';

  var footer = '<footer class="site-foot"><div class="wrap foot-in"><p>&copy; Ricky Martin.</p>' +
    '<p class="foot-meta">New York, NY</p>' +
    '<ul class="foot-links"><li><a href="index.html">Home</a></li><li><a href="about.html">About</a></li><li><a href="games.html">Games</a></li></ul></div></footer>';

  var assistant = '<button type="button" class="launcher" aria-label="Ask about Ricky" aria-haspopup="dialog" aria-expanded="false" aria-controls="assistant">' + I.spark + '<span>Ask about Ricky</span></button>' +
    '<div class="assistant plate" id="assistant" role="dialog" aria-labelledby="as-h" aria-describedby="as-p" hidden tabindex="-1">' +
    '<button type="button" class="as-close" aria-label="Close assistant panel">' + I.close + '</button>' +
    '<h2 id="as-h">Ask about Ricky</h2><p id="as-p">Ricky’s AI assistant is being rebuilt. Check back soon.</p>' +
    '<p class="as-state">Under construction. Nothing you type here is sent anywhere.</p></div>' +
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>';

  body.insertAdjacentHTML('afterbegin', defs + frame);
  var mainEl = document.getElementById('main');
  if (mainEl) mainEl.insertAdjacentHTML('beforebegin', header);
  body.insertAdjacentHTML('beforeend', footer + assistant + '<canvas class="meteors" aria-hidden="true"></canvas>');

  /* contact block */
  var cs = document.getElementById('contact');
  if (cs) {
    var links = [
      ['LinkedIn', 'linkedin.com/in/rickylm', 'https://www.linkedin.com/in/rickylm/'],
      ['GitHub', 'github.com/RickyMartin-dev', 'https://github.com/RickyMartin-dev'],
      ['Kaggle', 'kaggle.com/rickymartindev', 'https://www.kaggle.com/rickymartindev'],
      ['Spotify', 'Artist page', 'https://open.spotify.com/artist/7slfeZO9LsJbWgpkIoXBUJ'],
      ['Email', 'rickylenmartin@gmail.com', 'mailto:rickylenmartin@gmail.com']
    ];
    cs.className = 'contact wrap';
    cs.setAttribute('aria-labelledby', 'contact-h');
    cs.innerHTML = '<div class="contact-grid">' +
      '<div class="contact-copy"><h2 id="contact-h">Looking for a builder who can ship modern AI products?</h2>' +
      '<p>Interested in building ambitious AI products together? Tell me what you are trying to move from prototype to production.</p>' +
      '<dl class="stations">' + links.map(function (l) {
        var ext = l[2].indexOf('http') === 0;
        return '<div><dt>' + l[0] + '</dt><dd><a href="' + l[2] + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + l[1] + (ext ? I.out : '') + '</a></dd></div>';
      }).join('') + '<div><dt>Station</dt><dd>New York, NY</dd></div></dl></div>' +
      '<div class="plate form-plate"><form id="contact-form" novalidate>' +
      '<div class="fld"><label for="f-name">Name</label><input id="f-name" name="name" type="text" autocomplete="name" aria-describedby="e-name" required><p class="err" id="e-name" hidden></p></div>' +
      '<div class="fld"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" aria-describedby="e-email" required><p class="err" id="e-email" hidden></p></div>' +
      '<div class="fld"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="5" aria-describedby="e-msg" required></textarea><p class="err" id="e-msg" hidden></p></div>' +
      '<button type="submit" class="btn primary">Send</button></form>' +
      '<div class="sent" id="sent" role="status" tabindex="-1" hidden><h3>Transmission logged</h3><p>This is a design preview, so nothing was sent. To reach Ricky now, write to <a href="mailto:rickylenmartin@gmail.com">rickylenmartin@gmail.com</a>.</p><button type="button" class="btn ghost" id="again">Write another</button></div></div></div>';
    var form = document.getElementById('contact-form'), sent = document.getElementById('sent');
    var rules = {
      name: function (v) { return v.trim() ? '' : 'Add your name so Ricky knows who is writing.'; },
      email: function (v) { return !v.trim() ? 'Add an email address so Ricky can reply.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'That email address looks incomplete. Use the form name@example.com.'); },
      message: function (v) { return v.trim() ? '' : 'Write a short message so there is something to answer.'; }
    };
    var ids = { name: 'name', email: 'email', message: 'msg' };
    function check(k, focusFirst) {
      var el = document.getElementById('f-' + ids[k]), er = document.getElementById('e-' + ids[k]);
      var m = rules[k](el.value);
      er.hidden = !m; er.textContent = m; el.setAttribute('aria-invalid', m ? 'true' : 'false');
      return m;
    }
    Object.keys(rules).forEach(function (k) {
      document.getElementById('f-' + ids[k]).addEventListener('blur', function () { if (this.value || this.getAttribute('aria-invalid')) check(k); });
      document.getElementById('f-' + ids[k]).addEventListener('input', function () { if (this.getAttribute('aria-invalid') === 'true') check(k); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      Object.keys(rules).forEach(function (k) { if (check(k) && !first) first = k; });
      if (first) { document.getElementById('f-' + ids[first]).focus(); return; }
      form.hidden = true; sent.hidden = false; sent.focus();
    });
    document.getElementById('again').addEventListener('click', function () {
      form.reset(); form.hidden = false; sent.hidden = true; document.getElementById('f-name').focus();
    });
  }

  /* plate corner ornaments */
  document.querySelectorAll('.plate').forEach(function (p) {
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { var i = document.createElement('i'); i.className = 'cn ' + c; i.setAttribute('aria-hidden', 'true'); p.appendChild(i); });
  });

  /* toast */
  var toast = document.getElementById('toast'), tt;
  window.AtlasToast = function (msg) {
    toast.textContent = msg; toast.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 4600);
  };
  document.addEventListener('click', function (e) {
    var r = e.target.closest && e.target.closest('[data-resume]');
    if (r) { e.preventDefault(); AtlasToast('Résumé PDF coming soon — reach out by email meanwhile'); }
    var g = e.target.closest && e.target.closest('[data-play]');
    if (g) { e.preventDefault(); AtlasToast('Playable in the full release'); }
  });

  /* assistant panel */
  var btn = document.querySelector('.launcher'), panel = document.getElementById('assistant'), cl = panel.querySelector('.as-close');
  function openP() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); cl.focus(); }
  function closeP() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  btn.addEventListener('click', function () { panel.hidden ? openP() : closeP(); });
  cl.addEventListener('click', closeP);
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeP(); return; }
    if (e.key === 'Tab') {
      var f = panel.querySelectorAll('button, a[href]'), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      else if (f.length === 1) { e.preventDefault(); a.focus(); }
    }
  });

  /* ruler readout, scroll-linked */
  var root = document.documentElement, ticking = false;
  var lab = document.querySelector('.r-lab'), dec = document.getElementById('read-dec');
  function upd() {
    ticking = false;
    var y = window.scrollY, max = Math.max(1, root.scrollHeight - innerHeight), f = y / max;
    root.style.setProperty('--sy', (-(y % 60)) + 'px');
    var d = Math.round(70 - f * 100), h = Math.floor(f * 6 + 3), m = Math.round(((f * 6 + 3) % 1) * 60);
    dec.textContent = 'Dec ' + (d >= 0 ? '+' : '−') + String(Math.abs(d)).padStart(2, '0') + '°';
    lab.textContent = 'RA ' + String(h).padStart(2, '0') + 'h ' + String(m).padStart(2, '0') + 'm';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();

  /* gold meteors */
  var cv = document.querySelector('.meteors'), cx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W, H, m = null, raf = 0, timer = 0;
  function size() { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); window.addEventListener('resize', size);
  function gold() { return getComputedStyle(root).getPropertyValue('--meteor').trim() || '#D4AF6A'; }
  var col = gold();
  document.addEventListener('rm:themechange', function () { col = gold(); });
  function launch() {
    if (reduced.matches || document.hidden) { schedule(9000); return; }
    var a = (22 + Math.random() * 16) * Math.PI / 180, len = 160 + Math.random() * 140;
    m = { x: W * (0.45 + Math.random() * 0.55), y: -10 + Math.random() * H * 0.25, a: a, len: len, t0: performance.now(), dur: 1300 + Math.random() * 500, v: 0.9 + Math.random() * 0.5 };
    raf = requestAnimationFrame(mFrame);
  }
  function mFrame(t) {
    cx.clearRect(0, 0, W, H);
    if (!m) return;
    var p = (t - m.t0) / m.dur;
    if (p >= 1) { m = null; schedule(8000 + Math.random() * 9000); return; }
    var dist = p * (W * 0.55) * m.v, hx = m.x - Math.cos(m.a) * dist, hy = m.y + Math.sin(m.a) * dist;
    var tx = hx + Math.cos(m.a) * m.len, ty = hy - Math.sin(m.a) * m.len;
    var al = Math.sin(p * Math.PI);
    var g = cx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, col); g.addColorStop(1, /^#[0-9a-f]{6}$/i.test(col) ? col + '00' : 'rgba(212,175,106,0)');
    cx.globalAlpha = al; cx.strokeStyle = g; cx.lineWidth = 1.6; cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(tx, ty); cx.stroke();
    cx.fillStyle = col; cx.beginPath(); cx.arc(hx, hy, 2.4, 0, 6.3); cx.fill();
    cx.globalAlpha = 1;
    raf = requestAnimationFrame(mFrame);
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(launch, ms); }
  schedule(1800);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelAnimationFrame(raf); m = null; cx.clearRect(0, 0, W, H); schedule(6000); } });
})();
