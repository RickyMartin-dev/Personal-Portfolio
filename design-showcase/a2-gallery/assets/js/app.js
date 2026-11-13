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

  /* header: solid once the page has scrolled (sentinel, no scroll handler) */
  var header = $('.site-header');
  if (header && 'IntersectionObserver' in window) {
    var sent = document.createElement('div');
    sent.setAttribute('aria-hidden', 'true');
    sent.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none;visibility:hidden';
    document.body.insertBefore(sent, document.body.firstChild);
    new IntersectionObserver(function (en) { header.classList.toggle('is-stuck', !en[0].isIntersecting); }).observe(sent);
  }

  /* plates: diagrams draw when they enter view */
  var plates = $$('.plate-row');
  if (plates.length) {
    if ('IntersectionObserver' in window) {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('play'); pio.unobserve(en.target); } });
      }, { threshold: 0.3 });
      plates.forEach(function (r) { pio.observe(r); });
    } else plates.forEach(function (r) { r.classList.add('play'); });
  }

  /* headline underline: a shooting star draws it (compositor transforms, started before the scene builds) */
  var wrap = $('[data-meteor]');
  if (wrap) {
    var line = $('.ul-line', wrap), star = $('.ul-star', wrap);
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var seen = false;
    try { seen = sessionStorage.getItem('rm-a2-meteor') === '1'; sessionStorage.setItem('rm-a2-meteor', '1'); } catch (e) {}
    var drawn = function () { line.style.transform = 'scaleX(1)'; star.style.opacity = '0'; };
    if (!line || !star) { /* nothing to do */ }
    else if (still || seen || !line.animate) drawn();
    else {
      var w = wrap.getBoundingClientRect().width, o = { duration: 1200, delay: 120, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' };
      var a1 = line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], o);
      star.animate([{ transform: 'translateX(-72px)', opacity: 1, offset: 0 }, { transform: 'translateX(' + (w - 72) + 'px)', opacity: 1, offset: 0.8 }, { transform: 'translateX(' + (w - 72) + 'px)', opacity: 0, offset: 1 }], o);
      a1.onfinish = drawn;
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

  /* restrained scroll reveals + timeline that lights as you arrive */
  var reduceMo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var armEvents = ['scroll', 'wheel', 'touchmove', 'keydown'];
  function armReveals() {
    armEvents.forEach(function (ev) { window.removeEventListener(ev, armReveals); });
    var targets = $$('main .section h2.h2, .focus-item, .index > div, .interests > li, .game, .contact-form, .contact-side, .portrait, .profile > *, .plate-wrap, .plate-text, .wall, .intro .fine');
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
