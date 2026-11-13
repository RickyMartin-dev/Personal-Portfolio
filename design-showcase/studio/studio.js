/* Aurora Studio: live editor for aurora-final. Vanilla, no build. */
(() => {
'use strict';
const C = window.RMColor;
const $ = (s, r = document) => r.querySelector(s);
const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const jeq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const human = s => s.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').toLowerCase();

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
  return el;
}
function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? clone(base) : clone(over);
  const out = clone(base);
  for (const k in over) out[k] = isObj(over[k]) && isObj(out[k]) ? merge(out[k], over[k]) : clone(over[k]);
  return out;
}
function diff(cur, def) {
  if (isObj(cur) && isObj(def)) {
    const o = {};
    for (const k in cur) { const d = diff(cur[k], def[k]); if (d !== undefined) o[k] = d; }
    return Object.keys(o).length ? o : undefined;
  }
  if (isObj(cur) && def === undefined) return Object.keys(cur).length ? cur : undefined;
  return jeq(cur, def) ? undefined : cur;
}
const getPath = (o, p) => p.reduce((a, k) => a == null ? undefined : a[k], o);
function setPath(o, p, v) { let a = o; for (let i = 0; i < p.length - 1; i++) { if (!isObj(a[p[i]]) && !Array.isArray(a[p[i]])) a[p[i]] = {}; a = a[p[i]]; } a[p[p.length - 1]] = v; }
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
};
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* ---------------- defaults (fallback; replaced by the site's RM_DEFAULTS on first ready) ---------------- */
const FALLBACK = {
  v: 1, theme: 'dark',
  colors: {
    dark: { bg: '#12131f', surface: '#191b2a', surface2: '#222437', text: '#f4f4f9', muted: '#b8bdd3', faint: '#8f96b4', accent: '#ffb562', accentInk: '#1a1204', accentText: '#ffb562', aurora: ['#ffb562', '#ff96aa', '#5dc7ff', '#7896ff', '#9f7bff'], lineAlpha: 0.12, skyGlow: 1, lineGlow: 1 },
    light: { bg: '#f7f4fa', surface: '#ffffff', surface2: '#efeaf6', text: '#1f2434', muted: '#4d5369', faint: '#666c82', accent: '#ffb562', accentInk: '#1a1204', accentText: '#9a5200', aurora: ['#c4700c', '#d9627a', '#1d7fb8', '#4a64d0', '#6a46d9'], lineAlpha: 0.12, skyGlow: 1, lineGlow: 1 }
  },
  type: { display: 'Instrument Serif', body: 'Hanken Grotesk', mono: 'Geist Mono', displayWeight: 400, bodyWeight: 400, displayItalicAccent: true,
    size: { hero: 1, h2: 1, h3: 1, lead: 1, body: 1, small: 1, mono: 1, nav: 1, kinetic: 1, ticker: 1 },
    lineHeight: { display: 1.05, body: 1.6 }, tracking: { display: -0.02, body: 0, mono: 0 }, eyebrowCase: 'upper' },
  layout: { maxWidth: 1280, pad: 1, sectionGap: 1, radius: 14, heroAlign: 'left', heroV: 'center', heroHeight: 92, heroTextWidth: 28, nav: 'bar', navAlign: 'right', sticky: true, work: 'grid2',
    order: { index: ['work', 'kinetic', 'focus', 'contact'], about: [], games: [] }, hidden: { index: [], about: [], games: [] }, launcher: 'br' },
  motion: { level: 'full', heroDrawIn: true, heroDensity: 1, heroReveal: 1, heroDrift: 1, cursor: 'comet', cursorColor: 0, reveal: 'rise', revealDistance: 24,
    kinetic: { on: true, speed: 1, direction: 'left', pauseOnHover: true, separator: '▲', ticker: true }, transition: 'aurora-wipe' },
  logo: { mark: 'peak', size: 1, showName: true, color: 'text', anim: 'none', rotate: 0, mirror: 'none' },
  elements: {}, copy: {}
};
let defaults = clone(FALLBACK), gotDefaults = false;

/* ---------------- presets (defensive) ---------------- */
function presets() {
  const P = window.RM_PRESETS;
  if (P && P.palettes) return P;
  return {
    palettes: [
      { name: 'Aurora (default)', dark: FALLBACK.colors.dark, light: FALLBACK.colors.light },
      { name: 'Ember', dark: { aurora: ['#ffd27a', '#ff8a6a', '#ff6b9a', '#c46bff', '#7a5cff'] }, light: { aurora: ['#b36100', '#c8452f', '#c02a6a', '#8a2fc2', '#4b34c9'] } }
    ],
    fonts: { display: ['Instrument Serif', 'Fraunces', 'Playfair Display', 'DM Serif Display'], body: ['Hanken Grotesk', 'Inter', 'DM Sans', 'Manrope'], mono: ['Geist Mono', 'JetBrains Mono', 'IBM Plex Mono'] },
    pairings: [{ name: 'Editorial', display: 'Fraunces', body: 'Inter', mono: 'JetBrains Mono' }],
    typeScales: [{ name: 'Tight', size: { hero: 0.85, h2: 0.9 } }, { name: 'Roomy', size: { hero: 1.2, h2: 1.1, lead: 1.1 } }],
    looks: [], fontUrl: null
  };
}
const nameOf = x => typeof x === 'string' ? x : (x && (x.family || x.name || x.id)) || '';
function list(v) { return Array.isArray(v) ? v : (isObj(v) ? Object.entries(v).map(([k, x]) => ({ name: k, ...(isObj(x) ? x : {}) })) : []); }
const loadedFonts = new Set();
function ensureFont(family, italic) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const P = window.RM_PRESETS;
  let href;
  try { href = P && P.fontUrl ? P.fontUrl(family, [400, 600], !!italic) : null; } catch (e) { href = null; }
  if (!href) href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+') + '&display=swap';
  document.head.append(h('link', { rel: 'stylesheet', href }));
}

/* ---------------- state ---------------- */
const PAGES = [['index', 'Home'], ['about', 'About'], ['games', 'Games']];
const DEVICES = ['1440', '1280', '820', '390', 'fit'];
const SEED_NAMES = ['crest', 'rose', 'sky', 'indigo', 'depth'];
const saved = store.get('rm-studio-ui') || {};
const ui = Object.assign({ page: 'index', device: 'fit', view: 'dark', edit: 'dark', tab: 'Colours', insp: true, cmp: false, cmpId: 'defaults', cmpMode: 'side', flipB: false }, saved, { pick: false, editText: false, sel: null, cmp: false });
if (!PAGES.some(p => p[0] === ui.page)) ui.page = 'index';
const startDelta = store.get('rm-studio-current');
let cfg = merge(defaults, startDelta && isObj(startDelta) ? startDelta : {});
const hist = [], redo = [];
let lastKey = null, lastT = 0;
const locks = [false, false, false, false, false];
const secs = {}, edits = {};
let saves = store.get('rm-studio-saves'); if (!Array.isArray(saves)) saves = [];
const reg = [];           // static control refreshers
const dyn = {};           // dynamic renderers

const viewTheme = () => ui.view === 'split' ? 'dark' : ui.view;
const targets = () => ui.edit === 'both' ? ['dark', 'light'] : [ui.edit];
const delta = c => diff(c || cfg, defaults) || {};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); }

/* ---------------- history + change ---------------- */
function pushHist() { hist.push(JSON.stringify(cfg)); if (hist.length > 300) hist.shift(); redo.length = 0; }
function change(fn, key) {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastT < 700)) pushHist();
  lastKey = key || null; lastT = now;
  fn(cfg); after();
}
function undo() { if (!hist.length) return; redo.push(JSON.stringify(cfg)); cfg = JSON.parse(hist.pop()); lastKey = null; after(); }
function redoFn() { if (!redo.length) return; hist.push(JSON.stringify(cfg)); cfg = JSON.parse(redo.pop()); lastKey = null; after(); }
function setWhole(next, label) { pushHist(); lastKey = null; cfg = next; after(); if (label) toast(label); }
function after(opts) { postSoon(); autosaveSoon(); refreshAll(); if (!opts) updateBar(); }

