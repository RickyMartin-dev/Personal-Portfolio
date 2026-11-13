(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var bar = $('.bar');
  function barState() { if (bar) bar.classList.toggle('solid', (window.pageYOffset || 0) > 24); }
  window.addEventListener('scroll', barState, { passive: true });
  barState();

  var toast = $('#toast'), tt;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(tt);
    tt = setTimeout(function () { toast.classList.remove('on'); }, 4200);
  }
  $$('[data-resume]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); showToast('Résumé PDF coming soon — reach out by email meanwhile'); });
  });
  $$('[data-play]').forEach(function (b) {
    b.addEventListener('click', function () { showToast('Playable in the full release'); });
  });

  var panel = $('#assistant'), fab = $('[data-assistant-open]');
  function setPanel(open) {
    if (!panel) return;
    if (open) {
      panel.hidden = false;
      requestAnimationFrame(function () { panel.classList.add('is-open'); });
      fab.setAttribute('aria-expanded', 'true');
      $('[data-assistant-close]', panel).focus();
    } else {
      panel.classList.remove('is-open');
      fab.setAttribute('aria-expanded', 'false');
      setTimeout(function () { if (!panel.classList.contains('is-open')) panel.hidden = true; }, 300);
    }
  }
  if (panel && fab) {
    fab.addEventListener('click', function () { setPanel(panel.hidden); });
    $('[data-assistant-close]', panel).addEventListener('click', function () { setPanel(false); fab.focus(); });
    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') { setPanel(false); fab.focus(); }
    });
  }

  var fabEl = $('[data-assistant-open]'), tuckQ = false;
  function tuck() {
    tuckQ = false;
    if (!fabEl || (panel && !panel.hidden)) return;
    var f = fabEl.getBoundingClientRect(), hit = false;
    $$('.cta .btn, .cta .tlink, .meta2 .btn, form .btn, .ok .btn').forEach(function (e) {
      var r = e.getBoundingClientRect();
      if (r.width && r.right > f.left - 8 && r.left < f.right + 8 && r.bottom > f.top - 8 && r.top < f.bottom + 8) hit = true;
    });
    fabEl.classList.toggle('tuck', hit);
  }
  function qTuck() { if (!tuckQ) { tuckQ = true; requestAnimationFrame(tuck); } }
  window.addEventListener('scroll', qTuck, { passive: true });
  window.addEventListener('resize', qTuck);
  qTuck();

  var form = $('#contact-form');
  if (form) {
    var ok = $('#contact-ok');
    var msgs = { name: 'Enter your name so Ricky knows who to reply to.', email: 'Enter an email address in the form name@example.com.', message: 'Write a short message — a sentence is enough.' };
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var els = { name: form.elements.name, email: form.elements.email, message: form.elements.message };
    var check = function (k) {
      var v = els[k].value.trim(), bad = !v || (k === 'email' && !re.test(v));
      els[k].setAttribute('aria-invalid', bad ? 'true' : 'false');
      $('#err-' + k).textContent = bad ? msgs[k] : '';
      return !bad;
    };
    Object.keys(els).forEach(function (k) {
      els[k].addEventListener('blur', function () { if (els[k].value || els[k].getAttribute('aria-invalid') === 'true') check(k); });
      els[k].addEventListener('input', function () { if (els[k].getAttribute('aria-invalid') === 'true') check(k); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      Object.keys(els).forEach(function (k) { if (!check(k) && !bad) bad = els[k]; });
      if (bad) { bad.focus(); return; }
      $('#ok-name').textContent = els.name.value.trim().split(/\s+/)[0];
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    $('[data-form-reset]').addEventListener('click', function () {
      form.reset(); form.hidden = false; ok.hidden = true; els.name.focus();
    });
  }
})();
