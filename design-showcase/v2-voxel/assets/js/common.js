(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* toast */
  var toast = $('#toast');
  var tt;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = '';
    toast.classList.add('is-on');
    setTimeout(function () { toast.textContent = msg; }, 30);
    clearTimeout(tt);
    tt = setTimeout(function () { toast.classList.remove('is-on'); }, 4600);
  }
  window.RMToast = showToast;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#resume"]');
    if (a) {
      e.preventDefault();
      showToast('Résumé PDF coming soon — reach out by email meanwhile');
    }
  });

  /* assistant launcher */
  var launch = $('#assist-launch');
  var panel = $('#assist-panel');
  if (launch && panel) {
    var closeBtn = $('.assist-close', panel);
    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      launch.setAttribute('aria-expanded', String(open));
      if (open) { panel.focus(); } else { launch.focus(); }
    }
    launch.addEventListener('click', function () { setOpen(!panel.classList.contains('is-open')); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Tab') {
        var f = $$('button, a[href], [tabindex]:not([tabindex="-1"])', panel);
        if (!f.length) { e.preventDefault(); return; }
        var first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false); });
  }

  /* contact form (mock) */
  var form = $('#contact-form');
  if (form) {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var fields = {
      name: function (v) { return v.trim() ? '' : 'Enter your name so Ricky knows who to reply to.'; },
      email: function (v) {
        if (!v.trim()) return 'Enter an email address so Ricky can reply.';
        return emailRe.test(v.trim()) ? '' : 'That email looks incomplete. Try name@example.com.';
      },
      message: function (v) { return v.trim() ? '' : 'Write a short message before sending.'; }
    };
    function check(name, quiet) {
      var el = form.elements[name];
      var err = $('#err-' + name);
      var msg = fields[name](el.value);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err.textContent = msg;
      return !msg;
    }
    Object.keys(fields).forEach(function (n) {
      form.elements[n].addEventListener('input', function () {
        if (form.elements[n].getAttribute('aria-invalid') === 'true') check(n);
      });
      form.elements[n].addEventListener('blur', function () { if (form.elements[n].value) check(n); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Object.keys(fields).forEach(function (n) { if (!check(n) && !firstBad) firstBad = form.elements[n]; });
      if (firstBad) { firstBad.focus(); return; }
      var wrap = form.closest('.form');
      var who = $('#sent-name');
      if (who) who.textContent = form.elements.name.value.trim().split(/\s+/)[0];
      wrap.classList.add('is-sent');
      var h = $('.form-success h3', wrap);
      h.setAttribute('tabindex', '-1');
      h.focus();
    });
    var again = $('#send-another');
    if (again) again.addEventListener('click', function () {
      form.reset();
      Object.keys(fields).forEach(function (n) { form.elements[n].setAttribute('aria-invalid', 'false'); $('#err-' + n).textContent = ''; });
      form.closest('.form').classList.remove('is-sent');
      form.elements.name.focus();
    });
  }
})();
