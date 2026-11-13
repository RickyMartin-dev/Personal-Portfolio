/*
 * RMTune: shared live tuning panel for the Round 4 showcase versions. Do not fork.
 *
 *   <script src="../shared/tune.js"></script>   in <head>, right after bridge.js
 *   <script>RMTune.register({ id, name, palettes, groups, apply })</script>   end of <body>
 *
 * Applies saved / ?tune= state synchronously (fonts, :root vars, data-* attributes) before paint.
 * register() merges version defaults and mounts the pill. The panel DOM is built on first open;
 * nothing runs on scroll and nothing runs while the panel is closed.
 *
 * State is stored as a delta from the defaults. Core ids:
 *   palette, custom, fontDisplay, fontBody, fontMono, scale, size, lh, track, weight, italic,
 *   space, radius, max, motion, theme (theme is owned by RMTheme).
 * Events: document "rm:tune" {detail: {state, changed: [ids]}}. "changed" also uses
 *   'init' (after register), 'reset', 'theme', 'fonts' (a picked font finished loading).
 * Attributes: html[data-motion], html[data-tune-<controlId>] for select/segmented/toggle
 *   (toggle values are "on" / "off"), html[data-tune-italic]. Vars: see ROUND4.md.
 */
(function () {
  'use strict';
  if (window.RMTune) return;
  var doc = document, root = doc.documentElement;
  var SRC = (doc.currentScript && doc.currentScript.src) || '';

  /* ---------- stylesheet ---------- */
  try {
    var css = doc.createElement('link');
    css.rel = 'stylesheet';
    css.href = SRC ? SRC.replace(/tune\.js(\?.*)?$/, 'tune.css') : '../shared/tune.css';
    (doc.head || root).appendChild(css);
  } catch (e) {}

  /* ---------- fonts ---------- */
  var SERIF = 'Georgia, "Times New Roman", serif';
  var SANS = '"Helvetica Neue", Arial, sans-serif';
  var MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
  var W4 = 'ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700';
  var FONTS = {
    display: [
      ['Instrument Serif', 'Instrument+Serif:ital@0;1', SERIF, 0],
      ['Fraunces', 'Fraunces:' + W4, SERIF, 1],
      ['Cormorant Garamond', 'Cormorant+Garamond:' + W4, SERIF, 1],
      ['DM Serif Display', 'DM+Serif+Display:ital@0;1', SERIF, 0],
      ['Bodoni Moda', 'Bodoni+Moda:' + W4, SERIF, 1],
      ['Playfair Display', 'Playfair+Display:' + W4, SERIF, 1],
      ['Syne', 'Syne:wght@400;500;600;700', SANS, 1],
      ['Space Grotesk', 'Space+Grotesk:wght@400;500;600;700', SANS, 1],
      ['Unbounded', 'Unbounded:wght@400;500;600;700', SANS, 1],
      ['Hanken Grotesk', 'Hanken+Grotesk:' + W4, SANS, 1]
    ],
    body: [
      ['Hanken Grotesk', 'Hanken+Grotesk:' + W4, SANS, 1],
      ['Geist', 'Geist:wght@400;500;600;700', SANS, 1],
      ['Inter Tight', 'Inter+Tight:' + W4, SANS, 1],
      ['Manrope', 'Manrope:wght@400;500;600;700', SANS, 1],
      ['IBM Plex Sans', 'IBM+Plex+Sans:' + W4, SANS, 1],
      ['Work Sans', 'Work+Sans:' + W4, SANS, 1],
      ['Figtree', 'Figtree:' + W4, SANS, 1],
      ['Instrument Sans', 'Instrument+Sans:' + W4, SANS, 1],
      ['Newsreader', 'Newsreader:' + W4, SERIF, 1]
    ],
    mono: [
      ['Geist Mono', 'Geist+Mono:wght@400;500', MONO, 1],
      ['JetBrains Mono', 'JetBrains+Mono:wght@400;500', MONO, 1],
      ['IBM Plex Mono', 'IBM+Plex+Mono:wght@400;500', MONO, 1],
      ['Space Mono', 'Space+Mono:wght@400;700', MONO, 1],
      ['DM Mono', 'DM+Mono:wght@400;500', MONO, 1]
    ]
  };
  var FONT_VAR = { fontDisplay: ['--font-display', 'display'], fontBody: ['--font-body', 'body'], fontMono: ['--font-mono', 'mono'] };
  function findFont(kind, name) {
    var l = FONTS[kind];
    for (var i = 0; i < l.length; i++) if (l[i][0] === name) return l[i];
    return null;
  }
  var loadedFonts = {};
  function loadFont(f) {
    var key = f[0];
    if (loadedFonts[key]) return false;
    loadedFonts[key] = 1;
    var l = doc.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f[1] + '&display=swap';
    (doc.head || root).appendChild(l);
    return true;
  }

  /* ---------- state ---------- */
  var CD = { fontDisplay: '', fontBody: '', fontMono: '', scale: 1, size: 17, lh: 1.65, track: -0.01, weight: '', italic: true, space: 1, radius: 4, max: 1280, motion: 'full' };
  var CORE_IDS = ['palette', 'custom', 'fontDisplay', 'fontBody', 'fontMono', 'scale', 'size', 'lh', 'track', 'weight', 'italic', 'space', 'radius', 'max', 'motion'];
  var S = {};
  var reg = null, curId = null, urlState = false, wantOpen = false;
  var appliedVars = [];

  function metaId() {
    var m = doc.querySelector('meta[name="rm-version"]');
    return m ? m.content : null;
  }
  function parseUrl() {
    try {
      var p = new URLSearchParams(location.search).get('tune');
      if (!p) return null;
      if (p === 'open') { wantOpen = true; return null; }
      var s = p.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var o = JSON.parse(atob(s));
      if (o && o.open) wantOpen = true;
      return o && typeof o === 'object' ? o : null;
    } catch (e) { return null; }
  }
  function loadStored(id) {
    try {
      var o = JSON.parse(localStorage.getItem('rm-tune-' + id));
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }
  function sanitize(o) {
    var out = {}, k, v;
    for (k in o) {
      if (!Object.prototype.hasOwnProperty.call(o, k) || k === 'open' || k === 'id' || k === 'theme') continue;
      v = o[k];
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || (v && typeof v === 'object' && (k === 'custom' || k === '_p'))) out[k] = v;
    }
    return out;
  }
  var save = function () {
    if (!curId) return;
    try {
      var empty = true, k;
      for (k in S) { empty = false; break; }
      if (empty) localStorage.removeItem('rm-tune-' + curId);
      else localStorage.setItem('rm-tune-' + curId, JSON.stringify(S));
    } catch (e) {}
  };

  (function boot() {
    var u = parseUrl();
    curId = metaId();
    if (u) {
      urlState = true;
      if ((u.theme === 'light' || u.theme === 'dark') && window.RMTheme && window.RMTheme.get() !== u.theme) window.RMTheme.set(u.theme);
      S = sanitize(u);
    } else if (curId) S = sanitize(loadStored(curId));
  })();

  /* ---------- helpers ---------- */
  function theme() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }
  function sv(name, val) {
    if (val === null || val === undefined || val === '') root.style.removeProperty(name);
    else root.style.setProperty(name, String(val));
  }
  function toHex(str) {
    var s = doc.createElement('span');
    s.style.color = str;
    root.appendChild(s);
    var c = getComputedStyle(s).color;
    root.removeChild(s);
    var m = /(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c);
    if (!m) return '#888888';
    return '#' + [m[1], m[2], m[3]].map(function (n) { return ('0' + (+n).toString(16)).slice(-2); }).join('');
  }
  function ctlList() {
    var out = [];
    if (reg && reg.groups) reg.groups.forEach(function (g) { (g.controls || []).forEach(function (c) { out.push(c); }); });
    return out;
  }
  function findCtl(id) {
    var l = ctlList();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function defaultOf(id) {
    if (CD.hasOwnProperty(id)) return CD[id];
    var c = findCtl(id);
    if (!c) return undefined;
    if (c.default !== undefined) return c.default;
    if (c.type === 'toggle') return false;
    if (c.type === 'range') return c.min;
    if (c.options && c.options.length) return c.options[0].value;
    return '';
  }
  function cur(id) {
    var v = S[id];
    return v === undefined ? defaultOf(id) : v;
  }
  function effective() {
    var o = {}, i, l;
    for (i = 0; i < CORE_IDS.length; i++) if (CORE_IDS[i] !== 'custom') o[CORE_IDS[i]] = cur(CORE_IDS[i]);
    o.palette = S.palette || (reg && reg.palettes && reg.palettes.length ? reg.palettes[0].id : 'default');
    if (S.custom) o.custom = JSON.parse(JSON.stringify(S.custom));
    l = ctlList();
    for (i = 0; i < l.length; i++) o[l[i].id] = cur(l[i].id);
    o.theme = theme();
    return o;
  }
  function attrVal(v) { return v === true ? 'on' : v === false ? 'off' : String(v); }

  /* ---------- palette ---------- */
  function palList() { return reg && reg.palettes && reg.palettes.length ? reg.palettes : []; }
  function firstPalId() { var l = palList(); return l.length ? l[0].id : 'default'; }
  function findPal(id) {
    var l = palList();
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function customMap(c) {
    return { '--violet': c.v, '--cyan': c.c, '--amber': c.a, '--accent': c.a, '--accent-text': c.a };
  }
  function removePaletteVars() {
    for (var i = 0; i < appliedVars.length; i++) root.style.removeProperty(appliedVars[i]);
    appliedVars = [];
  }
  function applyPalette() {
    removePaletteVars();
    var p = S.palette || firstPalId(), th = theme(), map = null, k;
    if (p === 'custom') {
      S.custom = S.custom || {};
      if (!S.custom[th]) {
        S.custom[th] = { v: toHex(getComputedStyle(root).getPropertyValue('--violet') || '#9f7bff'), c: toHex(getComputedStyle(root).getPropertyValue('--cyan') || '#5dc7ff'), a: toHex(getComputedStyle(root).getPropertyValue('--amber') || '#ffb562') };
      }
      map = customMap(S.custom[th]);
    } else if (reg) {
      var pl = findPal(p);
      map = pl ? (pl[th] || {}) : {};
      if (pl && pl.id !== firstPalId()) S._p = { id: p, dark: pl.dark || {}, light: pl.light || {} };
      else delete S._p;
    } else if (S._p && S._p.id === p) map = S._p[th] || {};
    if (!map) return;
    for (k in map) {
      if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
      root.style.setProperty(k, map[k]);
      appliedVars.push(k);
    }
  }

  /* ---------- core application ---------- */
  function applyCore() {
    var k, f, fv;
    for (k in FONT_VAR) {
      fv = FONT_VAR[k];
      f = S[k] ? findFont(fv[1], S[k]) : null;
      if (f) { loadFont(f); sv(fv[0], '"' + f[0] + '", ' + f[2]); } else sv(fv[0], null);
    }
    sv('--tune-display', S.scale !== undefined && S.scale !== CD.scale ? S.scale : null);
    sv('--tune-body', S.size !== undefined && S.size !== CD.size ? S.size + 'px' : null);
    sv('--tune-lh', S.lh !== undefined && S.lh !== CD.lh ? S.lh : null);
    sv('--tune-track', S.track !== undefined && S.track !== CD.track ? S.track + 'em' : null);
    sv('--tune-space', S.space !== undefined && S.space !== CD.space ? S.space : null);
    sv('--tune-radius', S.radius !== undefined && S.radius !== CD.radius ? S.radius + 'px' : null);
    sv('--tune-max', S.max !== undefined && S.max !== CD.max ? S.max + 'px' : null);
    var df = S.fontDisplay ? findFont('display', S.fontDisplay) : null;
    sv('--tune-weight', S.weight && df && df[3] ? S.weight : null);
    root.setAttribute('data-motion', S.motion || 'full');
    root.setAttribute('data-tune-italic', S.italic === false ? 'off' : 'on');
    applyPalette();
    var l = ctlList(), i, c;
    for (i = 0; i < l.length; i++) {
      c = l[i];
      if (c.type === 'select' || c.type === 'segmented' || c.type === 'toggle') root.setAttribute('data-tune-' + c.id.toLowerCase(), attrVal(cur(c.id)));
    }
  }
  function earlyApply() {
    applyCore();
    if (!reg) {
      for (var k in S) {
        if (CORE_IDS.indexOf(k) < 0 && k !== '_p' && (typeof S[k] === 'string' || typeof S[k] === 'boolean')) root.setAttribute('data-tune-' + k.toLowerCase(), attrVal(S[k]));
      }
    }
  }
  earlyApply();

  /* ---------- events ---------- */
  var pending = [], timer = 0;
  function dispatch() {
    timer = 0;
    var changed = pending; pending = [];
    var st = effective();
    save();
    if (reg && typeof reg.apply === 'function') { try { reg.apply(st); } catch (e) { if (window.console) console.error(e); } }
    doc.dispatchEvent(new CustomEvent('rm:tune', { detail: { state: st, changed: changed } }));
  }
  function fire(ids, now) {
    ids.forEach(function (i) { if (pending.indexOf(i) < 0) pending.push(i); });
    if (now) { clearTimeout(timer); dispatch(); return; }
    clearTimeout(timer);
    timer = setTimeout(dispatch, 60);
  }

  function setVal(id, v, stream) {
    var d = defaultOf(id);
    if (typeof v === 'number' && typeof d === 'number' && Math.abs(v - d) < 1e-9) v = d;
    if (v === d) delete S[id]; else S[id] = v;
    applyCore();
    var f = FONT_VAR[id];
    fire([id], !stream);
    if (f && S[id]) {
      var fnt = findFont(f[1], S[id]);
      if (fnt && doc.fonts && doc.fonts.load) {
        var done = function () { fire(['fonts'], false); };
        doc.fonts.load('400 1em "' + fnt[0] + '"').then(done, done);
      }
    }
    syncUI();
  }

  doc.addEventListener('rm:themechange', function () {
    applyPalette();
    syncUI();
    fire(['theme'], true);
  });

  /* ---------- UI ---------- */
  var ui = null, pill = null, panel = null, isOpen = false, syncers = [], uid = 0;
  function h(tag, props, kids) {
    var e = doc.createElement(tag), k;
    if (props) for (k in props) {
      if (k === 'text') e.textContent = props[k];
      else if (k === 'class') e.className = props[k];
      else if (props[k] !== null && props[k] !== undefined) e.setAttribute(k, props[k]);
    }
    if (kids) kids.forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(paths, size) {
    var s = doc.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size || 18); s.setAttribute('height', size || 18);
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.6'); s.setAttribute('stroke-linecap', 'round');
    paths.forEach(function (d) { var p = doc.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); s.appendChild(p); });
    return s;
  }
  var ICON_SLIDERS = ['M4 7h9', 'M17 7h3', 'M4 17h3', 'M11 17h9', 'M15 4.5v5', 'M9 14.5v5'];
  var ICON_X = ['M6 6l12 12', 'M18 6L6 18'];
  var ICON_CHEV = ['M7 10l5 5 5-5'];

  function fmt(c, v) {
    var step = c.step || 1, dec = (String(step).split('.')[1] || '').length;
    var n = (+v).toFixed(dec);
    if (c.auto && S[c.id] === undefined) return 'Version';
    return n + (c.unit || '');
  }
  function fieldHead(c, id) {
    return h('div', { class: 'rmt-fhead' }, [h('label', { for: id, class: 'rmt-label', text: c.label })]);
  }
  function hintEl(c, id) {
    return c.hint ? h('p', { class: 'rmt-hint', id: id + '-h', text: c.hint }) : null;
  }

  function mkRange(c) {
    var id = 'rmt-c' + (++uid);
    var input = h('input', { type: 'range', id: id, class: 'rmt-range', min: c.min, max: c.max, step: c.step || 1, 'aria-describedby': c.hint ? id + '-h' : null });
    var out = h('output', { class: 'rmt-val', for: id });
    var head = fieldHead(c, id); head.appendChild(out);
    function paint() {
      var pc = (input.value - c.min) / (c.max - c.min) * 100;
      input.style.setProperty('--rmt-fill', pc + '%');
    }
    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      setVal(c.id, v, true);
      out.textContent = fmt(c, v); paint();
    });
    input.addEventListener('change', function () { fire([c.id], true); });
    var el = h('div', { class: 'rmt-field' }, [head, input, hintEl(c, id)]);
    syncers.push(function () { input.value = cur(c.id); out.textContent = fmt(c, input.value); paint(); });
    return el;
  }
  function mkSelect(c, opts) {
    var id = 'rmt-c' + (++uid);
    var sel = h('select', { id: id, class: 'rmt-select', 'aria-describedby': c.hint ? id + '-h' : null });
    (opts || c.options).forEach(function (o) { sel.appendChild(h('option', { value: o.value, text: o.label })); });
    sel.addEventListener('change', function () { setVal(c.id, sel.value); });
    var wrap = h('div', { class: 'rmt-selwrap' }, [sel, svg(ICON_CHEV, 16)]);
    var el = h('div', { class: 'rmt-field' }, [fieldHead(c, id), wrap, hintEl(c, id)]);
    syncers.push(function () { sel.value = String(cur(c.id)); });
    return el;
  }
  function mkSeg(c, opts) {
    var gid = 'rmt-c' + (++uid), name = gid;
    var group = h('div', { class: 'rmt-seg', role: 'radiogroup', 'aria-labelledby': gid + '-l', 'aria-describedby': c.hint ? gid + '-h' : null });
    var inputs = [];
    (opts || c.options).forEach(function (o, i) {
      var iid = gid + '-' + i;
      var inp = h('input', { type: 'radio', name: name, id: iid, value: o.value });
      inp.addEventListener('change', function () { if (inp.checked && !c.external) setVal(c.id, o.value); });
      inputs.push(inp);
      group.appendChild(inp);
      group.appendChild(h('label', { for: iid, text: o.label }));
    });
    var head = h('div', { class: 'rmt-fhead' }, [h('span', { class: 'rmt-label', id: gid + '-l', text: c.label })]);
    var el = h('div', { class: 'rmt-field' }, [head, group, hintEl(c, gid)]);
    syncers.push(function () { var v = String(cur(c.id)); inputs.forEach(function (i) { i.checked = i.value === v; }); });
    el._inputs = inputs;
    return el;
  }
  function mkToggle(c) {
    var id = 'rmt-c' + (++uid);
    var inp = h('input', { type: 'checkbox', role: 'switch', id: id, class: 'rmt-sw', 'aria-describedby': c.hint ? id + '-h' : null });
    inp.addEventListener('change', function () { setVal(c.id, inp.checked); });
    var row = h('div', { class: 'rmt-fhead rmt-toggle' }, [h('label', { for: id, class: 'rmt-label', text: c.label }), inp]);
    var el = h('div', { class: 'rmt-field' }, [row, hintEl(c, id)]);
    syncers.push(function () { inp.checked = !!cur(c.id); });
    return el;
  }
  function mkColor(c) {
    var id = 'rmt-c' + (++uid);
    var inp = h('input', { type: 'color', id: id, class: 'rmt-color' });
    var txt = h('span', { class: 'rmt-hex' });
    inp.addEventListener('input', function () { setVal(c.id, inp.value, true); txt.textContent = inp.value; });
    inp.addEventListener('change', function () { fire([c.id], true); });
    var row = h('div', { class: 'rmt-fhead rmt-toggle' }, [h('label', { for: id, class: 'rmt-label', text: c.label }), h('span', { class: 'rmt-colorwrap' }, [txt, inp])]);
    var el = h('div', { class: 'rmt-field' }, [row, hintEl(c, id)]);
    syncers.push(function () { var v = String(cur(c.id) || '#000000'); inp.value = /^#[0-9a-f]{6}$/i.test(v) ? v : toHex(v); txt.textContent = inp.value; });
    return el;
  }
  function mkControl(c) {
    switch (c.type) {
      case 'range': return mkRange(c);
      case 'select': return mkSelect(c);
      case 'segmented': return mkSeg(c);
      case 'toggle': return mkToggle(c);
      case 'color': return mkColor(c);
    }
    return null;
  }
  function group(id, label, nodes, open) {
    var d = h('details', { class: 'rmt-group', 'data-g': id });
    if (open) d.open = true;
    d.appendChild(h('summary', null, [h('span', { text: label }), svg(ICON_CHEV, 16)]));
    d.appendChild(h('div', { class: 'rmt-gbody' }, nodes));
    return d;
  }
  function fontOpts(kind) {
    var o = [{ value: '', label: 'Version default' }];
    FONTS[kind].forEach(function (f) { o.push({ value: f[0], label: f[0] }); });
    return o;
  }

  function buildPalette() {
    var gid = 'rmt-pal';
    var wrap = h('div', { class: 'rmt-field' });
    wrap.appendChild(h('div', { class: 'rmt-fhead' }, [h('span', { class: 'rmt-label', id: gid + '-l', text: 'Palette' })]));
    var list = h('div', { class: 'rmt-pals', role: 'radiogroup', 'aria-labelledby': gid + '-l' });
    var inputs = [], dotSets = {};
    var items = palList().slice();
    if (!items.length) items.push({ id: 'default', name: 'Default', swatch: [] });
    items.push({ id: 'custom', name: 'Custom', swatch: ['#9f7bff', '#5dc7ff', '#ffb562'], custom: true });
    items.forEach(function (p, i) {
      var iid = gid + '-' + i;
      var inp = h('input', { type: 'radio', name: gid, id: iid, value: p.id });
      inp.addEventListener('change', function () {
        if (!inp.checked) return;
        if (p.id === 'custom') { S.palette = 'custom'; delete S._p; applyCore(); fire(['palette', 'custom'], true); syncUI(); }
        else setVal('palette', p.id);
      });
      inputs.push(inp);
      var dots = h('span', { class: 'rmt-dots' }, (p.swatch || []).map(function (c) { return h('i', { style: 'background:' + c }); }));
      dotSets[p.id] = dots;
      list.appendChild(inp);
      list.appendChild(h('label', { for: iid, class: 'rmt-pal' }, [dots, h('span', { class: 'rmt-pname', text: p.name })]));
    });
    wrap.appendChild(list);
    var cust = h('div', { class: 'rmt-custom', hidden: '' });
    var cc = [['v', 'Violet'], ['c', 'Cyan'], ['a', 'Amber / accent']];
    var pickers = {};
    cc.forEach(function (x) {
      var id = 'rmt-cc-' + x[0];
      var inp = h('input', { type: 'color', id: id, class: 'rmt-color' });
      var txt = h('span', { class: 'rmt-hex' });
      inp.addEventListener('input', function () {
        var th = theme();
        S.custom = S.custom || {}; S.custom[th] = S.custom[th] || {};
        S.custom[th][x[0]] = inp.value;
        txt.textContent = inp.value;
        applyCore();
        paintCustom();
        fire(['palette', 'custom'], false);
      });
      inp.addEventListener('change', function () { fire(['palette', 'custom'], true); });
      pickers[x[0]] = [inp, txt];
      cust.appendChild(h('div', { class: 'rmt-fhead rmt-toggle' }, [h('label', { for: id, class: 'rmt-label', text: x[1] }), h('span', { class: 'rmt-colorwrap' }, [txt, inp])]));
    });
    function paintCustom() {
      var c = S.custom && S.custom[theme()];
      if (!c) return;
      ['v', 'c', 'a'].forEach(function (k, i) {
        pickers[k][0].value = c[k]; pickers[k][1].textContent = c[k];
        var d = dotSets.custom.children[i]; if (d) d.style.background = c[k];
      });
    }
    wrap.appendChild(cust);
    syncers.push(function () {
      var p = S.palette || firstPalId();
      inputs.forEach(function (i) { i.checked = i.value === p; });
      cust.hidden = p !== 'custom';
      if (p === 'custom') paintCustom();
    });
    return wrap;
  }

  function buildPanel() {
    syncers = [];
    var name = reg.name || reg.id;
    var title = h('h2', { class: 'rmt-title', id: 'rmt-title' }, [h('span', { text: 'Tune' }), h('span', { class: 'rmt-sub', text: name })]);
    var close = h('button', { type: 'button', class: 'rmt-x', 'aria-label': 'Close tuning panel' }, [svg(ICON_X, 18)]);
    close.addEventListener('click', function () { setOpen(false); });
    var head = h('div', { class: 'rmt-head' }, [title, close]);

    var narrow = window.matchMedia && matchMedia('(max-width: 640px)').matches;
    var look = [];
    if (window.RMTheme) {
      var tc = mkSeg({ id: '_theme', external: true, label: 'Theme', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] });
      tc._inputs.forEach(function (inp) { inp.addEventListener('change', function () { if (inp.checked) window.RMTheme.set(inp.value); }); });
      // theme segmented control reads from RMTheme, not from S
      syncers.pop();
      var tsync = function () { tc._inputs.forEach(function (i) { i.checked = i.value === theme(); }); };
      syncers.push(tsync);
      look.push(tc);
    }
    look.push(buildPalette());

    var weightCtl = mkSeg({ id: 'weight', label: 'Heading weight', hint: 'Needs a display font with weights; pick one above.', options: [{ value: '', label: 'Auto' }, { value: '400', label: '400' }, { value: '500', label: '500' }, { value: '600', label: '600' }, { value: '700', label: '700' }] });
    var weightSync = function () {
      var f = S.fontDisplay ? findFont('display', S.fontDisplay) : null, on = !!(f && f[3]);
      weightCtl._inputs.forEach(function (i) { i.disabled = !on; });
      weightCtl.classList.toggle('rmt-off', !on);
      var wh = weightCtl.querySelector('.rmt-hint'); if (wh) wh.hidden = on;
    };
    syncers.push(weightSync);
    var type = [
      mkSelect({ id: 'fontDisplay', label: 'Display font' }, fontOpts('display')),
      mkSelect({ id: 'fontBody', label: 'Body font' }, fontOpts('body')),
      mkSelect({ id: 'fontMono', label: 'Mono font' }, fontOpts('mono')),
      mkRange({ id: 'scale', label: 'Heading scale', min: 0.75, max: 1.35, step: 0.01, unit: '×' }),
      mkRange({ id: 'size', label: 'Body size', min: 15, max: 20, step: 0.5, unit: 'px' }),
      mkRange({ id: 'lh', label: 'Line height', min: 1.4, max: 1.9, step: 0.05 }),
      mkRange({ id: 'track', label: 'Heading tracking', min: -0.04, max: 0.04, step: 0.005, unit: 'em', auto: true }),
      weightCtl,
      mkToggle({ id: 'italic', label: 'Italic accents' })
    ];
    var layout = [
      mkRange({ id: 'space', label: 'Spacing density', min: 0.7, max: 1.4, step: 0.05, unit: '×' }),
      mkRange({ id: 'radius', label: 'Corner radius', min: 0, max: 24, step: 1, unit: 'px', auto: true }),
      mkRange({ id: 'max', label: 'Content width', min: 1040, max: 1440, step: 20, unit: 'px' })
    ];
    var motion = [mkSeg({ id: 'motion', label: 'Ambient animation', hint: 'Calm halves it; Off stops it like reduced motion.', options: [{ value: 'full', label: 'Full' }, { value: 'calm', label: 'Calm' }, { value: 'off', label: 'Off' }] })];

    var body = h('div', { class: 'rmt-body' });
    body.appendChild(group('look', 'Look', look, true));
    body.appendChild(group('type', 'Type', type, !narrow));
    body.appendChild(group('layout', 'Layout', layout, false));
    body.appendChild(group('motion', 'Motion', motion, false));
    if (reg.groups) reg.groups.forEach(function (g) {
      var nodes = (g.controls || []).map(mkControl).filter(Boolean);
      if (nodes.length) body.appendChild(group(g.id, g.label, nodes, false));
    });

    var status = h('p', { class: 'rmt-status', role: 'status', 'aria-live': 'polite' });
    var area = h('textarea', { class: 'rmt-area', readonly: '', 'aria-label': 'Settings JSON', rows: 6, hidden: '' });
    function flash(msg) { status.textContent = msg; clearTimeout(flash.t); flash.t = setTimeout(function () { status.textContent = ''; }, 2600); }
    function copy(text, okMsg, what) {
      function fallback() {
        area.hidden = false; area.value = text; area.focus(); area.select();
        flash('Select and copy the ' + what + ' below.');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { area.hidden = true; flash(okMsg); }, fallback);
      else fallback();
    }
    var bReset = h('button', { type: 'button', class: 'rmt-btn', text: 'Reset' });
    var bCopy = h('button', { type: 'button', class: 'rmt-btn', text: 'Copy settings' });
    var bLink = h('button', { type: 'button', class: 'rmt-btn', text: 'Copy link' });
    bReset.addEventListener('click', function () { reset(); flash('Back to the version defaults.'); });
    bCopy.addEventListener('click', function () {
      var st = effective(); delete st.theme;
      copy(JSON.stringify({ id: reg.id, theme: theme(), settings: st }, null, 2), 'Settings copied.', 'settings');
    });
    bLink.addEventListener('click', function () { copy(shareLink(), 'Link copied.', 'link'); });
    var foot = h('div', { class: 'rmt-foot' }, [h('div', { class: 'rmt-btns' }, [bReset, bCopy, bLink]), status, area]);

    panel = h('aside', { class: 'rmt-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rmt-title', tabindex: '-1', inert: '' }, [head, body, foot]);
    panel.addEventListener('keydown', trap);
    ui.appendChild(panel);
    syncUI();
  }

  function shareLink() {
    var d = {}, k;
    for (k in S) if (Object.prototype.hasOwnProperty.call(S, k) && k !== '_p') d[k] = S[k];
    var u = new URL(location.href);
    u.searchParams.delete('tune');
    u.searchParams.set('theme', theme());
    var any = false; for (k in d) { any = true; break; }
    var s = u.toString();
    if (any) s += (u.search ? '&' : '?') + 'tune=' + btoa(JSON.stringify(d)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return s;
  }
  function syncUI() { for (var i = 0; i < syncers.length; i++) syncers[i](); }

  function reset() {
    S = {};
    removePaletteVars();
    applyCore();
    try { localStorage.removeItem('rm-tune-' + curId); } catch (e) {}
    var ids = CORE_IDS.slice(); ctlList().forEach(function (c) { ids.push(c.id); });
    ids.push('reset');
    fire(ids, true);
    syncUI();
  }

  function focusables() {
    return [].slice.call(panel.querySelectorAll('button, input, select, textarea, summary, [href]')).filter(function (e) {
      return !e.disabled && !e.hidden && e.offsetParent !== null && e.type !== 'hidden' && !(e.type === 'radio' && !e.checked && e.name && panel.querySelector('input[name="' + e.name + '"]:checked'));
    });
  }
  function trap(e) {
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = doc.activeElement;
    if (e.shiftKey && (a === first || a === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function onKey(e) {
    if (e.key === 'Escape' && isOpen) { e.preventDefault(); setOpen(false); }
  }
  function setOpen(o) {
    if (o === isOpen || !ui) return;
    isOpen = o;
    if (o) {
      if (!panel) buildPanel(); else syncUI();
      panel.removeAttribute('inert');
      void panel.offsetWidth;
      ui.classList.add('rmt-open');
      pill.setAttribute('aria-expanded', 'true');
      doc.addEventListener('keydown', onKey);
      panel.focus({ preventScroll: true });
    } else {
      ui.classList.remove('rmt-open');
      panel.setAttribute('inert', '');
      pill.setAttribute('aria-expanded', 'false');
      doc.removeEventListener('keydown', onKey);
      pill.focus({ preventScroll: true });
    }
  }

  function mount() {
    if (ui) return;
    ui = h('div', { class: 'rmt-root', 'data-rmt': '' });
    pill = h('button', { type: 'button', class: 'rmt-pill', 'aria-expanded': 'false', 'aria-haspopup': 'dialog', 'aria-label': 'Tune this design' }, [svg(ICON_SLIDERS, 18), h('span', { class: 'rmt-pill-t', text: 'Tune' })]);
    pill.addEventListener('click', function () { setOpen(!isOpen); });
    ui.appendChild(pill);
    doc.body.appendChild(ui);
    if (wantOpen) setOpen(true);
  }

  /* ---------- public API ---------- */
  function register(schema) {
    if (!schema || !schema.id) return;
    reg = schema;
    if (curId !== schema.id) {
      curId = schema.id;
      if (!urlState) S = sanitize(loadStored(curId));
    }
    // drop palette ids that no longer exist
    if (S.palette && S.palette !== 'custom' && !findPal(S.palette)) delete S.palette;
    if (S.palette && S.palette === firstPalId()) delete S.palette;
    applyCore();
    if (doc.body) mount(); else doc.addEventListener('DOMContentLoaded', mount);
    if (panel) { panel.remove(); panel = null; if (isOpen) { isOpen = false; setOpen(true); } }
    fire(['init'], true);
  }

  window.RMTune = {
    register: register,
    get: function (id) { return id === 'theme' ? theme() : id === 'palette' || id === 'custom' ? effective()[id] : cur(id); },
    state: function () { return effective(); }
  };
})();
