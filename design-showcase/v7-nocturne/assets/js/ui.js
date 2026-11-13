(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // header state
  var bar = $('#bar');
  function barState() { if (bar) bar.classList.toggle('is-solid', (window.pageYOffset || 0) > 24); }
  window.addEventListener('scroll', barState, { passive: true });
  barState();

  // toast
  var toast = $('#toast'), toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 4200);
  }

  $$('[data-resume]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      showToast('Résumé PDF coming soon — reach out by email meanwhile');
    });
  });

  // assistant panel
  var panel = $('#assistant'), openers = $$('[data-assistant-open]'), lastFocus = null;
  function openPanel() {
    if (!panel) return;
    lastFocus = document.activeElement;
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    var c = $('[data-assistant-close]', panel); if (c) c.focus();
  }
  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('is-open');
    openers.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    setTimeout(function () { panel.hidden = true; }, 220);
    var back = openers[0]; if (back && back.focus) back.focus();
  }
  openers.forEach(function (b) {
    b.addEventListener('click', function () { panel.hidden ? openPanel() : closePanel(); });
  });
  $$('[data-assistant-close]').forEach(function (b) { b.addEventListener('click', closePanel); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePanel(); return; }
    if (e.key === 'Tab' && panel && !panel.hidden) {
      var f = $$('button, a[href], [tabindex]:not([tabindex="-1"])', panel).concat(openers);
      var first = f[0], last = f[f.length - 1];
      if (!panel.contains(document.activeElement) && document.activeElement !== openers[0]) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // station disclosure
  $$('.station').forEach(function (st) {
    var btn = $('.st-btn', st);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      st.classList.toggle('is-open', !open);
    });
  });

  // games
  $$('[data-play]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cab = b.closest('.cab');
      if (!cab) return;
      var on = cab.classList.toggle('is-previewing');
      b.setAttribute('aria-pressed', String(on));
      var label = $('.btn-label', b);
      if (label) label.textContent = on ? 'Back to attract mode' : 'Play';
      if (on) showToast('Playable in the full release');
    });
  });

  // contact form
  var form = $('#contact-form');
  if (form) {
    var ok = $('#contact-ok');
    var fields = {
      name: { el: form.elements.name, msg: 'Enter your name so Ricky knows who to reply to.' },
      email: { el: form.elements.email, msg: 'Enter an email address in the form name@example.com.' },
      message: { el: form.elements.message, msg: 'Write a short message — a sentence is enough.' }
    };
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function check(k) {
      var f = fields[k], v = f.el.value.trim(), bad = false;
      if (!v) bad = true;
      else if (k === 'email' && !emailRe.test(v)) bad = true;
      var err = $('#err-' + k);
      f.el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      err.textContent = bad ? f.msg : '';
      f.el.closest('.field').classList.toggle('has-error', bad);
      return !bad;
    }
    Object.keys(fields).forEach(function (k) {
      fields[k].el.addEventListener('blur', function () { if (fields[k].el.value || fields[k].el.getAttribute('aria-invalid') === 'true') check(k); });
      fields[k].el.addEventListener('input', function () { if (fields[k].el.getAttribute('aria-invalid') === 'true') check(k); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(fields).forEach(function (k) { if (!check(k) && !firstBad) firstBad = fields[k].el; });
      if (firstBad) { firstBad.focus(); return; }
      $('#ok-name').textContent = fields.name.el.value.trim().split(/\s+/)[0];
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    var again = $('[data-form-reset]');
    if (again) again.addEventListener('click', function () {
      form.reset(); form.hidden = false; ok.hidden = true;
      Object.keys(fields).forEach(function (k) { fields[k].el.setAttribute('aria-invalid', 'false'); $('#err-' + k).textContent = ''; fields[k].el.closest('.field').classList.remove('has-error'); });
      fields.name.el.focus();
    });
  }
})();
