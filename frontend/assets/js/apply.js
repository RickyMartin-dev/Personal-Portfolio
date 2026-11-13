/* Aurora Lines (final): applies window.RM_DEFAULTS merged with a delta.
   Writes CSS variables (one generated <style id="rm-vars">), html data-* attributes, a <style id="rm-el"> for per-element
   overrides, copy text into [data-edit] nodes, and fires `rm:config` { config, changed }. Runs in <head>: no flash.
   Only the delta from RM_DEFAULTS is written, so default values keep the hand-tuned CSS. */
(function () {
  'use strict';
  var root = document.documentElement;
  var D = window.RM_DEFAULTS;
  if (!D) return;

  /* ---------- helpers ---------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, over) {
    if (!isObj(over)) return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(over).forEach(function (k) {
      if (isObj(over[k]) && isObj(base[k])) out[k] = merge(base[k], over[k]);
      else out[k] = Array.isArray(over[k]) ? over[k].slice() : (isObj(over[k]) ? clone(over[k]) : over[k]);
    });
    return out;
  }
  function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function num(v, d) { v = parseFloat(v); return isFinite(v) ? v : d; }
  function rgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
  }
  function hex(a) { return '#' + a.map(function (n) { return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  var W = '#ffffff', K = '#000000';
  function page() {
    var m = document.querySelector('meta[name="rm-page"]');
    var p = m ? m.content : '';
    if (!p) { var f = location.pathname.split('/').pop(); p = f === 'about.html' ? 'about' : f === 'games.html' ? 'games' : 'home'; }
    return p === 'home' ? 'index' : p;
  }
  var PAGE = page();

  /* ---------- five-seed scene derivation ---------- */
  /* seeds: s = [crest, rose, sky, indigo, depth]; g = ground */
  function derive(th, s, g) {
    var a = s[0], r = s[1], c = s[2], i = s[3], v = s[4], m;
    var dr = mix(v, r, 0.5);
    if (th === 'dark') {
      m = {
        '--sky-0': mix(g, K, 0.45), '--sky-2': mix(g, v, 0.12), '--sky-3': mix(g, dr, 0.38),
        '--l1c': mix(g, i, 0.65), '--l1m': mix(g, i, 0.42), '--l1b': mix(g, mix(v, r, 0.4), 0.4),
        '--l2c': mix(g, i, 0.4), '--l2m': mix(g, v, 0.22), '--l2b': mix(g, mix(v, r, 0.3), 0.26),
        '--l3c': mix(g, v, 0.17), '--l3m': mix(g, v, 0.09), '--l3b': mix(g, v, 0.1),
        '--l4c': mix(g, v, 0.07), '--l4m': mix(g, v, 0.03), '--l4b': g,
        '--ln-top': mix(a, W, 0.3), '--ln-mid': c, '--ln-low': v, '--ln-base': mix(v, g, 0.3), '--rim-line': mix(a, W, 0.45), '--far': mix(g, v, 0.2),
        '--lit': a, '--shade': mix(g, K, 0.8), '--rim': mix(a, W, 0.4), '--mist': mix(v, g, 0.15), '--glow': a,
        '--av1': c, '--av2': i, '--av3': v, '--av4': v, '--av5': r, '--av6': a,
        '--fx1': v, '--fx2': c, '--fx3': mix(a, W, 0.2), '--fxc': mix(a, W, 0.9),
        '--cm0': c, '--cm1': v, '--cm2': c, '--cm3': a
      };
      m['--sky-1'] = mix(m['--sky-0'], m['--sky-2'], 0.45);
    } else {
      m = {
        '--sky-0': mix(g, v, 0.28), '--sky-1': mix(g, v, 0.17), '--sky-2': mix(g, dr, 0.16), '--sky-3': mix(g, a, 0.22),
        '--l1c': mix(g, i, 0.2), '--l1m': mix(g, v, 0.18), '--l1b': mix(g, a, 0.18),
        '--l2c': mix(g, i, 0.4), '--l2m': mix(g, v, 0.36), '--l2b': mix(g, mix(v, r, 0.5), 0.3),
        '--l3c': mix(g, i, 0.62), '--l3m': mix(g, v, 0.5), '--l3b': mix(g, mix(v, r, 0.4), 0.38),
        '--l4c': mix(g, i, 0.8), '--l4m': mix(g, v, 0.62), '--l4b': g,
        '--ln-top': a, '--ln-mid': c, '--ln-low': v, '--ln-base': mix(v, g, 0.2), '--rim-line': mix(a, W, 0.12), '--far': mix(g, v, 0.1),
        '--lit': mix(a, W, 0.55), '--shade': mix(i, K, 0.5), '--rim': mix(a, W, 0.5), '--mist': mix(a, W, 0.85), '--glow': mix(a, W, 0.4),
        '--av1': mix(c, W, 0.6), '--av2': mix(i, W, 0.55), '--av3': mix(v, W, 0.55), '--av4': mix(r, W, 0.5), '--av5': mix(r, W, 0.7), '--av6': mix(a, W, 0.8),
        '--fx1': v, '--fx2': c, '--fx3': a, '--fxc': a,
        '--cm0': v, '--cm1': v, '--cm2': c, '--cm3': a
      };
    }
    return m;
  }

  var BASE_VARS = { bg: '--ground', surface: '--surface', surface2: '--surface-2', text: '--text', muted: '--muted', faint: '--faint', accent: '--accent', accentInk: '--accent-ink', accentText: '--accent-text' };
  function themeBlock(th, c, d) {
    var decl = [], k;
    var au = c.aurora || d.aurora;
    for (k = 0; k < 5; k++) decl.push('--au' + k + ':' + au[k]);
    Object.keys(BASE_VARS).forEach(function (key) { if (c[key] !== d[key] && c[key]) decl.push(BASE_VARS[key] + ':' + c[key]); });
    if (!eq(au, d.aurora)) { decl.push('--amber:' + au[0], '--cyan:' + au[2], '--violet:' + au[4]); }
    if (c.lineAlpha !== d.lineAlpha || c.text !== d.text) {
      var t = rgb(c.text), la = num(c.lineAlpha, 0.12), ls = Math.min(0.6, la * (th === 'dark' ? 2.33 : 2.5));
      decl.push('--line:rgba(' + t.join(',') + ',' + la.toFixed(3) + ')', '--line-strong:rgba(' + t.join(',') + ',' + ls.toFixed(3) + ')');
    }
    if (!eq(au, d.aurora) || c.bg !== d.bg) {
      var m = derive(th, au, c.bg);
      Object.keys(m).forEach(function (key) { decl.push(key + ':' + m[key]); });
    }
    if (c.skyGlow !== d.skyGlow) decl.push('--sky-glow:' + num(c.skyGlow, 1));
    if (c.lineGlow !== d.lineGlow) decl.push('--line-glow:' + num(c.lineGlow, 1));
    return 'html:root[data-theme="' + th + '"]{' + decl.join(';') + '}';
  }

  /* ---------- fonts (on demand) ---------- */
  var DEFAULT_FONTS = { 'Instrument Serif': 1, 'Hanken Grotesk': 1, 'Geist Mono': 1 };
  var fontsLoaded = {};
  function loadFont(name) {
    if (!name || DEFAULT_FONTS[name] || fontsLoaded[name]) return;
    fontsLoaded[name] = true;
    var fam = encodeURIComponent(name).replace(/%20/g, '+');
    var ladder = [':ital,wght@0,400;0,500;0,600;0,700;1,400;1,700', ':wght@400;500;600;700', ':ital@0;1', ''];
    var idx = 0;
    function next() {
      if (idx >= ladder.length) return;
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.setAttribute('data-rm-font', name);
      l.href = 'https://fonts.googleapis.com/css2?family=' + fam + ladder[idx++] + '&display=swap';
      l.onerror = function () { l.remove(); next(); };
      document.head.appendChild(l);
    }
    next();
  }
  var STACK = {
    display: ', "Iowan Old Style", Georgia, serif',
    body: ', "Helvetica Neue", Arial, sans-serif',
    mono: ', ui-monospace, "SF Mono", Menlo, monospace'
  };
  function fam(name, role) { return '"' + String(name).replace(/"/g, '') + '"' + STACK[role]; }

  /* ---------- element overrides ---------- */
  function colorOf(v) {
    if (!v) return '';
    var m = /^aurora:([0-4])$/.exec(v);
    if (m) return 'var(--au' + m[1] + ')';
    if (v === 'text') return 'var(--text)';
    if (v === 'muted') return 'var(--muted)';
    if (v === 'accent') return 'var(--accent-text)';
    if (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\([\d\s.,%]+\)$/i.test(v)) return v;
    return '';
  }
  var baseFs = {};
  function elementCSS(els, withSize) {
    var out = [];
    Object.keys(els || {}).forEach(function (id) {
      var e = els[id], d = [];
      if (!e) return;
      var sel = '[data-edit="' + String(id).replace(/["\\]/g, '') + '"]';
      if (withSize && e.size && e.size !== 1 && baseFs[id]) d.push('font-size:' + (baseFs[id] * num(e.size, 1)).toFixed(2) + 'px');
      var col = colorOf(e.color); if (col) d.push('color:' + col);
      if (e.weight) d.push('font-weight:' + num(e.weight, 400));
      if (e.align) d.push('text-align:' + (/^(left|center|right)$/.test(e.align) ? e.align : 'left'));
      if (e.mt !== undefined && e.mt !== null && e.mt !== '') d.push('margin-top:' + num(e.mt, 0) + 'px');
      if (e.mb !== undefined && e.mb !== null && e.mb !== '') d.push('margin-bottom:' + num(e.mb, 0) + 'px');
      if (e.hidden) d.push('display:none');
      if (e.italic) d.push('font-style:italic');
      if (e.upper) d.push('text-transform:uppercase');
      if (d.length) out.push('html body ' + sel + '{' + d.map(function (x) { return x + ' !important'; }).join(';') + '}');
    });
    return out.join('\n');
  }

  /* ---------- copy ---------- */
  var origText = {};
  function leafLike(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && !(n.classList.contains('sr-only') || n.tagName === 'svg' || n.tagName === 'SVG')) return false;
    }
    return true;
  }
  function textNodeOf(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && /\S/.test(n.data)) return n;
    return null;
  }
  function getText(el) {
    var c = el.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.sr-only, svg'), function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function setText(el, text) {
    var tn = textNodeOf(el);
    if (!tn) { el.insertBefore(document.createTextNode(text), el.firstChild); return; }
    var m = /^(\s*)[\s\S]*?(\s*)$/.exec(tn.data);
    var next = m[1] + text + m[2];
    if (tn.data !== next) tn.data = next;
  }
  function applyCopy(copy) {
    [].forEach.call(document.querySelectorAll('[data-edit]'), function (el) {
      var id = el.getAttribute('data-edit');
      if (!leafLike(el)) return;
      var has = copy && Object.prototype.hasOwnProperty.call(copy, id);
      if (has) {
        if (!(id in origText)) origText[id] = getText(el);
        if (getText(el) !== String(copy[id]).replace(/\s+/g, ' ').trim()) setText(el, String(copy[id]));
      } else if (id in origText) {
        setText(el, origText[id]); delete origText[id];
      }
    });
  }

  /* ---------- sections ---------- */
  function sectionRules(cfg) {
    var order = (cfg.layout.order && cfg.layout.order[PAGE]) || [];
    var all = (window.RM_SECTIONS && window.RM_SECTIONS[PAGE] || []).map(function (s) { return s.key; });
    var seq = order.filter(function (k) { return all.indexOf(k) > -1; });
    all.forEach(function (k) { if (seq.indexOf(k) < 0) seq.push(k); });
    var hidden = (cfg.layout.hidden && cfg.layout.hidden[PAGE]) || [];
    var out = [];
    seq.forEach(function (k, i) { out.push('main > [data-section="' + k + '"]{order:' + (i + 1) + '}'); });
    hidden.forEach(function (k) { out.push('main > [data-section="' + k + '"]{display:none}'); });
    return { css: out.join('\n'), hidden: hidden };
  }
  function applySectionAttrs(hidden) {
    [].forEach.call(document.querySelectorAll('[data-section]'), function (s) {
      var h = hidden.indexOf(s.getAttribute('data-section')) > -1;
      if (h) s.setAttribute('hidden', ''); else s.removeAttribute('hidden');
    });
  }

  /* ---------- build ---------- */
  var styleVars, styleEl, current, lastCfgTheme = null;
  function ensureStyles() {
    if (!styleVars) { styleVars = document.createElement('style'); styleVars.id = 'rm-vars'; document.head.appendChild(styleVars); }
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'rm-el'; document.head.appendChild(styleEl); }
  }
  /* size override = real font-size: measure each element's base size with the size rule removed, then write base*N px */
  function writeElements(cfg) {
    var els = cfg.elements || {}, ids = Object.keys(els).filter(function (id) { return els[id] && els[id].size && els[id].size !== 1; });
    var plain = elementCSS(els, false);
    if (!ids.length || !ready) { if (styleEl.textContent !== plain) styleEl.textContent = plain; if (!ids.length) return; }
    if (ready) {
      if (styleEl.textContent !== plain) styleEl.textContent = plain;
      ids.forEach(function (id) {
        var el = document.querySelector('[data-edit="' + String(id).replace(/["\\]/g, '') + '"]');
        baseFs[id] = el ? parseFloat(getComputedStyle(el).fontSize) || 0 : 0;
      });
    }
    var full = elementCSS(els, true);
    if (styleEl.textContent !== full) styleEl.textContent = full;
  }
  var resT = 0;
  window.addEventListener('resize', function () { clearTimeout(resT); resT = setTimeout(function () { if (current) writeElements(current); }, 150); });
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', function () { clearTimeout(resT); resT = setTimeout(function () { if (current) writeElements(current); }, 150); });
  var SIZE_KEYS = ['hero', 'h2', 'h3', 'lead', 'body', 'small', 'mono', 'nav', 'kinetic', 'ticker'];
  function build(cfg) {
    var T = cfg.type, L = cfg.layout, M = cfg.motion, DT = D.type, DL = D.layout, DM = D.motion, g = [];
    ['display', 'body', 'mono'].forEach(function (r) { if (T[r] !== DT[r]) { g.push('--font-' + r + ':' + fam(T[r], r)); loadFont(T[r]); } });
    if (T.displayWeight !== DT.displayWeight) g.push('--fw-display:' + num(T.displayWeight, 400));
    if (T.bodyWeight !== DT.bodyWeight) g.push('--fw-body:' + num(T.bodyWeight, 400));
    SIZE_KEYS.forEach(function (k) { var v = num(T.size && T.size[k], 1); if (v !== 1) g.push('--s-' + k + ':' + v); });
    var lh = T.lineHeight || {};
    if (num(lh.display, 0) > 0) g.push('--lh-display:' + num(lh.display, 1));
    if (lh.body !== DT.lineHeight.body) g.push('--lh-body:' + num(lh.body, 1.65));
    var tr = T.tracking || {};
    ['display', 'body', 'mono'].forEach(function (k) { if (num(tr[k], 0) !== 0) g.push('--tr-' + k + ':' + num(tr[k], 0) + 'em'); });
    if (T.eyebrowCase === 'none') g.push('--eyebrow-case:none');
    if (L.maxWidth !== DL.maxWidth) g.push('--max:' + num(L.maxWidth, 1280) + 'px');
    if (L.pad !== DL.pad) g.push('--pad-k:' + num(L.pad, 1));
    if (L.sectionGap !== DL.sectionGap) g.push('--gap-k:' + num(L.sectionGap, 1));
    if (L.radius !== DL.radius) g.push('--radius:' + num(L.radius, 4) + 'px');
    if (L.heroHeight !== DL.heroHeight) g.push('--hero-vh:' + num(L.heroHeight, 100));
    if (L.heroTextWidth !== DL.heroTextWidth) g.push('--hero-tw:' + num(L.heroTextWidth, 36));
    if (M.revealDistance !== DM.revealDistance) g.push('--rv-dist:' + num(M.revealDistance, 18) + 'px');
    var drift = num(M.heroDrift, 1);
    if (drift !== 1 && drift > 0) g.push('--veil-dur:' + (44 / drift).toFixed(1) + 's');
    var sep = M.kinetic && M.kinetic.separator;
    if (sep && sep !== '\u25B2' && sep !== '\u25CF') g.push('--kin-glyph:"' + String(sep).replace(/["\\]/g, '') + '"');
    if (cfg.logo.size !== D.logo.size) g.push('--logo-k:' + num(cfg.logo.size, 1));
    if (+cfg.logo.rotate) g.push('--logo-rot:' + num(cfg.logo.rotate, 0) + 'deg');
    var mi = cfg.logo.mirror || 'none';
    if (mi === 'horizontal' || mi === 'both') g.push('--logo-sx:-1');
    if (mi === 'vertical' || mi === 'both') g.push('--logo-sy:-1');
    var sec = sectionRules(cfg);
    var css = 'html:root{' + g.join(';') + '}\n' + themeBlock('dark', cfg.colors.dark, (window.RM_BASELINE_COLORS || D.colors).dark) + '\n' + themeBlock('light', cfg.colors.light, (window.RM_BASELINE_COLORS || D.colors).light) + '\n' + sec.css;
    ensureStyles();
    if (styleVars.textContent !== css) styleVars.textContent = css;
    writeElements(cfg);

    var set = function (k, v) { if (root.getAttribute(k) !== String(v)) root.setAttribute(k, v); };
    set('data-nav', L.nav); set('data-nav-align', L.navAlign); set('data-sticky', L.sticky === false ? 'off' : 'on');
    set('data-work', L.work); set('data-hero-align', L.heroAlign); set('data-hero-v', L.heroV); set('data-launcher', L.launcher);
    set('data-reveal', M.reveal); set('data-transition', M.transition);
    set('data-logo', cfg.logo.mark); set('data-logo-name', cfg.logo.showName === false ? 'off' : 'on');
    set('data-logo-color', cfg.logo.color || 'text'); set('data-logo-anim', cfg.logo.anim || 'none');
    if (window.RMLogos) window.RMLogos.render(cfg.logo);
    set('data-motion', M.level); set('data-italic', T.displayItalicAccent === false ? 'off' : 'on');
    set('data-cursor', M.cursor);
    set('data-kinetic', M.kinetic && M.kinetic.on === false ? 'off' : 'on');
    set('data-ticker', M.kinetic && M.kinetic.ticker === false ? 'off' : 'on');
    set('data-kin-sep', sep === '\u25CF' ? 'dot' : (!sep || sep === '\u25B2') ? 'tri' : 'glyph');
    set('data-drift', drift <= 0 ? 'off' : 'on');
    return sec;
  }

  function changedKeys(a, b) {
    var out = [];
    ['theme', 'colors', 'type', 'layout', 'motion', 'logo', 'elements', 'copy'].forEach(function (k) { if (!a || !eq(a[k], b[k])) out.push(k); });
    return out;
  }

  var ready = document.readyState !== 'loading';
  function apply(next, silent, forceTheme) {
    var prev = current;
    current = next;
    var sec = build(next);
    if (ready) { applySectionAttrs(sec.hidden); applyCopy(next.copy); }
    var ch = changedKeys(prev, next);
    if (next.theme !== lastCfgTheme || forceTheme) {
      lastCfgTheme = next.theme;
      if ((prev || forceTheme) && window.RMTheme && (next.theme === 'dark' || next.theme === 'light') && window.RMTheme.get() !== next.theme) window.RMTheme.set(next.theme);
    }
    if (!silent && ch.length) {
      var ev = new CustomEvent('rm:config', { detail: { config: clone(next), changed: ch } });
      document.dispatchEvent(ev);
    }
  }

  /* ---------- delta ---------- */
  function delta(a, b) {
    if (isObj(a) && isObj(b)) {
      var out = {}, any = false;
      Object.keys(a).forEach(function (k) { var d = delta(a[k], b[k]); if (d !== undefined) { out[k] = d; any = true; } });
      Object.keys(b || {}).forEach(function (k) { if (!(k in a) && a !== undefined) { out[k] = clone(b[k]); any = true; } });
      return any ? out : undefined;
    }
    return eq(a, b) ? undefined : clone(a);
  }
  function b64urlDecode(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }
  function b64urlEncode(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

  /* ---------- boot ---------- */
  var boot = clone(D), explicitTheme = false;
  /* production: no ?config= URL overrides; the site always boots from RM_DEFAULTS (the saved v0 look) */
  apply(boot, true);
  lastCfgTheme = explicitTheme ? null : boot.theme;
  if (!explicitTheme) lastCfgTheme = boot.theme;

  window.RMConfig = {
    defaults: clone(D),
    get: function () { return clone(current); },
    /* set(delta|full): the argument is merged over RM_DEFAULTS and replaces the current config */
    set: function (cfg, opts) { apply(merge(clone(D), cfg || {}), false, !!(opts && opts.forceTheme)); },
    /* patch(partial): merged over the current config */
    patch: function (cfg) { apply(merge(clone(current), cfg || {})); },
    delta: function () { return delta(current, D) || {}; },
    encode: function (cfg) { var d = delta(cfg || current, D) || {}; return b64urlEncode(JSON.stringify(d)); },
    page: PAGE
  };

  function onReady() {
    ready = true;
    writeElements(current);
    var sec = sectionRules(current);
    applySectionAttrs(sec.hidden);
    applyCopy(current.copy);
    if (explicitTheme && window.RMTheme && current.theme !== window.RMTheme.get()) window.RMTheme.set(current.theme);
    document.dispatchEvent(new CustomEvent('rm:config', { detail: { config: clone(current), changed: ['boot'] } }));
  }
  if (ready) onReady(); else document.addEventListener('DOMContentLoaded', onReady);
})();
