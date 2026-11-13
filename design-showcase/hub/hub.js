(function () {
  'use strict';

  /* ---------- registry ---------- */
  var ROUND1 = [
    { id: 'v1', folder: 'v1-meridian', name: 'Meridian', concept: 'Modern: Swiss-precise night sky, one hairline ridge, one shooting star that becomes the headline underline.', pair: ['Schibsted Grotesk', 'Hanken Grotesk'], tint: { dark: ['#0c1220', '#cfd8ee'], light: ['#e7ecf6', '#1c2a4a'] } },
    { id: 'v2', folder: 'v2-voxel', name: 'Blockfield', concept: 'Voxel: an orbitable voxel diorama of a mountain under a meteor shower.', pair: ['Tilt Warp', 'Rubik'], tint: { dark: ['#10241a', '#b6f0c4'], light: ['#dcefd9', '#17452a'] } },
    { id: 'v3', folder: 'v3-hd', name: 'Starfall', concept: 'HD cinematic: real-time WebGL meteor shower with bloom, read like a film title sequence.', pair: ['Michroma', 'Figtree'], tint: { dark: ['#0a0710', '#e6dcff'], light: ['#e9e4f3', '#2e1f55'] } },
    { id: 'v4', folder: 'v4-windward', name: 'Windward', concept: 'Miyazaki-inspired: hand-painted wind, cumulus and meadows; stars fall like seeds at dusk.', pair: ['Shippori Mincho B1', 'Zen Maru Gothic'], tint: { dark: ['#1b2a3d', '#f3e3c3'], light: ['#d9e9f2', '#27475f'] } },
    { id: 'v5', folder: 'v5-basecamp', name: 'Basecamp', concept: 'Expedition: forward deployment as a climb. Altimeter scroll, topo contours, career elevation profile.', pair: ['Archivo', 'Public Sans'], tint: { dark: ['#1d1f1c', '#f0b36a'], light: ['#e8e5db', '#6a3b0f'] } },
    { id: 'v6', folder: 'v6-atlas', name: 'Celestial Atlas', concept: 'Engraved star atlas: skills as constellations on a rotating planisphere.', pair: ['Bodoni Moda', 'Alegreya Sans'], tint: { dark: ['#16130d', '#e6d6ae'], light: ['#efe5cc', '#3e3112'] } },
    { id: 'v7', folder: 'v7-nocturne', name: 'Nocturne', concept: 'New York: rain-dark skyline as the mountain range, windows light up as you scroll, career as a transit line.', pair: ['Big Shoulders Display', 'Work Sans'], tint: { dark: ['#101319', '#ffd27a'], light: ['#e3e6ea', '#1d2430'] } }
  ];
  var ROUND2 = [
    { id: 'm1', folder: 'm1-summit', name: 'Meridian · Summit', concept: 'Monochrome alpine massif above a sea of cloud, rose alpenglow on the peaks, survey-plate metadata, comet cursor.', pair: ['Grotesk', 'Mono'], tint: { dark: ['#0d0f12', '#e8c4c4'], light: ['#eeeeee', '#2a2a2a'] } },
    { id: 'm2', folder: 'm2-afterglow', name: 'Meridian · Afterglow', concept: 'The live site perfected: Instrument Serif, aurora palette, layered mountains, shooting stars and the aurora comet cursor.', pair: ['Instrument Serif', 'Geist Mono'], tint: { dark: ['#12131f', '#ffb562'], light: ['#f1ecf4', '#3b2f63'] } },
    { id: 'm3', folder: 'm3-contour', name: 'Meridian · Contour', concept: 'Swiss editorial precision: an engraved line-art panorama that draws itself, hairline grid, ink comet cursor.', pair: ['Grotesk', 'Mono'], tint: { dark: ['#0b0b0c', '#d9d9d9'], light: ['#f6f5f2', '#111111'] } },
    { id: 'n1', folder: 'n1-penthouse', name: 'Nocturne · Penthouse', concept: 'Mature Manhattan nocturne: architectural skyline whose windows warm on in waves as you scroll, obsidian and brass.', pair: ['Serif display', 'Sans'], tint: { dark: ['#0e0e10', '#d6b98a'], light: ['#e9e6e1', '#2b2620'] } },
    { id: 'n2', folder: 'n2-fogline', name: 'Nocturne · Fogline', concept: 'Towers pierce a sea of fog, rose light on the spires, windows light floor by floor from the fog line as you scroll.', pair: ['Grotesk', 'Mono'], tint: { dark: ['#0f1114', '#e3b9bf'], light: ['#efefef', '#262626'] } },
    { id: 'n3', folder: 'n3-hudson', name: 'Nocturne · Hudson', concept: 'Skyline across the Hudson in the live-site aurora palette; lit windows shimmer in the river, comet cursor overhead.', pair: ['Instrument Serif', 'Geist Mono'], tint: { dark: ['#12131f', '#5dc7ff'], light: ['#e6e9f0', '#1d2a44'] } }
  ];
  var AG = { pair: ['Instrument Serif', 'Geist Mono'], tint: { dark: ['#12131f', '#ffb562'], light: ['#f1ecf4', '#3b2f63'] } };
  var ROUND3 = [
    { id: 'a0', folder: 'a0-afterglow', name: 'Afterglow · Original', concept: 'Round two\'s Afterglow, unchanged in look, rebuilt to scroll and animate smoothly.', pair: AG.pair, tint: AG.tint },
    { id: 'a1', folder: 'a1-mirror', name: 'Afterglow · Mirror Lake', concept: 'The aurora range reflected in a still alpine lake; the water becomes the page as you scroll.', pair: AG.pair, tint: { dark: ['#10131e', '#5dc7ff'], light: ['#eef0f6', '#2e3a63'] } },
    { id: 'a2', folder: 'a2-gallery', name: 'Afterglow · Gallery', concept: 'Editorial split layout; the panorama hangs as a framed living artwork that opens to full-bleed on scroll.', pair: AG.pair, tint: { dark: ['#13121a', '#e8d2b0'], light: ['#f4f0ea', '#3a2f28'] } },
    { id: 'a3', folder: 'a3-horizon', name: 'Afterglow · Horizon', concept: 'One landscape behind the whole page; scrolling moves the light from dusk through aurora night to dawn.', pair: AG.pair, tint: { dark: ['#141320', '#ffb562'], light: ['#f5eee6', '#5a3a1c'] } },
    { id: 'c1', folder: 'c1-aurora-contour', name: 'Afterglow × Contour · Aurora Lines', concept: 'Contour\'s engraved panorama drawn in aurora light inside the Afterglow site; scroll uncovers the far summits.', pair: AG.pair, tint: { dark: ['#11121d', '#9f7bff'], light: ['#f2f0f6', '#3b2f63'] } },
    { id: 'c2', folder: 'c2-ridgeline', name: 'Afterglow × Contour · Ridgeline', concept: 'Dozens of luminous ridgelines receding into depth; scrolling lifts the camera over the range.', pair: AG.pair, tint: { dark: ['#0f101a', '#ffb562'], light: ['#f3efe8', '#2b2620'] } },
    { id: 'c3', folder: 'c3-engraved', name: 'Afterglow × Contour · Engraved Dusk', concept: 'Afterglow\'s painted ridges with banknote-fine engraved hatching and a glowing alpenglow rim.', pair: AG.pair, tint: { dark: ['#13121b', '#e7b98a'], light: ['#f3ece0', '#3d2c1c'] } },
    { id: 'f1', folder: 'f1-neon-harbor', name: 'Fogline · Neon Harbor', concept: 'Glass towers edge-lit in aurora colours across mirror-still harbour water; windows light as you scroll.', pair: AG.pair, tint: { dark: ['#0b1024', '#5dc7ff'], light: ['#e9eef6', '#1d2a55'] } },
    { id: 'f2', folder: 'f2-monolith', name: 'Fogline · Monolith', concept: 'Monochrome luxury: the fog sea sinks as you scroll to reveal the towers floor by floor.', pair: ['Grotesk', 'Mono'], tint: { dark: ['#0f1114', '#e3b9bf'], light: ['#f0f0ef', '#262626'] } },
    { id: 'f3', folder: 'f3-elevation', name: 'Fogline · Elevation', concept: 'The skyline as an architect\'s line elevation in aurora ink; floors light up tower by tower.', pair: AG.pair, tint: { dark: ['#10121c', '#9f7bff'], light: ['#f1f2f4', '#26304a'] } },
    { id: 'f4', folder: 'f4-skyward', name: 'Fogline · Skyward', concept: 'Scroll rises up a supertall from street fog to above the clouds, where only the spires remain.', pair: AG.pair, tint: { dark: ['#0e1120', '#e3b9bf'], light: ['#eceef4', '#2a2f4a'] } }
  ];
  var AL = { dark: ['#11121d', '#9f7bff'], light: ['#f2f0f6', '#3b2f63'] };
  var ROUND4 = [
    { id: 'r0', folder: 'r0-aurora-lines', name: 'Aurora Lines · Original', concept: 'Round three\'s winner, unchanged in look, now with the live Tune panel for colours, fonts, sizes and motion.', pair: AG.pair, tint: AL },
    { id: 'r1', folder: 'r1-lantern', name: 'Aurora Lines · Lantern', concept: 'A night hike: your cursor is a lantern that lights the engraved range; trail-map projects and a switchback career path.', pair: AG.pair, tint: { dark: ['#11111a', '#ffb562'], light: ['#f4efe6', '#5a3a1c'] } },
    { id: 'r2', folder: 'r2-borealis', name: 'Aurora Lines · Borealis', concept: 'Living aurora curtains over the line range, a silk-ribbon cursor and slow aurora light drifting through the page.', pair: AG.pair, tint: { dark: ['#0d1220', '#7ff0c8'], light: ['#eef2f4', '#24425a'] } },
    { id: 'r3', folder: 'r3-constellation', name: 'Aurora Lines · Constellation', concept: 'The sky is the hero: stars link to your cursor and the summits, and skills become an interactive star chart.', pair: AG.pair, tint: { dark: ['#0c0d18', '#cfd6ff'], light: ['#f1eee6', '#2a2a44'] } },
    { id: 'r4', folder: 'r4-kinetic', name: 'Aurora Lines · Kinetic', concept: 'Typography-led: the range runs through a giant headline, split-text reveals, a skills marquee and magnetic buttons.', pair: AG.pair, tint: { dark: ['#12131f', '#5dc7ff'], light: ['#f5f2ee', '#1f2434'] } },
    { id: 'r5', folder: 'r5-panorama', name: 'Aurora Lines · Panorama', concept: 'A pinned scroll pans the camera across a wide range; each summit is a career milestone, then you descend into the page.', pair: AG.pair, tint: { dark: ['#10111c', '#ffc08a'], light: ['#f3efe9', '#3d2c1c'] } }
  ];
  var RM = /[?&]round=([1234])\b/.exec(location.search);
  var ROUND = RM ? +RM[1] : 4;
  var VERSIONS = ROUND === 1 ? ROUND1 : ROUND === 2 ? ROUND2 : ROUND === 3 ? ROUND3 : ROUND4;
  var PAGES = [
    { id: 'home', file: 'index.html', label: 'Home' },
    { id: 'about', file: 'about.html', label: 'About' },
    { id: 'games', file: 'games.html', label: 'Games' }
  ];
  var DEVICES = {
    desktop: { label: 'Desktop', icon: 'monitor' },
    tablet: { label: 'Tablet', icon: 'tablet', w: 834, h: 1112, bz: 14 },
    mobile: { label: 'Mobile', icon: 'phone', w: 390, h: 844, bz: 13 }
  };
  var LISTS = [
    { k: 'love', label: 'Love it', ph: 'What works beautifully' },
    { k: 'dislike', label: 'Not for me', ph: 'What misses the mark' },
    { k: 'keep', label: 'Keep this feature', ph: 'A feature to carry forward' }
  ];
  var KEY_T = 'rm-showcase-theme', KEY_F = 'rm-showcase-feedback', KEY_H = 'rm-showcase-hint';
  var byId = {}; VERSIONS.forEach(function (v, i) { v.n = i + 1; byId[v.id] = v; });
  var pageById = {}; PAGES.forEach(function (p) { pageById[p.id] = p; });

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k];
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function store(op, key, val) {
    try { return op === 'get' ? localStorage.getItem(key) : localStorage.setItem(key, val); } catch (e) { return null; }
  }
  var ICONS = {
    'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
    'arrow-right': 'M5 12h14M13 6l6 6-6 6',
    'chev-left': 'M15 5l-7 7 7 7', 'chev-right': 'M9 5l7 7-7 7', 'chev-down': 'M6 9l6 6 6-6',
    star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    compare: 'M4 5h7v14H4zM13 5h7v14h-7z',
    monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
    tablet: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
    phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
    download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
    copy: 'M9 9h10v11H9zM5 15V4h10',
    x: 'M6 6l12 12M18 6L6 18', menu: 'M4 7h16M4 12h16M4 17h16', plus: 'M12 5v14M5 12h14',
    swap: 'M7 7h12l-3-3M17 17H5l3 3',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
    note: 'M5 4h14v12l-4 4H5zM15 20v-4h4M8.5 9h7M8.5 13h4',
    refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5'
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICONS[name] || '') + '"/></svg>';
  }
  function icon(name) { var i = document.createElement('i'); i.setAttribute('data-icon', name); i.innerHTML = svg(name); return i; }
  function hydrateIcons(root) { $$('i[data-icon]', root).forEach(function (i) { if (!i.firstChild) i.innerHTML = svg(i.getAttribute('data-icon')); }); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------- theme ---------- */
  var theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  var slots = [];

  function setTheme(t, opts) {
    opts = opts || {};
    if (t !== 'light' && t !== 'dark') return;
    var changed = t !== theme;
    theme = t;
    document.documentElement.dataset.theme = t;
    if (!opts.silent) store('set', KEY_T, t);
    var dark = t === 'dark';
    var btn = $('#tb-theme');
    btn.innerHTML = '';
    btn.append(icon(dark ? 'moon' : 'sun'), h('span', { class: 'lbl', text: dark ? 'Dark' : 'Light' }));
    btn.setAttribute('aria-label', 'Theme: ' + (dark ? 'dark' : 'light') + '. Switch to ' + (dark ? 'light' : 'dark'));
    if (!changed) return;
    if (!opts.fromFrame) slots.forEach(function (s) {
      try { if (s.frame && s.frame.contentWindow) s.frame.contentWindow.postMessage({ source: 'rm-hub', type: 'set-theme', theme: t }, '*'); } catch (e) {}
    });
    if (route.name === 'gallery') renderGallery();
    if (!opts.fromHash && route.name !== 'gallery') { route.t = t; writeHash(true); }
    syncToolbar();
  }

  /* ---------- feedback data ---------- */
  var db = {};
  function loadDb() {
    try {
      var raw = JSON.parse(store('get', KEY_F) || '{}');
      if (raw && typeof raw === 'object') {
        VERSIONS.forEach(function (v) {
          var r = raw[v.id]; if (!r || typeof r !== 'object') return;
          var e = blank();
          e.rating = Math.max(0, Math.min(5, +r.rating || 0));
          e.favorite = !!r.favorite;
          e.notes = typeof r.notes === 'string' ? r.notes : '';
          LISTS.forEach(function (l) {
            e[l.k] = (Array.isArray(r[l.k]) ? r[l.k] : []).filter(function (i) { return i && typeof i.text === 'string'; })
              .map(function (i) { return { id: String(i.id || Math.random().toString(36).slice(2)), text: i.text, page: String(i.page || ''), theme: String(i.theme || ''), at: +i.at || 0 }; });
          });
          db[v.id] = e;
        });
      }
    } catch (e) { db = {}; }
  }
  function blank() { return { rating: 0, favorite: false, love: [], dislike: [], keep: [], notes: '' }; }
  function fb(id) { return db[id] || (db[id] = blank()); }
  function hasData(e) { return e && (e.rating || e.favorite || e.notes || e.love.length || e.dislike.length || e.keep.length); }
  function save() {
    var out = {};
    for (var k in db) if (hasData(db[k])) out[k] = db[k];
    store('set', KEY_F, JSON.stringify(out));
    syncToolbar();
    if (route.name === 'gallery') renderGallery();
  }

  /* ---------- routing ---------- */
  var route = { name: 'gallery', d: 'desktop', t: theme };
  function validV(x) { return byId[x] ? x : null; }
  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var parts = raw.split('?'), q = new URLSearchParams(parts[1] || '');
    var seg = parts[0].split('/').filter(Boolean);
    var r = { name: 'gallery', t: q.get('t'), d: DEVICES[q.get('d')] ? q.get('d') : 'desktop' };
    if (seg[0] === 'compare') {
      r.name = 'compare'; r.a = validV(seg[1]) || VERSIONS[0].id; r.b = validV(seg[2]) || VERSIONS[Math.min(3, VERSIONS.length - 1)].id;
      r.p = pageById[q.get('p')] ? q.get('p') : 'home'; r.sync = q.get('sync') === '1';
    } else if (validV(seg[0])) {
      r.name = 'viewer'; r.v = seg[0]; r.p = pageById[seg[1]] ? seg[1] : 'home';
    }
    return r;
  }
  function hashFor(r) {
    var q = [];
    if (r.name === 'gallery') return '#/';
    if (r.name === 'viewer') {
      if (r.d && r.d !== 'desktop') q.push('d=' + r.d);
      q.push('t=' + theme);
      return '#/' + r.v + '/' + r.p + '?' + q.join('&');
    }
    q.push('p=' + r.p); q.push('t=' + theme); if (r.sync) q.push('sync=1');
    return '#/compare/' + r.a + '/' + r.b + '?' + q.join('&');
  }
  function writeHash(replace) {
    var hs = hashFor(route);
    if (location.hash !== hs) history[replace ? 'replaceState' : 'pushState'](null, '', hs);
  }
  /** Update the route from inside the hub. replace=true avoids a history entry. */
  function go(patch, replace) {
    var next = Object.assign({}, route, patch);
    var hs = hashFor(next);
    if (replace) { route = next; writeHash(true); apply(); }
    else if (location.hash === hs) { route = next; apply(); }
    else location.hash = hs;
  }
  function onHash() {
    var r = parseHash();
    if (r.t === 'light' || r.t === 'dark') setTheme(r.t, { fromHash: true });
    r.t = theme;
    route = r;
    apply();
  }

  /* ---------- frames ---------- */
  function makeSlot(host) {
    var s = { host: host, cur: null, tok: 0, timer: 0, frame: null, building: host.appendChild(h('div', { class: 'building', hidden: true })) };
    slots.push(s); return s;
  }
  function urlFor(v, p) { return byId[v].folder + '/' + pageById[p].file; }
  function loadSlot(slot, v, p, force) {
    if (!force && slot.cur && slot.cur.v === v && slot.cur.p === p) return;
    slot.cur = { v: v, p: p };
    var tok = ++slot.tok; clearTimeout(slot.timer);
    var url = urlFor(v, p);
    slot.host.setAttribute('aria-busy', 'true');
    fetch(url, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      if (tok !== slot.tok) return;
      if (!r.ok) throw new Error('missing');
      slot.building.hidden = true;
      place(slot, url + '?theme=' + theme, v, p, tok);
    }).catch(function () {
      if (tok !== slot.tok) return;
      $$('.frame', slot.host).forEach(function (f) { f.remove(); });
      slot.frame = null; slot.host.removeAttribute('aria-busy');
      var ver = byId[v];
      slot.building.innerHTML = '';
      slot.building.append(
        h('h2', { text: 'This design is still being built' }),
        h('p', { text: ver.name + ' / ' + pageById[p].label + ' is not published yet. This view checks again every few seconds.' }),
        h('button', { type: 'button', class: 'btn', onclick: function () { loadSlot(slot, v, p, true); } }, icon('refresh'), 'Check now')
      );
      slot.building.hidden = false;
      slot.timer = setTimeout(function () { loadSlot(slot, v, p, true); }, 5000);
    });
  }
  function place(slot, url, v, p, tok) {
    var fr = h('iframe', { class: 'frame', title: byId[v].name + ' ' + pageById[p].label + ' page', src: url });
    fr.addEventListener('load', function () {
      if (tok !== slot.tok) { fr.remove(); return; }
      slot.host.removeAttribute('aria-busy');
      fr.classList.add('in');
      $$('.frame', slot.host).forEach(function (f) { if (f !== fr) setTimeout(function () { f.remove(); }, 420); });
      try {
        var w = fr.contentWindow;
        w.addEventListener('keydown', onKey);
        w.addEventListener('scroll', function () { onFrameScroll(slot); }, { passive: true });
      } catch (e) {}
    });
    slot.frame = fr;
    slot.host.appendChild(fr);
  }
  var scrollLock = false;
  function onFrameScroll(slot) {
    if (route.name !== 'compare' || !route.sync || scrollLock) return;
    // slots[0] is viewer, slots[1] left, slots[2] right
    var other = slots.indexOf(slot) === 1 ? slots[2] : slots[1];
    try {
      var a = slot.frame.contentWindow, b = other.frame.contentWindow;
      var da = a.document.documentElement, db2 = b.document.documentElement;
      var ra = (da.scrollHeight - a.innerHeight) || 1;
      var ratio = a.scrollY / ra;
      scrollLock = true;
      b.scrollTo(0, ratio * (db2.scrollHeight - b.innerHeight));
      requestAnimationFrame(function () { requestAnimationFrame(function () { scrollLock = false; }); });
    } catch (e) { scrollLock = false; }
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.source !== 'rm-design') return;
    var slot = slots.filter(function (s) { return s.frame && s.frame.contentWindow === e.source; })[0];
    if (!slot) return;
    if (d.theme && d.theme !== theme) setTheme(d.theme, { fromFrame: true, silent: true });
    var v = validV(d.version), p = pageById[d.page] ? d.page : null;
    if (route.name === 'viewer' && slot === slots[0] && ((v && v !== route.v) || (p && p !== route.p))) {
      slot.cur = { v: v || route.v, p: p || route.p };
      go({ v: slot.cur.v, p: slot.cur.p }, true);
    } else if (route.name === 'compare' && slot !== slots[0]) {
      var i = slots.indexOf(slot);
      var patch = {};
      if (v && v !== route[i === 1 ? 'a' : 'b']) patch[i === 1 ? 'a' : 'b'] = v;
      if (p && p !== route.p) patch.p = p;
      if (patch.a || patch.b || patch.p) { slot.cur = { v: patch.a || patch.b || slot.cur.v, p: p || route.p }; go(patch, true); }
    }
  });

  /* ---------- gallery ---------- */
  function renderGallery() {
    var root = $('#gallery');
    var first = !root.firstChild;
    var rated = VERSIONS.filter(function (v) { return fb(v.id).rating; }).length;
    var favs = VERSIONS.filter(function (v) { return fb(v.id).favorite; }).length;
    root.innerHTML = '';
    var mark = '<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x=".7" y=".7" width="32.6" height="32.6" rx="8"/><path d="M5 24l7-8 4 4 5-9 8 13" stroke-linejoin="round"/></svg>';
    var bar = h('div', { class: 'g-bar' },
      h('div', { class: 'wordmark' }),
      h('button', { type: 'button', class: 'btn', onclick: function () { setTheme(theme === 'dark' ? 'light' : 'dark'); }, 'aria-label': 'Hub theme: ' + theme + '. Switch to ' + (theme === 'dark' ? 'light' : 'dark') }, icon(theme === 'dark' ? 'moon' : 'sun'), h('span', { text: cap(theme) })),
      h('button', { type: 'button', class: 'btn primary', onclick: openExport }, icon('download'), h('span', { text: 'Export feedback' }))
    );
    bar.firstChild.innerHTML = mark + '<span>Design review room</span>';
    root.append(bar);
    root.append(h('div', { class: 'g-hero' },
      h('h1', { text: ROUND === 1 ? 'Seven directions for one portfolio' : ROUND === 2 ? 'Round two: Meridian and Nocturne, three ways each' : ROUND === 3 ? 'Round three: Afterglow, Contour blends, and Fogline' : 'Round four: Aurora Lines, six tunable takes' }),
      h.apply(null, ['p', { class: 'g-round' }].concat([1, 2, 3, 4].filter(function (n) { return n !== ROUND; }).map(function (n, i) {
        return h('a', { href: '?round=' + n + '#/', style: i ? 'margin-left:1.2em' : null, text: n === 1 ? 'Round one (7 directions)' : n === 2 ? 'Round two (6 variants)' : n === 3 ? 'Round three (11 variants)' : 'Round four (6 tunable)' });
      }))),
      h('p', { class: 'g-round' },
        h('strong', { text: 'Final pick: ' }),
        h('a', { href: 'aurora-final/index.html', text: 'Aurora Lines (final site)' }),
        h('a', { href: 'studio/', style: 'margin-left:1.2em', text: 'Open the Studio (edit everything)' })),
      h('p', { text: 'Open each design, flip between them, compare two side by side, and note what you love, what to drop, and what to keep.' }),
      h('div', { class: 'g-stats', text: rated + ' of ' + VERSIONS.length + ' rated' + (favs ? ' · ' + favs + ' favorite' + (favs > 1 ? 's' : '') : '') })
    ));
    if (store('get', KEY_H) !== '1') {
      var hint = h('div', { class: 'hint', role: 'note' },
        h('p', null, h('strong', { text: 'How this works. ' }), 'Click a design to view it. Use ', kbdIcon('chev-left'), ' ', kbdIcon('chev-right'), ' or ', h('kbd', { text: '1' }), ' to ', h('kbd', { text: String(Math.min(9, VERSIONS.length)) }), ' to flip between designs. Use Feedback to note likes and dislikes. Export sends it all back as Markdown.'),
        h('button', { type: 'button', class: 'btn ghost icon', 'aria-label': 'Dismiss hint', onclick: function () { store('set', KEY_H, '1'); hint.remove(); } }, icon('x'))
      );
      root.append(hint);
    }
    var grid = h('div', { class: 'grid' });
    VERSIONS.forEach(function (v, i) { grid.append(tile(v, i, first)); });
    root.append(grid);
    root.append(h('footer', { class: 'g-foot' }, h('span', { text: 'Feedback autosaves in this browser.' }), h('span', { text: 'Ricky Martin portfolio / design directions' })));
    hydrateIcons(root);
  }
  function kbdIcon(n) { var k = h('kbd', { 'aria-label': n === 'chev-left' ? 'Left arrow' : 'Right arrow' }); k.append(icon(n)); return k; }
  function tile(v, i, first) {
    var e = fb(v.id), tn = v.tint[theme];
    var other = VERSIONS[(i + 1) % VERSIONS.length].id;
    var fbk = h('div', { class: 'fb', style: 'background:' + tn[0] + ';color:' + tn[1] }, h('strong', { text: v.name }), h('span', { text: 'Preview pending' }));
    var img = h('img', { src: '_review/' + v.folder + '/home-' + theme + '-desktop.png', alt: '', loading: 'lazy' });
    img.addEventListener('error', function () { img.remove(); });
    var badges = h('div', { class: 'badges' });
    if (e.favorite) badges.append(h('span', { class: 'badge', title: 'Favorite' }, icon('heart'), 'Favorite'));
    if (e.rating) badges.append(h('span', { class: 'badge', title: 'Your rating' }, icon('star'), e.rating + '/5'));
    return h('article', { class: 'tile' + (first ? ' enter' : ''), style: '--i:' + i, 'aria-labelledby': 'tn-' + v.id },
      h('a', { class: 'thumb', href: '#/' + v.id + '/home?t=' + theme, 'aria-label': 'Open ' + v.name }, fbk, img, badges),
      h('div', { class: 'meta' },
        h('span', { class: 'num', text: pad2(v.n) }),
        h('h2', { id: 'tn-' + v.id, text: v.name }),
        h('div', null,
          h('p', { class: 'concept', text: v.concept }),
          h('p', { class: 'pair' }, h('b', { text: v.pair[0] }), ' / ' + v.pair[1]),
          h('div', { class: 't-actions' },
            h('a', { class: 'btn primary', href: '#/' + v.id + '/home?t=' + theme }, 'Open', h('span', { class: 'sr', text: ' ' + v.name })),
            h('a', { class: 'btn', href: '#/compare/' + v.id + '/' + other + '?p=home&t=' + theme }, icon('compare'), 'Compare', h('span', { class: 'sr', text: ' ' + v.name })))
        ))
    );
  }

  /* ---------- toolbar / viewer / compare ---------- */
  var viewerSlot, leftSlot, rightSlot, lastAnnounce = '';

  function buildChrome() {
    var sel = $('#tb-version');
    VERSIONS.forEach(function (v) { sel.append(h('option', { value: v.id, text: v.n + '  ' + v.name })); });
    sel.addEventListener('change', function () { go({ v: sel.value }); });
    $('#tb-prev').addEventListener('click', function () { step(-1); });
    $('#tb-next').addEventListener('click', function () { step(1); });
    var tabs = $('#tb-tabs');
    PAGES.forEach(function (p) { tabs.append(h('button', { type: 'button', 'data-p': p.id, text: p.label, onclick: function () { go({ p: p.id }); } })); });
    var dev = $('#tb-device');
    Object.keys(DEVICES).forEach(function (k) {
      dev.append(h('button', { type: 'button', 'data-d': k, 'aria-label': DEVICES[k].label, title: DEVICES[k].label + (DEVICES[k].w ? ' ' + DEVICES[k].w + ' by ' + DEVICES[k].h : ''), onclick: function () { go({ d: k }); } }, icon(DEVICES[k].icon)));
    });
    $('#tb-theme').addEventListener('click', function () { setTheme(theme === 'dark' ? 'light' : 'dark'); });
    $('#tb-sync').addEventListener('click', function () { go({ sync: !route.sync }, true); });
    $('#tb-swap').addEventListener('click', function () { go({ a: route.b, b: route.a }, true); });
    $('#tb-feedback').addEventListener('click', function () { drawerOpen ? closeDrawer() : openDrawer(this); });
    $('#tb-menu').addEventListener('click', function () { toggleMenu(); });
    $('#tb-extra').addEventListener('click', function (e) { if (e.target.closest('a')) toggleMenu(false); });
    viewerSlot = makeSlot($('#screen'));
    $$('#compare .pane').forEach(function (pane, i) {
      var s = makeSlot($('.screen', pane)); (i ? (rightSlot = s) : (leftSlot = s));
      var ps = $('select', pane);
      VERSIONS.forEach(function (v) { ps.append(h('option', { value: v.id, text: v.n + '  ' + v.name })); });
      ps.addEventListener('change', function () { var p = {}; p[i ? 'b' : 'a'] = ps.value; go(p, true); });
    });
    new ResizeObserver(layout).observe($('#stage'));
    hydrateIcons(document);
  }
  function toggleMenu(force) {
    var ex = $('#tb-extra'), open = force == null ? !ex.classList.contains('open') : force;
    ex.classList.toggle('open', open); $('#tb-menu').setAttribute('aria-expanded', String(open));
  }
  function step(d) {
    if (route.name !== 'viewer') return;
    var i = VERSIONS.indexOf(byId[route.v]);
    go({ v: VERSIONS[(i + d + VERSIONS.length) % VERSIONS.length].id });
  }
  function syncToolbar() {
    if (route.name === 'gallery') return;
    var p = route.p;
    $$('#tb-tabs button').forEach(function (b) { if (b.dataset.p === p) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $('#tb-sync').setAttribute('aria-pressed', String(!!route.sync));
    var vid = route.name === 'viewer' ? route.v : route.a;
    var e = fb(vid), c = $('#tb-fbcount');
    var n = e.love.length + e.dislike.length + e.keep.length;
    c.hidden = !(e.rating || n);
    c.textContent = e.rating ? e.rating + '/5' : String(n);
    $('#tb-feedback').setAttribute('aria-label', 'Feedback for ' + byId[vid].name);
    if (route.name === 'viewer') {
      $('#tb-version').value = route.v;
      $$('#tb-device button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.d === route.d)); });
      var nx = VERSIONS[(VERSIONS.indexOf(byId[route.v]) + 1) % VERSIONS.length].id;
      $('#tb-compare').href = '#/compare/' + route.v + '/' + nx + '?p=' + p + '&t=' + theme;
      var nt = $('#tb-newtab'); nt.href = urlFor(route.v, p) + '?theme=' + theme;
      nt.setAttribute('aria-label', 'Open ' + byId[route.v].name + ' in a new tab');
    } else {
      var back = $$('#compare .pane');
      [route.a, route.b].forEach(function (id, i) {
        $('select', back[i]).value = id;
        var a = $('a', back[i]); a.href = urlFor(id, p) + '?theme=' + theme;
      });
    }
  }
  function layout() {
    if (route.name !== 'viewer') return;
    var stage = $('#stage'), wrap = $('#devwrap'), dev = $('#device'), d = DEVICES[route.d];
    if (!d.w) {
      stage.classList.remove('framed'); wrap.style.cssText = ''; dev.style.cssText = ''; dev.className = 'device fluid'; return;
    }
    stage.classList.add('framed'); dev.className = 'device ' + route.d;
    var cs = getComputedStyle(stage), pl = parseFloat(cs.paddingLeft) || 0, pt = parseFloat(cs.paddingTop) || 0;
    var W = d.w + d.bz * 2, H = d.h + d.bz * 2;
    var s = Math.min(1, (stage.clientWidth - pl * 2) / W, (stage.clientHeight - pt * 2) / H);
    wrap.style.width = Math.floor(W * s) + 'px'; wrap.style.height = Math.floor(H * s) + 'px';
    dev.style.width = W + 'px'; dev.style.height = H + 'px'; dev.style.transform = s < 1 ? 'scale(' + s + ')' : '';
  }
  function announce(msg) { if (msg !== lastAnnounce) { lastAnnounce = msg; $('#live').textContent = msg; } }

  function apply() {
    document.body.dataset.mode = route.name;
    toggleMenu(false);
    if (route.name === 'gallery') {
      document.title = 'Showcase Review Room';
      renderGallery(); if (drawerOpen) closeDrawer(true);
      announce('Gallery, ' + VERSIONS.length + ' designs');
      return;
    }
    var vid = route.name === 'viewer' ? route.v : route.a;
    fbVersion = vid;
    syncToolbar();
    if (route.name === 'viewer') {
      document.title = byId[route.v].name + ' / ' + pageById[route.p].label + ' - Showcase';
      layout();
      loadSlot(viewerSlot, route.v, route.p);
      announce('Viewing design ' + byId[route.v].n + ' of ' + VERSIONS.length + ', ' + byId[route.v].name + ', ' + pageById[route.p].label + ' page, ' + theme + ' theme');
    } else {
      document.title = 'Compare ' + byId[route.a].name + ' and ' + byId[route.b].name + ' - Showcase';
      loadSlot(leftSlot, route.a, route.p); loadSlot(rightSlot, route.b, route.p);
      announce('Comparing ' + byId[route.a].name + ' and ' + byId[route.b].name + ', ' + pageById[route.p].label + ' page');
    }
    if (drawerOpen) renderDrawer(true);
  }

  /* ---------- feedback drawer ---------- */
  var drawerOpen = false, fbVersion = null, drawerOpener = null;
  var dr = {};
  function buildDrawer() {
    var el = $('#drawer');
    var sel = h('select', { 'aria-label': 'Design to give feedback on' });
    VERSIONS.forEach(function (v) { sel.append(h('option', { value: v.id, text: v.n + '  ' + v.name })); });
    sel.addEventListener('change', function () { fbVersion = sel.value; renderDrawer(true); });
    dr.sel = sel;
    dr.title = h('h2', { id: 'dr-title', tabindex: '-1', text: 'Feedback' });
    el.append(h('div', { class: 'dr-head' }, dr.title, h('span', { class: 'sel' }, sel, icon('chev-down')),
      h('button', { type: 'button', class: 'tb-btn icon', 'aria-label': 'Close feedback', onclick: function () { closeDrawer(); } }, icon('x'))));
    var body = h('div', { class: 'dr-body' });
    dr.stars = h('div', { class: 'stars', role: 'radiogroup', 'aria-label': 'Rating' });
    for (var n = 1; n <= 5; n++) (function (n) {
      dr.stars.append(h('button', { type: 'button', role: 'radio', 'aria-label': n + (n === 1 ? ' star' : ' stars'), onclick: function () { var e = fb(fbVersion); e.rating = e.rating === n ? 0 : n; save(); renderStars(); } }, icon('star')));
    })(n);
    dr.stars.addEventListener('keydown', function (ev) {
      var e = fb(fbVersion), d = ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' ? -1 : 0;
      if (!d) return; ev.preventDefault(); ev.stopPropagation();
      e.rating = Math.max(0, Math.min(5, e.rating + d)); save(); renderStars();
      var b = $$('button', dr.stars)[Math.max(0, e.rating - 1)]; if (b) b.focus();
    });
    dr.fav = h('button', { type: 'button', class: 'btn fav', 'aria-pressed': 'false', onclick: function () { var e = fb(fbVersion); e.favorite = !e.favorite; save(); renderStars(); } }, icon('heart'), 'Favorite');
    body.append(h('div', { class: 'dr-row' }, dr.stars, dr.fav));
    dr.lists = {};
    LISTS.forEach(function (l) {
      var input = h('input', { type: 'text', id: 'in-' + l.k, placeholder: l.ph, maxlength: '300', 'aria-label': l.label + ': add an item', autocomplete: 'off' });
      var ul = h('ul', { class: 'items', 'aria-label': l.label });
      var count = h('span');
      function add() {
        var t = input.value.trim(); if (!t) return;
        fb(fbVersion)[l.k].push({ id: Math.random().toString(36).slice(2), text: t, page: route.p || 'home', theme: theme, at: Date.now() });
        input.value = ''; save(); renderLists(); input.focus();
      }
      body.append(h('section', { class: 'dr-sec' },
        h('h3', null, l.label, count),
        h('form', { class: 'add', onsubmit: function (e) { e.preventDefault(); add(); } }, input,
          h('button', { type: 'submit', class: 'btn icon', 'aria-label': 'Add to ' + l.label }, icon('plus'))),
        ul));
      dr.lists[l.k] = { ul: ul, input: input, count: count };
    });
    dr.notes = h('textarea', { id: 'dr-notes', placeholder: 'Anything else: pacing, tone, what felt off.', 'aria-label': 'Notes' });
    dr.notes.addEventListener('input', function () { fb(fbVersion).notes = dr.notes.value; save(); });
    body.append(h('section', { class: 'dr-sec' }, h('h3', { text: 'Notes' }), dr.notes));
    el.append(body);
    el.append(h('div', { class: 'dr-foot' }, h('span', { text: 'Autosaved in this browser' }),
      h('button', { type: 'button', class: 'btn', onclick: openExport }, icon('download'), 'Export feedback')));
    hydrateIcons(el);
  }
  function renderStars() {
    var e = fb(fbVersion);
    $$('button', dr.stars).forEach(function (b, i) {
      b.toggleAttribute('data-on', i < e.rating);
      b.setAttribute('aria-checked', String(e.rating === i + 1));
      b.tabIndex = (e.rating === i + 1 || (!e.rating && i === 0)) ? 0 : -1;
    });
    dr.fav.setAttribute('aria-pressed', String(e.favorite));
  }
  function renderLists() {
    var e = fb(fbVersion);
    LISTS.forEach(function (l) {
      var L = dr.lists[l.k], items = e[l.k];
      L.ul.innerHTML = ''; L.count.textContent = items.length ? String(items.length) : '';
      items.forEach(function (it) {
        L.ul.append(h('li', null,
          h('span', { class: 'txt' }, it.text, h('span', { class: 'tag', text: cap(it.page) + ' · ' + it.theme })),
          h('button', { type: 'button', 'aria-label': 'Remove: ' + it.text, onclick: function () {
            e[l.k] = e[l.k].filter(function (x) { return x.id !== it.id; }); save(); renderLists(); L.input.focus();
          } }, icon('x'))));
      });
    });
  }
  function renderDrawer(withNotes) {
    dr.sel.value = fbVersion;
    dr.title.textContent = 'Feedback';
    renderStars(); renderLists();
    if (withNotes) dr.notes.value = fb(fbVersion).notes;
  }
  function openDrawer(opener) {
    if (route.name === 'gallery') return;
    drawerOpener = opener || null;
    drawerOpen = true;
    var el = $('#drawer');
    el.removeAttribute('inert'); el.classList.add('open');
    $('#tb-feedback').setAttribute('aria-expanded', 'true');
    renderDrawer(true);
    setTimeout(function () { dr.title.focus(); }, 60);
  }
  function closeDrawer(silent) {
    drawerOpen = false;
    var el = $('#drawer'); el.classList.remove('open'); el.setAttribute('inert', '');
    $('#tb-feedback').setAttribute('aria-expanded', 'false');
    if (!silent && drawerOpener) drawerOpener.focus();
  }

  /* ---------- export ---------- */
  function buildMarkdown() {
    var out = ['# Design feedback: Ricky Martin portfolio', '', 'Generated ' + new Date().toLocaleString(), ''];
    var ranked = VERSIONS.filter(function (v) { return fb(v.id).rating; }).sort(function (a, b) { return fb(b.id).rating - fb(a.id).rating || (fb(b.id).favorite ? 1 : 0) - (fb(a.id).favorite ? 1 : 0) || a.n - b.n; });
    out.push('## Overall ranking', '');
    if (!ranked.length) out.push('No ratings yet.');
    ranked.forEach(function (v, i) { out.push((i + 1) + '. ' + v.name + ' (' + v.id + '): ' + fb(v.id).rating + '/5' + (fb(v.id).favorite ? ', favorite' : '')); });
    var unrated = VERSIONS.filter(function (v) { return !fb(v.id).rating; });
    if (ranked.length && unrated.length) out.push('', 'Not yet rated: ' + unrated.map(function (v) { return v.name; }).join(', '));
    out.push('');
    VERSIONS.forEach(function (v) {
      var e = fb(v.id);
      out.push('## ' + v.n + '. ' + v.name + ' (' + v.id + ')', '', v.concept, 'Type: ' + v.pair.join(' / '), '');
      if (!hasData(e)) { out.push('No feedback recorded.', ''); return; }
      out.push('- Rating: ' + (e.rating ? e.rating + '/5' : 'not rated'), '- Favorite: ' + (e.favorite ? 'yes' : 'no'), '');
      LISTS.forEach(function (l) {
        if (!e[l.k].length) return;
        out.push('### ' + l.label, '');
        e[l.k].forEach(function (i) { out.push('- ' + i.text.replace(/\n/g, ' ') + ' _(' + cap(i.page) + ' · ' + i.theme + ')_'); });
        out.push('');
      });
      if (e.notes.trim()) out.push('### Notes', '', e.notes.trim(), '');
    });
    return out.join('\n');
  }
  var exportOpener = null;
  function openExport() {
    exportOpener = document.activeElement;
    $('#ex-text').value = buildMarkdown();
    resetClear();
    $('#export').showModal();
  }
  function resetClear() {
    var b = $('#ex-clear'); clearTimeout(b._t); b.removeAttribute('data-armed'); $('span', b).textContent = 'Clear all';
  }
  function toast(msg) {
    var t = h('div', { class: 'toast', text: msg }); $('#toasts').append(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 320); }, 2400);
  }
  function buildExport() {
    var dlg = $('#export');
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { resetClear(); if (exportOpener && exportOpener.focus && document.contains(exportOpener)) exportOpener.focus(); });
    $('#ex-copy').addEventListener('click', function () {
      var text = $('#ex-text').value;
      var done = function () { toast('Copied feedback to clipboard'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
      function fallback() { var t = $('#ex-text'); t.select(); try { document.execCommand('copy') ? done() : toast('Copy failed. Select the text and copy manually.'); } catch (e) { toast('Copy failed. Select the text and copy manually.'); } }
    });
    $('#ex-download').addEventListener('click', function () {
      var a = h('a', { href: URL.createObjectURL(new Blob([$('#ex-text').value], { type: 'text/markdown' })), download: 'design-feedback.md' });
      document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('Downloaded design-feedback.md');
    });
    $('#ex-clear').addEventListener('click', function () {
      var b = this;
      if (!b.hasAttribute('data-armed')) {
        b.setAttribute('data-armed', ''); $('span', b).textContent = 'Click again to clear all';
        b._t = setTimeout(resetClear, 4000); return;
      }
      resetClear(); db = {}; save();
      if (drawerOpen) renderDrawer(true);
      $('#ex-text').value = buildMarkdown(); toast('All feedback cleared');
    });
  }

  /* ---------- keyboard ---------- */
  function onKey(e) {
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if ($('#export').open) return;
      if (drawerOpen) { e.preventDefault(); closeDrawer(); }
      else if ($('#tb-extra').classList.contains('open')) toggleMenu(false);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || $('#export').open) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (route.name !== 'viewer') return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (/^[1-9]$/.test(e.key) && VERSIONS[+e.key - 1]) { e.preventDefault(); go({ v: VERSIONS[+e.key - 1].id }); }
  }

  /* ---------- init ---------- */
  loadDb();
  buildChrome();
  buildDrawer();
  buildExport();
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHash);
  setTheme(theme, { silent: true });
  // Reflect a theme saved by an open design tab or by the bridge.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY_T && (e.newValue === 'light' || e.newValue === 'dark')) setTheme(e.newValue, { silent: true });
  });
  onHash();
})();