/* ---------------- frames ---------------- */
const stage = $('#stage');
let frames = [], frameSig = '';
const pageUrl = (p, th) => '../aurora-final/' + p + '.html?studio=1&theme=' + (th || viewTheme());
function desired() {
  if (ui.cmp) return [{ key: 'A', label: 'A  working look' }, { key: 'B', label: 'B  ' + cmpName() }];
  if (ui.view === 'split') return [{ key: 'dark', label: 'Dark' }, { key: 'light', label: 'Light' }];
  return [{ key: 'main', label: cap(ui.view) }];
}
function cmpName() { if (ui.cmpId === 'defaults') return 'Defaults'; const s = saves.find(x => x.id === ui.cmpId); return s ? s.name : 'Defaults'; }
function cmpDelta() { const s = saves.find(x => x.id === ui.cmpId); return s ? s.delta : {}; }
function frameCfg(f) {
  let c = f.key === 'B' ? merge(defaults, cmpDelta()) : clone(cfg);
  c.theme = (f.key === 'dark' || f.key === 'light') ? f.key : viewTheme();
  return c;
}
function buildFrames() {
  const want = desired(), sig = want.map(w => w.key).join('|');
  if (sig !== frameSig) {
    frames.forEach(f => f.wrap.remove()); frames = [];
    want.forEach(w => {
      const el = h('iframe', { title: 'Site preview ' + w.label, src: pageUrl(ui.page, (w.key === 'dark' || w.key === 'light') ? w.key : viewTheme()), loading: 'eager' });
      const tag = h('div', { class: 'tag' });
      const box = h('div', { class: 'shell-box' }, el);
      const wrap = h('div', { class: 'frame' }, tag, box);
      const f = { key: w.key, el, tag, box, wrap, ready: false };
      el.addEventListener('load', () => { setTimeout(() => { adoptDefaults(el.contentWindow); postFrame(f); }, 80); });
      stage.append(wrap); frames.push(f);
    });
    frameSig = sig;
  }
  want.forEach((w, i) => { frames[i].tag.innerHTML = ''; frames[i].tag.append(h('b', { text: w.label })); });
  layout(); postSoon();
}
function layout() {
  const r = stage.getBoundingClientRect(); if (!r.width) return;
  const flip = ui.cmp && ui.cmpMode === 'flip';
  const vis = frames.filter(f => !(flip && ((f.key === 'A') === ui.flipB)));
  const n = flip ? 1 : frames.length, pad = 16, top = 30, gap = 18;
  const colW = (r.width - pad * 2 - gap * (n - 1)) / n, availH = r.height - top - pad;
  let slot = 0;
  frames.forEach(f => {
    const hidden = !vis.includes(f);
    const i = flip ? 0 : slot++;
    const dw = ui.device === 'fit' ? colW : +ui.device, s = Math.min(1, colW / dw);
    f.wrap.style.visibility = hidden ? 'hidden' : 'visible';
    f.wrap.style.left = (pad + i * (colW + gap) + (colW - dw * s) / 2) + 'px';
    f.wrap.style.top = top + 'px';
    f.box.style.width = dw * s + 'px'; f.box.style.height = availH + 'px';
    f.el.style.width = dw + 'px'; f.el.style.height = (availH / s) + 'px'; f.el.style.transform = 'scale(' + s + ')';
  });
}
new ResizeObserver(() => { layout(); $('#narrow').hidden = innerWidth >= 1280; document.body.classList.toggle('has-note', innerWidth < 1280); }).observe(stage);
addEventListener('resize', () => { $('#narrow').hidden = innerWidth >= 1280; document.body.classList.toggle('has-note', innerWidth < 1280); layout(); });

function send(f, msg) { try { f.el.contentWindow && f.el.contentWindow.postMessage(Object.assign({ type: 'rm-studio' }, msg), location.origin); } catch (e) { /* not ready */ } }
function postFrame(f) { send(f, { action: 'apply', config: frameCfg(f) }); }
let postT = 0, postPending = false, lastPost = 0;
function postSoon() {
  if (postPending) return; postPending = true;
  const wait = Math.max(0, 33 - (performance.now() - lastPost));
  postT = setTimeout(() => { postPending = false; lastPost = performance.now(); frames.forEach(postFrame); }, wait);
}
let autoT = 0;
function autosaveSoon() { clearTimeout(autoT); autoT = setTimeout(() => store.set('rm-studio-current', delta()), 250); }
function saveUi() { store.set('rm-studio-ui', { page: ui.page, device: ui.device, view: ui.view, edit: ui.edit, tab: ui.tab, insp: ui.insp, cmpId: ui.cmpId, cmpMode: ui.cmpMode }); }
function adoptDefaults(w) {
  if (gotDefaults || !w) return;
  let d; try { d = (w.RMConfig && w.RMConfig.defaults) || w.RM_DEFAULTS; } catch (e) { return; }
  if (!isObj(d)) return;
  gotDefaults = true;
  const cd = delta(); defaults = clone(d); cfg = merge(defaults, cd);
  Object.keys(defaults.layout.order || {}).forEach(p => { if (!secs[p]) secs[p] = null; });
  rebuildPanels(); refreshAll();
}
addEventListener('message', e => {
  if (e.origin !== location.origin) return;
  const f = frames.find(x => x.el.contentWindow === e.source); const d = e.data;
  if (!f || !d || d.type !== 'rm-site') return;
  if (d.action === 'ready') {
    f.ready = true; adoptDefaults(e.source);
    if (d.page && PAGES.some(p => p[0] === d.page)) {
      if (d.page !== ui.page) { ui.page = d.page; frames.forEach(o => { if (o !== f) o.el.src = pageUrl(d.page, (o.key === 'dark' || o.key === 'light') ? o.key : viewTheme()); }); updateBar(); }
      if (Array.isArray(d.sections)) secs[d.page] = d.sections;
      if (Array.isArray(d.edits)) edits[d.page] = d.edits;
    }
    postFrame(f);
    if (ui.pick) send(f, { action: 'pick', on: true });
    if (ui.editText) send(f, { action: 'edit-text', on: true });
    dyn.sections && dyn.sections(); dyn.elements && dyn.elements();
  } else if (d.action === 'picked') {
    ui.sel = d.id; ui.picked = d;
    ui.pick = false; frames.forEach(o => send(o, { action: 'pick', on: false })); updateBar();
    setTab('Elements'); dyn.elements(); refreshAll();
  } else if (d.action === 'copy') {
    change(c => { c.copy = c.copy || {}; if (d.text === '' || d.text == null) delete c.copy[d.id]; else c.copy[d.id] = d.text; }, 'copy' + d.id);
  }
});

/* ---------------- control builders ---------------- */
function rowEl(label, kw, ...kids) { return h('div', { class: 'row', 'data-k': (label + ' ' + (kw || '')).toLowerCase() }, ...kids); }
function fmtN(v, step) { const dec = (String(step).split('.')[1] || '').length; return (+v).toFixed(dec); }

function Ctl(spec) {
  const themed = !!spec.themed;
  const paths = () => {
    const p = typeof spec.path === 'function' ? spec.path() : spec.path;
    if (!p) return [];
    return themed ? targets().map(t => ['colors', t, ...p]) : [p];
  };
  const isEl = !!spec.el;
  const get = () => { const p = paths()[0]; if (!p) return undefined; const v = getPath(cfg, p); return v === undefined && spec.el ? spec.neutral : v; };
  const def = () => { const p = paths()[0]; return p ? getPath(defaults, p) : undefined; };
  const set = v => {
    const ps = paths(); if (!ps.length) return;
    if (isEl) {
      const id = ui.sel, prop = spec.path()[2];
      change(c => { c.elements = c.elements || {}; const o = c.elements[id] = c.elements[id] || {}; if (v === undefined || v === spec.neutral) delete o[prop]; else o[prop] = v; if (!Object.keys(o).length) delete c.elements[id]; }, 'el' + id + prop);
    } else change(c => ps.forEach(p => setPath(c, p, v)), spec.label + (themed ? ui.edit : ''));
  };
  const isMod = () => { if (isEl) { const p = paths()[0]; return p ? getPath(cfg, p) !== undefined : false; } const p = paths()[0]; return p ? !jeq(getPath(cfg, p), getPath(defaults, p)) : false; };
  const row = rowEl(spec.label, (spec.kw || '') + ' ' + (spec.themed ? 'colour color' : ''));
  const id = 'c' + Math.random().toString(36).slice(2, 8);
  const lab = h('label', { for: id, text: spec.label, title: 'Click to reset when modified' });
  lab.addEventListener('click', e => { if (row.classList.contains('mod')) { e.preventDefault(); if (isEl) set(undefined); else set(clone(def())); } });
  const ctl = h('div', { class: 'ctl' });
  row.append(lab, ctl);
  let refresh;
  if (spec.kind === 'range') {
    const inp = h('input', { type: 'range', id, min: spec.min, max: spec.max, step: spec.step });
    const num = h('input', { class: 'num', type: 'text', inputmode: 'decimal', 'aria-label': spec.label + ' value' });
    inp.addEventListener('input', () => set(+inp.value));
    num.addEventListener('change', () => { const v = parseFloat(num.value); if (!isNaN(v)) set(Math.min(spec.max * 3, Math.max(spec.min - Math.abs(spec.min) * 2, v))); });
    ctl.append(inp, num);
    refresh = () => { const v = get(); if (v == null) return; inp.value = v; if (document.activeElement !== num) num.value = fmtN(v, spec.step) + (spec.unit || ''); };
  } else if (spec.kind === 'seg' || spec.kind === 'tiles') {
    const box = h('div', { class: 'sw', role: 'group', 'aria-label': spec.label });
    const btns = spec.opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, String(o)]; const b = h('button', { type: 'button', text: l, 'aria-pressed': 'false' }); b.addEventListener('click', () => { if (isEl && get() === v) set(undefined); else set(v); }); b._v = v; return b; });
    box.append(...btns); ctl.append(box);
    refresh = () => { const v = get(); btns.forEach(b => b.setAttribute('aria-pressed', String(isEl && v === spec.neutral && !isMod() ? false : b._v === v))); };
  } else if (spec.kind === 'toggle') {
    const t = h('button', { type: 'button', class: 'tog', role: 'switch', id, 'aria-checked': 'false', 'aria-label': spec.label });
    t.addEventListener('click', () => { const nv = t.getAttribute('aria-checked') !== 'true'; set(isEl && !nv ? undefined : nv); });
    ctl.append(t);
    refresh = () => t.setAttribute('aria-checked', String(!!get()));
  } else if (spec.kind === 'select') {
    const s = h('select', { id, 'aria-label': spec.label }, spec.opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, String(o)]; return h('option', { value: v, text: l }); }));
    s.addEventListener('change', () => set(isNaN(+s.value) || spec.str ? s.value : +s.value));
    ctl.append(s); refresh = () => { s.value = String(get()); };
  } else if (spec.kind === 'color') {
    const pick = h('input', { type: 'color', id, 'aria-label': spec.label + ' picker' });
    const hex = h('input', { class: 'hex', type: 'text', spellcheck: 'false', 'aria-label': spec.label + ' hex' });
    pick.addEventListener('input', () => set(pick.value));
    hex.addEventListener('change', () => { const n = C.normHex(hex.value); if (n) set(n); else refresh(); });
    ctl.append(pick, hex);
    refresh = () => { const v = get(); if (v == null) return; const n = C.normHex(v); if (n) pick.value = n; if (document.activeElement !== hex) hex.value = v; };
  }
  const full = () => { refresh && refresh(); row.classList.toggle('mod', isMod()); };
  reg.push({ refresh: full, row });
  return row;
}

