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


  /* slow-drifting aurora light behind each section: static layers, opacity crossfade when in view */
  var secs = $$('main .section');
  secs.forEach(function (sec, i) {
    var g = document.createElement('div');
    g.className = 'sec-glow v' + (i % 3); g.setAttribute('aria-hidden', 'true');
    sec.insertBefore(g, sec.firstChild);
  });
  if ('IntersectionObserver' in window) {
    var gio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var g = en.target.querySelector(':scope > .sec-glow');
        if (g) g.classList.toggle('on', en.isIntersecting);
      });
    }, { rootMargin: '10% 0px 10% 0px' });
    secs.forEach(function (sec) { gio.observe(sec); });
  } else {
    $$('.sec-glow').forEach(function (g) { g.classList.add('on'); });
  }

  /* aurora forecast: rays baked into the SVG once */
  $$('.fc-rays').forEach(function (g) {
    var x0 = +g.dataset.x0, x1 = +g.dataset.x1, h = +g.dataset.h, seed = +g.dataset.s * 17 + 3, base = 198, step = 2.4;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var span = x1 - x0, f = '';
    for (var x = x0; x < x1; x += step) {
      var u = (x - x0) / span, edge = Math.min(1, u * 5) * Math.min(1, (1 - u) * 5);
      var k = 0.5 + 0.5 * Math.sin(u * 9 + seed), hh = h * (0.4 + 0.6 * k) * (0.3 + 0.7 * edge) * (0.9 + 0.1 * rnd());
      if (hh < 6) continue;
      f += '<rect x="' + x.toFixed(1) + '" y="' + (base - hh).toFixed(1) + '" width="2.7" height="' + hh.toFixed(1) + '" fill="url(#' + g.dataset.g + ')" opacity="' + (0.5 + 0.5 * rnd()).toFixed(2) + '"/>';
    }
    g.innerHTML = f;
  });
  var fc = $('.forecast');
  if (fc && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { fc.classList.toggle('in-view', en[0].isIntersecting); }).observe(fc);
  }

  /* restrained scroll reveals + timeline that lights as you arrive */
  var reduceMo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var armEvents = ['scroll', 'wheel', 'touchmove', 'keydown'];
  function armReveals() {
    armEvents.forEach(function (ev) { window.removeEventListener(ev, armReveals); });
    var targets =$$('main .section h2.h2, .focus-item, .index > div, .interests > li, .game, .contact-form, .contact-side, .portrait, .profile > *, .work-row > :not(.diagram)');
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
  }
  /* armed on first user scroll, so the first screen and static captures are never hidden */
  if ('IntersectionObserver' in window && !reduceMo) {
    armEvents.forEach(function (ev) { window.addEventListener(ev, armReveals, { passive: true }); });
  }
  var tl = $$('.tl-item');
  if (tl.length && 'IntersectionObserver' in window) {
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('lit'); } });
    }, { threshold: 0, rootMargin: '0px 0px -38% 0px' });
    tl.forEach(function (t) { tio.observe(t); });
  }
})();
