(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* toast */
  var toast = $('#toast'), toastT;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('show'); }, 3800);
  }
  $$('[data-resume]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); showToast('Résumé PDF coming soon — reach out by email meanwhile'); });
  });
  $$('[data-play]').forEach(function (b) {
    b.addEventListener('click', function () { showToast('Playable in the full release'); });
  });

  /* work rows */
  var rows = $$('.work-row');
  var wide = window.matchMedia('(min-width: 1001px)');
  function place() {
    rows.forEach(function (r) {
      var f = r.querySelector('.diagram');
      f.style.top = wide.matches ? (r.offsetTop + r.offsetHeight / 2) + 'px' : '';
    });
  }
  window.addEventListener('resize', place);
  function activate(row) {
    rows.forEach(function (r) { r.classList.remove('is-active', 'play'); });
    row.classList.add('is-active');
    place();
    void row.offsetWidth;
    row.classList.add('play');
  }
  if (rows.length) {
    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () { if (wide.matches && !row.classList.contains('is-active')) activate(row); });
      row.addEventListener('focusin', function () { if (wide.matches && !row.classList.contains('is-active')) activate(row); });
    });
    rows[0].classList.add('is-active');
    place();
    if (document.fonts) document.fonts.ready.then(place);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            if (!wide.matches) en.target.classList.add('play');
            else if (en.target === rows[0] && !rows[0].dataset.played) { rows[0].dataset.played = '1'; activate(rows[0]); }
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.35 });
      rows.forEach(function (r) { io.observe(r); });
    }
  }

  /* assistant */
  var ab = $('#assist-btn'), ap = $('#assist-panel');
  if (ab && ap) {
    var closeBtn = $('.icon-btn', ap);
    var setOpen = function (o) {
      ap.classList.toggle('open', o);
      ab.setAttribute('aria-expanded', String(o));
      if (o) { closeBtn.focus(); } else if (ap.contains(document.activeElement)) { ab.focus(); }
    };
    ab.addEventListener('click', function () { setOpen(!ap.classList.contains('open')); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (!ap.classList.contains('open')) return;
      if (e.key === 'Escape') { setOpen(false); ab.focus(); }
      else if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
    });
  }

  /* contact form (mock) */
  var form = $('#contact-form');
  if (form) {
    var ok = $('#form-ok');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var check = function (el) {
      var v = el.value.trim(), msg = '';
      if (!v) msg = el.dataset.empty;
      else if (el.type === 'email' && !emailRe.test(v)) msg = 'That email address looks incomplete. Use the form name@domain.com.';
      var err = document.getElementById(el.id + '-err');
      err.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return !msg;
    };
    var fields = $$('input, textarea', form);
    fields.forEach(function (f) { f.addEventListener('blur', function () { if (f.value || f.getAttribute('aria-invalid')) check(f); }); f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) check(f); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f; });
      if (firstBad) { firstBad.focus(); return; }
      $('#ok-name').textContent = $('#cf-name').value.trim().split(/\s+/)[0];
      form.hidden = true; ok.hidden = false;
      ok.focus();
    });
    $('#form-reset').addEventListener('click', function () {
      form.reset(); form.hidden = false; ok.hidden = true; $('#cf-name').focus();
    });
  }

  var reduceMo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ---------- trail maps: a dotted route along the foot of each project ---------- */
  function buildTrails() {
    rows.forEach(function (row, idx) {
      var old = row.querySelector('.trail');
      if (old) row.removeChild(old);
      var w = row.clientWidth, h = 34;
      if (!w) return;
      var a = [0.22, 0.16, 0.26][idx % 3], b = [0.4, 0.46, 0.36][idx % 3];
      var y0 = 26, y1 = 7, y2 = 27, y3 = 9, y4 = 22;
      var d = 'M6 ' + y0 + ' C' + (w * 0.08).toFixed(0) + ' ' + y0 + ' ' + (w * 0.1).toFixed(0) + ' ' + y1 + ' ' + (w * a).toFixed(0) + ' ' + (y1 + 4) +
        ' S' + (w * (a + 0.12)).toFixed(0) + ' ' + y2 + ' ' + (w * b).toFixed(0) + ' ' + (y2 - 4) +
        ' S' + (w * (b + 0.14)).toFixed(0) + ' ' + y3 + ' ' + (w * 0.68).toFixed(0) + ' ' + (y3 + 3) +
        ' S' + (w * 0.82).toFixed(0) + ' ' + y4 + ' ' + (w - 14) + ' ' + (y4 - 6);
      var svg = svgEl('svg', { 'class': 'trail', 'aria-hidden': 'true', focusable: 'false', viewBox: '0 0 ' + w + ' ' + h });
      var id = 'trm' + idx;
      var mask = svgEl('mask', { id: id, maskUnits: 'userSpaceOnUse', x: 0, y: -6, width: w, height: h + 12 });
      mask.appendChild(svgEl('path', { 'class': 'tr-reveal', pathLength: 1, d: d }));
      svg.appendChild(mask);
      svg.appendChild(svgEl('path', { 'class': 'tr-base', pathLength: 1, d: d }));
      var hot = svgEl('path', { 'class': 'tr-hot', pathLength: 1, d: d });
      hot.setAttribute('mask', 'url(#' + id + ')');
      svg.appendChild(hot);
      svg.appendChild(svgEl('path', { 'class': 'tr-pin s', d: 'M6 ' + (y0 - 4) + ' L10 ' + y0 + ' L6 ' + (y0 + 4) + ' L2 ' + y0 + 'Z' }));
      var ex = w - 14, ey = y4 - 6;
      svg.appendChild(svgEl('path', { 'class': 'tr-pin', d: 'M' + (ex - 5) + ' ' + (ey + 5) + ' L' + ex + ' ' + (ey - 6) + ' L' + (ex + 5) + ' ' + (ey + 5) + 'Z' }));
      row.appendChild(svg);
    });
  }
  buildTrails();

  /* ---------- career switchback trail ---------- */
  var tl = $$('.tl-item');
  function buildTimeline() {
    if (!tl.length) return;
    var mobile = window.matchMedia('(max-width: 640px)').matches;
    tl.forEach(function (it, i) {
      var old = it.querySelector('.tl-route');
      if (old) it.removeChild(old);
      var node = it.querySelector('.tl-node'), cs = getComputedStyle(it);
      if (!node) return;
      var h = it.offsetHeight, w = it.offsetWidth, pb = parseFloat(cs.paddingBottom) || 60;
      var nx = node.offsetLeft + (mobile ? 5.5 : 14), amp = mobile ? 11 : 54;
      var last = i === tl.length - 1;
      var yz = h - pb + 8, end = last ? yz : h + 10.5;
      var d = 'M' + nx + ' 10.5 V' + yz;
      if (!last) {
        var span = end - yz;
        d += ' L' + (nx - amp) + ' ' + (yz + span * 0.34).toFixed(1) + ' L' + (nx + amp * 0.45) + ' ' + (yz + span * 0.68).toFixed(1) + ' L' + nx + ' ' + end.toFixed(1);
      }
      var svg = svgEl('svg', { 'class': 'tl-route', 'aria-hidden': 'true', focusable: 'false', viewBox: '0 0 ' + w + ' ' + (h + 12), height: h + 12 });
      svg.appendChild(svgEl('path', { 'class': 'tl-dim', d: d }));
      svg.appendChild(svgEl('path', { 'class': 'tl-hot', pathLength: 1, d: d }));
      if (last) svg.appendChild(svgEl('path', { 'class': 'tl-end', d: 'M' + nx + ' ' + (yz - 1) + ' l5.5 9 h-11z' }));
      it.insertBefore(svg, it.firstChild);
    });
  }
  buildTimeline();
  if (document.fonts) document.fonts.ready.then(function () { buildTrails(); buildTimeline(); });
  var rbt;
  function rebuildAll() { clearTimeout(rbt); rbt = setTimeout(function () { place(); buildTrails(); buildTimeline(); }, 180); }
  window.addEventListener('resize', rebuildAll);
  document.addEventListener('rm:tune', rebuildAll);

  /* ---------- heading line-mask: words rise out of a mask ---------- */
  function splitWords(el) {
    var count = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.nodeValue.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var o = document.createElement('span'), i = document.createElement('span');
            o.className = 'lm'; i.textContent = p;
            i.style.setProperty('--wd', (count++ * 0.07).toFixed(2) + 's');
            o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('underline')) walk(n);
      });
    })(el);
    el.classList.add('h-split');
  }
  var headings = $$('h1.hero-title, .hero.compact h1, main .section h2.h2');
  headings.forEach(function (h) { splitWords(h); });
  var heroH = $('h1.hero-title, .hero.compact h1');
  if (heroH && !reduceMo) {
    heroH.classList.add('arm');
    var gone = false, go = function () { if (gone) return; gone = true; setTimeout(function () { heroH.classList.add('in'); }, 80); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
    setTimeout(go, 700);
    setTimeout(function () { heroH.classList.add('settle'); }, 2000);
  } else if (heroH) { heroH.classList.add('arm', 'in'); }

  /* ---------- restrained scroll reveals + timeline that lights as you arrive ---------- */
  var armEvents = ['scroll', 'wheel', 'touchmove', 'keydown'];
  function armReveals() {
    armEvents.forEach(function (ev) { window.removeEventListener(ev, armReveals); });
    var targets = $$('.focus-item, .index > div, .interests > li, .game, .contact-form, .contact-side, .portrait, .profile > *, .work-row > :not(.diagram):not(.trail)');
    var vh = window.innerHeight;
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el, i) {
      if (el.getBoundingClientRect().top < vh * 0.95) return;
      el.classList.add('rv');
      el.style.setProperty('--d', ((i % 3) * 0.08) + 's');
      rio.observe(el);
    });
    var hio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); hio.unobserve(en.target); } });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    headings.forEach(function (h) {
      if (h === heroH) return;
      if (h.getBoundingClientRect().top < vh * 0.92) { h.classList.add('arm', 'in'); return; }
      h.classList.add('arm');
      hio.observe(h);
    });
  }
  /* armed on first user scroll, so the first screen and static captures are never hidden */
  if ('IntersectionObserver' in window && !reduceMo) {
    armEvents.forEach(function (ev) { window.addEventListener(ev, armReveals, { passive: true }); });
  }
  if (tl.length && 'IntersectionObserver' in window) {
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('lit'); } });
    }, { threshold: 0, rootMargin: '0px 0px -38% 0px' });
    tl.forEach(function (t) { tio.observe(t); });
  }
})();
