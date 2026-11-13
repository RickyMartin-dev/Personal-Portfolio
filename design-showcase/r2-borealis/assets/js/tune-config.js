/* Borealis tuning schema: palettes, aurora, cursor, page and logo options. */
(function () {
  'use strict';
  function opts(list) { return list.map(function (o) { return { value: o[0], label: o[1] }; }); }
  var P = function (id, name, sw, d, l) { return { id: id, name: name, swatch: sw, dark: d, light: l }; };
  var palettes = [
    P('borealis', 'Borealis', ['#9a82ff', '#55dcc4', '#ffb86b'],
      { '--violet': '#9a82ff', '--cyan': '#55dcc4', '--amber': '#ffb86b' },
      { '--violet': '#6a4fd8', '--cyan': '#10857a', '--amber': '#bd6a0b' }),
    P('afterglow', 'Afterglow', ['#9f7bff', '#5dc7ff', '#ffb562'],
      { '--violet': '#9f7bff', '--cyan': '#5dc7ff', '--amber': '#ffb562' },
      { '--violet': '#6a46d9', '--cyan': '#1d7fb8', '--amber': '#c4700c' }),
    P('verdigris', 'Verdigris', ['#8372ff', '#3df5a8', '#ffd37a'],
      { '--violet': '#8372ff', '--cyan': '#3df5a8', '--amber': '#ffd37a' },
      { '--violet': '#5b49c8', '--cyan': '#0d8a5f', '--amber': '#a96d00' }),
    P('polar-rose', 'Polar rose', ['#d08bff', '#ff8fb8', '#ffcba3'],
      { '--violet': '#d08bff', '--cyan': '#ff8fb8', '--amber': '#ffcba3' },
      { '--violet': '#a03fc4', '--cyan': '#c23d77', '--amber': '#b4601b' }),
    P('glacier', 'Glacier', ['#7ea9ff', '#8fe9ff', '#cfe9ff'],
      { '--violet': '#7ea9ff', '--cyan': '#8fe9ff', '--amber': '#cfe9ff' },
      { '--violet': '#2f5fc4', '--cyan': '#0e7fa0', '--amber': '#25679c' }),
    P('frost', 'Mono frost', ['#b4bbd6', '#e2e7f6', '#f4f6ff'],
      { '--violet': '#b4bbd6', '--cyan': '#e2e7f6', '--amber': '#f4f6ff' },
      { '--violet': '#4a5070', '--cyan': '#2f4f6e', '--amber': '#3a4160' })
  ];
  var groups = [
    { id: 'aurora', label: 'Aurora', controls: [
      { id: 'colormode', label: 'Colour mode', type: 'segmented', default: 'afterglow', options: opts([['classic', 'Classic'], ['afterglow', 'Palette'], ['mono', 'Mono']]), hint: 'Classic is green and violet, Palette follows the swatches, Mono tints one hue.' },
      { id: 'intensity', label: 'Curtain intensity', type: 'range', min: 0.3, max: 1.5, step: 0.05, default: 1 },
      { id: 'speed', label: 'Speed', type: 'range', min: 0.25, max: 2.5, step: 0.05, default: 1 },
      { id: 'height', label: 'Curtain height', type: 'range', min: 0.6, max: 1.5, step: 0.05, default: 1 },
      { id: 'curtains', label: 'Curtains', type: 'segmented', default: '3', options: opts([['2', 'Two'], ['3', 'Three']]) },
      { id: 'rglow', label: 'Glow on the range', type: 'toggle', default: true },
      { id: 'drawin', label: 'Draw the range in', type: 'toggle', default: true }
    ] },
    { id: 'cursor', label: 'Cursor', controls: [
      { id: 'cursor', label: 'Cursor effect', type: 'select', default: 'ribbon', options: opts([['ribbon', 'Silk ribbon'], ['comet', 'Comet'], ['dust', 'Aurora dust'], ['none', 'None']]) },
      { id: 'ribbonlen', label: 'Ribbon length', type: 'range', min: 0.5, max: 1.8, step: 0.05, default: 1 },
      { id: 'ribbonsway', label: 'Silk sway', type: 'range', min: 0, max: 2, step: 0.1, default: 1 }
    ] },
    { id: 'page', label: 'Page', controls: [
      { id: 'sglow', label: 'Section aurora light', type: 'range', min: 0, max: 1.5, step: 0.05, default: 1 },
      { id: 'reveal', label: 'Reveal style', type: 'select', default: 'rise', options: opts([['rise', 'Rise'], ['curtain', 'Curtain drop'], ['fade', 'Fade'], ['none', 'None']]) }
    ] },
    { id: 'logo', label: 'Logo', controls: [
      { id: 'logo', label: 'Mark', type: 'segmented', default: 'star', options: opts([['star', 'North star'], ['ribbon', 'Ribbon RM'], ['serif', 'Serif R']]) }
    ] }
  ];
  function applyLive() {
    var v = window.RMTune && RMTune.get ? RMTune.get('sglow') : 1;
    document.documentElement.style.setProperty('--r2-glow', String(v == null ? 1 : v));
    document.dispatchEvent(new CustomEvent('rm:r2opts'));
  }
  if (window.RMTune) {
    RMTune.register({ id: 'r2', name: 'Borealis', palettes: palettes, groups: groups, apply: function () { applyLive(); } });
    applyLive();
  }
})();
