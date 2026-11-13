(function () {
  var doc = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };

  /* toast */
  var toastEl = $('.toast'), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 4200);
  }
  $$('a[href="#resume"]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); toast('Résumé PDF coming soon — reach out by email meanwhile'); });
  });
  $$('[data-play]').forEach(function (b) {
    b.addEventListener('click', function () { toast('Playable in the full release'); });
  });

  /* assistant launcher */
  var abtn = $('#assistant-btn'), apanel = $('#assistant-panel');
  if (abtn && apanel) {
    var closeBtn = $('[data-assistant-close]', apanel);
    var setOpen = function (open) {
      apanel.hidden = !open;
      abtn.setAttribute('aria-expanded', String(open));
      if (open) closeBtn.focus(); else abtn.focus();
    };
    abtn.addEventListener('click', function () { setOpen(apanel.hidden); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    doc.addEventListener('keydown', function (e) {
      if (apanel.hidden) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'Tab') {
        var f = [closeBtn, abtn];
        var i = f.indexOf(doc.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
  }

  /* reveals: visible by default; below-fold items are armed on first user scroll */
  var targets = $$('[data-reveal]');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    var armed = false;
    var evs = ['scroll', 'wheel', 'touchmove', 'keydown'];
    var arm = function () {
      if (armed) return;
      armed = true;
      targets.forEach(function (t) {
        if (t.getBoundingClientRect().top > innerHeight * 0.9) { t.classList.add('pre'); io.observe(t); }
      });
      evs.forEach(function (e) { window.removeEventListener(e, arm); });
    };
    evs.forEach(function (e) { window.addEventListener(e, arm, { passive: true }); });
  }

  /* scene index */
  var idx = $$('.scene-index a');
  if (idx.length && 'IntersectionObserver' in window) {
    var map = {};
    idx.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (x.isIntersecting) {
          idx.forEach(function (a) { a.removeAttribute('aria-current'); });
          var a = map[x.target.id]; if (a) a.setAttribute('aria-current', 'location');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) so.observe(s); });
  }

  /* contact form (mock) */
  var form = $('#contact-form');
  if (form) {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var rules = {
      name: function (v) { return v.trim() ? '' : 'Enter your name so Ricky knows who to reply to.'; },
      email: function (v) { return !v.trim() ? 'Enter your email address.' : emailRe.test(v.trim()) ? '' : 'That email address looks incomplete. Check for a missing @ or domain.'; },
      message: function (v) { return v.trim().length >= 10 ? '' : 'Write a short message, at least a sentence.'; }
    };
    var check = function (f) {
      var inp = form.elements[f], err = $('#err-' + f), msg = rules[f](inp.value);
      err.textContent = msg; err.hidden = !msg;
      inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    };
    Object.keys(rules).forEach(function (f) {
      form.elements[f].addEventListener('blur', function () { if (this.value || this.getAttribute('aria-invalid')) check(f); });
      form.elements[f].addEventListener('input', function () { if (this.getAttribute('aria-invalid') === 'true') check(f); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = Object.keys(rules).filter(function (f) { return !check(f); });
      if (bad.length) { form.elements[bad[0]].focus(); return; }
      var ok = $('#contact-ok');
      form.hidden = true; ok.hidden = false; ok.focus();
    });
    var again = $('#contact-again');
    if (again) again.addEventListener('click', function () {
      form.reset(); $$('.err', form).forEach(function (x) { x.hidden = true; });
      $$('[aria-invalid]', form).forEach(function (x) { x.removeAttribute('aria-invalid'); });
      $('#contact-ok').hidden = true; form.hidden = false; form.elements.name.focus();
    });
  }

  /* sensor-skin heat map still */
  var grid = $('#sensor-grid');
  if (grid) {
    var NS = 'http://www.w3.org/2000/svg', cols = 14, rows = 8, size = 40, gap = 7, cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var rc = doc.createElementNS(NS, 'rect');
      rc.setAttribute('x', c * (size + gap)); rc.setAttribute('y', r * (size + gap));
      rc.setAttribute('width', size); rc.setAttribute('height', size); rc.setAttribute('rx', 6);
      rc.setAttribute('class', 'cell'); grid.appendChild(rc); cells.push([rc, c, r]);
    }
    var paint = function (t) {
      var cx = 6.5 + Math.sin(t * 0.55) * 5.2, cy = 3.5 + Math.sin(t * 0.8 + 1) * 2.4;
      var cx2 = 6.5 + Math.cos(t * 0.37 + 2) * 4.6, cy2 = 3.5 + Math.cos(t * 0.61) * 2.2;
      cells.forEach(function (k) {
        var d1 = (k[1] - cx) * (k[1] - cx) + (k[2] - cy) * (k[2] - cy), d2 = (k[1] - cx2) * (k[1] - cx2) + (k[2] - cy2) * (k[2] - cy2);
        var v = Math.exp(-d1 / 3.2) + 0.55 * Math.exp(-d2 / 2.4);
        k[0].style.opacity = (0.14 + Math.min(1, v) * 0.86).toFixed(3);
        k[0].style.setProperty('--h', Math.min(1, v).toFixed(3));
      });
    };
    paint(2.2);
    if (!reduce) {
      var on = false, raf = 0, t0 = performance.now();
      var tick = function (now) { raf = 0; if (!on || doc.hidden) return; paint(2.2 + (now - t0) / 1000); raf = requestAnimationFrame(tick); };
      var go = function () { if (!raf && on && !doc.hidden) raf = requestAnimationFrame(tick); };
      new IntersectionObserver(function (en) { on = en[0].isIntersecting; go(); }).observe(grid.ownerSVGElement);
      doc.addEventListener('visibilitychange', go);
    }
  }
})();
