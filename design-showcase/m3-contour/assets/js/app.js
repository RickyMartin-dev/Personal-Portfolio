(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* plates: scroll chooses the active plate, pointer movement can override */
  var rows = $$('.work-row');
  var wide = window.matchMedia('(min-width: 1001px)');
  function activate(row) {
    if (row.classList.contains('is-active')) return;
    rows.forEach(function (r) { r.classList.remove('is-active', 'play'); });
    row.classList.add('is-active');
    void row.offsetWidth;
    row.classList.add('play');
  }
  if (rows.length) {
    var tick = false;
    var pick = function () {
      tick = false;
      if (!wide.matches) return;
      var mid = window.innerHeight * 0.52, best = null, bd = 1e9;
      rows.forEach(function (r) {
        var b = r.getBoundingClientRect();
        var d = mid >= b.top && mid <= b.bottom ? 0 : Math.min(Math.abs(b.top - mid), Math.abs(b.bottom - mid));
        if (d < bd) { bd = d; best = r; }
      });
      if (best) activate(best);
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(pick); } }, { passive: true });
    rows.forEach(function (row) {
      row.addEventListener('pointermove', function (e) { if (wide.matches && e.pointerType === 'mouse') activate(row); });
      row.addEventListener('focusin', function () { if (wide.matches) activate(row); });
    });
    rows[0].classList.add('is-active');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          if (!wide.matches) en.target.classList.add('play');
          else if (en.target === rows[0] && !rows[0].dataset.played) { rows[0].dataset.played = '1'; rows[0].classList.add('play'); }
          io.unobserve(en.target);
        });
      }, { threshold: 0.3 });
      rows.forEach(function (r) { io.observe(r); });
    } else rows.forEach(function (r) { r.classList.add('play'); });
  }

  /* restrained reveal: elements below the fold rise a few pixels on arrival */
  if ('IntersectionObserver' in window && !reduce) {
    var targets = $$('main .h2, .work-row, .focus-item, .tl-item, .index > div, .game, .interests > li, .contact-form, .contact-side, .portrait, .profile, .contact-lede');
    var vh = window.innerHeight;
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) {
      if (t.getBoundingClientRect().top < vh * 0.94) return;
      t.classList.add('rv');
      var sibs = t.parentNode ? Array.prototype.indexOf.call(t.parentNode.children, t) : 0;
      t.style.transitionDelay = Math.min(sibs, 4) * 70 + 'ms';
      rio.observe(t);
    });
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

  /* contact form (mock, no network) */
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
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value || f.getAttribute('aria-invalid')) check(f); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) check(f); });
    });
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
})();
