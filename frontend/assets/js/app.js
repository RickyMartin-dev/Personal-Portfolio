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

  /* work rows */
  var rows = $$('.work-row');
  var root = document.documentElement;
  var wideMq = window.matchMedia('(min-width: 1001px)');
  var wide = { get matches() { return wideMq.matches && (root.dataset.work || 'list') === 'list'; } };
  function place() {
    rows.forEach(function (r) {
      var f = r.querySelector('.diagram');
      f.style.top = wide.matches ? (r.offsetTop + r.offsetHeight / 2) + 'px' : '';
    });
  }
  window.addEventListener('resize', place);
  document.addEventListener('rm:config', function (e) {
    var ch = (e.detail && e.detail.changed) || [];
    if (ch.indexOf('layout') < 0 && ch.indexOf('type') < 0 && ch.indexOf('copy') < 0) return;
    if (!wide.matches) rows.forEach(function (r) { r.classList.add('play'); });
    requestAnimationFrame(place);
  });
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

  /* contact form: validated client-side, posted to Web3Forms (build.py swaps in a mailto link when no key is configured) */
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
    var fields = $$('input:not([type="hidden"]), textarea', form);
    fields.forEach(function (f) { f.addEventListener('blur', function () { if (f.value || f.getAttribute('aria-invalid')) check(f); }); f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) check(f); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      fields.forEach(function (f) { if (!check(f) && !firstBad) firstBad = f; });
      if (firstBad) { firstBad.focus(); return; }
      var send = $('button[type="submit"]', form), data = new FormData(form);
      send.disabled = true;
      fetch(form.action, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.success !== false }; }, function () { return { ok: r.ok }; }); })
        .then(function (res) {
          send.disabled = false;
          if (!res.ok) { showToast('Could not send. Please email rickylenmartin@gmail.com instead.'); return; }
          $('#ok-name').textContent = $('#cf-name').value.trim().split(/\s+/)[0];
          form.hidden = true; ok.hidden = false;
          ok.focus();
        })
        .catch(function () { send.disabled = false; showToast('Could not send. Please email rickylenmartin@gmail.com instead.'); });
    });
    $('#form-reset').addEventListener('click', function () {
      form.reset(); form.hidden = false; ok.hidden = true; $('#cf-name').focus();
    });
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

  /* page transitions: aurora wipe / fade, transform + opacity only; arrival wipes out */
  var pt = $('.pt');
  function ptOn() { return pt && !reduceMo && root.dataset.motion !== 'off' && root.dataset.transition !== 'none'; }
  if (root.classList.contains('pt-in')) {
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.classList.add('pt-out');
      setTimeout(function () { root.classList.remove('pt-in', 'pt-out'); }, 700);
    }); });
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('pt-go', 'pt-in', 'pt-out'); });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || !ptOn()) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (er) { return; }
    if (u.origin !== location.origin || !/\.html$/.test(u.pathname) || (u.pathname === location.pathname && u.search === location.search)) return;
    e.preventDefault();
    try { sessionStorage.setItem('rm-pt', '1'); } catch (er) {}
    root.classList.add('pt-go');
    setTimeout(function () { location.href = a.href; }, 430);
  });
})();