let curPanel = null, curGroup = null;
function panel(name) { const p = h('section', { class: 'panel', role: 'tabpanel', 'data-tab': name, 'aria-label': name }, h('h2', { class: 'ph', text: name })); p._tab = name; return p; }
function grp(p, title, open = true) {
  const body = h('div', { class: 'body' });
  const d = h('details', { class: 'grp' }, h('summary', { text: title }), body); if (open) d.open = true; d._title = title;
  p.append(d); return body;
}
const add = (body, ...rows) => body.append(...rows);
const seg = (label, path, opts, extra) => Ctl(Object.assign({ label, path, kind: 'seg', opts }, extra));
const range = (label, path, min, max, step, extra) => Ctl(Object.assign({ label, path, kind: 'range', min, max, step }, extra));
const tog = (label, path, extra) => Ctl(Object.assign({ label, path, kind: 'toggle' }, extra));

function btn(text, fn, extra) { const b = h('button', Object.assign({ type: 'button', class: 'btn sm', text }, extra || {})); b.addEventListener('click', fn); return b; }
function fullRow(label, kw, ...kids) { return h('div', { class: 'row full', 'data-k': (label + ' ' + (kw || '')).toLowerCase() }, ...kids); }

/* ---------------- Colours ---------------- */
function seedsOf(t) { return cfg.colors[t].aurora; }
function applySeeds(fn, label) {
  change(c => targets().forEach(t => { const cur = c.colors[t].aurora.slice(); const nx = fn(cur, t); c.colors[t].aurora = nx.map((v, i) => locks[i] ? cur[i] : v); }), label || 'gen' + Math.random());
}
function moveSeed(from, to) {
  if (from === to || to < 0 || to > 4) return;
  const mv = a => { const x = a.splice(from, 1)[0]; a.splice(to, 0, x); return a; };
  mv(locks);
  change(c => targets().forEach(t => mv(c.colors[t].aurora)), 'move' + Math.random());
}
function buildColours() {
  const p = panel('Colours');
  let b = grp(p, 'Editing');
  const editSeg = h('div', { class: 'sw', role: 'group', 'aria-label': 'Editing theme' });
  const eb = ['dark', 'light', 'both'].map(t => { const x = h('button', { type: 'button', text: cap(t), 'aria-pressed': 'false' }); x.addEventListener('click', () => { ui.edit = t; if (t !== 'both' && ui.view !== 'split' && !ui.cmp) ui.view = t; if (t !== 'both') { cfg.theme = t; } saveUi(); updateBar(); buildFrames(); refreshAll(); }); x._t = t; return x; });
  editSeg.append(...eb);
  reg.push({ refresh: () => eb.forEach(x => x.setAttribute('aria-pressed', String(x._t === ui.edit))) });
  add(b, fullRow('Editing dark light both', '', editSeg), h('div', { class: 'note', text: 'Colour edits apply to the selected theme. "Both" writes the same value to dark and light.' }));

  b = grp(p, 'Aurora seeds');
  const seeds = h('div', { class: 'seeds' });
  const slots = [0, 1, 2, 3, 4].map(i => {
    const chip = h('div', { class: 'chip', draggable: 'true', title: 'Drag to reorder' });
    const pick = h('input', { type: 'color', 'aria-label': 'Seed ' + SEED_NAMES[i] + ' picker' });
    chip.append(pick);
    const hex = h('input', { class: 'hex', type: 'text', spellcheck: 'false', 'aria-label': 'Seed ' + SEED_NAMES[i] + ' hex' });
    const lockB = h('button', { type: 'button', text: 'lock', 'aria-pressed': 'false', 'aria-label': 'Lock seed ' + SEED_NAMES[i], title: 'Locked seeds survive shuffle and generators' });
    const lft = h('button', { type: 'button', text: '◀', 'aria-label': 'Move ' + SEED_NAMES[i] + ' left' });
    const rgt = h('button', { type: 'button', text: '▶', 'aria-label': 'Move ' + SEED_NAMES[i] + ' right' });
    const el = h('div', { class: 'seed' }, chip, h('div', { class: 'nm', text: SEED_NAMES[i] }), hex, h('div', { class: 'mv' }, lft, lockB, rgt));
    const setSeed = v => change(c => targets().forEach(t => { c.colors[t].aurora[i] = v; }), 'seed' + i + ui.edit);
    pick.addEventListener('input', () => setSeed(pick.value));
    hex.addEventListener('change', () => { const n = C.normHex(hex.value); if (n) setSeed(n); else refreshAll(); });
    lockB.addEventListener('click', () => { locks[i] = !locks[i]; refreshAll(); });
    lft.addEventListener('click', () => moveSeed(i, i - 1)); rgt.addEventListener('click', () => moveSeed(i, i + 1));
    chip.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drop'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('drop'); const f = +e.dataTransfer.getData('text/plain'); if (!isNaN(f)) moveSeed(f, i); });
    seeds.append(el);
    return { chip, pick, hex, lockB };
  });
  reg.push({ refresh: () => { const s = seedsOf(targets()[0]); slots.forEach((o, i) => { const n = C.normHex(s[i]); o.chip.style.background = s[i]; if (n) o.pick.value = n; if (document.activeElement !== o.hex) o.hex.value = s[i]; o.lockB.setAttribute('aria-pressed', String(locks[i])); o.lockB.textContent = locks[i] ? 'locked' : 'lock'; }); } });
  add(b, fullRow('aurora seeds crest rose sky indigo depth swatches', 'five scene colours', seeds));

  b = grp(p, 'Base colours');
  [['bg', 'Background'], ['surface', 'Surface'], ['surface2', 'Surface 2'], ['text', 'Text'], ['muted', 'Muted'], ['faint', 'Faint'], ['accent', 'Accent'], ['accentInk', 'Accent ink'], ['accentText', 'Accent text']]
    .forEach(([k, l]) => add(b, Ctl({ label: l, kw: k, themed: true, path: [k], kind: 'color' })));
  add(b, Ctl({ label: 'Line alpha', kw: 'border strength lineAlpha', themed: true, path: ['lineAlpha'], kind: 'range', min: 0.06, max: 0.3, step: 0.005 }),
    Ctl({ label: 'Sky glow', kw: 'skyGlow', themed: true, path: ['skyGlow'], kind: 'range', min: 0, max: 1.5, step: 0.01 }),
    Ctl({ label: 'Line glow', kw: 'lineGlow', themed: true, path: ['lineGlow'], kind: 'range', min: 0, max: 1.5, step: 0.01 }));

  b = grp(p, 'Contrast');
  const badges = h('div', { class: 'badges' });
  reg.push({ refresh: () => {
    badges.innerHTML = '';
    targets().forEach(t => { const c = cfg.colors[t];
      [['text', 'bg', c.text, c.bg], ['muted', 'bg', c.muted, c.bg], ['accentText', 'bg', c.accentText, c.bg], ['accentInk', 'accent', c.accentInk, c.accent]].forEach(([a, bb, x, y]) => {
        const r = C.contrast(x, y); const ok = r == null ? null : r >= 4.5;
        badges.append(h('div', { class: 'badge ' + (ok === false ? 'warn' : 'ok'), title: ok === false ? 'Below WCAG AA 4.5:1' : 'Passes AA' }, h('span', { text: (ui.edit === 'both' ? t[0].toUpperCase() + ' ' : '') + a + ' / ' + bb }), h('b', { text: r == null ? 'n/a' : r.toFixed(1) + (ok ? '' : ' !') })));
      }); }); } });
  add(b, fullRow('contrast wcag badges', 'accessibility', badges));

  b = grp(p, 'Generators');
  let baseIdx = 0, mode = 'analogous';
  const baseSel = h('select', { 'aria-label': 'Harmony base seed' }, SEED_NAMES.map((n, i) => h('option', { value: i, text: n })));
  baseSel.addEventListener('change', () => baseIdx = +baseSel.value);
  const modeSel = h('select', { 'aria-label': 'Harmony mode' }, C.modes.map(m => h('option', { value: m, text: cap(m) })));
  modeSel.addEventListener('change', () => mode = modeSel.value);
  add(b, fullRow('harmony', 'analogous triadic complementary split monochrome generator', h('div', { class: 'btnrow' }, h('span', { class: 'lab', text: 'Harmony from' }), baseSel, modeSel, btn('Apply', () => applySeeds(s => C.harmony(s, baseIdx, mode))))),
    fullRow('shuffle randomise', 'random seeds', h('div', { class: 'btnrow' }, btn('Shuffle seeds', () => applySeeds(s => C.shuffle(s, locks))), btn('Randomise unlocked', () => applySeeds((s, t) => C.randomise(s, locks, t === 'dark'))))),
    fullRow('derive light dark', 'convert', h('div', { class: 'btnrow' }, btn('Light from dark', () => change(c => { c.colors.light.aurora = C.derive(c.colors.dark.aurora, true).map((v, i) => locks[i] ? c.colors.light.aurora[i] : v); }, 'derive')), btn('Dark from light', () => change(c => { c.colors.dark.aurora = C.derive(c.colors.light.aurora, false).map((v, i) => locks[i] ? c.colors.dark.aurora[i] : v); }, 'derive')))),
    fullRow('nudge hue saturation lightness', 'hsl all seeds', h('div', { class: 'btnrow' },
      btn('Hue −15', () => applySeeds(s => C.nudge(s, -15, 0, 0))), btn('Hue +15', () => applySeeds(s => C.nudge(s, 15, 0, 0))),
      btn('Sat −10', () => applySeeds(s => C.nudge(s, 0, -10, 0))), btn('Sat +10', () => applySeeds(s => C.nudge(s, 0, 10, 0))),
      btn('Light −5', () => applySeeds(s => C.nudge(s, 0, 0, -5))), btn('Light +5', () => applySeeds(s => C.nudge(s, 0, 0, 5))))));

  b = grp(p, 'Palette presets', true);
  const pals = list(presets().palettes);
  const gal = h('div', { class: 'gal' });
  const applyPal = (pal, which) => change(c => { (which === 'both' ? ['dark', 'light'] : [which]).forEach(t => { const src = (pal.colors && pal.colors[t]) || pal[t]; if (src) c.colors[t] = merge(c.colors[t], src); }); }, 'pal' + Math.random());
  pals.forEach(pal => {
    const src = t => (pal.colors && pal.colors[t]) || pal[t] || {};
    const chips = t => h('div', { class: 'chips' }, (src(t).aurora || []).map(x => h('i', { style: 'background:' + x })));
    gal.append(h('div', { class: 'card', 'data-name': (pal.name || pal.id || '').toLowerCase() }, h('div', { class: 'nm', text: pal.name || pal.id || 'Palette', title: pal.name || '' }), chips('dark'), chips('light'),
      h('div', { class: 'act' }, ...[['Dark', 'dark'], ['Light', 'light'], ['Both', 'both']].map(([l, w]) => { const x = h('button', { type: 'button', text: l, title: 'Apply to ' + w, 'aria-label': 'Apply ' + (pal.name || 'palette') + ' to ' + w }); x.addEventListener('click', () => applyPal(pal, w)); return x; }))));
  });
  add(b, fullRow('palette presets gallery', pals.map(x => x.name).join(' '), gal));
  return p;
}

