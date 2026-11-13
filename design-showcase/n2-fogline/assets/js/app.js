(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header */
  var head = $('.site-header');
  function hs() { if (head) head.classList.toggle('is-solid', (window.pageYOffset || 0) > 12); }
  window.addEventListener('scroll', hs, { passive: true }); hs();

  /* toast */
  var toast = $('#toast'), tt;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('show'); }, 3800);
  }
  $$('[data-resume]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); showToast('Résumé PDF coming soon — reach out by email meanwhile'); });
  });

  /* games */
  $$('[data-play]').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = b.closest('.game'), on = g.classList.toggle('is-previewing');
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('span').textContent = on ? 'Close preview' : 'Play';
      if (on) showToast('Playable in the full release');
    });
  });

  /* reveal */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    rv.forEach(function (n) { io.observe(n); });
  } else rv.forEach(function (n) { n.classList.add('in'); });

  /* assistant */
  var ab = $('#assist-btn'), ap = $('#assist-panel');
  if (ab && ap) {
    var cb = $('.icon-btn', ap);
    var setOpen = function (o) {
      ap.classList.toggle('open', o); ab.setAttribute('aria-expanded', String(o));
      if (o) cb.focus(); else if (ap.contains(document.activeElement)) ab.focus();
    };
    ab.addEventListener('click', function () { setOpen(!ap.classList.contains('open')); });
    cb.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (!ap.classList.contains('open')) return;
      if (e.key === 'Escape') setOpen(false);
      else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === cb ? ab : cb).focus(); }
    });
  }

  /* contact form (mock, no network) */
  var form = $('#contact-form');
  if (form) {
    var ok = $('#form-ok'), re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var check = function (el) {
      var v = el.value.trim(), m = '';
      if (!v) m = el.dataset.empty;
      else if (el.type === 'email' && !re.test(v)) m = 'That email address looks incomplete. Use the form name@domain.com.';
      document.getElementById(el.id + '-err').textContent = m;
      if (m) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return !m;
    };
    var fields = $$('input, textarea', form);
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value || f.getAttribute('aria-invalid')) check(f); });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) check(f); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      fields.forEach(function (f) { if (!check(f) && !bad) bad = f; });
      if (bad) { bad.focus(); return; }
      $('#ok-name').textContent = $('#cf-name').value.trim().split(/\s+/)[0];
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    $('#form-reset').addEventListener('click', function () {
      form.reset(); form.hidden = false; ok.hidden = true; $('#cf-name').focus();
    });
  }
})();
