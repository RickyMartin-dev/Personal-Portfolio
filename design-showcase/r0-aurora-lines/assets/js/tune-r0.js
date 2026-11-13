/* r0 tuning schema: five palettes (each derives the whole engraved scene from a few seeds), cursor, hero and logo groups.
   Aurora is the empty palette, so the c1 look comes straight from afterglow.css. */
(function () {
  'use strict';
  if (!window.RMTune) return;
  var root = document.documentElement;

  /* ---------- colour helpers ---------- */
  function rgb(h) {
    h = String(h).trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
  }
  function hex(a) { return '#' + a.map(function (n) { return ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
  }
  var W = '#ffffff', K = '#000000';

  /* seeds: violet v, cyan c, amber a, ground g. Returns every scene token. */
  function derive(th, v, c, a, g) {
    var bt = mix(c, v, 0.6), m;
    if (th === 'dark') {
      m = {
        '--sky-0': mix(g, K, 0.45), '--sky-2': mix(g, v, 0.12), '--sky-3': mix(g, mix(v, a, 0.5), 0.38),
        '--l1c': mix(g, bt, 0.65), '--l1m': mix(g, bt, 0.42), '--l1b': mix(g, mix(v, a, 0.4), 0.4),
        '--l2c': mix(g, bt, 0.4), '--l2m': mix(g, v, 0.22), '--l2b': mix(g, mix(v, a, 0.3), 0.26),
        '--l3c': mix(g, v, 0.17), '--l3m': mix(g, v, 0.09), '--l3b': mix(g, v, 0.1),
        '--l4c': mix(g, v, 0.07), '--l4m': mix(g, v, 0.03), '--l4b': g,
        '--ln-top': mix(a, W, 0.3), '--ln-mid': c, '--ln-low': v, '--ln-base': mix(v, g, 0.3), '--rim-line': mix(a, W, 0.45), '--far': mix(g, v, 0.2),
        '--lit': a, '--shade': mix(g, K, 0.8), '--rim': mix(a, W, 0.4), '--mist': mix(v, g, 0.15), '--glow': a,
        '--av1': c, '--av2': mix(c, v, 0.5), '--av3': v, '--av4': v, '--av5': mix(v, a, 0.55), '--av6': a,
        '--fx1': v, '--fx2': c, '--fx3': mix(a, W, 0.2), '--fxc': mix(a, W, 0.9),
        '--cm0': c, '--cm1': v, '--cm2': c, '--cm3': a
      };
      m['--sky-1'] = mix(m['--sky-0'], m['--sky-2'], 0.45);
    } else {
      m = {
        '--sky-0': mix(g, v, 0.28), '--sky-1': mix(g, v, 0.17), '--sky-2': mix(g, mix(v, a, 0.5), 0.16), '--sky-3': mix(g, a, 0.22),
        '--l1c': mix(g, bt, 0.2), '--l1m': mix(g, v, 0.18), '--l1b': mix(g, a, 0.18),
        '--l2c': mix(g, bt, 0.4), '--l2m': mix(g, v, 0.36), '--l2b': mix(g, mix(v, a, 0.5), 0.3),
        '--l3c': mix(g, bt, 0.62), '--l3m': mix(g, v, 0.5), '--l3b': mix(g, mix(v, a, 0.4), 0.38),
        '--l4c': mix(g, bt, 0.8), '--l4m': mix(g, v, 0.62), '--l4b': g,
        '--ln-top': a, '--ln-mid': c, '--ln-low': v, '--ln-base': mix(v, g, 0.2), '--rim-line': mix(a, W, 0.12), '--far': mix(g, v, 0.1),
        '--lit': mix(a, W, 0.55), '--shade': mix(bt, K, 0.5), '--rim': mix(a, W, 0.5), '--mist': mix(a, W, 0.85), '--glow': mix(a, W, 0.4),
        '--av1': mix(c, W, 0.6), '--av2': mix(v, W, 0.55), '--av3': mix(v, W, 0.55), '--av4': mix(a, W, 0.6), '--av5': mix(a, W, 0.72), '--av6': mix(a, W, 0.8),
        '--fx1': v, '--fx2': c, '--fx3': a, '--fxc': a,
        '--cm0': v, '--cm1': v, '--cm2': c, '--cm3': a
      };
    }
    return m;
  }
  function assign(base, extra) { for (var k in extra) base[k] = extra[k]; return base; }
  function build(th, s) {
    var base = {
      '--violet': s.v, '--cyan': s.c, '--amber': s.a, '--accent': s.acc, '--accent-ink': s.ink, '--accent-text': s.at || s.acc,
      '--ground': s.g, '--surface': s.s1, '--surface-2': s.s2
    };
    return assign(base, derive(th, s.v, s.c, s.a, s.g));
  }

  var P = [
    { id: 'aurora', name: 'Aurora', swatch: ['#9f7bff', '#5dc7ff', '#ffb562'], dark: {}, light: {} },
    {
      id: 'glacier', name: 'Glacier', swatch: ['#6f9bff', '#58e0e8', '#bfe9ff'],
      dark: build('dark', { v: '#6f9bff', c: '#58e0e8', a: '#b4e4ff', acc: '#9fdcff', ink: '#04121c', g: '#0f1620', s1: '#151e2b', s2: '#1d2837' }),
      light: build('light', { v: '#2f5fd0', c: '#0d8a9b', a: '#1f78a8', acc: '#8fd3f0', ink: '#04121c', at: '#0f6a8a', g: '#f2f7fa', s1: '#ffffff', s2: '#e6eff5' })
    },
    {
      id: 'ember', name: 'Ember', swatch: ['#e0566a', '#ff8a4c', '#ffc247'],
      dark: build('dark', { v: '#e0566a', c: '#ff8a4c', a: '#ffc247', acc: '#ffc247', ink: '#1d1200', g: '#17110f', s1: '#1f1714', s2: '#2a1e1a' }),
      light: build('light', { v: '#b3344a', c: '#c25a12', a: '#b86a00', acc: '#ffc247', ink: '#1d1200', at: '#9a4a00', g: '#fbf5f0', s1: '#ffffff', s2: '#f4e8df' })
    },
    {
      id: 'rose', name: 'Rose Quartz', swatch: ['#d68ac8', '#8fb4ff', '#ffb3a7'],
      dark: build('dark', { v: '#d68ac8', c: '#8fb4ff', a: '#ffb3a7', acc: '#ffb3c1', ink: '#2a0a14', g: '#171119', s1: '#201722', s2: '#2b1f2e' }),
      light: build('light', { v: '#a8408f', c: '#4a6fd0', a: '#c2566a', acc: '#f4a6b8', ink: '#2a0a14', at: '#9b2f55', g: '#fbf4f6', s1: '#ffffff', s2: '#f5e6ec' })
    },
    {
      id: 'mono', name: 'Mono Ink', swatch: ['#cfd2dc', '#9aa0b0', '#f2f2f4'],
      dark: build('dark', { v: '#cfd2dc', c: '#9aa0b0', a: '#f2f2f4', acc: '#f2f2f4', ink: '#101114', g: '#101114', s1: '#17181c', s2: '#202228' }),
      light: build('light', { v: '#2a2c35', c: '#5a5f6e', a: '#15161b', acc: '#1a1b20', ink: '#ffffff', at: '#1a1b20', g: '#f6f6f4', s1: '#ffffff', s2: '#ececea' })
    }
  ];

  /* custom palette: derive from the three picked colours, clean up when leaving */
  var derived = [];
  function clearDerived() { derived.forEach(function (k) { root.style.removeProperty(k); }); derived = []; }
  function apply(s) {
    if (s.palette === 'custom') {
      var cs = getComputedStyle(root), th = s.theme;
      var m = derive(th, cs.getPropertyValue('--violet'), cs.getPropertyValue('--cyan'), cs.getPropertyValue('--amber'), cs.getPropertyValue('--ground'));
      clearDerived();
      for (var k in m) { root.style.setProperty(k, m[k]); derived.push(k); }
    } else if (derived.length) {
      if (s.palette === P[0].id) clearDerived(); else derived = [];
    }
  }

  RMTune.register({
    id: 'r0',
    name: 'Aurora Lines',
    palettes: P,
    groups: [
      { id: 'cursor', label: 'Cursor', controls: [
        { id: 'cursor', label: 'Pointer effect', type: 'segmented', default: 'comet', options: [{ value: 'comet', label: 'Comet trail' }, { value: 'none', label: 'None' }], hint: 'The comet is a sleeping canvas; it only runs while the pointer moves.' }
      ] },
      { id: 'hero', label: 'Hero', controls: [
        { id: 'density', label: 'Line density', type: 'range', min: 0.5, max: 1.5, step: 0.05, unit: '×', default: 1 },
        { id: 'drawin', label: 'Draw-in on load', type: 'toggle', default: true },
        { id: 'reveal', label: 'Scroll reveal strength', type: 'range', min: 0, max: 1.6, step: 0.1, unit: '×', default: 1, hint: 'How far the distant summits drift as you leave the hero.' }
      ] },
      { id: 'logo', label: 'Logo', controls: [
        { id: 'logo', label: 'Mark', type: 'segmented', default: 'peak', options: [{ value: 'peak', label: 'Peak' }, { value: 'ribbon', label: 'Ribbon RM' }, { value: 'serif', label: 'Serif R' }] }
      ] }
    ],
    apply: apply
  });
})();