/* ---------------- Type ---------------- */
function fontPicker(role) {
  const names = list((presets().fonts || {})[role]).map(nameOf).filter(Boolean);
  const wrap = h('div', { class: 'fontpick' });
  const cur = h('button', { type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' });
  const lst = h('div', { class: 'fontlist', role: 'listbox', 'aria-label': cap(role) + ' fonts' });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { ensureFont(e.target._f); io.unobserve(e.target); } }), { root: lst });
  const set = f => { change(c => { c.type[role] = f; }, 'font' + role); };
  const items = names.map(n => { const b = h('button', { type: 'button', role: 'option', style: 'font-family:"' + n + '",system-ui', 'aria-selected': 'false' }, h('span', { text: n }), h('small', { text: 'Aa Rg 123' })); b._f = n; b.addEventListener('click', () => { set(n); }); b.addEventListener('mouseenter', () => ensureFont(n)); lst.append(b); return b; });
  cur.addEventListener('click', () => { const o = wrap.classList.toggle('open'); cur.setAttribute('aria-expanded', String(o)); if (o) items.forEach(i => io.observe(i)); });
  wrap.append(cur, lst);
  reg.push({ refresh: () => { const v = cfg.type[role]; ensureFont(v); cur.style.fontFamily = '"' + v + '",system-ui'; cur.innerHTML = ''; cur.append(h('span', { text: v }), h('small', { text: cap(role) })); items.forEach(i => i.setAttribute('aria-selected', String(i._f === v))); }, row: wrap });
  const row = fullRow(cap(role) + ' font', 'family typeface ' + role, h('div', { class: 'lab', text: cap(role) + ' font', style: 'margin-bottom:3px' }), wrap);
  reg.push({ refresh: () => row.classList.toggle('mod', cfg.type[role] !== defaults.type[role]) });
  return row;
}
function buildType() {
  const p = panel('Type');
  let b = grp(p, 'Fonts');
  add(b, fontPicker('display'), fontPicker('body'), fontPicker('mono'));
  const P = presets();
  b = grp(p, 'Pairings');
  const pg = h('div', { class: 'gal' });
  list(P.pairings).forEach(pr => {
    const card = h('button', { type: 'button', class: 'card clickable', title: 'Apply pairing' }, h('div', { class: 'nm', text: pr.name || pr.id || 'Pairing' }), h('div', { class: 'sub', text: [pr.display, pr.body, pr.mono].filter(Boolean).join(' / ') }));
    card.addEventListener('click', () => change(c => { ['display', 'body', 'mono'].forEach(k => { if (pr[k]) c.type[k] = nameOf(pr[k]); }); if (pr.displayWeight) c.type.displayWeight = pr.displayWeight; if (pr.bodyWeight) c.type.bodyWeight = pr.bodyWeight; }, 'pair' + Math.random()));
    card.addEventListener('mouseenter', () => { [pr.display, pr.body, pr.mono].forEach(x => x && ensureFont(nameOf(x))); });
    pg.append(card);
  });
  add(b, fullRow('pairings presets', list(P.pairings).map(x => x.name).join(' '), pg));
  b = grp(p, 'Type scales');
  const sg = h('div', { class: 'gal' });
  list(P.typeScales).forEach(sc => {
    const card = h('button', { type: 'button', class: 'card clickable', title: 'Apply scale' }, h('div', { class: 'nm', text: sc.name || sc.id || 'Scale' }), h('div', { class: 'sub', text: sc.note || sc.description || '' }));
    card.addEventListener('click', () => change(c => { const src = sc.type || sc; if (src.size) Object.assign(c.type.size, src.size); if (src.lineHeight) Object.assign(c.type.lineHeight, src.lineHeight); if (src.tracking) Object.assign(c.type.tracking, src.tracking); }, 'scale' + Math.random()));
    sg.append(card);
  });
  add(b, fullRow('type scales presets', list(P.typeScales).map(x => x.name).join(' '), sg));
  b = grp(p, 'Sizes');
  ['hero', 'h2', 'h3', 'lead', 'body', 'small', 'mono', 'nav', 'kinetic', 'ticker'].forEach(k => add(b, range(cap(k) + ' size', ['type', 'size', k], 0.6, 1.8, 0.01, { kw: 'text size scale multiplier ' + k, unit: '×' })));
  b = grp(p, 'Weight, spacing, case');
  const W = [[300, '300'], [400, '400'], [500, '500'], [600, '600'], [700, '700']];
  add(b, seg('Display weight', ['type', 'displayWeight'], W), seg('Body weight', ['type', 'bodyWeight'], W), tog('Italic accent', ['type', 'displayItalicAccent'], { kw: 'display italic accent words' }),
    range('Display leading', ['type', 'lineHeight', 'display'], 0.85, 1.4, 0.01, { kw: 'line height' }), range('Body leading', ['type', 'lineHeight', 'body'], 1.2, 2, 0.01, { kw: 'line height' }),
    range('Display tracking', ['type', 'tracking', 'display'], -0.06, 0.06, 0.002, { kw: 'letter spacing', unit: 'em' }), range('Body tracking', ['type', 'tracking', 'body'], -0.04, 0.06, 0.002, { kw: 'letter spacing', unit: 'em' }),
    range('Mono tracking', ['type', 'tracking', 'mono'], -0.04, 0.2, 0.002, { kw: 'letter spacing', unit: 'em' }),
    seg('Eyebrow case', ['type', 'eyebrowCase'], [['upper', 'UPPER'], ['none', 'As typed']], { kw: 'uppercase labels' }));
  return p;
}

