(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var skipDraw = reduce || navigator.webdriver === true;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }

  /* toast */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 4200);
  }
  $$('a[href="#resume"]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); toast('Résumé PDF coming soon — reach out by email meanwhile'); });
  });
  $$('[data-play]').forEach(function (b) {
    b.addEventListener('click', function () { toast('Playable in the full release'); });
  });

  /* launcher */
  (function () {
    var btn = $('.launch-btn'), panel = $('.launch-panel'), close = $('.launch-close');
    if (!btn || !panel) return;
    function open() { panel.classList.add('on'); btn.setAttribute('aria-expanded', 'true'); close.focus(); }
    function shut(ret) { panel.classList.remove('on'); btn.setAttribute('aria-expanded', 'false'); if (ret) btn.focus(); }
    btn.addEventListener('click', function () { panel.classList.contains('on') ? shut(true) : open(); });
    close.addEventListener('click', function () { shut(true); });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { shut(true); return; }
      if (e.key === 'Tab') { var f = $$('button, a[href]', panel); var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    document.addEventListener('focusin', function (e) { if (panel.classList.contains('on') && !panel.contains(e.target) && e.target !== btn) close.focus(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('on')) shut(true); });
  })();

  /* contact form (mock) */
  (function () {
    var form = $('#contact-form'); if (!form) return;
    var sent = $('.sent');
    function setErr(name, msg) {
      var f = form.elements[name].closest('.field');
      f.dataset.invalid = msg ? 'true' : 'false';
      var e = $('.err', f); e.textContent = msg || '';
      form.elements[name].setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = form.elements.name.value.trim(), m = form.elements.email.value.trim(), g = form.elements.message.value.trim();
      var bad = null;
      setErr('name', n ? '' : 'Add your name so Ricky knows who to reply to.'); if (!n) bad = bad || 'name';
      var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m);
      setErr('email', m ? (okMail ? '' : 'That email looks incomplete. Use the form name@company.com.') : 'Add an email address so Ricky can reply.');
      if (!okMail) bad = bad || 'email';
      setErr('message', g.length >= 10 ? '' : 'Write a short message, at least a sentence, so there is something to answer.'); if (g.length < 10) bad = bad || 'message';
      if (bad) { form.elements[bad].focus(); return; }
      form.classList.add('off'); sent.classList.add('on'); sent.setAttribute('tabindex', '-1'); sent.focus();
    });
    $$('input,textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { if (el.closest('.field').dataset.invalid === 'true') setErr(el.name, ''); });
    });
    var again = $('#send-another');
    if (again) again.addEventListener('click', function () { form.reset(); form.classList.remove('off'); sent.classList.remove('on'); form.elements.name.focus(); });
  })();

  /* ---------- topographic contour field ---------- */
  (function () {
    var cv = $('#topo'); if (!cv) return;
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, CELL = 14, cols = 0, rows = 0, field = null;
    var minor, major;
    function hash(x, y, z) {
      var h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
      h = (h ^ (h >>> 13)) * 1274126177 | 0;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function sm(t) { return t * t * (3 - 2 * t); }
    function vnoise(x, y, z) {
      var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      var xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
      function l(a, b, t) { return a + (b - a) * t; }
      var c00 = l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf);
      var c10 = l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf);
      var c01 = l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf);
      var c11 = l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf);
      return l(l(c00, c10, yf), l(c01, c11, yf), zf);
    }
    function fbm(x, y, z) { return vnoise(x, y, z) * 0.58 + vnoise(x * 2.1, y * 2.1, z * 1.3 + 7) * 0.28 + vnoise(x * 4.3, y * 4.3, z * 1.7 + 19) * 0.14; }
    function size() {
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      CELL = W < 700 ? 16 : 13;
      cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
      field = new Float32Array(cols * rows);
    }
    function colors() { minor = css('--topo-minor'); major = css('--topo-major'); }
    var LEVELS = []; for (var li = 0; li < 16; li++) LEVELS.push(0.22 + li * 0.036);
    function draw(t) {
      var sy = (window.scrollY || 0) * 0.0007;
      var z = t * 0.00006;
      var s = 0.0021 * CELL / 13 * (13 / CELL);
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) field[j * cols + i] = fbm(i * CELL * 0.0021 + 3.1, j * CELL * 0.0021 + sy, z);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1; ctx.lineJoin = 'round';
      for (var pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (var k = 0; k < LEVELS.length; k++) {
          var isMajor = k % 5 === 2;
          if ((pass === 1) !== isMajor) continue;
          march(LEVELS[k]);
        }
        ctx.strokeStyle = pass ? major : minor;
        ctx.lineWidth = pass ? 1.4 : 1;
        ctx.stroke();
      }
    }
    function march(lv) {
      for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
          var a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
          var idx = (a > lv ? 8 : 0) | (b > lv ? 4 : 0) | (c > lv ? 2 : 0) | (d > lv ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var x = i * CELL, y = j * CELL;
          var top = [x + CELL * (lv - a) / (b - a), y];
          var right = [x + CELL, y + CELL * (lv - b) / (c - b)];
          var bot = [x + CELL * (lv - d) / (c - d), y + CELL];
          var left = [x, y + CELL * (lv - a) / (d - a)];
          var segs;
          switch (idx) {
            case 1: case 14: segs = [[left, bot]]; break;
            case 2: case 13: segs = [[bot, right]]; break;
            case 3: case 12: segs = [[left, right]]; break;
            case 4: case 11: segs = [[top, right]]; break;
            case 5: segs = [[left, top], [bot, right]]; break;
            case 6: case 9: segs = [[top, bot]]; break;
            case 7: case 8: segs = [[left, top]]; break;
            case 10: segs = [[top, right], [left, bot]]; break;
          }
          for (var q = 0; q < segs.length; q++) { ctx.moveTo(segs[q][0][0], segs[q][0][1]); ctx.lineTo(segs[q][1][0], segs[q][1][1]); }
        }
      }
    }
    var last = 0;
    function loop(t) {
      requestAnimationFrame(loop);
      if (document.hidden || t - last < 42) return;
      last = t; draw(t);
    }
    size(); colors(); draw(0);
    addEventListener('resize', function () { size(); draw(performance.now()); });
    document.addEventListener('rm:themechange', function () { colors(); draw(performance.now()); });
    if (reduce) { addEventListener('scroll', function () { draw(0); }, { passive: true }); }
    else requestAnimationFrame(loop);
  })();

  /* ---------- stars + shooting stars ---------- */
  (function () {
    var cv = $('#stars'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, stars = [], streaks = [], visible = true, nextShot = 0;
    function size() {
      var r = cv.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      var n = Math.round(W * H / 5200);
      var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      stars = [];
      for (var i = 0; i < n; i++) stars.push({ x: rnd(), y: Math.pow(rnd(), 1.4) * 0.8, r: 0.4 + rnd() * 1.2, p: rnd() * 6.28, s: 0.6 + rnd() * 1.8 });
    }
    function frame(t) {
      var col = css('--star'), sc = css('--streak');
      var light = root.dataset.theme === 'light';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = reduce ? 0.7 : 0.45 + 0.55 * Math.sin(t * 0.001 * s.s + s.p);
        ctx.fillStyle = 'rgba(' + col + ',' + ((light ? 0.22 : 0.85) * tw).toFixed(3) + ')';
        var y = s.y * H;
        if (light) y = (y + (reduce ? 0 : t * 0.004 * s.s)) % H;
        ctx.beginPath(); ctx.arc(s.x * W, y, s.r * (light ? 1.3 : 1), 0, 6.283); ctx.fill();
      }
      if (!reduce) {
        if (t > nextShot) {
          var sx = W * (0.45 + Math.random() * 0.5), sy = H * (0.04 + Math.random() * 0.25);
          streaks.push({ x: sx, y: sy, vx: -(0.55 + Math.random() * 0.35), vy: 0.28 + Math.random() * 0.2, born: t, life: 900 + Math.random() * 500, len: 120 + Math.random() * 120 });
          nextShot = t + 2600 + Math.random() * 3800;
        }
        streaks = streaks.filter(function (k) { return t - k.born < k.life; });
        streaks.forEach(function (k) {
          var age = (t - k.born), u = age / k.life;
          var hx = k.x + k.vx * age * 1.2, hy = k.y + k.vy * age * 1.2;
          var m = Math.hypot(k.vx, k.vy), tx = hx - k.vx / m * k.len * (1 - u * 0.4), ty = hy - k.vy / m * k.len * (1 - u * 0.4);
          var g = ctx.createLinearGradient(hx, hy, tx, ty);
          var a = Math.sin(u * Math.PI) * (light ? 0.5 : 0.95);
          g.addColorStop(0, 'rgba(' + sc + ',' + a + ')'); g.addColorStop(1, 'rgba(' + sc + ',0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.fillStyle = 'rgba(' + sc + ',' + a + ')'; ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, 6.283); ctx.fill();
        });
      }
    }
    function loop(t) { requestAnimationFrame(loop); if (!visible || document.hidden) return; frame(t); }
    size(); frame(1000);
    addEventListener('resize', function () { size(); frame(1000); });
    document.addEventListener('rm:themechange', function () { frame(1000); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv.parentElement);
    if (!reduce) { nextShot = 1400; requestAnimationFrame(loop); }
  })();

  /* ---------- altimeter ---------- */
  (function () {
    var alt = $('.altimeter'); if (!alt) return;
    var links = $$('[data-wp]', alt), secs = links.map(function (a) { return document.getElementById(a.dataset.wp); });
    var num = $('[data-alt]', alt), BASE = 5364, TOP = 8849;
    function layout() {
      var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      links.forEach(function (a, i) {
        var top = secs[i] ? secs[i].getBoundingClientRect().top + scrollY : 0;
        a.parentElement.style.setProperty('--p', Math.min(1, Math.max(0, top / max)).toFixed(4));
      });
      update();
    }
    function update() {
      var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      var p = Math.min(1, Math.max(0, scrollY / max));
      alt.style.setProperty('--prog', p.toFixed(4));
      num.textContent = Math.round(BASE + (TOP - BASE) * p).toLocaleString('en-US');
      var cur = 0;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < innerHeight * 0.42) cur = i; });
      if (p > 0.985) cur = secs.length - 1;
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === cur); if (i === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', layout);
    addEventListener('load', layout);
    layout();
    if (!reduce) {
      var ly = $$('.ridge [data-par]');
      addEventListener('scroll', function () {
        var y = Math.min(scrollY, innerHeight);
        ly.forEach(function (l) { l.style.transform = 'translateY(' + (-y * parseFloat(l.dataset.par)).toFixed(1) + 'px)'; });
      }, { passive: true });
    }
  })();

  /* ---------- draw-in for route lines ---------- */
  var drawn = [];
  function prepDraw(el) {
    if (skipDraw || !el.getTotalLength) return;
    var len = el.getTotalLength();
    el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
    el.style.transition = 'none';
    drawn.push(el);
  }
  function revealDraw(els) {
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.style.strokeDashoffset = 0; }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; io.unobserve(el);
        el.getBoundingClientRect();
        el.style.transition = 'stroke-dashoffset 2.2s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.strokeDashoffset = 0;
      });
    }, { threshold: 0.35 });
    els.forEach(function (e) { io.observe(e.ownerSVGElement && e.closest('.route-map') ? e.closest('.route-map') : e); e.__io = io; });
  }
  (function () {
    var els = $$('.draw');
    els.forEach(prepDraw);
    if (skipDraw) return;
    // observe containing figure/svg so entries fire reliably
    var map = new Map();
    els.forEach(function (e) { var host = e.closest('.route-map') || e.closest('.ridge') || e.closest('svg'); if (!map.has(host)) map.set(host, []); map.get(host).push(e); });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        (map.get(en.target) || []).forEach(function (el, i) {
          el.getBoundingClientRect();
          el.style.transition = 'stroke-dashoffset ' + (el.dataset.dur || 2.4) + 's cubic-bezier(0.16, 1, 0.3, 1) ' + (el.dataset.delay || 0.2) + 's';
          el.style.strokeDashoffset = 0;
        });
      });
    }, { threshold: 0.3 });
    map.forEach(function (_, host) { io.observe(host); });
  })();

  /* ---------- elevation profile ---------- */
  var ROLES = [
    { camp: 1, short: 'UCSD', org: 'UCSD Bio-Inspired Robotics Lab', title: 'Data Science Researcher', dates: 'May 2018 – Jun 2021', s: 2018.33, e: 2021.5, v: 0.27, items: ['Built ML-on-edge sensor pipelines with Python, C++, CUDA, and deep learning for live robotics data.', 'Created GAN-based synthetic data generation to improve model generalization.', 'Published work in IEEE-RAS on affective touch classification.'] },
    { camp: 2, short: 'Redica', org: 'Redica Systems', title: 'Data Scientist', dates: 'Oct 2020 – Oct 2021', s: 2020.8, e: 2021.8, v: 0.45, items: ['Developed semi-supervised DBSCAN segmentation with TF-IDF and NLP techniques, saving 64+ business hours each month.', 'Engineered feature sets that improved precision and recall by 10% on supervised models.'] },
    { camp: 3, short: 'Ardent', org: 'Ardent', title: 'ML Engineer', dates: 'Jan 2022 – May 2023', s: 2022.0, e: 2023.4, v: 0.6, items: ['Built 20+ containerized training and serving pipelines for microservice health models using scikit-learn, PyTorch, and AWS.', 'Improved model quality on skewed OCR data through TF-IDF, XGBoost, and SMOTE, achieving PR-AUC of 0.91.', 'Implemented time-series anomaly detection for security logs, reducing incident detection latency by 80%.'] },
    { camp: 4, short: 'DCCA', org: 'DCCA', title: 'AI/ML Engineer', dates: 'Jul 2023 – Present', s: 2023.5, e: 2026.85, v: 0.83, items: ['Led development of a secure internal Agentic RAG chatbot stack on EC2 and scaled adoption to 80+ employees.', 'Deployed and monitored GPU-accelerated Llama 2/3 SageMaker endpoints for summarization, SQL assistance, and report generation POCs.', 'Productionized a drug price forecasting API with 5–11% error rates to enable proactive planning.', 'Scaled PySpark anomaly detection workflows that surfaced potentially fraudulent charges at large volume.'] }
  ];
  var T0 = 2017.6, T1 = 2027.1;
  var PTS = [[2017.6, 0.05], [2018.0, 0.15], [2018.33, 0.27], [2018.9, 0.31], [2019.5, 0.26], [2020.1, 0.33], [2020.45, 0.3], [2020.8, 0.45], [2021.3, 0.43], [2021.75, 0.37], [2022.0, 0.6], [2022.6, 0.58], [2023.0, 0.64], [2023.4, 0.55], [2023.5, 0.83], [2024.3, 0.78], [2025.2, 0.86], [2026.0, 0.84], [2026.85, 0.93], [2027.1, 0.93]];
  function spline(p) {
    var d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += 'C' + (b[0] + (c[0] - a[0]) / 6).toFixed(1) + ' ' + (b[1] + (c[1] - a[1]) / 6).toFixed(1) + ' ' + (c[0] - (e[0] - b[0]) / 6).toFixed(1) + ' ' + (c[1] - (e[1] - b[1]) / 6).toFixed(1) + ' ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
    }
    return d;
  }
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function Profile(host, card, compact) {
    var sel = 3, first = true;
    function cardHTML(r) {
      var h = '<div class="tags"><span class="tag hot">Camp ' + r.camp + '</span><span class="tag">' + r.dates + '</span></div><h3 class="d3">' + r.title + '</h3><p class="org">' + r.org + '</p>';
      if (!compact) h += '<ul>' + r.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>';
      return h;
    }
    function select(i, focus) {
      sel = i;
      $$('.camp', host).forEach(function (g, k) { g.classList.toggle('is-sel', k === i); g.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      $$('.lane', host).forEach(function (l, k) { l.classList.toggle('on', k === i); });
      if (card) card.innerHTML = cardHTML(ROLES[i]);
      if (focus) { var g = $$('.camp', host)[i]; if (g) g.focus(); }
    }
    function render() {
      var W = Math.max(280, Math.round(host.clientWidth)), narrow = W < 640;
      var H = compact ? (narrow ? 240 : 270) : (narrow ? 360 : Math.min(480, Math.round(W * 0.46)));
      var pad = { l: narrow ? 14 : 28, r: narrow ? 16 : 28, t: compact ? 58 : 66, b: compact ? 34 : 96 };
      var X = function (t) { return pad.l + (t - T0) / (T1 - T0) * (W - pad.l - pad.r); };
      var base = H - pad.b, Y = function (v) { return pad.t + (1 - v) * (base - pad.t); };
      var pts = PTS.map(function (p) { return [X(p[0]), Y(p[1])]; });
      var line = spline(pts);
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="Elevation profile of the career, 2018 to present, with four camps">';
      [0.25, 0.5, 0.75].forEach(function (v) { s += '<line class="grid" x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/>'; });
      s += '<path class="area" d="' + line + 'L' + X(T1).toFixed(1) + ' ' + base + 'L' + X(T0).toFixed(1) + ' ' + base + 'Z"/>';
      s += '<line class="grid" x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + base + '" y2="' + base + '" style="stroke:var(--line-2)"/>';
      for (var yr = 2018; yr <= 2026; yr += (narrow ? 2 : 1)) s += '<text class="t" x="' + X(yr).toFixed(1) + '" y="' + (base + 20) + '" text-anchor="middle">' + yr + '</text>';
      ROLES.forEach(function (r, i) {
        var cx = X(r.s), cy = Y(r.v);
        s += '<line class="drop" x1="' + cx.toFixed(1) + '" x2="' + cx.toFixed(1) + '" y1="' + cy.toFixed(1) + '" y2="' + base + '"/>';
      });
      s += '<path class="ridge-line draw" data-dur="2.8" data-delay="0.1" d="' + line + '"/>';
      if (!compact) ROLES.forEach(function (r, i) { var y = base + 44 + i * 10; s += '<line class="lane" x1="' + X(r.s).toFixed(1) + '" x2="' + X(Math.min(r.e, 2026.85)).toFixed(1) + '" y1="' + y + '" y2="' + y + '"/>'; });
      var fx = X(2026.85), fy = Y(0.93);
      s += '<g class="summit-flag" aria-hidden="true"><line class="p" x1="' + fx.toFixed(1) + '" x2="' + fx.toFixed(1) + '" y1="' + (fy - 2).toFixed(1) + '" y2="' + (fy - 34).toFixed(1) + '"/><path class="f" d="M' + fx.toFixed(1) + ' ' + (fy - 34).toFixed(1) + 'l-20 7 20 7z"/><text x="' + (fx - 26).toFixed(1) + '" y="' + (fy - 22).toFixed(1) + '" text-anchor="end">Summit: this conversation</text></g>';
      ROLES.forEach(function (r, i) {
        var cx = X(r.s), cy = Y(r.v), rad = compact ? 11 : 14;
        var anchor = cx < 90 ? 'start' : (cx > W - 90 ? 'end' : 'middle'), lx = anchor === 'start' ? cx - rad : anchor === 'end' ? cx + rad : cx;
        s += '<g class="camp" tabindex="0" role="button" aria-pressed="false" aria-label="Camp ' + r.camp + ': ' + r.title + ', ' + r.org + ', ' + r.dates + '" data-i="' + i + '"><circle class="ring" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (rad + 6) + '"/><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad + '"/><text class="n" x="' + cx.toFixed(1) + '" y="' + (cy + 4.5).toFixed(1) + '">' + r.camp + '</text><text class="lbl" x="' + lx.toFixed(1) + '" y="' + (cy - rad - 9).toFixed(1) + '" text-anchor="' + anchor + '">' + r.short + '</text></g>';
      });
      s += '</svg>';
      host.classList.toggle('narrow', narrow);
      host.innerHTML = s;
      $$('.camp', host).forEach(function (g) {
        var i = +g.dataset.i;
        g.addEventListener('click', function () { select(i); });
        g.addEventListener('mouseenter', function () { select(i); });
        g.addEventListener('focus', function () { select(i); });
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
          else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); select(Math.min(3, i + 1), true); }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); select(Math.max(0, i - 1), true); }
        });
      });
      select(sel);
      var path = $('.draw', host);
      if (first && path && !skipDraw) {
        first = false; prepDraw(path);
        var io = new IntersectionObserver(function (en) {
          if (!en[0].isIntersecting) return; io.disconnect();
          path.getBoundingClientRect(); path.style.transition = 'stroke-dashoffset 2.8s cubic-bezier(0.16, 1, 0.3, 1)'; path.style.strokeDashoffset = 0;
        }, { threshold: 0.4 });
        io.observe(host);
      }
      first = false;
    }
    var lw = 0;
    render();
    if ('ResizeObserver' in window) new ResizeObserver(function () { var w = Math.round(host.clientWidth); if (w && Math.abs(w - lw) > 2) { lw = w; render(); } }).observe(host);
    lw = Math.round(host.clientWidth);
  }
  $$('[data-profile]').forEach(function (h) { Profile(h, $(h.dataset.card), h.dataset.profile === 'compact'); });
})();
