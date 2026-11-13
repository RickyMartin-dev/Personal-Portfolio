/* Studio bridge. Active only with ?studio=1 inside a same-origin parent (the studio iframe).
   Receives: {type:'rm-studio', action:'apply'|'pick'|'edit-text'|'scrollTo'|'highlight'|'ping', ...}
   Posts:    {type:'rm-site', action:'ready'|'picked'|'copy'|'applied', ...}   (messages from other origins are ignored) */
(function () {
  'use strict';
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { return; }
  if (params.get('studio') !== '1' || window.parent === window) return;
  var root = document.documentElement;
  var origin = location.origin;
  var PAGE = (window.RMConfig && window.RMConfig.page) || 'index';

  function post(msg) {
    msg.type = 'rm-site';
    try { window.parent.postMessage(msg, origin); } catch (e) {}
  }
  function edits() {
    return [].map.call(document.querySelectorAll('[data-edit]'), function (el) {
      return { id: el.getAttribute('data-edit'), label: el.getAttribute('data-edit-label') || el.getAttribute('data-edit') };
    });
  }
  function sendReady() {
    post({ action: 'ready', page: PAGE, sections: (window.RM_SECTIONS && window.RM_SECTIONS[PAGE]) || [], edits: edits() });
  }

  /* ---------- internal links keep ?studio=1 (and the preview theme) ---------- */
  function fixLinks() {
    [].forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var raw = a.getAttribute('href');
      if (!raw || raw.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(raw)) return;
      var u;
      try { u = new URL(raw, location.href); } catch (e) { return; }
      if (u.origin !== origin || !/\.html$/.test(u.pathname)) return;
      u.searchParams.set('studio', '1');
      u.searchParams.set('theme', root.dataset.theme || 'dark');
      var rel = u.pathname.split('/').pop() + u.search + u.hash;
      if (a.getAttribute('href') !== rel) a.setAttribute('href', rel);
    });
  }
  fixLinks();
  document.addEventListener('rm:themechange', fixLinks);

  /* ---------- overlay (hover + selection + highlight) ---------- */
  function mk(css) {
    var d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483000;display:none;box-sizing:border-box;' + css;
    document.body.appendChild(d);
    return d;
  }
  var hov = null, sel = null, flash = null, chip = null;
  function ensureOverlay() {
    if (hov) return;
    hov = mk('border:2px solid #4da3ff;background:rgba(77,163,255,.10);border-radius:3px;');
    sel = mk('border:2px solid #ffb562;background:rgba(255,181,98,.08);border-radius:3px;');
    flash = mk('border:3px solid #ff6fae;background:rgba(255,111,174,.16);border-radius:3px;transition:opacity .35s;');
    chip = document.createElement('div');
    chip.setAttribute('aria-hidden', 'true');
    chip.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483001;pointer-events:none;display:none;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.02em;color:#04121c;background:#4da3ff;padding:5px 8px;border-radius:3px;white-space:nowrap;max-width:60vw;overflow:hidden;text-overflow:ellipsis;';
    document.body.appendChild(chip);
  }
  function box(o, el) {
    if (!el) { o.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    o.style.display = 'block';
    o.style.transform = 'translate(' + Math.round(r.left) + 'px,' + Math.round(r.top) + 'px)';
    o.style.width = Math.max(0, Math.round(r.width)) + 'px';
    o.style.height = Math.max(0, Math.round(r.height)) + 'px';
  }
  function label(el) { return el.getAttribute('data-edit-label') || el.getAttribute('data-edit'); }
  function showChip(el) {
    if (!el) { chip.style.display = 'none'; return; }
    var r = el.getBoundingClientRect();
    chip.textContent = label(el) + '  ·  ' + el.getAttribute('data-edit');
    chip.style.display = 'block';
    var y = r.top - 24; if (y < 2) y = Math.min(window.innerHeight - 24, r.bottom + 4);
    chip.style.transform = 'translate(' + Math.max(2, Math.round(r.left)) + 'px,' + Math.round(y) + 'px)';
  }

  var pickOn = false, editOn = false, hoverEl = null, selEl = null, raf = 0;
  function redraw() {
    raf = 0;
    if (!hov) return;
    box(hov, pickOn ? hoverEl : null);
    box(sel, selEl);
    showChip(pickOn ? hoverEl : null);
  }
  function sched() { if (!raf) raf = requestAnimationFrame(redraw); }
  window.addEventListener('scroll', sched, { passive: true });
  window.addEventListener('resize', sched);

  function targetOf(e) {
    var t = e.target;
    if (!t || !t.closest) return null;
    var el = t.closest('[data-edit]');
    if (el && e.altKey) { var up = el.parentElement && el.parentElement.closest('[data-edit]'); if (up) el = up; }
    return el;
  }
  function computed(el) {
    var cs = getComputedStyle(el);
    var c = el.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.sr-only, svg'), function (x) { x.remove(); });
    return {
      fontSize: cs.fontSize, color: cs.color, fontWeight: cs.fontWeight, textAlign: cs.textAlign,
      marginTop: cs.marginTop, marginBottom: cs.marginBottom,
      text: c.textContent.replace(/\s+/g, ' ').trim().slice(0, 400)
    };
  }
  document.addEventListener('pointermove', function (e) {
    if (!pickOn) return;
    var el = targetOf(e);
    if (el !== hoverEl) { hoverEl = el; sched(); }
  }, { passive: true, capture: true });
  document.addEventListener('pointerleave', function () { if (hoverEl) { hoverEl = null; sched(); } });
  document.addEventListener('click', function (e) {
    if (pickOn) {
      var el = targetOf(e);
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (!el) return;
      selEl = el; ensureOverlay(); sched();
      post({ action: 'picked', id: el.getAttribute('data-edit'), label: label(el), computed: computed(el) });
      return;
    }
    if (editOn) {
      var a = e.target.closest && e.target.closest('a, button');
      if (a) { e.preventDefault(); e.stopPropagation(); }
    }
  }, true);
  /* keep buttons/forms from acting while picking */
  document.addEventListener('submit', function (e) { if (pickOn || editOn) e.preventDefault(); }, true);

  /* ---------- text editing ---------- */
  function leaf(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 1 && !(n.classList.contains('sr-only') || /^svg$/i.test(n.tagName))) return false;
    }
    return /\S/.test(el.textContent);
  }
  function cleanText(el) {
    var c = el.cloneNode(true);
    [].forEach.call(c.querySelectorAll('.sr-only, svg'), function (x) { x.remove(); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function setEdit(on) {
    editOn = on;
    [].forEach.call(document.querySelectorAll('[data-edit]'), function (el) {
      if (on && leaf(el) && !el.closest('.marquee')) {
        el.setAttribute('contenteditable', 'plaintext-only');
        el.setAttribute('data-rm-editing', '');
        el.spellcheck = false;
      } else if (el.hasAttribute('data-rm-editing')) {
        el.removeAttribute('contenteditable'); el.removeAttribute('data-rm-editing');
      }
    });
  }
  document.addEventListener('focusout', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-rm-editing]');
    if (!el) return;
    post({ action: 'copy', id: el.getAttribute('data-edit'), text: cleanText(el) });
  });
  document.addEventListener('keydown', function (e) {
    if (!editOn) return;
    var el = e.target && e.target.closest && e.target.closest('[data-rm-editing]');
    if (!el) return;
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    else if (e.key === ' ' || e.key === 'Spacebar') { e.stopPropagation(); }
  }, true);
  document.addEventListener('keyup', function (e) {
    if (editOn && e.key === ' ' && e.target.closest && e.target.closest('[data-rm-editing]')) e.preventDefault();
  }, true);

  /* ---------- messages ---------- */
  function q(a, v) { return v ? document.querySelector('[' + a + '="' + String(v).replace(/["\\]/g, '') + '"]') : null; }
  function find(id, section) { return q('data-edit', id) || q('data-section', section) || q('data-section', id); }
  var flashT = 0, appliedOnce = false;
  window.addEventListener('message', function (e) {
    if (e.origin !== origin) return;
    var d = e.data;
    if (!d || d.type !== 'rm-studio') return;
    ensureOverlay();
    switch (d.action) {
      case 'apply':
        if (window.RMConfig && d.config) { window.RMConfig.set(d.config, { forceTheme: !appliedOnce }); appliedOnce = true; setTimeout(function () { sched(); fixLinks(); if (editOn) setEdit(true); }, 60); }
        break;
      case 'pick':
        pickOn = !!d.on;
        root.toggleAttribute('data-pick', pickOn);
        if (!pickOn) { hoverEl = null; }
        sched();
        break;
      case 'edit-text': setEdit(!!d.on); break;
      case 'scrollTo': {
        var el = find(d.id, d.section);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); selEl = el.hasAttribute('data-edit') ? el : selEl; setTimeout(sched, 400); }
        break;
      }
      case 'highlight': {
        var h = find(d.id, d.section);
        clearTimeout(flashT);
        if (!h) { flash.style.display = 'none'; break; }
        box(flash, h); flash.style.opacity = '1';
        flashT = setTimeout(function () { flash.style.opacity = '0'; setTimeout(function () { flash.style.display = 'none'; }, 380); }, 1100);
        break;
      }
      case 'select': selEl = d.id ? find(d.id) : null; sched(); break;
      case 'ping': sendReady(); break;
    }
  });

  function boot() { ensureOverlay(); }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
  /* also announce as soon as the DOM is ready so the studio can push the config before the load event */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sendReady); else sendReady();
})();