/* ---------------- Layout ---------------- */
function buildLayout() {
  const p = panel('Layout');
  let b = grp(p, 'Page');
  add(b, range('Max width', ['layout', 'maxWidth'], 960, 1680, 10, { unit: 'px', kw: 'container' }), range('Padding', ['layout', 'pad'], 0.5, 1.8, 0.05, { unit: '×', kw: 'gutter' }), range('Section gap', ['layout', 'sectionGap'], 0.4, 2, 0.05, { unit: '×', kw: 'spacing' }), range('Radius', ['layout', 'radius'], 0, 28, 1, { unit: 'px', kw: 'corners' }));
  b = grp(p, 'Hero');
  add(b, seg('Align', ['layout', 'heroAlign'], ['left', 'center', 'right'], { kw: 'hero' }), seg('Vertical', ['layout', 'heroV'], ['top', 'center', 'bottom'], { kw: 'hero' }), range('Height', ['layout', 'heroHeight'], 60, 110, 1, { unit: 'vh', kw: 'hero' }), range('Text width', ['layout', 'heroTextWidth'], 14, 40, 1, { unit: 'ch', kw: 'hero measure' }));
  b = grp(p, 'Navigation');
  add(b, seg('Style', ['layout', 'nav'], ['bar', 'floating', 'minimal'], { kw: 'nav header' }), seg('Align', ['layout', 'navAlign'], ['right', 'center'], { kw: 'nav' }), tog('Sticky', ['layout', 'sticky'], { kw: 'nav header' }));
  b = grp(p, 'Work and launcher');
  add(b, seg('Work layout', ['layout', 'work'], [['grid2', '2 col'], ['grid3', '3 col'], ['list', 'List'], ['feature', 'Feature']], { kw: 'projects grid' }), seg('Chat launcher', ['layout', 'launcher'], [['br', 'Bottom right'], ['bl', 'Bottom left'], ['hidden', 'Hidden']], { kw: 'chat' }));
  return p;
}

/* ---------------- Sections ---------------- */
function buildSections() {
  const p = panel('Sections');
  const host = h('div');
  const body = grp(p, 'Order and visibility');
  add(body, fullRow('sections order visibility reorder', 'drag eye hide show scroll', h('div', { class: 'note', text: 'Drag to reorder, eye to hide, click a name to scroll the preview there.' }), host));
  dyn.sections = () => {
    host.innerHTML = '';
    PAGES.forEach(([pg, pl]) => {
      const defOrder = (defaults.layout.order && defaults.layout.order[pg]) || [];
      const meta = secs[pg] || [];
      const keyOf = s => typeof s === 'string' ? s : (s.key || s.id);
      const labelOf = k => { const m = meta.find(s => keyOf(s) === k); return m && typeof m !== 'string' ? (m.label || k) : cap(human(k)); };
      let order = (cfg.layout.order && cfg.layout.order[pg] && cfg.layout.order[pg].length) ? cfg.layout.order[pg].slice() : defOrder.slice();
      meta.map(keyOf).forEach(k => { if (!order.includes(k)) order.push(k); });
      const hidden = (cfg.layout.hidden && cfg.layout.hidden[pg]) || [];
      const setOrder = o => change(c => { c.layout.order = c.layout.order || {}; c.layout.order[pg] = o; }, 'order' + pg + Math.random());
      const ul = h('div', { class: 'list', role: 'list', 'aria-label': pl + ' sections' });
      order.forEach((k, i) => {
        const it = h('div', { class: 'item' + (hidden.includes(k) ? ' hid' : ''), draggable: 'true', role: 'listitem' });
        const nm = h('button', { type: 'button', class: 'nm', text: labelOf(k), title: pg === ui.page ? 'Scroll preview to this section' : 'Open this page to scroll' });
        nm.addEventListener('click', () => { if (pg !== ui.page) { setPage(pg); return; } frames.forEach(f => send(f, { action: 'scrollTo', id: k, section: k })); });
        const eye = h('button', { type: 'button', class: 'i', text: hidden.includes(k) ? 'show' : 'hide', 'aria-label': (hidden.includes(k) ? 'Show ' : 'Hide ') + labelOf(k), 'aria-pressed': String(hidden.includes(k)) });
        eye.addEventListener('click', () => change(c => { c.layout.hidden = c.layout.hidden || {}; const a = new Set(c.layout.hidden[pg] || []); a.has(k) ? a.delete(k) : a.add(k); c.layout.hidden[pg] = [...a]; }, 'hide' + k));
        const up = h('button', { type: 'button', class: 'i', text: '↑', 'aria-label': 'Move ' + labelOf(k) + ' up' }); const dn = h('button', { type: 'button', class: 'i', text: '↓', 'aria-label': 'Move ' + labelOf(k) + ' down' });
        const mv = d => { const o = order.slice(); const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; setOrder(o); };
        up.addEventListener('click', () => mv(-1)); dn.addEventListener('click', () => mv(1));
        it.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', pg + ':' + i); it.classList.add('dragging'); });
        it.addEventListener('dragend', () => it.classList.remove('dragging'));
        it.addEventListener('dragover', e => { e.preventDefault(); it.classList.add('over'); });
        it.addEventListener('dragleave', () => it.classList.remove('over'));
        it.addEventListener('drop', e => { e.preventDefault(); const [pp, f] = e.dataTransfer.getData('text/plain').split(':'); if (pp !== pg) return; const o = order.slice(); const x = o.splice(+f, 1)[0]; o.splice(i, 0, x); setOrder(o); });
        it.append(h('span', { class: 'grab', text: '⠇', 'aria-hidden': 'true' }), nm, up, dn, eye); ul.append(it);
      });
      host.append(h('div', { class: 'lab', style: 'margin:8px 0 2px;color:var(--text)' }, pl + (pg === ui.page ? '' : '  (open to scroll)'), ' ', btn('Reset order', () => change(c => { c.layout.order[pg] = defOrder.slice(); c.layout.hidden[pg] = []; }, 'oreset'), { style: 'float:right' })), ul);
    });
  };
  return p;
}

/* ---------------- Motion & Logo ---------------- */
function buildMotion() {
  const p = panel('Motion');
  let b = grp(p, 'General');
  add(b, seg('Level', ['motion', 'level'], ['full', 'calm', 'off'], { kw: 'animation reduced' }), seg('Transition', ['motion', 'transition'], [['aurora-wipe', 'Aurora wipe'], ['fade', 'Fade'], ['none', 'None']], { kw: 'page' }),
    seg('Reveal', ['motion', 'reveal'], ['rise', 'fade', 'scale', 'none'], { kw: 'scroll' }), range('Reveal distance', ['motion', 'revealDistance'], 0, 60, 1, { unit: 'px', kw: 'reveal' }));
  b = grp(p, 'Hero scene');
  add(b, tog('Draw in', ['motion', 'heroDrawIn'], { kw: 'hero lines intro' }), range('Density', ['motion', 'heroDensity'], 0.3, 2, 0.05, { kw: 'hero lines', unit: '×' }), range('Reveal', ['motion', 'heroReveal'], 0, 2, 0.05, { kw: 'hero lines' }), range('Ambient drift', ['motion', 'heroDrift'], 0, 2, 0.05, { kw: 'hero speed' }));
  b = grp(p, 'Cursor');
  add(b, seg('Effect', ['motion', 'cursor'], ['comet', 'spotlight', 'ring', 'dots', 'sparks', 'none'], { kw: 'cursor pointer' }), seg('Colour', ['motion', 'cursorColor'], SEED_NAMES.map((n, i) => [i, n]), { kw: 'cursor aurora' }));
  b = grp(p, 'Kinetic band');
  add(b, tog('Show band', ['motion', 'kinetic', 'on'], { kw: 'kinetic sliding statement' }), range('Speed', ['motion', 'kinetic', 'speed'], 0.2, 3, 0.05, { kw: 'kinetic', unit: '×' }), seg('Direction', ['motion', 'kinetic', 'direction'], ['left', 'right'], { kw: 'kinetic' }),
    tog('Pause on hover', ['motion', 'kinetic', 'pauseOnHover'], { kw: 'kinetic' }), seg('Separator', ['motion', 'kinetic', 'separator'], ['▲', '●', '✦', '/', '—'], { kw: 'kinetic' }), tog('Skills ticker', ['motion', 'kinetic', 'ticker'], { kw: 'kinetic mono' }));
  return p;
}
function getLogos() {
  let l = null;
  try { const w = frames[0] && frames[0].el.contentWindow; l = w && w.RM_LOGOS; } catch (e) {}
  return (l && l.length) ? l : (window.RM_LOGOS || []);
}
function logoMarkup(e, th) {
  const L = window.RMLogos; if (!L) return '';
  return L.markup(e, { color: cfg.logo.color || 'text', size: e.wide ? 0.95 : 1.15, cls: 'lt' });
}
function logoVars(th) {
  const c = cfg.colors[th] || cfg.colors.dark, a = c.aurora || [];
  return '--crest:' + (a[0] || c.accent) + ';--accent:' + c.accent + ';--accent-text:' + (c.accentText || c.accent) + ';--ground:' + c.bg + ';--av5:' + (a[1] || c.accent) + ';--av2:' + (a[3] || a[2] || c.accent) + ';color:' + c.text + ';background:' + c.bg;
}
function buildLogo() {
  const p = panel('Logo'); let b = grp(p, 'Mark');
  const logos = getLogos();
  const filter = h('input', { type: 'search', class: 'lfilter', placeholder: 'Filter marks (name, family)', 'aria-label': 'Filter logo marks' });
  const wrap = h('div', { class: 'ltiles' });
  const fams = []; logos.forEach(e => { if (fams.indexOf(e.family) < 0) fams.push(e.family); });
  const tiles = [], heads = [];
  fams.forEach(f => {
    const head = h('div', { class: 'lhead', text: f }); const grid = h('div', { class: 'tiles lgrid' });
    logos.filter(e => e.family === f).forEach(e => {
      const t = h('button', { type: 'button', class: 'ltile' + ((e.wide || e.text) ? ' wide' : ''), 'aria-pressed': 'false', 'aria-label': 'Logo mark ' + e.name + ', ' + f, title: e.name + ' (' + e.id + ')' }, h('span', { class: 'lprev' }), h('span', { class: 'lname', text: e.name }));
      t.addEventListener('click', () => change(c => { c.logo.mark = e.id; }, 'logo'));
      t._e = e; t._f = f; t._k = (e.name + ' ' + e.id + ' ' + f).toLowerCase(); grid.append(t); tiles.push(t);
    });
    head._g = grid; heads.push(head); wrap.append(head, grid);
  });
  const paint = () => {
    const th = viewTheme(), vars = logoVars(th);
    tiles.forEach(t => {
      const pv = t.firstChild; pv.setAttribute('style', vars);
      pv.innerHTML = t._e.text ? '<span class="ltxt">Ricky Martin</span>' : logoMarkup(t._e, th);
      t.setAttribute('aria-pressed', String(t._e.id === cfg.logo.mark));
    });
  };
  const applyFilter = () => {
    const q = filter.value.trim().toLowerCase();
    tiles.forEach(t => { t.hidden = !!q && t._k.indexOf(q) < 0; });
    heads.forEach(hd => { const any = [...hd._g.children].some(t => !t.hidden); hd.hidden = !any; hd._g.hidden = !any; });
  };
  filter.addEventListener('input', applyFilter);
  reg.push({ refresh: paint });
  add(b, fullRow('logo mark filter search', 'peak ribbon serif monogram wordmark ridge signature', filter), fullRow('logo mark tiles ' + logos.map(e => e.name + ' ' + e.id).join(' '), '', wrap));
  b = grp(p, 'Style');
  add(b, seg('Colour', ['logo', 'color'], [['text', 'Text'], ['crest', 'Crest'], ['accent', 'Accent'], ['aurora', 'Aurora']], { kw: 'logo colour color gradient' }),
    seg('Animation', ['logo', 'anim'], [['none', 'None'], ['draw', 'Draw-on'], ['pulse-on-hover', 'Pulse on hover']], { kw: 'logo animate draw pulse hover' }),
    range('Size', ['logo', 'size'], 0.6, 2, 0.05, { unit: '×', kw: 'logo' }),
    range('Tilt', ['logo', 'rotate'], -180, 180, 1, { unit: '°', kw: 'logo tilt rotate angle' }),
    seg('Mirror', ['logo', 'mirror'], [['none', 'None'], ['horizontal', 'Horizontal'], ['vertical', 'Vertical'], ['both', 'Both']], { kw: 'logo mirror flip' }), tog('Show name', ['logo', 'showName'], { kw: 'logo name text' }));
  paint();
  return p;
}

