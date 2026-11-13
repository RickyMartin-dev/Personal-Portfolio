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
})();
