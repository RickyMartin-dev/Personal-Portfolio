/*
 * Theme preference and toggle bridge for the portfolio.
 * - Resolves theme: ?theme= param > saved choice > OS preference. Sets <html data-theme="light|dark">.
 * - Any element with [data-theme-toggle] toggles the theme (aria-pressed kept in sync).
 * - Fires `document` event "rm:themechange" with detail {theme} so canvases/WebGL can recolor.
 * Include in <head> BEFORE stylesheets paint:  <script src="assets/js/bridge.js"></script>
 * Pages declare <meta name="rm-page" content="home|about|games"> for runtime configuration.
 */
(function () {
  var KEY = 'rm-theme';
  var LEGACY_KEY = 'rm-showcase-theme';
  var root = document.documentElement;

  function read() {
    try {
      var p = new URLSearchParams(location.search).get('theme');
      if (p === 'light' || p === 'dark') return p;
    } catch (e) {}
    try {
      var s = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
      if (s === 'light' || s === 'dark') return s;
    } catch (e) {}
    return window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function syncToggles() {
    var dark = root.dataset.theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(dark));
      if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', 'Dark mode');
    });
  }

  function set(theme, opts) {
    if (theme !== 'light' && theme !== 'dark') return;
    var changed = root.dataset.theme !== theme;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    if (!(opts && opts.silent)) { try { localStorage.setItem(KEY, theme); } catch (e) {} }
    syncToggles();
    if (changed) document.dispatchEvent(new CustomEvent('rm:themechange', { detail: { theme: theme } }));
  }

  set(read(), { silent: true });

  window.RMTheme = {
    get: function () { return root.dataset.theme; },
    set: function (t) { set(t); },
    toggle: function () { set(root.dataset.theme === 'dark' ? 'light' : 'dark'); }
  };

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (t) { e.preventDefault(); window.RMTheme.toggle(); }
  });

  document.addEventListener('DOMContentLoaded', syncToggles);
})();