/* ---------------- Elements ---------------- */
function labelFor(id) { for (const pg in edits) { const e = (edits[pg] || []).find(x => x.id === id); if (e) return e.label || id; } return id; }
function buildElements() {
  const p = panel('Elements');
  let b = grp(p, 'Pick');
  const pickBtn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', text: 'Pick element (P)' });
  pickBtn.addEventListener('click', () => setPick(!ui.pick));
  const etBtn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', text: 'Edit text' });
  etBtn.addEventListener('click', () => { ui.editText = !ui.editText; frames.forEach(f => send(f, { action: 'edit-text', on: ui.editText })); refreshAll(); });
  const selEl = h('select', { 'aria-label': 'Choose element', style: 'max-width:100%;width:100%' });
  selEl.addEventListener('change', () => { ui.sel = selEl.value || null; ui.picked = null; if (ui.sel) frames.forEach(f => { send(f, { action: 'highlight', id: ui.sel }); send(f, { action: 'scrollTo', id: ui.sel }); }); refreshAll(); });
  reg.push({ refresh: () => { pickBtn.setAttribute('aria-pressed', String(ui.pick)); etBtn.setAttribute('aria-pressed', String(ui.editText)); selEl.value = ui.sel || ''; } });
  add(b, fullRow('pick element', 'click inspect', h('div', { class: 'btnrow' }, pickBtn, etBtn)), fullRow('choose element list', 'select', selEl));
  dyn.elementSelect = () => { const all = [].concat(...Object.values(edits)).filter((e, i, a) => a.findIndex(x => x.id === e.id) === i); selEl.innerHTML = ''; selEl.append(h('option', { value: '', text: 'Select element (' + all.length + ')' }), ...all.map(e => h('option', { value: e.id, text: (e.label || e.id) + '  [' + e.id + ']' }))); selEl.value = ui.sel || ''; };

  b = grp(p, 'Selected element');
  const none = h('div', { class: 'empty', text: 'Nothing picked. Use Pick, or choose from the list.' });
  const head = h('div', { class: 'picked' });
  const body = h('div');
  const EL = k => () => ui.sel ? ['elements', ui.sel, k] : null;
  const colorRow = (() => {
    const row = fullRow('element colour', 'color text');
    const chips = h('div', { class: 'chips-row' });
    const setC = v => { const id = ui.sel; change(c => { c.elements = c.elements || {}; const o = c.elements[id] = c.elements[id] || {}; if (v == null) delete o.color; else o.color = v; if (!Object.keys(o).length) delete c.elements[id]; }, 'elc' + id); };
    const cs = [];
    for (let i = 0; i < 5; i++) { const x = h('button', { type: 'button', class: 'cchip', 'aria-label': 'Colour ' + SEED_NAMES[i], title: SEED_NAMES[i] }); x.addEventListener('click', () => setC('aurora:' + i)); x._v = 'aurora:' + i; cs.push(x); chips.append(x); }
    ['text', 'muted', 'accent'].forEach(t => { const x = h('button', { type: 'button', class: 'cchip t', text: t }); x.addEventListener('click', () => setC(t)); x._v = t; cs.push(x); chips.append(x); });
    const custom = h('input', { type: 'color', 'aria-label': 'Custom element colour' }); custom.addEventListener('input', () => setC(custom.value));
    chips.append(custom, btn('clear', () => setC(null)));
    row.append(h('div', { class: 'lab', text: 'Colour', style: 'margin-bottom:2px' }), chips);
    reg.push({ refresh: () => { const o = ui.sel && cfg.elements && cfg.elements[ui.sel]; const v = o && o.color; const t = cfg.colors[viewTheme()]; cs.forEach(x => { if (x._v.startsWith('aurora:')) x.style.background = t.aurora[+x._v.slice(7)]; x.setAttribute('aria-pressed', String(v === x._v)); }); if (v && /^#/.test(v)) custom.value = C.normHex(v) || '#000000'; row.classList.toggle('mod', !!v); } });
    return row;
  })();
  const ctl = (kind, label, prop, extra) => Ctl(Object.assign({ label, kind, el: true, path: EL(prop) }, extra));
  const copyArea = h('textarea', { class: 'txt', 'aria-label': 'Replacement text', placeholder: 'Replace this element\'s text' });
  copyArea.addEventListener('input', () => { const id = ui.sel; if (!id) return; change(c => { c.copy = c.copy || {}; if (copyArea.value === '') delete c.copy[id]; else c.copy[id] = copyArea.value; }, 'cp' + id); });
  const copyRow = h('div', { class: 'row stack', 'data-k': 'text copy replace content' }, h('div', { class: 'lab', text: 'Text' }), copyArea);
  reg.push({ refresh: () => { if (document.activeElement !== copyArea) copyArea.value = (ui.sel && cfg.copy && cfg.copy[ui.sel]) || (ui.picked && ui.picked.id === ui.sel && ui.picked.computed && ui.picked.computed.text) || ''; } });
  body.append(ctl('range', 'Size', 'size', { min: 0.5, max: 2.5, step: 0.05, neutral: 1, unit: '×', kw: 'element scale' }), colorRow,
    ctl('seg', 'Weight', 'weight', { opts: [[300, '300'], [400, '400'], [500, '500'], [600, '600'], [700, '700']], neutral: undefined }), ctl('seg', 'Align', 'align', { opts: ['left', 'center', 'right'] }),
    ctl('range', 'Margin top', 'mt', { min: -40, max: 160, step: 2, neutral: 0, unit: 'px', kw: 'mt spacing' }), ctl('range', 'Margin bottom', 'mb', { min: -40, max: 160, step: 2, neutral: 0, unit: 'px', kw: 'mb spacing' }),
    ctl('toggle', 'Italic', 'italic'), ctl('toggle', 'Uppercase', 'upper'), ctl('toggle', 'Hidden', 'hidden', { kw: 'hide' }), copyRow,
    fullRow('reset element', '', h('div', { class: 'btnrow' }, btn('Reset this element', () => { const id = ui.sel; change(c => { delete (c.elements || {})[id]; delete (c.copy || {})[id]; }, 'elreset'); }))));
  add(b, none, head, body);
  reg.push({ refresh: () => { const on = !!ui.sel; none.hidden = on; head.hidden = !on; body.hidden = !on; head.innerHTML = ''; if (on) { head.append(h('div', { class: 'pt', text: labelFor(ui.sel) }), h('div', { class: 'pi', text: 'data-edit="' + ui.sel + '"' })); if (ui.picked && ui.picked.id === ui.sel && ui.picked.computed) { const c = ui.picked.computed; head.append(h('div', { class: 'pi', text: [c.fontSize, c.fontWeight, c.color].filter(Boolean).join('  ') })); } } } });

  b = grp(p, 'Overrides');
  const ov = h('div', { class: 'list' });
  add(b, fullRow('overrides list', 'elements changed reset', ov));
  dyn.elements = () => {
    dyn.elementSelect();
    ov.innerHTML = '';
    const ids = [...new Set([...Object.keys(cfg.elements || {}), ...Object.keys(cfg.copy || {})])];
    if (!ids.length) ov.append(h('div', { class: 'empty', text: 'No element overrides yet.' }));
    ids.forEach(id => {
      const o = (cfg.elements || {})[id] || {}; const bits = Object.keys(o).map(k => k + ' ' + o[k]); if ((cfg.copy || {})[id] != null) bits.push('text');
      const nm = h('button', { type: 'button', class: 'nm', text: labelFor(id) + '  ·  ' + bits.join(', '), title: 'Select' });
      nm.addEventListener('click', () => { ui.sel = id; ui.picked = null; frames.forEach(f => { send(f, { action: 'highlight', id }); send(f, { action: 'scrollTo', id }); }); refreshAll(); });
      const rs = h('button', { type: 'button', class: 'i', text: 'reset', 'aria-label': 'Reset ' + labelFor(id) });
      rs.addEventListener('click', () => change(c => { delete (c.elements || {})[id]; delete (c.copy || {})[id]; }, 'elreset' + id));
      ov.append(h('div', { class: 'item' }, nm, rs));
    });
  };
  return p;
}
function setPick(on) { ui.pick = on; frames.forEach(f => send(f, { action: 'pick', on })); refreshAll(); if (on) toast('Pick mode: click an element in the preview (Esc to cancel)'); }

/* ---------------- Saves ---------------- */
const thumbOf = d => { const c = merge(defaults, d).colors; return h('div', { class: 'thumb' }, c.dark.aurora.map(x => h('i', { style: 'background:' + x })), h('i', { class: 'gap' }), c.light.aurora.map(x => h('i', { style: 'background:' + x }))); };
const newId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
function persistSaves() { store.set('rm-studio-saves', saves); dyn.saves(); updateCmpSel(); }
function importDelta(raw, label) {
  let o; try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { toast('Not valid JSON'); return false; }
  if (!isObj(o)) { toast('Not a config object'); return false; }
  const d = isObj(o.delta) ? o.delta : isObj(o.config) ? o.config : o;
  setWhole(merge(defaults, d), label || 'Imported'); return true;
}
function download(name, text) { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 500); }
async function copyText(t, msg) { try { await navigator.clipboard.writeText(t); toast(msg); } catch (e) { const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { /* none */ } ta.remove(); toast(ok ? msg : 'Copy blocked by the browser; use Export JSON'); } window.__lastCopy = t; }
function linkUrl() { return new URL('../aurora-final/index.html', location.href).href + '?config=' + b64u(JSON.stringify(delta())); }
function curName() { return (store.get('rm-studio-name') || 'look'); }
function buildSaves() {
  const p = panel('Saves');
  let b = grp(p, 'Named saves');
  const nameIn = h('input', { class: 'txt', type: 'text', placeholder: 'Name this look', 'aria-label': 'Save name', style: 'flex:1' });
  const doSave = () => { const n = nameIn.value.trim() || ('Look ' + (saves.length + 1)); saves.unshift({ id: newId(), name: n, delta: delta(), t: Date.now() }); store.set('rm-studio-name', n); nameIn.value = ''; persistSaves(); toast('Saved "' + n + '"'); };
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
  const lst = h('div', { class: 'list' });
  add(b, fullRow('save snapshot named', 'name', h('div', { class: 'btnrow', style: 'flex-wrap:nowrap' }, nameIn, btn('Save', doSave))), fullRow('saves list', 'load rename duplicate delete', lst));
  dyn.saves = () => {
    lst.innerHTML = ''; if (!saves.length) lst.append(h('div', { class: 'empty', text: 'No saved looks yet.' }));
    saves.forEach(s => {
      const nm = h('button', { type: 'button', class: 'nm', text: s.name, title: 'Load', 'aria-label': 'Load ' + s.name }); nm.addEventListener('click', () => { setWhole(merge(defaults, s.delta), 'Loaded "' + s.name + '"'); store.set('rm-studio-name', s.name); });
      const mk = (t, fn, lbl) => { const x = h('button', { type: 'button', class: 'i', text: t, 'aria-label': lbl + ' ' + s.name, title: lbl }); x.addEventListener('click', fn); return x; };
      lst.append(h('div', { class: 'item' }, thumbOf(s.delta), nm, mk('B', () => { ui.cmpId = s.id; if (!ui.cmp) toggleCmp(true); else { updateCmpSel(); buildFrames(); } saveUi(); }, 'Compare against'),
        mk('ren', () => { const n = prompt('Rename', s.name); if (n && n.trim()) { s.name = n.trim(); persistSaves(); } }, 'Rename'), mk('dup', () => { saves.unshift({ id: newId(), name: s.name + ' copy', delta: clone(s.delta), t: Date.now() }); persistSaves(); }, 'Duplicate'),
        mk('del', () => { saves = saves.filter(x => x !== s); persistSaves(); }, 'Delete')));
    });
  };
  b = grp(p, 'Share and export');
  const paste = h('textarea', { class: 'txt', placeholder: 'Paste exported JSON here', 'aria-label': 'Paste JSON to import' });
  const file = h('input', { type: 'file', accept: '.json,application/json', 'aria-label': 'Import JSON file', hidden: true });
  file.addEventListener('change', async () => { const f = file.files[0]; if (f) importDelta(await f.text(), 'Imported ' + f.name); file.value = ''; });
  add(b, fullRow('export import copy link claude', 'json download share', h('div', { class: 'btnrow' },
    btn('Export JSON', () => { const n = curName().replace(/[^\w-]+/g, '-'); download('aurora-studio-' + n + '.json', JSON.stringify({ v: 1, name: curName(), delta: delta() }, null, 2)); toast('Exported'); }),
    btn('Import file', () => file.click()), btn('Copy link', () => copyText(linkUrl(), 'Link copied')), btn('Copy for Claude', () => copyText(forClaude(), 'Copied: paste this to Claude'))), file),
    fullRow('paste import json', 'import', paste, h('div', { class: 'btnrow' }, btn('Import pasted JSON', () => { if (paste.value.trim() && importDelta(paste.value.trim(), 'Imported')) paste.value = ''; }))));
  b = grp(p, 'Starter looks');
  const looks = list(presets().looks); const lg = h('div', { class: 'gal' });
  looks.forEach(lk => {
    const d = lk.config || lk.delta || lk.cfg || lk.settings || (lk.colors || lk.type || lk.layout ? lk : {});
    const card = h('button', { type: 'button', class: 'card clickable', title: 'Apply look' }, h('div', { class: 'nm', text: lk.name || lk.id || 'Look' }), thumbOf(d), h('div', { class: 'sub', text: lk.note || lk.description || '' }));
    card.addEventListener('click', () => { setWhole(merge(defaults, d), 'Applied "' + (lk.name || 'look') + '"'); });
    lg.append(card);
  });
  add(b, looks.length ? fullRow('starter looks gallery', looks.map(l => l.name).join(' '), lg) : fullRow('starter looks', '', h('div', { class: 'empty', text: 'No starter looks available yet.' })));
  return p;
}

/* ---------------- Copy for Claude ---------------- */
function forClaude() {
  const d = delta(); const out = [];
  out.push('# Aurora Studio: requested look', '', 'These are the changes from the default `aurora-final` config, in plain words, followed by the exact JSON delta (deep-merge it over `RM_DEFAULTS`). Anything not listed stays at its default.', '');
  const fmt = v => Array.isArray(v) ? '[' + v.join(', ') + ']' : (typeof v === 'string' ? '"' + v + '"' : String(v));
  const walk = (node, def, path, lines) => {
    for (const k in node) {
      const v = node[k], dv = def ? def[k] : undefined;
      if (isObj(v)) walk(v, isObj(dv) ? dv : {}, path.concat(k), lines);
      else if (Array.isArray(v) && Array.isArray(dv) && v.length === dv.length && k === 'aurora') v.forEach((x, i) => { if (x !== dv[i]) lines.push('- ' + SEED_NAMES[i] + ' seed: ' + fmt(dv[i]) + ' → ' + fmt(x)); });
      else lines.push('- ' + path.concat(k).map(human).join(' › ') + ': ' + (dv === undefined ? '(unset)' : fmt(dv)) + ' → ' + fmt(v));
    }
  };
  const groups = [['theme', 'Preview theme'], ['colors', 'Colours'], ['type', 'Type'], ['layout', 'Layout and sections'], ['motion', 'Motion and cursor'], ['logo', 'Logo']];
  groups.forEach(([k, title]) => {
    if (d[k] === undefined) return; const lines = [];
    if (k === 'theme') lines.push('- default theme: ' + fmt(d.theme));
    else if (k === 'colors') ['dark', 'light'].forEach(t => { if (!d.colors[t]) return; const l = []; walk(d.colors[t], defaults.colors[t], [], l); if (l.length) { lines.push('**' + cap(t) + ' theme**'); lines.push(...l); } });
    else if (k === 'layout') { const l = Object.assign({}, d.layout); const o = l.order, hd = l.hidden; delete l.order; delete l.hidden; walk(l, defaults.layout, [], lines);
      for (const pg in (o || {})) lines.push('- ' + pg + ' page section order: ' + o[pg].join(' → ') + '  (default ' + ((defaults.layout.order || {})[pg] || []).join(' → ') + ')');
      for (const pg in (hd || {})) lines.push('- ' + pg + ' page hidden sections: ' + (hd[pg].length ? hd[pg].join(', ') : 'none')); }
    else walk(d[k], defaults[k], [], lines);
    if (k === 'logo' && d.logo.mark) { const e = getLogos().find(x => x.id === d.logo.mark); lines.unshift('- logo mark name: ' + (e ? e.name + ' (' + e.family + ' family)' : d.logo.mark)); }
    if (lines.length) out.push('## ' + title, ...lines, '');
  });
  if (d.elements) { out.push('## Element overrides (data-edit ids)'); for (const id in d.elements) out.push('- ' + labelFor(id) + ' (`' + id + '`): ' + Object.entries(d.elements[id]).map(([k, v]) => k + ' ' + fmt(v)).join(', ')); out.push(''); }
  if (d.copy) { out.push('## Text edits'); for (const id in d.copy) out.push('- ' + labelFor(id) + ' (`' + id + '`): ' + JSON.stringify(d.copy[id])); out.push(''); }
  if (out.length < 5) out.push('_No changes from defaults._', '');
  out.push('## JSON delta', '```json', JSON.stringify(d, null, 2), '```');
  return out.join('\n');
}

/* ---------------- Shell wiring ---------------- */
const TABS = ['Colours', 'Type', 'Layout', 'Sections', 'Motion', 'Logo', 'Elements', 'Saves'];
let panelMap = {};
function rebuildPanels() {
  reg.length = 0; Object.keys(dyn).forEach(k => delete dyn[k]);
  const host = $('#panels'); host.innerHTML = ''; panelMap = {};
  const builders = { Colours: buildColours, Type: buildType, Layout: buildLayout, Sections: buildSections, Motion: buildMotion, Logo: buildLogo, Elements: buildElements, Saves: buildSaves };
  TABS.forEach(t => { const p = builders[t](); p.querySelectorAll('.row').forEach(r => { const g = r.closest('details.grp'); r.dataset.s = (r.dataset.k + ' ' + t + ' ' + (g ? g._title : '')).toLowerCase(); }); panelMap[t] = p; host.append(p); });
  setTab(ui.tab, true); dyn.sections(); dyn.elements(); dyn.saves();
}
function setTab(t, quiet) { if (!panelMap[t]) t = 'Colours'; ui.tab = t; Object.entries(panelMap).forEach(([k, p]) => p.classList.toggle('on', k === t)); $('#tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t))); if (!quiet) saveUi(); }
function filter(q) {
  q = q.trim().toLowerCase(); $('#insp').classList.toggle('searching', !!q); if (!q) return;
  Object.values(panelMap).forEach(p => { let any = false; p.querySelectorAll('details.grp').forEach(g => { let m = false; g.querySelectorAll('.row').forEach(r => { const hit = r.dataset.s.includes(q); r.classList.toggle('match', hit); m = m || hit; }); g.classList.toggle('has-match', m); if (m) g.open = true; any = any || m; }); p.classList.toggle('has-match', any); });
}
function refreshAll() { reg.forEach(r => r.refresh()); dyn.sections && dyn.sections(); dyn.elements && dyn.elements(); }
function seg1(host, items, get, set, label) { host.innerHTML = ''; items.forEach(([v, l]) => { const b = h('button', { type: 'button', text: l, 'aria-pressed': 'false', 'data-v': v }); b.addEventListener('click', () => set(v)); host.append(b); }); host._upd = () => host.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(get())))); }
function updateBar() {
  ['#pages', '#devices', '#views', '#cmpMode'].forEach(s => $(s)._upd && $(s)._upd());
  $('#undo').disabled = !hist.length; $('#redo').disabled = !redo.length; $('#histN').textContent = hist.length ? hist.length + ' steps' : '';
  $('#cmpBtn').setAttribute('aria-pressed', String(ui.cmp)); $('#cmpSel').hidden = !ui.cmp; $('#cmpMode').hidden = !ui.cmp;
  $('#toggleInsp').setAttribute('aria-pressed', String(ui.insp)); document.body.classList.toggle('insp-off', !ui.insp);
}
function setPage(p) { ui.page = p; frames.forEach(f => { f.el.src = pageUrl(p, (f.key === 'dark' || f.key === 'light') ? f.key : viewTheme()); }); saveUi(); updateBar(); dyn.sections && dyn.sections(); }
function setView(v) { ui.view = v; if (v !== 'split' && ui.edit !== 'both') ui.edit = v; if (v !== 'split') cfg.theme = v; saveUi(); updateBar(); buildFrames(); refreshAll(); }
function setDevice(d) { ui.device = d; saveUi(); updateBar(); layout(); }
function toggleCmp(on) { ui.cmp = on === undefined ? !ui.cmp : on; if (ui.cmp) updateCmpSel(); updateBar(); buildFrames(); }
function updateCmpSel() { const s = $('#cmpSel'); s.innerHTML = ''; s.append(h('option', { value: 'defaults', text: 'B: Defaults' }), ...saves.map(x => h('option', { value: x.id, text: 'B: ' + x.name }))); s.value = saves.some(x => x.id === ui.cmpId) ? ui.cmpId : 'defaults'; ui.cmpId = s.value; }

function init() {
  seg1($('#pages'), PAGES, () => ui.page, setPage);
  seg1($('#devices'), DEVICES.map(d => [d, d === 'fit' ? 'Fit' : d]), () => ui.device, setDevice);
  seg1($('#views'), [['dark', 'Dark'], ['light', 'Light'], ['split', 'Split']], () => ui.view, setView);
  seg1($('#cmpMode'), [['side', 'Side'], ['flip', 'Flip (F)']], () => ui.cmpMode, v => { ui.cmpMode = v; saveUi(); updateBar(); layout(); });
  $('#cmpBtn').addEventListener('click', () => toggleCmp());
  $('#cmpSel').addEventListener('change', e => { ui.cmpId = e.target.value; saveUi(); buildFrames(); frames.forEach(postFrame); });
  $('#undo').addEventListener('click', undo); $('#redo').addEventListener('click', redoFn);
  $('#reset').addEventListener('click', () => { setWhole(clone(defaults), 'Reset to defaults. Undo to bring it back.'); });
  $('#standalone').addEventListener('click', e => { e.currentTarget.href = linkUrl(); });
  $('#standalone').href = '../aurora-final/index.html';
  $('#helpBtn').addEventListener('click', () => $('#help').showModal());
  $('#toggleInsp').addEventListener('click', () => { ui.insp = !ui.insp; saveUi(); updateBar(); layout(); });
  const tabs = $('#tabs'); TABS.forEach(t => { const b = h('button', { type: 'button', role: 'tab', text: t, 'data-t': t, 'aria-selected': 'false' }); b.addEventListener('click', () => setTab(t)); tabs.append(b); });
  $('#search').addEventListener('input', e => filter(e.target.value));
  rebuildPanels(); updateCmpSel(); updateBar(); buildFrames(); refreshAll();
  addEventListener('keydown', e => {
    const t = e.target, txt = t && (t.tagName === 'TEXTAREA' || t.isContentEditable || (t.tagName === 'INPUT' && !['color', 'range', 'checkbox', 'file'].includes(t.type)) || t.tagName === 'SELECT');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { if (txt) return; e.preventDefault(); e.shiftKey ? redoFn() : undo(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { if (txt) return; e.preventDefault(); redoFn(); return; }
    if (e.key === 'Escape') { if (ui.pick) setPick(false); if (txt && t.type === 'search') { t.value = ''; filter(''); } return; }
    if (txt || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'p' || k === 'P') { e.preventDefault(); setPick(!ui.pick); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); if (!ui.cmp) { ui.cmpMode = 'flip'; ui.flipB = true; toggleCmp(true); } else if (ui.cmpMode !== 'flip') { ui.cmpMode = 'flip'; ui.flipB = true; updateBar(); layout(); } else { ui.flipB = !ui.flipB; layout(); } toast('Showing ' + (ui.flipB ? 'B: ' + cmpName() : 'A: working look')); }
    else if (k === '[') { ui.insp = !ui.insp; saveUi(); updateBar(); layout(); }
    else if (k === '/') { e.preventDefault(); $('#search').focus(); }
    else if (k === '?') $('#help').showModal();
    else if (k === '1' || k === '2' || k === '3') setPage(PAGES[+k - 1][0]);
    else if (k === 'd' || k === 'D') setView('dark'); else if (k === 'l' || k === 'L') setView('light'); else if (k === 's' || k === 'S') setView('split');
  });
  window.__studio = { get cfg() { return cfg; }, get defaults() { return defaults; }, delta, ui, frames: () => frames, importDelta, forClaude, linkUrl, saves: () => saves, secs, edits };
}
init();
})();
